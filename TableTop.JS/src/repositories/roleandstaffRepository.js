const { GenericRepository } = require("./genericRepository");
const { executeQueryForRepo } = require("../db");

class RolesAndStaffRepository extends GenericRepository {
  constructor() {
    super("dbo.Roles_And_Users", "roles_and_users_id");
  }
}

module.exports = { RolesAndStaffRepository };
