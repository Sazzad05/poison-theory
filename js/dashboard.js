/* ============================================================
   DASHBOARD — Products & Stock merged
   Tabs: Products | Orders | Sales | Users | Settings
   ============================================================ */

const API = '/api';
const TOKEN_KEY = 'pt_admin_token';
const USER_KEY  = 'pt_admin_user';

const token = localStorage.getItem(TOKEN_KEY);
const user  = JSON.parse(localStorage.getItem(USER_KEY) || 'null');

if (!token || !user) window.location.href = 'admin.html';

/* ---------- Fetch helper ---------- */
async function api(path, options = {}) {
  const headers = options.headers || {};
  headers.Authorization = `Bearer ${token}`;
  if (!(options.body instanceof FormData) && options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(`${API}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

/* ---------- Header ---------- */
document.getElementById('userName').textContent = user.name || user.username;
document.getElementById('userRole').textContent = user.role;
document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  window.location.href = 'admin.html';
});

/* ---------- Role gating ---------- */
function applyRoleVisibility() {
  document.querySelectorAll('[data-role]').forEach(el => {
    const roles = el.dataset.role.split(',').map(s => s.trim());
    if (!roles.includes(user.role)) el.remove();
  });
}
applyRoleVisibility();

/* ---------- Settings cache (for product form + color lookup) ---------- */
let settingsCache = null;

async function ensureSettings() {
  if (settingsCache) return settingsCache;
  try {
    settingsCache = await api('/settings');
  } catch {
    settingsCache = { categories: [], sizes: [], colors: [] };
  }
  return settingsCache;
}

function colorLabelById(id) {
  if (!id) return '';
  const c = (settingsCache?.colors || []).find(x => x.id === id);
  return c ? c.label : id;
}
function colorHexById(id) {
  if (!id) return '';
  const c = (settingsCache?.colors || []).find(x => x.id === id);
  return c ? c.hex : '#666';
}

/* ---------- Tabs ---------- */
document.querySelectorAll('.admin-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');

    if (tab.dataset.tab === 'orders')   loadOrders();
    if (tab.dataset.tab === 'sales')    loadSales();
    if (tab.dataset.tab === 'users')    loadUsers();
    if (tab.dataset.tab === 'settings') loadSettings();
  });
});

/* ============================================================
   PRODUCTS & STOCK
   ============================================================ */
const productRows = document.getElementById('productRows');
let productCache = [];

async function loadProducts() {
  productRows.innerHTML = `<tr><td colspan="8" class="admin-empty-row">Loading…</td></tr>`;
  try {
    const settings = await ensureSettings();
    productCache = await api('/products');

    const filter = document.getElementById('productFilter')?.value || 'all';

    let list = productCache.map(p => {
      const sizes = p.sizes || {};
      const total = Object.values(sizes).reduce((s, v) => s + (Number(v) || 0), 0);
      return { ...p, _total: total };
    });

    if (filter === 'low') list = list.filter(p => p._total > 0 && p._total <= 5);
    if (filter === 'out') list = list.filter(p => p._total === 0);

    if (list.length === 0) {
      productRows.innerHTML = `<tr><td colspan="8" class="admin-empty-row">No products match.</td></tr>`;
      return;
    }

    const colorMap = {};
    (settings.colors || []).forEach(c => colorMap[c.id] = c);

    productRows.innerHTML = list.map(p => {
      const sizes = p.sizes || {};
      const total = Object.values(sizes).reduce((s, v) => s + (Number(v) || 0), 0);

      const stockCells = Object.entries(sizes)
        .filter(([, q]) => q > 0)
        .map(([sz, q]) => {
          const cls = q <= 3 ? 'stock-pill low' : 'stock-pill';
          return `<span class="${cls}">${sz}: ${q}</span>`;
        })
        .join('') || `<span class="stock-pill out">Out of stock</span>`;

      const colorDots = (p.colors || []).map(cid => {
        const c = colorMap[cid];
        if (!c) return '';
        return `<i class="color-mini" style="background:${c.hex}" title="${c.label}"></i>`;
      }).join('') || `<span class="muted-text">—</span>`;

      return `
        <tr>
          <td><img src="${p.img}" alt="" /></td>
          <td class="cell-name">${p.name}</td>
          <td>${p.category}</td>
          <td class="cell-price">$${p.price}</td>
          <td>${colorDots}</td>
          <td class="stock-cells">${stockCells}</td>
          <td style="text-align:right"><strong class="stock-total">${total}</strong></td>
          <td>
            <div class="admin-row-actions">
              <button class="admin-icon-btn" data-action="edit" data-id="${p.id}" title="Edit">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897l12.682-12.68z"/>
                </svg>
              </button>
              <button class="admin-icon-btn danger" data-action="delete" data-id="${p.id}" title="Delete">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/>
                </svg>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    productRows.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = Number(btn.dataset.id);
        if (btn.dataset.action === 'edit') openProductModal(id);
        if (btn.dataset.action === 'delete') deleteProduct(id);
      });
    });
  } catch (err) {
    productRows.innerHTML = `<tr><td colspan="8" class="admin-empty-row">Error: ${err.message}</td></tr>`;
  }
}

