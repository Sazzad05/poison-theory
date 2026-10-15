/* ============================================================
   Loader, navbar scroll, counters, mobile menu
   ============================================================ */

function initLoader() {
  const loader = document.getElementById('loader');
  const bar = document.getElementById('loaderBar');

  window.addEventListener('load', () => {
    if (bar) bar.style.width = '100%';
    setTimeout(() => {
      if (loader) {
        loader.classList.add('hidden');
        setTimeout(() => loader.remove(), 700);
      }
    }, 500);
  });
}

function initNavbar() {
  const nav = document.getElementById('navbar');
  if (!nav) return;
  const onScroll = () => {
    nav.classList.toggle('scrolled', window.scrollY > 20);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

function initCounters() {
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

/* ---------- Mobile menu (fixed for phones) ---------- */
function initMobileMenu() {
  const toggle = document.querySelector('.menu-toggle');
  const links = document.querySelector('.nav-links');
  if (!toggle || !links) return;

  const setOpen = (open) => {
    links.classList.toggle('open', open);
    toggle.classList.toggle('open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  };

  /* Toggle on tap / click */
  toggle.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(!links.classList.contains('open'));
  });

  /* Close when a nav link is tapped */
  links.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      if (window.innerWidth < 900) setOpen(false);
    });
  });

  /* Close when tapping outside — capture phase */
  document.addEventListener('click', (e) => {
    if (
      window.innerWidth < 900 &&
      links.classList.contains('open') &&
      !links.contains(e.target) &&
      !toggle.contains(e.target)
    ) {
      setOpen(false);
    }
  }, true);

  /* Reset on resize to desktop */
  window.addEventListener('resize', () => {
    if (window.innerWidth >= 900) setOpen(false);
  });
}