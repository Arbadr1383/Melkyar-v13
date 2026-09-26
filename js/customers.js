/**
 * customers.js
 * ---------------------------------------------------------------------------
 * مدیریت مشتری‌ها — بخش ۹ سند. تطبیق هوشمند (بخش ۱۰) در این فاز پیاده نشده
 * چون به تعریف وزن معیارها و منطق امتیازدهی نیاز دارد که بهتر است به‌همراه
 * ماژول AI/Matching در Priority 4 به‌صورت کامل و واقعی ساخته شود، نه یک نسخهٔ
 * ساده‌شده که بعداً دور ریخته شود.
 */

const CUSTOMER_TYPES = { buyer: 'خریدار', tenant: 'مستأجر', seller: 'فروشنده', landlord: 'موجر' };
const CUSTOMER_STATUS = {
  buy_wanted: 'خواهان خرید', rent_wanted: 'خواهان اجاره',
  not_contacted: 'تماس گرفته نشده', following: 'در حال پیگیری',
  active: 'فعال', inactive: 'غیرفعال', closed_deal: 'منتهی به معامله',
};


function normalizeCustomerStatus(c) {
  if (!c) return c;
  if (c.status === 'seeking' || c.status === 'wanted') return { ...c, status: c.dealType === 'rent' ? 'rent_wanted' : 'buy_wanted' };
  return c;
}

function fmt(value, unit = '') {
  if (value === null || value === undefined || value === '') return '<span class="unknown">نامشخص</span>';
  if (typeof value === 'number') return `${formatGroupedNumber(value)}${unit}`;
  return `${value}${unit}`;
}

function customerFormTemplate(c = {}) {
  const v = (key, def = '') => (c[key] !== undefined && c[key] !== null ? c[key] : def);
  const selected = (key, val) => (v(key) === val ? 'selected' : '');
  return `
    <form class="tabbed-form" id="customer-form">
      <div class="tabs">
        <button type="button" class="tab tab--active" data-tab="basic">اطلاعات پایه</button>
        <button type="button" class="tab" data-tab="needs">نیازها</button>
        <button type="button" class="tab" data-tab="followup">پیگیری</button>
        <button type="button" class="tab" data-tab="notes">توضیحات و برچسب‌ها</button>
      </div>

      <div class="tab-panel tab-panel--active" data-panel="basic">
        <label>نام * <input name="name" value="${v('name')}" required></label>
        <label>شماره تماس * <input name="phone" value="${v('phone')}" required pattern="^09\\d{9}$" placeholder="09xxxxxxxxx"></label>
        <label>نوع مشتری
          <select name="type">
            ${Object.entries(CUSTOMER_TYPES).map(([k, l]) => `<option value="${k}" ${selected('type', k)}>${l}</option>`).join('')}
          </select>
        </label>
        <label>نوع معاملهٔ موردنظر
          <select name="dealType">
            <option value="sale" ${selected('dealType', 'sale')}>فروش</option>
            <option value="rent" ${selected('dealType', 'rent')}>اجاره</option>
          </select>
        </label>
        <label>وضعیت
          <select name="status">
            ${Object.entries(CUSTOMER_STATUS).map(([k, l]) => `<option value="${k}" ${selected('status', k)}>${l}</option>`).join('')}
          </select>
        </label>
      </div>

      <div class="tab-panel" data-panel="needs">
        <label>بودجه از (تومان) <input name="budgetMin" type="text" inputmode="numeric" data-money maxlength="15" value="${v('budgetMin')}"></label>
        <label>بودجه تا (تومان) <input name="budgetMax" type="text" inputmode="numeric" data-money maxlength="15" value="${v('budgetMax')}"></label>
        <label>محدوده موردنظر (با ویرگول) <input name="desiredAreas" value="${(c.desiredAreas || []).join('، ')}" placeholder="مثلاً قصرالدشت، رحمت‌آباد"></label>
        <label>متراژ موردنظر <input name="desiredMeterage" type="number" min="0" value="${v('desiredMeterage')}"></label>
        <label>تعداد خواب موردنظر <input name="desiredBedrooms" type="number" min="0" value="${v('desiredBedrooms')}"></label>
        <label>امکانات موردنیاز (با ویرگول) <input name="requiredFeatures" value="${(c.requiredFeatures || []).join('، ')}" placeholder="آسانسور، پارکینگ"></label>
      </div>

      <div class="tab-panel" data-panel="followup">
        ${mk.jalaliDate('آخرین تماس','lastContact',v('lastContact',''))}
        ${mk.jalaliDate('پیگیری بعدی','nextFollowup',v('nextFollowup',''))}
      </div>

      <div class="tab-panel" data-panel="notes">
        <label>توضیحات <textarea name="description" rows="5">${v('description')}</textarea></label>
        <label>برچسب‌ها (با کاما) <input name="tags" value="${(c.tags || []).join('، ')}"></label>
      </div>

      <footer class="form-footer">
        <button type="button" class="btn btn--ghost" data-act="cancel">انصراف</button>
        <button type="submit" class="btn btn--primary">${c.id ? 'ذخیرهٔ تغییرات' : 'ثبت مشتری'}</button>
      </footer>
    </form>
  `;
}

