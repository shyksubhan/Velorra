
const API = window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1') ? 'http://localhost:3001/api' : 'https://golnisa.com/api';
let adminToken  = localStorage.getItem('golnisa_admin_token') || null;
let currentUser = null;
let notifications = [];
let sseSource    = null;
let allOrders    = [];
let allProducts  = [];
let allMessages  = [];
let allSubscribers = [];
let allCoupons   = [];

/* ═══════════════════ BOOT ═══════════════════ */
window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('login-password').addEventListener('keydown', e => {
    if (e.key === 'Enter') doLogin();
  });
  document.getElementById('login-username').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('login-password').focus();
  });

  /* Update emoji picker when category changes */
  document.getElementById('p-category')?.addEventListener('change', function() {
    renderEmojiPicker(this.value, '');
  });

  if (adminToken) {
    verifyToken();
  } else {
    showLogin();
  }
});

/* ═══════════════════ AUTH ═══════════════════ */
function showLogin() {
  /* FIX: use style.display directly — NOT classList, which gets overridden by inline styles */
  document.getElementById('login-screen').style.display = 'flex';
}

function hideLogin() {
  /* FIX: directly set display:none — this overrides any CSS class */
  document.getElementById('login-screen').style.display = 'none';
}

async function verifyToken() {
  try {
    const res  = await apiFetch('/auth/me');
    const data = await res.json();
    if (!res.ok || !data.isAdmin) { clearSession(); showLogin(); return; }
    currentUser = data;
    onLoginSuccess();
  } catch {
    clearSession(); showLogin();
  }
}

async function doLogin() {
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl    = document.getElementById('login-error');
  const btn      = document.getElementById('login-btn');

  errEl.style.display = 'none';
  if (!username || !password) { errEl.textContent = 'Enter username and password.'; errEl.style.display = 'block'; return; }

  btn.innerHTML = '<span class="spinner"></span> Signing in…';
  btn.disabled  = true;

  try {
    const res  = await fetch(`${API}/auth/login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email: username, password }),
    });
    const data = await res.json();

    if (!res.ok || !data.user?.isAdmin) {
      errEl.textContent = data.error || 'Invalid credentials. Access denied.';
      errEl.style.display = 'block';
      btn.innerHTML = 'Sign In <i class="fa-solid fa-arrow-right"></i>';
      btn.disabled  = false;
      return;
    }

    adminToken  = data.token;
    currentUser = data.user;
    localStorage.setItem('golnisa_admin_token', adminToken);

    /* ← THE FIX: hide login screen BEFORE calling initDashboard */
    hideLogin();
    onLoginSuccess();

  } catch (err) {
    errEl.textContent = 'Connection error. Is the server running?';
    errEl.style.display = 'block';
    btn.innerHTML = 'Sign In <i class="fa-solid fa-arrow-right"></i>';
    btn.disabled  = false;
  }
}

function onLoginSuccess() {
  hideLogin();
  document.getElementById('admin-name').textContent  = `${currentUser.fname} ${currentUser.lname || ''}`.trim();
  document.getElementById('admin-role-label').textContent = formatRole(currentUser.role);

  applyRolePermissions(currentUser.role);

  /* Supervisors don't have dashboard access (server blocks /admin/stats for
     them) — they're redirected to the Orders page by applyRolePermissions,
     so skip the dashboard fetch entirely for them. */
  if (currentUser.role !== 'supervisor') loadDashboard();

  connectSSE();
}

function applyRolePermissions(role) {
  const existingStyle = document.getElementById('investor-styles');
  if (existingStyle) existingStyle.remove();
  /* Super Admin & CEO — sees everything */
  if (['ceo', 'super_admin'].includes(role)) {
    document.getElementById('activity-btn').style.display = 'inline-flex';
    document.getElementById('nav-spendings').style.display = 'flex';
    document.getElementById('card-spendings').style.display = 'flex';
    return;
  }
  /* Investor — sees everything (read-only), including spendings */
  if (role === 'investor') {
    document.getElementById('nav-spendings').style.display = 'flex';
    document.getElementById('card-spendings').style.display = 'flex';
  }
  /* Hide Add User button for non-super admins */
  document.getElementById('add-user-btn').style.display = 'none';

  /* Admin — hide earnings stats + Excel export buttons */
  if (role === 'admin') {
    /* Hide Settings nav entirely — Change Password access is super_admin only now */
    document.getElementById('nav-settings')?.style.setProperty('display', 'none');
    /* Coupons are super_admin-only — discount decisions stay with the owner */
    document.getElementById('nav-coupons')?.style.setProperty('display', 'none');
    document.getElementById('launch-date-section')?.style.setProperty('display', 'none');
    /* Hide revenue stat card */
    const revenueCard = document.getElementById('s-revenue')?.closest('.stat-card');
    if (revenueCard) revenueCard.style.display = 'none';
    /* Hide daily profit stat card */
    const profitCard = document.getElementById('s-profit')?.closest('.stat-card');
    if (profitCard) profitCard.style.display = 'none';
    const totalProfitCard = document.getElementById('s-total-profit')?.closest('.stat-card');
    if (totalProfitCard) totalProfitCard.style.display = 'none';
    /* Hide Excel export buttons */
    document.querySelectorAll('[onclick*="exportExcel"]').forEach(btn => btn.style.display = 'none');
    /* Hide cost/purchase-price column in products table — only super admin sees margins */
    document.querySelectorAll('.cost-cell').forEach(el => el.style.display = 'none');
    /* Hide lifetime earnings + daily statements sections — super admin only */
    document.getElementById('lifetime-earnings-wrap')?.style.setProperty('display', 'none');
    document.getElementById('daily-statements-wrap')?.style.setProperty('display', 'none');
    document.getElementById('monthly-statements-wrap')?.style.setProperty('display', 'none');
  }

  /* Supervisor — restrict to only Orders + Messages in sidebar */
  if (role === 'supervisor') {
    /* Hide sidebar items not allowed */
    ['nav-dashboard','nav-products','nav-subscribers','nav-roles','nav-settings','nav-coupons'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
    /* Hide Add Social Order button */
    const socBtn = document.getElementById('add-social-order-btn');
    if (socBtn) socBtn.style.display = 'none';
    /* Hide revenue stat card */
    const revenueCard = document.getElementById('s-revenue')?.closest('.stat-card');
    if (revenueCard) revenueCard.style.display = 'none';
    const profitCard = document.getElementById('s-profit')?.closest('.stat-card');
    if (profitCard) profitCard.style.display = 'none';
    const totalProfitCard = document.getElementById('s-total-profit')?.closest('.stat-card');
    if (totalProfitCard) totalProfitCard.style.display = 'none';
    document.querySelectorAll('.cost-cell').forEach(el => el.style.display = 'none');
    document.getElementById('lifetime-earnings-wrap')?.style.setProperty('display', 'none');
    document.getElementById('daily-statements-wrap')?.style.setProperty('display', 'none');
    document.getElementById('monthly-statements-wrap')?.style.setProperty('display', 'none');
    /* Redirect to orders page */
    showPage('orders');
  }

  /* Investor — 100% read-only. Hide all action buttons using a global style injection */
  if (role === 'investor') {
    const style = document.createElement('style');
    style.id = 'investor-styles';
    style.innerHTML = `
      .action-btn, button[onclick*="delete"], button[onclick*="save"], button[onclick*="create"],
      button[onclick*="toggleUserStatus"], button[onclick*="exportExcel"],
      .add-btn, .edit-btn, form button[type="submit"]:not(#profile-form button) {
          display: none !important;
      }
      #add-user-btn, #add-social-order-btn, .product-actions button {
          display: none !important;
      }
      /* Prevent toggling toggles visually */
      #main-app input[type="checkbox"].toggle-checkbox {
          pointer-events: none;
      }
      #main-app select {
          pointer-events: none;
          background-color: #f5f5f5;
      }
    `;
    if (!document.getElementById('investor-styles')) {
      document.head.appendChild(style);
    }
  }
}

function logout() {
  /* Remove investor read-only styles before going back to login */
  const investorStyle = document.getElementById('investor-styles');
  if (investorStyle) investorStyle.remove();
  /* Clear any leftover error messages so login screen is clean */
  const errEl = document.getElementById('login-error');
  if (errEl) { errEl.textContent = ''; errEl.style.display = 'none'; }
  clearSession();
  showLogin();
  document.getElementById('login-username').value = '';
  document.getElementById('login-password').value = '';
  const btn = document.getElementById('login-btn');
  btn.innerHTML = 'Sign In <i class="fa-solid fa-arrow-right"></i>';
  btn.disabled  = false;
}

function clearSession() {
  adminToken  = null;
  currentUser = null;
  localStorage.removeItem('golnisa_admin_token');
  if (sseSource) { sseSource.close(); sseSource = null; }
}

/* ═══════════════════ API HELPER ═══════════════════ */
function apiFetch(path, options = {}) {
  return fetch(`${API}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}`, ...(options.headers || {}) },
  }).then(res => {
    /* Global session-kill handler — if the server says this token is no
       longer valid (password changed elsewhere, account deactivated,
       deleted, etc.) force the user back to the login screen right away
       instead of leaving them on a broken page. Skip this for the
       change-password call itself, since a 401 there just means "wrong
       current password" and should NOT log the user out. */
    if (res.status === 401 && !path.includes('/auth/change-password') && !path.includes('/auth/login')) {
      res.clone().json().then(data => {
        /* Only force-logout + show error if there is an active session.
           If currentUser is already null the user logged out intentionally — don't show anything. */
        if (!currentUser) return;
        clearSession();
        showLogin();
        const err = document.getElementById('login-error');
        if (err) {
          err.textContent = data?.error || 'Your session has ended. Please sign in again.';
          err.style.display = 'block';
        }
      }).catch(() => {
        if (!currentUser) return;
        clearSession();
        showLogin();
      });
    }
    return res;
  });
}

/* ═══════════════════ SSE NOTIFICATIONS ═══════════════════ */
function connectSSE() {
  if (!adminToken) return;
  if (sseSource) sseSource.close();

  sseSource = new EventSource(`${API}/notifications/stream?token=${adminToken}`);

  sseSource.onmessage = (e) => {
    try {
      const payload = JSON.parse(e.data);
      if (payload.event === 'connected') return;

      notifications.unshift({ ...payload, seen: false });
      renderNotifPanel();
      updateNotifDot();

      /* Show browser notification for new orders/messages */
      if (payload.event === 'new_social_order') {
        const d = payload.data;
        const srcLabel = {facebook:'Facebook',instagram:'Instagram',whatsapp:'WhatsApp',tiktok:'TikTok',other:'Other'}[d?.source] || d?.source || 'Social';
        toast(`📱 New ${srcLabel} order from ${d?.customer} — PKR ${(d?.total||0).toLocaleString()}`, 'success');
        loadStats();
        const badge = document.getElementById('social-badge');
        if (badge) { badge.style.display = 'flex'; badge.textContent = parseInt(badge.textContent || '0') + 1; }
        if (document.getElementById('page-social-orders').style.display !== 'none') loadSocialOrders();
      }
      if (payload.event === 'new_order') {
        toast(`🛍️ New order: ${payload.data?.id} from ${payload.data?.customer}`, 'success');
        loadStats();
        if (document.getElementById('page-orders').style.display !== 'none') loadOrders();
      }
      if (payload.event === 'new_message') {
        toast(`✉️ New message from ${payload.data?.from}`, 'success');
        loadStats();
        if (document.getElementById('page-messages').style.display !== 'none') loadMessages();
      }
      if (payload.event === 'new_subscriber') {
        loadStats();
      }

      if (payload.event === 'new_abandoned') {
        const d = payload.data;
        toast(`🛒 Abandoned checkout — ${d?.delivery?.fname || 'Someone'} left without ordering`, 'warning');
        /* Update badge */
        const badge = document.getElementById('abandoned-badge');
        if (badge) { badge.style.display = 'flex'; badge.textContent = parseInt(badge.textContent || '0') + 1; }
        /* Update dashboard stat */
        const stat = document.getElementById('s-abandoned');
        if (stat) stat.textContent = parseInt(stat.textContent || '0') + 1;
        if (document.getElementById('page-abandoned').style.display !== 'none') loadAbandoned();
      }
      if (payload.event === 'visitor_update') {
        /* Real-time visitor count update */
        const count = payload.data?.count ?? 0;
        updateVisitorCount(count);
        if (document.getElementById('page-visitors').style.display !== 'none') {
          renderVisitors(payload.data?.visitors || []);
        }
      }
    } catch {}
  };

  sseSource.onerror = () => {
    /* EventSource reconnects automatically, no manual intervention needed unless closed */
    if (sseSource.readyState === EventSource.CLOSED) {
      setTimeout(() => { if (adminToken) connectSSE(); }, 5000);
    }
  };
}

function renderNotifPanel() {
  const panel = document.getElementById('notif-panel');
  if (!notifications.length) {
    panel.innerHTML = '<div class="notif-item" style="color:var(--muted)">No notifications yet.</div>';
    return;
  }
  panel.innerHTML = notifications.slice(0, 15).map(n => `
    <div class="notif-item ${n.seen ? '' : ''}">
      <div><strong>${eventLabel(n.event)}</strong></div>
      <div>${notifDesc(n)}</div>
      <div class="notif-time">${new Date(n.time).toLocaleString()}</div>
    </div>`).join('');
}

function eventLabel(e) {
  return { new_order:'New Order 📦', new_message:'New Message ✉️', new_subscriber:'New Subscriber 📧', order_status_changed:'Order Updated 🔄', product_added:'Product Added 🛍️', new_social_order:'Social Order 📱' }[e] || e;
}

function notifDesc(n) {
  if (n.event === 'new_order') return `${n.data?.id} — ${n.data?.customer} — PKR ${(n.data?.total || 0).toLocaleString()}`;
  if (n.event === 'new_social_order') return `${n.data?.customer} — PKR ${(n.data?.total || 0).toLocaleString()} via ${n.data?.source}`;
  if (n.event === 'new_message') return `From ${n.data?.from} (${n.data?.email}) — ${n.data?.subject}`;
  if (n.event === 'new_subscriber') return `${n.data?.email} subscribed`;
  if (n.event === 'order_status_changed') return `${n.data?.id} → ${n.data?.status}`;
  return '';
}

function updateNotifDot() {
  const unseen = notifications.filter(n => !n.seen).length;
  document.getElementById('notif-dot').classList.toggle('active', unseen > 0);
}

function toggleNotifPanel() {
  notifications.forEach(n => n.seen = true);
  updateNotifDot();
  renderNotifPanel();
  document.getElementById('notif-panel').classList.toggle('open');
}

/* ═════════════════════ DASHBOARD ═════════════════════ */
let _dashFilter = 'combined'; /* combined | website | social */

function setDashFilter(f) {
  _dashFilter = f;
  /* Update button states */
  ['combined','website','social'].forEach(k => {
    const btn = document.getElementById('dfbtn-' + k);
    if (btn) btn.classList.toggle('active', k === f);
  });
  /* Re-render with cached data */
  if (_lastStatsData) renderDashStats(_lastStatsData);
}

/* Close panel when clicking outside */
document.addEventListener('click', (e) => {
  if (!document.getElementById('notif-wrap').contains(e.target)) {
    document.getElementById('notif-panel').classList.remove('open');
  }
});

/* ═══════════════════ PAGE NAVIGATION ═══════════════════ */
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + name).style.display = 'block';
  document.getElementById('nav-' + name).classList.add('active');

  if (name === 'dashboard') loadDashboard();
  if (name === 'orders')    loadOrders();
  if (name === 'products')  loadProducts();
  if (name === 'messages')  loadMessages();
  if (name === 'subscribers') loadSubscribers();
  if (name === 'reviews')     loadReviews();
  if (name === 'roles')     loadRoles();
  if (name === 'settings') {
    document.getElementById('prof-fname').value = currentUser.fname || '';
    document.getElementById('prof-lname').value = currentUser.lname || '';
    document.getElementById('prof-username').value = currentUser.username || '';
    loadCompanySettings();
    loadSystemInfo();
  }
  if (name === 'spendings') loadSpendings();
  if (name === 'visitors')  loadVisitors();
  if (name === 'abandoned')     loadAbandoned();
  if (name === 'social-orders') loadSocialOrders();
  if (name === 'coupons')       loadCoupons();
  if (name === 'invoices')      loadInvoices();
}

/* ═══════════════════ DASHBOARD ═══════════════════ */
async function loadDashboard() {
  /* Run these concurrently without waiting for all to finish before rendering each */
  loadStats();
  loadRecentOrders();
  loadVisitors();
  loadAbandoned();
  if (['ceo', 'super_admin', 'investor'].includes(currentUser?.role)) {
    loadLifetimeEarnings();
    loadDailyStatements();
    loadMonthlyStatements();
  }
}

let _lastStatsData = null;

async function loadStats() {
  try {
    const res  = await apiFetch('/admin/stats');
    const data = await res.json();
    if (!res.ok) return;
    _lastStatsData = data;
    renderDashStats(data);
    if (data.demoMode) document.getElementById('demo-banner').style.display = 'flex';
  } catch {}
}

function renderDashStats(data) {
  const f = _dashFilter;
  /* Orders count */
  let ordersTotal;
  if (f === 'website')  ordersTotal = data.orders?.total ?? 0;
  else if (f === 'social') ordersTotal = data.socialOrders?.total ?? 0;
  else ordersTotal = (data.orders?.total ?? 0) + (data.socialOrders?.total ?? 0);
  document.getElementById('s-orders').textContent = ordersTotal;

  /* Revenue */
  let rev;
  if (f === 'website')  rev = data.totalRevenue  || 0;
  else if (f === 'social') rev = data.socialRevenue || 0;
  else rev = data.combinedRevenue || (data.totalRevenue||0) + (data.socialRevenue||0);
  document.getElementById('s-revenue').textContent = 'PKR ' + rev.toLocaleString();

  /* Today's profit */
  let todayProfit;
  if (f === 'website')  todayProfit = data.todayProfit  || 0;
  else if (f === 'social') todayProfit = data.todaySocialProfit || 0;
  else todayProfit = data.todayCombinedProfit ?? ((data.todayProfit||0) + (data.todaySocialProfit||0));
  if (todayProfit !== undefined) {
    document.getElementById('s-profit').textContent     = 'PKR ' + todayProfit.toLocaleString();
    document.getElementById('s-profit-sub').textContent = todayProfit > 0 ? 'profit booked today' : 'no profit yet today';
  }

  /* Spendings */
  if (document.getElementById('s-spendings')) {
    const totalSpendings = data.totalSpendings || 0;
    document.getElementById('s-spendings').textContent = 'PKR ' + totalSpendings.toLocaleString();
  }

  /* Total profit */
  let totalProfit;
  if (f === 'website')  totalProfit = data.totalProfit  || 0;
  else if (f === 'social') totalProfit = data.totalSocialProfit || 0;
  else totalProfit = data.totalCombinedProfit ?? ((data.totalProfit||0) + (data.totalSocialProfit||0));
  const tpEl = document.getElementById('s-total-profit');
  if (tpEl) tpEl.textContent = 'PKR ' + (totalProfit||0).toLocaleString();

  document.getElementById('s-products').textContent    = data.products?.total ?? 0;
  document.getElementById('s-subscribers').textContent = data.subscribers?.total ?? 0;
  document.getElementById('s-msgs').textContent        = data.unreadMessages ?? 0;
  document.getElementById('s-users').textContent       = data.users?.total ?? 0;

  /* Invoices */
  if (document.getElementById('s-invoices')) {
    let inv = data.totalInvoices || 0;
    if (f === 'website') inv = data.webInvoicesCount || 0;
    else if (f === 'social') inv = data.socInvoicesCount || 0;
    document.getElementById('s-invoices').textContent = inv;
  }

  /* COD Orders */
  if (document.getElementById('s-cod-orders')) {
    let cod = data.totalCodOrders || 0;
    if (f === 'website') cod = data.webCodOrders || 0;
    else if (f === 'social') cod = data.socCodOrders || 0;
    document.getElementById('s-cod-orders').textContent = cod;
  }

  /* Advance Received */
  if (document.getElementById('s-advance')) {
    let adv = data.totalAdvanceReceived || 0;
    if (f === 'website') adv = data.webAdvanceReceived || 0;
    else if (f === 'social') adv = data.socAdvanceReceived || 0;
    document.getElementById('s-advance').textContent = 'PKR ' + adv.toLocaleString();
  }

  /* Outstanding COD */
  if (document.getElementById('s-outstanding-cod')) {
    let out = data.outstandingCodBalance || 0;
    if (f === 'website') out = data.webOutstandingCod || 0;
    else if (f === 'social') out = data.socOutstandingCod || 0;
    document.getElementById('s-outstanding-cod').textContent = 'PKR ' + out.toLocaleString();
  }

  /* Pending badge — always from website orders */
  const pending = data.orders?.statuses?.Pending || 0;
  document.getElementById('s-pending-text').textContent = pending ? `${pending} pending` : '';
  const badge = document.getElementById('pending-badge');
  badge.textContent = pending;
  badge.style.display = pending ? 'inline-block' : 'none';

  /* Social badge */
  const socPending = (data.socialOrders?.statuses?.Pending || 0);
  const socBadge = document.getElementById('social-badge');
  if (socBadge) { socBadge.textContent = socPending; socBadge.style.display = socPending ? 'flex' : 'none'; }

  const unread = data.unreadMessages || 0;
  const unreadBadge = document.getElementById('unread-badge');
  unreadBadge.textContent = unread;
  unreadBadge.style.display = unread ? 'inline-block' : 'none';

  /* Reviews badge */
  const revBadge = document.getElementById('reviews-badge');
  if (revBadge && data.pendingReviews !== undefined) {
    revBadge.textContent = data.pendingReviews;
    revBadge.style.display = data.pendingReviews ? 'inline-block' : 'none';
  }

  /* Resellers badge */
  const resBadge = document.getElementById('resellers-badge');
  if (resBadge && data.unreadResellers !== undefined) {
    resBadge.textContent = data.unreadResellers;
    resBadge.style.display = data.unreadResellers ? 'inline-block' : 'none';
  }

  /* Abandoned badge */
  const abanBadge = document.getElementById('abandoned-badge');
  if (abanBadge && data.abandonedCheckouts !== undefined) {
    abanBadge.textContent = data.abandonedCheckouts;
    abanBadge.style.display = data.abandonedCheckouts ? 'inline-block' : 'none';
  }
}

async function loadRecentOrders() {
  try {
    const res  = await apiFetch('/admin/recent-orders?limit=8');
    const data = await res.json();
    const tbody = document.getElementById('recent-orders-body');
    if (!data.orders?.length) { tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><i class="fa-solid fa-box-open"></i><p>No orders yet</p></div></td></tr>`; return; }
    tbody.innerHTML = data.orders.map(o => {
      const isSocial = o.isSocial || o.id.startsWith('so-');
      const badge = isSocial ? '<span class="badge" style="background:var(--blue);color:#fff;margin-left:8px;font-size:0.7rem">Social</span>' : '';
      const clickFn = isSocial ? `viewSocialOrder('${o.id}')` : `viewOrder('${o.id}')`;
      return `
      <tr style="cursor:pointer" onclick="${clickFn}">
        <td><code style="color:var(--gold)">${o.id}</code>${badge}</td>
        <td>${o.delivery?.fname || o.customerName || '—'} ${o.delivery?.lname || ''}</td>
        <td>PKR ${(o.total || 0).toLocaleString()}</td>
        <td>${(o.paymentMethod || 'cod').toUpperCase()}</td>
        <td><span class="badge badge-${o.status?.toLowerCase()}">${o.status}</span></td>
        <td>${fmtDate(o.createdAt)}</td>
      </tr>`;
    }).join('');
  } catch {}
}

