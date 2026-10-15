import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ORDERS_FILE = path.join(__dirname, '..', 'data', 'orders.json');
const PRODUCTS_FILE = path.join(__dirname, '..', 'data', 'products.json');
const SETTINGS_FILE = path.join(__dirname, '..', 'data', 'settings.json');

async function readOrders() {
  try { return JSON.parse(await fs.readFile(ORDERS_FILE, 'utf-8')); } catch { return []; }
}
async function writeOrders(o) {
  await fs.writeFile(ORDERS_FILE, JSON.stringify(o, null, 2));
}
async function readProducts() {
  return JSON.parse(await fs.readFile(PRODUCTS_FILE, 'utf-8'));
}
async function writeProducts(p) {
  await fs.writeFile(PRODUCTS_FILE, JSON.stringify(p, null, 2));
}
async function readSettings() {
  try { return JSON.parse(await fs.readFile(SETTINGS_FILE, 'utf-8')); } catch { return { ordersEnabled: true }; }
}
const nextId = arr => arr.reduce((m, x) => Math.max(m, x.id), 0) + 1;
const VALID_STATUSES = ['pending', 'confirmed', 'dispatched', 'delivered', 'cancelled'];

/* ============================================================
   PUBLIC — Create order
   ============================================================ */
router.post('/', async (req, res) => {
  try {
    /* Kill switch */
    const settings = await readSettings();
    if (settings.ordersEnabled === false) {
      return res.status(403).json({ error: 'Orders are temporarily paused' });
    }

    const { customer, items } = req.body || {};

    if (!customer || !customer.name || !customer.email || !customer.phone || !customer.address) {
      return res.status(400).json({ error: 'Missing customer details' });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    /* Validate against DB and check stock */
    const products = await readProducts();
    const verifiedItems = [];
    let subtotal = 0;

    for (const item of items) {
      const product = products.find(p => p.id === Number(item.id));
      if (!product) {
        return res.status(400).json({ error: `Product ${item.id} not found` });
      }
      const qty = Math.max(1, Math.min(99, Number(item.qty) || 1));
      const size = item.size ? String(item.size) : null;
      const color = item.color ? String(item.color) : null;

      /* Stock check per size */
      if (size) {
        const sizes = product.sizes || {};
        const available = Number(sizes[size]) || 0;
        if (available < qty) {
          return res.status(400).json({
            error: `Only ${available} left of "${product.name}" (size ${size}). Please adjust.`
          });
        }
      }

      subtotal += product.price * qty;
      verifiedItems.push({
        id: product.id,
        name: product.name,
        price: product.price,
        img: product.img,
        qty,
        size,
        color,
      });
    }

    /* Build the order */
    const orders = await readOrders();
    const now = new Date().toISOString();

    const order = {
      id: nextId(orders),
      customer: {
        name: String(customer.name).trim(),
        email: String(customer.email).trim(),
        phone: String(customer.phone).trim(),
        address: String(customer.address).trim(),
        city: customer.city ? String(customer.city).trim() : '',
        postal: customer.postal ? String(customer.postal).trim() : '',
        notes: customer.notes ? String(customer.notes).trim() : '',
      },
      items: verifiedItems,
      subtotal: Number(subtotal.toFixed(2)),
      status: 'pending',
      createdAt: now,
      updatedAt: now,
      history: [{ status: 'pending', at: now, by: 'customer' }],
    };

    /* Decrement stock per size */
    for (const item of verifiedItems) {
      if (!item.size) continue;
      const idx = products.findIndex(p => p.id === item.id);
      if (idx === -1) continue;
      const sizes = products[idx].sizes || {};
      sizes[item.size] = Math.max(0, (Number(sizes[item.size]) || 0) - item.qty);
      products[idx].sizes = sizes;
    }
    await writeProducts(products);

    /* Save order */
    orders.push(order);
    await writeOrders(orders);

    res.status(201).json({
      id: order.id,
      subtotal: order.subtotal,
      status: order.status,
      message: 'Order placed successfully',
    });
  } catch (err) {
    console.error('POST /api/orders error:', err);
    res.status(500).json({ error: 'Failed to place order' });
  }
});

/* ============================================================
   PUBLIC — Get one order
   ============================================================ */
router.get('/:id', async (req, res) => {
  const orders = await readOrders();
  const order = orders.find(o => o.id === Number(req.params.id));
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json(order);
});

/* ============================================================
   ADMIN — List
   ============================================================ */
router.get('/', requireAuth, requireRole('admin', 'manager', 'coordinator'), async (_req, res) => {
  res.json(await readOrders());
});

/* ============================================================
   ADMIN — Update status
   ============================================================ */
router.put('/:id/status', requireAuth, requireRole('admin', 'manager', 'coordinator'), async (req, res) => {
  const { status } = req.body || {};
  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  if (status === 'cancelled' && !['admin', 'manager'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Only admin or manager can cancel orders' });
  }

  const orders = await readOrders();
  const id = Number(req.params.id);
  const idx = orders.findIndex(o => o.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Order not found' });

  /* If cancelling, restore stock */
  if (status === 'cancelled' && orders[idx].status !== 'cancelled') {
    const products = await readProducts();
    for (const item of orders[idx].items || []) {
      if (!item.size) continue;
      const pidx = products.findIndex(p => p.id === item.id);
      if (pidx === -1) continue;
      const sizes = products[pidx].sizes || {};
      sizes[item.size] = (Number(sizes[item.size]) || 0) + item.qty;
      products[pidx].sizes = sizes;
    }
    await writeProducts(products);
  }

  orders[idx] = {
    ...orders[idx],
    status,
    updatedAt: new Date().toISOString(),
    history: [...(orders[idx].history || []), {
      status,
      at: new Date().toISOString(),
      by: req.user.username,
    }],
  };

  await writeOrders(orders);
  res.json(orders[idx]);
});

/* ============================================================
   ADMIN — Delete
   ============================================================ */
router.delete('/:id', requireAuth, requireRole('admin', 'manager'), async (req, res) => {
  const orders = await readOrders();
  const id = Number(req.params.id);
  const filtered = orders.filter(o => o.id !== id);
  if (filtered.length === orders.length) {
    return res.status(404).json({ error: 'Order not found' });
  }
  await writeOrders(filtered);
  res.json({ success: true });
});

export default router;