document.getElementById('productFilter')?.addEventListener('change', loadProducts);

/* ---------- Product Modal ---------- */
const modalOverlay = document.getElementById('modalOverlay');
const modalTitle   = document.getElementById('modalTitle');
const productForm  = document.getElementById('productForm');
const formError    = document.getElementById('formError');
const previewImg   = document.getElementById('previewImg');
const imgHint      = document.getElementById('imgHint');
const sizePicker   = document.getElementById('sizePicker');
const colorPicker  = document.getElementById('colorPicker');

async function openProductModal(id = null) {
  productForm.reset();
  formError.textContent = '';
  previewImg.hidden = true;
  previewImg.src = '';
  imgHint.textContent = '';

  const settings = await ensureSettings();

  const catSelect = document.getElementById('fieldCategory');
  catSelect.innerHTML = `<option value="">Select…</option>` +
    (settings.categories || []).map(c => `<option value="${c.id}">${c.label}</option>`).join('');

  renderSizePicker(settings.sizes || [], {});
  renderColorPicker(settings.colors || [], []);

  if (id) {
    const p = productCache.find(x => x.id === id);
    if (!p) return;
    modalTitle.textContent = 'Edit Product';
    document.getElementById('fieldId').value = p.id;
    document.getElementById('fieldName').value = p.name;
    document.getElementById('fieldPrice').value = p.price;
    document.getElementById('fieldOldPrice').value = p.oldPrice ?? '';
    document.getElementById('fieldCategory').value = p.category;
    document.getElementById('fieldBadge').value = p.badge ?? '';
    document.getElementById('fieldRating').value = p.rating ?? '';
    imgHint.textContent = '(leave empty to keep current)';
    if (p.img) { previewImg.src = p.img; previewImg.hidden = false; }

    renderSizePicker(settings.sizes || [], p.sizes || {});
    renderColorPicker(settings.colors || [], p.colors || []);
  } else {
    modalTitle.textContent = 'Add Product';
    document.getElementById('fieldId').value = '';
    document.getElementById('fieldImg').required = true;
  }

  modalOverlay.hidden = false;
}

function renderSizePicker(sizes, stockBySize) {
  if (!sizes || sizes.length === 0) {
    sizePicker.innerHTML = `<p class="muted-text">No sizes defined. Add sizes in Settings.</p>`;
    return;
  }
  sizePicker.innerHTML = sizes.map(sz => {
    const qty = Number(stockBySize[sz]) || 0;
    return `
      <div class="size-pick-row">
        <label class="size-pick-check">
          <input type="checkbox" data-size-check="${sz}" ${qty > 0 ? 'checked' : ''} />
          <span>${sz}</span>
        </label>
        <input type="number" class="size-pick-qty" data-size-qty="${sz}"
               value="${qty}" min="0" placeholder="0" />
      </div>
    `;
  }).join('');

  sizePicker.querySelectorAll('[data-size-qty]').forEach(input => {
    input.addEventListener('input', () => {
      const sz = input.dataset.sizeQty;
      const check = sizePicker.querySelector(`[data-size-check="${sz}"]`);
      if (check) check.checked = Number(input.value) > 0;
    });
  });

  sizePicker.querySelectorAll('[data-size-check]').forEach(check => {
    check.addEventListener('change', () => {
      const sz = check.dataset.sizeCheck;
      const qty = sizePicker.querySelector(`[data-size-qty="${sz}"]`);
      if (!qty) return;
      qty.value = check.checked ? (Number(qty.value) || 1) : 0;
    });
  });
}

function renderColorPicker(colors, selectedIds) {
  if (!colors || colors.length === 0) {
    colorPicker.innerHTML = `<p class="muted-text">No colors defined. Add colors in Settings.</p>`;
    return;
  }
  colorPicker.innerHTML = colors.map(c => `
    <label class="color-pick-item ${selectedIds.includes(c.id) ? 'active' : ''}">
      <input type="checkbox" data-color-check="${c.id}" ${selectedIds.includes(c.id) ? 'checked' : ''} />
      <i class="color-swatch-lg" style="background:${c.hex}"></i>
      <span>${c.label}</span>
    </label>
  `).join('');

  colorPicker.querySelectorAll('[data-color-check]').forEach(check => {
    check.addEventListener('change', () => {
      check.closest('.color-pick-item').classList.toggle('active', check.checked);
    });
  });
}

