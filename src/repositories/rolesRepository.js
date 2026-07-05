const { GenericRepository } = require("./genericRepository");
const { executeQueryForRepo } = require("../db");

class RolesRepository extends GenericRepository {
  constructor() {
    super("dbo.Roles", "role_id");
  }

  // Get all active roles (not deleted)
  async findActive() {
    return executeQueryForRepo(`SELECT * FROM dbo.Roles WHERE is_deleted = 0`);
  }

  async validateExistingRole(role_name) {
    const results = await executeQueryForRepo(
      `SELECT COUNT(*) AS 'RoleCount' FROM dbo.roles WHERE role_name = '${role_name}' AND is_deleted = 0`,
    );

    return results[0] || null;
  }

  async retrieveRoleByEmail(email) {
    const results = await executeQueryForRepo(
      `  SELECT roles.role_name FROM roles_and_users JOIN users ON users.user_id = roles_and_users.user_id JOIN roles ON roles.role_id = roles_and_users.role_id WHERE email = '${email}' AND roles.is_deleted=0`,
      [email],
    );

    return results[0] || null;
  }

  async deactivateRole(id) {
    return executeQueryForRepo(
      `UPDATE dbo.Roles SET is_deleted=0 WHERE role_id =?`,
      [id],
    );
  }

  // Get active role ID by role name
  async findActiveRoleIdByName(name) {
    const roles = await executeQueryForRepo(
      `
      SELECT *
      FROM dbo.Roles
      WHERE is_deleted = 0 AND role_name = ?
      `,
      [name],
    );

    if (roles.length === 0) {
      throw new Error("Role not found");
    }

    return roles[0].role_id;
  }
}

module.exports = { RolesRepository };