function wireTabs(root) {
  root.querySelectorAll('.tab').forEach((tabBtn) => {
    tabBtn.addEventListener('click', () => {
      root.querySelectorAll('.tab').forEach((t) => t.classList.remove('tab--active'));
      root.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('tab-panel--active'));
      tabBtn.classList.add('tab--active');
      root.querySelector(`[data-panel="${tabBtn.dataset.tab}"]`).classList.add('tab-panel--active');
    });
  });
}

function splitList(raw) {
  return (raw || '').split('،').join(',').split(',').map((t) => t.trim()).filter(Boolean);
}

function readForm(formEl) {
  formEl.querySelectorAll('input[data-money]').forEach(input => { input.value = normalizeNumericString(input.value); });
  const fd = new FormData(formEl);
  const data = {};
  for (const [key, val] of fd.entries()) data[key] = val === '' ? null : val;
  ['budgetMin', 'budgetMax', 'desiredMeterage', 'desiredBedrooms'].forEach((f) => {
    data[f] = data[f] === null ? null : (['budgetMin','budgetMax'].includes(f) ? numericValue(data[f]) : Number(data[f]));
  });
  data.desiredAreas = splitList(fd.get('desiredAreas'));
  data.requiredFeatures = splitList(fd.get('requiredFeatures'));
  data.tags = splitList(fd.get('tags'));
  data.lastContact = fd.get('lastContact') || null;
  data.nextFollowup = fd.get('nextFollowup') || null;
  return data;
}

function validateCustomer(data) {
  const errors = [];
  if (!data.name) errors.push('نام مشتری اجباری است.');
  if (!data.phone || !/^09\d{9}$/.test(data.phone)) errors.push('شمارهٔ موبایل معتبر نیست (مثال: 09121234567).');
  if (data.budgetMin !== null && data.budgetMax !== null && data.budgetMin > data.budgetMax) {
    errors.push('بودجهٔ حداقل نمی‌تواند از حداکثر بیشتر باشد.');
  }
  return errors;
}

async function openCustomerForm(existing, onSaved) {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = customerFormTemplate(existing || {});
  const form = wrapper.querySelector('#customer-form');
  wireTabs(wrapper);
  bindMoneyInputs(form);
  mk.syncJalaliDates(wrapper);

  const modal = ui.openModal({
    title: existing ? `ویرایش مشتری: ${existing.name}` : 'ثبت مشتری جدید',
    bodyEl: wrapper,
    size: 'lg',
  });

  wrapper.querySelector('[data-act="cancel"]').addEventListener('click', () => modal.close());

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    mk.syncJalaliDates(wrapper);
    const data = readForm(form);
    const errors = validateCustomer(data);
    if (errors.length) {
      ui.toast(errors[0], 'error');
      return;
    }
    try {
      if (existing?.id) {
        await db.customers.update(existing.id, data);
        ui.toast('اطلاعات مشتری بروزرسانی شد.', 'success');
      } else {
        await db.customers.add(data);
        ui.toast('مشتری با موفقیت ثبت شد.', 'success');
      }
      modal.close();
      onSaved();
    } catch (err) {
      ui.toast('ثبت مشتری با خطا مواجه شد: ' + err.message, 'error');
    }
  });
}

function customerDetailModal(c) {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = `
    <div class="detail-grid">
      <div><b>نام:</b> ${c.name}</div>
      <div><b>تماس:</b> ${c.phone}</div>
      <div><b>نوع:</b> ${CUSTOMER_TYPES[c.type] || 'نامشخص'}</div>
      <div><b>وضعیت:</b> ${CUSTOMER_STATUS[c.status] || 'نامشخص'}</div>
      <div><b>بودجه:</b> ${fmt(c.budgetMin, ' تومان')} تا ${fmt(c.budgetMax, ' تومان')}</div>
      <div><b>محدوده:</b> ${(c.desiredAreas || []).join('، ') || 'نامشخص'}</div>
      <div><b>متراژ موردنظر:</b> ${fmt(c.desiredMeterage, ' متر')}</div>
      <div><b>خواب موردنظر:</b> ${fmt(c.desiredBedrooms)}</div>
      <div><b>امکانات موردنیاز:</b> ${(c.requiredFeatures || []).join('، ') || 'ندارد'}</div>
      <div><b>آخرین تماس:</b> ${c.lastContact ? jalali.formatJalali(c.lastContact) : 'نامشخص'}</div>
      <div><b>پیگیری بعدی:</b> ${c.nextFollowup ? jalali.formatJalali(c.nextFollowup) : 'نامشخص'}</div>
      <div class="detail-grid__full"><b>برچسب‌ها:</b> ${(c.tags || []).join('، ') || 'ندارد'}</div>
      <div class="detail-grid__full"><b>توضیحات:</b> ${fmt(c.description)}</div>
      <div class="detail-grid__full"><b>ثبت‌شده:</b> ${jalali.formatJalaliDateTime(c.createdAt)}</div>
    </div>
    <p class="hint">بازدیدها، پیگیری‌ها، تماس‌ها و پیشنهاد فایل به این مشتری در ماژول‌های Visits/Followups (Priority 2) به این پروفایل متصل می‌شوند.</p>
  `;
  ui.openModal({ title: `پروفایل مشتری: ${c.name}`, bodyEl: wrapper, size: 'lg' });
}

