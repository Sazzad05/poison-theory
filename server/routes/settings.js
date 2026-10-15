import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SETTINGS_FILE = path.join(__dirname, '..', 'data', 'settings.json');

/* ---------- Helpers ---------- */
async function readSettings() {
  return JSON.parse(await fs.readFile(SETTINGS_FILE, 'utf-8'));
}
async function writeSettings(s) {
  await fs.writeFile(SETTINGS_FILE, JSON.stringify(s, null, 2));
}

/* ---------- Public: what the storefront needs ---------- */
router.get('/', async (_req, res) => {
  try {
    const s = await readSettings();
    res.json({
      currency: s.currency,
      ordersEnabled: s.ordersEnabled !== false,
      categories: s.categories || [],
      sizes: s.sizes || [],
      colors: s.colors || [],
    });
  } catch {
    res.status(500).json({ error: 'Failed to read settings' });
  }
});

/* ---------- Admin: full settings ---------- */
router.get('/full', requireAuth, requireRole('admin'), async (_req, res) => {
  try {
    res.json(await readSettings());
  } catch {
    res.status(500).json({ error: 'Failed to read settings' });
  }
});

/* ---------- Admin: replace settings ---------- */
router.put('/', requireAuth, requireRole('admin'), async (req, res) => {
  const incoming = req.body || {};

  if (typeof incoming !== 'object') {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  const current = await readSettings();

  const updated = {
    ...current,
    currency: {
      code: incoming.currency?.code || current.currency.code,
      symbol: incoming.currency?.symbol || current.currency.symbol,
      position: incoming.currency?.position === 'after' ? 'after' : 'before',
    },
    ordersEnabled: typeof incoming.ordersEnabled === 'boolean'
      ? incoming.ordersEnabled
      : current.ordersEnabled,
    categories: Array.isArray(incoming.categories)
      ? incoming.categories
      : current.categories,
    sizes: Array.isArray(incoming.sizes)
      ? incoming.sizes.map(s => String(s).trim()).filter(Boolean)
      : current.sizes,
    colors: Array.isArray(incoming.colors)
      ? incoming.colors
      : current.colors,
  };

  await writeSettings(updated);
  res.json(updated);
});

export default router;