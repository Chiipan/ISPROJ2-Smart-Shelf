const jwt = require("jsonwebtoken");
const { TableRepository } = require("../repositories/tableRepository");

class OrderService {
  constructor(tableRepo = new TableRepository()) {
    this.tableRepo = tableRepo;
  }

  generateToken(payload) {
    return jwt.sign(payload, "123", { expiresIn: "1h" });
  }

  // Login user
  async tablelogin(first_name, last_name, table_name, password) {
    const table = await this.tableRepo.tableLogin(table_name, password);
    if (!table) {
      throw new Error("Invalid table name or password");
    }

    const token = this.generateToken({
      table_id: table.table_id,
      first_name: first_name,
      last_name: last_name,
      table_name: table.table_name,
    });

    return {
      token,
    };
  }
}

module.exports = OrderService;
