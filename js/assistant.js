/*
 * Offline Smart Assistant
 * No external API or license dependency. Answers using current local database.
 */
const assistantModule = {
  async render(el) {
    el.innerHTML = `
      ${mk.page('دستیار هوشمند', 'دستیار آفلاین ملک‌یار برای جستجو، خلاصه‌سازی و انجام عملیات سریع')}
      <div class="assistant-shell">
        <div class="assistant-card">
          <div class="assistant-card__header">
            <div class="assistant-avatar">🤖</div>
            <div><strong>دستیار ملک‌یار</strong><div class="muted">متصل به داده‌های همین برنامه</div></div>
          </div>
          <div id="assistant-messages" class="assistant-messages">
            <div class="assistant-message assistant-message--bot">سلام! می‌توانم فایل‌ها، مشتری‌ها، معاملات و کمیسیون‌ها را بررسی کنم. مثلاً بپرسید «این ماه چند معامله دارم؟» یا «۵ فایل ارزان‌تر را نشان بده».</div>
          </div>
          <form id="assistant-form" class="assistant-form">
            <input id="assistant-input" autocomplete="off" placeholder="سؤال یا دستور خود را بنویسید…">
            <button class="btn btn--primary">ارسال</button>
          </form>
          <div class="assistant-suggestions">
            <button type="button" data-q="خلاصه وضعیت امروز را بگو">خلاصه امروز</button>
            <button type="button" data-q="معاملات را بررسی کن">معاملات</button>
            <button type="button" data-q="کمیسیون‌های ثبت‌شده را بگو">کمیسیون</button>
            <button type="button" data-q="۵ فایل ارزان‌تر را نشان بده">فایل‌های ارزان</button>
          </div>
        </div>
      </div>`;

    const form = el.querySelector('#assistant-form');
    const input = el.querySelector('#assistant-input');
    const messages = el.querySelector('#assistant-messages');

    const add = (text, bot=false) => {
      const node = document.createElement('div');
      node.className = `assistant-message ${bot ? 'assistant-message--bot' : 'assistant-message--user'}`;
      node.textContent = text;
      messages.appendChild(node);
      messages.scrollTop = messages.scrollHeight;
    };

    const answer = async (q) => {
      const text = q.trim().toLowerCase();
      if (!text) return;

      const [properties, customers, deals, commissions, transactions] = await Promise.all([
        db.properties.getAll(), db.customers.getAll(), db.deals.getAll(), db.commissions.getAll(), db.transactions.getAll()
      ]);

      if (/سلام|hello|hi/.test(text)) return 'سلام! آماده‌ام. داده‌های محلی ملک‌یار را بررسی می‌کنم و می‌توانم گزارش‌های سریع بدهم.';
      if (/خلاصه|وضعیت|امروز/.test(text)) {
        const openDeals = deals.filter(d => d.status !== 'cancelled' && d.status !== 'settled').length;
        const activeProps = properties.filter(p => ['active','needs_review'].includes(p.status)).length;
        const openCom = commissions.filter(c => c.status !== 'settled').length;
        return `وضعیت فعلی: ${properties.length} فایل، ${customers.length} مشتری، ${deals.length} معامله، ${openDeals} معامله در جریان و ${openCom} کمیسیون تسویه‌نشده. ${activeProps} فایل فعال/نیازمند بررسی است.`;
      }
      if (/کمیسیون/.test(text)) {
        const total = commissions.reduce((s,c) => s + Number(c.amount || 0), 0);
        const open = commissions.filter(c => c.status !== 'settled').length;
        return `${commissions.length} کمیسیون ثبت شده؛ مجموع مبلغ کمیسیون ${mk.money(total)} است و ${open} مورد هنوز تسویه نشده است.`;
      }
      if (/معاملات|معامله/.test(text)) {
        if (!deals.length) return 'هنوز معامله‌ای ثبت نشده است. از منوی «معاملات» یک مورد ثبت کنید.';
        const total = deals.filter(d => d.status !== 'cancelled').reduce((s,d) => s + Number(d.amount || 0), 0);
        const last = deals.slice().sort((a,b) => new Date(b.date)-new Date(a.date))[0];
        return `${deals.length} معامله ثبت شده و مجموع مبلغ معاملات غیرلغوشده ${mk.money(total)} است. آخرین معامله #${last.id} با وضعیت «${last.status || 'نامشخص'}» است.`;
      }
      if (/فایل|ملک/.test(text)) {
        const under = properties.slice().filter(p => Number(p.totalPrice) > 0).sort((a,b) => Number(a.totalPrice)-Number(b.totalPrice));
        const nMatch = text.match(/(\d+)/);
        const n = Math.min(Math.max(Number(nMatch?.[1] || 5), 1), 20);
        if (!under.length) return 'فایلی با قیمت ثبت‌شده پیدا نشد.';
        return `ارزان‌ترین ${n} فایل: ` + under.slice(0,n).map(p => `${p.code || '#' + p.id}: ${mk.money(p.totalPrice)}`).join(' | ');
      }
      if (/مناسب|تطبیق|پیشنهاد|هماهنگ|فایل.*مشتری|مشتری.*فایل/.test(text)) {
        const wanted = customers.filter(c => ['rent_wanted','buy_wanted'].includes(c.status));
        const active = properties.filter(p => p.status !== 'sold' && p.status !== 'archived');
        const matches=[];
        for(const c of wanted){
          for(const p of active){
            let score=0, reasons=[];
            const budget=Number(c.budgetMax||c.budget||0), price=Number(p.totalPrice||0);
            if(budget>0 && price>0){ if(price<=budget){score+=40;reasons.push('بودجه')} else if(price<=budget*1.1){score+=20;reasons.push('نزدیک بودجه');} }
            const area=Number(c.desiredMeterage||0), pa=Number(p.totalArea||0);
            if(area>0 && pa>0){const diff=Math.abs(pa-area)/area; if(diff<=.15){score+=30;reasons.push('متراژ');} else if(diff<=.3){score+=15;reasons.push('متراژ نزدیک');}}
            const beds=Number(c.desiredBedrooms||0), pb=Number(p.bedrooms||0); if(beds>0&&pb>=beds){score+=20;reasons.push('خواب');}
            if(score>=50) matches.push({c,p,score,reasons});
          }
        }
        matches.sort((a,b)=>b.score-a.score);
        if(!matches.length) return 'در حال حاضر فایل با تطبیق کافی برای خواهان‌های خرید/اجاره پیدا نشد.';
        return 'تطبیق‌های پیشنهادی: '+matches.slice(0,8).map(m=>`فایل ${m.p.code||m.p.id} برای مشتری ${m.c.name} مناسب است (${m.score}%، ${m.reasons.join('، ')})`).join(' | ');
      }
      if (/مشتری/.test(text)) return `${customers.length} مشتری در سیستم دارید. ${customers.filter(c => c.status === 'active').length} نفر وضعیت فعال دارند.`;
      if (/مالی|تراکنش|حسابداری/.test(text)) {
        const income = transactions.filter(t => t.type === 'income').reduce((s,t) => s + Number(t.amount || 0), 0);
        const expense = transactions.filter(t => t.type === 'expense').reduce((s,t) => s + Number(t.amount || 0), 0);
        return `خلاصه تراکنش‌ها: درآمد ${mk.money(income)}، هزینه ${mk.money(expense)} و خالص ${mk.money(income-expense)}.`;
      }
      return 'این درخواست را در حالت آفلاین متوجه نشدم. درباره «فایل‌ها»، «مشتری‌ها»، «معاملات»، «کمیسیون»، «مالی» یا «خلاصه وضعیت» سؤال کنید.';
    };

    form.addEventListener('submit', async e => {
      e.preventDefault();
      const q = input.value.trim();
      if (!q) return;
      add(q);
      input.value = '';
      add(await answer(q), true);
    });
    el.querySelectorAll('[data-q]').forEach(b => b.addEventListener('click', () => {
      input.value = b.dataset.q;
      form.requestSubmit();
    }));
  }
};
window.assistantModule = assistantModule;
