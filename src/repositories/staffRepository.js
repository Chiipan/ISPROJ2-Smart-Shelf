const { GenericRepository } = require("./genericRepository");

class StaffRepository extends GenericRepository {
  constructor() {
    super("dbo.Staff", "staff_id");
  }

}

module.exports = { StaffRepository };
