/**
 * search.js
 * ---------------------------------------------------------------------------
 * دو قابلیت بخش ۸ و ۴۳ سند:
 * ۱) جستجوی سریع در Header — می‌تواند به مشتری، فایل (با کد)، یا جستجوی
 *    ترکیبی هوشمند برود.
 * ۲) صفحهٔ جستجوی پیشرفته با تمام فیلدهای بخش ۸ + پشتیبانی از عبارت آزاد مثل
 *    «سه خواب قصرالدشت ۱۵ تا ۲۰ میلیارد با آسانسور و پارکینگ».
 *
 * توجه: این یک Parser مبتنی بر Regex و کلیدواژه است، نه NLU واقعی مبتنی بر
 * مدل زبانی. طبق قانون بخش ۴۹ سند، تشخیص هوشمندِ زبان طبیعیِ کامل (بخش ۶، ۱۱،
 * ۳۸) نیازمند اتصال به یک AI API واقعی است و در Priority 4 پیاده می‌شود. آنچه
 * اینجا هست صرفاً یک فیلتر ترکیبی قانون‌محور برای Priority 1 است.
 */

const PERSIAN_NUMBER_WORDS = {
  یک: 1, دو: 2, سه: 3, چهار: 4, پنج: 5, شش: 6, هفت: 7, هشت: 8, نه: 9, ده: 10,
};

const KEYWORD_FLAGS = {
  آسانسور: 'hasElevator', پارکینگ: 'hasParking', انباری: 'hasStorage',
  تراس: 'hasTerrace', بازسازی: 'isRenovated', استخر: 'hasPool',
  سونا: 'hasSauna', جکوزی: 'hasJacuzzi', لابی: 'hasLobby',
};

function normalizeDigits(str) {
  const fa = '۰۱۲۳۴۵۶۷۸۹';
  return str.replace(/[۰-۹]/g, (d) => String(fa.indexOf(d)));
}

/** عبارت آزاد فارسی را به یک شیء فیلتر ساختاریافته تبدیل می‌کند */
function parseFreeText(rawText) {
  const text = normalizeDigits(rawText || '').trim();
  const filter = { keywords: [], flags: [] };

  // تعداد خواب: هم عدد و هم کلمهٔ فارسی
  const bedroomDigit = text.match(/(\d+)\s*خواب/);
  if (bedroomDigit) {
    filter.bedrooms = Number(bedroomDigit[1]);
  } else {
    for (const [word, num] of Object.entries(PERSIAN_NUMBER_WORDS)) {
      if (text.includes(`${word} خواب`)) {
        filter.bedrooms = num;
        break;
      }
    }
  }

  // بازهٔ قیمت: «۱۵ تا ۲۰ میلیارد» یا «۵۰۰ میلیون»
  const rangeMatch = text.match(/(\d+(?:\.\d+)?)\s*تا\s*(\d+(?:\.\d+)?)\s*(میلیارد|میلیون)/);
  if (rangeMatch) {
    const mult = rangeMatch[3] === 'میلیارد' ? 1e9 : 1e6;
    filter.minPrice = Number(rangeMatch[1]) * mult;
    filter.maxPrice = Number(rangeMatch[2]) * mult;
  } else {
    const singleMatch = text.match(/(\d+(?:\.\d+)?)\s*(میلیارد|میلیون)/);
    if (singleMatch) {
      const mult = singleMatch[2] === 'میلیارد' ? 1e9 : 1e6;
      filter.maxPrice = Number(singleMatch[1]) * mult;
    }
  }

  // ویژگی‌های بولی
  Object.entries(KEYWORD_FLAGS).forEach(([word, flag]) => {
    if (text.includes(word)) filter.flags.push(flag);
  });

  // باقیماندهٔ متن به‌عنوان کلیدواژهٔ مکان/متن آزاد (منطقه، محله و ...)
  let remainder = text
    .replace(/(\d+(?:\.\d+)?)\s*تا\s*(\d+(?:\.\d+)?)\s*(میلیارد|میلیون)/g, '')
    .replace(/(\d+(?:\.\d+)?)\s*(میلیارد|میلیون)/g, '')
    .replace(/\d+\s*خواب/g, '')
    .replace(/با/g, '');
  Object.keys(PERSIAN_NUMBER_WORDS).forEach((w) => { remainder = remainder.replace(`${w} خواب`, ''); });
  Object.keys(KEYWORD_FLAGS).forEach((w) => { remainder = remainder.replace(w, ''); });
  remainder = remainder.replace(/\s+/g, ' ').trim();
  if (remainder) filter.keywords = remainder.split(' ').filter(Boolean);

  return filter;
}

