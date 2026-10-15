/* ============================================================
   ORDER CONFIRMED PAGE
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

  /* Load settings so formatPrice works */
  try {
    if (typeof loadSettingsFromAPI === 'function') {
      await loadSettingsFromAPI();
    }
  } catch (err) {
    console.error('Settings load failed:', err);
  }

  if (window.AOS) {
    AOS.init({ duration: 800, easing: 'ease-out-cubic', once: true });
  }

  const nav = document.getElementById('navbar');
  if (nav) {
    const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  if (typeof updateCartBadge === 'function') updateCartBadge();

  /* Get order ID */
  const params = new URLSearchParams(window.location.search);
  const orderId = params.get('id');

  if (!orderId) {
    document.getElementById('confirmedMessage').textContent =
      'We could not find that order. If you think this is a mistake, contact us.';
    return;
  }

  try {
    const res = await fetch(`/api/orders/${orderId}`);
    if (!res.ok) throw new Error('Order not found');
    const order = await res.json();

    document.getElementById('orderId').textContent = '#' + order.id;
    document.getElementById('orderStatus').textContent =
      order.status.charAt(0).toUpperCase() + order.status.slice(1);
    document.getElementById('orderTotal').textContent = formatPrice(order.subtotal);
    document.getElementById('orderDate').textContent =
      new Date(order.createdAt).toLocaleDateString(undefined, {
        year: 'numeric', month: 'long', day: 'numeric'
      });

    document.getElementById('orderBox').hidden = false;

    const itemsEl = document.getElementById('orderItems');
    if (order.items && order.items.length > 0) {
      itemsEl.innerHTML = order.items.map(it => `
        <li>
          <strong>${it.name}</strong>
          <span>${it.qty} × ${formatPrice(it.price)}</span>
        </li>
      `).join('');
    }

    document.getElementById('confirmedMessage').textContent =
      `Thanks ${order.customer.name.split(' ')[0]} — your order has been logged with the lab.`;
  } catch (err) {
    document.getElementById('confirmedMessage').textContent =
      'We could not load your order. Please contact us if this is unexpected.';
    console.error(err);
  }
});