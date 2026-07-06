const { executeQueryForRepo } = require("../db");
const { GenericRepository } = require("./genericRepository");
const { v4: uuidv4 } = require("uuid");

class OrderRepository extends GenericRepository {
  constructor() {
    super("dbo.orders", "orders_id");
  }

  // Creates the order header, its line items, and the first order_process
  // stage row. Prices are passed in already verified against menu_item by
  // the route. Returns the full created order so the route can broadcast it.
  async createOrderWithDetails(table_id, items) {
    const orders_id = uuidv4();

    await executeQueryForRepo(
      `INSERT INTO dbo.orders (orders_id, table_id, status) VALUES (?, ?, 'placed')`,
      [orders_id, table_id]
    );

    const details = [];
    for (const item of items) {
      const order_details_id = uuidv4();
      const total = Number((item.price * item.quantity).toFixed(2));

      await executeQueryForRepo(
        `INSERT INTO dbo.order_details
           (order_details_id, orders_id, menu_item_id, price, quantity, total, notes, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'queued')`,
        [order_details_id, orders_id, item.menu_item_id, item.price, item.quantity, total, item.notes || null]
      );

      details.push({
        order_details_id,
        menu_item_id: item.menu_item_id,
        menu_title: item.menu_title,
        price: item.price,
        quantity: item.quantity,
        total,
        notes: item.notes || null,
        status: "queued",
      });
    }

    // Stage history row - prep-time analytics reads this table later
    await executeQueryForRepo(
      `INSERT INTO dbo.order_process (order_process_id, orders_id, stage, completed_at)
       VALUES (?, ?, 'placed', SYSDATETIME())`,
      [uuidv4(), orders_id]
    );

    return { orders_id, table_id, status: "placed", items: details };
  }

  // All orders for one table with their line items (customer Order Status screen)
  async findByTableWithDetails(table_id) {
    const rows = await executeQueryForRepo(
      `SELECT
         o.orders_id, o.status AS order_status, o.order_date,
         od.order_details_id, od.menu_item_id, od.price, od.quantity,
         od.total, od.notes, od.status AS item_status,
         mi.menu_title, mi.food_item, mi.food_pic
       FROM dbo.orders o
       JOIN dbo.order_details od ON od.orders_id = o.orders_id AND od.is_deleted = 0
       JOIN dbo.menu_item mi ON mi.menu_item_id = od.menu_item_id
       WHERE o.table_id = ? AND o.is_deleted = 0
         AND o.status NOT IN ('paid','cancelled')
       ORDER BY o.order_date DESC, od.created_at ASC`,
      [table_id]
    );

    // Group flat rows into orders -> items
    const orders = new Map();
    for (const r of rows) {
      if (!orders.has(r.orders_id)) {
        orders.set(r.orders_id, {
          orders_id: r.orders_id,
          status: r.order_status,
          order_date: r.order_date,
          items: [],
        });
      }
      orders.get(r.orders_id).items.push({
        order_details_id: r.order_details_id,
        menu_item_id: r.menu_item_id,
        menu_title: r.menu_title,
        description: r.food_item,
        food_pic: r.food_pic,
        price: r.price,
        quantity: r.quantity,
        total: r.total,
        notes: r.notes,
        status: r.item_status,
      });
    }
    return [...orders.values()];
  }

