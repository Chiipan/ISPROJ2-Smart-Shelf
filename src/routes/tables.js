const express = require("express");
const { GenericRepository } = require("../repositories/genericRepository");
const { TableRepository } = require("../repositories/tableRepository");
const authMiddleware = require("../middleware/Middleware");
const RoleMiddleware = require("../middleware/RoleMiddleware");
const OrderService = require("../services/orderServices")

const tableService = new OrderService();
const tableRouter = express.Router();
const tableRepo = new TableRepository();

// GET all tables
tableRouter.get("/", authMiddleware, async (req, res) => {
  try {
    const tables =await tableRepo.findAll();
    res.status(201).json(tables);
  } catch (err) {
    res.status(400).json({ error: "Retrieve tables failed" });
  }
});

// GET waiter table board - every table with capacity, availability,
// pending calls, and open order items (see tableRepo.findTableBoard)
tableRouter.get("/board", authMiddleware, async (req, res) => {
  try {
    const board = await tableRepo.findTableBoard();
    res.status(200).json({ data: board });
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: "Retrieve table board failed" });
  }
});

// GET active tables
tableRouter.get("/retrieve-active-table", authMiddleware, async (req, res) => {
  try {
    const retrieveActiveTable = await tableRepo.findActive();
    res.status(201).json(retrieveActiveTable);
  } catch (error) {
    res.status(400).json({ error: "Retrieve active tables failed" });
  }
});

// GET table details by ID
tableRouter.get("/retrieve-table-details/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "ID is required" });
    }

    const retrieveAvailableTable = await tableRepo.findById(id);
    res.status(201).json(retrieveAvailableTable);
  } catch (error) {
    res.status(400).json({ error: "Retrieve active tables failed" });
  }
});

// GET unavailable tables
tableRouter.get("/retrieve-unavailable-table", authMiddleware, async (req, res) => {
  try {
    const retrieveAvailableTable = await tableRepo.findUnavailable();
    res.status(201).json(retrieveAvailableTable);
  } catch (error) {
    res.status(400).json({ error: "Retrieve active tables failed" });
  }
});

// GET available tables
tableRouter.get("/retrieve-available-table", authMiddleware, async (req, res) => {
  try {
    const retrieveAvailableTable = await tableRepo.findAvailable();
    res.status(201).json(retrieveAvailableTable);
  } catch (error) {
    res.status(400).json({ error: "Retrieve active tables failed" });
  }
});

// UPDATE table by ID
tableRouter.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    updateData.updated_at = updateData.updated_at || new Date().toISOString();
    const validateExistingTable = await tableRepo.validateExistingTableName(req.body.table_name)

    if (!id) {
      return res.status(400).json({ error: "ID is required" });
    }

    if(validateExistingTable.TableCount > 0)
    {
      return res.status(400).json({error: "Table already exists"})
    }

    await tableRepo.update(id, updateData);
    res.status(200).json({ message: "Table updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: "Update table failed" });
  }
});

// DELETE table by ID (soft delete)
tableRouter.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: "ID is required" });
    }

    const deleteTableRepo = new GenericRepository("dbo.Tables", "table_id");
    await deleteTableRepo.softDelete(id);

    res.status(200).json({ message: "Table deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: "Deleted table failed" });
  }
});

// CREATE new table
tableRouter.post("/", authMiddleware, async (req, res) => {
  try {
    const tableData = req.body;
    const validateExistingTable = await tableRepo.validateExistingTableName(req.body.table_name)

    if (!tableData.table_name || tableData.capacity === undefined || tableData.table_type === undefined) {
      return res.status(400).json({ error: "Name, table type, and capacity are required" });
    }

    if(validateExistingTable.TableCount > 0)
    {
      return res.status(400).json({error: "Table already exists"})
    }

    

    tableData.is_deleted = tableData.is_deleted || false;
    tableData.is_available = tableData.is_available || true;
    tableData.created_at = tableData.created_at || new Date().toISOString();
    tableData.updated_at = tableData.updated_at || new Date().toISOString();

    await tableRepo.create(tableData);

    res.status(201).json({ message: "Table created successfully", data: tableData });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Create table failed" });
  }
});


// No authMiddleware here: this IS how a tablet gets its token
tableRouter.post("/login-table", async(req,res)=>{
try {
    const { first_name, last_name, tablename, password } = req.body;

    if (!tablename || !password) {
      return res.status(400).json({ error: "Table name and password are required" });
    }

    const retrieveTable = await tableService.tablelogin(first_name, last_name, tablename, password);
    res.status(200).json({ message: "Table successfully logged!", data: retrieveTable.token });
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: error?.message || error });
  }
})

module.exports = tableRouter;
