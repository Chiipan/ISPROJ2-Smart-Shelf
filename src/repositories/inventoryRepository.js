const { GenericRepository } = require("./genericRepository");
const { executeQueryForRepo } = require("../db");
const { v4: uuidv4 } = require("uuid");

class InventoryRepository extends GenericRepository {
  constructor() {
    super("dbo.inventory", "inventory_id");
  }

  // Admin overview: every ingredient with its stock, threshold, and which
  // menu items consume it. stock_status computed: 'out' | 'low' | 'ok'.
  async findOverview() {
    const rows = await executeQueryForRepo(
      `SELECT i.inventory_id, i.item_name, i.unit_of_measure,
              i.quantity_in_stock, i.reorder_level, i.unit_cost, i.available,
              STRING_AGG(mi.menu_title, ', ') AS used_by
       FROM dbo.inventory i
       LEFT JOIN dbo.recipes_inventory ri
         ON ri.inventory_id = i.inventory_id AND ri.is_deleted = 0
       LEFT JOIN dbo.menu_item mi
         ON mi.menu_item_id = ri.menu_item_id AND mi.is_deleted = 0
       WHERE i.is_deleted = 0
       GROUP BY i.inventory_id, i.item_name, i.unit_of_measure,
                i.quantity_in_stock, i.reorder_level, i.unit_cost, i.available
       ORDER BY i.item_name`
    );

    return rows.map((r) => {
      const qty = Number(r.quantity_in_stock);
      const reorder = Number(r.reorder_level);
      return {
        ...r,
        stock_status: qty <= 0 ? "out" : qty <= reorder ? "low" : "ok",
      };
    });
  }

  async findLowStock() {
    return executeQueryForRepo(`SELECT * FROM dbo.vw_low_stock ORDER BY item_name`);
  }

  // Recipe-driven stock deduction for a fired (paid) order. Shared
  // ingredients deduct for every dish that uses them - e.g. Cheeseburger
  // and Cheesy Fries both consuming 'Cheddar Slice'. Every movement lands
  // in inventory_logs tied to the order_details line.
  async deductForOrder(order) {
    for (const item of order.items) {
      const recipes = await executeQueryForRepo(
        `SELECT inventory_id, amount_needed FROM dbo.recipes_inventory
         WHERE menu_item_id = ? AND is_deleted = 0`,
        [item.menu_item_id]
      );

      for (const r of recipes) {
        const change = -(Number(r.amount_needed) * item.quantity);

        await executeQueryForRepo(
          `UPDATE dbo.inventory
           SET quantity_in_stock = quantity_in_stock + ?,
               available = CASE WHEN quantity_in_stock + ? <= 0 THEN 0 ELSE available END,
               updated_at = SYSDATETIME()
           WHERE inventory_id = ?`,
          [change, change, r.inventory_id]
        );

        await executeQueryForRepo(
          `INSERT INTO dbo.inventory_logs
             (inventory_logs_id, inventory_id, order_details_id, change_type, quantity_change)
           VALUES (?, ?, ?, 'order_deduction', ?)`,
          [uuidv4(), r.inventory_id, item.order_details_id, change]
        );
      }
    }
  }

  // Manual stock movement from the admin page (restock / adjustment /
  // spoilage). quantity_change is signed; restocks are positive.
  async adjustStock(inventory_id, quantity_change, change_type = "restock") {
    await executeQueryForRepo(
      `UPDATE dbo.inventory
       SET quantity_in_stock = quantity_in_stock + ?,
           available = CASE WHEN quantity_in_stock + ? > 0 THEN 1 ELSE 0 END,
           updated_at = SYSDATETIME()
       WHERE inventory_id = ?`,
      [quantity_change, quantity_change, inventory_id]
    );

    await executeQueryForRepo(
      `INSERT INTO dbo.inventory_logs
         (inventory_logs_id, inventory_id, change_type, quantity_change)
       VALUES (?, ?, ?, ?)`,
      [uuidv4(), inventory_id, change_type, quantity_change]
    );
  }

  // Automatic menu update: a dish goes 'unavailable' the moment any recipe
  // ingredient can't cover one more serving, and comes back on restock.
  // (Overrides manual menu status flags - fine for the prototype.)
  // Returns items whose status changed so routes can broadcast.
  async syncMenuAvailability() {
    const changed = await executeQueryForRepo(
      `SELECT mi.menu_item_id, mi.menu_title, mi.status AS old_status,
              CASE WHEN short.menu_item_id IS NULL THEN 'available' ELSE 'unavailable' END AS new_status
       FROM dbo.menu_item mi
       LEFT JOIN (
         SELECT DISTINCT ri.menu_item_id
         FROM dbo.recipes_inventory ri
         JOIN dbo.inventory i ON i.inventory_id = ri.inventory_id AND i.is_deleted = 0
         WHERE ri.is_deleted = 0 AND i.quantity_in_stock < ri.amount_needed
       ) short ON short.menu_item_id = mi.menu_item_id
       WHERE mi.is_deleted = 0
         AND mi.status <> CASE WHEN short.menu_item_id IS NULL THEN 'available' ELSE 'unavailable' END`
    );

    for (const c of changed) {
      await executeQueryForRepo(
        `UPDATE dbo.menu_item SET status = ?, updated_at = SYSDATETIME()
         WHERE menu_item_id = ?`,
        [c.new_status, c.menu_item_id]
      );
    }

    return changed.map((c) => ({
      menu_item_id: c.menu_item_id,
      menu_title: c.menu_title,
      status: c.new_status,
    }));
  }
}

module.exports = { InventoryRepository };
