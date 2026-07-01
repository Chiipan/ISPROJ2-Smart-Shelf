
const { executeQueryForRepo } = require("../db");
const { v4: uuidv4 } = require("uuid");

class GenericRepository {
  constructor(tableName, idColumn) {
    this.tableName = tableName;
    this.idColumn = idColumn;
  }

  // Get all rows
  async findAll() {
    return executeQueryForRepo(`SELECT * FROM ${this.tableName}`);
  }


  //Customize Retrieve
  async customSQL(sqlString)
  {
    return executeQueryForRepo(sqlString);
  }

  // Soft delete a row
  async softDelete(id) {
    await executeQueryForRepo(
      `UPDATE ${this.tableName} SET is_deleted = 1 WHERE ${this.idColumn} = ?`,
      [id]
    );
  }

  // Find a row by ID
  async findById(id) {
    const rows = await executeQueryForRepo(
      `SELECT * FROM ${this.tableName} WHERE ${this.idColumn} = ?`,
      [id]
    );
    return rows[0] || null;
  }

  // Create a new row
  async create(entity) {
    const id = uuidv4();
    const entityWithId = { [this.idColumn]: id, ...entity };

    const columns = Object.keys(entityWithId).join(", ");
    const placeholders = Object.keys(entityWithId).map(() => "?").join(", ");
    const values = Object.values(entityWithId);

    await executeQueryForRepo(
      `INSERT INTO ${this.tableName} (${columns})  VALUES (${placeholders})`,
      values
    );
  }

  // Update a row by ID
  async update(id, entity) {
    const setClause = Object.keys(entity)
      .map((key) => `${key} = ?`)
      .join(", ");
    const values = Object.values(entity);

    if (!setClause) return; // nothing to update

    await executeQueryForRepo(
      `UPDATE ${this.tableName} SET ${setClause} WHERE ${this.idColumn} = ?`,
      [...values, id]
    );
  }

  // Hard delete a row
  async delete(id) {
    await executeQueryForRepo(
      `DELETE FROM ${this.tableName} WHERE ${this.idColumn} = ?`,
      [id]
    );
  }
}

module.exports = { GenericRepository };
