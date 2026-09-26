/**
 * jalali.js
 * ---------------------------------------------------------------------------
 * تبدیل تاریخ میلادی به شمسی (جلالی) و قالب‌بندی نمایشی، بدون هیچ کتابخانهٔ
 * خارجی — چون فقط چند تابع ریاضی سرراست است و نیازی به وابستگی جدید نیست.
 */

/**
 * تبدیل میلادی به شمسی با دقت کامل، بر پایهٔ الگوریتم استاندارد و شناخته‌شدهٔ
 * تقویم جلالی (مبتنی بر Julian Day Number و جدول Breakهای کبیسه — همان
 * الگوریتمی که در کتابخانهٔ متن‌باز jalaali-js استفاده می‌شود). نسخهٔ سادهٔ
 * ابتدایی (تقریب دوره‌ای ۳۳ ساله) در تست با تاریخ نوروز (۱ فروردین) خطای
 * یک‌ساله داشت؛ به همین دلیل با این نسخهٔ دقیق جایگزین شد.
 */
function div(a, b) { return Math.trunc(a / b); }
function mod(a, b) { return a - Math.trunc(a / b) * b; }

const JALALI_BREAKS = [
  -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210,
  1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178,
];

function jalCal(jy) {
  const bl = JALALI_BREAKS.length;
  const gy = jy + 621;
  let leapJ = -14;
  let jp = JALALI_BREAKS[0];
  let jm, jump = 0, n, i;

  for (i = 1; i < bl; i += 1) {
    jm = JALALI_BREAKS[i];
    jump = jm - jp;
    if (jy < jm) break;
    leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4);
    jp = jm;
  }
  n = jy - jp;

  leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
  if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;

  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  const march = 20 + leapJ - leapG;

  if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
  let leap = mod(mod(n + 1, 33) - 1, 4);
  if (leap === -1) leap = 4;

  return { leap, gy, march };
}

function g2d(gy, gm, gd) {
  let d = div((gy + div(gm - 8, 6) + 100100) * 1461, 4)
    + div(153 * mod(gm + 9, 12) + 2, 5)
    + gd - 34840408;
  d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
  return d;
}

function d2g(jdn) {
  let j = 4 * jdn + 139361631;
  j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  const i = div(mod(j, 1461), 4) * 5 + 308;
  const gd = div(mod(i, 153), 5) + 1;
  const gm = mod(div(i, 153), 12) + 1;
  const gy = div(j, 1461) - 100100 + div(8 - gm, 6);
  return { gy, gm, gd };
}

function d2j(jdn) {
  const gy = d2g(jdn).gy;
  let jy = gy - 621;
  const r = jalCal(jy);
  const jdn1f = g2d(gy, 3, r.march);
  let jd, jm, k;

  k = jdn - jdn1f;
  if (k >= 0) {
    if (k <= 185) {
      jm = 1 + div(k, 31);
      jd = mod(k, 31) + 1;
      return [jy, jm, jd];
    }
    k -= 186;
  } else {
    jy -= 1;
    k += 179;
    if (r.leap === 1) k += 1;
  }
  jm = 7 + div(k, 30);
  jd = mod(k, 30) + 1;
  return [jy, jm, jd];
}

function toJalali(gy, gm, gd) {
  return d2j(g2d(gy, gm, gd));
}

const JALALI_MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
];

/** یک شیء Date میلادی یا رشتهٔ ISO می‌گیرد و «۲۷ شهریور ۱۴۰۴» برمی‌گرداند */
function formatJalali(dateInput) {
  if (!dateInput) return 'نامشخص';
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) return 'نامشخص';
  const [jy, jm, jd] = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  return `${jd} ${JALALI_MONTHS[jm - 1]} ${jy}`;
}

/** نسخهٔ کوتاه با ساعت، برای تاریخچه/لاگ: «۲۷ شهریور ۱۴۰۴ - ۱۴:۰۵» */
function formatJalaliDateTime(dateInput) {
  if (!dateInput) return 'نامشخص';
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) return 'نامشخص';
  const datePart = formatJalali(d);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${datePart} - ${hh}:${mm}`;
}


function j2d(jy, jm, jd) {
  const r = jalCal(jy);
  const jdn1f = g2d(r.gy, 3, r.march);
  const k = jm <= 7 ? (jm - 1) * 31 : (jm - 1) * 30 + 6;
  return jdn1f + k + jd - 1;
}

function toGregorian(jy, jm, jd) {
  return d2g(j2d(jy, jm, jd));
}

function normalizeDigits(value) {
  return String(value ?? '').replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
}

function parseJalaliDate(value) {
  const raw = normalizeDigits(value).trim().replace(/[-.]/g, '/');
  const m = raw.match(/^(13\d{2}|14\d{2}|15\d{2})\/(\d{1,2})\/(\d{1,2})$/);
  if (!m) return null;
  const jy = Number(m[1]), jm = Number(m[2]), jd = Number(m[3]);
  if (jm < 1 || jm > 12 || jd < 1 || jd > (jm <= 6 ? 31 : jm <= 11 ? 30 : (jalCal(jy).leap === 0 ? 30 : 29))) return null;
  const g = toGregorian(jy, jm, jd);
  return new Date(g.gy, g.gm - 1, g.gd, 12, 0, 0);
}

function formatJalaliInput(dateInput) {
  if (!dateInput) return '';
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  const [jy, jm, jd] = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  return `${jy}/${String(jm).padStart(2,'0')}/${String(jd).padStart(2,'0')}`;
}

function jalaliYearRange() {
  const [jy] = toJalali(new Date().getFullYear(), new Date().getMonth()+1, new Date().getDate());
  return { min: jy - 10, max: jy + 10 };
}

window.jalali = { toJalali, toGregorian, parseJalaliDate, formatJalaliInput, jalaliYearRange, formatJalali, formatJalaliDateTime, JALALI_MONTHS };
