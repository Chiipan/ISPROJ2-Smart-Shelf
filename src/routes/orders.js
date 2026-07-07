const express = require("express");
const { OrderRepository } = require("../repositories/orderRepository");
const { MenuRepository } = require("../repositories/menuRepository");
const { StaffRepository } = require("../repositories/staffRepository");
const { DiscountRepository } = require("../repositories/discountRepository");
const { GenericRepository } = require("../repositories/genericRepository");
const { executeQueryForRepo } = require("../db");
const authMiddleware = require("../middleware/Middleware");
const { emitTo } = require("../realtime");

const orderRouter = express.Router();
const orderRepo = new OrderRepository();
const menuRepo = new MenuRepository();
const staffRepo = new StaffRepository();
const discountRepo = new DiscountRepository();
const callRepo = new GenericRepository("dbo.waiter_calls", "waiter_call_id");

// Validates cart items against the menu and prices them from the DB.
// Returns { error } or { verified }.
async function verifyCartItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return { error: "items array is required" };
  }
  for (const item of items) {
    if (!item.menu_item_id || !Number.isInteger(item.quantity) || item.quantity <= 0) {
      return { error: "Each item needs menu_item_id and a positive integer quantity" };
    }
  }

  const ids = items.map((i) => i.menu_item_id);
  const menuRows = await menuRepo.findAvailableByIds(ids);
  const menuById = new Map(menuRows.map((m) => [m.menu_item_id, m]));

  const verified = [];
  for (const item of items) {
    const menuItem = menuById.get(item.menu_item_id);
    if (!menuItem) {
      return { error: `Menu item ${item.menu_item_id} does not exist` };
    }
    if (menuItem.status !== "available") {
      return { error: `${menuItem.menu_title} is currently unavailable` };
    }
    verified.push({
      menu_item_id: item.menu_item_id,
      menu_title: menuItem.menu_title,
      price: Number(menuItem.unit_price),
      quantity: item.quantity,
      notes: item.notes,
    });
  }
  return { verified };
}

// Creates a waiter call tied to the payment/discount flow and notifies the
// waiter room. messagePrefix is later used by resolveFlowCalls.
async function createFlowCall(table_id, table_name, request_type, message) {
  await callRepo.create({
    table_id,
    request_type,
    message,
    status: "pending",
    is_deleted: 0,
  });
  emitTo("waiter", "waiter:call", { table_id, table_name, request_type, message });
}

// Auto-resolves this table's pending calls that were opened by the checkout
// flow (so the waiter board clears once the code is entered at the table).
async function resolveFlowCalls(table_id, messagePrefix) {
  await executeQueryForRepo(
    `UPDATE dbo.waiter_calls
     SET status = 'resolved', resolved_at = SYSDATETIME(), updated_at = SYSDATETIME()
     WHERE table_id = ? AND status = 'pending' AND is_deleted = 0
       AND message LIKE ?`,
    [table_id, `${messagePrefix}%`]
  );
  emitTo("waiter", "waiter:call-status", { table_id });
}

// Payment succeeded: fire the order to the kitchen/waiter and record the
// sale for the admin module ('sales:new' on the 'admin' room;
// vw_daily_sales / vw_item_sales aggregate the payments rows).
async function fireOrderAfterPayment(orders_id, method, amount) {
  await orderRepo.updateOrderStatus(orders_id, "placed");
  const order = await orderRepo.findByIdWithDetails(orders_id);

  emitTo("kitchen", "order:new", order);
  emitTo("waiter", "order:new", order);
  emitTo(`table:${order.table_id}`, "order:placed", order);
  emitTo("admin", "sales:new", {
    orders_id,
    table_name: order.table_name,
    payment_method: method,
    amount,
    paid_at: new Date().toISOString(),
  });
  return order;
}

const CALL_MSG_VERIFY = "Verify Senior/PWD ID";
const CALL_MSG_CASH = "Collect cash payment";

/* POST /orders - customer tablet places an order.
   Body: { items: [{ menu_item_id, quantity, notes? }] }
   table_id comes from the table-login JWT, so a tablet can only order
   for its own table. Prices come from the DB, never from the client. */
