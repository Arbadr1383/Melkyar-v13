/**
 * app.js
 * ---------------------------------------------------------------------------
 * پوستهٔ برنامه: Router ساده مبتنی بر Hash، Sidebar، Header، تم روشن/تاریک،
 * و راه‌اندازی اولیه (شامل پیشنهاد بارگذاری دادهٔ Demo در اولین اجرا).
 */

const ROUTES = {
  dashboard: { label: 'داشبورد', icon: '🏠', render: (el, opts) => dashboardModule.renderDashboard(el, opts) },
  properties: { label: 'فایل‌های ملکی', icon: '🏢', render: (el, opts) => propertiesModule.renderProperties(el, opts) },
  customers: { label: 'مشتری‌ها', icon: '👥', render: (el, opts) => customersModule.renderCustomers(el, opts) },
  club: { label: 'باشگاه مشتریان', icon: '🎯', render: (el) => clubModule.renderClub(el) },
  sharing: { label: 'اشتراک امن فایل', icon: '🔐', render: (el) => sharingModule.renderSharing(el) },
  owners: { label: 'مالکین', icon: '👤', render: (el) => ownersModule.renderOwners(el) },
  search: { label: 'جستجوی پیشرفته', icon: '🔍', render: (el, opts) => searchModule.renderSearchPage(el, opts) },
  visits: { label: 'بازدیدها', icon: '📅', render: (el) => visitsModule.renderVisits(el) },
  followups: { label: 'پیگیری‌ها', icon: '⏰', render: (el) => followupsModule.renderFollowups(el) },
  deals: { label: 'معاملات', icon: '🤝', render: (el) => dealsModule.renderDeals(el) },
  commissions: { label: 'کمیسیون', icon: '🧾', render: (el) => commissionsModule.renderCommissions(el) },
  assistant: { label: 'دستیار هوشمند', icon: '🤖', render: (el) => assistantModule.render(el) },
  finance: { label: 'حسابداری', icon: '💰', render: (el) => financeModule.renderFinance(el) },
  accounts: { label: 'حساب‌ها', icon: '🏦', render: (el) => accountsModule.renderAccounts(el) },
  loans: { label: 'قرض و طلب', icon: '🔄', render: (el) => loansModule.renderLoans(el) },
  builders: { label: 'سازندگان', icon: '🏗️', render: (el) => buildersModule.renderBuilders(el) },
  reports: { label: 'گزارش‌ها', icon: '📊', render: (el) => reportsModule.renderReports(el) },
  notifications: { label: 'اعلان‌ها', icon: '🔔', render: (el) => notificationsModule.renderNotifications(el) },
  backup: { label: 'پشتیبان و انتقال', icon: '💾', render: (el) => backupModule.renderBackup(el) },
  settings: { label: 'تنظیمات', icon: '⚙️', render: (el) => settingsModule.renderSettings(el) },
  about: { label: 'درباره برنامه', icon: 'ℹ️', render: (el) => aboutModule.render(el) },
};