function readSizePicker() {
  const sizes = {};
  sizePicker.querySelectorAll('[data-size-check]').forEach(check => {
    if (!check.checked) return;
    const sz = check.dataset.sizeCheck;
    const qty = Number(sizePicker.querySelector(`[data-size-qty="${sz}"]`)?.value) || 0;
    if (qty > 0) sizes[sz] = qty;
  });
  return sizes;
}

function readColorPicker() {
  const colors = [];
  colorPicker.querySelectorAll('[data-color-check]').forEach(check => {
    if (check.checked) colors.push(check.dataset.colorCheck);
  });
  return colors;
}

function closeProductModal() { modalOverlay.hidden = true; }

document.getElementById('modalClose').addEventListener('click', closeProductModal);
document.getElementById('cancelBtn').addEventListener('click', closeProductModal);
modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeProductModal(); });

document.getElementById('fieldImg').addEventListener('change', e => {
  const file = e.target.files?.[0];
  if (!file) return;
  previewImg.src = URL.createObjectURL(file);
  previewImg.hidden = false;
});

document.getElementById('addProductBtn')?.addEventListener('click', () => openProductModal());

productForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  formError.textContent = '';
  const id = document.getElementById('fieldId').value;
  const file = document.getElementById('fieldImg').files?.[0];

  const fd = new FormData();
  fd.append('name', document.getElementById('fieldName').value.trim());
  fd.append('price', document.getElementById('fieldPrice').value);
  fd.append('oldPrice', document.getElementById('fieldOldPrice').value);
  fd.append('category', document.getElementById('fieldCategory').value);
  fd.append('badge', document.getElementById('fieldBadge').value);
  fd.append('rating', document.getElementById('fieldRating').value);
  fd.append('sizes', JSON.stringify(readSizePicker()));
  fd.append('colors', JSON.stringify(readColorPicker()));
  if (file) fd.append('image', file);

  try {
    if (id) await api(`/products/${id}`, { method: 'PUT', body: fd });
    else    await api('/products',       { method: 'POST', body: fd });
    closeProductModal();
    loadProducts();
  } catch (err) { formError.textContent = err.message; }
});

async function deleteProduct(id) {
  if (!confirm('Delete this product permanently?')) return;
  try {
    await api(`/products/${id}`, { method: 'DELETE' });
    loadProducts();
  } catch (err) { alert(err.message); }
}

/* ============================================================
   ORDERS
   ============================================================ */
const orderRows = document.getElementById('orderRows');
let orderCache = [];
const expandedOrders = new Set();

