const { GenericRepository } = require("./genericRepository");
const { executeQueryForRepo } = require("../db");

class DiscountRepository extends GenericRepository {
  constructor() {
    super("dbo.discounts", "discount_id");
  }

  async validateExistingDiscountType(discount_type) {
    const results = await executeQueryForRepo(
      `SELECT COUNT(*) AS 'DiscountCount' FROM dbo.discounts WHERE discount_type = '${discount_type}' AND is_deleted = 0`,
    );

    return results[0] || null;
  }
}

module.exports = { DiscountRepository };
