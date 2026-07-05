const { executeQueryForRepo } = require("../db");
const { GenericRepository } = require("./genericRepository");

class CategoryRepository extends GenericRepository {
  constructor() {
    super("dbo.categories", "category_id");
  }

  async validateExistingCategory(discount_type) {
    const results = await executeQueryForRepo(
      `SELECT COUNT(*) AS 'DiscountCount' FROM dbo.discounts WHERE discount_type = '${discount_type}' AND is_deleted = 0`,
    );

    return results[0] || null;
  }
}

module.exports = { CategoryRepository };
