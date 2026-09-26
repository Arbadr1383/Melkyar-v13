const USER_PERMISSIONS = [
  ['dashboard','داشبورد'],['properties','فایل‌های ملکی'],['customers','مشتری‌ها'],
  ['owners','مالکین'],['search','جستجوی پیشرفته'],['visits','بازدیدها'],
  ['followups','پیگیری‌ها'],['deals','معاملات'],['commissions','کمیسیون'],
  ['finance','حسابداری'],['accounts','حساب‌ها'],['loans','قرض و طلب'],
  ['builders','سازندگان'],['reports','گزارش‌ها'],['notifications','اعلان‌ها'],
  ['backup','پشتیبان'],['settings','تنظیمات'],['club','باشگاه مشتریان'],['sharing','اشتراک فایل']
];

const ROLE_DEFAULTS = {
  admin: ['all'],
  manager: USER_PERMISSIONS.map(([k]) => k).filter(k => k !== 'settings'),
  consultant: ['dashboard','properties','customers','owners','search','visits','followups','deals','commissions','notifications'],
  limited: ['dashboard','customers']
};

function userPermissions(user) {
  if (!user) return [];
  const username = String(user.username || '').toLowerCase();
  const isCreator = username === 'alireza' && !!(user.developer || user.builtin);
  if (isCreator) return ['all'];
  // Never let a normal/customer account inherit the creator's unrestricted flag.
  if (user.customerId != null && (user.developer || (user.permissions || []).includes('all'))) {
    return ROLE_DEFAULTS[user.role === 'admin' ? 'manager' : user.role] || ROLE_DEFAULTS.limited;
  }
  if ((user.permissions || []).includes('all')) return ROLE_DEFAULTS[user.role] || ROLE_DEFAULTS.limited;
  return Array.isArray(user.permissions) ? user.permissions.filter(p => p !== 'all') : (ROLE_DEFAULTS[user.role] || []);
}

