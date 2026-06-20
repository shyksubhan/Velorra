/* ============================================================
   VELORRA — Shared API Helper
   Used by all frontend pages to talk to the backend.
   ============================================================ */

const VELORRA_API = 'http://localhost:3001/api';

/* ── Get stored JWT token ── */
function getToken() {
  return localStorage.getItem('velorra_token');
}

/* ── Auth headers ── */
function apiHeaders(includeAuth = true) {
  const h = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (includeAuth && token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

/* ── Generic GET ── */
async function apiGet(endpoint) {
  const res = await fetch(`${VELORRA_API}${endpoint}`, {
    headers: apiHeaders(),
  });
  return res.json();
}

/* ── Generic POST ── */
async function apiPost(endpoint, data, requireAuth = false) {
  const res = await fetch(`${VELORRA_API}${endpoint}`, {
    method: 'POST',
    headers: apiHeaders(requireAuth),
    body: JSON.stringify(data),
  });
  return { ok: res.ok, status: res.status, data: await res.json() };
}

/* ── Generic PATCH ── */
async function apiPatch(endpoint, data) {
  const res = await fetch(`${VELORRA_API}${endpoint}`, {
    method: 'PATCH',
    headers: apiHeaders(),
    body: JSON.stringify(data),
  });
  return { ok: res.ok, data: await res.json() };
}

/* ── Auth: Register ── */
async function apiRegister({ fname, lname, email, phone, password }) {
  return apiPost('/auth/register', { fname, lname, email, phone, password });
}

/* ── Auth: Login ── */
async function apiLogin({ email, password }) {
  return apiPost('/auth/login', { email, password });
}

/* ── Save auth session ── */
function saveSession(token, user) {
  localStorage.setItem('velorra_token', token);
  localStorage.setItem('velorra_user', JSON.stringify(user));
}

/* ── Clear auth session ── */
function clearSession() {
  localStorage.removeItem('velorra_token');
  localStorage.removeItem('velorra_user');
}

/* ── Get current user from localStorage ── */
function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem('velorra_user') || 'null');
  } catch { return null; }
}

/* ── Place order ── */
async function apiPlaceOrder({ items, delivery, paymentMethod, deliveryMethod }) {
  return apiPost('/orders', { items, delivery, paymentMethod, deliveryMethod });
}

/* ── Get orders by user email ── */
async function apiGetUserOrders(email) {
  return apiGet(`/orders/user/${encodeURIComponent(email)}`);
}

/* ── Newsletter subscribe ── */
async function apiSubscribeNewsletter(email) {
  return apiPost('/newsletter', { email });
}

/* ── Contact form ── */
async function apiSendContact({ name, email, phone, subject, message }) {
  return apiPost('/contact', { name, email, phone, subject, message });
}

/* ── Check if backend is reachable ── */
async function checkBackend() {
  try {
    const res = await fetch(`${VELORRA_API}/health`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}
