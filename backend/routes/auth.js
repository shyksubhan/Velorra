/* ============================================================
   VELORRA — Auth Routes (uses shared store + Firebase)
   Roles: super_admin, admin, supervisor
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

const VALID_ROLES = ['admin', 'supervisor'];

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

/* ── Find admin user from Firebase or store ── */
async function findAdminUserByUsername(username) {
  const lower = (username || '').toLowerCase();
  /* Always check in-memory store first (includes super admin) */
  const inMem = store.findAdminUser(lower);
  if (inMem) return inMem;
  /* Then check Firebase if available */
  if (isFirebaseAvailable()) {
    try {
      const snap = await getDB().collection('adminUsers')
        .where('username', '==', lower).limit(1).get();
      if (!snap.empty) {
        const data = { ...snap.docs[0].data(), id: snap.docs[0].id };
        /* Cache in memory so subsequent lookups are fast */
        if (!store.findAdminUser(lower)) store.adminUsers.push(data);
        return data;
      }
    } catch {}
  }
  return null;
}

/* ── Get all admin users ── */
async function getAllAdminUsers() {
  if (!isFirebaseAvailable()) return store.adminUsers;
  try {
    const snap = await getDB().collection('adminUsers').orderBy('createdAt', 'asc').get();
    const fbUsers = snap.docs.map(d => ({ ...d.data(), id: d.id }));
    /* Merge: always keep super admin from store, add Firebase users */
    const superAdmin = store.adminUsers.find(u => u.role === 'super_admin');
    const merged = [superAdmin, ...fbUsers.filter(u => u.role !== 'super_admin')];
    /* Update in-memory cache */
    store.adminUsers = merged;
    return merged;
  } catch {
    return store.adminUsers;
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
      return res.status(201).json({ message: 'Account created! Welcome to Velorra 💧', token, user: { id: ref.id, fname: userData.fname, lname: userData.lname, email: normalEmail, phone: userData.phone } });
    }

    /* In-memory */
    if (store.findUser(normalEmail)) return res.status(409).json({ error: 'An account with this email already exists.' });
    const uid = 'user-' + Date.now();
    const userData = { id: uid, fname: fname.trim(), lname: lname.trim(), email: normalEmail, phone: (phone || '').trim(), passwordHash, isAdmin: false, createdAt: new Date().toISOString() };
    store.users.push(userData);
    const token = signToken({ uid, email: normalEmail, isAdmin: false });
    return res.status(201).json({ message: 'Account created! Welcome to Velorra 💧', token, user: { id: uid, fname: userData.fname, lname: userData.lname, email: normalEmail, phone: userData.phone } });

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

    /* ── Admin login ── */
    initSuperAdmin();
    const adminUser = await findAdminUserByUsername(normalEmail);
    if (adminUser && adminUser.active) {
      const passMatch = adminUser.passwordHash
        ? await bcrypt.compare(password, adminUser.passwordHash)
        : password === process.env.ADMIN_PASSWORD;

      if (passMatch) {
        /* Update lastLogin */
        adminUser.lastLogin = new Date().toISOString();
        if (isFirebaseAvailable() && adminUser.role !== 'super_admin') {
          try { await getDB().collection('adminUsers').doc(adminUser.id).update({ lastLogin: adminUser.lastLogin }); } catch {}
        }
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
      const u = req.user.uid === 'super-admin-1'
        ? store.adminUsers.find(u => u.id === 'super-admin-1')
        : store.findAdminUserById(req.user.uid);
      if (!u) return res.status(401).json({ error: 'Your account no longer exists. Please sign in again.' });
      if (u.active === false) return res.status(401).json({ error: 'Your account has been deactivated.' });
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
   PATCH /api/auth/change-password
   ============================================================ */
router.patch('/change-password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Both current and new password are required.' });
    if (newPassword.length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters.' });

    if (req.user.isAdmin) {
      if (req.user.role !== 'super_admin') {
        return res.status(403).json({ error: 'Only the Super Admin can change their own password here. Ask your Super Admin to reset it for you from Users & Roles.' });
      }
      const adminUser = store.adminUsers.find(u => u.id === 'super-admin-1');
      if (!adminUser) return res.status(401).json({ error: 'Your account no longer exists. Please sign in again.' });
      const match = adminUser.passwordHash
        ? await bcrypt.compare(currentPassword, adminUser.passwordHash)
        : currentPassword === process.env.ADMIN_PASSWORD;
      if (!match) return res.status(401).json({ error: 'Current password is incorrect.' });
      adminUser.passwordHash = await bcrypt.hash(newPassword, 12);
      process.env.ADMIN_PASSWORD = newPassword;
      return res.json({ message: 'Password changed successfully.' });
    }

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
   GET /api/auth/admin-users (super_admin only)
   ============================================================ */
router.get('/admin-users', requireAdmin, async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') return res.status(403).json({ error: 'Only super admins can view admin users.' });
    const users = (await getAllAdminUsers()).map(u => ({
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
    if (!VALID_ROLES.includes(role)) return res.status(400).json({ error: 'Role must be "admin" or "supervisor".' });

    const normalUsername = username.trim().toLowerCase();
    const existing = await findAdminUserByUsername(normalUsername);
    if (existing) return res.status(409).json({ error: 'Username already exists.' });

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

    /* Persist to Firebase if available */
    if (isFirebaseAvailable()) {
      try {
        const ref = getDB().collection('adminUsers').doc(newUser.id);
        await ref.set(newUser);
      } catch (fbErr) {
        console.error('Firebase admin user save failed, falling back to memory:', fbErr.message);
        store.adminUsers.push(newUser);
      }
    } else {
      store.adminUsers.push(newUser);
    }

    return res.status(201).json({
      message: `${role.charAt(0).toUpperCase() + role.slice(1)} "${fname}" created.`,
      user: { id: newUser.id, fname: newUser.fname, username: newUser.username, role: newUser.role }
    });
  } catch (err) {
    console.error('Create admin user error:', err);
    return res.status(500).json({ error: 'Failed to create user.' });
  }
});

/* ============================================================
   PATCH /api/auth/admin-users/:id — Update role/status/password
   ============================================================ */
router.patch('/admin-users/:id', requireAdmin, async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') return res.status(403).json({ error: 'Only super admins can update admin users.' });
    const { role, active, password } = req.body;

    /* Try Firebase first */
    if (isFirebaseAvailable() && req.params.id !== 'super-admin-1') {
      const ref = getDB().collection('adminUsers').doc(req.params.id);
      const doc = await ref.get();
      if (doc.exists) {
        const updates = {};
        if (role)   updates.role   = role;
        if (active !== undefined) updates.active = active;
        if (password) updates.passwordHash = await bcrypt.hash(password, 12);
        await ref.update(updates);
        /* Update in-memory cache */
        const inMem = store.adminUsers.find(u => u.id === req.params.id);
        if (inMem) Object.assign(inMem, updates);
        return res.json({ message: 'User updated.' });
      }
    }

    const user = store.adminUsers.find(u => u.id === req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    if (user.id === 'super-admin-1') return res.status(403).json({ error: 'Cannot modify the primary super admin.' });
    if (role)   user.role   = role;
    if (active !== undefined) user.active = active;
    if (password) user.passwordHash = await bcrypt.hash(password, 12);
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

    if (isFirebaseAvailable()) {
      try { await getDB().collection('adminUsers').doc(req.params.id).delete(); } catch {}
    }
    const idx = store.adminUsers.findIndex(u => u.id === req.params.id);
    if (idx >= 0) store.adminUsers.splice(idx, 1);
    return res.json({ message: 'Admin user deleted.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete user.' });
  }
});

module.exports = router;