function matchesFreeTextFilter(p, filter) {
  if (filter.bedrooms !== undefined && p.bedrooms !== filter.bedrooms) return false;
  const price = p.dealType === 'rent' ? p.deposit : p.totalPrice;
  if (filter.minPrice !== undefined && (price === null || price < filter.minPrice)) return false;
  if (filter.maxPrice !== undefined && (price === null || price > filter.maxPrice)) return false;
  if (filter.flags?.length && !filter.flags.every((f) => p[f])) return false;
  if (filter.keywords?.length) {
    const haystack = `${p.district || ''} ${p.neighborhood || ''} ${p.street || ''} ${p.description || ''}`;
    if (!filter.keywords.some((k) => haystack.includes(k))) return false;
  }
  return true;
}

/**
 * جستجوی سریع Header (بخش ۴۳ سند):
 *  - «کد 123» → مستقیم به فایل با آن کد
 *  - نام دقیق یک مشتری → به پروفایل آن مشتری
 *  - در غیر این صورت → صفحهٔ جستجوی پیشرفته با پیش‌فرض همان عبارت
 */
async function handleQuickSearch(rawQuery) {
  const query = normalizeDigits(rawQuery || '').trim();
  if (!query) return;

  const codeMatch = query.match(/کد\s*(\d+)/);
  if (codeMatch) {
    const targetCode = `MK-${codeMatch[1]}`;
    const properties = await db.properties.getAll();
    const found = properties.find((p) => p.code === targetCode || p.code === codeMatch[1]);
    if (found) {
      location.hash = '#/properties';
      ui.toast(`فایل ${found.code} پیدا شد.`, 'success');
      setTimeout(() => document.dispatchEvent(new CustomEvent('melkyar:show-property', { detail: found })), 150);
      return;
    }
    ui.toast('فایلی با این کد پیدا نشد.', 'error');
    return;
  }

  const customers = await db.customers.getAll();
  const customerMatch = customers.find((c) => c.name.includes(query));
  if (customerMatch && query.length >= 2) {
    location.hash = '#/customers';
    ui.toast(`مشتری «${customerMatch.name}» پیدا شد.`, 'success');
    setTimeout(() => document.dispatchEvent(new CustomEvent('melkyar:show-customer', { detail: customerMatch })), 150);
    return;
  }

  location.hash = `#/search?q=${encodeURIComponent(query)}`;
}

function advancedFormTemplate(prefill = {}) {
  return `
    <form class="tabbed-form" id="advanced-search-form">
      <div class="filter-grid">
        <label>عبارت آزاد <input name="freeText" value="${prefill.freeText || ''}" placeholder="مثلاً: سه خواب قصرالدشت ۱۵ تا ۲۰ میلیارد با آسانسور و پارکینگ"></label>
        <label>منطقه <input name="district"></label>
        <label>محله <input name="neighborhood"></label>
        <label>حداقل قیمت (تومان) <input name="minPrice" type="text" inputmode="numeric" data-money maxlength="15"></label>
        <label>حداکثر قیمت (تومان) <input name="maxPrice" type="text" inputmode="numeric" data-money maxlength="15"></label>
        <label>حداقل متراژ <input name="minArea" type="number"></label>
        <label>حداکثر متراژ <input name="maxArea" type="number"></label>
        <label>تعداد خواب <input name="bedrooms" type="number"></label>
        <label>حداقل سال ساخت <input name="minYear" type="number"></label>
        <label>مالک <input name="ownerName"></label>
        <label>نوع معامله
          <select name="dealType"><option value="">همه</option><option value="sale">فروش</option><option value="rent">اجاره</option></select>
        </label>
        <label>نوع سند
          <select name="documentType">
            <option value="">همه</option>
            <option value="six_dong">شش‌دانگ</option>
            <option value="legal">قولنامه‌ای</option>
            <option value="endowment">وقفی</option>
            <option value="partnership">مشاع</option>
          </select>
        </label>
      </div>
      <div class="checkbox-grid">
        ${propertiesModule.BOOL_FEATURES.map(([key, label]) => `<label class="checkbox-item"><input type="checkbox" name="${key}"> ${label}</label>`).join('')}
      </div>
      <footer class="form-footer">
        <button type="submit" class="btn btn--primary">جستجو</button>
      </footer>
    </form>
  `;
}

