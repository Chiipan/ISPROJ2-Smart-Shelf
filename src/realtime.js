// Socket.IO hub for the four modules. Clients join a room right after
// connecting and every server-side emit targets a room, so future dashboards
// (kitchen KDS, waiter board) only need to connect + join + listen.
//
// Rooms:
//   'kitchen'          - kitchen display system
//   'waiter'           - waitstaff dashboard
//   'admin'            - owner/analytics dashboard
//   'table:<table_id>' - one customer tablet
//
// Events emitted by the server:
//   'order:new'          -> kitchen, waiter        (full order + items)
//   'order:status'       -> waiter, table:<id>     (order-level status change)
//   'order:item-status'  -> waiter, table:<id>     (single ticket line update)
//   'waiter:call'        -> waiter                 (customer pressed Call Waiter)
//   'waiter:call-status' -> table:<id>             (call acknowledged/resolved)

const { Server } = require("socket.io");

let io = null;

function initRealtime(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: "*" }, // dev-friendly; tighten before production
  });

  io.on("connection", (socket) => {
    // Client sends: socket.emit('join', 'kitchen') or 'table:<table_id>'
    socket.on("join", (room) => {
      if (typeof room === "string" && room.length <= 100) {
        socket.join(room);
      }
    });

    socket.on("leave", (room) => {
      if (typeof room === "string") socket.leave(room);
    });
  });

  return io;
}

// Safe no-op before init so repositories/routes never crash the request
// path just because sockets are not up.
function emitTo(room, event, payload) {
  if (io) io.to(room).emit(event, payload);
}

module.exports = { initRealtime, emitTo };
