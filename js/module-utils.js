/* Shared UI helpers for the extended offline modules. */
function buildJalaliDateField(label,name,value='') {
  const d = value ? new Date(value) : new Date();
  const parts = value && !isNaN(d.getTime()) ? jalali.toJalali(d.getFullYear(), d.getMonth()+1, d.getDate()) : jalali.toJalali(new Date().getFullYear(),new Date().getMonth()+1,new Date().getDate());
  const range = jalali.jalaliYearRange();
  const months = jalali.JALALI_MONTHS || ['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];
  const days = (m,y) => Array.from({length:m<=6?31:m<=11?30:(jalCal(y).leap===0?30:29)},(_,i)=>i+1);
  const opts=(arr,sel,fmt=v=>v)=>arr.map(v=>`<option value="${v}" ${Number(v)===Number(sel)?'selected':''}>${fmt(v)}</option>`).join('');
  const years=Array.from({length:range.max-range.min+1},(_,i)=>range.min+i);
  return `<label class="field jalali-date-field"><span>${label}</span><div class="jalali-date-controls">
    <select data-jdate-part="y" data-jdate-name="${name}" aria-label="سال" ${value?'':'data-jdate-empty="1"'}>${opts(years,parts[0],v=>String(v).replace(/\d/g,d=>'۰۱۲۳۴۵۶۷۸۹'[d]))}</select>
    <select data-jdate-part="m" data-jdate-name="${name}" aria-label="ماه" ${value?'':'data-jdate-empty="1"'}>${opts(months.map((_,i)=>i+1),parts[1],v=>months[v-1])}</select>
    <select data-jdate-part="d" data-jdate-name="${name}" aria-label="روز" ${value?'':'data-jdate-empty="1"'}>${opts(days(parts[1],parts[0]),parts[2],v=>String(v).replace(/\d/g,d=>'۰۱۲۳۴۵۶۷۸۹'[d]))}</select>
    <input type="hidden" name="${name}" value="${value && !isNaN(d.getTime()) ? d.toISOString() : ''}" data-jdate-hidden="${name}">
  </div><small class="hint">تقویم شمسی — بازه ۱۰ سال قبل تا ۱۰ سال بعد</small></label>`;
}

function normalizeNumericString(value){
  return String(value ?? '')
    .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
    .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
    .replace(/[.,٬،\s]/g, '')
    .replace(/[^0-9-]/g, '');
}
function formatGroupedNumber(value){
  const raw = normalizeNumericString(value);
  if (!raw || raw === '-') return '';
  const negative = raw.startsWith('-');
  const digits = (negative ? raw.slice(1) : raw).replace(/^0+(?=\d)/, '');
  return (negative ? '-' : '') + digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
function numericValue(value){
  const raw = normalizeNumericString(value);
  if (!raw || raw === '-') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}
function bindMoneyInputs(root=document){
  root.querySelectorAll('input[data-money]').forEach(input=>{
    if(input.dataset.moneyBound==='1') return;
    input.dataset.moneyBound='1';
    input.type='text';
    input.inputMode='numeric';
    input.autocomplete='off';
    input.addEventListener('input',()=>{
      const raw = normalizeNumericString(input.value);
      const digits = raw.replace(/^-/, '').slice(0, 12);
      input.value = digits ? formatGroupedNumber((raw.startsWith('-') ? '-' : '') + digits) : '';
      if(input.value.length > 15) input.value = input.value.slice(0,15);
    });
    if(input.value) input.value = formatGroupedNumber(input.value);
  });
}

function syncJalaliDateFields(root) {
  root.querySelectorAll('[data-jdate-hidden]').forEach(hidden => {
    const name=hidden.dataset.jdateHidden;
    const partsEls = root.querySelectorAll(`[data-jdate-name="${name}"]`);
    if (!hidden.value && Array.from(partsEls).some(el => el.dataset.jdateEmpty === '1')) return;
    const y=Number(root.querySelector(`[data-jdate-part="y"][data-jdate-name="${name}"]`)?.value);
    const m=Number(root.querySelector(`[data-jdate-part="m"][data-jdate-name="${name}"]`)?.value);
    const day=Number(root.querySelector(`[data-jdate-part="d"][data-jdate-name="${name}"]`)?.value);
    const g=jalali.toGregorian(y,m,day);
    hidden.value = new Date(g.gy,g.gm-1,g.gd,12,0,0).toISOString();
  });
  root.querySelectorAll('[data-jdate-part]').forEach(el => {
    el.addEventListener('change', () => {
      root.querySelectorAll(`[data-jdate-name="${el.dataset.jdateName}"]`).forEach(x => delete x.dataset.jdateEmpty);
    });
  });
}

const mk = {
  esc(v=''){ return String(v ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); },
  money(v){ const n=Number(v||0); return n ? formatGroupedNumber(n)+' تومان' : '—'; },
  normalizeNumber(value){ return normalizeNumericString(value); },
  numberValue(value){ return numericValue(value); },
  groupedNumber(value){ return formatGroupedNumber(value); },
  bindMoneyInputs(root=document){ bindMoneyInputs(root); },
  date(v){ return v ? jalali.formatJalali(v) : '—'; },
  jalaliDate(label,name,value=''){ return buildJalaliDateField(label,name,value); },
  syncJalaliDates(root){ syncJalaliDateFields(root); },
  input(label,name,value='',type='text'){ const moneyNames=['amount','budgetMin','budgetMax','totalPrice','pricePerMeter','deposit','monthlyRent','fee','cost','price']; const isMoney=type==='number' && moneyNames.includes(name); return type==='date' ? buildJalaliDateField(label,name,value) : `<label class="field"><span>${label}</span><input name="${name}" type="${isMoney?'text':type}" ${isMoney?'inputmode="numeric" data-money maxlength="15"':''} value="${mk.esc(value)}"></label>`; },
  select(label,name,options,value=''){ return `<label class="field"><span>${label}</span><select name="${name}">${options.map(o=>`<option value="${mk.esc(o[0])}" ${o[0]===value?'selected':''}>${mk.esc(o[1])}</option>`).join('')}</select></label>`; },
  page(title,subtitle,action=''){ return `<div class="page-header"><div><h1>${title}</h1><p class="muted">${subtitle||''}</p></div>${action}</div>`; },
  table(headers,rows,empty='موردی ثبت نشده است'){ return `<div class="table-wrap"><table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.length?rows.join(''):`<tr><td colspan="${headers.length}" class="muted empty-cell">${empty}</td></tr>`}</tbody></table></div>`; },
  modalForm({title,fields,submit='ذخیره',size='lg',onSubmit}){ const body=document.createElement('form'); body.innerHTML=`<div class="form-grid">${fields.join('')}</div><div class="confirm-dialog__actions"><button type="button" class="btn btn--ghost" data-cancel>انصراف</button><button class="btn btn--primary">${submit}</button></div>`; const modal=ui.openModal({title,bodyEl:body,size}); body.addEventListener('submit',e=>{e.preventDefault(); syncJalaliDateFields(body); body.querySelectorAll('input[data-money]').forEach(input=>{ input.value=normalizeNumericString(input.value); }); onSubmit(new FormData(body),modal);}); body.querySelector('[data-cancel]').onclick=()=>modal.close(); return modal; },
  val(fd,k){ return fd.get(k)==null?'':String(fd.get(k)).trim(); }
};
function moduleNavButton(label,href){return `<a class="btn btn--ghost" href="${href}">${label}</a>`;}
window.mk=mk;