async function loadOrders() {
  orderRows.innerHTML = `<tr><td colspan="7" class="admin-empty-row">Loading…</td></tr>`;
  try {
    await ensureSettings();
    orderCache = await api('/orders');

    const statusFilter = document.getElementById('orderStatusFilter').value;
    const sortFilter   = document.getElementById('orderSortFilter').value;
    const search       = (document.getElementById('orderSearch')?.value || '').toLowerCase().trim();

    let list = [...orderCache];
    if (statusFilter) list = list.filter(o => o.status === statusFilter);
    if (search) {
      list = list.filter(o => {
        const name = (o.customer?.name || '').toLowerCase();
        const email = (o.customer?.email || '').toLowerCase();
        const phone = (o.customer?.phone || '').toLowerCase();
        const id = String(o.id);
        return name.includes(search) || email.includes(search) || phone.includes(search) || id === search.replace('#','');
      });
    }
    list.sort((a, b) => {
      const ta = new Date(a.createdAt).getTime();
      const tb = new Date(b.createdAt).getTime();
      const sa = a.subtotal ?? a.total ?? 0;
      const sb = b.subtotal ?? b.total ?? 0;
      if (sortFilter === 'recent') return tb - ta;
      if (sortFilter === 'oldest') return ta - tb;
      if (sortFilter === 'high')   return sb - sa;
      if (sortFilter === 'low')    return sa - sb;
      return tb - ta;
    });

    if (list.length === 0) {
      orderRows.innerHTML = `<tr><td colspan="7" class="admin-empty-row">No orders match.</td></tr>`;
      return;
    }

    const canCancel = ['admin', 'manager'].includes(user.role);

    orderRows.innerHTML = list.map(o => {
      const total = o.subtotal ?? o.total ?? 0;
      const cancelBtn = (canCancel && o.status !== 'cancelled' && o.status !== 'delivered')
        ? `<button class="admin-icon-btn danger" data-set="${o.id}" data-status="cancelled" title="Cancel">✕</button>` : '';
      const isOpen = expandedOrders.has(o.id);

      /* ---------- Order items with size + color ---------- */
      const items = (o.items || []).map(it => {
        const variantBits = [];
        if (it.size) variantBits.push(`Size: ${it.size}`);
        if (it.color) variantBits.push(`Color: ${colorLabelById(it.color)}`);
        const variantHTML = variantBits.length
          ? `<small class="order-item-variant">${variantBits.join(' · ')}</small>`
          : '';
        return `
          <li>
            <span>
              ${it.name} <em>×${it.qty}</em>
              ${variantHTML}
            </span>
            <strong>$${(it.price * it.qty).toFixed(2)}</strong>
          </li>
        `;
      }).join('');

      const cust = o.customer || {};

      return `
        <tr class="order-main-row">
          <td>
            <button class="order-expand" data-expand="${o.id}" aria-label="Toggle details">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                   style="transform: rotate(${isOpen ? 90 : 0}deg); transition: transform .2s;">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/>
              </svg>
            </button>
          </td>
          <td>#${o.id}</td>
          <td class="cell-name">${cust.name || '—'}</td>
          <td class="cell-price">$${total.toFixed(2)}</td>
          <td><span class="admin-badge status-${o.status}">${o.status}</span></td>
          <td>${o.createdAt ? new Date(o.createdAt).toLocaleString() : '—'}</td>
          <td>
            <div class="admin-row-actions">
              ${o.status === 'pending'    ? `<button class="admin-icon-btn" data-set="${o.id}" data-status="confirmed" title="Confirm">✓</button>` : ''}
              ${o.status === 'confirmed'  ? `<button class="admin-icon-btn" data-set="${o.id}" data-status="dispatched" title="Dispatch">🚚</button>` : ''}
              ${o.status === 'dispatched' ? `<button class="admin-icon-btn" data-set="${o.id}" data-status="delivered" title="Delivered">📦</button>` : ''}
              ${cancelBtn}
            </div>
          </td>
        </tr>
        <tr class="order-detail-row" ${isOpen ? '' : 'hidden'}>
          <td colspan="7">
            <div class="order-detail">
              <div class="order-detail-col">
                <h4>Customer</h4>
                <div class="detail-row"><span>Name</span><strong>${cust.name || '—'}</strong></div>
                <div class="detail-row"><span>Email</span><strong>${cust.email || '—'}</strong></div>
                <div class="detail-row"><span>Phone</span><strong>${cust.phone || '—'}</strong></div>
                <div class="detail-row"><span>Address</span><strong>${cust.address || '—'}</strong></div>
                <div class="detail-row"><span>City</span><strong>${cust.city || '—'}</strong></div>
                <div class="detail-row"><span>Postal</span><strong>${cust.postal || '—'}</strong></div>
                ${cust.notes ? `<div class="detail-row"><span>Notes</span><strong>${cust.notes}</strong></div>` : ''}
              </div>
              <div class="order-detail-col">
                <h4>Items (${(o.items || []).length})</h4>
                <ul class="order-detail-items">${items || '<li>No items</li>'}</ul>
              </div>
              <div class="order-detail-col">
                <h4>History</h4>
                <ul class="order-detail-history">
                  ${(o.history || []).map(h => `
                    <li>
                      <span class="admin-badge status-${h.status}">${h.status}</span>
                      <small>${new Date(h.at).toLocaleString()} — ${h.by}</small>
                    </li>
                  `).join('')}
                </ul>
              </div>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    orderRows.querySelectorAll('[data-set]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const target = btn.dataset.status;
        if (target === 'cancelled' && !confirm('Cancel this order?')) return;
        try {
          await api(`/orders/${btn.dataset.set}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status: target }),
          });
          loadOrders();
        } catch (err) { alert(err.message); }
      });
    });

    orderRows.querySelectorAll('[data-expand]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = Number(btn.dataset.expand);
        if (expandedOrders.has(id)) expandedOrders.delete(id);
        else expandedOrders.add(id);
        loadOrders();
      });
    });

  } catch (err) {
    orderRows.innerHTML = `<tr><td colspan="7" class="admin-empty-row">Error: ${err.message}</td></tr>`;
  }
}

['orderStatusFilter', 'orderSortFilter'].forEach(id => {
  document.getElementById(id)?.addEventListener('change', loadOrders);
});
let searchTimer;
document.getElementById('orderSearch')?.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadOrders, 250);
});

/* ============================================================
   SALES
   ============================================================ */
function getSalesPeriodDays() {
  const val = document.getElementById('salesPeriod')?.value || '365';
  return val === 'all' ? 99999 : Number(val);
}

