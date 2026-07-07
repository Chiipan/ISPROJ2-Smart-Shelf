// REST client for the TableTop backend (TableTop.JS, port 3002).
//
// Running in the browser (expo web) 'localhost' works as-is.
// On a real Android tablet, replace with your PC's LAN IP,
// e.g. 'http://192.168.1.15:3002' (run `ipconfig` to find it).
export const BASE_URL = 'http://localhost:3002';

let authToken = null;
let tableInfo = null; // { table_id, table_name } decoded from the JWT
let staffInfo = null; // { user_id, name, role } decoded from the JWT

export function getTableInfo() {
  return tableInfo;
}

export function getStaffInfo() {
  return staffInfo;
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

/* Staff (waiter/kitchen/admin) login - users table, email + password */
export async function loginStaff(email, password) {
  const res = await request('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
  authToken = res.data;
  const payload = decodeJwtPayload(authToken);
  staffInfo = {
    user_id: payload.user_id,
    name: `${payload.first_name || ''} ${payload.last_name || ''}`.trim(),
    role: payload.user_role?.role_name || 'staff',
  };
  return staffInfo;
}

/* Member (registered customer) auth. Runs AFTER the table login and must
   NOT replace the table's token - orders are still placed as the table -
   so these use bare fetch instead of request(). */
export async function loginMember(email, password) {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.message || json.error || `Request failed (${res.status})`);
  }
  const payload = decodeJwtPayload(json.data);
  return {
    name: `${payload.first_name || ''} ${payload.last_name || ''}`.trim(),
    email: payload.email,
    role: payload.user_role?.role_name || 'customer',
  };
}

export async function registerMember({ first_name, last_name, email, password }) {
  const res = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ first_name, last_name, email, password, role: 'customer' }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.message || json.error || `Request failed (${res.status})`);
  }
  return json;
}

export function logout() {
  authToken = null;
  tableInfo = null;
  staffInfo = null;
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

/* ---- waiter table board ---- */

// Every table, all the time: { table_id, table_name, capacity, occupied,
// calls: [pending waiter_calls], items: [open order lines] }
export async function fetchTableBoard() {
  const res = await request('/tables/board');
  return res.data;
}

/* ---- waiter ticket board ---- */

// Every open order as a ticket: { orders_id, table_name, status, items: [...] }
export async function fetchOpenTickets() {
  const res = await request('/orders/open');
  return res.data;
}

// Advance one ticket line: 'queued' -> 'in_progress' -> 'ready_to_serve' -> 'served'
export async function updateItemStatus(orderDetailsId, status) {
  const res = await request(`/orders/details/${orderDetailsId}/status`, {
    method: 'PATCH',
    body: { status },
  });
  return res.data;
}

export async function fetchPendingCalls() {
  const res = await request('/waiter-calls/pending');
  return res.data;
}

export async function updateCallStatus(waiterCallId, status) {
  const res = await request(`/waiter-calls/${waiterCallId}/status`, {
    method: 'PATCH',
    body: { status },
  });
  return res.data;
}

/* ---- checkout + payment (pay-before-kitchen flow) ----
   A real gateway (e.g. PayMongo payment intents) would replace the
   simulated card/qrph steps; the API shape is already gateway-ready. */

// Discount types from the DB (Senior Citizen / PWD, 20%)
export async function fetchDiscounts() {
  const res = await request('/discount');
  return res.data;
}

// Creates a 'pending_payment' order. discount (optional):
// { discount_id, menu_item_ids: [ids of the discount holder's items] }
export async function checkoutOrder(cartItems, discount = null) {
  const items = cartItems.map((c) => ({
    menu_item_id: c.id,
    quantity: c.quantity,
    notes: c.notes || undefined,
  }));
  const res = await request('/orders/checkout', {
    method: 'POST',
    body: { items, discount },
  });
  return res.data;
}

// Waiter at the table approves/denies the Senior/PWD ID with their staff
// code. The table itself may deny (cancel) without a code.
export async function verifyDiscount(ordersId, approve, code) {
  const res = await request(`/orders/${ordersId}/discount/verify`, {
    method: 'POST',
    body: { approve, code },
  });
  return res.data;
}

// method: 'cash' (calls a waiter to collect) | 'card' | 'qrph' (simulated)
export async function payOrder(ordersId, method) {
  const res = await request(`/orders/${ordersId}/pay`, {
    method: 'POST',
    body: { method },
  });
  return res.data;
}

// Waiter confirms the cash was received (staff code on the tablet)
export async function confirmCashPayment(ordersId, code) {
  const res = await request(`/orders/${ordersId}/pay/confirm-cash`, {
    method: 'POST',
    body: { code },
  });
  return res.data;
}

// Abandon an unpaid checkout and return to the cart
export async function cancelCheckout(ordersId) {
  const res = await request(`/orders/${ordersId}/cancel`, { method: 'POST' });
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
