/**
 * properties.js
 * ---------------------------------------------------------------------------
 * مدیریت فایل‌های ملکی — بخش‌های ۴، ۵، ۱۴، ۲۵، ۴۱، ۴۲ سند.
 * فرم به تب‌های «اطلاعات پایه / موقعیت / مشخصات ساختمان / قیمت / مالک /
 * امکانات / رسانه / توضیحات / دسته‌بندی» تقسیم شده (بخش ۴۲).
 * هر فیلدی که کاربر پر نکند مقدار null می‌گیرد و «نامشخص» نمایش داده می‌شود
 * (بخش ۳۷) — هرگز حدس زده نمی‌شود.
 */

const DEAL_TYPES = { sale: 'فروش', rent: 'اجاره' };
const FILE_TYPES = { package: 'پکیج', presale: 'پیش‌فروش', demolition: 'کلنگی', exchange: 'معاوضه', villa: 'ویلایی', apartment: 'آپارتمان', complex: 'مجتمع' };
const DOC_TYPES = { six_dong: 'شش‌دانگ', legal: 'قولنامه‌ای', endowment: 'وقفی', partnership: 'مشاع' };
const COOLING_TYPES = { split: 'اسپلیت', duct: 'کولر آبی/گازی داکت', central: 'مرکزی', unknown: 'نامشخص' };
const HEATING_TYPES = { package: 'پکیج', engine_room: 'موتورخانه', unknown: 'نامشخص' };
const CATEGORIES = {
  all: 'همه', sale: 'فروش', rent: 'اجاره', premium: 'ممتاز', underprice: 'زیر قیمت',
  presale: 'پیش‌فروش', exchange: 'معاوضه', new: 'جدید', followed: 'پیگیری‌شده',
  sold: 'فروخته‌شده', archived: 'خارج‌شده', needs_review: 'نیازمند بررسی',
};
const STATUS_LABELS = { active: 'فعال', sold: 'فروخته‌شده', archived: 'خارج‌شده', needs_review: 'نیازمند بررسی' };

const BOOL_FEATURES = [
  ['hasElevator', 'آسانسور'], ['hasStorage', 'انباری'], ['hasParking', 'پارکینگ'],
  ['hasTerrace', 'تراس'], ['isRenovated', 'بازسازی'], ['hasPool', 'استخر'],
  ['hasSauna', 'سونا'], ['hasJacuzzi', 'جکوزی'], ['hasClubhouse', 'سالن اجتماعات'],
  ['hasGym', 'سالن ورزش'], ['hasRoofGarden', 'روف گاردن'], ['hasLobby', 'لابی'],
  ['hasSmartSystem', 'سیستم هوشمند'],
];

function fmt(value, unit = '') {
  if (value === null || value === undefined || value === '') return '<span class="unknown">نامشخص</span>';
  if (typeof value === 'number') return `${formatGroupedNumber(value)}${unit}`;
  return `${value}${unit}`;
}

