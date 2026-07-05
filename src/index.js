const express = require("express");
const http = require("http");
const cors = require("cors");
const { PORT } = require("./config");
const { initRealtime } = require("./realtime");

const tableRouter = require("./routes/tables");
const roleRouter = require("./routes/roles");
const authRouter = require("./routes/auth");
const staffRouter = require("./routes/staff");
const discountRouter = require("./routes/discount");
const categoryRouter = require("./routes/category");
const menuRouter = require("./routes/menu");
const orderRouter = require("./routes/orders");
const waiterCallRouter = require("./routes/waiterCalls");

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
app.use("/menu", menuRouter);
app.use("/orders", orderRouter);
app.use("/waiter-calls", waiterCallRouter);

// Socket.IO shares the same HTTP server/port as the REST API
const server = http.createServer(app);
initRealtime(server);

// Start server
server.listen(PORT, () => {
  console.log(`Server is now established on http://localhost:${PORT}`);
});
