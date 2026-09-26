/**
 * ui.js
 * ---------------------------------------------------------------------------
 * ابزارهای رابط کاربری مشترک: Toast، Modal، حالت‌های Loading/Empty/Error،
 * و مرکز اعلان‌ها (نسخهٔ پایه — بخش ۴۴ سند). این‌ها هرگز داده تولید نمی‌کنند؛
 * فقط render می‌کنند.
 */

function toast(message, type = 'info') {
  const host = document.getElementById('toast-host');
  const el = document.createElement('div');
  el.className = `toast toast--${type}`;
  el.textContent = message;
  host.appendChild(el);
  requestAnimationFrame(() => el.classList.add('toast--show'));
  setTimeout(() => {
    el.classList.remove('toast--show');
    setTimeout(() => el.remove(), 250);
  }, 3200);
}

function openModal({ title, bodyEl, size = 'md', onClose }) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal modal--${size}">
      <header class="modal__header">
        <h3>${title}</h3>
        <button class="modal__close" type="button" aria-label="بستن">×</button>
      </header>
      <div class="modal__body"></div>
    </div>
  `;
  overlay.querySelector('.modal__body').appendChild(bodyEl);
  document.body.appendChild(overlay);
  document.body.classList.add('no-scroll');

  function close() {
    overlay.remove();
    document.body.classList.remove('no-scroll');
    if (onClose) onClose();
  }

  overlay.querySelector('.modal__close').addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
  document.addEventListener('keydown', function escHandler(e) {
    if (e.key === 'Escape') {
      close();
      document.removeEventListener('keydown', escHandler);
    }
  });

  return { close, overlay };
}

function confirmDialog(message) {
  return new Promise((resolve) => {
    const body = document.createElement('div');
    body.className = 'confirm-dialog';
    body.innerHTML = `
      <p>${message}</p>
      <div class="confirm-dialog__actions">
        <button class="btn btn--ghost" data-act="cancel">لغو</button>
        <button class="btn btn--danger" data-act="confirm">تأیید</button>
      </div>
    `;
    const modal = openModal({ title: 'تأیید عملیات', bodyEl: body, size: 'sm' });
    body.querySelector('[data-act="cancel"]').addEventListener('click', () => {
      modal.close();
      resolve(false);
    });
    body.querySelector('[data-act="confirm"]').addEventListener('click', () => {
      modal.close();
      resolve(true);
    });
  });
}

function renderLoading(container, label = 'در حال بارگذاری...') {
  container.innerHTML = `
    <div class="state state--loading">
      <div class="spinner"></div>
      <p>${label}</p>
    </div>
  `;
}

function renderEmpty(container, { title, subtitle, actionLabel, onAction }) {
  container.innerHTML = `
    <div class="state state--empty">
      <h3>${title}</h3>
      <p>${subtitle || ''}</p>
      ${actionLabel ? `<button class="btn btn--primary" id="empty-action">${actionLabel}</button>` : ''}
    </div>
  `;
  if (actionLabel && onAction) {
    container.querySelector('#empty-action').addEventListener('click', onAction);
  }
}

function renderError(container, message, onRetry) {
  container.innerHTML = `
    <div class="state state--error">
      <h3>مشکلی پیش آمد</h3>
      <p>${message}</p>
      ${onRetry ? '<button class="btn btn--ghost" id="retry-action">تلاش دوباره</button>' : ''}
    </div>
  `;
  if (onRetry) container.querySelector('#retry-action').addEventListener('click', onRetry);
}

/**
 * مرکز اعلان‌ها — نسخهٔ پایهٔ بخش ۴۴ سند.
 * در این فاز، اعلان‌ها به‌صورت Derived از داده‌های موجود (properties/customers)
 * محاسبه می‌شوند: فایل‌های تازه ثبت‌شده و پیگیری‌های نزدیک مشتری. اعلان‌های
 * «سررسید مالی» و «هشدار سیستم» چون به ماژول‌های حسابداری/کاربران وابسته‌اند،
 * در Priority 3 اضافه می‌شوند.
 */
async function computeNotifications() {
  const [properties, customers] = await Promise.all([db.properties.getAll(), db.customers.getAll()]);
  const notifications = [];

  const dayMs = 24 * 60 * 60 * 1000;
  const now = Date.now();

  properties
    .filter((p) => now - new Date(p.createdAt).getTime() < 3 * dayMs)
    .forEach((p) => notifications.push({
      type: 'new_property',
      text: `فایل جدید ثبت شد: ${p.code || ''} — ${p.neighborhood || p.district || ''}`,
      date: p.createdAt,
    }));

  customers
    .filter((c) => c.nextFollowup && new Date(c.nextFollowup).getTime() - now < dayMs && new Date(c.nextFollowup).getTime() - now > -7 * dayMs)
    .forEach((c) => {
      const overdue = new Date(c.nextFollowup).getTime() < now;
      notifications.push({
        type: overdue ? 'followup_overdue' : 'followup_today',
        text: `${overdue ? 'پیگیری عقب‌افتاده' : 'پیگیری نزدیک'}: ${c.name}`,
        date: c.nextFollowup,
      });
    });

  return notifications.sort((a, b) => new Date(b.date) - new Date(a.date));
}

async function renderNotificationBell() {
  const badge = document.getElementById('notif-badge');
  const list = document.getElementById('notif-list');
  const computed = await computeNotifications();
  let saved = [];
  try { saved = (await db.notifications.getAll()).filter(n => !n.read).slice(-30).reverse(); } catch (e) { console.warn('saved notifications', e); }
  const notifications = [...saved, ...computed].sort((a,b) => new Date(b.date)-new Date(a.date));
  badge.textContent = notifications.length;
  badge.style.display = notifications.length ? 'inline-flex' : 'none';
  list.innerHTML = notifications.length
    ? notifications.map((n) => `<li class="notif-item notif-item--${n.type}">${mk.esc ? mk.esc(n.text) : n.text}</li>`).join('')
    : '<li class="notif-item notif-item--empty">اعلان جدیدی نیست</li>';
}

window.ui = {
  toast,
  openModal,
  confirmDialog,
  renderLoading,
  renderEmpty,
  renderError,
  renderNotificationBell,
};
