const { executeQueryForRepo } = require("../db");
const { GenericRepository } = require("./genericRepository");

class UsersRepository extends GenericRepository {
  constructor() {
    super("dbo.Users", "user_id");
  }

  // Find a user by email
  async findByEmail(email) {
    const results = await executeQueryForRepo(
      `SELECT * FROM dbo.Users WHERE email = '${email}' AND is_deleted = 0`
    );

    return results[0] || null;
  }

  async findByEmailReturnId(email) {
    const results = await executeQueryForRepo(
      `SELECT user_id FROM dbo.Users WHERE email = '${email}' AND is_deleted = 0`
    );

    return results[0] || null;
  }
}

module.exports = { UsersRepository };
