// Shared Socket.IO connection to the backend (same port as the REST API).
//
// Usage:
//   const socket = getSocket();
//   joinRoom('waiter');                    // waiter dashboard
//   joinRoom(`table:${table_id}`);         // customer tablet
//   socket.on('order:item-status', cb);    // then just listen
//
// The server broadcasts: order:new, order:status, order:item-status,
// waiter:call, waiter:call-status (see src/realtime.js in the backend).
import { io } from 'socket.io-client';
import { BASE_URL } from './client';

let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io(BASE_URL, {
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}

export function joinRoom(room) {
  getSocket().emit('join', room);
}

export function leaveRoom(room) {
  if (socket) socket.emit('leave', room);
}
