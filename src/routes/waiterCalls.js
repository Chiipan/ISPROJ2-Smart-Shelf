const express = require("express");
const { GenericRepository } = require("../repositories/genericRepository");
const { executeQueryForRepo } = require("../db");
const authMiddleware = require("../middleware/Middleware");
const { emitTo } = require("../realtime");

const waiterCallRouter = express.Router();
const callRepo = new GenericRepository("dbo.waiter_calls", "waiter_call_id");

const REQUEST_TYPES = ["call_waiter", "request_bill", "assistance", "other"];
const CALL_STATUSES = ["pending", "acknowledged", "resolved"];

/* POST /waiter-calls - customer tablet presses "Call Waiter".
   table_id comes from the table-login JWT. */
waiterCallRouter.post("/", authMiddleware, async (req, res) => {
  try {
    const table_id = req.user.table_id;
    if (!table_id) {
      return res.status(403).json({ message: "Only a logged-in table can call a waiter" });
    }

    const request_type = REQUEST_TYPES.includes(req.body.request_type)
      ? req.body.request_type
      : "call_waiter";

    await callRepo.create({
      table_id,
      request_type,
      message: req.body.message || null,
      status: "pending",
      is_deleted: 0,
    });

    const payload = {
      table_id,
      table_name: req.user.table_name,
      request_type,
      message: req.body.message || null,
    };
    // Future waiter dashboard just listens for this in the 'waiter' room
    emitTo("waiter", "waiter:call", payload);

    return res.status(201).json({ message: "Waiter has been called!", data: payload });
  } catch (error) {
    console.error(error);
    return res.status(400).json({ message: "Calling waiter failed." });
  }
});

/* GET /waiter-calls/pending - future waiter dashboard's call list */
waiterCallRouter.get("/pending", authMiddleware, async (req, res) => {
  try {
    const calls = await executeQueryForRepo(
      `SELECT wc.waiter_call_id, wc.table_id, t.table_name, wc.request_type,
              wc.message, wc.status, wc.created_at
       FROM dbo.waiter_calls wc
       JOIN dbo.tables t ON t.table_id = wc.table_id
       WHERE wc.is_deleted = 0 AND wc.status = 'pending'
       ORDER BY wc.created_at ASC`
    );
    return res.status(200).json({ data: calls });
  } catch (error) {
    console.error(error);
    return res.status(400).json({ message: "Retrieving waiter calls failed." });
  }
});

/* PATCH /waiter-calls/:id/status - waiter acknowledges/resolves a call */
waiterCallRouter.patch("/:id/status", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, staff_id } = req.body;
    if (!CALL_STATUSES.includes(status)) {
      return res.status(400).json({ message: `status must be one of: ${CALL_STATUSES.join(", ")}` });
    }

    const call = await callRepo.findById(id);
    if (!call) return res.status(404).json({ message: "Waiter call not found" });

    const update = { status, updated_at: new Date().toISOString() };
    if (staff_id) update.acknowledged_by = staff_id;
    if (status === "resolved") update.resolved_at = new Date().toISOString();
    await callRepo.update(id, update);

    const payload = { waiter_call_id: id, table_id: call.table_id, status };
    emitTo("waiter", "waiter:call-status", payload);
    emitTo(`table:${call.table_id}`, "waiter:call-status", payload);

    return res.status(200).json({ message: "Waiter call updated!", data: payload });
  } catch (error) {
    console.error(error);
    return res.status(400).json({ message: "Updating waiter call failed." });
  }
});

module.exports = waiterCallRouter;
