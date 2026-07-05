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