function customerRowTemplate(c) {
  return `
    <tr data-id="${c.id}">
      <td>${c.name}</td>
      <td>${c.phone}</td>
      <td>${CUSTOMER_TYPES[c.type] || 'نامشخص'}</td>
      <td>${fmt(c.budgetMin, ' تومان')} - ${fmt(c.budgetMax, ' تومان')}</td>
      <td>${(c.desiredAreas || []).join('، ') || 'نامشخص'}</td>
      <td><span class="badge badge--${c.status || 'active'}">${CUSTOMER_STATUS[c.status] || 'نامشخص'}</span></td>
      <td class="row-actions">
        <button data-act="view">مشاهده</button>
        <button data-act="edit">ویرایش</button>
        <button data-act="delete" class="danger">حذف</button>
      </td>
    </tr>
  `;
}

let _customersCache = [];
let _activeStatus = 'all';

async function renderCustomers(container, opts = {}) {
  ui.renderLoading(container, 'در حال بارگذاری مشتری‌ها...');
  try {
    _customersCache = (await db.customers.getAll()).map(normalizeCustomerStatus);
    // Migrate only the old status label; all other customer data remains untouched.
    for (const c of _customersCache) {
      const old = await db.customers.get(c.id);
      if (old && old.status !== c.status) await db.customers.update(c.id, { status: c.status });
    }
  } catch (err) {
    ui.renderError(container, 'بارگذاری مشتری‌ها با خطا مواجه شد.', () => renderCustomers(container));
    return;
  }

  container.innerHTML = `
    <div class="page-header">
      <h1>مشتری‌ها</h1>
      <button class="btn btn--primary" id="new-customer-btn">+ ثبت مشتری جدید</button>
    </div>

    <div class="chip-row">
      <button class="chip ${_activeStatus === 'all' ? 'chip--active' : ''}" data-status="all">همه</button>
      ${Object.entries(CUSTOMER_STATUS).map(([k, l]) => `<button class="chip ${k === _activeStatus ? 'chip--active' : ''}" data-status="${k}">${l}</button>`).join('')}
    </div>

    <div class="table-toolbar">
      <input type="search" id="customer-search" placeholder="جستجو در نام یا شماره تماس..." class="search-input">
      <span class="table-toolbar__count"></span>
    </div>

    <div class="table-wrap">
      <table class="data-table">
        <thead><tr><th>نام</th><th>تماس</th><th>نوع</th><th>بودجه</th><th>محدوده</th><th>وضعیت</th><th></th></tr></thead>
        <tbody id="customers-tbody"></tbody>
      </table>
    </div>
  `;

  container.querySelector('#new-customer-btn').addEventListener('click', () => openCustomerForm(null, () => renderCustomers(container)));
  container.querySelectorAll('[data-status]').forEach((chip) => {
    chip.addEventListener('click', () => {
      _activeStatus = chip.dataset.status;
      renderCustomers(container);
    });
  });

  const searchInput = container.querySelector('#customer-search');
  searchInput.addEventListener('input', () => renderTable());

  function renderTable() {
    let list = _customersCache;
    if (_activeStatus !== 'all') list = list.filter((c) => c.status === _activeStatus);
    const q = searchInput.value.trim();
    if (q) list = list.filter((c) => c.name.includes(q) || (c.phone || '').includes(q));

    const tbody = container.querySelector('#customers-tbody');
    container.querySelector('.table-toolbar__count').textContent = `${list.length.toLocaleString('fa-IR')} مشتری`;
    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="7"><div class="state state--empty state--inline"><h3>مشتری‌ای پیدا نشد</h3></div></td></tr>`;
      return;
    }
    tbody.innerHTML = list.map(customerRowTemplate).join('');
    tbody.querySelectorAll('tr').forEach((row) => {
      const id = Number(row.dataset.id);
      const customer = list.find((c) => c.id === id);
      row.querySelector('[data-act="view"]').addEventListener('click', () => customerDetailModal(customer));
      row.querySelector('[data-act="edit"]').addEventListener('click', () => openCustomerForm(customer, () => renderCustomers(container)));
      row.querySelector('[data-act="delete"]').addEventListener('click', async () => {
        const ok = await ui.confirmDialog(`مشتری «${customer.name}» حذف شود؟`);
        if (!ok) return;
        await db.customers.remove(id);
        ui.toast('مشتری حذف شد.', 'success');
        renderCustomers(container);
      });
    });
  }

  renderTable();
  if (opts.action === 'new') openCustomerForm(null, () => renderCustomers(container));
}

window.customersModule = {
  renderCustomers,
  openCustomerForm,
  customerDetailModal,
  getCache: () => _customersCache,
  CUSTOMER_TYPES, CUSTOMER_STATUS,
};
