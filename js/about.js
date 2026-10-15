/* ============================================================
   ABOUT PAGE — self-contained
   ============================================================ */

/* ---------- Loader ---------- */
function hideAboutLoader() {
  const bar = document.getElementById('loaderBar');
  const loader = document.getElementById('loader');
  if (bar) bar.style.width = '100%';
  setTimeout(() => {
    if (loader) {
      loader.classList.add('hidden');
      setTimeout(() => loader.remove(), 700);
    }
  }, 400);
}

/* ---------- Navbar scroll ---------- */
function initAboutNavbar() {
  const nav = document.getElementById('navbar');
  if (!nav) return;
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 20);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/* ---------- Mobile menu ---------- */
function initAboutMobileMenu() {
  const toggle = document.querySelector('.menu-toggle');
  const links = document.querySelector('.nav-links');
  if (!toggle || !links) return;

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
    if (
      window.innerWidth < 900 &&
      links.classList.contains('open') &&
      !links.contains(e.target) &&
      !toggle.contains(e.target)
    ) setOpen(false);
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth >= 900) setOpen(false);
  });
}

/* ---------- Counters ---------- */
function initAboutCounters() {
  const counters = document.querySelectorAll('.counter');
  if (counters.length === 0) return;

  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = Number(el.dataset.target);
      const suffix = el.dataset.suffix || '';
      const duration = 1400;
      const start = performance.now();

      const tick = now => {
        const t = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        el.textContent = Math.floor(target * eased).toLocaleString() + suffix;
        if (t < 1) requestAnimationFrame(tick);
        else el.textContent = target.toLocaleString() + suffix;
      };
      requestAnimationFrame(tick);
      io.unobserve(el);
    });
  }, { threshold: 0.5 });

  counters.forEach(c => io.observe(c));
}

/* ---------- Stars ---------- */
function notesStars(rating) {
  let html = '';
  for (let i = 1; i <= 5; i++) {
    html += `<svg viewBox="0 0 20 20" fill="currentColor" class="${i <= rating ? '' : 'dim'}">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.958a1 1 0 00.95.69h4.16c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.922-.755 1.688-1.54 1.118l-3.37-2.447a1 1 0 00-1.175 0l-3.37 2.447c-.784.57-1.838-.196-1.539-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.06 9.385c-.783-.57-.38-1.81.588-1.81h4.16a1 1 0 00.95-.69l1.286-3.958z"/>
    </svg>`;
  }
  return html;
}

/* ---------- Customer Notes ---------- */
function renderCustomerNotes() {
  const grid = document.getElementById('notesGrid');
  if (!grid || typeof CUSTOMER_NOTES === 'undefined') return;

  grid.innerHTML = CUSTOMER_NOTES.map((n, i) => `
    <article class="note-card" data-aos="fade-up" data-aos-delay="${(i % 3) * 100}">
      <div class="note-head">
        <img src="${n.avatar}" alt="${n.name}" loading="lazy" />
        <div>
          <strong>${n.name}</strong>
          <small>${n.location}</small>
        </div>
      </div>
      <div class="note-stars">${notesStars(n.rating)}</div>
      <p class="note-text">${n.text}</p>
      <div class="note-meta">
        <span>${n.product}</span>
        <span>Verified</span>
      </div>
    </article>
  `).join('');

  if (window.AOS) AOS.refresh();
}

/* ---------- Best Sellers ---------- */
function renderBestSellers() {
  const grid = document.getElementById('bestSellerGrid');
  if (!grid) return;

  const getBS = typeof getBestSellers === 'function' ? getBestSellers : () => [];
  const items = getBS();
  if (items.length === 0) return;

  const medals = ['#1', '#2', '#3'];

  grid.innerHTML = items.map((p, i) => `
    <article class="product-card" data-aos="fade-up" data-aos-delay="${i * 100}">
      <div class="product-media">
        <img src="${p.img}" alt="${p.name}" loading="lazy" />
        <span class="badge">${medals[i]} Best Seller</span>
        <span class="badge discount">${p.sold}</span>
      </div>
      <div class="product-body">
        <div class="product-rating">
          ${notesStars(p.rating)}
          <span>${p.rating}</span>
        </div>
        <h3 class="product-title">${p.name}</h3>
        <div class="product-price">
          <span class="now">${formatPrice(p.price)}</span>
          ${p.oldPrice ? `<span class="was">${formatPrice(p.oldPrice)}</span>` : ''}
        </div>
      </div>
    </article>
  `).join('');

  if (window.AOS) AOS.refresh();
}

/* ---------- Cart drawer ---------- */
function initAboutCart() {
  const drawer = document.getElementById('cartDrawer');
  const overlay = document.getElementById('cartOverlay');
  const openBtn = document.querySelector('.cart-btn');
  const closeBtn = document.getElementById('cartClose');
  if (!drawer || !overlay) return;

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
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') close();
  });
}

/* ============================================================
   BOOTSTRAP
   ============================================================ */
document.addEventListener('DOMContentLoaded', async () => {
  hideAboutLoader();

  try {
    if (typeof loadSettingsFromAPI === 'function') {
      await loadSettingsFromAPI();
    }
    if (typeof loadProductsFromAPI === 'function') {
      await loadProductsFromAPI();
    }
  } catch (err) {
    console.error('Products load failed:', err);
  }

  if (window.AOS) {
    AOS.init({
      duration: 800,
      easing: 'ease-out-cubic',
      once: true,
      offset: 60,
    });
  }

  initAboutNavbar();
  initAboutMobileMenu();
  initAboutCounters();
  initAboutCart();

  renderCustomerNotes();
  renderBestSellers();

  if (typeof updateCartBadge === 'function') updateCartBadge();
});