orderRouter.post("/", authMiddleware, async (req, res) => {
  try {
    const table_id = req.user.table_id;
    if (!table_id) {
      return res.status(403).json({ message: "Only a logged-in table can place orders" });
    }

    const { error, verified } = await verifyCartItems(req.body.items);
    if (error) return res.status(400).json({ message: error });

    const order = await orderRepo.createOrderWithDetails(table_id, verified);
    const payload = { ...order, table_name: req.user.table_name };

    // This is the "send to kitchen/waiter" part: future dashboards just
    // join their room and listen for 'order:new'.
    emitTo("kitchen", "order:new", payload);
    emitTo("waiter", "order:new", payload);
    emitTo(`table:${table_id}`, "order:placed", payload);

    return res.status(201).json({ message: "Order placed successfully!", data: order });
  } catch (error) {
    console.error(error);
    return res.status(400).json({ message: "Placing order failed." });
  }
});

/* POST /orders/checkout - start the pay-before-kitchen flow.
   Body: { items: [{ menu_item_id, quantity, notes? }],
           discount?: { discount_id, menu_item_ids: [...] } }
   Creates the order as 'pending_payment' (invisible to kitchen/waiter
   boards). A discount request calls a waiter to the table to verify the
   Senior/PWD ID with their staff code. */
orderRouter.post("/checkout", authMiddleware, async (req, res) => {
  try {
    const table_id = req.user.table_id;
    if (!table_id) {
      return res.status(403).json({ message: "Only a logged-in table can check out" });
    }

    const { error, verified } = await verifyCartItems(req.body.items);
    if (error) return res.status(400).json({ message: error });

    let discount = null;
    if (req.body.discount && req.body.discount.discount_id) {
      const discountRow = await discountRepo.findById(req.body.discount.discount_id);
      if (!discountRow || discountRow.is_deleted) {
        return res.status(400).json({ message: "Discount type not found" });
      }
      const menu_item_ids = req.body.discount.menu_item_ids || [];
      if (menu_item_ids.length === 0) {
        return res.status(400).json({ message: "Select at least one item for the discount holder" });
      }
      discount = { discount_id: discountRow.discount_id, menu_item_ids, type: discountRow.discount_type };
    }

    const order = await orderRepo.createOrderWithDetails(table_id, verified, {
      status: "pending_payment",
      discount,
    });

    if (discount) {
      await createFlowCall(
        table_id,
        req.user.table_name,
        "assistance",
        `${CALL_MSG_VERIFY} (${discount.type})`
      );
    }

    const totals = await orderRepo.getOrderTotals(order.orders_id);
    return res.status(201).json({ data: { ...order, totals } });
  } catch (error) {
    console.error(error);
    return res.status(400).json({ message: "Checkout failed." });
  }
});

/* POST /orders/:id/discount/verify - waiter at the table enters their staff
   code to approve/deny the Senior/PWD ID. The table itself may cancel its
   own discount request (deny without a code). */
orderRouter.post("/:id/discount/verify", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const approve = req.body.approve === true;

    const order = await orderRepo.findById(id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.status !== "pending_payment") {
      return res.status(400).json({ message: "Order is no longer awaiting payment" });
    }

    let staff = null;
    if (req.body.code) {
      staff = await staffRepo.findByCode(req.body.code);
      if (!staff) return res.status(401).json({ message: "Invalid staff code" });
    } else {
      // no code: only the order's own table may cancel, and only to deny
      if (approve || req.user.table_id !== order.table_id) {
        return res.status(401).json({ message: "A staff code is required to verify the ID" });
      }
    }

    await orderRepo.setDiscountStatus(id, approve ? "approved" : "denied", staff?.staff_id || null);
    await resolveFlowCalls(order.table_id, CALL_MSG_VERIFY);

    const totals = await orderRepo.getOrderTotals(id);
    return res.status(200).json({
      message: approve ? "Discount approved!" : "Discount removed.",
      data: { orders_id: id, verified_by: staff ? `${staff.first_name} ${staff.last_name}` : null, totals },
    });
  } catch (error) {
    console.error(error);
    return res.status(400).json({ message: "Verifying discount failed." });
  }
});

/* POST /orders/:id/pay - customer picks a payment method.
   card / qrph: prototype-simulated on the tablet; a real gateway
     (e.g. PayMongo payment intents + webhooks) would slot in right here.
   cash: calls a waiter to collect; payment stays 'pending' until the
     waiter confirms with their staff code (POST /:id/pay/confirm-cash). */
