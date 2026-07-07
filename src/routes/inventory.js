const express = require("express");
const { InventoryRepository } = require("../repositories/inventoryRepository");
const authMiddleware = require("../middleware/Middleware");
const { emitTo, broadcast } = require("../realtime");

const inventoryRouter = express.Router();
const inventoryRepo = new InventoryRepository();

/* GET /inventory - admin overview: stock, thresholds, status
   ('ok'|'low'|'out'), and which menu items use each ingredient */
inventoryRouter.get("/", authMiddleware, async (req, res) => {
  try {
    const overview = await inventoryRepo.findOverview();
    return res.status(200).json({ data: overview });
  } catch (error) {
    console.error(error);
    return res.status(400).json({ message: "Retrieving inventory failed." });
  }
});

/* GET /inventory/low-stock - items at/below their reorder threshold */
inventoryRouter.get("/low-stock", authMiddleware, async (req, res) => {
  try {
    const low = await inventoryRepo.findLowStock();
    return res.status(200).json({ data: low });
  } catch (error) {
    console.error(error);
    return res.status(400).json({ message: "Retrieving low stock failed." });
  }
});

/* POST /inventory/:id/adjust - manual stock movement from the admin page.
   Body: { quantity_change: signed number, change_type?: 'restock' |
   'adjustment' | 'spoilage' }. Restocking can flip menu items back to
   'available' - the change is broadcast so tablets refresh their menus. */
inventoryRouter.post("/:id/adjust", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const quantity_change = Number(req.body.quantity_change);
    const change_type = ["restock", "adjustment", "spoilage"].includes(req.body.change_type)
      ? req.body.change_type
      : "restock";

    if (!Number.isFinite(quantity_change) || quantity_change === 0) {
      return res.status(400).json({ message: "quantity_change must be a non-zero number" });
    }

    const item = await inventoryRepo.findById(id);
    if (!item || item.is_deleted) {
      return res.status(404).json({ message: "Inventory item not found" });
    }

    await inventoryRepo.adjustStock(id, quantity_change, change_type);
    const menuChanges = await inventoryRepo.syncMenuAvailability();

    emitTo("admin", "inventory:update", { inventory_id: id });
    if (menuChanges.length > 0) broadcast("menu:availability", menuChanges);

    const overview = await inventoryRepo.findOverview();
    return res.status(200).json({
      message: "Stock updated!",
      data: { inventory: overview, menu_changes: menuChanges },
    });
  } catch (error) {
    console.error(error);
    return res.status(400).json({ message: "Adjusting stock failed." });
  }
});

module.exports = inventoryRouter;
