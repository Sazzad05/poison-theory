/* ============================================================
   CHECKOUT PAGE
   ============================================================ */

document.addEventListener('DOMContentLoaded', async () => {
  /* Hide loader */
  const bar = document.getElementById('loaderBar');
  const loader = document.getElementById('loader');
  if (bar) bar.style.width = '100%';
  setTimeout(() => {
    if (loader) {
      loader.classList.add('hidden');
      setTimeout(() => loader.remove(), 700);
    }
  }, 400);

  /* Load settings + products */
  try {
    if (typeof loadSettingsFromAPI === 'function') await loadSettingsFromAPI();
    if (typeof loadProductsFromAPI === 'function') await loadProductsFromAPI();
  } catch (err) {
    console.error('Initial load failed:', err);
  }

  if (window.AOS) {
    AOS.init({ duration: 800, easing: 'ease-out-cubic', once: true, offset: 60 });
  }

  /* Navbar scroll */
  const nav = document.getElementById('navbar');
  if (nav) {
    const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* Mobile menu */
  const toggle = document.querySelector('.menu-toggle');
  const links = document.querySelector('.nav-links');
  if (toggle && links) {
    const setOpen = (open) => {
      links.classList.toggle('open', open);
      toggle.classList.toggle('open', open);
      document.body.style.overflow = open ? 'hidden' : '';
    };
    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      setOpen(!links.classList.contains('open'));
    });
    links.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        if (window.innerWidth < 900) setOpen(false);
      });
    });
    document.addEventListener('click', (e) => {
      if (window.innerWidth < 900 &&
          links.classList.contains('open') &&
          !links.contains(e.target) &&
          !toggle.contains(e.target)) setOpen(false);
    });
  }

  /* Cart drawer */
  const drawer = document.getElementById('cartDrawer');
  const overlay = document.getElementById('cartOverlay');
  const openBtn = document.querySelector('.cart-btn');
  const closeBtn = document.getElementById('cartClose');
  if (drawer && overlay) {
    const open = () => {
      drawer.classList.add('open');
      overlay.classList.add('open');
      document.body.classList.add('cart-open');
    };
    const close = () => {
      drawer.classList.remove('open');
      overlay.classList.remove('open');
      document.body.classList.remove('cart-open');
    };
    openBtn?.addEventListener('click', open);
    closeBtn?.addEventListener('click', close);
    overlay.addEventListener('click', close);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  }

  /* If orders are paused, block the form */
  const form = document.getElementById('checkoutForm');
  const errorEl = document.getElementById('checkoutError');
  const submitBtn = document.getElementById('checkoutSubmit');

  if (SITE_SETTINGS && SITE_SETTINGS.ordersEnabled === false) {
    if (errorEl) {
      errorEl.textContent = 'Orders are temporarily paused. Please check back soon.';
      errorEl.style.fontSize = '.95rem';
    }
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Orders Paused';
    }
    /* Disable all form inputs so the user can't submit */
    form?.querySelectorAll('input, textarea, button').forEach(el => el.disabled = true);
  }

  /* ---------- Summary ---------- */
  const cart = JSON.parse(localStorage.getItem('pt_cart') || '[]');

  function cartLineKey(item) {
    return `${item.id}|${item.size || ''}|${item.color || ''}`;
  }
  function colorLabel(colorId) {
    if (!colorId) return '';
    const c = (window.SITE_SETTINGS?.colors || []).find(x => x.id === colorId);
    return c ? c.label : colorId;
  }
  function colorHex(colorId) {
    if (!colorId) return '#666';
    const c = (window.SITE_SETTINGS?.colors || []).find(x => x.id === colorId);
    return c ? c.hex : '#666';
  }

  function renderSummary() {
    const itemsEl = document.getElementById('summaryItems');
    const subtotalEl = document.getElementById('summarySubtotal');
    const totalEl = document.getElementById('summaryTotal');
    if (!itemsEl) return;

    if (cart.length === 0) {
      itemsEl.innerHTML = `<div class="summary-empty">Your cart is empty.</div>`;
      subtotalEl.textContent = formatPrice(0);
      totalEl.textContent = formatPrice(0);
      if (submitBtn) submitBtn.disabled = true;
      return;
    }

    let subtotal = 0;
    itemsEl.innerHTML = cart.map(item => {
      const p = PRODUCTS.find(x => x.id === item.id);
      if (!p) return '';
      const line = p.price * item.qty;
      subtotal += line;

      const variant = [];
      if (item.size) variant.push(`Size: ${item.size}`);
      if (item.color) variant.push(colorLabel(item.color));

      return `
        <div class="summary-item">
          <img src="${p.img}" alt="${p.name}" />
          <div class="summary-item-info">
            <div class="summary-item-title">${p.name}</div>
            <div class="summary-item-qty">
              Qty: ${item.qty}${variant.length ? ' · ' + variant.join(' · ') : ''}
            </div>
          </div>
          <div class="summary-item-price">${formatPrice(line)}</div>
        </div>
      `;
    }).join('');

    subtotalEl.textContent = formatPrice(subtotal);
    totalEl.textContent = formatPrice(subtotal);
  }

  renderSummary();
  if (typeof updateCartBadge === 'function') updateCartBadge();

  /* ---------- Submit ---------- */
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (SITE_SETTINGS?.ordersEnabled === false) return;
    errorEl.textContent = '';

    if (cart.length === 0) {
      errorEl.textContent = 'Your cart is empty.';
      return;
    }

    const customer = {
      name: document.getElementById('cName').value.trim(),
      phone: document.getElementById('cPhone').value.trim(),
      email: document.getElementById('cEmail').value.trim(),
      address: document.getElementById('cAddress').value.trim(),
      city: document.getElementById('cCity').value.trim(),
      postal: document.getElementById('cPostal').value.trim(),
      notes: document.getElementById('cNotes').value.trim(),
    };

    if (!customer.name || !customer.phone || !customer.email || !customer.address) {
      errorEl.textContent = 'Please fill in all required fields.';
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Placing order…';

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer,
          items: cart.map(i => ({
            id: i.id,
            qty: i.qty,
            size: i.size || null,
            color: i.color || null,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to place order');

      localStorage.removeItem('pt_cart');
      window.location.href = `order-confirmed.html?id=${data.id}`;
    } catch (err) {
      errorEl.textContent = err.message;
      submitBtn.disabled = false;
      submitBtn.textContent = 'Place Order →';
    }
  });
});