function filterOrdersByPeriod(orders, days) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  cutoff.setHours(0, 0, 0, 0);
  return orders.filter(o => new Date(o.createdAt) >= cutoff);
}

async function loadSales() {
  try {
    const orders = await api('/orders');
    const products = await api('/products');
    const days = getSalesPeriodDays();
    const categoryFilter = document.getElementById('salesCategoryFilter')?.value || '';

    const productMap = {};
    products.forEach(p => productMap[p.id] = p);

    const scoped = filterOrdersByPeriod(orders, days).filter(o => o.status !== 'cancelled');

    let revenue = 0, itemCount = 0;
    const statusCounts = { pending: 0, confirmed: 0, dispatched: 0, delivered: 0, cancelled: 0 };
    const productSales = {};
    const sizeSales = {};
    const categorySales = {};

    scoped.forEach(o => {
      revenue += o.subtotal ?? o.total ?? 0;
      (o.items || []).forEach(it => {
        itemCount += it.qty;
        const prod = productMap[it.id];
        const cat = prod?.category || 'other';

        if (!productSales[it.id]) productSales[it.id] = { id: it.id, name: it.name, img: it.img, qty: 0, revenue: 0 };
        productSales[it.id].qty += it.qty;
        productSales[it.id].revenue += it.price * it.qty;

        if (!categorySales[cat]) categorySales[cat] = { qty: 0, revenue: 0 };
        categorySales[cat].qty += it.qty;
        categorySales[cat].revenue += it.price * it.qty;

        const sizeKey = it.size || '—';
        sizeSales[sizeKey] = (sizeSales[sizeKey] || 0) + it.qty;
      });
    });

    const itemMatchesCategory = it => {
      if (!categoryFilter) return true;
      return productMap[it.id]?.category === categoryFilter;
    };

    let filteredRevenue = 0, filteredItemCount = 0;
    const filteredProductSales = {};
    const filteredSizeSales = {};

    scoped.forEach(o => {
      (o.items || []).forEach(it => {
        if (!itemMatchesCategory(it)) return;
        filteredRevenue += it.price * it.qty;
        filteredItemCount += it.qty;
        if (!filteredProductSales[it.id]) filteredProductSales[it.id] = { id: it.id, name: it.name, img: it.img, qty: 0, revenue: 0 };
        filteredProductSales[it.id].qty += it.qty;
        filteredProductSales[it.id].revenue += it.price * it.qty;
        const sizeKey = it.size || '—';
        filteredSizeSales[sizeKey] = (filteredSizeSales[sizeKey] || 0) + it.qty;
      });
    });

    const useFiltered = !!categoryFilter;
    const displayRevenue = useFiltered ? filteredRevenue : revenue;
    const displayItems   = useFiltered ? filteredItemCount : itemCount;
    const productSource  = useFiltered ? filteredProductSales : productSales;
    const sizeSource     = useFiltered ? filteredSizeSales : sizeSales;

    const allScoped = filterOrdersByPeriod(orders, days);
    allScoped.forEach(o => { if (statusCounts[o.status] != null) statusCounts[o.status] += 1; });

    const orderCount = scoped.length;
    const aov = orderCount > 0 ? revenue / orderCount : 0;

    const setTxt = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    setTxt('statRevenue', '$' + displayRevenue.toFixed(2));
    setTxt('statOrders', orderCount);
    setTxt('statAOV', '$' + aov.toFixed(2));
    setTxt('statItems', displayItems);
    setTxt('statPending', statusCounts.pending);
    setTxt('statConfirmed', statusCounts.confirmed);
    setTxt('statDispatched', statusCounts.dispatched);
    setTxt('statDelivered', statusCounts.delivered);
    setTxt('statCancelled', statusCounts.cancelled);

    renderRevenueChart(scoped, days);
    renderBestSellers(productSource);
    renderSizeBreakdown(sizeSource);
    renderCategoryBars(categorySales);
  } catch (err) {
    console.error('Sales error:', err);
  }
}

