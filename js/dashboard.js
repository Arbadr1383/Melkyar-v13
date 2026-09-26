async function renderDashboard(container) {
  const modules = Object.entries(ROUTES || {}).filter(([key]) => !['dashboard','users'].includes(key));
  container.innerHTML = `<div class="page-header"><div><h1>ملک‌یار</h1><p class="muted">شرکت برنامه نویسی قو (سهامی خاص)</p></div></div>
    <section class="panel dashboard-brand"><strong>شرکت برنامه نویسی قو (سهامی خاص)</strong><div>علیرضا بدر (Swanco)</div></section>
    <div class="dashboard-module-grid">${modules.map(([key,r]) => `<a class="dashboard-module-card" href="#/${key}"><span>${r.icon}</span><b>${r.label}</b></a>`).join('')}</div>`;
}
window.dashboardModule={renderDashboard};