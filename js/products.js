/* ============================================================
   Product rendering + filtering + add-to-cart with size/color
   ============================================================ */

function starIcons(rating) {
  let html = '';
  for (let i = 1; i <= 5; i++) {
    html += `<svg viewBox="0 0 20 20" fill="currentColor" class="${i <= Math.round(rating) ? '' : 'dim'}">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.958a1 1 0 00.95.69h4.16c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.922-.755 1.688-1.54 1.118l-3.37-2.447a1 1 0 00-1.175 0l-3.37 2.447c-.784.57-1.838-.196-1.539-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.06 9.385c-.783-.57-.38-1.81.588-1.81h4.16a1 1 0 00.95-.69l1.286-3.958z"/>
    </svg>`;
  }
  return html;
}

function getAvailableSizes(p) {
  const sizes = p.sizes || {};
  return Object.entries(sizes)
    .filter(([, qty]) => Number(qty) > 0)
    .map(([sz]) => sz);
}

function getColors(p) {
  const allColors = (window.SITE_SETTINGS?.colors) || [];
  const ids = p.colors || [];
  return allColors.filter(c => ids.includes(c.id));
}

function productCardHTML(p, index) {
  const discount = p.oldPrice
    ? `<span class="badge discount">-${Math.round((1 - p.price / p.oldPrice) * 100)}%</span>`
    : '';
  const badge = p.badge ? `<span class="badge">${p.badge}</span>` : '';
  const oldPrice = p.oldPrice ? `<span class="was">${formatPrice(p.oldPrice)}</span>` : '';

  const availSizes = getAvailableSizes(p);
  const availColors = getColors(p);

  /* Build size chips — only show the picker if sizes exist */
  const sizePicker = availSizes.length > 0
    ? `<div class="card-picker" data-picker-for="${p.id}">
        <div class="card-picker-row">
          <span class="card-picker-label">Size</span>
          <div class="card-chips" data-size-chips="${p.id}">
            ${availSizes.map(sz => `<button class="card-chip" data-size="${sz}">${sz}</button>`).join('')}
          </div>
        </div>
        ${availColors.length > 0 ? `
          <div class="card-picker-row">
            <span class="card-picker-label">Color</span>
            <div class="card-chips" data-color-chips="${p.id}">
              ${availColors.map(c => `
                <button class="card-chip color-chip-btn" data-color="${c.id}" title="${c.label}">
                  <i style="background:${c.hex}"></i>
                </button>
              `).join('')}
            </div>
          </div>
        ` : ''}
        <button class="card-confirm" data-confirm="${p.id}">Confirm Add</button>
      </div>`
    : '';

  return `
    <article class="product-card" data-aos="fade-up" data-aos-delay="${index * 70}" data-product-id="${p.id}">
      <div class="product-media">
        <img src="${p.img}" alt="${p.name}" loading="lazy" />
        ${badge}
        ${discount}
        <div class="product-actions">
          <button class="add-btn" data-add="${p.id}">
            ${availSizes.length > 0 ? 'Choose Options' : 'Add to Cart'}
          </button>
          <button class="wish-btn" aria-label="Wishlist">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"/>
            </svg>
          </button>
        </div>
        ${sizePicker}
      </div>
      <div class="product-body">
        <div class="product-rating">
          ${starIcons(p.rating)}
          <span>${p.rating}</span>
        </div>
        <h3 class="product-title">${p.name}</h3>
        <div class="product-price">
          <span class="now">${formatPrice(p.price)}</span>
          ${oldPrice}
        </div>
      </div>
    </article>
  `;
}

function renderProducts(filter = 'all') {
  const productGrid = document.getElementById('productGrid');
  if (!productGrid) return;

  const list = filter === 'all'
    ? PRODUCTS
    : PRODUCTS.filter(p => p.category === filter);

  productGrid.innerHTML = list.map(productCardHTML).join('');
  if (window.AOS) AOS.refresh();

  /* Bind Add to Cart buttons */
  productGrid.querySelectorAll('[data-add]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const card = btn.closest('.product-card');
      const product = PRODUCTS.find(p => p.id === Number(btn.dataset.add));
      if (!product) return;

      const hasSizes = getAvailableSizes(product).length > 0;
      if (!hasSizes) {
        /* No sizes — add directly */
        addToCart(product.id, null, null);
        return;
      }
      /* Show the picker overlay */
      card.classList.toggle('picker-open');
      /* Reset selection on open */
      if (card.classList.contains('picker-open')) {
        card.querySelectorAll('.card-chip.active').forEach(c => c.classList.remove('active'));
      }
    });
  });

  /* Size chip toggle */
  productGrid.querySelectorAll('[data-size-chips]').forEach(wrap => {
    wrap.querySelectorAll('.card-chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        wrap.querySelectorAll('.card-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
      });
    });
  });

  /* Color chip toggle */
  productGrid.querySelectorAll('[data-color-chips]').forEach(wrap => {
    wrap.querySelectorAll('.card-chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        wrap.querySelectorAll('.card-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
      });
    });
  });

  /* Confirm button */
  productGrid.querySelectorAll('[data-confirm]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = Number(btn.dataset.confirm);
      const card = btn.closest('.product-card');
      const product = PRODUCTS.find(p => p.id === id);
      if (!product) return;

      const sizeEl = card.querySelector(`[data-size-chips="${id}"] .card-chip.active`);
      const colorEl = card.querySelector(`[data-color-chips="${id}"] .card-chip.active`);

      const hasSizes = getAvailableSizes(product).length > 0;
      if (hasSizes && !sizeEl) {
        /* Shake the picker to indicate required */
        const picker = card.querySelector('.card-picker');
        if (picker) {
          picker.classList.add('shake');
          setTimeout(() => picker.classList.remove('shake'), 500);
        }
        return;
      }

      const size = sizeEl?.dataset.size || null;
      const color = colorEl?.dataset.color || null;

      addToCart(id, size, color);
      card.classList.remove('picker-open');
    });
  });

  /* Close picker when clicking outside */
  document.addEventListener('click', (e) => {
    productGrid.querySelectorAll('.product-card.picker-open').forEach(card => {
      if (!card.contains(e.target)) card.classList.remove('picker-open');
    });
  }, { passive: true });
}

function initFilters() {
  const buttons = document.querySelectorAll('.filter-btn');
  if (buttons.length === 0) return;

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderProducts(btn.dataset.filter);
    });
  });
}