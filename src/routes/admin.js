const express = require("express");
const { SalesRepository } = require("../repositories/salesRepository");
const authMiddleware = require("../middleware/Middleware");

const adminRouter = express.Router();
const salesRepo = new SalesRepository();

const FAST_SLOW_COUNT = 5;

/* GET /admin/sales?days=7 - basic sales report:
   today's totals, per-day gross, and payment-method breakdown */
adminRouter.get("/sales", authMiddleware, async (req, res) => {
  try {
    const days = Math.min(Math.max(parseInt(req.query.days || "7", 10) || 7, 1), 90);
    const [today, daily, byMethod] = await Promise.all([
      salesRepo.today(),
      salesRepo.daily(days),
      salesRepo.paymentBreakdown(days),
    ]);
    return res.status(200).json({ data: { days, today, daily, by_method: byMethod } });
  } catch (error) {
    console.error(error);
    return res.status(400).json({ message: "Retrieving sales report failed." });
  }
});

/* GET /admin/items - every menu item's lifetime sales, plus auto-generated
   fast movers (top sellers) and slow movers (fewest sold, including items
   with zero sales) */
adminRouter.get("/items", authMiddleware, async (req, res) => {
  try {
    const items = await salesRepo.itemSales();
    const fast = items
      .filter((i) => Number(i.total_qty_sold) > 0)
      .slice(0, FAST_SLOW_COUNT);
    const slow = [...items]
      .sort((a, b) => Number(a.total_qty_sold) - Number(b.total_qty_sold))
      .slice(0, FAST_SLOW_COUNT);
    return res.status(200).json({ data: { items, fast_movers: fast, slow_movers: slow } });
  } catch (error) {
    console.error(error);
    return res.status(400).json({ message: "Retrieving item sales failed." });
  }
});

module.exports = adminRouter;
