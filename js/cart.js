/* ============================================================
   Poison Theory — Cart
   Items keyed by id + size + color
   ============================================================ */

const CART_KEY = 'pt_cart';
let cart = loadCart();

/* ---------- Persistence ---------- */
function loadCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) || '[]');
  } catch {
    return [];
  }
}
function saveCart() {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

/* ---------- Helpers ---------- */
function findProduct(id) {
  return PRODUCTS.find(p => p.id === id);
}

function cartLineKey(item) {
  return `${item.id}|${item.size || ''}|${item.color || ''}`;
}

function cartTotalQty() {
  return cart.reduce((sum, item) => sum + item.qty, 0);
}

function cartSubtotal() {
  return cart.reduce((sum, item) => {
    const p = findProduct(item.id);
    return p ? sum + p.price * item.qty : sum;
  }, 0);
}

/* Max qty allowed for a specific variant based on stock */
function maxQtyFor(item) {
  const p = findProduct(item.id);
  if (!p) return 99;
  if (!item.size) return 99;
  const sizes = p.sizes || {};
  return Number(sizes[item.size]) || 0;
}

/* ---------- Badge ---------- */
function updateCartBadge() {
  const badge = document.getElementById('cartCount');
  if (!badge) return;
  badge.textContent = cartTotalQty();
  badge.classList.remove('pop');
  void badge.offsetWidth;
  badge.classList.add('pop');
}

/* ---------- Public: add ---------- */
function addToCart(productId, size = null, color = null) {
  const p = findProduct(productId);
  if (!p) return;

  /* Stock check */
  if (size) {
    const stock = Number((p.sizes || {})[size]) || 0;
    if (stock <= 0) {
      showToast(`Size ${size} is out of stock`);
      return;
    }
  }

  const key = `${productId}|${size || ''}|${color || ''}`;
  const existing = cart.find(i => cartLineKey(i) === key);

  if (existing) {
    if (size) {
      const max = maxQtyFor(existing);
      if (existing.qty + 1 > max) {
        showToast(`Only ${max} left in size ${size}`);
        return;
      }
    }
    existing.qty += 1;
  } else {
    cart.push({ id: productId, qty: 1, size: size || null, color: color || null });
  }

  saveCart();
  updateCartBadge();
  renderCart();
  openCart();
}

/* ---------- Public: remove ---------- */
function removeFromCart(itemKey) {
  cart = cart.filter(i => cartLineKey(i) !== itemKey);
  saveCart();
  updateCartBadge();
  renderCart();
}

/* ---------- Public: change qty ---------- */
function changeQty(itemKey, delta) {
  const item = cart.find(i => cartLineKey(i) === itemKey);
  if (!item) return;

  if (delta > 0 && item.size) {
    const max = maxQtyFor(item);
    if (item.qty + 1 > max) {
      showToast(`Only ${max} left in size ${item.size}`);
      return;
    }
  }

  item.qty += delta;
  if (item.qty <= 0) return removeFromCart(itemKey);
  saveCart();
  updateCartBadge();
  renderCart();
}

/* ---------- Color lookup ---------- */
function colorLabel(colorId) {
  if (!colorId) return '';
  const c = (window.SITE_SETTINGS?.colors || []).find(x => x.id === colorId);
  return c ? c.label : colorId;
}
function colorHex(colorId) {
  if (!colorId) return '';
  const c = (window.SITE_SETTINGS?.colors || []).find(x => x.id === colorId);
  return c ? c.hex : '#666';
}

/* ---------- Render cart ---------- */
function renderCart() {
  const body = document.getElementById('cartBody');
  const subtotalEl = document.getElementById('cartSubtotal');
  const checkoutBtn = document.getElementById('cartCheckout');
  if (!body) return;

  /* Empty */
  if (cart.length === 0) {
    body.innerHTML = `
      <div class="cart-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4">
          <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"/>
        </svg>
        <p>Your cart is empty</p>
        <a href="#products" class="btn btn-ghost" onclick="closeCart()">Browse the Vault</a>
      </div>`;
    if (subtotalEl) subtotalEl.textContent = formatPrice(0);
    if (checkoutBtn) {
      checkoutBtn.disabled = true;
      checkoutBtn.textContent = 'Checkout → (empty)';
    }
    return;
  }

  /* Line items */
  body.innerHTML = cart.map(item => {
    const p = findProduct(item.id);
    if (!p) return '';
    const key = cartLineKey(item);
    const variant = [];
    if (item.size) variant.push(`<span class="cart-variant-pill">Size: ${item.size}</span>`);
    if (item.color) variant.push(`<span class="cart-variant-pill">
      <i class="color-mini" style="background:${colorHex(item.color)}"></i>${colorLabel(item.color)}
    </span>`);

    return `
      <div class="cart-item">
        <img src="${p.img}" alt="${p.name}" class="cart-item-img" />
        <div class="cart-item-info">
          <div>
            <h4 class="cart-item-title">${p.name}</h4>
            ${variant.length ? `<div class="cart-item-variants">${variant.join('')}</div>` : ''}
            <div class="cart-item-price">${formatPrice(p.price * item.qty)}</div>
          </div>
          <div class="cart-item-qty">
            <button class="qty-btn" data-action="dec" data-key="${key}" aria-label="Decrease">−</button>
            <span class="qty-val">${item.qty}</span>
            <button class="qty-btn" data-action="inc" data-key="${key}" aria-label="Increase">+</button>
          </div>
        </div>
        <button class="cart-item-remove" data-action="remove" data-key="${key}" aria-label="Remove">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>`;
  }).join('');

  if (subtotalEl) subtotalEl.textContent = formatPrice(cartSubtotal());
  if (checkoutBtn) {
    checkoutBtn.disabled = false;
    checkoutBtn.textContent = 'Checkout →';
  }

  body.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.key;
      const action = btn.dataset.action;
      if (action === 'inc') changeQty(key, 1);
      if (action === 'dec') changeQty(key, -1);
      if (action === 'remove') removeFromCart(key);
    });
  });
}

/* ---------- Toast (small feedback bubble) ---------- */
function showToast(msg) {
  let toast = document.getElementById('pt-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'pt-toast';
    toast.className = 'pt-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toast.classList.remove('show'), 2200);
}

/* ---------- Drawer ---------- */
function openCart() {
  const drawer = document.getElementById('cartDrawer');
  const overlay = document.getElementById('cartOverlay');
  if (!drawer || !overlay) return;
  drawer.classList.add('open');
  overlay.classList.add('open');
  document.body.classList.add('cart-open');
}
function closeCart() {
  const drawer = document.getElementById('cartDrawer');
  const overlay = document.getElementById('cartOverlay');
  if (!drawer || !overlay) return;
  drawer.classList.remove('open');
  overlay.classList.remove('open');
  document.body.classList.remove('cart-open');
}

/* ---------- Init ---------- */
function initCart() {
  updateCartBadge();
  renderCart();

  document.querySelector('.cart-btn')?.addEventListener('click', openCart);
  document.getElementById('cartClose')?.addEventListener('click', closeCart);
  document.getElementById('cartOverlay')?.addEventListener('click', closeCart);

  const checkoutBtn = document.getElementById('cartCheckout');
  checkoutBtn?.addEventListener('click', () => {
    if (cart.length === 0) return;
    if (SITE_SETTINGS && SITE_SETTINGS.ordersEnabled === false) {
      showToast('Orders are temporarily paused.');
      return;
    }
    window.location.href = 'checkout.html';
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeCart();
  });
}

document.addEventListener('DOMContentLoaded', initCart);

window.addToCart = addToCart;
window.openCart = openCart;
window.closeCart = closeCart;