orderRouter.post("/:id/pay", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { method } = req.body;
    if (!["cash", "card", "qrph"].includes(method)) {
      return res.status(400).json({ message: "method must be one of: cash, card, qrph" });
    }

    const order = await orderRepo.findById(id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (req.user.table_id !== order.table_id) {
      return res.status(403).json({ message: "Only the ordering table can pay for this order" });
    }
    if (order.status !== "pending_payment") {
      return res.status(400).json({ message: "Order is not awaiting payment" });
    }

    const totals = await orderRepo.getOrderTotals(id);
    if (totals.discount_status === "pending") {
      return res.status(400).json({ message: "Waiter must verify the discount ID first" });
    }

    if (method === "cash") {
      const existing = await orderRepo.findPendingPayment(id);
      if (!existing) {
        await orderRepo.createPayment(id, "cash", totals.total, false);
        await createFlowCall(
          order.table_id,
          req.user.table_name,
          "request_bill",
          `${CALL_MSG_CASH} - PHP ${totals.total.toFixed(2)}`
        );
      }
      return res.status(200).json({
        message: "A waiter is on the way to collect the payment.",
        data: { paid: false, awaiting: "cash", totals },
      });
    }

    // card / qrph - simulated success (prototype)
    await orderRepo.createPayment(id, method, totals.total, true);
    await fireOrderAfterPayment(id, method, totals.total);
    return res.status(200).json({
      message: "Payment successful — order sent to the kitchen!",
      data: { paid: true, method, totals },
    });
  } catch (error) {
    console.error(error);
    return res.status(400).json({ message: "Payment failed." });
  }
});

/* POST /orders/:id/pay/confirm-cash - waiter received the cash at the table
   and confirms with their staff code. Fires the order to the kitchen. */
orderRouter.post("/:id/pay/confirm-cash", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const staff = await staffRepo.findByCode(req.body.code);
    if (!staff) return res.status(401).json({ message: "Invalid staff code" });

    const order = await orderRepo.findById(id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.status !== "pending_payment") {
      return res.status(400).json({ message: "Order is not awaiting payment" });
    }
    const pending = await orderRepo.findPendingPayment(id);
    if (!pending) return res.status(400).json({ message: "No pending cash payment for this order" });

    await orderRepo.markPaymentPaid(id);
    await resolveFlowCalls(order.table_id, CALL_MSG_CASH);
    await fireOrderAfterPayment(id, "cash", Number(pending.amount));

    const totals = await orderRepo.getOrderTotals(id);
    return res.status(200).json({
      message: "Cash received — order sent to the kitchen!",
      data: { paid: true, method: "cash", confirmed_by: `${staff.first_name} ${staff.last_name}`, totals },
    });
  } catch (error) {
    console.error(error);
    return res.status(400).json({ message: "Confirming cash payment failed." });
  }
});

/* POST /orders/:id/cancel - abandon an unpaid checkout (back to cart) */
orderRouter.post("/:id/cancel", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const order = await orderRepo.findById(id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (req.user.table_id !== order.table_id) {
      return res.status(403).json({ message: "Only the ordering table can cancel this order" });
    }
    if (order.status !== "pending_payment") {
      return res.status(400).json({ message: "Only unpaid orders can be cancelled" });
    }

    await executeQueryForRepo(
      `UPDATE dbo.order_details SET status = 'cancelled', updated_at = SYSDATETIME()
       WHERE orders_id = ? AND is_deleted = 0`,
      [id]
    );
    await orderRepo.updateOrderStatus(id, "cancelled");
    await resolveFlowCalls(order.table_id, CALL_MSG_VERIFY);
    await resolveFlowCalls(order.table_id, CALL_MSG_CASH);

    return res.status(200).json({ message: "Checkout cancelled." });
  } catch (error) {
    console.error(error);
    return res.status(400).json({ message: "Cancelling checkout failed." });
  }
});

/* GET /orders/my-orders - the logged-in tablet's open orders (Order Status screen) */
orderRouter.get("/my-orders", authMiddleware, async (req, res) => {
  try {
    const table_id = req.user.table_id;
    if (!table_id) {
      return res.status(403).json({ message: "Only a logged-in table can view its orders" });
    }
    const orders = await orderRepo.findByTableWithDetails(table_id);
    return res.status(200).json({ data: orders });
  } catch (error) {
    console.error(error);
    return res.status(400).json({ message: "Retrieving orders failed." });
  }
});

