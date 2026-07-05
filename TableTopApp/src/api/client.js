// REST client for the TableTop backend (TableTop.JS, port 3002).
//
// Running in the browser (expo web) 'localhost' works as-is.
// On a real Android tablet, replace with your PC's LAN IP,
// e.g. 'http://192.168.1.15:3002' (run `ipconfig` to find it).
export const BASE_URL = 'http://localhost:3002';

let authToken = null;
let tableInfo = null; // { table_id, table_name } decoded from the JWT

export function getTableInfo() {
  return tableInfo;
}

function decodeJwtPayload(token) {
  // JWT = header.payload.signature, payload is base64url JSON
  const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(atob(payload));
}

async function request(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.message || json.error || `Request failed (${res.status})`);
  }
  return json;
}

/* ---- auth ---- */

export async function loginTable(tablename, password) {
  const res = await request('/tables/login-table', {
    method: 'POST',
    body: { tablename, password },
  });
  authToken = res.data;
  const payload = decodeJwtPayload(authToken);
  tableInfo = { table_id: payload.table_id, table_name: payload.table_name };
  return tableInfo;
}

export function logout() {
  authToken = null;
  tableInfo = null;
}

/* ---- menu ---- */

export async function fetchMenu() {
  const res = await request('/menu');
  // Map DB columns to what the UI components expect
  return res.data.map((row) => ({
    id: row.menu_item_id,
    name: row.menu_title,
    category: row.category_name,
    price: Number(row.unit_price),
    description: row.food_item || '',
    image: row.food_pic ? { uri: row.food_pic } : null,
    available: row.status === 'available',
  }));
}

/* ---- orders ---- */

export async function placeOrder(cartItems) {
  const items = cartItems.map((c) => ({
    menu_item_id: c.id,
    quantity: c.quantity,
    notes: c.notes || undefined,
  }));
  const res = await request('/orders', { method: 'POST', body: { items } });
  return res.data;
}

export async function fetchMyOrders() {
  const res = await request('/orders/my-orders');
  return res.data;
}

/* ---- waiter call ---- */

export async function callWaiter(message) {
  const res = await request('/waiter-calls', {
    method: 'POST',
    body: { request_type: 'call_waiter', message },
  });
  return res.data;
}
