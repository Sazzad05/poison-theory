import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import orderRoutes from './routes/orders.js';
import settingsRoutes from './routes/settings.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: '2mb' }));

/* ---------- Never cache API responses ---------- */
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

/* ---------- API ---------- */
app.use('/api/auth',     authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders',   orderRoutes);
app.use('/api/settings', settingsRoutes);
app.get('/api/health', (_req, res) => res.json({ ok: true }));

/* ---------- Serve uploaded images ---------- */
app.use('/uploads', express.static(path.join(ROOT, 'uploads')));

/* ---------- Serve the storefront + admin (no caching) ---------- */
app.use(express.static(ROOT, {
  etag: false,
  lastModified: false,
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  },
}));

app.listen(PORT, () => {
  console.log(`\n🧪  Poison Theory server running`);
  console.log(`    Storefront:  http://localhost:${PORT}/index.html`);
  console.log(`    Admin login: http://localhost:${PORT}/admin.html\n`);
});