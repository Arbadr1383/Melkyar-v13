
/* auth.js - local/offline authentication for Melkyar.
   NOTE: Because this is a browser-only offline app, this is an application
   gate, not server-grade security. The built-in supervisor is intentionally
   provisioned as requested by the owner. */
const AUTH = (() => {
  const SESSION_KEY = 'melkyar_auth_session';
  const LOCK_PREFIX = 'melkyar_active_user_';
  const ADMIN_USERNAME = 'alireza';
  const ADMIN_PASSWORD_HASH = '6495da527bb644b403ca922424bd8976d85699d392f975c7d84cff45db3fd96e';
  const LEGACY_ADMIN_USERNAME = 'Ali';
  const LEGACY_ADMIN_PASSWORD_HASH = 'a20a2b7bb0842d5cf8a0c06c626421fd51ec103925c1819a51271f2779afa730';

  async function sha256(text) {
    const data = new TextEncoder().encode(text);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2,'0')).join('');
  }

  function getSession() {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null'); }
    catch { return null; }
  }
  function setSession(user) {
    const lockKey = LOCK_PREFIX + String(user.username || '').toLowerCase();
    const token = crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random();
    localStorage.setItem(lockKey, token);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({
      id: user.id || 'builtin-admin',
      name: user.name || 'مدیر سیستم',
      username: user.username,
      role: user.role || 'admin',
      permissions: user.permissions || ['all'],
      customerId: user.customerId ?? null,
      developer: !!user.developer,
      builtin: !!user.builtin,
      loginAt: new Date().toISOString(), sessionToken: token
    }));
  }
  function clearSession() { const s=getSession(); if(s?.username){ const k=LOCK_PREFIX+String(s.username).toLowerCase(); if(localStorage.getItem(k)===s.sessionToken)localStorage.removeItem(k); } sessionStorage.removeItem(SESSION_KEY); }
  function currentUser() {
    const u = getSession();
    if (u?.username) { const k=LOCK_PREFIX+String(u.username).toLowerCase(); if(u.sessionToken && localStorage.getItem(k) !== u.sessionToken){ clearSession(); return null; } }
    const label = document.getElementById('current-user-name');
    if (label && u) label.textContent = u.name || u.username;
    return u;
  }

  async function ensureBuiltInAdmin() {
    try {
      const existing = await db.users.getAll();
      let owner = existing.find(u => String(u.username || '').toLowerCase() === ADMIN_USERNAME);
      if (!owner) {
        owner = await db.users.add({ name: 'علیرضا بدر', username: ADMIN_USERNAME, passwordHash: ADMIN_PASSWORD_HASH, role: 'admin', status: 'active', permissions: ['all'], builtin: true, developer: true });
      } else if (owner.status !== 'active' || owner.role !== 'admin' || owner.passwordHash !== ADMIN_PASSWORD_HASH || !owner.developer) {
        await db.users.update(owner.id, { name: 'علیرضا بدر', username: ADMIN_USERNAME, passwordHash: ADMIN_PASSWORD_HASH, role: 'admin', status: 'active', permissions: ['all'], builtin: true, developer: true });
      }
      // Preserve an older built-in administrator if it already exists, but do not create a second account.
      // Only the canonical creator account may carry the developer flag.
      for (const u of existing) {
        if (String(u.username || '').toLowerCase() !== ADMIN_USERNAME.toLowerCase() && (u.developer || u.builtin && String(u.username || '').toLowerCase() !== LEGACY_ADMIN_USERNAME.toLowerCase())) {
          try { await db.users.update(u.id, { developer: false, builtin: String(u.username || '').toLowerCase() === LEGACY_ADMIN_USERNAME.toLowerCase() }); } catch (_) {}
        }
      }
      const legacy = existing.find(u => String(u.username || '').toLowerCase() === LEGACY_ADMIN_USERNAME.toLowerCase());
      if (legacy && legacy.username !== ADMIN_USERNAME) {
        await db.users.update(legacy.id, { builtin: true, developer: false });
      }
    } catch (e) { console.error('ensureBuiltInAdmin', e); }
  }

  async function sanitizeUserAccounts() {
    try {
      const users = await db.users.getAll();
      for (const u of users) {
        const username = String(u.username || '').toLowerCase();
        if (username === ADMIN_USERNAME.toLowerCase()) {
          if (!u.developer || !u.builtin || u.role !== 'admin' || !(u.permissions || []).includes('all')) {
            await db.users.update(u.id, { name:'علیرضا بدر', username:ADMIN_USERNAME, role:'admin', status:'active', permissions:['all'], builtin:true, developer:true });
          }
          continue;
        }
        // A customer-linked account must never inherit the creator/admin identity.
        if (u.customerId != null && (u.developer || u.role === 'admin' || (u.permissions || []).includes('all'))) {
          await db.users.update(u.id, { role:'consultant', permissions:['dashboard','properties','customers','owners','search','visits','followups','deals','commissions','notifications'], builtin:false, developer:false });
        } else if (u.developer) {
          await db.users.update(u.id, { developer:false, builtin: username === LEGACY_ADMIN_USERNAME.toLowerCase() });
        } else if (!u.builtin && (u.permissions || []).includes('all') && u.role !== 'admin') {
          const base = ROLE_DEFAULTS_SAFE[u.role] || ROLE_DEFAULTS_SAFE.limited;
          await db.users.update(u.id, { permissions:base });
        }
      }
      // Refresh an already-open session so a previously created customer account
      // cannot keep stale admin/developer permissions until logout.
      try {
        const session = getSession();
        if (session?.username) {
          const fresh = users.find(x => String(x.username || '').toLowerCase() === String(session.username).toLowerCase());
          if (fresh) sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ...session, id:fresh.id, name:fresh.name, username:fresh.username, role:fresh.role, permissions:fresh.permissions || [], customerId:fresh.customerId ?? null, developer:!!fresh.developer, builtin:!!fresh.builtin }));
        }
      } catch (_) {}
    } catch (e) { console.warn('sanitizeUserAccounts', e); }
  }
  const ROLE_DEFAULTS_SAFE = {
    manager:['dashboard','properties','customers','owners','search','visits','followups','deals','commissions','finance','accounts','loans','builders','reports','notifications','backup','club','sharing'],
    consultant:['dashboard','properties','customers','owners','search','visits','followups','deals','commissions','notifications'],
    limited:['dashboard','customers']
  };

  async function verify(username, password) {
    const u = String(username || '').trim();
    const p = String(password || '');
    if (!u || !p) return { ok:false, message:'نام کاربری و رمز عبور را وارد کنید.' };

    const hash = await sha256(p);
    if ((u.toLowerCase() === ADMIN_USERNAME.toLowerCase() && hash === ADMIN_PASSWORD_HASH) || (u.toLowerCase() === LEGACY_ADMIN_USERNAME.toLowerCase() && hash === LEGACY_ADMIN_PASSWORD_HASH)) {
      const users = await db.users.getAll();
      const admin = users.find(x => String(x.username || '').toLowerCase() === u.toLowerCase()) || { id:'builtin-admin', name:'علیرضا بدر', username:ADMIN_USERNAME, role:'admin', permissions:['all'], builtin:true, developer:true };
      const canonicalAdmin = { ...admin, name:'علیرضا بدر', username:ADMIN_USERNAME, role:'admin', permissions:['all'], builtin:true, developer:true };
      setSession(canonicalAdmin);
      return { ok:true, user:admin };
    }

    const users = await db.users.getAll();
    const user = users.find(x =>
      String(x.username || '').toLowerCase() === u.toLowerCase() &&
      x.status !== 'inactive' &&
      x.passwordHash === hash
    );
    if (!user) return { ok:false, message:'نام کاربری یا رمز عبور صحیح نیست.' };
    setSession(user);
    return { ok:true, user };
  }

  function hasPermission(permission) {
    const u = currentUser();
    if (!u) return false;
    const isCreator = String(u.username || '').toLowerCase() === ADMIN_USERNAME.toLowerCase() && !!u.developer;
    if (isCreator) return true;
    if (u.customerId != null && ((u.permissions || []).includes('all') || u.developer)) return (u.permissions || []).includes(permission) && permission !== 'settings';
    if (u.role === 'admin') return true;
    if ((u.permissions || []).includes('all')) return false;
    return (u.permissions || []).includes(permission);
  }

  async function requireLogin() {
    await ensureBuiltInAdmin();
    await sanitizeUserAccounts();
    if (currentUser()) return true;
    return new Promise(resolve => {
      const overlay = document.createElement('div');
      overlay.id = 'melkyar-login-overlay';
      overlay.innerHTML = `
        <div class="login-card">
          <img class="login-logo-img" src="assets/logo.jpg" alt="لوگوی ملک‌یار">
          <div class="login-subtitle">ورود به سامانه مدیریت املاک</div>
          <form id="melkyar-login-form" autocomplete="off">
            <label>نام کاربری<input id="login-username" required autocomplete="username" placeholder="نام کاربری"></label>
            <label>رمز عبور<input id="login-password" type="password" required autocomplete="current-password" placeholder="رمز عبور"></label>
            <div id="login-error" class="login-error"></div>
            <button class="btn btn--primary login-btn" type="submit">ورود به ملک‌یار</button>
          </form>
        </div>`;
      document.body.appendChild(overlay);
      const form = overlay.querySelector('#melkyar-login-form');
      const err = overlay.querySelector('#login-error');
      form.addEventListener('submit', async e => {
        e.preventDefault();
        err.textContent = '';
        const result = await verify(
          overlay.querySelector('#login-username').value,
          overlay.querySelector('#login-password').value
        );
        if (result.ok) {
          overlay.remove();
          resolve(true);
          router();
        } else {
          err.textContent = result.message;
        }
      });
      setTimeout(() => overlay.querySelector('#login-username').focus(), 50);
    });
  }

  return { ensureBuiltInAdmin, verify, requireLogin, currentUser, clearSession, hasPermission, sha256 };
})();
window.AUTH = AUTH;