function propertyFormTemplate(p = {}) {
  const v = (key, def = '') => (p[key] !== undefined && p[key] !== null ? p[key] : def);
  const checked = (key) => (p[key] ? 'checked' : '');
  const selected = (key, val) => (v(key) === val ? 'selected' : '');

  return `
    <form class="tabbed-form" id="property-form">
      <div class="tabs" role="tablist">
        <button type="button" class="tab tab--active" data-tab="basic">اطلاعات پایه</button>
        <button type="button" class="tab" data-tab="location">موقعیت</button>
        <button type="button" class="tab" data-tab="building">مشخصات ساختمان</button>
        <button type="button" class="tab" data-tab="price">قیمت</button>
        <button type="button" class="tab" data-tab="owner">مالک</button>
        <button type="button" class="tab" data-tab="features">امکانات</button>
        <button type="button" class="tab" data-tab="media">رسانه</button>
        <button type="button" class="tab" data-tab="notes">توضیحات</button>
        <button type="button" class="tab" data-tab="category">دسته‌بندی</button>
      </div>

      <div class="tab-panel tab-panel--active" data-panel="basic">
        <label>نوع معامله *
          <select name="dealType">
            ${Object.entries(DEAL_TYPES).map(([k, l]) => `<option value="${k}" ${selected('dealType', k)}>${l}</option>`).join('')}
          </select>
        </label>
        <label>نوع فایل
          <select name="fileType">
            ${Object.entries(FILE_TYPES).map(([k, l]) => `<option value="${k}" ${selected('fileType', k)}>${l}</option>`).join('')}
          </select>
        </label>
        <label>وضعیت فایل
          <select name="status">
            ${Object.entries(STATUS_LABELS).map(([k, l]) => `<option value="${k}" ${selected('status', k)}>${l}</option>`).join('')}
          </select>
        </label>
        <label>منبع فایل <input name="source" value="${v('source')}" placeholder="مثلاً معرفی مالک، تماس، آگهی"></label>
      </div>

      <div class="tab-panel" data-panel="location">
        <label>موقعیت <span class="required-star">*</span> <input name="district" value="${v('district')}" required></label>
        <label>محله <input name="neighborhood" value="${v('neighborhood')}"></label>
        <label>خیابان <input name="street" value="${v('street')}"></label>
        <label>کوچه <input name="alley" value="${v('alley')}"></label>
        <label>آدرس عمومی <input name="publicAddress" value="${v('publicAddress')}"></label>
        <label>آدرس دقیق (خصوصی — هرگز به مشتری ارسال نمی‌شود) <input name="privateAddress" value="${v('privateAddress')}"></label>
      </div>

      <div class="tab-panel" data-panel="building">
        <label>متراژ کل <span class="required-star">*</span> <input name="totalArea" type="number" min="0" value="${v('totalArea')}" required></label>
        <label>متراژ سالن <input name="livingRoomArea" type="number" min="0" value="${v('livingRoomArea')}"></label>
        <label>متراژ اتاق <input name="bedroomArea" type="number" min="0" value="${v('bedroomArea')}"></label>
        <label>متراژ انباری <input name="storageArea" type="number" min="0" value="${v('storageArea')}"></label>
        <label>تعداد خواب <input name="bedrooms" type="number" min="0" value="${v('bedrooms')}"></label>
        <label>تعداد واحد <input name="unitsCount" type="number" min="0" value="${v('unitsCount')}"></label>
        <label>طبقه <input name="floor" type="number" value="${v('floor')}"></label>
        <label>تعداد طبقات <input name="totalFloors" type="number" min="0" value="${v('totalFloors')}"></label>
        <label>سال ساخت <input name="yearBuilt" type="number" min="1300" max="1420" value="${v('yearBuilt')}"></label>
        <label>تعداد پارکینگ <input name="parkingCount" type="number" min="0" value="${v('parkingCount')}"></label>
        <label>نوع سند
          <select name="documentType">
            <option value="">نامشخص</option>
            ${Object.entries(DOC_TYPES).map(([k, l]) => `<option value="${k}" ${selected('documentType', k)}>${l}</option>`).join('')}
          </select>
        </label>
        <label>نوع سرمایش
          <select name="coolingType">
            <option value="">نامشخص</option>
            ${Object.entries(COOLING_TYPES).map(([k, l]) => `<option value="${k}" ${selected('coolingType', k)}>${l}</option>`).join('')}
          </select>
        </label>
        <label>نوع گرمایش
          <select name="heatingType">
            <option value="">نامشخص</option>
            ${Object.entries(HEATING_TYPES).map(([k, l]) => `<option value="${k}" ${selected('heatingType', k)}>${l}</option>`).join('')}
          </select>
        </label>
      </div>

      <div class="tab-panel" data-panel="price">
        <label>قیمت <span class="required-star">*</span> <input name="totalPrice" type="text" inputmode="numeric" data-money maxlength="15" value="${v('totalPrice')}" required></label>
        <label>قیمت هر متر (تومان) <input name="pricePerMeter" type="text" inputmode="numeric" data-money maxlength="15" value="${v('pricePerMeter')}"></label>
        <label>ودیعه (تومان) <input name="deposit" type="text" inputmode="numeric" data-money maxlength="15" value="${v('deposit')}"></label>
        <label>اجارهٔ ماهانه (تومان) <input name="monthlyRent" type="text" inputmode="numeric" data-money maxlength="15" value="${v('monthlyRent')}"></label>
        <p class="hint">برای فایل «فروش» فیلد قیمت کل، و برای «اجاره» ودیعه/اجاره پر شود. بقیه می‌تواند نامشخص بماند.</p>
      </div>

      <div class="tab-panel" data-panel="owner">
        <label>مالک <span class="required-star">*</span> <input name="ownerName" value="${v('ownerName')}" required></label>
        <label>شماره مالک <input name="ownerPhone" value="${v('ownerPhone')}" placeholder="0912xxxxxxx"></label>
        <p class="hint">این اطلاعات Private است و هرگز در کارت عمومی ارسال به مشتری نمایش داده نمی‌شود (بخش ۱۳ سند).</p>
      </div>

      <div class="tab-panel" data-panel="features">
        <div class="checkbox-grid">
          ${BOOL_FEATURES.map(([key, label]) => `
            <label class="checkbox-item">
              <input type="checkbox" name="${key}" ${checked(key)}> ${label}
            </label>
          `).join('')}
        </div>
      </div>

      <div class="tab-panel" data-panel="media">
        <label>افزودن عکس (چند فایل قابل انتخاب)
          <input type="file" id="media-input" accept="image/*" multiple>
        </label>
        <div class="media-preview" id="media-preview"></div>
        <p class="hint">عکس‌ها همین حالا در دیتابیس آفلاین ذخیره و در بکاپ منتقل می‌شوند؛ برای نسخه آنلاین همین بخش بعداً به فضای ذخیره‌سازی Cloud متصل می‌شود. فیلم و تور ۳۶۰ در فاز بعدی.</p>
      </div>

      <div class="tab-panel" data-panel="notes">
        <label>توضیحات
          <textarea name="description" rows="6">${v('description')}</textarea>
        </label>
      </div>

      <div class="tab-panel" data-panel="category">
        <label>دسته‌بندی
          <select name="category">
            ${Object.entries(CATEGORIES).filter(([k]) => k !== 'all').map(([k, l]) => `<option value="${k}" ${selected('category', k)}>${l}</option>`).join('')}
          </select>
        </label>
        <label>برچسب‌ها (با ویرگول جدا کنید) <input name="tags" value="${(p.tags || []).join('، ')}"></label>
      </div>

      <footer class="form-footer">
        <button type="button" class="btn btn--ghost" data-act="cancel">انصراف</button>
        <button type="submit" class="btn btn--primary">${p.id ? 'ذخیرهٔ تغییرات' : 'ثبت فایل'}</button>
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

function readForm(formEl, existingMedia = []) {
  const fd = new FormData(formEl);
  const numberFields = [
    'totalArea', 'livingRoomArea', 'bedroomArea', 'storageArea', 'bedrooms',
    'unitsCount', 'floor', 'totalFloors', 'yearBuilt', 'parkingCount',
    'totalPrice', 'pricePerMeter', 'deposit', 'monthlyRent',
  ];
  const data = {};
  for (const [key, val] of fd.entries()) {
    if (BOOL_FEATURES.some(([k]) => k === key)) continue;
    if (key === 'tags') continue;
    data[key] = val === '' ? null : val;
  }
  numberFields.forEach((f) => {
    data[f] = data[f] === null || data[f] === undefined ? null : (['totalPrice','pricePerMeter','deposit','monthlyRent'].includes(f) ? numericValue(data[f]) : Number(data[f]));
  });
  BOOL_FEATURES.forEach(([key]) => {
    data[key] = formEl.querySelector(`[name="${key}"]`).checked;
  });
  data.tags = (fd.get('tags') || '')
    .split('،').join(',')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
  data.media = existingMedia;
  return data;
}

function validateProperty(data) {
  const errors = [];
  if (!data.district) errors.push('موقعیت اجباری است.');
  if (!data.totalArea || data.totalArea <= 0) errors.push('مشخصات ساختمان / متراژ اجباری است.');
  if (data.totalPrice === null || data.totalPrice === undefined || data.totalPrice === '' || Number(data.totalPrice) <= 0) errors.push('قیمت اجباری است.');
  if (!data.ownerName) errors.push('مالک اجباری است.');
  if (data.dealType === 'sale' && data.totalPrice !== null && data.totalPrice < 0) errors.push('قیمت کل نامعتبر است.');
  if (data.dealType === 'rent' && ((data.deposit !== null && data.deposit < 0) || (data.monthlyRent !== null && data.monthlyRent < 0))) {
    errors.push('ودیعه/اجاره نمی‌تواند منفی باشد.');
  }
  if (data.yearBuilt !== null && (data.yearBuilt < 1300 || data.yearBuilt > 1420)) errors.push('سال ساخت نامعتبر است.');
  return errors;
}

function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      if (!file || !file.type.startsWith('image/')) return reject(new Error('فقط فایل تصویری مجاز است.'));
      if (file.size > 12 * 1024 * 1024) return reject(new Error('حجم هر عکس نباید بیشتر از ۱۲ مگابایت باشد.'));
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('خواندن عکس انجام نشد.'));
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const max = 2400;
          const scale = Math.min(1, max / Math.max(img.width, img.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(img.width * scale));
          canvas.height = Math.max(1, Math.round(img.height * scale));
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          // JPEG/WebP keeps offline DB + future cloud sync manageable.
          const compressed = canvas.toDataURL('image/jpeg', 0.86);
          resolve(compressed);
        };
        img.onerror = () => reject(new Error('فرمت عکس قابل پردازش نیست.'));
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
}

async function createPropertyMatchNotifications(property) {
  if (!property || property.status === 'sold' || property.status === 'archived') return;
  const customers = await db.customers.getAll();
  const wanted = customers.filter(c => ['buy_wanted','rent_wanted'].includes(c.status));
  const isRent = property.dealType === 'rent';
  const compatible = wanted.filter(c => (isRent ? c.status === 'rent_wanted' : c.status === 'buy_wanted'));
  const matches = [];
  for (const c of compatible) {
    let score = 0;
    const reasons = [];
    const min = Number(c.budgetMin || 0), max = Number(c.budgetMax || 0);
    const price = isRent ? Number(property.monthlyRent || 0) : Number(property.totalPrice || 0);
    if (max > 0 && price > 0) {
      if (price >= min && price <= max) { score += 45; reasons.push('بودجه'); }
      else if (price <= max * 1.1) { score += 20; reasons.push('نزدیک بودجه'); }
    }
    const area = Number(c.desiredMeterage || 0), pa = Number(property.totalArea || 0);
    if (area > 0 && pa > 0) {
      const diff = Math.abs(pa-area)/area;
      if (diff <= .15) { score += 30; reasons.push('متراژ'); }
      else if (diff <= .30) { score += 15; reasons.push('متراژ نزدیک'); }
    }
    const beds = Number(c.desiredBedrooms || 0), pb = Number(property.bedrooms || 0);
    if (beds > 0 && pb >= beds) { score += 15; reasons.push('خواب'); }
    const wantedAreas = Array.isArray(c.desiredAreas) ? c.desiredAreas : [];
    const locationText = `${property.district || ''} ${property.neighborhood || ''} ${property.street || ''}`.toLowerCase();
    if (wantedAreas.length && wantedAreas.some(a => locationText.includes(String(a).toLowerCase()))) { score += 20; reasons.push('محدوده'); }
    if (score >= 50) matches.push({ customer:c, score, reasons });
  }
  for (const m of matches.slice(0, 12)) {
    const exists = (await db.notifications.getAll()).some(n => n.type === 'property_match' && Number(n.propertyId) === Number(property.id) && Number(n.customerId) === Number(m.customer.id) && new Date(n.date).getTime() > Date.now() - 24*60*60*1000);
    if (exists) continue;
    await db.notifications.add({
      type:'property_match', propertyId:property.id, customerId:m.customer.id,
      read:false, date:new Date().toISOString(),
      text:`تطبیق جدید: فایل ${property.code || property.id} برای ${m.customer.name} (${m.score}% — ${m.reasons.join('، ')})`
    });
  }
  if (matches.length) ui.toast(`برای ${matches.length} مشتری، تطبیق مناسب با این فایل پیدا شد.`, 'success');
}

async function openPropertyForm(existing, onSaved) {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = propertyFormTemplate(existing || {});
  const form = wrapper.querySelector('#property-form');
  wireTabs(wrapper);

  let media = existing?.media ? [...existing.media] : [];
  const mediaPreview = wrapper.querySelector('#media-preview');
  function renderMediaPreview() {
    mediaPreview.innerHTML = media
      .map((src, i) => `<div class="media-thumb"><img src="${src}"><button type="button" data-remove="${i}">حذف</button></div>`)
      .join('') || '<p class="hint">عکسی اضافه نشده.</p>';
    mediaPreview.querySelectorAll('[data-remove]').forEach((btn) => {
      btn.addEventListener('click', () => {
        media.splice(Number(btn.dataset.remove), 1);
        renderMediaPreview();
      });
    });
  }
  renderMediaPreview();

  wrapper.querySelector('#media-input').addEventListener('change', async (e) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      try {
        const src = await fileToDataUrl(file);
        media.push(src);
      } catch (err) {
        console.error(err);
        ui.toast(err.message || 'افزودن عکس انجام نشد.','error');
      }
    }
    e.target.value = '';
    renderMediaPreview();
  });

  const totalPriceInput = form.querySelector('[name="totalPrice"]');
  const perMeterInput = form.querySelector('[name="pricePerMeter"]');
  const areaInput = form.querySelector('[name="totalArea"]');
  const syncPrices = (source) => {
    const area = Number(areaInput?.value || 0);
    if (!area || area <= 0) return;

    const total = moneyToNumber(totalPriceInput);
    const per = moneyToNumber(perMeterInput);

    // قیمت کل همیشه از «متراژ کل × قیمت هر متر» محاسبه می‌شود.
    // اگر کاربر فقط قیمت کل را وارد کند، قیمت هر متر از روی آن محاسبه می‌شود.
    if (source === 'per' && per > 0) {
      totalPriceInput.value = formatGroupedNumber(Math.round(area * per));
      return;
    }

    if (source === 'area') {
      if (per > 0) {
        totalPriceInput.value = formatGroupedNumber(Math.round(area * per));
      } else if (total > 0) {
        perMeterInput.value = formatGroupedNumber(Math.round(total / area));
      }
      return;
    }

    if (source === 'total' && total > 0 && !perMeterInput.value) {
      perMeterInput.value = formatGroupedNumber(Math.round(total / area));
    }
  };
  bindMoneyInputs(form);
  const moneyToNumber = el => numericValue(el?.value) || 0;
  totalPriceInput?.addEventListener('input', () => syncPrices('total'));
  perMeterInput?.addEventListener('input', () => syncPrices('per'));
  areaInput?.addEventListener('input', () => syncPrices('area'));
  syncPrices('area');

  const modal = ui.openModal({
    title: existing ? `ویرایش فایل ${existing.code || ''}` : 'ثبت فایل جدید',
    bodyEl: wrapper,
    size: 'lg',
  });

  wrapper.querySelector('[data-act="cancel"]').addEventListener('click', () => modal.close());

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = readForm(form, media);
    if (data.dealType === 'sale' && data.totalArea > 0) {
      if (data.totalPrice === null && data.pricePerMeter !== null) data.totalPrice = Math.round(data.pricePerMeter * data.totalArea);
      if (data.pricePerMeter === null && data.totalPrice !== null) data.pricePerMeter = Math.round(data.totalPrice / data.totalArea);
    }
    const errors = validateProperty(data);
    if (errors.length) {
      ui.toast(errors[0], 'error');
      return;
    }
    try {
      let savedProperty;
      if (existing?.id) {
        savedProperty = await db.updatePropertyWithHistory(existing.id, data);
        ui.toast('فایل بروزرسانی شد.', 'success');
      } else {
        const all = await db.properties.getAll();
        const maxNum = all.reduce((max, p) => {
          const n = Number((p.code || '').replace('MK-', ''));
          return Number.isFinite(n) && n > max ? n : max;
        }, 1000);
        data.code = `MK-${maxNum + 1}`;
        savedProperty = await db.properties.add(data);
        ui.toast('فایل با موفقیت ثبت شد.', 'success');
      }
      try { await createPropertyMatchNotifications(savedProperty || data); } catch (matchErr) { console.warn('property matching notification', matchErr); }
      modal.close();
      onSaved();
    } catch (err) {
      ui.toast('ثبت فایل با خطا مواجه شد: ' + err.message, 'error');
    }
  });
}

function propertyHistoryModal(property) {
  const wrapper = document.createElement('div');
  const history = property.priceHistory || [];
  wrapper.innerHTML = history.length
    ? `<ul class="history-list">${history
        .slice()
        .reverse()
        .map(
          (h) => `<li>
            <strong>${jalali.formatJalaliDateTime(h.date)}</strong>
            — قیمت از ${fmt(h.oldValue, ' تومان')} به ${fmt(h.newValue, ' تومان')} تغییر کرد
            (${h.changedBy})
          </li>`
        )
        .join('')}</ul>`
    : '<p class="hint">هنوز تغییری در قیمت این فایل ثبت نشده.</p>';
  ui.openModal({ title: `تاریخچهٔ فایل ${property.code}`, bodyEl: wrapper, size: 'md' });
}

function propertyRowTemplate(p) {
  const priceLabel = p.dealType === 'rent'
    ? `ودیعه ${fmt(p.deposit)} / اجاره ${fmt(p.monthlyRent)}`
    : fmt(p.totalPrice, ' تومان');
  return `
    <tr data-id="${p.id}">
      <td>${p.code}</td>
      <td>${DEAL_TYPES[p.dealType] || fmt(p.dealType)}</td>
      <td>${fmt(p.district)}${p.neighborhood ? ' / ' + p.neighborhood : ''}</td>
      <td>${fmt(p.totalArea, ' متر')}</td>
      <td>${fmt(p.bedrooms, ' خواب')}</td>
      <td>${priceLabel}</td>
      <td><span class="badge badge--${p.status || 'active'}">${STATUS_LABELS[p.status] || 'فعال'}</span></td>
      <td class="row-actions">
        <button data-act="view">مشاهده</button>
        <button data-act="edit">ویرایش</button>
        <button data-act="history">تاریخچه</button>
        <button data-act="delete" class="danger">حذف</button>
      </td>
    </tr>
  `;
}

function propertyDetailModal(p) {
  const wrapper = document.createElement('div');
  wrapper.className = 'detail-view';
  wrapper.innerHTML = `
    <div class="detail-grid">
      <div><b>کد:</b> ${p.code}</div>
      <div><b>نوع معامله:</b> ${DEAL_TYPES[p.dealType] || '-'}</div>
      <div><b>نوع فایل:</b> ${FILE_TYPES[p.fileType] || 'نامشخص'}</div>
      <div><b>منطقه:</b> ${fmt(p.district)}</div>
      <div><b>محله:</b> ${fmt(p.neighborhood)}</div>
      <div><b>خیابان:</b> ${fmt(p.street)}</div>
      <div><b>کوچه:</b> ${fmt(p.alley)}</div>
      <div><b>متراژ کل:</b> ${fmt(p.totalArea, ' متر')}</div>
      <div><b>متراژ سالن:</b> ${fmt(p.livingRoomArea, ' متر')}</div>
      <div><b>متراژ انباری:</b> ${fmt(p.storageArea, ' متر')}</div>
      <div><b>تعداد خواب:</b> ${fmt(p.bedrooms)}</div>
      <div><b>تعداد واحد:</b> ${fmt(p.unitsCount)}</div>
      <div><b>طبقه:</b> ${fmt(p.floor)} از ${fmt(p.totalFloors)}</div>
      <div><b>سال ساخت:</b> ${fmt(p.yearBuilt)}</div>
      <div><b>نوع سند:</b> ${DOC_TYPES[p.documentType] || 'نامشخص'}</div>
      <div><b>سرمایش:</b> ${COOLING_TYPES[p.coolingType] || 'نامشخص'}</div>
      <div><b>گرمایش:</b> ${HEATING_TYPES[p.heatingType] || 'نامشخص'}</div>
      <div><b>قیمت کل:</b> ${fmt(p.totalPrice, ' تومان')}</div>
      <div><b>قیمت هر متر:</b> ${fmt(p.pricePerMeter, ' تومان')}</div>
      <div><b>ودیعه:</b> ${fmt(p.deposit, ' تومان')}</div>
      <div><b>اجاره ماهانه:</b> ${fmt(p.monthlyRent, ' تومان')}</div>
      <div><b>مالک:</b> ${fmt(p.ownerName)}</div>
      <div><b>شماره مالک:</b> ${fmt(p.ownerPhone)}</div>
      <div class="detail-grid__full"><b>امکانات:</b> ${BOOL_FEATURES.filter(([k]) => p[k]).map(([, l]) => l).join('، ') || 'ثبت نشده'}</div>
      <div class="detail-grid__full"><b>برچسب‌ها:</b> ${(p.tags || []).join('، ') || 'ندارد'}</div>
      <div class="detail-grid__full"><b>توضیحات:</b> ${fmt(p.description)}</div>
      <div class="detail-grid__full"><b>ثبت‌شده:</b> ${jalali.formatJalaliDateTime(p.createdAt)} — <b>آخرین بروزرسانی:</b> ${jalali.formatJalaliDateTime(p.updatedAt)}</div>
    </div>
    ${p.media && p.media.length ? `<div class="media-preview">${p.media.map((m) => `<div class="media-thumb"><img src="${m}"></div>`).join('')}</div>` : ''}
  `;
  ui.openModal({ title: `مشاهدهٔ فایل ${p.code}`, bodyEl: wrapper, size: 'lg' });
}

let _propertiesCache = [];
let _activeCategory = 'all';
let _sortKey = 'createdAt';
let _sortDir = 'desc';

function applyFilters(list) {
  let result = list;
  if (_activeCategory !== 'all') {
    result = result.filter((p) => p.category === _activeCategory || p.dealType === _activeCategory || p.status === _activeCategory);
  }
  result = result.slice().sort((a, b) => {
    const av = a[_sortKey] ?? '';
    const bv = b[_sortKey] ?? '';
    const cmp = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv), 'fa');
    return _sortDir === 'asc' ? cmp : -cmp;
  });
  return result;
}

async function renderProperties(container, opts = {}) {
  ui.renderLoading(container, 'در حال بارگذاری فایل‌ها...');
  try {
    _propertiesCache = await db.properties.getAll();
  } catch (err) {
    ui.renderError(container, 'بارگذاری فایل‌ها با خطا مواجه شد.', () => renderProperties(container));
    return;
  }

  container.innerHTML = `
    <div class="page-header">
      <h1>فایل‌های ملکی</h1>
      <button class="btn btn--primary" id="new-property-btn">+ ثبت فایل جدید</button>
    </div>

    <div class="chip-row" id="category-chips">
      ${Object.entries(CATEGORIES).map(([k, l]) => `<button class="chip ${k === _activeCategory ? 'chip--active' : ''}" data-cat="${k}">${l}</button>`).join('')}
    </div>

    <div class="table-toolbar">
      <label>مرتب‌سازی
        <select id="sort-key">
          <option value="createdAt">تاریخ ثبت</option>
          <option value="totalPrice">قیمت</option>
          <option value="totalArea">متراژ</option>
          <option value="bedrooms">تعداد خواب</option>
        </select>
      </label>
      <button class="btn btn--ghost" id="sort-dir">${_sortDir === 'asc' ? '⬆ صعودی' : '⬇ نزولی'}</button>
      <span class="table-toolbar__count"></span>
    </div>

    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>کد</th><th>نوع معامله</th><th>موقعیت</th><th>متراژ</th><th>خواب</th><th>قیمت</th><th>وضعیت</th><th></th>
          </tr>
        </thead>
        <tbody id="properties-tbody"></tbody>
      </table>
    </div>
  `;

  container.querySelector('#sort-key').value = _sortKey;
  container.querySelector('#new-property-btn').addEventListener('click', () => openPropertyForm(null, () => renderProperties(container)));

  container.querySelectorAll('[data-cat]').forEach((chip) => {
    chip.addEventListener('click', () => {
      _activeCategory = chip.dataset.cat;
      renderProperties(container);
    });
  });

  container.querySelector('#sort-key').addEventListener('change', (e) => {
    _sortKey = e.target.value;
    renderTable();
  });
  container.querySelector('#sort-dir').addEventListener('click', () => {
    _sortDir = _sortDir === 'asc' ? 'desc' : 'asc';
    renderProperties(container);
  });

  function renderTable() {
    const list = applyFilters(_propertiesCache);
    const tbody = container.querySelector('#properties-tbody');
    container.querySelector('.table-toolbar__count').textContent = `${list.length.toLocaleString('fa-IR')} فایل`;
    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="8"><div class="state state--empty state--inline"><h3>فایلی پیدا نشد</h3><p>در این دسته هنوز فایلی ثبت نشده.</p></div></td></tr>`;
      return;
    }
    tbody.innerHTML = list.map(propertyRowTemplate).join('');
    tbody.querySelectorAll('tr').forEach((row) => {
      const id = Number(row.dataset.id);
      const property = list.find((p) => p.id === id);
      row.querySelector('[data-act="view"]').addEventListener('click', () => propertyDetailModal(property));
      row.querySelector('[data-act="edit"]').addEventListener('click', () => openPropertyForm(property, () => renderProperties(container)));
      row.querySelector('[data-act="history"]').addEventListener('click', () => propertyHistoryModal(property));
      row.querySelector('[data-act="delete"]').addEventListener('click', async () => {
        const ok = await ui.confirmDialog(`فایل ${property.code} حذف شود؟ این عملیات قابل بازگشت نیست.`);
        if (!ok) return;
        await db.properties.remove(id);
        await db.logActivity({ entityType: 'property', entityId: id, action: 'delete' });
        ui.toast('فایل حذف شد.', 'success');
        renderProperties(container);
      });
    });
  }

  renderTable();

  if (opts.action === 'new') openPropertyForm(null, () => renderProperties(container));
}

window.propertiesModule = {
  renderProperties,
  openPropertyForm,
  propertyDetailModal,
  getCache: () => _propertiesCache,
  CATEGORIES, DEAL_TYPES, STATUS_LABELS, BOOL_FEATURES,
};
