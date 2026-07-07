const { executeQueryForRepo } = require("../db");

// Read-model for the admin dashboard. Sales truth = paid payments rows;
// vw_daily_sales / vw_item_sales are shipped in 01_schema.sql.
class SalesRepository {
  // Gross sales + order count for today
  async today() {
    const rows = await executeQueryForRepo(
      `SELECT COUNT(DISTINCT orders_id) AS orders_count,
              ISNULL(SUM(amount), 0)    AS gross_sales
       FROM dbo.payments
       WHERE is_deleted = 0 AND status = 'paid'
         AND CAST(paid_at AS DATE) = CAST(SYSDATETIME() AS DATE)`
    );
    return rows[0];
  }

  // Per-day gross sales for the last N days (newest first)
  async daily(days = 7) {
    return executeQueryForRepo(
      `SELECT sales_date, orders_count, gross_sales
       FROM dbo.vw_daily_sales
       WHERE sales_date >= DATEADD(DAY, -?, CAST(SYSDATETIME() AS DATE))
       ORDER BY sales_date DESC`,
      [days]
    );
  }

  // How customers are paying (cash vs card vs QRPh) over the last N days
  async paymentBreakdown(days = 7) {
    return executeQueryForRepo(
      `SELECT payment_method,
              COUNT(*)    AS payments_count,
              SUM(amount) AS total_amount
       FROM dbo.payments
       WHERE is_deleted = 0 AND status = 'paid'
         AND paid_at >= DATEADD(DAY, -?, CAST(SYSDATETIME() AS DATE))
       GROUP BY payment_method
       ORDER BY total_amount DESC`,
      [days]
    );
  }

  // Every menu item with lifetime qty/revenue - zero-sale items included
  // so the slow-movers list can surface dishes nobody orders.
  async itemSales() {
    return executeQueryForRepo(
      `SELECT mi.menu_item_id, mi.menu_title, mi.status, c.category_name,
              ISNULL(vs.total_qty_sold, 0) AS total_qty_sold,
              ISNULL(vs.total_revenue, 0)  AS total_revenue
       FROM dbo.menu_item mi
       JOIN dbo.categories c ON c.category_id = mi.category_id
       LEFT JOIN dbo.vw_item_sales vs ON vs.menu_item_id = mi.menu_item_id
       WHERE mi.is_deleted = 0
       ORDER BY total_qty_sold DESC, mi.menu_title`
    );
  }
}

module.exports = { SalesRepository };
