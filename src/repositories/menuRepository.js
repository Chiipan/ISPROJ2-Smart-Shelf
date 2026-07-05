const { executeQueryForRepo } = require("../db");
const { GenericRepository } = require("./genericRepository");

class MenuRepository extends GenericRepository {
  constructor() {
    super("dbo.menu_item", "menu_item_id");
  }

  // Full menu with category names - what the customer tablet renders
  async findAllWithCategory() {
    return executeQueryForRepo(
      `SELECT mi.menu_item_id, mi.menu_title, mi.food_item, mi.food_pic,
              mi.unit_price, mi.status, c.category_id, c.category_name
       FROM dbo.menu_item mi
       JOIN dbo.categories c ON c.category_id = mi.category_id
       WHERE mi.is_deleted = 0
       ORDER BY c.category_name, mi.menu_title`
    );
  }

  // Price check at order time - never trust prices sent by the client
  async findAvailableByIds(ids) {
    if (!ids.length) return [];
    const placeholders = ids.map(() => "?").join(", ");
    return executeQueryForRepo(
      `SELECT menu_item_id, menu_title, unit_price, status
       FROM dbo.menu_item
       WHERE menu_item_id IN (${placeholders}) AND is_deleted = 0`,
      ids
    );
  }
}

module.exports = { MenuRepository };
