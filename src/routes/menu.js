const express = require("express");
const { MenuRepository } = require("../repositories/menuRepository");
const authMiddleware = require("../middleware/Middleware");

const menuRouter = express.Router();
const menuRepo = new MenuRepository();

// GET /menu - full menu with categories (customer tablet, after table login)
menuRouter.get("/", authMiddleware, async (req, res) => {
  try {
    const menu = await menuRepo.findAllWithCategory();
    return res.status(200).json({ data: menu });
  } catch (error) {
    console.error(error);
    return res.status(400).json({ message: "Retrieving menu failed." });
  }
});

// GET /menu/:id
menuRouter.get("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: "Id is required" });

    const item = await menuRepo.findById(id);
    if (!item) return res.status(404).json({ message: "Menu item not found" });
    return res.status(200).json({ data: item });
  } catch (error) {
    console.error(error);
    return res.status(400).json({ message: "Retrieving menu item failed." });
  }
});

// POST /menu - admin adds a menu item
menuRouter.post("/", authMiddleware, async (req, res) => {
  try {
    const menuData = req.body;
    if (!menuData.menu_title || !menuData.category_id || menuData.unit_price === undefined) {
      return res.status(400).json({ message: "menu_title, category_id and unit_price are required" });
    }

    menuData.status = menuData.status || "available";
    menuData.created_at = menuData.created_at || new Date().toISOString();
    menuData.updated_at = menuData.updated_at || new Date().toISOString();
    menuData.is_deleted = 0;

    await menuRepo.create(menuData);
    return res.status(201).json({ message: "Menu item created successfully!", data: menuData });
  } catch (error) {
    console.error(error);
    return res.status(400).json({ message: "Creating menu item failed." });
  }
});

// PUT /menu/:id - admin edits a menu item (price, availability, etc.)
menuRouter.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const menuData = req.body;
    if (!id) return res.status(400).json({ message: "Id is required" });

    menuData.updated_at = menuData.updated_at || new Date().toISOString();
    await menuRepo.update(id, menuData);
    return res.status(200).json({ message: "Menu item updated successfully!" });
  } catch (error) {
    console.error(error);
    return res.status(400).json({ message: "Updating menu item failed." });
  }
});

// DELETE /menu/:id (soft delete)
menuRouter.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: "Id is required" });

    await menuRepo.softDelete(id);
    return res.status(200).json({ message: "Menu item deleted successfully!" });
  } catch (error) {
    console.error(error);
    return res.status(400).json({ message: "Deleting menu item failed." });
  }
});

module.exports = menuRouter;