function renderRevenueChart(orders, days) {
  const chart = document.getElementById('salesChart');
  if (!chart) return;
  const isShort = days <= 60;
  const bucketMap = {};
  const labels = [];

  if (isShort) {
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const key = d.toISOString().slice(0, 10);
      bucketMap[key] = { key, label: d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }), revenue: 0, count: 0 };
      labels.push(key);
    }
  } else {
    const months = Math.ceil(days / 30);
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      bucketMap[key] = { key, label: d.toLocaleString(undefined, { month: 'short' }), revenue: 0, count: 0 };
      labels.push(key);
    }
  }

  orders.forEach(o => {
    const d = new Date(o.createdAt);
    const key = isShort
      ? d.toISOString().slice(0, 10)
      : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!bucketMap[key]) return;
    bucketMap[key].revenue += o.subtotal ?? o.total ?? 0;
    bucketMap[key].count += 1;
  });

  const list = labels.map(k => bucketMap[k]);
  const maxRev = Math.max(...list.map(b => b.revenue), 1);

  chart.innerHTML = list.map(b => {
    const h = (b.revenue / maxRev) * 100;
    return `
      <div class="sales-bar" title="${b.label}: $${b.revenue.toFixed(2)} (${b.count} orders)">
        <div class="sales-bar-fill" style="height: ${h}%">
          <span class="sales-bar-value">$${b.revenue >= 1000 ? Math.round(b.revenue) : b.revenue.toFixed(0)}</span>
        </div>
        <span class="sales-bar-label">${b.label}</span>
      </div>
    `;
  }).join('');
}

function renderBestSellers(productSales) {
  const el = document.getElementById('bestSellers');
  if (!el) return;
  const list = Object.values(productSales).sort((a, b) => b.qty - a.qty).slice(0, 8);
  if (list.length === 0) { el.innerHTML = `<li class="sales-empty">No sales yet.</li>`; return; }
  const medals = ['#1', '#2', '#3'];
  const max = list[0].qty;
  el.innerHTML = list.map((p, i) => {
    const pct = (p.qty / max) * 100;
    return `
      <li class="sales-rank-item">
        <span class="sales-rank-badge">${medals[i] || ('#' + (i + 1))}</span>
        <img src="${p.img}" alt="${p.name}" />
        <div class="sales-rank-info">
          <div class="sales-rank-name">${p.name}</div>
          <div class="sales-rank-bar"><i style="width: ${pct}%"></i></div>
        </div>
        <div class="sales-rank-meta">
          <strong>${p.qty}</strong>
          <small>$${p.revenue.toFixed(0)}</small>
        </div>
      </li>
    `;
  }).join('');
}

function renderSizeBreakdown(sizeSales) {
  const el = document.getElementById('sizeBreakdown');
  if (!el) return;
  const entries = Object.entries(sizeSales).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, [, q]) => s + q, 0);
  if (entries.length === 0 || total === 0) {
    el.innerHTML = `<p class="sales-empty">No size data yet.</p>`;
    return;
  }
  el.innerHTML = entries.map(([size, qty]) => {
    const pct = (qty / total) * 100;
    return `
      <div class="size-row">
        <span class="size-label">${size}</span>
        <div class="size-bar"><i style="width: ${pct}%"></i></div>
        <span class="size-value">${qty} <small>(${pct.toFixed(0)}%)</small></span>
      </div>
    `;
  }).join('');
}

function renderCategoryBars(categorySales) {
  const el = document.getElementById('categoryBars');
  if (!el) return;
  const entries = Object.entries(categorySales);
  if (entries.length === 0) { el.innerHTML = `<p class="sales-empty">No category data yet.</p>`; return; }
  const maxRev = Math.max(...entries.map(([, v]) => v.revenue), 1);
  el.innerHTML = entries.sort((a, b) => b[1].revenue - a[1].revenue).map(([cat, v]) => {
    const pct = (v.revenue / maxRev) * 100;
    return `
      <div class="category-row">
        <span class="category-name">${cat}</span>
        <div class="category-bar"><i style="width: ${pct}%"></i></div>
        <span class="category-value">
          <strong>$${v.revenue.toFixed(0)}</strong>
          <small>${v.qty} items</small>
        </span>
      </div>
    `;
  }).join('');
}

document.getElementById('salesPeriod')?.addEventListener('change', loadSales);
document.getElementById('salesCategoryFilter')?.addEventListener('change', loadSales);

/* ============================================================
   USERS
   ============================================================ */
const userRows = document.getElementById('userRows');
const userModalOverlay = document.getElementById('userModalOverlay');
const userForm = document.getElementById('userForm');
const userFormError = document.getElementById('userFormError');
let userCache = [];

