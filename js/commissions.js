const commissionsModule = {
  async renderCommissions(el) {
    const [commissions, deals, properties, customers] = await Promise.all([
      db.commissions.getAll(),
      db.deals.getAll(),
      db.properties.getAll(),
      db.customers.getAll()
    ]);

    const propertyName = id => properties.find(p => Number(p.id) === Number(id))?.code || `فایل #${id || '—'}`;
    const customerName = id => customers.find(c => Number(c.id) === Number(id))?.name || `مشتری #${id || '—'}`;
    const dealLabel = d => {
      const type = ({sale:'فروش', rent:'اجاره', pre_sale:'پیش‌فروش', exchange:'معاوضه'})[d.type] || d.type || 'معامله';
      return `#${d.id} — ${type} — ${propertyName(d.propertyId)} — ${customerName(d.customerId)} — ${mk.money(d.amount)}`;
    };

    const rows = commissions.map(c => {
      const d = deals.find(x => Number(x.id) === Number(c.dealId));
      return `<tr>
        <td>${d ? mk.esc(dealLabel(d)) : `#${mk.esc(c.dealId)}`}</td>
        <td>${Number(c.rate || 0)}%</td>
        <td>${mk.money(c.amount)}</td>
        <td>${mk.money(c.officeShare)}</td>
        <td>${mk.money(c.agentShare)}</td>
        <td>${mk.esc(c.status === 'settled' ? 'تسویه شده' : 'تسویه نشده')}</td>
        <td><button class="btn btn--danger btn--sm" data-del="${c.id}">حذف</button></td>
      </tr>`;
    });

    const action = `<button class="btn btn--primary" id="add">+ ثبت کمیسیون</button>`;
    el.innerHTML = mk.page('کمیسیون', 'محاسبه و ثبت سهم دفتر و مشاور', action) +
      (deals.length
        ? mk.table(['معامله','درصد','مبلغ کمیسیون','سهم دفتر','سهم مشاور','وضعیت','عملیات'], rows)
        : `<div class="state state--empty">
             <h3>هنوز معامله‌ای برای کمیسیون وجود ندارد</h3>
             <p>ابتدا یک معامله ثبت کنید؛ معاملات ثبت‌شده بلافاصله در فرم کمیسیون نمایش داده می‌شوند.</p>
             <a class="btn btn--ghost" href="#/deals">رفتن به معاملات</a>
           </div>`);

    const addBtn = el.querySelector('#add');
    addBtn.onclick = () => {
      if (!deals.length) {
        ui.toast('ابتدا حداقل یک معامله ثبت کنید.', 'error');
        location.hash = '#/deals';
        return;
      }

      const dealOptions = [['', 'انتخاب معامله'], ...deals
        .slice()
        .sort((a,b) => Number(b.id) - Number(a.id))
        .map(d => [String(d.id), dealLabel(d)])];

      const modal = mk.modalForm({
        title: 'ثبت کمیسیون',
        fields: [
          mk.select('معامله', 'dealId', dealOptions),
          mk.input('درصد کمیسیون', 'rate', '1.5', 'number'),
          mk.input('مبلغ کمیسیون', 'amount', '', 'number'),
          mk.input('درصد سهم دفتر', 'officeRate', '50', 'number'),
          mk.input('سهم دفتر', 'officeShare', '', 'number'),
          mk.input('سهم مشاور', 'agentShare', '', 'number'),
          mk.select('وضعیت', 'status', [['open','تسویه نشده'],['settled','تسویه شده']])
        ],
        onSubmit: async (fd, m) => {
          const dealId = Number(mk.val(fd, 'dealId'));
          const deal = deals.find(d => Number(d.id) === dealId);
          if (!deal) { ui.toast('معامله انتخاب‌شده معتبر نیست.', 'error'); return; }

          const rate = Number(mk.val(fd, 'rate') || 0);
          const amount = Number(mk.val(fd, 'amount') || 0);
          const officeRate = Number(mk.val(fd, 'officeRate') || 0);
          const commissionAmount = amount || (Number(deal.amount || 0) * rate / 100);
          const officeShare = Number(mk.val(fd, 'officeShare') || (commissionAmount * officeRate / 100));
          const agentShare = Number(mk.val(fd, 'agentShare') || (commissionAmount - officeShare));

          if (rate < 0 || commissionAmount < 0 || officeRate < 0 || officeRate > 100) {
            ui.toast('مقادیر درصد و مبلغ را بررسی کنید.', 'error'); return;
          }

          await db.commissions.add({
            dealId,
            rate,
            amount: commissionAmount,
            officeRate,
            officeShare,
            agentShare,
            status: mk.val(fd, 'status') || 'open', createdBy: AUTH.currentUser()?.username || null, createdByName: AUTH.currentUser()?.name || AUTH.currentUser()?.username || 'سیستم'
          });
          m.close();
          await this.renderCommissions(el);
          ui.toast('کمیسیون با موفقیت ثبت شد.', 'success');
        }
      });

      const dealSelect = modal?.overlay?.querySelector?.('[name="dealId"]');
      if (!dealSelect) return;
      const rateInput = modal.overlay.querySelector('[name="rate"]');
      const amountInput = modal.overlay.querySelector('[name="amount"]');
      const officeRateInput = modal.overlay.querySelector('[name="officeRate"]');
      const officeShareInput = modal.overlay.querySelector('[name="officeShare"]');
      const agentShareInput = modal.overlay.querySelector('[name="agentShare"]');

      const recalc = () => {
        const d = deals.find(x => Number(x.id) === Number(dealSelect.value));
        const rate = Number(rateInput.value || 0);
        const amount = d ? Number(d.amount || 0) * rate / 100 : 0;
        if (!amountInput.value || Number(amountInput.value) === 0) amountInput.value = amount ? Math.round(amount) : '';
        const total = Number(amountInput.value || amount || 0);
        const office = total * Number(officeRateInput.value || 0) / 100;
        officeShareInput.value = total ? Math.round(office) : '';
        agentShareInput.value = total ? Math.round(total - office) : '';
      };
      dealSelect.addEventListener('change', recalc);
      rateInput.addEventListener('input', recalc);
      officeRateInput.addEventListener('input', recalc);
      amountInput.addEventListener('input', recalc);
    };

    el.querySelectorAll('[data-del]').forEach(btn => btn.onclick = async () => {
      if (await ui.confirmDialog('این کمیسیون حذف شود؟')) {
        await db.commissions.remove(Number(btn.dataset.del));
        await this.renderCommissions(el);
        ui.toast('کمیسیون حذف شد.', 'success');
      }
    });
  }
};
window.commissionsModule = commissionsModule;
