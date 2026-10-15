import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, '..', 'data', 'products.json');
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');

/* ---------- Multer setup ---------- */
await fs.mkdir(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safe = `pt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, safe);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /^image\/(jpeg|png|webp|gif)$/.test(file.mimetype);
    cb(ok ? null : new Error('Only JPG, PNG, WEBP or GIF allowed'), ok);
  },
});

/* ---------- Helpers ---------- */
async function readProducts() {
  return JSON.parse(await fs.readFile(DATA_FILE, 'utf-8'));
}
async function writeProducts(p) {
  await fs.writeFile(DATA_FILE, JSON.stringify(p, null, 2));
}
const nextId = arr => arr.reduce((m, x) => Math.max(m, x.id), 0) + 1;

/* Accept JSON string or object/array */
function parseJSONSafe(input) {
  if (input == null) return undefined;
  if (typeof input === 'object') return input;
  try { return JSON.parse(input); } catch { return undefined; }
}

/* ---------- Public: list ---------- */
router.get('/', async (_req, res) => {
  try {
    res.json(await readProducts());
  } catch {
    res.status(500).json({ error: 'Failed to read products' });
  }
});

/* ---------- Public: single ---------- */
router.get('/:id', async (req, res) => {
  const products = await readProducts();
  const p = products.find(x => x.id === Number(req.params.id));
  if (!p) return res.status(404).json({ error: 'Product not found' });
  res.json(p);
});

/* ---------- Admin + Manager: create ---------- */
router.post(
  '/',
  requireAuth,
  requireRole('admin', 'manager'),
  upload.single('image'),
  async (req, res) => {
    const products = await readProducts();
    const data = req.body || {};

    if (!data.name || !data.price || !data.category) {
      return res.status(400).json({ error: 'name, price and category are required' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Image file is required' });
    }

    const product = {
      id: nextId(products),
      name: String(data.name).trim(),
      price: Number(data.price),
      oldPrice: data.oldPrice ? Number(data.oldPrice) : undefined,
      category: String(data.category).trim(),
      badge: data.badge ? String(data.badge).trim() : undefined,
      rating: data.rating ? Number(data.rating) : 4.5,
      img: `/uploads/${req.file.filename}`,
      sizes: parseJSONSafe(data.sizes) || {},
      colors: parseJSONSafe(data.colors) || [],
    };

    products.push(product);
    await writeProducts(products);
    res.status(201).json(product);
  }
);

/* ---------- Admin + Manager: update ---------- */
router.put(
  '/:id',
  requireAuth,
  requireRole('admin', 'manager'),
  upload.single('image'),
  async (req, res) => {
    const products = await readProducts();
    const id = Number(req.params.id);
    const idx = products.findIndex(p => p.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Product not found' });

    const data = req.body || {};
    const current = products[idx];

    let newImg = current.img;
    if (req.file) {
      if (current.img?.startsWith('/uploads/')) {
        const oldPath = path.join(UPLOAD_DIR, path.basename(current.img));
        fs.unlink(oldPath).catch(() => {});
      }
      newImg = `/uploads/${req.file.filename}`;
    }

    const parsedSizes = parseJSONSafe(data.sizes);
    const parsedColors = parseJSONSafe(data.colors);

    products[idx] = {
      ...current,
      name: data.name ?? current.name,
      price: data.price != null && data.price !== '' ? Number(data.price) : current.price,
      oldPrice: data.oldPrice ? Number(data.oldPrice) : undefined,
      category: data.category ?? current.category,
      badge: data.badge ? String(data.badge).trim() : undefined,
      rating: data.rating != null && data.rating !== '' ? Number(data.rating) : current.rating,
      img: newImg,
      sizes: parsedSizes !== undefined ? parsedSizes : (current.sizes || {}),
      colors: parsedColors !== undefined ? parsedColors : (current.colors || []),
    };

    await writeProducts(products);
    res.json(products[idx]);
  }
);

/* ---------- Admin + Manager: delete ---------- */
router.delete(
  '/:id',
  requireAuth,
  requireRole('admin', 'manager'),
  async (req, res) => {
    const products = await readProducts();
    const id = Number(req.params.id);
    const target = products.find(p => p.id === id);
    if (!target) return res.status(404).json({ error: 'Product not found' });

    if (target.img?.startsWith('/uploads/')) {
      fs.unlink(path.join(UPLOAD_DIR, path.basename(target.img))).catch(() => {});
    }

    await writeProducts(products.filter(p => p.id !== id));
    res.json({ success: true });
  }
);

export default router;