async function loadUsers() {
  if (user.role !== 'admin') return;
  userRows.innerHTML = `<tr><td colspan="5" class="admin-empty-row">Loading…</td></tr>`;
  try {
    userCache = await api('/auth/users');
    userRows.innerHTML = userCache.map(u => `
      <tr>
        <td class="cell-name">${u.name}</td>
        <td>${u.username}</td>
        <td><span class="admin-badge">${u.role}</span></td>
        <td>${u.active ? '✅ Active' : '⛔ Inactive'}</td>
        <td>
          <div class="admin-row-actions">
            <button class="admin-icon-btn" data-edit-user="${u.id}" title="Edit">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897l12.682-12.68z"/>
              </svg>
            </button>
            <button class="admin-icon-btn danger" data-del-user="${u.id}" title="Delete">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </td>
      </tr>
    `).join('');

    userRows.querySelectorAll('[data-edit-user]').forEach(btn => {
      btn.addEventListener('click', () => openUserModal(Number(btn.dataset.editUser)));
    });
    userRows.querySelectorAll('[data-del-user]').forEach(btn => {
      btn.addEventListener('click', () => deleteUser(Number(btn.dataset.delUser)));
    });
  } catch (err) {
    userRows.innerHTML = `<tr><td colspan="5" class="admin-empty-row">Error: ${err.message}</td></tr>`;
  }
}

function openUserModal(id = null) {
  userForm.reset();
  userFormError.textContent = '';
  document.getElementById('userId').value = '';
  document.getElementById('userActive').checked = true;
  document.getElementById('pwdHint').textContent = id ? '(leave empty to keep current)' : '';

  if (id) {
    const u = userCache.find(x => x.id === id);
    if (!u) return;
    document.getElementById('userModalTitle').textContent = 'Edit User';
    document.getElementById('userId').value = u.id;
    document.getElementById('userFullName').value = u.name || '';
    document.getElementById('userUsername').value = u.username;
    document.getElementById('userUsername').disabled = true;
    document.getElementById('userRoleInput').value = u.role;
    document.getElementById('userActive').checked = u.active;
    document.getElementById('userPassword').required = false;
  } else {
    document.getElementById('userModalTitle').textContent = 'Add User';
    document.getElementById('userUsername').disabled = false;
    document.getElementById('userPassword').required = true;
  }
  userModalOverlay.hidden = false;
}
function closeUserModal() { userModalOverlay.hidden = true; }

document.getElementById('userModalClose').addEventListener('click', closeUserModal);
document.getElementById('userCancelBtn').addEventListener('click', closeUserModal);
userModalOverlay.addEventListener('click', e => { if (e.target === userModalOverlay) closeUserModal(); });
document.getElementById('addUserBtn')?.addEventListener('click', () => openUserModal());

userForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  userFormError.textContent = '';
  const id = document.getElementById('userId').value;
  const body = {
    name: document.getElementById('userFullName').value.trim(),
    username: document.getElementById('userUsername').value.trim(),
    password: document.getElementById('userPassword').value,
    role: document.getElementById('userRoleInput').value,
    active: document.getElementById('userActive').checked,
  };
  try {
    if (id) await api(`/auth/users/${id}`, { method: 'PUT', body: JSON.stringify(body) });
    else    await api('/auth/users',       { method: 'POST', body: JSON.stringify(body) });
    closeUserModal();
    loadUsers();
  } catch (err) { userFormError.textContent = err.message; }
});

async function deleteUser(id) {
  if (!confirm('Delete this user?')) return;
  try {
    await api(`/auth/users/${id}`, { method: 'DELETE' });
    loadUsers();
  } catch (err) { alert(err.message); }
}

/* ============================================================
   SETTINGS
   ============================================================ */
let fullSettingsCache = null;

async function loadSettings() {
  if (user.role !== 'admin') return;
  try {
    fullSettingsCache = await api('/settings/full');
    settingsCache = {
      categories: fullSettingsCache.categories,
      sizes: fullSettingsCache.sizes,
      colors: fullSettingsCache.colors,
    };
    renderSettings();
  } catch (err) {
    console.error('Settings load failed:', err);
  }
}

