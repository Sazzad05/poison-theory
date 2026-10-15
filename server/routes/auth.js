import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const USERS_FILE = path.join(__dirname, '..', 'data', 'users.json');

/* ---------- Helpers ---------- */
async function readUsers() {
  const raw = await fs.readFile(USERS_FILE, 'utf-8');
  return JSON.parse(raw);
}
async function writeUsers(users) {
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
}
const nextId = arr => arr.reduce((m, x) => Math.max(m, x.id), 0) + 1;

/* ---------- Login ---------- */
router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const users = await readUsers();
  const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
  if (!user || !user.active) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign(
    { id: user.id, username: user.username, name: user.name, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({
    token,
    user: { id: user.id, username: user.username, name: user.name, role: user.role },
  });
});

/* ---------- Who am I ---------- */
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

/* ============================================================
   USER MANAGEMENT — Admin only
   ============================================================ */

/* List users */
router.get('/users', requireAuth, requireRole('admin'), async (_req, res) => {
  const users = await readUsers();
  const safe = users.map(({ password, ...rest }) => rest);
  res.json(safe);
});

/* Create user */
router.post('/users', requireAuth, requireRole('admin'), async (req, res) => {
  const { username, name, password, role } = req.body || {};
  if (!username || !password || !role) {
    return res.status(400).json({ error: 'username, password and role required' });
  }
  if (!['admin', 'manager', 'coordinator'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  const users = await readUsers();
  if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
    return res.status(409).json({ error: 'Username already exists' });
  }

  const user = {
    id: nextId(users),
    username: username.trim(),
    name: (name || username).trim(),
    role,
    password: await bcrypt.hash(password, 10),
    active: true,
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  await writeUsers(users);

  const { password: _, ...safe } = user;
  res.status(201).json(safe);
});

/* Update user (name, role, active, optional new password) */
router.put('/users/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const users = await readUsers();
  const id = Number(req.params.id);
  const idx = users.findIndex(u => u.id === id);
  if (idx === -1) return res.status(404).json({ error: 'User not found' });

  const { name, role, active, password } = req.body || {};

  if (role && !['admin', 'manager', 'coordinator'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  /* Prevent locking yourself out: can't demote/deactivate the last active admin */
  if (users[idx].role === 'admin' && (role !== 'admin' || active === false)) {
    const otherAdmins = users.filter(u => u.id !== id && u.role === 'admin' && u.active);
    if (otherAdmins.length === 0) {
      return res.status(400).json({ error: 'Cannot remove the last active admin' });
    }
  }

  users[idx] = {
    ...users[idx],
    name: name ?? users[idx].name,
    role: role ?? users[idx].role,
    active: typeof active === 'boolean' ? active : users[idx].active,
    password: password ? await bcrypt.hash(password, 10) : users[idx].password,
  };
  await writeUsers(users);

  const { password: _, ...safe } = users[idx];
  res.json(safe);
});

/* Delete user */
router.delete('/users/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const users = await readUsers();
  const id = Number(req.params.id);
  const target = users.find(u => u.id === id);
  if (!target) return res.status(404).json({ error: 'User not found' });

  if (target.role === 'admin') {
    const otherAdmins = users.filter(u => u.id !== id && u.role === 'admin' && u.active);
    if (otherAdmins.length === 0) {
      return res.status(400).json({ error: 'Cannot delete the last active admin' });
    }
  }

  await writeUsers(users.filter(u => u.id !== id));
  res.json({ success: true });
});

export default router;