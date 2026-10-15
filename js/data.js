/* ============================================================
   DATA — settings + products from API, rest hardcoded
   ============================================================ */

/* ---------- SETTINGS (loaded from /api/settings) ---------- */
let SITE_SETTINGS = {
  currency: { code: 'USD', symbol: '$', position: 'before' },
  ordersEnabled: true,
  categories: [],
  sizes: [],
  colors: [],
};

async function loadSettingsFromAPI() {
  try {
    const res = await fetch('/api/settings');
    if (!res.ok) return;
    SITE_SETTINGS = await res.json();
  } catch (err) {
    console.error('Could not load settings:', err);
  }
}

/* Format a price using the configured currency */
function formatPrice(amount) {
  const n = Number(amount) || 0;
  const num = n.toFixed(2);
  const { symbol = '$', position = 'before' } = SITE_SETTINGS.currency || {};
  return position === 'after' ? `${num}${symbol}` : `${symbol}${num}`;
}

/* ---------- PRODUCTS (loaded from /api/products) ---------- */
let PRODUCTS = [];

async function loadProductsFromAPI() {
  try {
    const res = await fetch('/api/products');
    PRODUCTS = await res.json();
  } catch (err) {
    console.error('Could not load products from API:', err);
    PRODUCTS = [];
  }
}

/* ---------- REVIEWS ---------- */
const REVIEWS = [
  {
    name: 'Marcus D.',
    role: 'Verified Buyer',
    rating: 5,
    text: 'The Toxin jeans broke in like a dream. Six months of daily wear and they look better than day one.',
    avatar: 'https://i.pravatar.cc/100?img=12',
  },
  {
    name: 'Elena V.',
    role: 'Verified Buyer',
    rating: 5,
    text: 'Poison Theory is the real deal. The packaging alone felt like unboxing a lab specimen. Quality to match.',
    avatar: 'https://i.pravatar.cc/100?img=47',
  },
  {
    name: 'Kai S.',
    role: 'Verified Buyer',
    rating: 4,
    text: 'Fit is exact and the denim is heavy in the best way. Only complaint: they sell out too fast.',
    avatar: 'https://i.pravatar.cc/100?img=32',
  },
];

/* ---------- CUSTOMER NOTES ---------- */
const CUSTOMER_NOTES = [
  {
    name: 'Marcus D.',
    location: 'Berlin, DE',
    rating: 5,
    product: 'Toxin Straight-Leg',
    text: 'Six months in and these jeans have molded to my body like a second skin. The fades are unreal.',
    avatar: 'https://i.pravatar.cc/100?img=12',
  },
  {
    name: 'Elena V.',
    location: 'Lisbon, PT',
    rating: 5,
    product: 'Antidote Jacket',
    text: 'Unboxing felt like receiving a specimen. The weight of the fabric says "made with intent."',
    avatar: 'https://i.pravatar.cc/100?img=47',
  },
  {
    name: 'Kai S.',
    location: 'Tokyo, JP',
    rating: 4,
    product: 'Venom Overshirt',
    text: 'Fit is exact and stitching is flawless. Only complaint: restocks sell out too fast.',
    avatar: 'https://i.pravatar.cc/100?img=32',
  },
  {
    name: 'Priya R.',
    location: 'Mumbai, IN',
    rating: 5,
    product: 'Serum Slim Denim',
    text: 'Bought one pair to test the hype. Now I own three. Worth every rupee.',
    avatar: 'https://i.pravatar.cc/100?img=45',
  },
  {
    name: 'Theo M.',
    location: 'Brooklyn, US',
    rating: 5,
    product: 'Elixir Selvedge Jacket',
    text: 'My grandfather was a tailor. He would have respected this construction.',
    avatar: 'https://i.pravatar.cc/100?img=15',
  },
  {
    name: 'Aria L.',
    location: 'Melbourne, AU',
    rating: 4,
    product: 'Vial Chain Belt',
    text: 'The hardware is heavy in the best way. Feels like it will outlast me.',
    avatar: 'https://i.pravatar.cc/100?img=23',
  },
];

/* ---------- BEST SELLERS (computed after products load) ---------- */
function getBestSellers() {
  const ids = [2, 1, 6];
  const solds = ['2,140 sold', '1,860 sold', '1,204 sold'];
  return ids
    .map((id, i) => {
      const p = PRODUCTS.find(x => x.id === id);
      return p ? { ...p, sold: solds[i] } : null;
    })
    .filter(Boolean);
}

/* Legacy alias */
const BEST_SELLERS = [];