function applyAdvancedFilter(list, criteria) {
  return list.filter((p) => {
    if (criteria.freeText) {
      const parsed = parseFreeText(criteria.freeText);
      if (!matchesFreeTextFilter(p, parsed)) return false;
    }
    if (criteria.district && !(p.district || '').includes(criteria.district)) return false;
    if (criteria.neighborhood && !(p.neighborhood || '').includes(criteria.neighborhood)) return false;
    if (criteria.minPrice && (p.totalPrice ?? -Infinity) < Number(criteria.minPrice)) return false;
    if (criteria.maxPrice && (p.totalPrice ?? Infinity) > Number(criteria.maxPrice)) return false;
    if (criteria.minArea && (p.totalArea ?? -Infinity) < Number(criteria.minArea)) return false;
    if (criteria.maxArea && (p.totalArea ?? Infinity) > Number(criteria.maxArea)) return false;
    if (criteria.bedrooms && p.bedrooms !== Number(criteria.bedrooms)) return false;
    if (criteria.minYear && (p.yearBuilt ?? -Infinity) < Number(criteria.minYear)) return false;
    if (criteria.ownerName && !(p.ownerName || '').includes(criteria.ownerName)) return false;
    if (criteria.dealType && p.dealType !== criteria.dealType) return false;
    if (criteria.documentType && p.documentType !== criteria.documentType) return false;
    for (const [key] of propertiesModule.BOOL_FEATURES) {
      if (criteria[key] && !p[key]) return false;
    }
    return true;
  });
}

async function renderSearchPage(container, opts = {}) {
  container.innerHTML = `
    <div class="page-header"><h1>جستجوی پیشرفته</h1></div>
    <div id="advanced-form-host"></div>
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr><th>کد</th><th>نوع معامله</th><th>موقعیت</th><th>متراژ</th><th>خواب</th><th>قیمت</th><th></th></tr></thead>
        <tbody id="search-results"></tbody>
      </table>
    </div>
  `;
  const formHost = container.querySelector('#advanced-form-host');
  formHost.innerHTML = advancedFormTemplate({ freeText: opts.q || '' });
  const form = formHost.querySelector('#advanced-search-form');
  bindMoneyInputs(form);

  async function runSearch() {
    const fd = new FormData(form);
    const criteria = {};
    for (const [key, val] of fd.entries()) {
      if (val === '' || val === 'false') continue;
      const field = form.querySelector(`[name="${key}"]`);
      criteria[key] = field?.hasAttribute('data-money') ? numericValue(val) : (field?.type === 'checkbox' ? true : val);
    }
    const all = await db.properties.getAll();
    const results = applyAdvancedFilter(all, criteria);
    const tbody = container.querySelector('#search-results');
    if (!results.length) {
      tbody.innerHTML = `<tr><td colspan="7"><div class="state state--empty state--inline"><h3>نتیجه‌ای پیدا نشد</h3><p>معیارهای جستجو را کمتر کنید.</p></div></td></tr>`;
      return;
    }
    tbody.innerHTML = results
      .map(
        (p) => `<tr>
          <td>${p.code}</td>
          <td>${propertiesModule.DEAL_TYPES[p.dealType] || '-'}</td>
          <td>${p.district || 'نامشخص'}${p.neighborhood ? ' / ' + p.neighborhood : ''}</td>
          <td>${p.totalArea ? formatGroupedNumber(p.totalArea) + ' متر' : 'نامشخص'}</td>
          <td>${p.bedrooms ?? 'نامشخص'}</td>
          <td>${p.totalPrice ? formatGroupedNumber(p.totalPrice) + ' تومان' : 'نامشخص'}</td>
          <td><button data-code="${p.code}" class="view-btn">مشاهده</button></td>
        </tr>`
      )
      .join('');
    tbody.querySelectorAll('.view-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const p = results.find((r) => r.code === btn.dataset.code);
        document.dispatchEvent(new CustomEvent('melkyar:show-property', { detail: p }));
      });
    });
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    runSearch();
  });

  if (opts.q) runSearch();
}

window.searchModule = { renderSearchPage, handleQuickSearch, parseFreeText };
