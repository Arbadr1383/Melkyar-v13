/**
 * seed.js
 * ---------------------------------------------------------------------------
 * دادهٔ نمونه برای تست همهٔ صفحات (بخش ۴۷ سند): حداقل ۲۰ ملک و ۱۰ مشتری.
 * عمداً بعضی فیلدها در برخی رکوردها خالی گذاشته شده تا رفتار «نامشخص»
 * (بخش ۳۷) هم قابل مشاهده و تست باشد.
 */

const DISTRICTS = ['قصرالدشت', 'رحمت‌آباد', 'معالی‌آباد', 'زرگری', 'ستارخان', 'صدرا', 'فرهنگ‌شهر'];
const OWNER_NAMES = ['رضایی', 'محمدی', 'حسینی', 'کریمی', 'صادقی'];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function buildDemoProperties() {
  const list = [];
  for (let i = 0; i < 20; i++) {
    const dealType = i % 4 === 0 ? 'rent' : 'sale';
    const totalArea = randInt(70, 260);
    const isFull = i % 5 !== 0; // برخی رکوردها عمداً ناقص‌اند
    const totalPrice = dealType === 'sale' ? totalArea * randInt(150, 400) * 1_000_000 : null;
    list.push({
      dealType,
      fileType: i % 7 === 0 ? 'presale' : 'normal',
      status: i % 9 === 0 ? 'needs_review' : 'active',
      source: pick(['معرفی مالک', 'تماس تلفنی', 'آگهی']),
      district: pick(DISTRICTS),
      neighborhood: isFull ? `محلهٔ ${randInt(1, 9)}` : null,
      street: isFull ? `خیابان ${randInt(1, 20)}` : null,
      alley: null,
      publicAddress: isFull ? `${pick(DISTRICTS)}، خیابان اصلی` : null,
      privateAddress: isFull ? `پلاک ${randInt(1, 300)}` : null,
      totalArea,
      livingRoomArea: isFull ? randInt(20, 40) : null,
      bedroomArea: null,
      storageArea: isFull ? randInt(3, 8) : null,
      bedrooms: randInt(1, 4),
      unitsCount: isFull ? randInt(1, 40) : null,
      floor: isFull ? randInt(0, 10) : null,
      totalFloors: isFull ? randInt(1, 12) : null,
      yearBuilt: isFull ? randInt(1385, 1403) : null,
      totalPrice,
      pricePerMeter: totalPrice ? Math.round(totalPrice / totalArea) : null,
      deposit: dealType === 'rent' ? randInt(200, 800) * 1_000_000 : null,
      monthlyRent: dealType === 'rent' ? randInt(15, 60) * 1_000_000 : null,
      parkingCount: isFull ? randInt(0, 2) : null,
      hasElevator: Math.random() > 0.4,
      hasStorage: Math.random() > 0.3,
      hasParking: Math.random() > 0.3,
      hasTerrace: Math.random() > 0.6,
      isRenovated: Math.random() > 0.6,
      hasPool: Math.random() > 0.85,
      hasSauna: Math.random() > 0.9,
      hasJacuzzi: Math.random() > 0.92,
      hasClubhouse: Math.random() > 0.8,
      hasGym: Math.random() > 0.85,
      hasRoofGarden: Math.random() > 0.9,
      hasLobby: Math.random() > 0.7,
      hasSmartSystem: Math.random() > 0.9,
      documentType: isFull ? pick(['six_dong', 'legal', 'partnership']) : null,
      coolingType: isFull ? pick(['split', 'duct', 'central']) : null,
      heatingType: isFull ? pick(['package', 'engine_room']) : null,
      ownerName: pick(OWNER_NAMES),
      ownerPhone: `091${randInt(10000000, 99999999)}`,
      description: isFull ? 'ملکی نورگیر و تمیز، مناسب سکونت یا سرمایه‌گذاری.' : null,
      category: i % 6 === 0 ? 'premium' : i % 8 === 0 ? 'underprice' : dealType,
      tags: i % 3 === 0 ? ['نوساز'] : [],
      media: [],
      priceHistory: [],
    });
  }
  return list;
}

function buildDemoCustomers() {
  const statuses = ['buy_wanted', 'rent_wanted', 'not_contacted', 'following', 'active', 'inactive', 'closed_deal'];
  const list = [];
  for (let i = 0; i < 10; i++) {
    const budgetMin = randInt(8, 15) * 1_000_000_000;
    list.push({
      name: `${pick(OWNER_NAMES)} ${['علی', 'رضا', 'مریم', 'سارا', 'حسین'][i % 5]}`,
      phone: `091${randInt(10000000, 99999999)}`,
      type: pick(['buyer', 'tenant', 'seller', 'landlord']),
      dealType: i % 3 === 0 ? 'rent' : 'sale',
      status: statuses[i % statuses.length],
      budgetMin,
      budgetMax: budgetMin + randInt(3, 10) * 1_000_000_000,
      desiredAreas: [pick(DISTRICTS)],
      desiredMeterage: randInt(80, 200),
      desiredBedrooms: randInt(1, 4),
      requiredFeatures: i % 2 === 0 ? ['آسانسور', 'پارکینگ'] : [],
      description: i % 4 === 0 ? null : 'مشتری جدی، در حال بازدید فایل‌های پیشنهادی.',
      lastContact: i % 3 === 0 ? new Date(Date.now() - randInt(1, 20) * 86400000).toISOString() : null,
      nextFollowup: i % 4 === 0 ? new Date(Date.now() + randInt(-2, 5) * 86400000).toISOString() : null,
      favoriteProperties: [],
      visitedProperties: [],
      sentProperties: [],
      tags: [],
      communicationHistory: [],
    });
  }
  return list;
}

async function loadDemoData() {
  await db.properties.bulkAdd(buildDemoProperties());
  await db.customers.bulkAdd(buildDemoCustomers());
}

window.seedModule = { loadDemoData };