/* ═══════════════════ PROFIT — LIFETIME EARNINGS (super_admin only) ═══════════════════ */
let lifetimeEarningsData = null;

async function loadLifetimeEarnings() {
  try {
    const res  = await apiFetch('/admin/profit-summary');
    const data = await res.json();
    if (!res.ok) return;
    lifetimeEarningsData = data;
    document.getElementById('lt-revenue').textContent = 'PKR ' + (data.totals?.revenue || 0).toLocaleString();
    document.getElementById('lt-cost').textContent    = 'PKR ' + (data.totals?.cost || 0).toLocaleString();
    document.getElementById('lt-profit').textContent  = 'PKR ' + (data.totals?.profit || 0).toLocaleString();
    document.getElementById('lt-orders').textContent  = data.totals?.orders ?? 0;
    document.getElementById('lifetime-since').textContent = data.since ? `Tracking since ${fmtDate(data.since)}` : '';
  } catch {}
}

/* ═══════════════════ PROFIT — DAILY STATEMENTS (super_admin only) ═══════════════════ */
let dailyStatementsData = [];

async function loadDailyStatements() {
  const tbody = document.getElementById('daily-statements-body');
  tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:30px"><div class="spinner"></div></td></tr>`;
  try {
    const res  = await apiFetch('/admin/daily-statements/history?days=30');
    const data = await res.json();
    if (!res.ok) { tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><p>${data.error || 'Failed to load statements.'}</p></div></td></tr>`; return; }
    dailyStatementsData = data.statements || [];
    renderDailyStatements(dailyStatementsData);
  } catch { tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><p>Failed to load statements.</p></div></td></tr>`; }
}

function renderDailyStatements(statements) {
  const tbody = document.getElementById('daily-statements-body');
  if (!statements.length) { tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><i class="fa-solid fa-receipt"></i><p>No statements yet</p></div></td></tr>`; return; }
  tbody.innerHTML = statements.map(s => {
    const itemsSold = s.lines.reduce((sum, l) => sum + (l.qty || 0), 0);
    return `
    <tr>
      <td>${new Date(s.date).toLocaleDateString('en-PK', { day:'2-digit', month:'short', year:'numeric' })}${s.date === today() ? ' <span class="badge badge-new" style="background:rgba(34,197,94,.15);color:var(--green)">Today</span>' : ''}</td>
      <td>${itemsSold}</td>
      <td>${s.totals.orders}</td>
      <td>PKR ${s.totals.revenue.toLocaleString()}</td>
      <td>PKR ${s.totals.cost.toLocaleString()}</td>
      <td style="font-weight:700;color:${s.totals.profit > 0 ? 'var(--green)' : 'var(--muted)'}">PKR ${s.totals.profit.toLocaleString()}</td>
      <td><button class="btn btn-outline btn-sm" onclick="viewDayStatement('${s.date}')" ${s.lines.length ? '' : 'disabled'}>Details</button></td>
    </tr>`;
  }).join('');
}

function viewDayStatement(dateStr) {
  const s = dailyStatementsData.find(x => x.date === dateStr);
  if (!s) return;
  document.getElementById('day-statement-title').textContent = `Statement — ${new Date(dateStr).toLocaleDateString('en-PK', { day:'2-digit', month:'long', year:'numeric' })}`;
  if (!s.lines.length) {
    document.getElementById('day-statement-body').innerHTML = `<div class="empty-state"><i class="fa-solid fa-receipt"></i><p>No sales recorded on this day.</p></div>`;
  } else {
    document.getElementById('day-statement-body').innerHTML = `
      <table style="width:100%;border-collapse:collapse;">
        <thead><tr style="font-size:0.75rem;color:var(--muted);text-transform:uppercase;">
          <th style="text-align:left;padding:8px 0;border-bottom:1px solid var(--border);">Product</th>
          <th style="text-align:center;padding:8px 0;border-bottom:1px solid var(--border);">Qty</th>
          <th style="text-align:right;padding:8px 0;border-bottom:1px solid var(--border);">Sale</th>
          <th style="text-align:right;padding:8px 0;border-bottom:1px solid var(--border);">Profit</th>
        </tr></thead>
        <tbody>
          ${s.lines.map(l => `
            <tr style="font-size:0.85rem;">
              <td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,.03);">${l.product}<br><small style="color:var(--muted)">${l.orderId}</small></td>
              <td style="text-align:center;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.03);">${l.qty}</td>
              <td style="text-align:right;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.03);">PKR ${l.revenue.toLocaleString()}</td>
              <td style="text-align:right;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.03);color:${l.profit > 0 ? 'var(--green)' : 'var(--red)'}">PKR ${l.profit.toLocaleString()}</td>
            </tr>`).join('')}
        </tbody>
      </table>
      <div style="display:flex;justify-content:space-between;padding:14px 0 0;font-weight:700;font-size:1rem;">
        <span>Net Profit (Day End)</span><span style="color:var(--gold)">PKR ${s.totals.profit.toLocaleString()}</span>
      </div>`;
  }
  openModal('day-statement-modal');
}

/* Export the visible 30-day statement history as a structured, formatted Excel workbook */
function exportDailyStatementsExcel() {
  if (!dailyStatementsData.length) { toast('No statement data to export yet.', 'error'); return; }
  try {
    const wb = XLSX.utils.book_new();

    /* ── Sheet 1: Daily Summary ── */
    const summaryRows = dailyStatementsData.map(s => ({
      Date:            s.date,
      'Items Sold':    s.lines.reduce((sum, l) => sum + (l.qty || 0), 0),
      'Orders':        s.totals.orders,
      'Revenue (PKR)': s.totals.revenue,
      'Cost (PKR)':    s.totals.cost,
      'Net Profit (PKR)': s.totals.profit,
    }));
    const totalRow = {
      Date: 'TOTAL (30 Days)',
      'Items Sold':    summaryRows.reduce((s,r) => s + r['Items Sold'], 0),
      'Orders':        summaryRows.reduce((s,r) => s + r['Orders'], 0),
      'Revenue (PKR)': summaryRows.reduce((s,r) => s + r['Revenue (PKR)'], 0),
      'Cost (PKR)':    summaryRows.reduce((s,r) => s + r['Cost (PKR)'], 0),
      'Net Profit (PKR)': summaryRows.reduce((s,r) => s + r['Net Profit (PKR)'], 0),
    };
    const wsSummary = XLSX.utils.json_to_sheet([...summaryRows, totalRow]);
    wsSummary['!cols'] = [{wch:14},{wch:12},{wch:10},{wch:15},{wch:13},{wch:16}];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Daily Summary');

    /* ── Sheet 2: Itemised line-by-line sales (every product sold each day) ── */
    const lineRows = [];
    dailyStatementsData.forEach(s => {
      s.lines.forEach(l => {
        lineRows.push({
          Date: s.date,
          'Order Ref': l.orderId,
          Product: l.product,
          Qty: l.qty,
          'Purchase Price (PKR)': l.purchasePrice ?? '',
          'Sale Price (PKR)': l.salePrice,
          'Revenue (PKR)': l.revenue,
          'Cost (PKR)': l.cost,
          'Profit (PKR)': l.profit,
        });
      });
    });
    const wsLines = XLSX.utils.json_to_sheet(lineRows.length ? lineRows : [{ Date:'', Note:'No sales in the last 30 days' }]);
    wsLines['!cols'] = [{wch:13},{wch:14},{wch:24},{wch:6},{wch:18},{wch:15},{wch:14},{wch:12},{wch:13}];
    XLSX.utils.book_append_sheet(wb, wsLines, 'Itemised Sales');

    /* ── Sheet 3: Lifetime totals snapshot (for context, not just the 30-day window) ── */
    if (lifetimeEarningsData) {
      const wsLifetime = XLSX.utils.json_to_sheet([{
        'Tracking Since':        lifetimeEarningsData.since || '—',
        'Lifetime Revenue (PKR)': lifetimeEarningsData.totals?.revenue || 0,
        'Lifetime Cost (PKR)':    lifetimeEarningsData.totals?.cost || 0,
        'Lifetime Net Profit (PKR)': lifetimeEarningsData.totals?.profit || 0,
        'Lifetime Orders Sold':   lifetimeEarningsData.totals?.orders || 0,
      }]);
      wsLifetime['!cols'] = [{wch:16},{wch:20},{wch:18},{wch:22},{wch:18}];
      XLSX.utils.book_append_sheet(wb, wsLifetime, 'Lifetime Snapshot');
    }

    XLSX.writeFile(wb, `GOLNISÀ - Daily Statement - ${today()}.xlsx`);
    toast('30-day statement exported ✓', 'success');
  } catch (err) {
    toast('Export failed: ' + err.message, 'error');
  }
}

/* ═══════════════════ PROFIT — MONTHLY STATEMENTS (super_admin only) ═══════════════════ */
let monthlyStatementsData = [];

async function loadMonthlyStatements() {
  const tbody = document.getElementById('monthly-statements-body');
  tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:30px"><div class="spinner"></div></td></tr>`;
  try {
    const res  = await apiFetch('/admin/monthly-statements');
    const data = await res.json();
    if (!res.ok) { tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><p>${data.error || 'Failed to load statements.'}</p></div></td></tr>`; return; }
    monthlyStatementsData = data.statements || [];
    document.getElementById('monthly-since-label').textContent = data.since ? `— since ${new Date(data.since).toLocaleDateString('en-PK', { day:'2-digit', month:'short', year:'numeric' })}` : '— since launch';
    renderMonthlyStatements(monthlyStatementsData);
  } catch { tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><p>Failed to load statements.</p></div></td></tr>`; }
}

function renderMonthlyStatements(statements) {
  const tbody = document.getElementById('monthly-statements-body');
  if (!statements.length) { tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><i class="fa-solid fa-calendar"></i><p>No statements yet</p></div></td></tr>`; return; }
  tbody.innerHTML = statements.map(s => {
    const itemsSold = s.lines.reduce((sum, l) => sum + (l.qty || 0), 0);
    const isCurrentMonth = s.month === new Date().toISOString().slice(0,7);
    const [y, m] = s.month.split('-');
    const label = new Date(Number(y), Number(m)-1, 1).toLocaleDateString('en-PK', { month:'long', year:'numeric' });
    return `
    <tr>
      <td>${label}${isCurrentMonth ? ' <span class="badge badge-new" style="background:rgba(34,197,94,.15);color:var(--green)">Current</span>' : ''}</td>
      <td>${itemsSold}</td>
      <td>${s.totals.orders}</td>
      <td>PKR ${s.totals.revenue.toLocaleString()}</td>
      <td>PKR ${s.totals.cost.toLocaleString()}</td>
      <td style="font-weight:700;color:${s.totals.profit > 0 ? 'var(--green)' : 'var(--muted)'}">PKR ${s.totals.profit.toLocaleString()}</td>
      <td><button class="btn btn-outline btn-sm" onclick="exportSingleMonthExcel('${s.month}','${label}')"><i class="fa-solid fa-file-excel"></i> Export</button></td>
    </tr>`;
  }).join('');
}

/* Export month-by-month statement history (since launch) as a structured Excel workbook */
function exportMonthlyStatementsExcel() {
  if (!monthlyStatementsData.length) { toast('No statement data to export yet.', 'error'); return; }
  try {
    const wb = XLSX.utils.book_new();

    /* ── Sheet 1: Monthly Summary ── */
    const summaryRows = monthlyStatementsData.map(s => ({
      Month:           s.month,
      'Items Sold':    s.lines.reduce((sum, l) => sum + (l.qty || 0), 0),
      'Orders':        s.totals.orders,
      'Revenue (PKR)': s.totals.revenue,
      'Cost (PKR)':    s.totals.cost,
      'Net Profit (PKR)': s.totals.profit,
    }));
    const totalRow = {
      Month: `TOTAL (since ${monthlyStatementsData[monthlyStatementsData.length-1]?.month || ''})`,
      'Items Sold':    summaryRows.reduce((s,r) => s + r['Items Sold'], 0),
      'Orders':        summaryRows.reduce((s,r) => s + r['Orders'], 0),
      'Revenue (PKR)': summaryRows.reduce((s,r) => s + r['Revenue (PKR)'], 0),
      'Cost (PKR)':    summaryRows.reduce((s,r) => s + r['Cost (PKR)'], 0),
      'Net Profit (PKR)': summaryRows.reduce((s,r) => s + r['Net Profit (PKR)'], 0),
    };
    const wsSummary = XLSX.utils.json_to_sheet([...summaryRows, totalRow]);
    wsSummary['!cols'] = [{wch:14},{wch:12},{wch:10},{wch:15},{wch:13},{wch:16}];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Monthly Summary');

    /* ── Sheet 2: Itemised line-by-line sales for every month ── */
    const lineRows = [];
    monthlyStatementsData.forEach(s => {
      s.lines.forEach(l => {
        lineRows.push({
          Month: s.month,
          'Order Ref': l.orderId,
          Date: (l.date || '').slice(0,10),
          Product: l.product,
          Qty: l.qty,
          'Purchase Price (PKR)': l.purchasePrice ?? '',
          'Sale Price (PKR)': l.salePrice,
          'Revenue (PKR)': l.revenue,
          'Cost (PKR)': l.cost,
          'Profit (PKR)': l.profit,
        });
      });
    });
    const wsLines = XLSX.utils.json_to_sheet(lineRows.length ? lineRows : [{ Month:'', Note:'No sales recorded since launch' }]);
    wsLines['!cols'] = [{wch:10},{wch:14},{wch:13},{wch:24},{wch:6},{wch:18},{wch:15},{wch:14},{wch:12},{wch:13}];
    XLSX.utils.book_append_sheet(wb, wsLines, 'Itemised Sales');

    XLSX.writeFile(wb, `GOLNISÀ - Monthly Statement - ${today()}.xlsx`);
    toast('Monthly statement exported ✓', 'success');
  } catch (err) {
    toast('Export failed: ' + err.message, 'error');
  }
}

/* Export a single month's full statement — summary + all days + itemised sales */
async function exportSingleMonthExcel(monthStr, monthLabel) {
  try {
    toast('Preparing statement…', 'info');
    const res  = await apiFetch(`/admin/monthly-statements?month=${monthStr}`);
    const data = await res.json();
    const stmt = (data.statements || [])[0];
    if (!stmt) { toast('No data for this month.', 'error'); return; }

    const wb = XLSX.utils.book_new();
    const [y, m] = monthStr.split('-').map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();

    /* ── Sheet 1: Day-by-day breakdown ── */
    const dayMap = {};
    (stmt.lines || []).forEach(l => {
      const day = (l.date || '').slice(0, 10);
      if (!dayMap[day]) dayMap[day] = { revenue: 0, cost: 0, profit: 0, orders: new Set(), items: 0 };
      dayMap[day].revenue += l.revenue || 0;
      dayMap[day].cost    += l.cost    || 0;
      dayMap[day].profit  += l.profit  || 0;
      dayMap[day].orders.add(l.orderId);
      dayMap[day].items   += l.qty     || 0;
    });

    const dayRows = [];
    let totRev = 0, totCost = 0, totProfit = 0, totOrders = 0, totItems = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const dd = dayMap[dateStr];
      const rev  = dd ? Math.round(dd.revenue) : 0;
      const cost = dd ? Math.round(dd.cost)    : 0;
      const prof = dd ? Math.round(dd.profit)  : 0;
      const ords = dd ? dd.orders.size         : 0;
      const itms = dd ? dd.items               : 0;
      totRev += rev; totCost += cost; totProfit += prof; totOrders += ords; totItems += itms;
      dayRows.push({
        'Date':             dateStr,
        'Items Sold':       itms,
        'Orders':           ords,
        'Revenue (PKR)':    rev,
        'Cost (PKR)':       cost,
        'Net Profit (PKR)': prof,
      });
    }
    dayRows.push({
      'Date':             `TOTAL — ${monthLabel}`,
      'Items Sold':       totItems,
      'Orders':           totOrders,
      'Revenue (PKR)':    totRev,
      'Cost (PKR)':       totCost,
      'Net Profit (PKR)': totProfit,
    });

    const wsDays = XLSX.utils.json_to_sheet(dayRows);
    wsDays['!cols'] = [{wch:14},{wch:12},{wch:10},{wch:15},{wch:13},{wch:16}];
    XLSX.utils.book_append_sheet(wb, wsDays, 'Daily Breakdown');

    /* ── Sheet 2: Itemised sales ── */
    const lineRows = (stmt.lines || []).map(l => ({
      'Date':                  (l.date || '').slice(0,10),
      'Order Ref':             l.orderId,
      'Product':               l.product,
      'Qty':                   l.qty,
      'Purchase Price (PKR)':  l.purchasePrice ?? '',
      'Sale Price (PKR)':      l.salePrice,
      'Revenue (PKR)':         l.revenue,
      'Cost (PKR)':            l.cost,
      'Profit (PKR)':          l.profit,
    }));
    const wsLines = XLSX.utils.json_to_sheet(lineRows.length ? lineRows : [{ Date:'', Note:'No sales this month' }]);
    wsLines['!cols'] = [{wch:13},{wch:14},{wch:26},{wch:6},{wch:18},{wch:15},{wch:14},{wch:12},{wch:13}];
    XLSX.utils.book_append_sheet(wb, wsLines, 'Itemised Sales');

    /* ── Sheet 3: Month summary ── */
    const wsSummary = XLSX.utils.json_to_sheet([{
      'Month':              monthLabel,
      'Total Items Sold':   totItems,
      'Total Orders':       totOrders,
      'Total Revenue (PKR)': totRev,
      'Total Cost (PKR)':   totCost,
      'Net Profit (PKR)':   totProfit,
    }]);
    wsSummary['!cols'] = [{wch:16},{wch:16},{wch:14},{wch:18},{wch:16},{wch:16}];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Month Summary');

    XLSX.writeFile(wb, `GOLNISÀ - ${monthLabel} Statement.xlsx`);
    toast(`${monthLabel} statement exported ✓`, 'success');
  } catch (err) {
    toast('Export failed: ' + err.message, 'error');
  }
}

/* ═══════════════════ SOCIAL MEDIA ORDERS ═══════════════════ */
let allSocialOrders = [];

const SOC_SOURCE_LABELS = {
  facebook:  { label: 'Facebook',  icon: 'fa-brands fa-facebook', color: '#1877f2' },
  instagram: { label: 'Instagram', icon: 'fa-brands fa-instagram', color: '#e1306c' },
  whatsapp:  { label: 'WhatsApp',  icon: 'fa-brands fa-whatsapp',  color: '#25d366' },
  tiktok:    { label: 'TikTok',    icon: 'fa-brands fa-tiktok',    color: '#fe2c55' },
  other:     { label: 'Other',     icon: 'fa-solid fa-share-nodes', color: '#9a8070' },
};

function socSourceBadge(source) {
  const s = SOC_SOURCE_LABELS[source] || SOC_SOURCE_LABELS.other;
  return `<span class="badge badge-${source || 'other'}"><i class="${s.icon}" style="margin-right:3px"></i>${s.label}</span>`;
}

async function loadSocialOrders() {
  const source = document.getElementById('soc-source-filter')?.value || '';
  const status = document.getElementById('soc-status-filter')?.value || '';
  const tbody  = document.getElementById('social-orders-body');
  tbody.innerHTML = `<tr><td colspan="11" style="text-align:center;padding:30px"><div class="spinner"></div></td></tr>`;
  try {
    let qs = [];
    if (source) qs.push('source=' + source);
    if (status) qs.push('status=' + status);
    const res  = await apiFetch('/social-orders' + (qs.length ? '?' + qs.join('&') : ''));
    const data = await res.json();
    allSocialOrders = data.orders || [];
    renderSocialOrders(allSocialOrders);
    updateSocialPageStats(allSocialOrders);
  } catch {
    tbody.innerHTML = `<tr><td colspan="10"><div class="empty-state"><p>Failed to load social orders.</p></div></td></tr>`;
  }
}

function updateSocialPageStats(orders) {
  const active = orders.filter(o => o.status !== 'Cancelled');
  document.getElementById('soc-total')?.textContent !== undefined &&
    (document.getElementById('soc-total').textContent = orders.length);
  document.getElementById('soc-pending').textContent   = orders.filter(o => o.status === 'Pending').length;
  document.getElementById('soc-delivered').textContent = orders.filter(o => o.status === 'Delivered').length;
  const rev = active.reduce((s, o) => s + (o.total || 0), 0);
  document.getElementById('soc-revenue').textContent  = 'PKR ' + rev.toLocaleString();
  document.getElementById('soc-fb').textContent = orders.filter(o => o.source === 'facebook').length;
  document.getElementById('soc-ig').textContent = orders.filter(o => o.source === 'instagram').length;
  document.getElementById('soc-wa').textContent = orders.filter(o => o.source === 'whatsapp').length;
  document.getElementById('soc-tt').textContent = orders.filter(o => o.source === 'tiktok').length;
  document.getElementById('soc-ot').textContent = orders.filter(o => o.source === 'other').length;
}

function filterSocialOrdersTable() {
  const q = (document.getElementById('soc-search')?.value || '').toLowerCase();
  renderSocialOrders(allSocialOrders.filter(o =>
    (o.id || '').toLowerCase().includes(q) ||
    (o.customerName || '').toLowerCase().includes(q) ||
    (o.phone || '').includes(q)
  ));
}

/* Real-time per-order profit (matches store.js _buildStatement logic exactly):
   Profit = sum of items (effectiveRevenue - cost)
   effectiveRevenue = item revenue minus its proportional share of order discount */
function calcOrderProfit(o) {
  if (!o || o.status === 'Cancelled') return 0;
  const orderDiscount = (o.discount || 0) + (o.customDiscount?.amount || 0);
  const orderSubtotal = o.subtotal || (o.items || []).reduce((s, i) => s + ((i.price || 0) * (i.qty || 1)), 0);
  let profit = 0;
  (o.items || []).forEach(item => {
    const qty = item.qty || 1;
    const revenue = (item.price || 0) * qty;
    let pp = item.purchasePrice;
    if (pp == null && window.allProducts) {
      const prod = window.allProducts.find(p => p.id === item.productId || p.name === item.name);
      if (prod && prod.purchasePrice != null) pp = prod.purchasePrice;
    }
    const cost = (Number(pp) || 0) * qty;
    const fraction = orderSubtotal > 0 ? (revenue / orderSubtotal) : (1 / (o.items?.length || 1));
    const itemDiscount = Math.round(orderDiscount * fraction);
    const effectiveRevenue = Math.max(0, revenue - itemDiscount);
    profit += effectiveRevenue - cost;
  });
  return Math.round(profit);
}

function renderSocialOrders(orders) {
  const tbody = document.getElementById('social-orders-body');
  if (!orders.length) {
    tbody.innerHTML = `<tr><td colspan="11"><div class="empty-state"><i class="fa-solid fa-share-nodes"></i><p>No social media orders yet</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML = orders.map(o => {
    const profit = calcOrderProfit(o);
    const profitColor = profit >= 0 ? 'var(--green)' : 'var(--red)';
    const profitLabel = (profit >= 0 ? '+' : '') + 'PKR ' + profit.toLocaleString();
    return `
    <tr>
      <td><code style="color:#e1306c;cursor:pointer" onclick="viewSocialOrder('${o.id}')">${o.id}</code></td>
      <td>${socSourceBadge(o.source)}</td>
      <td><strong>${esc(o.customerName || '—')}</strong><br><small style="color:var(--muted)">${esc(o.phone || '')}</small></td>
      <td style="color:var(--muted)">${esc(o.address || '—')}</td>
      <td style="color:var(--muted)">${(o.items || []).length} item(s)</td>
      <td style="color:var(--gold);font-weight:600">PKR ${(o.total || 0).toLocaleString()}</td>
      <td style="color:${profitColor};font-weight:600">${profitLabel}</td>
      <td>${(o.paymentMethod || 'cod').toUpperCase()}</td>
      <td style="color:var(--blue);font-weight:600">PKR ${Number(o.advanceAmount || 0).toLocaleString()}</td>
      <td>
        <select class="status-select" onchange="updateSocialOrderStatus('${o.id}', this.value)">
          ${['Pending','Confirmed','Processing','Shipped','Delivered','Cancelled'].map(s => `<option${s === o.status ? ' selected' : ''}>${s}</option>`).join('')}
        </select>
      </td>
      <td>${fmtDate(o.createdAt)}</td>
      <td style="display:flex;gap:6px">
        <button class="btn btn-outline btn-sm" onclick="viewSocialOrder('${o.id}')">Details</button>
        <button class="btn btn-danger btn-sm" onclick="deleteSocialOrder('${o.id}')"><i class="fa-solid fa-trash"></i></button>
      </td>
    </tr>`;
  }).join('');
}

async function updateSocialOrderStatus(id, status) {
  try {
    const res = await apiFetch(`/social-orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
    const d   = await res.json();
    if (res.ok) { toast(`Order ${id} → ${status}`, 'success'); loadStats(); }
    else toast(d.error || 'Update failed', 'error');
  } catch { toast('Update failed', 'error'); }
}

async function deleteSocialOrder(id) {
  const ok = await bktConfirm({ title: 'Delete Social Order?', message: 'This social media order will be permanently deleted.', confirmText: 'Delete Order', icon: '🗑️' });
  if (!ok) return;
  try {
    const res = await apiFetch(`/social-orders/${id}`, { method: 'DELETE' });
    if (res.ok) {
      toast('Order deleted.', 'success');
      allSocialOrders = allSocialOrders.filter(o => o.id !== id);
      renderSocialOrders(allSocialOrders);
      updateSocialPageStats(allSocialOrders);
      loadStats();
    } else { const d = await res.json(); toast(d.error || 'Delete failed.', 'error'); }
  } catch { toast('Network error.', 'error'); }
}

function viewSocialOrder(id) {
  const o = allSocialOrders.find(x => x.id === id);
  if (!o) return;
  document.getElementById('social-detail-title').textContent = `Social Order — ${o.id}`;
  document.getElementById('social-detail-body').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
      <div><small style="color:var(--muted)">Customer</small><p><strong>${esc(o.customerName||'—')}</strong></p></div>
      <div><small style="color:var(--muted)">Phone</small><p>${esc(o.phone||'—')}</p></div>
      <div><small style="color:var(--muted)">City</small><p>${esc(o.city||'—')}</p></div>
      <div><small style="color:var(--muted)">Address</small><p>${esc(o.address||'—')}</p></div>
      <div><small style="color:var(--muted)">Source</small><p>${socSourceBadge(o.source)}</p></div>
      <div><small style="color:var(--muted)">Payment</small><p>${(o.paymentMethod||'').toUpperCase()}</p></div>
      <div><small style="color:var(--muted)">Status</small><p><span class="badge badge-${o.status?.toLowerCase()}">${o.status}</span></p></div>
      ${o.notes ? `<div style="grid-column:1/-1"><small style="color:var(--muted)">Notes</small><p style="font-size:0.85rem;color:var(--muted)">${esc(o.notes)}</p></div>` : ''}
    </div>
    <h4 style="margin-bottom:10px;font-size:0.88rem;color:var(--muted)">Items</h4>
    ${(o.items||[]).map(i => `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:0.85rem"><span>🛍️ ${esc(i.name)} (×${i.qty})</span><span>PKR ${(i.price*i.qty).toLocaleString()}</span></div>`).join('')}
    <div style="display:flex;justify-content:space-between;padding:10px 0"><span style="color:var(--muted)">Subtotal</span><span>PKR ${(o.subtotal||0).toLocaleString()}</span></div>
    ${o.discount > 0 ? `<div style="display:flex;justify-content:space-between;padding:10px 0;color:var(--gold)"><span>Discount${o.coupon?.code ? ' — Coupon "' + esc(o.coupon.code) + '"' : ''}</span><span>− PKR ${o.discount.toLocaleString()}</span></div>` : ''}
    <div style="display:flex;justify-content:space-between;padding:10px 0;font-weight:600"><span>Delivery</span><span>PKR ${(o.deliveryFee||0).toLocaleString()}</span></div>
    <div style="display:flex;justify-content:space-between;padding:10px 0;font-weight:700;font-size:1.05rem"><span>Total</span><span style="color:var(--gold)">PKR ${(o.total||0).toLocaleString()}</span></div>
    <div style="display:flex;gap:6px;margin-top:16px;">
      <button class="btn btn-outline btn-sm" onclick="closeModal('social-detail-modal'); openSocialOrderModal('${o.id}')"><i class="fa-solid fa-pen"></i> Edit Order</button>
      <button class="btn btn-outline btn-sm" onclick="closeModal('social-detail-modal'); generateInvoice('${o.id}')"><i class="fa-solid fa-file-invoice"></i> Generate Invoice</button>
      <button class="btn btn-outline btn-sm" onclick="closeModal('social-detail-modal'); viewInvoicesForOrder('${o.id}')"><i class="fa-solid fa-history"></i> Invoice History</button>
    </div>
  `;
  openModal('social-detail-modal');
}

/* ── Add Social Order Modal ── */
let _socItemCount = 0;
let _editingSocialOrderId = null;
let _convertingAbandonedId = null;

async function openSocialOrderModal(orderId = null, prefillAban = null) {
  _editingSocialOrderId = orderId;
  _convertingAbandonedId = prefillAban ? prefillAban.id : null;
  _socItemCount = 0;
  _socSearchMatches = {};
  _socAppliedCoupon = null;

  let o = null;
  if (orderId) {
    o = allSocialOrders.find(x => x.id === orderId);
  } else if (prefillAban) {
    const d = prefillAban.delivery || {};
    o = {
      customerName: `${d.fname || ''} ${d.lname || ''}`.trim(),
      phone: d.phone || '',
      city: d.city || '',
      address: d.address || d.street || '',
      source: 'whatsapp',
      paymentMethod: d.paymentMethod || 'cod',
      status: 'Pending',
      notes: 'Recovered from abandoned checkout.',
      items: prefillAban.items || []
    };
  }

  if (o && o.items && allProducts) {
    o.items.forEach(it => {
      if (!it.purchasePrice) {
        const match = allProducts.find(p => p.name === it.name || p.id === it.productId);
        if (match && match.purchasePrice != null) {
          it.purchasePrice = match.purchasePrice;
        }
      }
    });
  }

  document.getElementById('social-order-modal-title').innerHTML = `<i class="fa-solid fa-share-nodes" style="color:#e1306c;margin-right:8px"></i>${o && orderId ? 'Edit Social Order ' + orderId : (prefillAban ? 'Recover Abandoned Order' : 'Add Social Media Order')}`;
  document.getElementById('save-social-btn').innerHTML = `<i class="fa-solid fa-check"></i> ${o && orderId ? 'Save Changes' : (prefillAban ? 'Recover Order' : 'Create Order')}`;

  document.getElementById('soc-cname').value   = o ? o.customerName || '' : '';
  document.getElementById('soc-phone').value   = o ? o.phone || '' : '';
  document.getElementById('soc-city').value    = o ? o.city || '' : '';
  document.getElementById('soc-address').value = o ? o.address || '' : '';
  document.getElementById('soc-source').value  = o ? o.source || 'facebook' : 'facebook';
  document.getElementById('soc-payment').value = o ? o.paymentMethod || 'cod' : 'cod';
  document.getElementById('soc-status').value  = o ? o.status || 'Pending' : 'Pending';
  document.getElementById('soc-notes').value   = o ? o.notes || '' : '';
  document.getElementById('soc-advance-paid').value = o ? o.advanceAmount || '' : '';
  document.getElementById('soc-coupon-code').value = (o && o.coupon) ? o.coupon.code : '';
  document.getElementById('soc-coupon-msg').style.display = 'none';
  // Populate custom discount on edit
  if (o && o.customDiscount) {
    document.getElementById('soc-custom-discount-val').value  = o.customDiscount.value || 0;
    document.getElementById('soc-custom-discount-type').value = o.customDiscount.type || 'fixed';
  } else {
    document.getElementById('soc-custom-discount-val').value  = '';
    document.getElementById('soc-custom-discount-type').value = 'fixed';
  }
  // Populate delivery override on edit
  const delivOvr = document.getElementById('soc-delivery-override');
  const delivCustom = document.getElementById('soc-delivery-custom-val');
  if (o && o.deliveryOverride === 'free') {
    delivOvr.value = 'free'; delivCustom.style.display = 'none'; delivCustom.value = '';
  } else if (o && o.deliveryOverride === 'custom') {
    delivOvr.value = 'custom'; delivCustom.style.display = 'block'; delivCustom.value = o.deliveryFee || 0;
  } else {
    delivOvr.value = 'auto'; delivCustom.style.display = 'none'; delivCustom.value = '';
  }
  document.getElementById('soc-items-container').innerHTML = '';

  if (o && o.coupon) {
    _socAppliedCoupon = o.coupon;
    document.getElementById('soc-coupon-msg').style.display = 'block';
    document.getElementById('soc-coupon-msg').style.color = 'var(--green)';
    document.getElementById('soc-coupon-msg').textContent = `✓ "${o.coupon.code}" applied.`;
  }

  /* Make sure the product catalog is loaded — the Products tab may
     never have been opened this session, so allProducts could be empty. */
  if (!allProducts.length) {
    try {
      const res  = await apiFetch('/products');
      const data = await res.json();
      allProducts = (data.products || []).map(p => {
        if (p.category === 'catchers') p.category = 'clips';
        if (p.subcategory === 'catchers') p.subcategory = 'clips';
        return p;
      });
    } catch { /* search box will just show "no products found" until retried */ }
  }

  if (o && o.items && o.items.length > 0) {
    o.items.forEach(item => addSocialItem(item));
  } else {
    addSocialItem(); /* start with one empty row */
  }

  recalcSocialTotal();
  openModal('social-order-modal');
}

/* ── Each item row holds a hidden productId + price + purchasePrice,
   populated only once the admin picks a product from the search
   dropdown. Qty is the only manually-typed number. ── */
function addSocialItem(prefill = null) {
  const idx = _socItemCount++;
  const row = document.createElement('div');
  row.className = 'soc-item-row';
  const pid = prefill ? prefill.productId : '';
  const name = prefill ? prefill.name : '';
  const qty = prefill ? prefill.qty : 1;
  const cost = prefill ? prefill.purchasePrice : 0;
  const sale = prefill ? prefill.price : 0;
  const total = qty * sale;

  row.id = `soc-item-row-${idx}`;
  /* A row is custom if: it was explicitly saved as custom (productId==='custom'),
     or it has no productId at all but has a name (old custom item saved as productId=''). 
     Regular catalog products always have a real productId string. */
  const isCustom = prefill
    ? (prefill.productId === 'custom' || (prefill.productId === '' && !!prefill.name))
    : false;
  row.innerHTML = `
    <div class="soc-product-search-wrap" style="flex: 2;">
      <input type="hidden" id="si-pid-${idx}" value="${pid}"/>
      <input placeholder="Search product…" id="si-search-${idx}" value="${esc(name)}"
             oninput="handleSocItemSearch(${idx})"
             onfocus="handleSocItemSearch(${idx})"
             autocomplete="off"
             style="display:${isCustom ? 'none' : 'block'}"/>
      <input placeholder="Custom item name" id="si-custom-name-${idx}" value="${esc(name)}"
             style="display:${isCustom ? 'block' : 'none'}"
             oninput="recalcSocialTotal()"/>
      <div class="soc-product-dropdown" id="si-dropdown-${idx}" style="display:none"></div>
    </div>
    <input type="number" placeholder="Qty" min="0.01" step="any" id="si-qty-${idx}" value="${qty}" oninput="recalcSocialTotal()" title="Quantity"/>
    <input type="number" placeholder="Cost" id="si-cost-${idx}" value="${cost}" oninput="recalcSocialTotal()" title="Unit Purchase Price" ${isCustom ? '' : ''}/>
    <input type="number" placeholder="Sale" id="si-price-${idx}" value="${sale}" oninput="recalcSocialTotal()" title="Unit Sale Price"/>
    <div class="soc-price-display" id="si-row-total-${idx}">PKR ${total.toLocaleString()}</div>
    <button class="soc-item-remove" onclick="toggleSocCustomItem(${idx})" title="Toggle custom item" id="si-custom-btn-${idx}" style="background:${isCustom ? 'rgba(184,136,58,0.2)' : 'rgba(100,100,120,0.12)'};border-color:${isCustom ? 'var(--gold)' : 'var(--border)'};color:${isCustom ? 'var(--gold)' : 'var(--muted)'};font-size:0.75rem;">✏️</button>
    <button class="soc-item-remove" onclick="removeSocialItem(${idx})" title="Remove">✕</button>
  `;
  document.getElementById('soc-items-container').appendChild(row);
  if (isCustom) {
    document.getElementById(`si-pid-${idx}`).value = 'custom';
  }
}

/* Toggle between product-search mode and custom free-text mode per item row */
function toggleSocCustomItem(idx) {
  const searchInput  = document.getElementById(`si-search-${idx}`);
  const customInput  = document.getElementById(`si-custom-name-${idx}`);
  const pidInput     = document.getElementById(`si-pid-${idx}`);
  const btn          = document.getElementById(`si-custom-btn-${idx}`);
  if (!searchInput || !customInput) return;

  const isNowCustom = searchInput.style.display === 'none'; /* currently custom → switch back */
  if (isNowCustom) {
    /* Switch back to search mode */
    searchInput.style.display = 'block';
    customInput.style.display = 'none';
    pidInput.value = '';
    document.getElementById(`si-cost-${idx}`).value  = '0';
    document.getElementById(`si-price-${idx}`).value = '0';
    document.getElementById(`si-dropdown-${idx}`).style.display = 'none';
    btn.style.background = 'rgba(100,100,120,0.12)';
    btn.style.borderColor = 'var(--border)';
    btn.style.color = 'var(--muted)';
  } else {
    /* Switch to custom mode */
    searchInput.style.display = 'none';
    customInput.style.display = 'block';
    document.getElementById(`si-dropdown-${idx}`).style.display = 'none';
    pidInput.value = 'custom';
    customInput.value = searchInput.value; /* carry over any typed text */
    btn.style.background = 'rgba(184,136,58,0.2)';
    btn.style.borderColor = 'var(--gold)';
    btn.style.color = 'var(--gold)';
  }
  recalcSocialTotal();
}

/* ── Filter allProducts as the admin types and render a dropdown ── */
let _socSearchMatches = {}; /* idx -> array of matched products, avoids inlining JSON with special chars into onclick */

function handleSocItemSearch(idx) {
  /* Skip if this row is in custom-item mode */
  const searchInput = document.getElementById(`si-search-${idx}`);
  if (!searchInput || searchInput.style.display === 'none') return;
  const dropdown = document.getElementById(`si-dropdown-${idx}`);
  if (!dropdown) return;
  const q = searchInput.value.trim().toLowerCase();

  /* If the box is cleared, also clear the selected product so a stale
     price/id can't silently ride along with a different typed name. */
  if (!q) {
    document.getElementById(`si-pid-${idx}`).value = '';
    document.getElementById(`si-cost-${idx}`).value = '0';
    document.getElementById(`si-price-${idx}`).value = '0';
    document.getElementById(`si-row-total-${idx}`).textContent = 'PKR 0';
    recalcSocialTotal();
  }

  const matches = q
    ? allProducts.filter(p => p.name?.toLowerCase().includes(q)).slice(0, 8)
    : allProducts.slice(0, 8);
  _socSearchMatches[idx] = matches;

  if (!matches.length) {
    dropdown.innerHTML = `<div class="soc-product-empty">No products found${q ? ' for "' + esc(q) + '"' : ''}.</div>`;
  } else {
    dropdown.innerHTML = matches.map((p, mIdx) => `
      <div class="soc-product-option" onclick="selectSocProduct(${idx}, ${mIdx})">
        <span style="font-size:1.1rem">${p.emoji || '🛍️'}</span>
        <span class="opt-name">${esc(p.name)}</span>
        ${!p.inStock ? '<span class="opt-stock-out">Out of stock</span>' : ''}
        <span class="opt-price">PKR ${(p.price || 0).toLocaleString()}</span>
      </div>`).join('');
  }
  dropdown.style.display = 'block';
}

function selectSocProduct(idx, matchIdx) {
  const product = _socSearchMatches[idx]?.[matchIdx];
  if (!product) return;
  document.getElementById(`si-search-${idx}`).value = product.name;
  document.getElementById(`si-pid-${idx}`).value     = product.id || '';
  document.getElementById(`si-cost-${idx}`).value    = product.purchasePrice != null ? product.purchasePrice : 0;
  document.getElementById(`si-price-${idx}`).value   = product.price || 0;
  document.getElementById(`si-row-total-${idx}`).textContent = 'PKR ' + (product.price || 0).toLocaleString();
  document.getElementById(`si-dropdown-${idx}`).style.display = 'none';
  recalcSocialTotal();
}

/* Close any open product dropdown when clicking elsewhere */
document.addEventListener('click', (e) => {
  if (!e.target.closest('.soc-product-search-wrap')) {
    document.querySelectorAll('.soc-product-dropdown').forEach(d => d.style.display = 'none');
  }
});

function removeSocialItem(idx) {
  const row = document.getElementById(`soc-item-row-${idx}`);
  if (row) { row.remove(); delete _socSearchMatches[idx]; recalcSocialTotal(); }
}

/* ── Coupon state for the currently-open social order modal.
   null = no coupon applied. Re-validated against the live subtotal
   every time recalcSocialTotal runs, so changing items/qty after
   applying a coupon can't silently keep a stale discount. ── */
let _socAppliedCoupon = null; /* { code, type, value } once successfully applied */

/* If the admin edits the code after a successful apply, the old
   discount is no longer valid for whatever they're about to type next —
   clear it until they click Apply again. */
function onSocCouponInputChanged() {
  if (_socAppliedCoupon) {
    _socAppliedCoupon = null;
    document.getElementById('soc-coupon-msg').style.display = 'none';
    recalcSocialTotal();
  }
}

async function applySocCoupon() {
  const codeInput = document.getElementById('soc-coupon-code');
  const msgEl      = document.getElementById('soc-coupon-msg');
  const code       = codeInput.value.trim();
  if (!code) { msgEl.style.display = 'none'; _socAppliedCoupon = null; recalcSocialTotal(); return; }

  const subtotal = _socCurrentSubtotal();
  const btn = document.getElementById('soc-coupon-apply-btn');
  const orig = btn.textContent;
  btn.textContent = '…'; btn.disabled = true;

  try {
    const res  = await apiFetch('/coupons/validate', {
      method: 'POST',
      body: JSON.stringify({ code, subtotal }),
    });
    const data = await res.json();
    if (res.ok && data.valid) {
      _socAppliedCoupon = { code: data.code, type: data.type, value: data.value };
      msgEl.style.color = 'var(--green)';
      msgEl.textContent = `✓ "${data.code}" applied — ${data.type === 'percent' ? data.value + '% off' : 'PKR ' + data.value.toLocaleString() + ' off'}`;
      msgEl.style.display = 'block';
    } else {
      _socAppliedCoupon = null;
      msgEl.style.color = 'var(--red)';
      msgEl.textContent = data.error || 'Invalid coupon.';
      msgEl.style.display = 'block';
    }
  } catch {
    _socAppliedCoupon = null;
    msgEl.style.color = 'var(--red)';
    msgEl.textContent = 'Network error — could not validate coupon.';
    msgEl.style.display = 'block';
  }

  btn.textContent = orig; btn.disabled = false;
  recalcSocialTotal();
}

/* Subtotal helper shared by applySocCoupon + recalcSocialTotal so both
   always agree on the same number. */
function _socCurrentSubtotal() {
  let subtotal = 0;
  document.querySelectorAll('#soc-items-container .soc-item-row').forEach(row => {
    const rowId   = row.id.replace('soc-item-row-', '');
    const qty     = Number(document.getElementById(`si-qty-${rowId}`)?.value) || 0;
    const price   = Number(document.getElementById(`si-price-${rowId}`)?.value) || 0;
    const rowTotalEl = document.getElementById(`si-row-total-${rowId}`);
    if (rowTotalEl) rowTotalEl.textContent = 'PKR ' + (qty * price).toLocaleString();
    subtotal += qty * price;
  });
  return subtotal;
}

function onSocDeliveryOverrideChange() {
  const val = document.getElementById('soc-delivery-override')?.value;
  const customInput = document.getElementById('soc-delivery-custom-val');
  if (customInput) customInput.style.display = val === 'custom' ? 'block' : 'none';
  recalcSocialTotal();
}

function recalcSocialTotal() {
  const subtotal = _socCurrentSubtotal();
  const pay    = document.getElementById('soc-payment')?.value || 'cod';

  // Delivery fee with override support
  const delivOverride = document.getElementById('soc-delivery-override')?.value || 'auto';
  let delFee;
  if (delivOverride === 'free') {
    delFee = 0;
  } else if (delivOverride === 'custom') {
    delFee = Number(document.getElementById('soc-delivery-custom-val')?.value) || 0;
  } else {
    // Auto: bank_deposit = 200 (free >= 1000), COD = 200 (free >= 5000)
    delFee = pay === 'bank_deposit' ? (subtotal >= 1000 ? 0 : 200) : (subtotal >= 5000 ? 0 : 200);
  }

  let discount = 0;
  if (_socAppliedCoupon) {
    discount = _socAppliedCoupon.type === 'percent'
      ? Math.round(subtotal * (_socAppliedCoupon.value / 100))
      : _socAppliedCoupon.value;
    discount = Math.min(discount, subtotal);
  }
  // Apply custom discount on top of coupon discount
  const customDiscVal  = Number(document.getElementById('soc-custom-discount-val')?.value) || 0;
  const customDiscType = document.getElementById('soc-custom-discount-type')?.value || 'fixed';
  if (customDiscVal > 0) {
    const customAmt = customDiscType === 'percent'
      ? Math.round(subtotal * (customDiscVal / 100))
      : customDiscVal;
    discount = Math.min(discount + customAmt, subtotal);
  }
  const total = Math.max(0, subtotal - discount) + delFee;
  const advance = Number(document.getElementById('soc-advance-paid')?.value) || 0;
  const due = Math.max(0, total - advance);

  document.getElementById('soc-subtotal').textContent       = 'PKR ' + subtotal.toLocaleString();
  const discountRow = document.getElementById('soc-discount-row');
  if (discountRow) discountRow.style.display = discount > 0 ? 'flex' : 'none';
  document.getElementById('soc-discount-display').textContent = '− PKR ' + discount.toLocaleString();
  document.getElementById('soc-delivery-display').textContent = 'PKR ' + delFee.toLocaleString();
  document.getElementById('soc-total-display').textContent  = 'PKR ' + total.toLocaleString();

  const advanceRow = document.getElementById('soc-advance-row');
  if (advanceRow) advanceRow.style.display = advance > 0 ? 'flex' : 'none';
  const dueRow = document.getElementById('soc-due-row');
  if (dueRow) dueRow.style.display = advance > 0 ? 'flex' : 'none';

  if (document.getElementById('soc-advance-display')) document.getElementById('soc-advance-display').textContent = '− PKR ' + advance.toLocaleString();
  if (document.getElementById('soc-due-display')) document.getElementById('soc-due-display').textContent = 'PKR ' + due.toLocaleString();

  const noteEl = document.getElementById('soc-delivery-note');
  if (noteEl) {
    if (delivOverride === 'free') noteEl.textContent = 'Delivery: Free (manually overridden).';
    else if (delivOverride === 'custom') noteEl.textContent = `Delivery: PKR ${delFee.toLocaleString()} (manually set).`;
    else if (pay === 'bank_deposit') noteEl.textContent = 'Bank Deposit: Free delivery always.';
    else if (subtotal >= 5000)  noteEl.textContent = 'COD: Free delivery for orders PKR 5,000+.';
    else noteEl.textContent = `COD: PKR 200 delivery (waived at PKR 5,000). Subtotal PKR ${subtotal.toLocaleString()}.`;
  }
}

async function saveSocialOrder() {
  const customerName = document.getElementById('soc-cname').value.trim();
  const phone        = document.getElementById('soc-phone').value.trim();
  const city         = document.getElementById('soc-city').value.trim();
  const address      = document.getElementById('soc-address').value.trim();
  const source       = document.getElementById('soc-source').value;
  const paymentMethod= document.getElementById('soc-payment').value;
  const advancePaid  = Number(document.getElementById('soc-advance-paid')?.value) || 0;
  const status       = document.getElementById('soc-status').value;
  const notes        = document.getElementById('soc-notes').value.trim();
  const couponCode   = _socAppliedCoupon?.code || null;
  // Custom discount
  const customDiscVal  = Number(document.getElementById('soc-custom-discount-val')?.value) || 0;
  const customDiscType = document.getElementById('soc-custom-discount-type')?.value || 'fixed';
  const customDiscount = customDiscVal > 0 ? { value: customDiscVal, type: customDiscType } : null;
  // Delivery override
  const deliveryOverride = document.getElementById('soc-delivery-override')?.value || 'auto';
  const deliveryCustomVal = deliveryOverride === 'custom' ? (Number(document.getElementById('soc-delivery-custom-val')?.value) || 0) : null;

  if (!customerName) { toast('Customer name is required.', 'error'); return; }

  /* Collect items */
  const items = [];
  let hasUnselectedRow = false;
  document.querySelectorAll('#soc-items-container .soc-item-row').forEach(row => {
    const rowId   = row.id.replace('soc-item-row-', '');
    const pid     = document.getElementById(`si-pid-${rowId}`)?.value || '';
    const isCustom = pid === 'custom';
    const name    = isCustom
      ? (document.getElementById(`si-custom-name-${rowId}`)?.value || '').trim()
      : (document.getElementById(`si-search-${rowId}`)?.value || '').trim();
    const qty     = Number(document.getElementById(`si-qty-${rowId}`)?.value) || 1;
    const price   = Number(document.getElementById(`si-price-${rowId}`)?.value) || 0;
    const purchasePrice = Number(document.getElementById(`si-cost-${rowId}`)?.value) || 0;
    if (!name) return; /* empty row, ignore */
    /* If item has a name and price but no pid (e.g. old order items without productId),
       treat as custom rather than blocking the save */
    const effectivelyCustom = isCustom || (!pid && name && price > 0);
    if (!effectivelyCustom && !pid) { hasUnselectedRow = true; return; } /* typed name but never picked */
    items.push({ productId: effectivelyCustom ? '' : pid, name, qty, price, purchasePrice });
  });
  if (hasUnselectedRow) { toast('Please pick a product from the search list for every item.', 'error'); return; }
  if (!items.length) { toast('Add at least one item.', 'error'); return; }

  const btn = document.getElementById('save-social-btn');
  const orig = btn.innerHTML;
  btn.innerHTML = '<span class="spinner"></span>'; btn.disabled = true;

  try {
    const isEdit = !!_editingSocialOrderId;
    const url = isEdit ? `/social-orders/${_editingSocialOrderId}` : '/social-orders';
    const method = isEdit ? 'PUT' : 'POST';

    const res  = await apiFetch(url, {
      method: method,
      body: JSON.stringify({ customerName, phone, city, address, source, items, paymentMethod, status, notes, couponCode, advanceAmount: advancePaid, customDiscount, deliveryOverride, deliveryCustomVal }),
    });
    const data = await res.json();
    if (res.ok) {
      toast(isEdit ? `✓ Social order updated` : `✓ Social order created — ${data.orderRef || ''}`, 'success');
      
      if (!isEdit && _convertingAbandonedId) {
        try {
          await apiFetch(`/abandoned/${_convertingAbandonedId}/converted`, { method: 'PATCH' });
          toast('Abandoned checkout marked as recovered!', 'success');
          _convertingAbandonedId = null;
          loadAbandoned();
        } catch (e) {
          console.error('Failed to mark abandoned as converted', e);
        }
      }

      closeModal('social-order-modal');
      loadSocialOrders();
      loadStats();
    } else toast(data.error || 'Failed to save order.', 'error');
  } catch { toast('Network error.', 'error'); }

  btn.innerHTML = orig; btn.disabled = false;
}

/* ═══════════════════ COUPONS (super_admin only) ═══════════════════ */
async function loadCoupons() {
  const tbody = document.getElementById('coupons-body');
  tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:30px"><div class="spinner"></div></td></tr>`;
  try {
    const res  = await apiFetch('/coupons');
    const data = await res.json();
    allCoupons = data.coupons || [];
    renderCoupons(allCoupons);
  } catch { tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><p>Failed to load coupons.</p></div></td></tr>`; }
}

function renderCoupons(coupons) {
  const tbody = document.getElementById('coupons-body');
  if (!coupons.length) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><i class="fa-solid fa-tag"></i><p>No coupons yet — create one to get started.</p></div></td></tr>`;
    return;
  }
  const now = new Date();
  tbody.innerHTML = coupons.map(c => {
    const expired   = c.expiresAt && new Date(c.expiresAt) < now;
    const usedUp    = c.maxUses != null && (c.usedCount || 0) >= c.maxUses;
    const isLive    = c.active !== false && !expired && !usedUp;
    const statusBadge = !isLive
      ? `<span class="badge badge-cancelled">${expired ? 'Expired' : usedUp ? 'Used Up' : 'Inactive'}</span>`
      : `<span class="badge badge-delivered">Active</span>`;
    return `
    <tr>
      <td><code style="color:var(--gold);font-weight:700">${esc(c.code)}</code></td>
      <td>${c.type === 'percent' ? c.value + '% off' : 'PKR ' + c.value.toLocaleString() + ' off'}</td>
      <td>${c.minOrderAmount ? 'PKR ' + c.minOrderAmount.toLocaleString() : '—'}</td>
      <td>${c.usedCount || 0}${c.maxUses != null ? ' / ' + c.maxUses : ''}</td>
      <td>${c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : 'Never'}</td>
      <td>${statusBadge}</td>
      <td>
        <button class="btn btn-outline btn-sm" onclick="openCouponModalById('${c.id}')">Edit</button>
        <button class="btn btn-outline btn-sm" onclick="toggleCouponActive('${c.id}', ${c.active === false})">${c.active === false ? 'Enable' : 'Disable'}</button>
        <button class="btn btn-danger btn-sm" onclick="deleteCoupon('${c.id}', '${esc(c.code)}')">Delete</button>
      </td>
    </tr>`;
  }).join('');
}

function updateCouponValueHint() {
  const type  = document.getElementById('cpn-type').value;
  const label = document.getElementById('cpn-value-label');
  const input = document.getElementById('cpn-value');
  if (type === 'percent') { label.textContent = 'Discount Value (%) *'; input.placeholder = '10'; input.max = 100; }
  else { label.textContent = 'Discount Value (PKR) *'; input.placeholder = '500'; input.removeAttribute('max'); }
}

/* Looks up a coupon from the already-loaded allCoupons list by id —
   avoids inlining a JSON.stringify'd object into an onclick attribute,
   which breaks if the code or any field contains a quote character. */
function openCouponModalById(id) {
  const coupon = allCoupons.find(c => c.id === id);
  if (coupon) openCouponModal(coupon);
}

/* Pass a coupon object to edit it, or call with no args for a fresh "New Coupon" form */
function openCouponModal(coupon) {
  document.getElementById('coupon-modal-title').innerHTML = coupon
    ? '<i class="fa-solid fa-tag" style="color:var(--gold);margin-right:8px"></i>Edit Coupon'
    : '<i class="fa-solid fa-tag" style="color:var(--gold);margin-right:8px"></i>New Coupon';
  document.getElementById('cpn-id').value         = coupon?.id || '';
  document.getElementById('cpn-code').value       = coupon?.code || '';
  document.getElementById('cpn-code').disabled    = !!coupon; /* code can't be changed once created, to avoid breaking customers who already have it */
  document.getElementById('cpn-type').value       = coupon?.type || 'percent';
  document.getElementById('cpn-value').value      = coupon?.value ?? '';
  document.getElementById('cpn-min-order').value  = coupon?.minOrderAmount ?? '';
  document.getElementById('cpn-max-uses').value   = coupon?.maxUses ?? '';
  document.getElementById('cpn-expires').value    = coupon?.expiresAt ? coupon.expiresAt.slice(0, 10) : '';
  document.getElementById('cpn-active').checked   = coupon?.active !== false;
  document.getElementById('cpn-active-wrap').style.display = coupon ? 'block' : 'none'; /* only relevant once it exists */
  updateCouponValueHint();
  openModal('coupon-modal');
}

async function saveCoupon() {
  const id             = document.getElementById('cpn-id').value;
  const code           = document.getElementById('cpn-code').value.trim().toUpperCase();
  const type           = document.getElementById('cpn-type').value;
  const value          = Number(document.getElementById('cpn-value').value);
  const minOrderAmount = document.getElementById('cpn-min-order').value;
  const maxUses        = document.getElementById('cpn-max-uses').value;
  const expiresAtRaw   = document.getElementById('cpn-expires').value;
  const expiresAt      = expiresAtRaw ? new Date(expiresAtRaw + 'T23:59:59').toISOString() : null;
  const active         = document.getElementById('cpn-active').checked;

  if (!id && !code) { toast('Coupon code is required.', 'error'); return; }
  if (!value || value <= 0) { toast('Discount value must be greater than 0.', 'error'); return; }
  if (type === 'percent' && value > 100) { toast('Percentage discount cannot exceed 100.', 'error'); return; }

  const btn = document.getElementById('save-coupon-btn');
  const orig = btn.innerHTML;
  btn.innerHTML = '<span class="spinner"></span>'; btn.disabled = true;

  try {
    let res;
    if (id) {
      res = await apiFetch(`/coupons/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ type, value, minOrderAmount, maxUses, expiresAt, active }),
      });
    } else {
      res = await apiFetch('/coupons', {
        method: 'POST',
        body: JSON.stringify({ code, type, value, minOrderAmount, maxUses, expiresAt, active: true }),
      });
    }
    const data = await res.json();
    if (res.ok) {
      toast(id ? 'Coupon updated.' : `Coupon "${code}" created.`, 'success');
      closeModal('coupon-modal');
      loadCoupons();
    } else toast(data.error || 'Failed to save coupon.', 'error');
  } catch { toast('Network error.', 'error'); }

  btn.innerHTML = orig; btn.disabled = false;
}

async function toggleCouponActive(id, makeActive) {
  try {
    const res = await apiFetch(`/coupons/${id}`, { method: 'PATCH', body: JSON.stringify({ active: makeActive }) });
    if (res.ok) { toast(makeActive ? 'Coupon enabled.' : 'Coupon disabled.', 'success'); loadCoupons(); }
    else { const d = await res.json(); toast(d.error || 'Failed to update coupon.', 'error'); }
  } catch { toast('Network error.', 'error'); }
}

async function deleteCoupon(id, code) {
  const ok = await bktConfirm({ title: 'Delete Coupon?', message: `"${code}" will be permanently removed. Customers can no longer use it. This cannot be undone.`, confirmText: 'Delete Coupon', icon: '🗑️' });
  if (!ok) return;
  try {
    const res = await apiFetch(`/coupons/${id}`, { method: 'DELETE' });
    if (res.ok) { toast('Coupon deleted.', 'success'); loadCoupons(); }
    else { const d = await res.json(); toast(d.error || 'Delete failed.', 'error'); }
  } catch { toast('Network error.', 'error'); }
}
async function loadOrders() {
  const status = document.getElementById('order-status-filter').value;
  const tbody  = document.getElementById('orders-body');
  tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:30px"><div class="spinner"></div></td></tr>`;
  try {
    const res  = await apiFetch(`/orders${status ? '?status=' + status : ''}`);
    const data = await res.json();
    allOrders = data.orders || [];
    renderOrders(allOrders);
  } catch { tbody.innerHTML = `<tr><td colspan="9"><div class="empty-state"><p>Failed to load orders.</p></div></td></tr>`; }
}

function filterOrdersTable() {
  const q = document.getElementById('order-search').value.toLowerCase();
  renderOrders(allOrders.filter(o => o.id.toLowerCase().includes(q) || (o.delivery?.fname + o.delivery?.lname).toLowerCase().includes(q)));
}

function renderOrders(orders) {
  const tbody = document.getElementById('orders-body');
  if (!orders.length) { tbody.innerHTML = `<tr><td colspan="9"><div class="empty-state"><i class="fa-solid fa-box-open"></i><p>No orders found</p></div></td></tr>`; return; }
  tbody.innerHTML = orders.map(o => {
    const profit = calcOrderProfit(o);
    const profitColor = profit >= 0 ? 'var(--green)' : 'var(--red)';
    const profitLabel = (profit >= 0 ? '+' : '') + 'PKR ' + profit.toLocaleString();
    return `
    <tr>
      <td><code style="color:var(--gold);cursor:pointer" onclick="viewOrder('${o.id}')">${o.id}</code></td>
      <td>${o.delivery?.fname} ${o.delivery?.lname}<br><small style="color:var(--muted)">${o.delivery?.email}</small></td>
      <td style="color:var(--muted)">${(o.items || []).length} item(s)</td>
      <td>PKR ${(o.total || 0).toLocaleString()}</td>
      <td style="color:${profitColor};font-weight:600">${profitLabel}</td>
      <td>${(o.paymentMethod || 'cod').toUpperCase()}</td>
      <td>
        <select class="status-select" onchange="updateOrderStatus('${o.id}', this.value)">
          ${['Pending','Confirmed','Processing','Shipped','Delivered','Cancelled'].map(s => `<option${s === o.status ? ' selected' : ''}>${s}</option>`).join('')}
        </select>
      </td>
      <td>${fmtDate(o.createdAt)}</td>
      <td><button class="btn btn-outline btn-sm" onclick="viewOrder('${o.id}')">Details</button>
      <button class="btn btn-danger btn-sm" onclick="deleteOrder('${o.id}')"><i class="fa-solid fa-trash"></i></button></td>
    </tr>`;
  }).join('');
}

async function updateOrderStatus(id, status) {
  try {
    const res = await apiFetch(`/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
    const d   = await res.json();
    if (res.ok) { toast(`Order ${id} → ${status}`, 'success'); loadStats(); }
    else toast(d.error || 'Update failed', 'error');
  } catch { toast('Update failed', 'error'); }
}

async function deleteOrder(id) {
  const ok = await bktConfirm({ title: 'Delete Web Order?', message: `Order ${id} will be permanently deleted. This cannot be undone.`, confirmText: 'Delete', icon: '🗑️', danger: true });
  if (!ok) return;
  try {
    const res = await apiFetch(`/orders/${id}`, { method: 'DELETE' });
    if (res.ok) {
      toast('Order deleted.', 'success');
      allOrders = allOrders.filter(o => o.id !== id);
      renderOrders(allOrders);
      loadStats();
    } else { const d = await res.json(); toast(d.error || 'Delete failed.', 'error'); }
  } catch { toast('Network error.', 'error'); }
}

function viewOrder(id) {
  const o = allOrders.find(o => o.id === id);
  if (!o) return;
  document.getElementById('order-modal-title').textContent = `Order — ${o.id}`;
  
  const isCod = o.paymentMethod === 'cod';
  const advanceSection = `
    <div style="margin-top:16px;padding:16px;background:rgba(184,136,58,0.05);border:1px solid var(--gold);border-radius:6px;">
      <h4 style="margin-top:0;margin-bottom:12px;font-size:0.9rem;color:var(--gold)">Advance Payment Details</h4>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div class="form-group" style="margin:0"><label>Status</label><select id="adv-status" style="padding:6px;font-size:0.85rem"><option value="Pending" ${o.advanceStatus==='Pending'?'selected':''}>Pending</option><option value="Received" ${o.advanceStatus==='Received'?'selected':''}>Received</option></select></div>
        <div class="form-group" style="margin:0"><label>Amount (PKR)</label><input type="number" id="adv-amount" value="${o.advanceAmount||''}" style="padding:6px;font-size:0.85rem"/></div>
        <div class="form-group" style="margin:0"><label>Method</label><input type="text" id="adv-method" value="${o.advanceMethod||''}" placeholder="e.g. Easypaisa" style="padding:6px;font-size:0.85rem"/></div>
        <div class="form-group" style="margin:0"><label>Reference ID</label><input type="text" id="adv-ref" value="${o.advanceRef||''}" placeholder="e.g. TID123" style="padding:6px;font-size:0.85rem"/></div>
        <div class="form-group" style="margin:0;grid-column:1/-1"><label>Date</label><input type="date" id="adv-date" value="${o.advanceDate||''}" style="padding:6px;font-size:0.85rem"/></div>
      </div>
      <button class="btn btn-gold btn-sm" style="margin-top:12px;width:100%" onclick="updateAdvance('${o.id}')">Update Advance Payment</button>
    </div>
  `;

  document.getElementById('order-modal-body').innerHTML = `
    <div style="display:flex;justify-content:flex-end;gap:8px;margin-bottom:16px;">
      <button class="btn btn-outline btn-sm" onclick="generateInvoice('${o.id}')"><i class="fa-solid fa-file-invoice"></i> Generate Invoice</button>
      <button class="btn btn-outline btn-sm" onclick="viewInvoicesForOrder('${o.id}')"><i class="fa-solid fa-history"></i> History</button>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
      <div><small style="color:var(--muted)">Customer</small><p>${o.delivery?.fname} ${o.delivery?.lname}</p></div>
      <div><small style="color:var(--muted)">Email</small><p>${o.delivery?.email}</p></div>
      <div><small style="color:var(--muted)">Phone</small><p>${o.delivery?.phone || '—'}</p></div>
      <div><small style="color:var(--muted)">Address</small><p>${o.delivery?.address || '—'}, ${o.delivery?.city || '—'}</p></div>
      <div><small style="color:var(--muted)">Payment</small><p>${(o.paymentMethod || '').toUpperCase()}</p></div>
      <div><small style="color:var(--muted)">Status</small><p><span class="badge badge-${o.status?.toLowerCase()}">${o.status}</span></p></div>
    </div>
    <h4 style="margin-bottom:10px;font-size:0.88rem;color:var(--muted)">Items</h4>
    ${(o.items || []).map(i => `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:0.85rem"><span>${i.emoji||'🛍️'} ${i.name} (×${i.qty})</span><span>PKR ${(i.price * i.qty).toLocaleString()}</span></div>`).join('')}
    <div style="display:flex;justify-content:space-between;padding:10px 0"><span style="color:var(--muted)">Subtotal</span><span>PKR ${(o.subtotal||0).toLocaleString()}</span></div>
    ${o.discount > 0 ? `<div style="display:flex;justify-content:space-between;padding:10px 0;color:var(--gold)"><span>Discount${o.coupon?.code ? ' — Coupon "' + esc(o.coupon.code) + '"' : ''}</span><span>− PKR ${o.discount.toLocaleString()}</span></div>` : ''}
    <div style="display:flex;justify-content:space-between;padding:10px 0;font-weight:600"><span>Delivery</span><span>PKR ${(o.deliveryFee||0).toLocaleString()}</span></div>
    <div style="display:flex;justify-content:space-between;padding:10px 0;font-weight:700;font-size:1.05rem"><span>Total</span><span style="color:var(--gold)">PKR ${(o.total||0).toLocaleString()}</span></div>
    ${isCod ? advanceSection : ''}
  `;
  openModal('order-modal');
}

async function updateAdvance(id) {
  const payload = {
    advanceStatus: document.getElementById('adv-status').value,
    advanceAmount: document.getElementById('adv-amount').value,
    advanceMethod: document.getElementById('adv-method').value,
    advanceRef: document.getElementById('adv-ref').value,
    advanceDate: document.getElementById('adv-date').value
  };
  try {
    const res = await apiFetch('/orders/'+id+'/advance', { method: 'PATCH', body: JSON.stringify(payload) });
    const data = await res.json();
    if(res.ok) { toast(data.message, 'success'); loadOrders(); loadStats(); }
    else toast(data.error || 'Failed to update', 'error');
  } catch(e) { toast('Error', 'error'); }
}

async function generateInvoice(orderId) {
  try {
    const res = await apiFetch('/invoices/generate', { method: 'POST', body: JSON.stringify({ orderId }) });
    const data = await res.json();
    if(res.ok) { 
      toast(data.message, 'success');
      loadStats();
      showPage('invoices'); 
    }
    else toast(data.error || 'Failed', 'error');
  } catch(e) { toast('Error', 'error'); }
}

let allInvoices = [];
async function loadInvoices() {
  const tbody = document.getElementById('invoices-body');
  if(!tbody) return;
  tbody.innerHTML = '<tr><td colspan="9" style="text-align:center"><div class="spinner"></div></td></tr>';
  try {
    const res = await apiFetch('/invoices');
    const data = await res.json();
    allInvoices = data.invoices || [];
    renderInvoices(allInvoices);
  } catch { tbody.innerHTML = '<tr><td colspan="9" class="empty-state">Failed to load invoices.</td></tr>'; }
}

function renderInvoices(list) {
  const tbody = document.getElementById('invoices-body');
  if(!list.length) { tbody.innerHTML = '<tr><td colspan="9" class="empty-state">No invoices found.</td></tr>'; return; }
  tbody.innerHTML = list.map(i => {
    const isCod = i.snapshot?.paymentMethod === 'cod';
    const total = i.total || 0;
    const advance = Number(i.liveAdvanceAmount !== undefined ? i.liveAdvanceAmount : i.snapshot?.advanceAmount) || 0;
    const remaining = isCod ? Math.max(0, total - advance) : 0;
    const liveStatus = i.liveStatus || i.snapshot?.status || 'Pending';
    let badgeStyle = 'background: #f39c12; color: #fff; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem;';
    if(liveStatus === 'Processing') badgeStyle = 'background: #3498db; color: #fff; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem;';
    if(liveStatus === 'Shipped') badgeStyle = 'background: #9b59b6; color: #fff; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem;';
    if(liveStatus === 'Delivered') badgeStyle = 'background: #2ecc71; color: #fff; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem;';
    if(liveStatus === 'Cancelled') badgeStyle = 'background: #e74c3c; color: #fff; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem;';
    return `
    <tr>
      <td><strong style="color:var(--gold)">${i.id}</strong></td>
      <td>
        <div style="font-weight:500;">${i.customerName}</div>
        <div style="font-size:0.8rem;color:var(--muted);">${i.snapshot?.delivery?.phone || ''}</div>
      </td>
      <td>
        <span class="badge ${isCod ? 'badge-pending' : 'badge-delivered'}">${isCod ? 'COD' : 'Online'}</span>
      </td>
      <td><span style="${badgeStyle}">${liveStatus}</span></td>
      <td>PKR ${total.toLocaleString()}</td>
      <td>PKR ${advance.toLocaleString()}</td>
      <td><strong style="color:${remaining > 0 ? '#c0392b' : 'var(--success)'}">PKR ${remaining.toLocaleString()}</strong></td>
      <td>
        <div>${new Date(i.createdAt).toLocaleDateString()}</div>
        <div style="font-size:0.75rem;color:var(--muted)">${new Date(i.createdAt).toLocaleTimeString()}</div>
      </td>
      <td style="display:flex;gap:6px;align-items:center;">
        <a href="${i.pdfUrl}" target="_blank" class="btn btn-outline btn-sm" title="View / Download PDF" style="display:flex;align-items:center;justify-content:center;padding:6px 10px;"><i class="fa-solid fa-download"></i></a>
        <button class="btn btn-gold btn-sm" onclick="emailInvoice('${i.id}')" title="Send Email" style="display:flex;align-items:center;justify-content:center;padding:6px 10px;"><i class="fa-solid fa-envelope"></i></button>
      </td>
    </tr>
  `}).join('');
}

async function emailInvoice(id) {
  try {
    const res = await apiFetch('/invoices/'+id+'/email', { method: 'POST' });
    const data = await res.json();
    if(res.ok) { toast(data.message, 'success'); loadInvoices(); }
    else toast(data.error || 'Failed to email', 'error');
  } catch(e) { toast('Error sending email', 'error'); }
}

function viewInvoicesForOrder(orderId) {
  closeModal('order-modal');
  showPage('invoices');
  const filtered = allInvoices.filter(i => i.orderId === orderId);
  renderInvoices(filtered);
}


/* ═══════════════════ PINNED COLLECTIONS ═══════════════════ */
let adminPinnedCollections = [];

async function openPinnedModal() {
  document.getElementById('modal-pinned').classList.add('open');
  document.body.style.overflow = 'hidden';
  try {
    const res = await apiFetch('/admin/pinned');
    const data = await res.json();
    adminPinnedCollections = Array.isArray(data.pinned) ? data.pinned : [];
  } catch (err) {
    adminPinnedCollections = [];
  }
  renderPinnedList();
}

function closePinnedModal() {
  document.getElementById('modal-pinned').classList.remove('open');
  document.body.style.overflow = '';
}

function renderPinnedList() {
  const tbody = document.getElementById('pinned-list-body');
  if (adminPinnedCollections.length === 0) {
    tbody.innerHTML = '<tr><td colspan="2" style="color:var(--muted);text-align:center;padding:20px;">No pinned collections yet. Add one above.</td></tr>';
    return;
  }
  tbody.innerHTML = adminPinnedCollections.map((p, i) => `
    <tr style="border-bottom:1px solid var(--border);">
      <td style="padding:10px 8px;vertical-align:middle;">
        <span style="display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;background:var(--gold);color:#000;font-size:0.7rem;font-weight:700;margin-right:10px;">${i + 1}</span>
        <strong style="font-size:0.9rem;">${p.name}</strong>
        <span style="margin-left:8px;font-size:0.7rem;color:var(--muted);font-family:monospace;">${p.id}</span>
      </td>
      <td style="text-align:right;padding:10px 8px;white-space:nowrap;">
        <button class="btn btn-outline btn-sm" onclick="movePinned(${i}, -1)" ${i===0?'disabled':''} title="Move Up"><i class="fa-solid fa-arrow-up"></i></button>
        <button class="btn btn-outline btn-sm" onclick="movePinned(${i}, 1)" ${i===adminPinnedCollections.length-1?'disabled':''} title="Move Down"><i class="fa-solid fa-arrow-down"></i></button>
        <button class="btn btn-sm" onclick="removePinned(${i})" title="Remove" style="background:rgba(217,106,106,0.15);color:#d96a6a;border:1px solid rgba(217,106,106,0.3);margin-left:4px;"><i class="fa-solid fa-trash"></i></button>
      </td>
    </tr>
  `).join('');
}

function addPinnedCollection() {
  const sel = document.getElementById('pinned-sel');
  const id = sel.value;
  if (!id) return;
  const name = sel.options[sel.selectedIndex].text;
  if (adminPinnedCollections.find(p => p.id === id)) {
    toast('Already pinned', 'info');
    return;
  }
  adminPinnedCollections.push({ id, name });
  renderPinnedList();
  sel.value = '';
}

function removePinned(index) {
  adminPinnedCollections.splice(index, 1);
  renderPinnedList();
}

function movePinned(index, dir) {
  const target = index + dir;
  if (target < 0 || target >= adminPinnedCollections.length) return;
  const temp = adminPinnedCollections[index];
  adminPinnedCollections[index] = adminPinnedCollections[target];
  adminPinnedCollections[target] = temp;
  renderPinnedList();
}

async function savePinnedCollections() {
  const btn = document.querySelector('#modal-pinned .btn-primary');
  const orig = btn.innerText;
  btn.innerText = 'Saving...';
  try {
    const res = await apiFetch('/admin/pinned', {
      method: 'POST',
      body: JSON.stringify({ pinned: adminPinnedCollections })
    });
    const data = await res.json();
    if (res.ok) {
      toast('Pinned collections saved ✓', 'success');
      closePinnedModal();
    } else {
      toast(data?.error || 'Failed to save', 'error');
    }
  } catch (err) {
    toast('Error saving pinned collections', 'error');
  }
  btn.innerText = orig;
}

/* ═══════════════════ PRODUCTS ═══════════════════ */

function exportProductsExcel() {
  if (!allProducts.length) { toast('No products to export.', 'error'); return; }
  if (!window.XLSX) { toast('XLSX library not available', 'error'); return; }

  /* ── Respect current filter & sort ── */
  const q    = document.getElementById('product-search')?.value.toLowerCase() || '';
  const cat  = document.getElementById('product-category-filter')?.value || '';
  const sort = document.getElementById('product-sort-order')?.value || 'newest';

  let products = allProducts.filter(p => {
    const matchSearch = !q || p.name?.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q);
    const matchCat    = !cat || p.category === cat || (p.additionalCategories || []).includes(cat);
    return matchSearch && matchCat;
  });
  products = [...products].sort((a, b) => {
    const ta = a.createdAt?.seconds ?? a.createdAt?._seconds ?? (a.createdAt ? new Date(a.createdAt).getTime() / 1000 : 0);
    const tb = b.createdAt?.seconds ?? b.createdAt?._seconds ?? (b.createdAt ? new Date(b.createdAt).getTime() / 1000 : 0);
    return sort === 'oldest' ? ta - tb : tb - ta;
  });

  const wb = XLSX.utils.book_new();

  /* ────────────────────────────────────────────────
     SHEET 1 — All Products (or filtered view)
  ──────────────────────────────────────────────── */
  const headers = ['#', 'Product Name', 'Category', 'Sub-Category', 'Cost Price (PKR)', 'Sale Price (PKR)', 'Profit (PKR)', 'Profit %', 'Stock Status', 'Date Added'];
  const dataRows = products.map((p, i) => {
    const cost   = p.purchasePrice != null ? Number(p.purchasePrice) : null;
    const sale   = p.price         != null ? Number(p.price)         : null;
    const profit = (cost != null && sale != null) ? sale - cost : null;
    const pct    = (cost != null && sale != null && cost > 0) ? parseFloat(((profit / cost) * 100).toFixed(1)) : null;
    let dateAdded = '';
    if (p.createdAt) {
      const ts = p.createdAt.seconds ?? p.createdAt._seconds;
      const d  = ts ? new Date(ts * 1000) : new Date(p.createdAt);
      if (!isNaN(d)) dateAdded = d.toLocaleDateString('en-PK', { day:'2-digit', month:'short', year:'numeric' });
    }
    return [
      i + 1,
      p.name || '',
      p.category || '',
      p.subcategory || '',
      cost   != null ? cost   : '',
      sale   != null ? sale   : '',
      profit != null ? profit : '',
      pct    != null ? pct    : '',
      p.inStock ? 'In Stock' : 'Out of Stock',
      dateAdded,
    ];
  });

  const wsData = [headers, ...dataRows];
  const ws1 = XLSX.utils.aoa_to_sheet(wsData);

  /* Column widths */
  ws1['!cols'] = [
    { wch: 5  },  /* # */
    { wch: 32 },  /* Product Name */
    { wch: 18 },  /* Category */
    { wch: 16 },  /* Sub-Category */
    { wch: 18 },  /* Cost Price */
    { wch: 18 },  /* Sale Price */
    { wch: 16 },  /* Profit */
    { wch: 10 },  /* Profit % */
    { wch: 14 },  /* Stock */
    { wch: 15 },  /* Date Added */
  ];

  /* Freeze top row */
  ws1['!freeze'] = { xSplit: 0, ySplit: 1 };

  /* Header styling — gold background, white bold text */
  const headerStyle = {
    font:      { bold: true, color: { rgb: 'FFFFFF' }, sz: 11, name: 'Calibri' },
    fill:      { fgColor: { rgb: 'B8860B' } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border:    { bottom: { style: 'medium', color: { rgb: '8B6508' } } },
  };

  /* Alternate row colors */
  const rowEven = { fgColor: { rgb: 'FFF8E7' } };  /* pale gold */
  const rowOdd  = { fgColor: { rgb: 'FFFFFF' } };  /* white */
  const inStockStyle  = { font: { color: { rgb: '1A7A3C' }, bold: true }, fill: { fgColor: { rgb: 'D4EDDA' } } };
  const outStockStyle = { font: { color: { rgb: '8B1A1A' }, bold: true }, fill: { fgColor: { rgb: 'F8D7DA' } } };
  const numberStyle   = { alignment: { horizontal: 'right' }, numFmt: '#,##0' };
  const pctStyle      = { alignment: { horizontal: 'right' }, numFmt: '0.0"%"' };

  /* Apply header styles */
  const colLetters = ['A','B','C','D','E','F','G','H','I','J'];
  colLetters.forEach(col => {
    const cell = ws1[col + '1'];
    if (cell) cell.s = headerStyle;
  });

  /* Apply data row styles */
  dataRows.forEach((row, ri) => {
    const r = ri + 2; /* 1-indexed, skip header */
    const isEven = ri % 2 === 0;
    const baseFill = isEven ? rowEven : rowOdd;

    colLetters.forEach((col, ci) => {
      const addr = col + r;
      if (!ws1[addr]) return;
      const cell = ws1[addr];

      /* Base style */
      cell.s = {
        fill:      { fgColor: baseFill.fgColor },
        font:      { name: 'Calibri', sz: 10 },
        alignment: { vertical: 'center' },
        border:    {
          bottom: { style: 'thin', color: { rgb: 'E8D5A3' } },
          right:  { style: 'thin', color: { rgb: 'E8D5A3' } },
        },
      };

      /* Stock status coloring */
      if (ci === 8) {
        const isIn = cell.v === 'In Stock';
        cell.s = { ...cell.s, ...(isIn ? inStockStyle : outStockStyle), alignment: { horizontal: 'center', vertical: 'center' } };
      }
      /* Number columns */
      if (ci >= 4 && ci <= 6 && cell.v !== '') {
        cell.s = { ...cell.s, ...numberStyle };
        cell.t = 'n';
      }
      /* Profit % */
      if (ci === 7 && cell.v !== '') {
        cell.s = { ...cell.s, ...pctStyle };
        cell.t = 'n';
      }
      /* Center # */
      if (ci === 0) cell.s.alignment = { horizontal: 'center', vertical: 'center' };
    });
  });

  /* Row height for header */
  ws1['!rows'] = [{ hpt: 28 }];

  XLSX.utils.book_append_sheet(wb, ws1, cat ? `${cat.charAt(0).toUpperCase()+cat.slice(1)}` : 'All Products');

  /* ────────────────────────────────────────────────
     SHEET 2 — One sheet per category
  ──────────────────────────────────────────────── */
  const categories = [
    { key: 'scrunchies',  label: 'Scrunchies',        color: 'C0392B' },
    { key: 'clips',    label: 'Hair Clips',           color: '8E44AD' },
    { key: 'hair-bands',  label: 'Hair Bands',         color: '2980B9' },
    { key: 'pins',        label: 'Pins',               color: '27AE60' },
    { key: 'ponies',      label: 'Ponies',             color: 'D35400' },
    { key: 'fancy',       label: 'Fancy Accessories',  color: 'E91E8C' },
    { key: 'bracelets',   label: 'Bracelets',          color: '16A085' },
    { key: 'rings',       label: 'Rings',              color: 'C0392B' },
    { key: 'earrings',    label: 'Earrings',           color: '8E44AD' },
    { key: 'necklace',    label: 'Necklace',           color: '2471A3' },
    { key: 'bangles',     label: 'Bangles',            color: 'D35400' },
    { key: 'jewelry-sets',label: 'Jewelry Sets',       color: '7D3C98' },
    { key: 'gift-items',  label: 'Gift Items',         color: '1E8449' },
  ];

  categories.forEach(({ key, label, color }) => {
    const catProducts = allProducts.filter(p => p.category === key);
    if (!catProducts.length) return;

    const catRows = catProducts.map((p, i) => {
      const cost   = p.purchasePrice != null ? Number(p.purchasePrice) : null;
      const sale   = p.price         != null ? Number(p.price)         : null;
      const profit = (cost != null && sale != null) ? sale - cost : null;
      const pct    = (cost != null && sale != null && cost > 0) ? parseFloat(((profit / cost) * 100).toFixed(1)) : null;
      let dateAdded = '';
      if (p.createdAt) {
        const ts = p.createdAt.seconds ?? p.createdAt._seconds;
        const d  = ts ? new Date(ts * 1000) : new Date(p.createdAt);
        if (!isNaN(d)) dateAdded = d.toLocaleDateString('en-PK', { day:'2-digit', month:'short', year:'numeric' });
      }
      return [i+1, p.name||'', p.subcategory||'', cost??'', sale??'', profit??'', pct??'', p.inStock?'In Stock':'Out of Stock', dateAdded];
    });

    const catHeaders = ['#', 'Product Name', 'Sub-Category', 'Cost Price (PKR)', 'Sale Price (PKR)', 'Profit (PKR)', 'Profit %', 'Stock Status', 'Date Added'];
    const wsC = XLSX.utils.aoa_to_sheet([catHeaders, ...catRows]);
    wsC['!cols'] = [{ wch:5 },{ wch:32 },{ wch:16 },{ wch:18 },{ wch:18 },{ wch:16 },{ wch:10 },{ wch:14 },{ wch:15 }];
    wsC['!rows'] = [{ hpt: 26 }];
    wsC['!freeze'] = { xSplit: 0, ySplit: 1 };

    const catHeaderStyle = {
      font:      { bold: true, color: { rgb: 'FFFFFF' }, sz: 11, name: 'Calibri' },
      fill:      { fgColor: { rgb: color } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      border:    { bottom: { style: 'medium', color: { rgb: '000000' } } },
    };
    ['A','B','C','D','E','F','G','H','I'].forEach(col => {
      const cell = wsC[col + '1'];
      if (cell) cell.s = catHeaderStyle;
    });

    catRows.forEach((row, ri) => {
      const r = ri + 2;
      const isEven = ri % 2 === 0;
      ['A','B','C','D','E','F','G','H','I'].forEach((col, ci) => {
        const addr = col + r;
        if (!wsC[addr]) return;
        const cell = wsC[addr];
        cell.s = {
          fill:      { fgColor: { rgb: isEven ? 'F5F5F5' : 'FFFFFF' } },
          font:      { name: 'Calibri', sz: 10 },
          alignment: { vertical: 'center' },
          border:    { bottom: { style: 'thin', color: { rgb: 'DDDDDD' } }, right: { style: 'thin', color: { rgb: 'DDDDDD' } } },
        };
        if (ci === 7) {
          const isIn = cell.v === 'In Stock';
          cell.s = { ...cell.s, font: { color: { rgb: isIn ? '1A7A3C' : '8B1A1A' }, bold: true, sz:10, name:'Calibri' }, fill: { fgColor: { rgb: isIn ? 'D4EDDA' : 'F8D7DA' } }, alignment: { horizontal:'center', vertical:'center' } };
        }
        if (ci >= 3 && ci <= 5 && cell.v !== '') { cell.t = 'n'; cell.s.alignment = { horizontal:'right', vertical:'center' }; }
        if (ci === 6 && cell.v !== '') { cell.t = 'n'; cell.s.alignment = { horizontal:'right', vertical:'center' }; }
        if (ci === 0) cell.s.alignment = { horizontal:'center', vertical:'center' };
      });
    });

    /* Sheet name max 31 chars */
    const sheetName = label.slice(0, 31);
    XLSX.utils.book_append_sheet(wb, wsC, sheetName);
  });

  const dateStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `Golnisà_Products_${dateStr}.xlsx`);
  toast('Beautiful Excel file downloaded! ✓', 'success');
}

async function loadProducts() {
  const tbody = document.getElementById('products-body');
  tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:30px"><div class="spinner"></div></td></tr>`;
  try {
    const res  = await apiFetch('/products');
    const data = await res.json();
    allProducts = (data.products || []).map(p => {
      if (p.category === 'catchers') p.category = 'clips';
      if (p.subcategory === 'catchers') p.subcategory = 'clips';
      return p;
    });
    filterProductsTable();
  } catch { toast('Failed to load products', 'error'); }
}

function filterProductsTable() {
  const q   = document.getElementById('product-search').value.toLowerCase();
  const cat = document.getElementById('product-category-filter')?.value || '';
  const sort = document.getElementById('product-sort-order')?.value || 'newest';

  let filtered = allProducts.filter(p => {
    const matchSearch = !q || p.name?.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q);
    const matchCat    = !cat || p.category === cat || (p.additionalCategories || []).includes(cat);
    return matchSearch && matchCat;
  });

  /* Sort by createdAt timestamp — fall back to array index if missing */
  filtered = [...filtered].sort((a, b) => {
    const ta = a.createdAt?.seconds ?? a.createdAt?._seconds ?? (a.createdAt ? new Date(a.createdAt).getTime() / 1000 : 0);
    const tb = b.createdAt?.seconds ?? b.createdAt?._seconds ?? (b.createdAt ? new Date(b.createdAt).getTime() / 1000 : 0);
    return sort === 'oldest' ? ta - tb : tb - ta;
  });

  renderProducts(filtered);
}

function renderProducts(products) {
  const wrap = document.getElementById('products-body');
  /* Update count label */
  const total = allProducts.length;
  const showing = products.length;
  const label = document.getElementById('product-count-label');
  if (label) label.textContent = showing === total ? `${total} product${total !== 1 ? 's' : ''}` : `Showing ${showing} of ${total} products`;
  if (!products.length) { wrap.innerHTML = `<div class="empty-state"><i class="fa-solid fa-tags"></i><p>No products found</p></div>`; return; }
  wrap.innerHTML = products.map(p => {
    const img   = p.images && p.images.length ? p.images[0] : null;
    const media = img
      ? `<img src="${img}" alt="${p.name}" style="width:100%;height:100%;object-fit:cover;"/>`
      : p.video
        ? `<video src="${p.video}#t=0.1" muted preload="metadata" playsinline style="width:100%;height:100%;object-fit:cover;"></video>`
        : `<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:2.2rem;">${p.emoji || '🛍️'}</div>`;
    const stockBadge = p.inStock
      ? `<span class="badge badge-delivered">In Stock</span>`
      : `<span class="badge badge-cancelled">Out of Stock</span>`;
    return `
    <div class="pac">
      <div class="pac-img">${media}</div>
      ${p.featured ? '<div class="pac-featured">⭐ Featured</div>' : ''}
      <div class="pac-body">
        <div class="pac-name">${p.name}${p.badge ? ` <span class="badge badge-new">${p.badge}</span>` : ''}</div>
        <div class="pac-cat">${p.category}${p.subcategory ? ' › ' + p.subcategory : ''}</div>
        <div class="pac-price">PKR ${(p.price||0).toLocaleString()}${p.priceOld ? `<s>PKR ${p.priceOld.toLocaleString()}</s>` : ''}</div>
        <div class="pac-meta">
          ${stockBadge}
          ${p.purchasePrice != null ? `<span style="color:var(--muted);font-size:0.72rem">Cost: PKR ${p.purchasePrice.toLocaleString()}</span>` : ''}
        </div>
        <div class="pac-actions">
          <button class="btn btn-outline btn-sm" onclick="editProductById('${p.id}')" title="Edit"><i class="fa-solid fa-pen"></i> Edit</button>
          <button class="btn btn-outline btn-sm" onclick="duplicateProductById('${p.id}')" title="Duplicate"><i class="fa-regular fa-copy"></i> Copy</button>
          <button class="btn btn-danger btn-sm" onclick="deleteProduct('${p.id}')" title="Delete"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>
    </div>`;
  }).join('');
}

/* ── Gallery upload state (current product being added/edited) ── */
let productImages = [];   /* array of Cloudinary URLs */
let productVideo   = null; /* single Cloudinary URL or null */

function renderImageGalleryPreview() {
  const wrap = document.getElementById('image-gallery-preview');
  wrap.innerHTML = productImages.map((url, idx) => `
    <div style="position:relative;width:80px;height:80px;">
      <img src="${url}" style="width:100%;height:100%;object-fit:cover;border-radius:6px;border:1px solid var(--border);${idx===0?'outline:2px solid var(--gold);':''}"/>
      ${idx===0 ? '<span style="position:absolute;bottom:2px;left:2px;background:var(--gold);color:#1a1a1a;font-size:0.55rem;padding:1px 5px;border-radius:3px;">MAIN</span>' : ''}
      <button type="button" onclick="removeGalleryImage(${idx})" style="position:absolute;top:-6px;right:-6px;width:20px;height:20px;border-radius:50%;background:#c0392b;color:#fff;border:none;cursor:pointer;font-size:0.7rem;line-height:1;">✕</button>
    </div>`).join('');
}

function removeGalleryImage(idx) {
  productImages.splice(idx, 1);
  renderImageGalleryPreview();
}

function renderVideoPreview() {
  const wrap = document.getElementById('video-preview');
  if (!productVideo) { wrap.innerHTML = ''; return; }
  wrap.innerHTML = `
    <div style="position:relative;width:160px;">
      <video src="${productVideo}" controls style="width:100%;border-radius:6px;border:1px solid var(--border);"></video>
      <button type="button" onclick="removeVideo()" style="position:absolute;top:-8px;right:-8px;width:22px;height:22px;border-radius:50%;background:#c0392b;color:#fff;border:none;cursor:pointer;font-size:0.7rem;">✕</button>
    </div>`;
}

function removeVideo() {
  productVideo = null;
  renderVideoPreview();
}

/* ── Upload a single file to /api/upload (admin-only, multipart) ── */
async function uploadFileToServer(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API}/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },  /* no Content-Type — browser sets multipart boundary */
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Upload failed.');
  return data;  /* { url, type, publicId } */
}

async function handleImageSelect(event) {
  const files = Array.from(event.target.files || []);
  if (!files.length) return;
  const status = document.getElementById('image-upload-status');

  for (let i = 0; i < files.length; i++) {
    status.textContent = `Uploading ${i + 1} of ${files.length}…`;
    try {
      const result = await uploadFileToServer(files[i]);
      productImages.push(result.url);
      renderImageGalleryPreview();
    } catch (err) {
      toast(err.message || 'Image upload failed.', 'error');
    }
  }
  status.textContent = '';
  event.target.value = '';  /* allow re-selecting the same file later */
}

async function handleVideoSelect(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const status = document.getElementById('video-upload-status');
  status.textContent = 'Uploading video…';
  try {
    const result = await uploadFileToServer(file);
    productVideo = result.url;
    renderVideoPreview();
  } catch (err) {
    toast(err.message || 'Video upload failed.', 'error');
  }
  status.textContent = '';
  event.target.value = '';
}

/* ── Emoji picker config ── */
const CATEGORY_EMOJIS = {
  women:     ['👗','👘','🥻','👙','👚','👜','👒','💃','🧥','👠'],
  men:       ['👔','🧥','🥋','🧣','👟','👞','🕴️','🧤','🎩','👕'],
  jewellery: ['💍','📿','💎','⌚','🪙','✨','💫','🔮','👑','🫧'],
  watches:   ['⌚','🕐','🕰️','⏱️','⏰','🌟','💎','✨','🔱','💠'],
  cosmetics: ['💄','💅','🪞','🧴','🌸','💋','🫧','✨','🧖','💆'],
  accessories:['👜','🎒','🧢','🕶️','🧣','💼','🪮','👒','🌂','⌚'],
};
const DEFAULT_EMOJIS = ['🛍️','✨','💎','🌟','👑','🎁','💫','🔮','🌸','💠'];

function renderEmojiPicker(category, selectedEmoji) {
  const picker = document.getElementById('emoji-picker');
  if (!picker) return;
  const emojis = CATEGORY_EMOJIS[category] || DEFAULT_EMOJIS;
  const current = selectedEmoji || emojis[0];
  if (!selectedEmoji) document.getElementById('p-emoji').value = emojis[0];
  picker.innerHTML = emojis.map(e => `
    <div onclick="selectEmoji('${e}')" title="${e}" style="
      width:40px;height:40px;display:flex;align-items:center;justify-content:center;
      font-size:1.4rem;cursor:pointer;border-radius:8px;border:2px solid ${e===current?'var(--gold)':'var(--border)'};
      background:${e===current?'rgba(184,136,58,0.15)':'var(--bg)'};
      transition:all .2s;">${e}</div>`).join('');
}

function selectEmoji(e) {
  document.getElementById('p-emoji').value = e;
  const cat = document.getElementById('p-category').value;
  renderEmojiPicker(cat, e);
}

function openProductModal(product = null) {
  document.getElementById('product-modal-title').textContent = product ? 'Edit Product' : 'Add Product';
  document.getElementById('product-edit-id').value = product?.id || '';
  document.getElementById('p-name').value       = product?.name || '';
  document.getElementById('p-emoji').value      = product?.emoji || '';
  document.getElementById('p-category').value   = product?.category || '';
  const additionalContainer = document.getElementById('p-additional-categories');
  const additionalCheckboxes = additionalContainer.querySelectorAll('input[type="checkbox"]');
  const additionalCategories = product?.additionalCategories || [];
  additionalCheckboxes.forEach(cb => {
    cb.checked = additionalCategories.includes(cb.value);
  });
  document.getElementById('p-badge').value      = product?.badge || '';
  document.getElementById('p-price').value      = product?.price || '';
  document.getElementById('p-purchase-price').value = product?.purchasePrice ?? '';
  document.getElementById('p-price-old').value  = product?.priceOld || '';
  document.getElementById('p-featured').value   = product?.featured ? 'true' : 'false';
  document.getElementById('p-instock').value    = product?.inStock !== false ? 'true' : 'false';
  document.getElementById('p-desc').value       = product?.description || '';
  productSizes  = [...(product?.sizes  || [])];
  productColors = [...(product?.colors || [])];
  document.getElementById('p-sizes-text').value  = '';
  document.getElementById('p-colors-text').value = '';
  renderTagChips('sizes');
  renderTagChips('colors');
  productImages = Array.isArray(product?.images) ? [...product.images] : [];
  productVideo  = product?.video || null;
  renderImageGalleryPreview();
  renderVideoPreview();
  /* Render emoji picker after setting category */
  renderEmojiPicker(product?.category || '', product?.emoji || '');
  openModal('product-modal');
}


/* ── Sizes / Colors tag chip state ── */
let productSizes = [];
let productColors = [];

function renderTagChips(field) {
  const wrap = document.getElementById(`p-${field}-chips`);
  const arr  = field === 'sizes' ? productSizes : productColors;
  wrap.innerHTML = arr.map((val, i) => `
    <span class="tag-chip">${val}<button type="button" onclick="removeTag('${field}',${i})">✕</button></span>
  `).join('');
}

function addTag(field, value) {
  const val = value.trim();
  if (!val) return;
  const arr = field === 'sizes' ? productSizes : productColors;
  if (arr.some(v => v.toLowerCase() === val.toLowerCase())) return; /* no dupes */
  arr.push(val);
  renderTagChips(field);
}

function removeTag(field, idx) {
  const arr = field === 'sizes' ? productSizes : productColors;
  arr.splice(idx, 1);
  renderTagChips(field);
}

function handleTagKeydown(event, field) {
  if (event.key === 'Enter' || event.key === ',') {
    event.preventDefault();
    addTag(field, event.target.value);
    event.target.value = '';
  } else if (event.key === 'Backspace' && event.target.value === '') {
    /* Backspace on empty input removes the last chip */
    const arr = field === 'sizes' ? productSizes : productColors;
    if (arr.length) { arr.pop(); renderTagChips(field); }
  }
}

function editProduct(product) { openProductModal(product); }

function editProductById(id) {
  const product = allProducts.find(p => p.id === id);
  if (!product) { toast('Product not found - try refreshing the list.', 'error'); return; }
  openProductModal(product);
}

function duplicateProductById(id) {
  const product = allProducts.find(p => p.id === id);
  if (!product) { toast('Product not found.', 'error'); return; }
  
  // Create a copy of the product but without an ID
  const copiedProduct = JSON.parse(JSON.stringify(product));
  copiedProduct.id = '';
  copiedProduct.name = copiedProduct.name + ' (Copy)';
  
  openProductModal(copiedProduct);
  document.getElementById('product-modal-title').textContent = 'Duplicate Product';
}

async function saveProduct() {
  const id   = document.getElementById('product-edit-id').value;
  const name = document.getElementById('p-name').value.trim();
  const cat  = document.getElementById('p-category').value;
  const price= document.getElementById('p-price').value;
  const purchasePrice = document.getElementById('p-purchase-price').value;

  if (!name || !cat || !price) { toast('Name, category, and price are required.', 'error'); return; }
  if (purchasePrice === '' || purchasePrice === null) { toast('Purchase price is required — what did this product cost you?', 'error'); return; }
  if (Number(purchasePrice) >= Number(price)) {
    const proceed = await bktConfirm({ title: 'No profit margin?', message: 'Purchase price is equal to or higher than the sale price, so this product won\'t earn any profit. Save anyway?', confirmText: 'Save Anyway', icon: '⚠️', danger: false });
    if (!proceed) return;
  }

  const btn = document.getElementById('save-product-btn');
  btn.innerHTML = '<span class="spinner"></span>';
  btn.disabled  = true;

  const additionalContainer = document.getElementById('p-additional-categories');
  const additionalCheckboxes = additionalContainer.querySelectorAll('input[type="checkbox"]:checked');
  const additionalCategories = Array.from(additionalCheckboxes).map(cb => cb.value);

  const payload = {
    name, category: cat,
    additionalCategories,
    emoji:       document.getElementById('p-emoji').value || '🛍️',
    badge:       document.getElementById('p-badge').value || null,
    price:       Number(price),
    purchasePrice: Number(purchasePrice),
    priceOld:    document.getElementById('p-price-old').value ? Number(document.getElementById('p-price-old').value) : null,
    featured:    document.getElementById('p-featured').value === 'true',
    inStock:     document.getElementById('p-instock').value !== 'false',
    description: document.getElementById('p-desc').value,
    sizes:       (() => { const t=document.getElementById('p-sizes-text').value.trim(); if(t) addTag('sizes',t); return productSizes; })(),
    colors:      (() => { const t=document.getElementById('p-colors-text').value.trim(); if(t) addTag('colors',t); return productColors; })(),
    images:      productImages,
    video:       productVideo,
  };

  try {
    const method = id ? 'PUT' : 'POST';
    const url    = id ? `/products/${id}` : '/products';
    const res    = await apiFetch(url, { method, body: JSON.stringify(payload) });
    const data   = await res.json();

    if (res.ok) {
      toast(id ? 'Product updated!' : 'Product added!', 'success');
      closeModal('product-modal');
      loadProducts();
    } else {
      toast(data.error || 'Failed to save product.', 'error');
    }
  } catch { toast('Network error.', 'error'); }

  btn.innerHTML = '<i class="fa-solid fa-check"></i> Save Product';
  btn.disabled  = false;
}

async function deleteProduct(id) {
  const ok = await bktConfirm({ title: 'Delete Product?', message: 'This product will be permanently removed. This cannot be undone.', confirmText: 'Delete Product', icon: '🗑️' });
  if (!ok) return;
  try {
    const res = await apiFetch(`/products/${id}`, { method: 'DELETE' });
    if (res.ok) { toast('Product deleted.', 'success'); loadProducts(); }
    else { const d = await res.json(); toast(d.error || 'Delete failed.', 'error'); }
  } catch { toast('Network error.', 'error'); }
}

/* ═══════════════════ MESSAGES ═══════════════════ */
async function loadMessages() {
  const tbody = document.getElementById('messages-body');
  tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:30px"><div class="spinner"></div></td></tr>`;
  try {
    const res  = await apiFetch('/contact');
    const data = await res.json();
    allMessages = data.messages || [];
    renderMessages(allMessages);
    loadStats();
  } catch { tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><p>Failed to load messages.</p></div></td></tr>`; }
}

function renderMessages(messages) {
  const tbody = document.getElementById('messages-body');
  if (!messages.length) { tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><i class="fa-solid fa-envelope-open"></i><p>No messages yet</p></div></td></tr>`; return; }
  tbody.innerHTML = messages.map(m => `
    <tr style="${m.read ? '' : 'background:rgba(184,136,58,.04)'}">
      <td><strong>${m.name}</strong>${!m.read ? ' <span class="badge badge-new">NEW</span>' : ''}</td>
      <td><a href="mailto:${m.email}" style="color:var(--gold)">${m.email}</a></td>
      <td>${m.subject || '—'}</td>
      <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--muted)">${m.message}</td>
      <td>${fmtDate(m.createdAt)}</td>
      <td style="display:flex;gap:6px">
        <button class="btn btn-outline btn-sm" onclick="viewMessage('${m.id}')">View</button>
        <button class="btn btn-success btn-sm" onclick="replyToMessage('${m.id}')">${m.replied ? '✓ Replied' : 'Reply'}</button>
        ${currentUser?.role !== 'supervisor' ? `<button class="btn btn-danger btn-sm" onclick="deleteMessage('${m.id}')">Delete</button>` : ''}
      </td>
    </tr>`).join('');
}

function viewMessage(id) {
  const m = allMessages.find(m => m.id === id);
  if (!m) return;
  document.getElementById('message-modal-body').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
      <div><small style="color:var(--muted)">Name</small><p><strong>${m.name}</strong></p></div>
      <div><small style="color:var(--muted)">Email</small><p><a href="mailto:${m.email}" style="color:var(--gold)">${m.email}</a></p></div>
      ${m.phone ? `<div><small style="color:var(--muted)">Phone</small><p>${m.phone}</p></div>` : ''}
      <div><small style="color:var(--muted)">Subject</small><p>${m.subject || '—'}</p></div>
      <div><small style="color:var(--muted)">Date</small><p>${new Date(m.createdAt).toLocaleString()}</p></div>
    </div>
    <div style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:16px;font-size:0.9rem;line-height:1.7;white-space:pre-wrap">${m.message}</div>
    <div style="margin-top:16px;display:flex;gap:10px;align-items:flex-start;flex-direction:column;">
      <textarea id="reply-text-${m.id}" rows="4" placeholder="Type your reply to ${m.name}…"
        style="width:100%;background:var(--bg);border:1px solid var(--border);color:var(--text);padding:10px 14px;font-family:inherit;font-size:.85rem;border-radius:6px;outline:none;resize:vertical;box-sizing:border-box;"></textarea>
      <button class="btn btn-gold" onclick="sendReply('${m.id}')" style="background:var(--gold);color:#fff;">
        <i class="fa-solid fa-paper-plane"></i> Send Reply to ${m.email}
      </button>
      ${m.replied ? `<p style="font-size:.75rem;color:var(--green);margin:0;">✓ Previously replied on ${fmtDate(m.repliedAt)}</p>` : ''}
    </div>
  `;
  openModal('message-modal');
  if (!m.read) markRead(id);
}

async function markRead(id) {
  await apiFetch(`/contact/${id}/read`, { method: 'PATCH' });
  const m = allMessages.find(m => m.id === id);
  if (m) { m.read = true; renderMessages(allMessages); loadStats(); }
}

async function sendReply(id) {
  const textarea = document.getElementById(`reply-text-${id}`);
  const replyText = textarea?.value?.trim();
  if (!replyText) { toast('Please type a reply message.', 'error'); return; }

  const btn = textarea.nextElementSibling;
  const originalHTML = btn.innerHTML;
  btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending…';

  try {
    const res = await apiFetch(`/contact/${id}/reply`, {
      method: 'POST',
      body: JSON.stringify({ replyText }),
    });
    const data = await res.json();
    if (res.ok) {
      toast('Reply sent to customer ✓', 'success');
      textarea.value = '';
      /* Update local data */
      const msg = allMessages.find(m => m.id === id);
      if (msg) { msg.replied = true; msg.repliedAt = new Date().toISOString(); renderMessages(allMessages); }
      closeModal('message-modal');
    } else {
      toast(data.error || 'Failed to send reply.', 'error');
    }
  } catch {
    toast('Connection error.', 'error');
  } finally {
    btn.disabled = false; btn.innerHTML = originalHTML;
  }
}

async function deleteMessage(id) {
  const ok = await bktConfirm({ title: 'Delete Message?', message: 'This message will be permanently deleted.', confirmText: 'Delete Message', icon: '✉️' });
  if (!ok) return;
  const res = await apiFetch(`/contact/${id}`, { method: 'DELETE' });
  if (res.ok) { allMessages = allMessages.filter(m => m.id !== id); renderMessages(allMessages); toast('Message deleted.', 'success'); }
  else toast('Delete failed.', 'error');
}

/* ═══════════════════ SUBSCRIBERS ═══════════════════ */
async function loadSubscribers() {
  const tbody = document.getElementById('subscribers-body');
  tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:30px"><div class="spinner"></div></td></tr>`;
  try {
    const res  = await apiFetch('/newsletter');
    const data = await res.json();
    allSubscribers = data.subscribers || [];
    /* Update subscriber count in promo modal */
    const countEl = document.getElementById('promo-sub-count');
    const activeCount = allSubscribers.filter(s => s.active !== false).length;
    if (countEl) countEl.textContent = activeCount + ' active';
    renderSubscribers(allSubscribers);
  } catch { tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><p>Failed to load subscribers.</p></div></td></tr>`; }
}

function openPromoModal() {
  const activeCount = allSubscribers.filter(s => s.active !== false).length;
  const countEl = document.getElementById('promo-sub-count');
  if (countEl) countEl.textContent = activeCount + ' active';
  document.getElementById('promo-subject').value = '';
  document.getElementById('promo-body').value = '';
  document.getElementById('promo-code').value = '';
  document.getElementById('promo-modal').style.display = 'flex';
}

function closePromoModal() {
  document.getElementById('promo-modal').style.display = 'none';
}

async function sendPromoEmail() {
  const subject = document.getElementById('promo-subject').value.trim();
  const body    = document.getElementById('promo-body').value.trim();
  const promoCode = document.getElementById('promo-code').value.trim().toUpperCase();
  if (!subject) { toast('Please enter a subject.', 'error'); return; }
  if (!body)    { toast('Please enter a message body.', 'error'); return; }

  const activeCount = allSubscribers.filter(s => s.active !== false).length;
  if (!activeCount) { toast('No active subscribers to send to.', 'error'); return; }

  const ok = await bktConfirm({
    title: `Send to ${activeCount} subscribers?`,
    message: `Subject: "${subject}"\n\nThis will send a promotion email to all ${activeCount} active subscribers. This cannot be undone.`,
    confirmText: 'Send Now',
    icon: '📧'
  });
  if (!ok) return;

  const btn = document.getElementById('promo-send-btn');
  btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending…';

  try {
    const res  = await apiFetch('/newsletter/send', {
      method: 'POST',
      body: JSON.stringify({ subject, body, promoCode: promoCode || undefined }),
    });
    const data = await res.json();
    if (res.ok) {
      toast(`✓ Sending to ${data.total} subscribers in the background!`, 'success');
      closePromoModal();
    } else {
      toast(data.error || 'Failed to send.', 'error');
    }
  } catch {
    toast('Connection error. Please try again.', 'error');
  } finally {
    btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Send to All Subscribers';
  }
}

function renderSubscribers(subs) {
  const tbody = document.getElementById('subscribers-body');
  if (!subs.length) { tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><i class="fa-solid fa-users"></i><p>No subscribers yet</p></div></td></tr>`; return; }
  tbody.innerHTML = subs.map((s, i) => `
    <tr>
      <td style="color:var(--muted)">${i+1}</td>
      <td>${s.email}</td>
      <td>${fmtDate(s.subscribedAt)}</td>
      <td><span class="badge badge-delivered">Active</span></td>
      <td><button class="btn btn-danger btn-sm" onclick="removeSubscriber('${s.id}')">Remove</button></td>
    </tr>`).join('');
}

async function removeSubscriber(id) {
  const ok = await bktConfirm({ title: 'Remove Subscriber?', message: 'This subscriber will be removed from the newsletter list.', confirmText: 'Remove', icon: '📧' });
  if (!ok) return;
  const res = await apiFetch(`/newsletter/${id}`, { method: 'DELETE' });
  if (res.ok) { allSubscribers = allSubscribers.filter(s => s.id !== id); renderSubscribers(allSubscribers); toast('Subscriber removed.', 'success'); }
  else toast('Failed to remove.', 'error');
}

function esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ═══════════════════ USERS & ROLES ═══════════════════ */
async function loadRoles() {
  if (!['ceo', 'super_admin'].includes(currentUser?.role)) {
    document.getElementById('roles-restricted').style.display = 'flex';
    document.getElementById('roles-table-wrap').style.display = 'none';
    return;
  }
  document.getElementById('roles-restricted').style.display = 'none';
  document.getElementById('roles-table-wrap').style.display = 'block';
  const tbody = document.getElementById('roles-body');
  tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:30px"><div class="spinner"></div></td></tr>`;
  try {
    const res  = await apiFetch('/auth/admin-users');
    const data = await res.json();
    const users = data.users || [];
    if (!users.length) { tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><p>No admin users found.</p></div></td></tr>`; return; }
    tbody.innerHTML = users.map(u => `
      <tr>
        <td><strong>${u.fname} ${u.lname || ''}</strong></td>
        <td style="color:var(--muted)">${u.username}</td>
        <td><span class="badge badge-role-${u.role}">${formatRole(u.role)}</span></td>

        <td><span class="badge ${u.active ? 'badge-delivered' : 'badge-cancelled'}">${u.active ? 'Active' : 'Disabled'}</span></td>
        <td>
          ${u.id !== 'super-admin-1' ? `
            <button class="btn btn-outline btn-sm" onclick="toggleUserStatus('${u.id}', ${!u.active})">${u.active ? 'Disable' : 'Enable'}</button>
            <button class="btn btn-danger btn-sm" onclick="deleteAdminUser('${u.id}')">Delete</button>
          ` : '<span style="color:var(--muted);font-size:0.78rem">Protected</span>'}
        </td>
      </tr>`).join('');
  } catch { tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><p>Failed to load users.</p></div></td></tr>`; }
}

function openRoleModal() { openModal('role-modal'); }

async function saveAdminUser() {
  const fname    = document.getElementById('r-fname').value.trim();
  const lname    = document.getElementById('r-lname').value.trim();
  const username = document.getElementById('r-username').value.trim();
  const password = document.getElementById('r-password').value;
  const role     = document.getElementById('r-role').value;

  if (!fname || !username || !password) { toast('Fill in all required fields.', 'error'); return; }
  if (password.length < 8) { toast('Password must be at least 8 characters.', 'error'); return; }

  const res  = await apiFetch('/auth/admin-users', { method: 'POST', body: JSON.stringify({ fname, lname, username, password, role }) });
  const data = await res.json();
  if (res.ok) {
    toast(data.message, 'success');
    closeModal('role-modal');
    document.getElementById('r-fname').value = document.getElementById('r-lname').value =
    document.getElementById('r-username').value = document.getElementById('r-password').value = '';
    loadRoles();
  } else toast(data.error || 'Failed to create user.', 'error');
}

function openEditUserModal(id, fname, lname, username, role) {
    document.getElementById('e-user-id').value = id;
    document.getElementById('e-fname').value = fname + ' ' + lname;
    document.getElementById('e-username').value = username;
    document.getElementById('e-role').value = role;
    document.getElementById('e-password').value = '';
    openModal('edit-user-modal');
  }

  async function saveEditUser() {
    const id = document.getElementById('e-user-id').value;
    const role = document.getElementById('e-role').value;
    const password = document.getElementById('e-password').value;
    
    const body = { role };
    if (password) {
      if (password.length < 8) { toast('Password must be at least 8 characters.', 'error'); return; }
      body.password = password;
    }

    const btn = document.getElementById('save-edit-user-btn');
    const oldText = btn.innerHTML;
    btn.innerHTML = '<span class="spinner"></span>';
    try {
      const res = await apiFetch(`/auth/admin-users/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
      const data = await res.json();
      if (res.ok) {
        toast('User updated successfully.', 'success');
        closeModal('edit-user-modal');
        loadRoles();
      } else {
        toast(data.error || 'Failed to update user.', 'error');
      }
    } catch (e) {
      toast('Error updating user.', 'error');
    } finally {
      btn.innerHTML = oldText;
    }
  }

async function toggleUserStatus(id, active) {
  const res = await apiFetch(`/auth/admin-users/${id}`, { method: 'PATCH', body: JSON.stringify({ active }) });
  if (res.ok) { toast(active ? 'User enabled.' : 'User disabled.', 'success'); loadRoles(); }
  else toast('Update failed.', 'error');
}

async function deleteAdminUser(id) {
  const ok = await bktConfirm({ title: 'Delete Admin User?', message: 'This user will lose access immediately. This cannot be undone.', confirmText: 'Delete User', icon: '👤' });
  if (!ok) return;
  const res = await apiFetch(`/auth/admin-users/${id}`, { method: 'DELETE' });
  if (res.ok) { toast('User deleted.', 'success'); loadRoles(); }
  else toast('Delete failed.', 'error');
}

/* ═══════════════════ STAFF ACTIVITY ═══════════════════ */
async function loadStaffActivity() {
  const wrap = document.getElementById('staff-activity-wrap');
  const tbody = document.getElementById('activity-body');
  if (wrap.style.display === 'none' || wrap.style.display === '') {
    wrap.style.display = 'block';
    document.getElementById('activity-btn').innerHTML = '<i class="fa-solid fa-chevron-up"></i> Hide Activity';
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:20px"><div class="spinner"></div></td></tr>`;
    try {
      const res  = await apiFetch('/admin/staff-summary');
      const data = await res.json();
      const staff = data.staff || [];
      if (!staff.length) {
        tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><p>No staff members yet. Add an Admin or Supervisor to track their activity.</p></div></td></tr>`;
        return;
      }
      tbody.innerHTML = staff.map(s => `
        <tr>
          <td><strong>${s.name}</strong></td>
          <td><span class="badge badge-role-${s.role}">${formatRole(s.role)}</span></td>
          <td style="text-align:center">${s.msgReplied}</td>
          <td style="text-align:center">${s.ordersUpdated}</td>
          <td style="color:var(--muted)">${s.lastActive ? fmtDate(s.lastActive) : '—'}</td>
          <td><span class="badge ${s.active ? 'badge-delivered' : 'badge-cancelled'}">${s.active ? 'Active' : 'Disabled'}</span></td>
        </tr>`).join('');
    } catch {
      tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><p>Failed to load activity.</p></div></td></tr>`;
    }
  } else {
    wrap.style.display = 'none';
    document.getElementById('activity-btn').innerHTML = '<i class="fa-solid fa-chart-bar"></i> Staff Activity';
  }
}

/* ═══════════════════ MESSAGE REPLY ═══════════════════ */
function replyToMessage(id) {
  document.getElementById('reply-message-id').value = id;
  document.getElementById('reply-text').value = '';
  openModal('reply-modal');
}

async function submitReply() {
  const id = document.getElementById('reply-message-id').value;
  const replyText = document.getElementById('reply-text').value.trim();
  if (!replyText) { toast('Please write a reply before sending.', 'error'); return; }
  try {
    const res  = await apiFetch(`/contact/${id}/reply`, { method: 'POST', body: JSON.stringify({ replyText }) });
    const data = await res.json();
    if (res.ok) {
      toast('Reply recorded. ✓', 'success');
      closeModal('reply-modal');
      loadMessages();
    } else toast(data.error || 'Reply failed.', 'error');
  } catch { toast('Reply failed.', 'error'); }
}

/* ═══════════════════ SETTINGS / PROFILE ═══════════════════ */
async function updateMyProfile() {
  const fname = document.getElementById('prof-fname').value;
  const lname = document.getElementById('prof-lname').value;
  const username = document.getElementById('prof-username').value;
  const nw   = document.getElementById('prof-password').value;
  const msg  = document.getElementById('profile-msg');

  msg.style.display = 'none';
  if (!username) { showProfileMsg('Username is required.', 'error'); return; }
  if (nw && nw.length < 8) { showProfileMsg('Password must be at least 8 characters.', 'error'); return; }

  const body = { fname, lname, username };
  if (nw) body.password = nw;

  const res  = await apiFetch('/auth/profile', { method: 'PATCH', body: JSON.stringify(body) });
  const data = await res.json();
  if (res.ok) {
    showProfileMsg('Profile updated successfully!', 'success');
    currentUser.fname = fname;
    currentUser.lname = lname;
    currentUser.username = username;
    document.getElementById('prof-password').value = '';
    // update dashboard greeting
    const greetName = fname || username || 'Admin';
    const currentHour = new Date().getHours();
    let greeting = 'Good evening';
    if (currentHour < 12) greeting = 'Good morning';
    else if (currentHour < 17) greeting = 'Good afternoon';
    document.getElementById('dash-greeting').textContent = `${greeting}, ${greetName}!`;
  } else showProfileMsg(data.error || 'Failed to update profile.', 'error');
}

function showProfileMsg(text, type) {
  const el = document.getElementById('profile-msg');
  el.textContent  = text;
  el.style.display = 'block';
  el.style.background = type === 'success' ? 'rgba(34,197,94,.1)' : 'rgba(239,68,68,.1)';
  el.style.color  = type === 'success' ? 'var(--green)' : 'var(--red)';
  el.style.border = type === 'success' ? '1px solid rgba(34,197,94,.3)' : '1px solid rgba(239,68,68,.3)';
}

/* ═══════════════════ SPENDINGS ═══════════════════ */
async function loadSpendings() {
  const tbody = document.getElementById('spendings-body');
  try {
    const res = await apiFetch('/spendings');
    const data = await res.json();
    if (!res.ok) throw new Error();
    tbody.innerHTML = '';
    if (!data.spendings || data.spendings.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="empty-state"><i class="fa-solid fa-receipt"></i><p>No spendings recorded yet.</p></td></tr>';
      return;
    }
    data.spendings.forEach(s => {
      const tr = document.createElement('tr');
      const d = new Date(s.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      tr.innerHTML = `
        <td>${d}</td>
        <td style="color:var(--orange);font-weight:600">PKR ${s.amount.toLocaleString()}</td>
        <td>${s.reason}</td>
        <td>
          <button class="btn btn-outline btn-sm" onclick="openSpendingModal('${s.id}', ${s.amount}, '${esc(s.reason)}', '${s.date ? s.date.split('T')[0] : ''}')" style="margin-right:8px;color:var(--blue);border-color:var(--blue)"><i class="fa-solid fa-pen"></i></button>
          <button class="btn btn-outline btn-sm" onclick="deleteSpending('${s.id}')" style="color:var(--red);border-color:var(--red)"><i class="fa-solid fa-trash"></i></button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch {
    tbody.innerHTML = '<tr><td colspan="4" class="empty-state">Failed to load spendings.</td></tr>';
  }
}

let currentEditingSpendingId = null;

function openSpendingModal(id = null, amount = '', reason = '', date = '') {
  currentEditingSpendingId = id;
  document.getElementById('spending-amount').value = amount;
  document.getElementById('spending-reason').value = reason;
  document.getElementById('spending-date').value = date || new Date().toISOString().split('T')[0];
  document.getElementById('spending-modal-title').textContent = id ? 'Edit Spending' : 'Add Spending';
  document.getElementById('spending-modal-btn').textContent = id ? 'Update Spending' : 'Save Spending';
  openModal('spending-modal');
}

async function saveSpending() {
  const amount = document.getElementById('spending-amount').value;
  const reason = document.getElementById('spending-reason').value;
  const date = document.getElementById('spending-date').value;

  if (!amount || !reason) return toast('Amount and reason are required', 'error');

  const method = currentEditingSpendingId ? 'PUT' : 'POST';
  const url = currentEditingSpendingId ? '/spendings/' + currentEditingSpendingId : '/spendings';

  const res = await apiFetch(url, {
    method,
    body: JSON.stringify({ amount, reason, date })
  });
  if (res.ok) {
    toast(currentEditingSpendingId ? 'Spending updated' : 'Spending added', 'success');
    closeModal('spending-modal');
    loadSpendings();
    loadStats(); // refresh total spendings
  } else {
    const data = await res.json();
    toast(data.error || 'Failed to save spending', 'error');
  }
}

async function deleteSpending(id) {
  const confirmed = await showConfirmModal({
    icon: '🗑️',
    title: 'Delete Spending',
    message: 'Are you sure you want to delete this spending record?',
    confirmText: 'Delete',
    cancelText: 'Cancel',
    confirmColor: 'var(--red)'
  });
  if (!confirmed) return;
  const res = await apiFetch('/spendings/' + id, { method: 'DELETE' });
  if (res.ok) {
    toast('Deleted', 'success');
    loadSpendings();
    loadStats(); // refresh total spendings
  } else toast('Delete failed', 'error');
}

async function loadSystemInfo() {
  try {
    const res  = await fetch(`${API}/health`);
    const data = await res.json();
    document.getElementById('sys-info').innerHTML = `
      Version: ${data.version} &nbsp;|&nbsp;
      Firebase: ${data.firebase === 'connected' ? '<span style="color:var(--green)">Connected ✓</span>' : '<span style="color:var(--orange)">Demo Mode</span>'} &nbsp;|&nbsp;
      Server Time: ${new Date(data.timestamp).toLocaleString()}
    `;
  } catch {}
  if (['ceo', 'super_admin'].includes(currentUser?.role)) loadLaunchDate();
}

/* ═══════════════════ SITE LAUNCH DATE (super_admin only) ═══════════════════ */
async function loadLaunchDate() {
  try {
    const res  = await apiFetch('/admin/site-launch-date');
    const data = await res.json();
    if (res.ok) document.getElementById('launch-date-input').value = data.siteLaunchDate;
  } catch {}
}

async function saveLaunchDate() {
  const date = document.getElementById('launch-date-input').value;
  if (!date) { showLaunchDateMsg('Pick a date first.', 'error'); return; }
  const ok = await bktConfirm({
    title: 'Update launch date?',
    message: 'All daily, monthly, and lifetime profit statements will recalculate starting from this date. Sales before it will no longer be counted.',
    confirmText: 'Update', icon: '🚩', danger: false,
  });
  if (!ok) return;
  try {
    const res  = await apiFetch('/admin/site-launch-date', { method: 'PUT', body: JSON.stringify({ date }) });
    const data = await res.json();
    if (res.ok) {
      showLaunchDateMsg('Launch date updated ✓ Statements will reflect this on next refresh.', 'success');
      toast('Site launch date updated.', 'success');
    } else showLaunchDateMsg(data.error || 'Failed to update.', 'error');
  } catch { showLaunchDateMsg('Network error.', 'error'); }
}

function showLaunchDateMsg(text, type) {
  const el = document.getElementById('launch-date-msg');
  el.textContent  = text;
  el.style.display = 'block';
  el.style.background = type === 'success' ? 'rgba(34,197,94,.1)' : 'rgba(239,68,68,.1)';
  el.style.color  = type === 'success' ? 'var(--green)' : 'var(--red)';
  el.style.border = type === 'success' ? '1px solid rgba(34,197,94,.3)' : '1px solid rgba(239,68,68,.3)';
}

/* ═══════════════════ EXCEL EXPORT ═══════════════════ */
async function exportExcel(type) {
  try {
    let rows = [], filename = '', sheetName = '';

    if (type === 'subscribers') {
      rows = allSubscribers.length ? allSubscribers : (await (await apiFetch('/newsletter')).json()).subscribers || [];
      filename  = `GOLNISÀ - Subscribers - ${today()}.xlsx`;
      sheetName = 'Subscribers';
      rows = rows.map((s, i) => ({ '#': i+1, Email: s.email, 'Subscribed At': fmtDate(s.subscribedAt), Status: 'Active' }));
    } else if (type === 'orders') {
      rows = allOrders.length ? allOrders : (await (await apiFetch('/orders')).json()).orders || [];
      filename  = `GOLNISÀ - Orders - ${today()}.xlsx`;
      sheetName = 'Orders';
      rows = rows.map(o => ({
        'Order Ref':    o.id,
        Customer:       `${o.delivery?.fname} ${o.delivery?.lname}`,
        Email:          o.delivery?.email,
        Phone:          o.delivery?.phone,
        City:           o.delivery?.city,
        'Total (PKR)':  o.total,
        'Delivery Fee': o.deliveryFee,
        'Payment':      o.paymentMethod?.toUpperCase(),
        Status:         o.status,
        'Order Date':   fmtDate(o.createdAt),
        'Updated':      fmtDate(o.updatedAt),
        Items:          (o.items||[]).map(i => `${i.name}×${i.qty}`).join(', '),
      }));
    } else if (type === 'messages') {
      rows = allMessages.length ? allMessages : (await (await apiFetch('/contact')).json()).messages || [];
      filename  = `GOLNISÀ - Messages - ${today()}.xlsx`;
      sheetName = 'Messages';
      rows = rows.map(m => ({
        Name:    m.name,
        Email:   m.email,
        Phone:   m.phone,
        Subject: m.subject,
        Message: m.message,
        Read:    m.read ? 'Yes' : 'No',
        Date:    fmtDate(m.createdAt),
      }));
    }

    /* Use SheetJS to create proper .xlsx */
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();

    /* Auto-column widths */
    const cols = rows.length ? Object.keys(rows[0]).map(key => ({ wch: Math.max(key.length, 15) })) : [];
    ws['!cols'] = cols;

    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, filename);
    toast(`${sheetName} exported as Excel ✓`, 'success');

  } catch (err) {
    toast('Export failed: ' + err.message, 'error');
  }
}

/* ═══════════════════ MODAL HELPERS ═══════════════════ */
function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

/* Close modal on overlay click */
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('open');
  }
});

/* ═══════════════════ TOAST ═══════════════════ */
function toast(msg, type = 'success') {
  const container = document.getElementById('toast');
  const el = document.createElement('div');
  el.className = `toast-item ${type}`;
  el.innerHTML = msg;
  container.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, 3500);
}

/* ═══════════════════ UTILS ═══════════════════ */
function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-PK', { day:'2-digit', month:'short', year:'numeric' }) + ' ' + d.toLocaleTimeString('en-PK', { hour:'2-digit', minute:'2-digit' });
}

function formatRole(role) {
  return { ceo: 'CEO', super_admin:'Super Admin', admin:'Admin', supervisor:'Support Staff', investor: 'Investor' }[role] || role;
}

function today() {
  const d = new Date();
  d.setTime(d.getTime() + (5 * 60 * 60 * 1000));
  return d.toISOString().split('T')[0];
}

/* ═══════════════════ ABANDONED ORDERS ═══════════════════ */
let allAbandoned = [];

async function loadAbandoned() {
  try {
    const res  = await apiFetch('/abandoned');
    const data = await res.json();
    allAbandoned = data.abandoned || [];
    /* Default: show only abandoned (not converted/resolved) */
    filterAbandoned();
    /* Update dashboard stat */
    const onlyAbandoned = allAbandoned.filter(a => a.status === 'abandoned');
    const converted     = allAbandoned.filter(a => a.status === 'converted');
    const lostVal       = onlyAbandoned.reduce((s, a) => s + (a.total || 0), 0);
    const stat = document.getElementById('s-abandoned');
    if (stat) { stat.textContent = onlyAbandoned.length; }
    document.getElementById('ab-total') && (document.getElementById('ab-total').textContent = onlyAbandoned.length);
    document.getElementById('ab-converted') && (document.getElementById('ab-converted').textContent = converted.length);
    document.getElementById('ab-lost-value') && (document.getElementById('ab-lost-value').textContent = 'PKR ' + lostVal.toLocaleString());
    /* Badge */
    const badge = document.getElementById('abandoned-badge');
    if (badge) { if (onlyAbandoned.length > 0) { badge.style.display = 'flex'; badge.textContent = onlyAbandoned.length; } else badge.style.display = 'none'; }
  } catch (err) { console.error('Abandoned load error:', err); }
}

function filterAbandoned() {
  const f = document.getElementById('abandoned-filter')?.value || 'abandoned';
  const filtered = f === 'all' ? allAbandoned : allAbandoned.filter(a => a.status === f);
  renderAbandoned(filtered);
}

function renderAbandoned(list) {
  const tbody = document.getElementById('abandoned-body');
  if (!tbody) return;
  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="9" class="empty-state"><i class="fa-solid fa-cart-arrow-down"></i><p>No abandoned checkouts yet.</p></td></tr>';
    return;
  }
  tbody.innerHTML = list.map((a, i) => {
    const d    = a.delivery || {};
    const name = `${d.fname || ''} ${d.lname || ''}`.trim() || '—';
    const items = (a.items || []).map(it => `${it.name} ×${it.qty}`).join(', ') || '—';
    const statusBadge = a.status === 'converted'
      ? '<span style="background:rgba(34,197,94,0.15);color:#22c55e;padding:3px 10px;border-radius:20px;font-size:0.68rem;font-weight:600">✅ Resolved</span>'
      : '<span style="background:rgba(249,115,22,0.15);color:#f97316;padding:3px 10px;border-radius:20px;font-size:0.68rem;font-weight:600">🛒 Abandoned</span>';
    const waLink = d.phone
      ? `<a href="https://wa.me/${d.phone.replace(/\D/g,'')}?text=Hi+${encodeURIComponent(d.fname||'')}%2C+you+left+something+in+your+cart+at+Golnisà+Jewelry%21+Complete+your+order+here%3A+https%3A%2F%2Fgolnisa.com%2Fcheckout.html" target="_blank" class="btn btn-outline" style="font-size:0.7rem;padding:5px 10px;color:#25d366;border-color:rgba(37,211,102,0.4)"><i class="fa-brands fa-whatsapp"></i> Recover</a>`
      : '';
    return `<tr>
      <td>${i + 1}</td>
      <td><strong>${name}</strong>${d.email ? `<br><small style="color:var(--muted)">${d.email}</small>` : ''}</td>
      <td>${d.phone || '—'}</td>
      <td>${d.city || '—'}</td>
      <td style="max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:0.78rem">${items}</td>
      <td style="color:var(--gold);font-weight:600">PKR ${(a.total||0).toLocaleString()}</td>
      <td style="font-size:0.75rem">${a.createdAt ? new Date(a.createdAt).toLocaleDateString('en-PK',{day:'2-digit',month:'short',year:'numeric'}) : '—'}</td>
      <td>${statusBadge}</td>
      <td style="display:flex;gap:6px;flex-wrap:wrap">
        ${waLink}
        ${a.status !== 'converted' ? `<button onclick="convertAbandonedToOrder('${a.id}')" class="btn btn-outline" style="font-size:0.7rem;padding:5px 10px;color:var(--gold);border-color:rgba(201,168,76,0.5)" title="Manually resolved — move to Orders"><i class="fa-solid fa-check-double"></i> Resolved</button>` : ''}
        <button onclick="deleteAbandoned('${a.id}')" class="btn btn-outline" style="font-size:0.7rem;padding:5px 10px;color:var(--danger)"><i class="fa-solid fa-trash"></i></button>
      </td>
    </tr>`;
  }).join('');
}

async function deleteAbandoned(id) {
  if (!confirm('Delete this record?')) return;
  await apiFetch(`/abandoned/${id}`, { method: 'DELETE' });
  loadAbandoned();
}

/* ── Convert abandoned checkout → real order (manually resolved) ── */
async function convertAbandonedToOrder(id) {
  const rec = allAbandoned.find(a => a.id === id);
  if (!rec) { toast('Record not found in local list', 'error'); return; }
  
  openSocialOrderModal(null, rec);
  showPage('social-orders');
}

/* ── Pretty confirm modal ── */
function showConfirmModal({ icon, title, message, confirmText, cancelText, confirmColor }) {
  return new Promise(resolve => {
    /* Remove any existing */
    document.getElementById('golnisa-confirm-modal')?.remove();

    const overlay = document.createElement('div');
    overlay.id = 'golnisa-confirm-modal';
    overlay.style.cssText = `
      position:fixed;inset:0;z-index:99999;
      background:rgba(0,0,0,0.45);backdrop-filter:blur(4px);
      display:flex;align-items:center;justify-content:center;
      animation:fadeIn .18s ease;
    `;
    overlay.innerHTML = `
      <div style="
        background:#fff;border-radius:16px;padding:36px 32px 28px;
        max-width:420px;width:90%;box-shadow:0 24px 60px rgba(0,0,0,0.18);
        text-align:center;animation:slideUp .2s ease;
      ">
        <div style="font-size:2.4rem;margin-bottom:14px">${icon}</div>
        <h3 style="margin:0 0 10px;font-size:1.18rem;color:#1a1a1a;font-weight:700">${title}</h3>
        <p style="margin:0 0 28px;color:#666;font-size:0.9rem;line-height:1.6">${message}</p>
        <div style="display:flex;gap:12px;justify-content:center">
          <button id="vcm-cancel" style="
            padding:10px 24px;border-radius:8px;border:1.5px solid #e0e0e0;
            background:#fff;color:#555;font-size:0.9rem;font-weight:600;
            cursor:pointer;transition:all .15s
          ">${cancelText}</button>
          <button id="vcm-confirm" style="
            padding:10px 28px;border-radius:8px;border:none;
            background:${confirmColor};color:#fff;font-size:0.9rem;font-weight:600;
            cursor:pointer;transition:all .15s;box-shadow:0 2px 8px rgba(184,136,58,0.25)
          ">${confirmText}</button>
        </div>
      </div>
      <style>
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes slideUp{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}
        #vcm-confirm:hover{filter:brightness(1.1)}
        #vcm-cancel:hover{background:#f5f5f5}
      </style>
    `;
    document.body.appendChild(overlay);

    overlay.querySelector('#vcm-confirm').onclick = () => { overlay.remove(); resolve(true); };
    overlay.querySelector('#vcm-cancel').onclick  = () => { overlay.remove(); resolve(false); };
    overlay.onclick = e => { if (e.target === overlay) { overlay.remove(); resolve(false); } };
  });
}

function exportAbandonedExcel() {
  const rows = allAbandoned.map(a => {
    const d = a.delivery || {};
    return {
      Name:    `${d.fname||''} ${d.lname||''}`.trim(),
      Email:   d.email || '',
      Phone:   d.phone || '',
      Address: d.address || '',
      City:    d.city || '',
      Province:d.province || '',
      Items:   (a.items||[]).map(i => `${i.name} x${i.qty}`).join(' | '),
      Total:   a.total || 0,
      Status:  a.status || '',
      Date:    a.createdAt ? new Date(a.createdAt).toLocaleDateString() : '',
    };
  });
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Abandoned');
  XLSX.writeFile(wb, 'golnisa-abandoned-orders.xlsx');
}

function updateVisitorCount(count) {
  /* Dashboard widget */
  const el = document.getElementById('s-visitors');
  if (el) { el.textContent = count; el.style.color = count > 0 ? '#22c55e' : 'var(--muted)'; }
  /* Nav badge */
  const badge = document.getElementById('visitors-badge');
  if (badge) {
    if (count > 0) { badge.style.display = 'flex'; badge.textContent = count; }
    else badge.style.display = 'none';
  }
  /* Visitors page big number */
  const vcount = document.getElementById('v-count');
  if (vcount) { vcount.textContent = count; vcount.style.color = count > 0 ? '#22c55e' : 'var(--muted)'; }
}

async function loadVisitors() {
  try {
    const res  = await apiFetch('/visitors');
    const data = await res.json();
    const count = data.count ?? 0;
    const visitors = data.visitors || [];
    updateVisitorCount(count);
    renderVisitors(visitors);
    const lu = document.getElementById('v-last-update');
    if (lu) lu.textContent = new Date().toLocaleTimeString('en-PK');
  } catch (err) {
    console.error('Visitors load error:', err);
  }
}

function renderVisitors(visitors) {
  const tbody = document.getElementById('visitors-body');
  const pbody = document.getElementById('v-pages-body');
  const pcount = document.getElementById('v-pages-count');

  if (!tbody) return;

  if (!visitors.length) {
    tbody.innerHTML = '<tr><td colspan="3" class="empty-state"><i class="fa-solid fa-eye-slash"></i><p>No active visitors right now.</p></td></tr>';
    if (pbody) pbody.innerHTML = '<tr><td colspan="3" class="empty-state">No data yet</td></tr>';
    if (pcount) pcount.textContent = '0';
    return;
  }

  /* Sort by most recently seen */
  visitors.sort((a, b) => a.secondsAgo - b.secondsAgo);

  tbody.innerHTML = visitors.map((v, i) => {
    const pageName = v.page.replace(/\.html$/, '') || '/';
    const freshness = v.secondsAgo < 5 ? '🟢 just now' :
                      v.secondsAgo < 15 ? `🟢 ${v.secondsAgo}s ago` :
                      `🟡 ${v.secondsAgo}s ago`;
    return `<tr>
      <td>${i + 1}</td>
      <td><code style="color:var(--gold);background:var(--bg-deep);padding:2px 8px;border-radius:3px;font-size:0.8rem">${pageName}</code></td>
      <td>${freshness}</td>
    </tr>`;
  }).join('');

  /* Page breakdown */
  const pageCounts = {};
  visitors.forEach(v => {
    const p = v.page.replace(/\.html$/, '') || '/';
    pageCounts[p] = (pageCounts[p] || 0) + 1;
  });
  const pages = Object.entries(pageCounts).sort((a, b) => b[1] - a[1]);
  const max = pages[0]?.[1] || 1;

  if (pcount) pcount.textContent = pages.length;
  if (pbody) {
    pbody.innerHTML = pages.map(([page, cnt]) => `
      <tr>
        <td><code style="color:var(--gold);background:var(--bg-deep);padding:2px 8px;border-radius:3px;font-size:0.8rem">${page}</code></td>
        <td style="font-weight:600;color:#22c55e">${cnt}</td>
        <td style="width:40%">
          <div style="background:var(--border);border-radius:4px;height:8px;overflow:hidden">
            <div style="background:#22c55e;height:100%;width:${Math.round((cnt/max)*100)}%;border-radius:4px;transition:width 0.4s"></div>
          </div>
        </td>
      </tr>`).join('');
  }
}
