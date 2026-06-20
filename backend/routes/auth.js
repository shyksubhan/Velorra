/* ============================================================
   VELORRA — Auth Routes (uses shared store)
   Fixes: login works, change password, role management
   ============================================================ */
const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const { getDB }       = require('../utils/firebase');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const store = require('../utils/store');

const router = express.Router();

function isFirebaseAvailable() {
  try { return !!getDB(); } catch { return false; }
}

function signToken(payload, expiresIn = '30d') {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
}

/* ── Lazily initialize the built-in super admin from .env ── */
function initSuperAdmin() {
  const u = store.adminUsers[0];
  if (!u.username) {
    u.username = (process.env.ADMIN_USERNAME || 'admin').toLowerCase();
    u.email    = u.username;
  }
  /* Hash the password only once */
  if (!u.passwordHash && process.env.ADMIN_PASSWORD) {
    u.passwordHash = bcrypt.hashSync(process.env.ADMIN_PASSWORD, 10);
  }
}

/* ============================================================
   POST /api/auth/register — Customer registration
   ============================================================ */
router.post('/register', async (req, res) => {
  try {
    const { fname, lname, email, phone, password } = req.body;
    if (!fname || !lname || !email || !password) return res.status(400).json({ error: 'All fields are required.' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });

    const normalEmail  = email.trim().toLowerCase();
    const passwordHash = await bcrypt.hash(password, 12);

    if (isFirebaseAvailable()) {
      const db = getDB();
      const existing = await db.collection('users').where('email', '==', normalEmail).limit(1).get();
      if (!existing.empty) return res.status(409).json({ error: 'An account with this email already exists.' });
      const ref = db.collection('users').doc();
      const userData = { id: ref.id, fname: fname.trim(), lname: lname.trim(), email: normalEmail, phone: (phone || '').trim(), passwordHash, isAdmin: false, createdAt: new Date().toISOString() };
      await ref.set(userData);
      const token = signToken({ uid: ref.id, email: normalEmail, isAdmin: false });
      return res.status(201).json({ message: 'Account created! Welcome to Velorra 💛', token, user: { id: ref.id, fname: userData.fname, lname: userData.lname, email: normalEmail, phone: userData.phone } });
    }

    /* In-memory */
    if (store.findUser(normalEmail)) return res.status(409).json({ error: 'An account with this email already exists.' });
    const uid = 'user-' + Date.now();
    const userData = { id: uid, fname: fname.trim(), lname: lname.trim(), email: normalEmail, phone: (phone || '').trim(), passwordHash, isAdmin: false, createdAt: new Date().toISOString() };
    store.users.push(userData);
    const token = signToken({ uid, email: normalEmail, isAdmin: false });
    return res.status(201).json({ message: 'Account created! Welcome to Velorra 💛', token, user: { id: uid, fname: userData.fname, lname: userData.lname, email: normalEmail, phone: userData.phone } });

  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
});

/* ============================================================
   POST /api/auth/login
   ============================================================ */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });

    const normalEmail = email.trim().toLowerCase();

    /* ── Admin login (checks both admin panel users AND env credentials) ── */
    initSuperAdmin();
    const adminUser = store.findAdminUser(normalEmail);
    if (adminUser && adminUser.active) {
      const passMatch = adminUser.passwordHash
        ? await bcrypt.compare(password, adminUser.passwordHash)
        : password === process.env.ADMIN_PASSWORD;     /* fallback for plain text in env */

      if (passMatch) {
        adminUser.lastLogin = new Date().toISOString();
        const token = signToken({ uid: adminUser.id, email: adminUser.username, isAdmin: true, role: adminUser.role });
        return res.json({
          message: `Welcome, ${adminUser.fname}! ✓`,
          token,
          user: { id: adminUser.id, fname: adminUser.fname, lname: adminUser.lname, email: adminUser.username, isAdmin: true, role: adminUser.role },
        });
      }
    }

    /* ── Customer login ── */
    if (isFirebaseAvailable()) {
      const db = getDB();
      const snap = await db.collection('users').where('email', '==', normalEmail).limit(1).get();
      if (snap.empty) return res.status(401).json({ error: 'No account found with this email.' });
      const u = snap.docs[0].data();
      if (!await bcrypt.compare(password, u.passwordHash)) return res.status(401).json({ error: 'Incorrect password.' });
      const token = signToken({ uid: u.id, email: normalEmail, isAdmin: false });
      return res.json({ message: `Welcome back, ${u.fname}! ✓`, token, user: { id: u.id, fname: u.fname, lname: u.lname, email: u.email, phone: u.phone } });
    }

    const u = store.findUser(normalEmail);
    if (!u) return res.status(401).json({ error: 'No account found with this email.' });
    if (!await bcrypt.compare(password, u.passwordHash)) return res.status(401).json({ error: 'Incorrect password.' });
    const token = signToken({ uid: u.id, email: normalEmail, isAdmin: false });
    return res.json({ message: `Welcome back, ${u.fname}! ✓`, token, user: { id: u.id, fname: u.fname, lname: u.lname, email: u.email, phone: u.phone } });

  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
});

/* ============================================================
   GET /api/auth/me
   ============================================================ */
router.get('/me', requireAuth, async (req, res) => {
  try {
    if (req.user.isAdmin) {
      const u = store.adminUsers.find(u => u.id === req.user.uid) || store.adminUsers[0];
      return res.json({ id: u.id, fname: u.fname, lname: u.lname, email: u.username, isAdmin: true, role: u.role });
    }
    if (isFirebaseAvailable()) {
      const doc = await getDB().collection('users').doc(req.user.uid).get();
      if (!doc.exists) return res.status(404).json({ error: 'User not found.' });
      const u = doc.data();
      return res.json({ id: u.id, fname: u.fname, lname: u.lname, email: u.email, phone: u.phone });
    }
    const u = store.users.find(u => u.id === req.user.uid);
    if (!u) return res.status(404).json({ error: 'User not found.' });
    return res.json({ id: u.id, fname: u.fname, lname: u.lname, email: u.email, phone: u.phone });
  } catch (err) {
    return res.status(500).json({ error: 'Something went wrong.' });
  }
});

