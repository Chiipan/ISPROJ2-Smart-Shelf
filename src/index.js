const express = require("express");

const tableRouter = require("./routes/tables");
const roleRouter = require("./routes/roles");
const authRouter = require("./routes/auth");
const staffRouter = require("./routes/staff");
const discountRouter = require("./routes/discount");
const categoryRouter = require("./routes/category");

const app = express();

// Middleware to parse JSON
app.use(express.json());

// Routes
app.use("/roles", roleRouter);
app.use("/tables", tableRouter);
app.use("/auth", authRouter);
app.use("/staff", staffRouter);
app.use("/discount", discountRouter);
app.use("/staff", staffRouter);
app.use("/category", categoryRouter);

// Start server
app.listen(3002, () => {
  console.log("Server is now established.");
});
