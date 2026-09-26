/**
 * Melkyar database repository.
 * Electron: IndexedDB (offline/local, unchanged behavior).
 * Web/PWA: Cloudflare Pages Function + D1 (shared between devices).
 */

const DB_NAME = 'melkyar_db';
const DB_VERSION = 7;
const REMOTE = typeof window !== 'undefined' && !window.MELKYAR_APP && /^https?:$/.test(window.location.protocol);

const STORES = {
  properties: { keyPath: 'id', autoIncrement: true, indexes: ['status', 'category', 'dealType'] },
  customers:  { keyPath: 'id', autoIncrement: true, indexes: ['status', 'type'] },
  activities: { keyPath: 'id', autoIncrement: true, indexes: ['entityType', 'entityId'] },
  settings: { keyPath: 'key', autoIncrement: false, indexes: [] },
  owners: { keyPath: 'id', autoIncrement: true, indexes: ['status','type'] },
  visits: { keyPath: 'id', autoIncrement: true, indexes: ['date','status','customerId','propertyId'] },
  followups: { keyPath: 'id', autoIncrement: true, indexes: ['dueDate','status','type'] },
  deals: { keyPath: 'id', autoIncrement: true, indexes: ['date','status','type'] },
  commissions: { keyPath: 'id', autoIncrement: true, indexes: ['dealId','status'] },
  transactions: { keyPath: 'id', autoIncrement: true, indexes: ['date','bucket','type','accountId'] },
  accounts: { keyPath: 'id', autoIncrement: true, indexes: ['type','bucket'] },
  loans: { keyPath: 'id', autoIncrement: true, indexes: ['status','direction'] },
  builders: { keyPath: 'id', autoIncrement: true, indexes: ['status'] },
  users: { keyPath: 'id', autoIncrement: true, indexes: ['username','role','status','customerId'] },
  tasks: { keyPath: 'id', autoIncrement: true, indexes: ['dueDate','status'] },
  notifications: { keyPath: 'id', autoIncrement: true, indexes: ['read','date'] },
  messages: { keyPath: 'id', autoIncrement: true, indexes: ['customerId','date'] },
  userRequests: { keyPath: 'id', autoIncrement: true, indexes: ['status','requestedAt','username'] },
};

let _dbPromise = null;

function openDatabase() {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (event) => {
      const idb = event.target.result;
      Object.entries(STORES).forEach(([name, cfg]) => {
        let store;
        if (!idb.objectStoreNames.contains(name)) {
          store = idb.createObjectStore(name, { keyPath: cfg.keyPath, autoIncrement: cfg.autoIncrement });
        } else store = event.target.transaction.objectStore(name);
        cfg.indexes.forEach((idx) => {
          if (!store.indexNames.contains(idx)) store.createIndex(idx, idx, { unique: false });
        });
      });
    };
    req.onblocked = () => console.warn('IndexedDB upgrade blocked; close other Melkyar tabs/windows.');
    req.onsuccess = (event) => {
      const idb = event.target.result;
      idb.onversionchange = () => idb.close();
      resolve(idb);
    };
    req.onerror = (event) => { _dbPromise = null; reject(event.target.error); };
  });
  return _dbPromise;
}

function tx(storeName, mode) {
  return openDatabase().then((idb) => idb.transaction(storeName, mode).objectStore(storeName));
}
function wrapRequest(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function remoteCall(action, store, payload = {}) {
  const response = await fetch('/api/db', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ action, store, ...payload })
  });
  let body;
  try { body = await response.json(); } catch { throw new Error('پاسخ نامعتبر از سرور'); }
  if (!response.ok || body.ok === false) throw new Error(body.error || 'خطای پایگاه داده');
  return body.data;
}

