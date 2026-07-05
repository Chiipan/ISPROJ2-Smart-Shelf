const express = require("express");
const cors = require("cors");
const { PORT } = require("./config");

const tableRouter = require("./routes/tables");
const roleRouter = require("./routes/roles");
const authRouter = require("./routes/auth");
const staffRouter = require("./routes/staff");
const discountRouter = require("./routes/discount");
const categoryRouter = require("./routes/category");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/roles", roleRouter);
app.use("/tables", tableRouter);
app.use("/auth", authRouter);
app.use("/staff", staffRouter);
app.use("/discount", discountRouter);
app.use("/category", categoryRouter);

// Start server
app.listen(PORT, () => {
  console.log(`Server is now established on http://localhost:${PORT}`);
});
