const express = require("express");
const { OrderRepository } = require("../repositories/orderRepository");
const { MenuRepository } = require("../repositories/menuRepository");
const authMiddleware = require("../middleware/Middleware");
const { emitTo } = require("../realtime");

const orderRouter = express.Router();
const orderRepo = new OrderRepository();
const menuRepo = new MenuRepository();

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

    const items = req.body.items;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "items array is required" });
    }
    for (const item of items) {
      if (!item.menu_item_id || !Number.isInteger(item.quantity) || item.quantity <= 0) {
        return res.status(400).json({ message: "Each item needs menu_item_id and a positive integer quantity" });
      }
    }

    // Verify every item exists and is available; take price from DB
    const ids = items.map((i) => i.menu_item_id);
    const menuRows = await menuRepo.findAvailableByIds(ids);
    const menuById = new Map(menuRows.map((m) => [m.menu_item_id, m]));

    const verified = [];
    for (const item of items) {
      const menuItem = menuById.get(item.menu_item_id);
      if (!menuItem) {
        return res.status(400).json({ message: `Menu item ${item.menu_item_id} does not exist` });
      }
      if (menuItem.status !== "available") {
        return res.status(400).json({ message: `${menuItem.menu_title} is currently unavailable` });
      }
      verified.push({
        menu_item_id: item.menu_item_id,
        menu_title: menuItem.menu_title,
        price: Number(menuItem.unit_price),
        quantity: item.quantity,
        notes: item.notes,
      });
    }

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

    return res.status(200).json({ message: "Item status updated!", data: updated });
  } catch (error) {
    console.error(error);
    return res.status(400).json({ message: "Updating item status failed." });
  }
});

module.exports = orderRouter;