  // Every open order as a "ticket" for the waiter/kitchen boards:
  // order header + table name + all line items, oldest order first.
  // Orders drop off the board once served (syncOrderStatus advances them).
  async findOpenOrdersWithDetails() {
    const rows = await executeQueryForRepo(
      `SELECT
         o.orders_id, o.status AS order_status, o.order_date, o.table_id, t.table_name,
         od.order_details_id, od.menu_item_id, od.price, od.quantity,
         od.total, od.notes, od.status AS item_status,
         mi.menu_title, mi.food_item
       FROM dbo.orders o
       JOIN dbo.tables t ON t.table_id = o.table_id
       JOIN dbo.order_details od ON od.orders_id = o.orders_id AND od.is_deleted = 0
       JOIN dbo.menu_item mi ON mi.menu_item_id = od.menu_item_id
       WHERE o.is_deleted = 0 AND o.status IN ('placed','in_progress','ready')
       ORDER BY o.order_date ASC, od.created_at ASC`
    );

    const orders = new Map();
    for (const r of rows) {
      if (!orders.has(r.orders_id)) {
        orders.set(r.orders_id, {
          orders_id: r.orders_id,
          table_id: r.table_id,
          table_name: r.table_name,
          status: r.order_status,
          order_date: r.order_date,
          items: [],
        });
      }
      orders.get(r.orders_id).items.push({
        order_details_id: r.order_details_id,
        menu_item_id: r.menu_item_id,
        menu_title: r.menu_title,
        description: r.food_item,
        price: r.price,
        quantity: r.quantity,
        total: r.total,
        notes: r.notes,
        status: r.item_status,
      });
    }
    return [...orders.values()];
  }

  // Recomputes the parent order's status from its line items after a ticket
  // line changes (placed -> in_progress -> ready -> served). Writes the
  // order_process history row via updateOrderStatus. Returns the broadcast
  // payload when the status changed, null when it did not.
  async syncOrderStatus(orders_id) {
    const rows = await executeQueryForRepo(
      `SELECT status FROM dbo.order_details WHERE orders_id = ? AND is_deleted = 0`,
      [orders_id]
    );
    const statuses = rows.map((r) => r.status);
    if (statuses.length === 0) return null;

    const isDone = (s) => s === "served" || s === "cancelled";
    let next;
    if (statuses.every((s) => s === "cancelled")) {
      next = "cancelled";
    } else if (statuses.every(isDone)) {
      next = "served";
    } else if (statuses.every((s) => s === "ready_to_serve" || isDone(s))) {
      next = "ready";
    } else if (statuses.some((s) => s !== "queued")) {
      next = "in_progress";
    } else {
      next = "placed";
    }

    const order = await this.findById(orders_id);
    if (!order || order.status === next) return null;

    await this.updateOrderStatus(orders_id, next);
    return { orders_id, table_id: order.table_id, status: next };
  }

  // Kitchen queue - uses the view shipped in 01_schema.sql
  async findKitchenQueue() {
    return executeQueryForRepo(
      `SELECT * FROM dbo.vw_kitchen_queue ORDER BY ordered_at ASC`
    );
  }

  // Waiter board - uses the view shipped in 01_schema.sql
  async findWaiterBoard() {
    return executeQueryForRepo(`SELECT * FROM dbo.vw_waiter_board`);
  }

  async updateOrderStatus(orders_id, status) {
    await executeQueryForRepo(
      `UPDATE dbo.orders SET status = ?, updated_at = SYSDATETIME() WHERE orders_id = ?`,
      [status, orders_id]
    );
    await executeQueryForRepo(
      `INSERT INTO dbo.order_process (order_process_id, orders_id, stage, completed_at)
       VALUES (?, ?, ?, SYSDATETIME())`,
      [uuidv4(), orders_id, status]
    );
  }

  // Kitchen updates one ticket line; returns the row (with table_id) so the
  // route can notify the right tablet room.
  async updateItemStatus(order_details_id, status) {
    await executeQueryForRepo(
      `UPDATE dbo.order_details SET status = ?, updated_at = SYSDATETIME()
       WHERE order_details_id = ?`,
      [status, order_details_id]
    );

    const rows = await executeQueryForRepo(
      `SELECT od.order_details_id, od.orders_id, od.status, od.quantity,
              mi.menu_title, o.table_id
       FROM dbo.order_details od
       JOIN dbo.orders o ON o.orders_id = od.orders_id
       JOIN dbo.menu_item mi ON mi.menu_item_id = od.menu_item_id
       WHERE od.order_details_id = ?`,
      [order_details_id]
    );
    return rows[0] || null;
  }
}

module.exports = { OrderRepository };
