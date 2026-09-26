
const backupModule = {
  async renderBackup(el) {
    el.innerHTML = mk.page(
      'پشتیبان و انتقال اطلاعات',
      'پشتیبان کامل آفلاین؛ شامل اطلاعات فایل‌ها و عکس‌های ثبت‌شده'
    ) + `
      <section class="panel">
        <p>پشتیبان ملک‌یار شامل تمام اطلاعات محلی، کاربران، تنظیمات، فایل‌های ملکی و <b>عکس‌های فایل‌ها</b> است.</p>
        <p class="hint">بهتر است پس از ثبت یا ویرایش فایل‌های مهم، یک نسخه پشتیبان جدید بگیرید.</p>
        <div class="quick-actions">
          <button class="btn btn--primary" id="export">💾 ساخت پشتیبان کامل</button>
          <label class="btn btn--ghost" for="import-file">↩️ بازیابی پشتیبان</label>
          <input id="import-file" type="file" accept=".json,.melkyar,.melkyarbackup" hidden>
        </div>
        <div id="backup-status" class="hint" style="margin-top:12px"></div>
      </section>`;

    el.querySelector('#export').onclick = async () => {
      try {
        const data = {
          app: 'Melkyar',
          format: 'melkyar-backup',
          version: 3,
          createdAt: new Date().toISOString(),
          stores: {}
        };
        for (const n of Object.keys(STORES)) {
          if (db[n]?.getAll) data.stores[n] = await db[n].getAll();
        }
        const properties = data.stores.properties || [];
        data.mediaSummary = {
          propertyImages: properties.reduce((sum,p) => sum + (Array.isArray(p.media) ? p.media.length : 0), 0),
          note: 'تصاویر به‌صورت Data URL داخل رکورد فایل‌ها ذخیره می‌شوند و همراه بکاپ منتقل می‌شوند.'
        };
        const blob = new Blob([JSON.stringify(data)], { type:'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `Melkyar-Backup-${new Date().toISOString().replace(/[:.]/g,'-').slice(0,19)}.melkyarbackup`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        const count = properties.reduce((sum,p)=>sum+(Array.isArray(p.media)?p.media.length:0),0);
        el.querySelector('#backup-status').textContent = `پشتیبان آماده شد؛ ${properties.length} فایل و ${count} عکس داخل آن قرار گرفت.`;
        ui.toast('پشتیبان کامل ایجاد شد.','success');
      } catch (err) {
        console.error(err);
        ui.toast('ساخت پشتیبان با خطا مواجه شد.','error');
      }
    };

    el.querySelector('#import-file').onchange = async e => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const data = JSON.parse(await file.text());
        if (!data || data.app !== 'Melkyar' || !data.stores) throw new Error('invalid backup');
        if (!(await ui.confirmDialog('بازیابی، اطلاعات موجود را حذف نمی‌کند و رکوردهای پشتیبان را اضافه می‌کند. ادامه می‌دهید؟'))) return;

        let total = 0;
        for (const [n, records] of Object.entries(data.stores)) {
          if (db[n] && Array.isArray(records)) {
            for (const r of records) {
              const copy = { ...r };
              delete copy.id;
              try { await db[n].add(copy); total++; } catch {}
            }
          }
        }
        ui.toast(`بازیابی انجام شد؛ ${total} رکورد وارد شد.`,'success');
        this.renderBackup(el);
      } catch (err) {
        console.error(err);
        ui.toast('فایل پشتیبان معتبر نیست یا آسیب دیده است.','error');
      } finally {
        e.target.value = '';
      }
    };
  }
};
window.backupModule = backupModule;