const usersModule = {
  async renderUsers(el, embedded=false) {
    ui.renderLoading(el, 'در حال بارگذاری کاربران و دسترسی‌ها...');
    try {
      const actor = AUTH.currentUser();
      const isOwner = !!(actor?.developer || String(actor?.username || '').toLowerCase() === 'alireza');
      const isAdmin = !!(actor?.role === 'admin' && !actor?.developer && String(actor?.username || '').toLowerCase() !== 'alireza');
      const canManageUsers = isOwner || isAdmin;
      // Load each collection independently so a broken/empty request store can never hide the user list.
      let allUsers = [], customers = [];
      try {
        allUsers = await db.users.getAll();
        if (!Array.isArray(allUsers)) allUsers = [];
      } catch (err) {
        console.error('users.getAll first attempt', err);
        // A failed IndexedDB open used to poison the cached promise forever.
        // Retry once after yielding to allow a just-closed old tab/connection to release the DB.
        await new Promise(r => setTimeout(r, 120));
        try { allUsers = await db.users.getAll(); if (!Array.isArray(allUsers)) allUsers = []; }
        catch (retryErr) { console.error('users.getAll retry', retryErr); throw new Error('فهرست کاربران قابل دریافت نیست.'); }
      }
      try { const gotCustomers = await db.customers.getAll(); customers = Array.isArray(gotCustomers) ? gotCustomers : []; } catch (err) {
        console.error('customers.getAll', err);
      }
      const us = canManageUsers ? allUsers.filter(u => isOwner || (!u.developer && !u.builtin)) : allUsers.filter(u => !u.developer && !u.builtin);
      const customerMap = new Map(customers.map(c => [Number(c.id), c]));
      const rows = us.map(u => {
        const customer = customerMap.get(Number(u.customerId));
        const role = ({admin:'مدیر کل',manager:'مدیر دفتر',consultant:'مشاور',limited:'کاربر محدود'})[u.role] || 'کاربر';
        const perms = userPermissions(u);
        return `<tr>
          <td>${mk.esc(u.name)}</td><td>${mk.esc(u.username)}</td>
          <td>${mk.esc(customer?.name || '—')}</td><td>${role}</td>
          <td><span class="status-badge ${u.status === 'active' ? 'status-badge--success' : ''}">${u.status === 'active' ? 'فعال' : 'غیرفعال'}</span></td>
          <td>${perms.includes('all') ? 'همه دسترسی‌ها' : `${perms.length} دسترسی`}</td>
          <td><button class="btn btn--ghost btn--sm" data-edit="${u.id}">ویرایش</button>
          ${canManageUsers && !u.builtin && !u.developer && String(u.username).toLowerCase() !== 'ali' ? `<button class="btn btn--danger btn--sm" data-del="${u.id}">حذف</button>` : '<span class="hint">مدیر اصلی</span>'}</td>
        </tr>`;
      });
      // فقط حساب سازنده امکان ایجاد کاربر دارد؛ هیچ کاربر دیگری درخواست ساخت حساب ارسال نمی‌کند.
      const action = isOwner ? '<button class="btn btn--primary" id="add">+ ایجاد کاربر</button>' : '';
      const reqPanel = '';
      el.innerHTML = (embedded ? '<div class="users-embedded">' : '') + mk.page('کاربران و دسترسی‌ها','ایجاد کاربر فقط توسط حساب سازنده؛ اتصال به مشتری و کنترل دقیق دسترسی‌ها',action)
        + mk.table(['نام','نام کاربری','مشتری مرتبط','نقش','وضعیت','دسترسی','عملیات'], rows, 'هنوز کاربری ثبت نشده است.') + reqPanel + (embedded ? '</div>' : '');
      el.querySelector('#add')?.addEventListener('click', () => this.openUserForm(el, null));
      if (!canManageUsers) return;
      el.querySelectorAll('[data-edit]').forEach(b => b.onclick = async () => {
        try { const u = await db.users.get(Number(b.dataset.edit)); if (u) this.openUserForm(el, u); else ui.toast('کاربر پیدا نشد.','error'); }
        catch (err) { console.error(err); ui.toast('اطلاعات کاربر قابل دریافت نیست.','error'); }
      });
      el.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
        const id = Number(b.dataset.del);
        if (!(await ui.confirmDialog('این کاربر حذف شود؟'))) return;
        try { await db.users.remove(id); ui.toast('کاربر حذف شد','success'); await this.renderUsers(el); }
        catch (err) { console.error(err); ui.toast('حذف کاربر انجام نشد.','error'); }
      });
    } catch (err) {
      console.error('users.renderUsers', err);
      ui.renderError(el, 'بارگذاری کاربران انجام نشد. اگر دیتابیس قدیمی است، یک‌بار صفحه را کامل ببندید و دوباره باز کنید.', () => this.renderUsers(el));
    }
  },

  async openUserForm(el, existing) {
    const actor = AUTH.currentUser();
    const isOwner = !!(actor?.developer && String(actor?.username || '').toLowerCase() === 'alireza');
    // Creation is reserved exclusively for the creator account. Existing users may still be edited by authorized managers.
    if (!existing && !isOwner) {
      ui.toast('فقط حساب سازنده می‌تواند کاربر جدید ایجاد کند.','error');
      return;
    }
    let customers = [];
    try { customers = await db.customers.getAll(); }
    catch (err) { console.error(err); ui.toast('فهرست مشتری‌ها بارگذاری نشد.','error'); return; }

    const selected = new Set(userPermissions(existing));
    const permissionHtml = USER_PERMISSIONS.map(([k,l]) =>
      `<label class="check-row"><input type="checkbox" name="perm" value="${k}" ${selected.has('all') || selected.has(k) ? 'checked':''}> ${l}</label>`
    ).join('');

    const wrapper = document.createElement('div');
    wrapper.innerHTML = `<form id="user-form" class="form-grid" autocomplete="off">
      <label>نام کامل<input name="name" value="${mk.esc(existing?.name || '')}" required></label>
      <label>نام کاربری<input name="username" value="${mk.esc(existing?.username || '')}" required autocomplete="username"></label>
      <label>رمز عبور<input name="password" type="password" ${existing ? '' : 'required'} autocomplete="new-password" placeholder="${existing ? 'برای تغییر، رمز جدید وارد کنید' : 'رمز عبور'}"></label>
      <label>مشتری مرتبط<select name="customerId"><option value="">بدون مشتری</option>${customers.map(c => `<option value="${c.id}" ${Number(existing?.customerId)===Number(c.id)?'selected':''}>${mk.esc(c.name)} — ${mk.esc(c.phone||'')}</option>`).join('')}</select></label>
      <label>نقش<select name="role" id="user-role">${(AUTH.currentUser()?.developer || String(AUTH.currentUser()?.username || '').toLowerCase()==='alireza') && !existing?.customerId ? '<option value="admin">مدیر کل</option>' : ''}<option value="manager">مدیر دفتر</option><option value="consultant">مشاور</option><option value="limited">کاربر محدود</option></select></label>
      <label>وضعیت<select name="status"><option value="active">فعال</option><option value="inactive">غیرفعال</option></select></label>
      <div class="full-width permission-box">
        <div class="permission-head"><b>دسترسی‌ها</b><div><button type="button" class="btn btn--ghost btn--sm" id="perm-all">باز کردن همه</button><button type="button" class="btn btn--ghost btn--sm" id="perm-none">بستن همه</button></div></div>
        <div class="permission-grid">${permissionHtml}</div>
        <small class="hint">مدیر کل همه دسترسی‌ها را دارد. برای سایر نقش‌ها می‌توانید هر بخش را جداگانه باز یا بسته کنید.</small>
      </div>
      <div class="full-width"><button class="btn btn--primary" type="submit">ذخیره کاربر</button></div>
    </form>`;

    const role = wrapper.querySelector('#user-role');
    role.value = existing?.role || 'consultant';
    wrapper.querySelector('[name="status"]').value = existing?.status === 'inactive' ? 'inactive' : 'active';
    const checks = () => [...wrapper.querySelectorAll('input[name="perm"]')];
    const setAll = checked => checks().forEach(c => c.checked = checked);
    wrapper.querySelector('#perm-all').onclick = () => setAll(true);
    wrapper.querySelector('#perm-none').onclick = () => setAll(false);
    role.addEventListener('change', () => { if (role.value === 'admin') setAll(true); else if (!existing) setAll(false); });

    const modal = ui.openModal({ title: existing ? 'ویرایش کاربر' : 'ایجاد کاربر جدید', bodyEl: wrapper, size: 'lg' });
    wrapper.querySelector('#user-form').addEventListener('submit', async e => {
      e.preventDefault();
      const button = e.currentTarget.querySelector('button[type="submit"]');
      button.disabled = true;
      try {
        const fd = new FormData(e.currentTarget);
        const name = String(fd.get('name') || '').trim();
        const username = String(fd.get('username') || '').trim();
        const password = String(fd.get('password') || '');
        if (existing && String(existing.username || '').toLowerCase() === 'alireza') throw new Error('حساب سازنده از این فرم قابل ویرایش نیست.');
        if (!name || !username) throw new Error('نام و نام کاربری الزامی است.');
        const all = await db.users.getAll();
        const isOwner = !!(AUTH.currentUser()?.developer || AUTH.currentUser()?.username?.toLowerCase() === 'alireza');
        const duplicate = all.find(u => String(u.username || '').trim().toLowerCase() === username.toLowerCase() && Number(u.id) !== Number(existing?.id));
        if (duplicate) throw new Error('این نام کاربری قبلاً استفاده شده است.');

        let roleValue = String(fd.get('role') || 'consultant');
        const linkedCustomerId = fd.get('customerId') ? Number(fd.get('customerId')) : null;
        if (linkedCustomerId && roleValue === 'admin') roleValue = 'manager';
        if (!isOwner && roleValue === 'admin') throw new Error('فقط سازنده می‌تواند کاربر مدیر کل ایجاد یا تعیین کند.');
        const selectedPermissions = fd.getAll('perm').filter(p => USER_PERMISSIONS.some(([k]) => k === p));
        const data = { name, username, customerId: linkedCustomerId, role: roleValue, status: fd.get('status') === 'inactive' ? 'inactive' : 'active', permissions: roleValue === 'admin' ? ['all'] : (selectedPermissions.length ? selectedPermissions : (ROLE_DEFAULTS[roleValue] || ROLE_DEFAULTS.limited)), builtin: false, developer: false };
        if (roleValue === 'admin' && !isOwner) throw new Error('فقط سازنده می‌تواند مدیر کل ایجاد کند.');
        if (roleValue !== 'admin') data.permissions = data.permissions.filter(p => p !== 'all' && p !== 'settings');
        if (!existing && !password) throw new Error('رمز عبور را وارد کنید.');
        if (password) data.passwordHash = await AUTH.sha256(password);

        if (existing) {
          if (existing.builtin || String(existing.username).toLowerCase() === 'ali') {
            data.username = 'Ali'; data.role = 'admin'; data.status = 'active'; data.permissions = ['all']; data.builtin = true;
            data.passwordHash = existing.passwordHash || 'a20a2b7bb0842d5cf8a0c06c626421fd51ec103925c1819a51271f2779afa730';
          }
          await db.users.update(existing.id, data);
        } else {
          await db.users.add(data);
        }
        modal.close();
        ui.toast(existing ? 'کاربر با موفقیت ویرایش شد.' : 'کاربر با موفقیت ایجاد شد.','success');
        await this.renderUsers(el);
      } catch (err) {
        console.error('users.save', err);
        ui.toast(err?.message || 'ذخیره کاربر انجام نشد.','error');
        button.disabled = false;
      }
    });
  },

};
window.usersModule = usersModule;
