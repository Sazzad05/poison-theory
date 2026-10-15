document.addEventListener('DOMContentLoaded', async () => {
  /* Load settings + products before rendering */
  try {
    if (typeof loadSettingsFromAPI === 'function') await loadSettingsFromAPI();
    if (typeof loadProductsFromAPI === 'function') await loadProductsFromAPI();
  } catch (err) {
    console.error('Initial load failed:', err);
  }

  /* Safety: force-hide loader if anything hangs */
  const forceHideLoader = () => {
    const loader = document.getElementById('loader');
    if (loader) {
      loader.classList.add('hidden');
      setTimeout(() => loader.remove(), 700);
    }
  };
  setTimeout(forceHideLoader, 3000);

  if (window.AOS) {
    AOS.init({
      duration: 800,
      easing: 'ease-out-cubic',
      once: true,
      offset: 60,
    });
  }

  if (typeof initLoader === 'function') initLoader();
  if (typeof initNavbar === 'function') initNavbar();
  if (typeof initCounters === 'function') initCounters();
  if (typeof initMobileMenu === 'function') initMobileMenu();

  if (typeof renderProducts === 'function') renderProducts();
  if (typeof initFilters === 'function') initFilters();

  if (typeof updateCartBadge === 'function') updateCartBadge();

  const form = document.getElementById('subscribeForm');
  const feedback = document.getElementById('ctaFeedback');
  form?.addEventListener('submit', e => {
    e.preventDefault();
    feedback.textContent = 'You\'re in. Watch your inbox for the next drop.';
    form.reset();
  });
});