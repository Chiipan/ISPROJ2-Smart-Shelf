const { GenericRepository } = require("./genericRepository");
const { executeQueryForRepo } = require("../db");

class TableRepository extends GenericRepository {
  constructor() {
    super("dbo.Tables", "table_id");
  }

  // Get all active (not deleted) tables
  async findActive() {
    return executeQueryForRepo(`SELECT * FROM dbo.Tables WHERE is_deleted = 0`);
  }

  async tableLogin(table_name, password) {
    const results = await executeQueryForRepo(`
      SELECT * FROM dbo.tables WHERE table_name= '${table_name}' AND password = '${password}' AND is_deleted=0 AND is_available =1
    `);

    return results[0] || null;
  }

  // Waiter table board: EVERY table, all the time - capacity, availability,
  // pending customer calls, and the table's open order items, merged per table.
  // occupied = manually flagged unavailable OR has open orders.
  async findTableBoard() {
    const tables = await executeQueryForRepo(
      `SELECT table_id, table_name, capacity, is_available
       FROM dbo.tables WHERE is_deleted = 0
       ORDER BY LEN(table_name), table_name`
    );

    const calls = await executeQueryForRepo(
      `SELECT waiter_call_id, table_id, request_type, message, created_at
       FROM dbo.waiter_calls
       WHERE is_deleted = 0 AND status = 'pending'
       ORDER BY created_at ASC`
    );

    const items = await executeQueryForRepo(
      `SELECT o.table_id, o.orders_id, o.status AS order_status,
              od.order_details_id, od.quantity, od.notes, od.status,
              mi.menu_title
       FROM dbo.orders o
       JOIN dbo.order_details od ON od.orders_id = o.orders_id AND od.is_deleted = 0
       JOIN dbo.menu_item mi ON mi.menu_item_id = od.menu_item_id
       WHERE o.is_deleted = 0 AND o.status IN ('placed','in_progress','ready')
       ORDER BY od.created_at ASC`
    );

    return tables.map((t) => {
      const tableCalls = calls.filter((c) => c.table_id === t.table_id);
      const tableItems = items.filter((i) => i.table_id === t.table_id);
      return {
        table_id: t.table_id,
        table_name: t.table_name,
        capacity: t.capacity,
        is_available: t.is_available,
        occupied: !t.is_available || tableItems.length > 0,
        calls: tableCalls,
        items: tableItems,
      };
    });
  }

  // Validate if there is an existing table
  async validateExistingTableName(table_name) {
    const results = await executeQueryForRepo(
      `SELECT COUNT(*) AS 'TableCount' FROM dbo.tables WHERE table_name = '${table_name}' AND is_deleted = 0`,
    );

    return results[0] || null;
  }

  // Get unavailable tables (is_available = 0)
  async findUnavailable() {
    return executeQueryForRepo(
      `SELECT * FROM dbo.Tables WHERE is_available = 0 AND is_deleted = 0`,
    );
  }

  // Get available tables (is_available = 1)
  async findAvailable() {
    return executeQueryForRepo(
      `SELECT * FROM dbo.Tables WHERE is_available = 1 AND is_deleted = 0`,
    );
  }
}

module.exports = { TableRepository };
