const { GenericRepository } = require("./genericRepository");
const { executeQueryForRepo } = require("../db");

class StaffRepository extends GenericRepository {
  constructor() {
    super("dbo.Staff", "staff_id");
  }

  // Staff PIN typed on a customer tablet (Senior/PWD ID verification,
  // cash payment confirmation). Returns the staff row or null.
  async findByCode(staff_code) {
    if (!staff_code) return null;
    const rows = await executeQueryForRepo(
      `SELECT s.staff_id, s.first_name, s.last_name, r.role_name
       FROM dbo.staff s
       LEFT JOIN dbo.roles r ON r.role_id = s.role_id
       WHERE s.staff_code = ? AND s.is_deleted = 0`,
      [String(staff_code)]
    );
    return rows[0] || null;
  }
}

module.exports = { StaffRepository };