function renderSettings() {
  const s = fullSettingsCache;
  if (!s) return;

  document.getElementById('setCurrencySymbol').value = s.currency.symbol || '$';
  document.getElementById('setCurrencyCode').value = s.currency.code || 'USD';
  document.getElementById('setCurrencyPosition').value = s.currency.position || 'before';
  document.getElementById('setOrdersEnabled').checked = s.ordersEnabled !== false;

  const catList = document.getElementById('categoryList');
  catList.innerHTML = (s.categories || []).map(c => `
    <li class="settings-item" data-id="${c.id}">
      <span>${c.label} <em>(${c.id})</em></span>
      <div class="admin-row-actions">
        <button class="admin-icon-btn" data-edit-cat="${c.id}" title="Rename">✎</button>
        <button class="admin-icon-btn danger" data-del-cat="${c.id}" title="Delete">✕</button>
      </div>
    </li>
  `).join('');

  catList.querySelectorAll('[data-edit-cat]').forEach(btn => {
    btn.addEventListener('click', () => editCategory(btn.dataset.editCat));
  });
  catList.querySelectorAll('[data-del-cat]').forEach(btn => {
    btn.addEventListener('click', () => deleteCategory(btn.dataset.delCat));
  });

  const chipWrap = document.getElementById('sizeChips');
  chipWrap.innerHTML = (s.sizes || []).map(sz => `
    <span class="settings-chip">
      ${sz}
      <button data-del-size="${sz}" title="Remove">✕</button>
    </span>
  `).join('');

  chipWrap.querySelectorAll('[data-del-size]').forEach(btn => {
    btn.addEventListener('click', () => {
      fullSettingsCache.sizes = fullSettingsCache.sizes.filter(x => x !== btn.dataset.delSize);
      renderSettings();
    });
  });

  const colList = document.getElementById('colorList');
  colList.innerHTML = (s.colors || []).map(c => `
    <li class="settings-item" data-id="${c.id}">
      <span class="color-chip-row">
        <i class="color-swatch" style="background:${c.hex}"></i>
        ${c.label} <em>(${c.id})</em>
      </span>
      <div class="admin-row-actions">
        <button class="admin-icon-btn danger" data-del-color="${c.id}" title="Remove">✕</button>
      </div>
    </li>
  `).join('');

  colList.querySelectorAll('[data-del-color]').forEach(btn => {
    btn.addEventListener('click', () => {
      fullSettingsCache.colors = fullSettingsCache.colors.filter(x => x.id !== btn.dataset.delColor);
      renderSettings();
    });
  });

  const salesCat = document.getElementById('salesCategoryFilter');
  if (salesCat) {
    salesCat.innerHTML = `<option value="">All categories</option>` +
      (s.categories || []).map(c => `<option value="${c.id}">${c.label}</option>`).join('');
  }
}

function slugify(str) {
  return String(str).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function editCategory(id) {
  const cat = fullSettingsCache.categories.find(c => c.id === id);
  if (!cat) return;
  const newLabel = prompt('New category label:', cat.label);
  if (!newLabel || !newLabel.trim()) return;
  cat.label = newLabel.trim();
  renderSettings();
}

function deleteCategory(id) {
  if (!confirm('Remove this category?')) return;
  fullSettingsCache.categories = fullSettingsCache.categories.filter(c => c.id !== id);
  renderSettings();
}

document.getElementById('addCategoryBtn')?.addEventListener('click', () => {
  const label = prompt('New category label:');
  if (!label || !label.trim()) return;
  const id = slugify(label);
  if (fullSettingsCache.categories.some(c => c.id === id)) {
    alert('A category with this name already exists.');
    return;
  }
  fullSettingsCache.categories.push({ id, label: label.trim() });
  renderSettings();
});

document.getElementById('addSizeBtn')?.addEventListener('click', () => {
  const input = document.getElementById('newSize');
  const val = input.value.trim();
  if (!val) return;
  if (fullSettingsCache.sizes.includes(val)) {
    alert('Size already exists.');
    return;
  }
  fullSettingsCache.sizes.push(val);
  input.value = '';
  renderSettings();
});

document.getElementById('addColorBtn')?.addEventListener('click', () => {
  const label = document.getElementById('newColorLabel').value.trim();
  const hex = document.getElementById('newColorHex').value;
  if (!label) return;
  const id = slugify(label);
  if (fullSettingsCache.colors.some(c => c.id === id)) {
    alert('A color with this name already exists.');
    return;
  }
  fullSettingsCache.colors.push({ id, label, hex });
  document.getElementById('newColorLabel').value = '';
  renderSettings();
});

document.getElementById('saveSettingsBtn')?.addEventListener('click', async () => {
  const status = document.getElementById('settingsStatus');
  status.textContent = '';

  const payload = {
    currency: {
      symbol: document.getElementById('setCurrencySymbol').value.trim() || '$',
      code: document.getElementById('setCurrencyCode').value.trim() || 'USD',
      position: document.getElementById('setCurrencyPosition').value,
    },
    ordersEnabled: document.getElementById('setOrdersEnabled').checked,
    categories: fullSettingsCache.categories,
    sizes: fullSettingsCache.sizes,
    colors: fullSettingsCache.colors,
  };

  try {
    fullSettingsCache = await api('/settings', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    settingsCache = {
      categories: fullSettingsCache.categories,
      sizes: fullSettingsCache.sizes,
      colors: fullSettingsCache.colors,
    };
    status.textContent = '✅ Saved';
    status.style.color = '#3fb950';
    setTimeout(() => { status.textContent = ''; }, 3000);
  } catch (err) {
    status.textContent = '❌ ' + err.message;
    status.style.color = 'var(--red-bright)';
  }
});

/* ============================================================
   INIT
   ============================================================ */
(async () => {
  await ensureSettings();
  loadProducts();
})();