function createLocalRepository(storeName) {
  return {
    async getAll() { return wrapRequest((await tx(storeName, 'readonly')).getAll()); },
    async get(id) { return wrapRequest((await tx(storeName, 'readonly')).get(id)); },
    async add(record) {
      const now = new Date().toISOString();
      const payload = { ...record, createdAt: record.createdAt || now, updatedAt: now };
      const id = await wrapRequest((await tx(storeName, 'readwrite')).add(payload));
      return { ...payload, id };
    },
    async update(id, patch) {
      const idb = await openDatabase();
      return new Promise((resolve, reject) => {
        const transaction = idb.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        let updated = null;
        const getReq = store.get(id);
        getReq.onsuccess = () => {
          const existing = getReq.result;
          if (!existing) { reject(new Error(`رکورد با شناسهٔ ${id} در ${storeName} پیدا نشد`)); transaction.abort(); return; }
          updated = { ...existing, ...patch, id, updatedAt: new Date().toISOString() };
          store.put(updated);
        };
        getReq.onerror = () => reject(getReq.error);
        transaction.oncomplete = () => resolve(updated);
        transaction.onerror = () => reject(transaction.error || new Error('خطای پایگاه داده'));
      });
    },
    async remove(id) { await wrapRequest((await tx(storeName, 'readwrite')).delete(id)); return true; },
    async clear() { await wrapRequest((await tx(storeName, 'readwrite')).clear()); },
    async bulkAdd(records) {
      const store = await tx(storeName, 'readwrite');
      const now = new Date().toISOString();
      const results = [];
      for (const rec of records) {
        const payload = { ...rec, createdAt: rec.createdAt || now, updatedAt: now };
        const id = await wrapRequest(store.add(payload));
        results.push({ ...payload, id });
      }
      return results;
    }
  };
}

function createRemoteRepository(storeName) {
  return {
    getAll: () => remoteCall('getAll', storeName),
    get: (id) => remoteCall('get', storeName, { id }),
    add: (record) => remoteCall('add', storeName, { record }),
    update: (id, patch) => remoteCall('update', storeName, { id, patch }),
    remove: (id) => remoteCall('remove', storeName, { id }),
    clear: () => remoteCall('clear', storeName),
    bulkAdd: (records) => remoteCall('bulkAdd', storeName, { records })
  };
}

function createRepository(storeName) { return REMOTE ? createRemoteRepository(storeName) : createLocalRepository(storeName); }

const propertiesRepo = createRepository('properties');
const customersRepo = createRepository('customers');
const activitiesRepo = createRepository('activities');
const settingsRepo = createRepository('settings');
const ownersRepo = createRepository('owners');
const visitsRepo = createRepository('visits');
const followupsRepo = createRepository('followups');
const dealsRepo = createRepository('deals');
const commissionsRepo = createRepository('commissions');
const transactionsRepo = createRepository('transactions');
const accountsRepo = createRepository('accounts');
const loansRepo = createRepository('loans');
const buildersRepo = createRepository('builders');
const usersRepo = createRepository('users');
const tasksRepo = createRepository('tasks');
const notificationsRepo = createRepository('notifications');
const messagesRepo = createRepository('messages');
const userRequestsRepo = createRepository('userRequests');

async function logActivity({ entityType, entityId, action, field = null, oldValue = null, newValue = null }) {
  const actor = (window.AUTH && window.AUTH.currentUser && window.AUTH.currentUser()) || null;
  return activitiesRepo.add({ entityType, entityId, action, field, oldValue, newValue, actor: actor ? (actor.name || actor.username) : 'سیستم', actorUsername: actor?.username || null, date: new Date().toISOString() });
}

async function updatePropertyWithHistory(id, patch) {
  const existing = await propertiesRepo.get(id);
  if (!existing) throw new Error('فایل پیدا نشد');
  let priceHistory = existing.priceHistory || [];
  if (patch.totalPrice !== undefined && patch.totalPrice !== existing.totalPrice) {
    priceHistory = [...priceHistory, { date: new Date().toISOString(), field: 'totalPrice', oldValue: existing.totalPrice, newValue: patch.totalPrice, changedBy: ((window.AUTH && window.AUTH.currentUser && window.AUTH.currentUser()) || {}).username || 'سیستم' }];
    await logActivity({ entityType: 'property', entityId: id, action: 'price_change', field: 'totalPrice', oldValue: existing.totalPrice, newValue: patch.totalPrice });
  }
  return propertiesRepo.update(id, { ...patch, priceHistory });
}

async function isDatabaseEmpty() {
  const [props, custs] = await Promise.all([propertiesRepo.getAll(), customersRepo.getAll()]);
  return props.length === 0 && custs.length === 0;
}

window.db = {
  properties: propertiesRepo, customers: customersRepo, activities: activitiesRepo, settings: settingsRepo,
  owners: ownersRepo, visits: visitsRepo, followups: followupsRepo, deals: dealsRepo, commissions: commissionsRepo,
  transactions: transactionsRepo, accounts: accountsRepo, loans: loansRepo, builders: buildersRepo, users: usersRepo,
  tasks: tasksRepo, notifications: notificationsRepo, messages: messagesRepo, userRequests: userRequestsRepo,
  updatePropertyWithHistory, logActivity, isDatabaseEmpty,
};