/* ============================================================
   PATCH /api/auth/change-password — Fix #4
   ============================================================ */
router.patch('/change-password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Both current and new password are required.' });
    if (newPassword.length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters.' });

    /* Admin password change */
    if (req.user.isAdmin) {
      const adminUser = store.adminUsers.find(u => u.id === req.user.uid) || store.adminUsers[0];
      const match = adminUser.passwordHash
        ? await bcrypt.compare(currentPassword, adminUser.passwordHash)
        : currentPassword === process.env.ADMIN_PASSWORD;
      if (!match) return res.status(401).json({ error: 'Current password is incorrect.' });
      adminUser.passwordHash = await bcrypt.hash(newPassword, 12);
      /* Also update .env in memory (actual .env file won't change — that's fine for security) */
      process.env.ADMIN_PASSWORD = newPassword;
      return res.json({ message: 'Password changed successfully.' });
    }

    /* Customer password change */
    if (isFirebaseAvailable()) {
      const db = getDB();
      const ref = db.collection('users').doc(req.user.uid);
      const doc = await ref.get();
      if (!doc.exists) return res.status(404).json({ error: 'User not found.' });
      const u = doc.data();
      if (!await bcrypt.compare(currentPassword, u.passwordHash)) return res.status(401).json({ error: 'Current password is incorrect.' });
      await ref.update({ passwordHash: await bcrypt.hash(newPassword, 12) });
      return res.json({ message: 'Password changed successfully.' });
    }

    const u = store.users.find(u => u.id === req.user.uid);
    if (!u) return res.status(404).json({ error: 'User not found.' });
    if (!await bcrypt.compare(currentPassword, u.passwordHash)) return res.status(401).json({ error: 'Current password is incorrect.' });
    u.passwordHash = await bcrypt.hash(newPassword, 12);
    return res.json({ message: 'Password changed successfully.' });

  } catch (err) {
    console.error('Change password error:', err);
    return res.status(500).json({ error: 'Failed to change password.' });
  }
});

/* ============================================================
   GET /api/auth/admin-users (super_admin only) — Fix #5
   ============================================================ */
router.get('/admin-users', requireAdmin, async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') return res.status(403).json({ error: 'Only super admins can view admin users.' });
    const users = store.adminUsers.map(u => ({
      id:        u.id,
      fname:     u.fname,
      lname:     u.lname,
      username:  u.username,
      role:      u.role,
      active:    u.active,
      createdAt: u.createdAt,
      lastLogin: u.lastLogin,
    }));
    return res.json({ users });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch admin users.' });
  }
});

/* ============================================================
   POST /api/auth/admin-users — Create admin/supervisor (super_admin only)
   ============================================================ */
router.post('/admin-users', requireAdmin, async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') return res.status(403).json({ error: 'Only super admins can create admin users.' });
    const { fname, lname, username, password, role } = req.body;
    if (!fname || !username || !password) return res.status(400).json({ error: 'First name, username, and password are required.' });
    if (!['admin', 'supervisor'].includes(role)) return res.status(400).json({ error: 'Role must be "admin" or "supervisor".' });

    const normalUsername = username.trim().toLowerCase();
    if (store.findAdminUser(normalUsername)) return res.status(409).json({ error: 'Username already exists.' });

    const newUser = {
      id:           'admin-' + Date.now(),
      fname:        fname.trim(),
      lname:        (lname || '').trim(),
      username:     normalUsername,
      email:        normalUsername,
      passwordHash: await bcrypt.hash(password, 12),
      role,
      active:       true,
      createdAt:    new Date().toISOString(),
      lastLogin:    null,
    };
    store.adminUsers.push(newUser);
    return res.status(201).json({ message: `${role.charAt(0).toUpperCase() + role.slice(1)} "${fname}" created.`, user: { id: newUser.id, fname: newUser.fname, username: newUser.username, role: newUser.role } });
  } catch (err) {
    console.error('Create admin user error:', err);
    return res.status(500).json({ error: 'Failed to create user.' });
  }
});

/* ============================================================
   PATCH /api/auth/admin-users/:id — Update role/status
   ============================================================ */
router.patch('/admin-users/:id', requireAdmin, async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') return res.status(403).json({ error: 'Only super admins can update admin users.' });
    const { role, active } = req.body;
    const user = store.adminUsers.find(u => u.id === req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    if (user.id === 'super-admin-1') return res.status(403).json({ error: 'Cannot modify the primary super admin.' });
    if (role) user.role   = role;
    if (active !== undefined) user.active = active;
    return res.json({ message: 'User updated.', user: { id: user.id, fname: user.fname, role: user.role, active: user.active } });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update user.' });
  }
});

/* ============================================================
   DELETE /api/auth/admin-users/:id
   ============================================================ */
router.delete('/admin-users/:id', requireAdmin, async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') return res.status(403).json({ error: 'Only super admins can delete admin users.' });
    if (req.params.id === 'super-admin-1') return res.status(403).json({ error: 'Cannot delete the primary super admin.' });
    const idx = store.adminUsers.findIndex(u => u.id === req.params.id);
    if (idx < 0) return res.status(404).json({ error: 'User not found.' });
    store.adminUsers.splice(idx, 1);
    return res.json({ message: 'Admin user deleted.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete user.' });
  }
});

module.exports = router;