/* GET /orders/open - every open order as a ticket (waiter board / KDS).
   Grouped per order with table name + line items; drops off once served. */
orderRouter.get("/open", authMiddleware, async (req, res) => {
  try {
    const tickets = await orderRepo.findOpenOrdersWithDetails();
    return res.status(200).json({ data: tickets });
  } catch (error) {
    console.error(error);
    return res.status(400).json({ message: "Retrieving open tickets failed." });
  }
});

/* GET /orders/kitchen/queue - ticket lines still to cook (future KDS module) */
orderRouter.get("/kitchen/queue", authMiddleware, async (req, res) => {
  try {
    const queue = await orderRepo.findKitchenQueue();
    return res.status(200).json({ data: queue });
  } catch (error) {
    console.error(error);
    return res.status(400).json({ message: "Retrieving kitchen queue failed." });
  }
});

/* GET /orders/waiter/board - per-table attention summary (future waiter module) */
orderRouter.get("/waiter/board", authMiddleware, async (req, res) => {
  try {
    const board = await orderRepo.findWaiterBoard();
    return res.status(200).json({ data: board });
  } catch (error) {
    console.error(error);
    return res.status(400).json({ message: "Retrieving waiter board failed." });
  }
});

/* GET /orders/table/:tableId - staff view of one table's open orders */
orderRouter.get("/table/:tableId", authMiddleware, async (req, res) => {
  try {
    const { tableId } = req.params;
    const orders = await orderRepo.findByTableWithDetails(tableId);
    return res.status(200).json({ data: orders });
  } catch (error) {
    console.error(error);
    return res.status(400).json({ message: "Retrieving table orders failed." });
  }
});

const ORDER_STATUSES = ["placed", "in_progress", "ready", "served", "paid", "cancelled"];
const ITEM_STATUSES = ["queued", "in_progress", "ready_to_serve", "served", "cancelled"];

/* PATCH /orders/:id/status - kitchen/waiter moves the whole order along */
orderRouter.patch("/:id/status", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!ORDER_STATUSES.includes(status)) {
      return res.status(400).json({ message: `status must be one of: ${ORDER_STATUSES.join(", ")}` });
    }

    const order = await orderRepo.findById(id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    await orderRepo.updateOrderStatus(id, status);

    const payload = { orders_id: id, table_id: order.table_id, status };
    emitTo("waiter", "order:status", payload);
    emitTo("kitchen", "order:status", payload);
    emitTo(`table:${order.table_id}`, "order:status", payload);

    return res.status(200).json({ message: "Order status updated!", data: payload });
  } catch (error) {
    console.error(error);
    return res.status(400).json({ message: "Updating order status failed." });
  }
});

/* PATCH /orders/details/:id/status - kitchen updates one ticket line
   ('queued' -> 'in_progress' -> 'ready_to_serve' -> waiter marks 'served') */
orderRouter.patch("/details/:id/status", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!ITEM_STATUSES.includes(status)) {
      return res.status(400).json({ message: `status must be one of: ${ITEM_STATUSES.join(", ")}` });
    }

    const updated = await orderRepo.updateItemStatus(id, status);
    if (!updated) return res.status(404).json({ message: "Order item not found" });

    emitTo("waiter", "order:item-status", updated);
    emitTo("kitchen", "order:item-status", updated);
    emitTo(`table:${updated.table_id}`, "order:item-status", updated);

    // Ticking items moves the whole order along (placed -> in_progress ->
    // ready -> served); a fully served order drops off the waiter board.
    const orderChange = await orderRepo.syncOrderStatus(updated.orders_id);
    if (orderChange) {
      emitTo("waiter", "order:status", orderChange);
      emitTo("kitchen", "order:status", orderChange);
      emitTo(`table:${orderChange.table_id}`, "order:status", orderChange);
    }

    return res.status(200).json({
      message: "Item status updated!",
      data: { ...updated, order_status: orderChange ? orderChange.status : undefined },
    });
  } catch (error) {
    console.error(error);
    return res.status(400).json({ message: "Updating item status failed." });
  }
});

module.exports = orderRouter;