function parseHash() {
  const raw = location.hash.replace(/^#\//, '') || 'dashboard';
  const [path, queryStr] = raw.split('?');
  const opts = {};
  if (queryStr) {
    new URLSearchParams(queryStr).forEach((v, k) => { opts[k] = v; });
  }
  return { path: path || 'dashboard', opts };
}

function renderSidebar(activePath) {
  const nav = document.getElementById('sidebar-nav');
  nav.innerHTML = Object.entries(ROUTES)
    .filter(([key, route]) => !route.permission || AUTH.hasPermission(route.permission))
    .map(([key, route]) => `
      <a href="#/${key}" class="nav-item ${key === activePath ? 'nav-item--active' : ''}">
        <span class="nav-item__icon">${route.icon}</span>
        <span class="nav-item__label">${route.label}</span>
        ${route.comingSoon ? `<span class="nav-item__badge">${route.comingSoon}</span>` : ''}
      </a>
    `)
    .join('');
}

function renderComingSoon(container, label, phase) {
  container.innerHTML = `
    <div class="state state--empty">
      <h3>${label}</h3>
      <p>این ماژول در فاز توسعهٔ ${phase} ساخته می‌شود. طبق قانون بخش ۴۹ سند،
      این بخش نمایشی/Fake ساخته نشده — وقتی به آن رسیدیم، واقعی و کامل پیاده
      می‌شود.</p>
    </div>
  `;
}

async function router() {
  if (window.AUTH && !AUTH.currentUser()) {
    await AUTH.requireLogin();
    return;
  }
  const { path, opts } = parseHash();
  let route = ROUTES[path] || ROUTES.dashboard;
  if (route.permission && !AUTH.hasPermission(route.permission)) {
    ui.toast('شما به این بخش دسترسی ندارید.', 'error');
    location.hash = '#/dashboard';
    route = ROUTES.dashboard;
  }
  renderSidebar(route === ROUTES.dashboard && path !== 'dashboard' ? 'dashboard' : path);

  const content = document.getElementById('page-content');
  document.title = `ملک‌یار — ${route.label}`;

  try {
    await route.render(content, opts);
    formatNumericInputs(content);
  } catch (err) {
    console.error(err);
    ui.renderError(content, 'در بارگذاری این صفحه خطایی رخ داد.', () => router());
  }
  try { await ui.renderNotificationBell(); } catch (notifyErr) { console.error('notification render', notifyErr); }
}


function formatNumericInputs(root=document){
  if(window.mk && typeof mk.bindMoneyInputs==='function') mk.bindMoneyInputs(root);
  root.querySelectorAll('input[type="number"]').forEach(input=>{
    if(input.dataset.grouped==='1') return; input.dataset.grouped='1';
    input.addEventListener('blur',()=>{ const n=Number(input.value); if(Number.isFinite(n)&&input.value!=='') input.title=mk.groupedNumber(n); });
  });
}

async function initTheme() {
  let saved = localStorage.getItem('melkyar_theme');
  if (!saved && window.db?.settings) {
    try { saved = (await db.settings.get('theme'))?.value || ''; } catch (_) {}
  }
  if (!['light','emerald-gold','sage','sand'].includes(saved)) saved = 'light';
  document.documentElement.setAttribute('data-theme', saved);
  localStorage.setItem('melkyar_theme', saved);
  updateThemeToggleIcon(saved);
}

function updateThemeToggleIcon(theme) { const btn=document.getElementById('theme-toggle'); if(btn) btn.textContent='🎨'; }

async function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const themes = ['light','emerald-gold','sage','sand'];
  const index = Math.max(0, themes.indexOf(current));
  const next = themes[(index + 1) % themes.length];
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('melkyar_theme', next);
  updateThemeToggleIcon(next);
  try {
    const old = await db.settings.get('theme');
    old ? await db.settings.update('theme',{value:next}) : await db.settings.add({key:'theme',value:next});
  } catch (_) {}
}

function wireHeader() {
  const userButton = document.getElementById('current-user-btn');
  if (userButton) userButton.addEventListener('click', async () => {
    const user = AUTH.currentUser();
    if (user) {
      const ok = await ui.confirmDialog(`از حساب «${user.name || user.username}» خارج می‌شوید؟`);
      if (ok) {
        AUTH.clearSession();
        location.hash = '#/dashboard';
        location.reload();
      }
    }
  });
  document.getElementById('theme-toggle').addEventListener('click', toggleTheme);

  const searchInput = document.getElementById('global-search');
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') searchModule.handleQuickSearch(searchInput.value);
  });

  document.getElementById('notif-bell').addEventListener('click', () => {
    document.getElementById('notif-panel').classList.toggle('notif-panel--open');
  });
  document.addEventListener('click', (e) => {
    const panel = document.getElementById('notif-panel');
    const bell = document.getElementById('notif-bell');
    if (!panel.contains(e.target) && !bell.contains(e.target)) panel.classList.remove('notif-panel--open');
  });

  document.addEventListener('melkyar:show-property', (e) => propertiesModule.propertyDetailModal(e.detail));
  document.addEventListener('melkyar:show-customer', (e) => customersModule.customerDetailModal(e.detail));
}

async function maybeOfferDemoData() {
  const empty = await db.isDatabaseEmpty();
  if (!empty) return;

  const body = document.createElement('div');
  body.innerHTML = `
    <p>دیتابیس شما خالی است. برای اینکه بتوانید همهٔ صفحات را با داده‌های
    واقعی امتحان کنید، می‌توانید داده‌های نمونه (۲۰ فایل ملکی و ۱۰ مشتری)
    بارگذاری کنید.</p>
    <div class="confirm-dialog__actions">
      <button class="btn btn--ghost" data-act="skip">شروع با دیتابیس خالی</button>
      <button class="btn btn--primary" data-act="load">بارگذاری دادهٔ نمونه</button>
    </div>
  `;
  const modal = ui.openModal({ title: 'خوش آمدید به ملک‌یار', bodyEl: body, size: 'sm' });
  body.querySelector('[data-act="skip"]').addEventListener('click', () => modal.close());
  body.querySelector('[data-act="load"]').addEventListener('click', async () => {
    await seedModule.loadDemoData();
    modal.close();
    ui.toast('دادهٔ نمونه بارگذاری شد.', 'success');
    router();
  });
}

window.addEventListener('hashchange', router);
window.addEventListener('DOMContentLoaded', async () => {
  await initTheme();
  wireHeader();
  await router();
  await maybeOfferDemoData();
});
