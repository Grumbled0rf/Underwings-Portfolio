const STORAGE_KEY = 'uw_scope_cart_v1';
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

const PRICES = {
  offensive: {
    network_ext:[15000,36000],network_int:[26000,52000],web:[12000,32000],
    mobile_one:[14000,28000],mobile_both:[22000,44000],api:[12000,28000],
    cloud:[9000,20000],phishing:[3500,12000],va_only:[3500,10000],
  },
};
const SIZE_MULT_OFF = { xs:0.85, s:1.0, m:1.15, l:1.3 };

function loadCart() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (s.version !== 1) return null;
    if (Date.now() - s.updated_at > TTL_MS) { localStorage.removeItem(STORAGE_KEY); return null; }
    return s;
  } catch { return null; }
}
function saveCart(s) { s.updated_at = Date.now(); localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); }
function emptyCart() { return { items: [], universal: {}, founding_optin: false, updated_at: Date.now(), version: 1 }; }
function clearCart() { localStorage.removeItem(STORAGE_KEY); }

function fmtRange(low, high) { return `AED ${low.toLocaleString('en-AE')} – ${high.toLocaleString('en-AE')}`; }

function priceOffensive(a) {
  const m = SIZE_MULT_OFF[a.size] || 1;
  let low=0,high=0;
  for (const s of (a.services||[])) { const p = PRICES.offensive[s]; if (!p) continue; low += p[0]*m; high += p[1]*m; }
  if (a.authenticated) { low *= 1.05; high *= 1.10; }
  if (a.retest)        { low *= 1.05; high *= 1.05; }
  low  = Math.round(low /500)*500;
  high = Math.round(high/500)*500;
  return { low, high, summary: `Offensive · ${(a.services||[]).length} service(s) · ${(a.size||'s').toUpperCase()}${a.authenticated?' · authenticated':''}` };
}

function priceGrc(a) {
  const BASE = {
    iso27001:{gap:[14000,28000],implementation:[36000,88000]},
    nesa:{gap:[14000,35000],implementation:[40000,95000]},
    pdpl:{gap:[11000,24000],implementation:[22000,55000]},
    adhics:{gap:[18000,38000],implementation:[45000,100000]},
    dubai_isr:{gap:[16000,32000],implementation:[38000,80000]},
    pci:{gap:[18000,36000],implementation:[45000,95000]},
    risk_register:{gap:[14000,30000],implementation:[14000,30000]},
  };
  const SIZE = {xs:0.85,s:1.0,m:1.2,l:1.45};
  const SECT = {banking:1.2,healthcare:1.15,government:1.15,it:1.0,retail:1.0,sme:0.9,other:1.0};
  const TIME = {hard_deadline:1.15,six_months:1.0,twelve_months:0.95,roadmap:0.9};
  const m = (SIZE[a.size]||1)*(SECT[a.sector]||1)*(TIME[a.timeline]||1);
  const eng = a.engagement_default || 'gap';
  let low=0, high=0;
  for (const fw of (a.frameworks||[])) {
    const b = BASE[fw]; if (!b) continue;
    const r = b[eng] || b.gap;
    low += r[0]*m; high += r[1]*m;
  }
  low  = Math.round(low /500)*500;
  high = Math.round(high/500)*500;
  return { low, high, summary: `GRC · ${(a.frameworks||[]).join(', ')} · ${(a.size||'m').toUpperCase()}` };
}

function priceCloud(a) {
  const SCOPE = { azure:[9000,20000], m365:[7000,18000], entra:[6000,14000] };
  const M365 = {xs:0.85,s:1.0,m:1.2,l:1.45};
  const SUBS = {1:1.0,2:1.15,3:1.35};
  let low=0, high=0;
  for (const s of (a.scope||[])) {
    const b = SCOPE[s]; if (!b) continue;
    let m = 1;
    if (s === 'azure') m *= SUBS[a.azure_subs||1] || 1;
    if (s === 'm365' || s === 'entra') m *= M365[a.m365_users||'s'] || 1;
    low += b[0]*m; high += b[1]*m;
  }
  const pen = (a.conditional_access==='no'?0.05:0)+(a.mfa==='no'?0.05:0);
  low  *= (1+pen); high *= (1+pen);
  low  = Math.round(low /500)*500;
  high = Math.round(high/500)*500;
  return { low, high, summary: `Cloud · ${(a.scope||[]).join(' + ').toUpperCase()} · ${(a.m365_users||'s').toUpperCase()}` };
}

function priceFor(category, answers) {
  if (category==='offensive') return priceOffensive(answers);
  if (category==='grc')       return priceGrc(answers);
  if (category==='cloud')     return priceCloud(answers);
  return { low:0, high:0, summary: '' };
}

function bundle(items) {
  const subLow = items.reduce((s,i)=>s+i.range.low,0);
  const subHigh= items.reduce((s,i)=>s+i.range.high,0);
  const n = items.length;
  let pct = n===2?5 : n===3?10 : n>=4?15 : 0;
  const adjLow  = Math.round((subLow *(1-pct/100))/500)*500;
  const adjHigh = Math.round((subHigh*(1-pct/100))/500)*500;
  const signal = pct===0?'':`Bundle saves ~${pct}% — discussed in scoping call`;
  return { sub:{low:subLow,high:subHigh}, adj:{low:adjLow,high:adjHigh}, pct, signal };
}

const CROSS_SELL = [
  { if_added:'offensive', unless:['grc'],       suggest:'grc',       reason:'ISO 27001 requires evidence of penetration testing under control A.8.29.' },
  { if_added:'grc',       unless:['offensive'], suggest:'offensive', reason:'ISO and NESA both require evidence of pen testing — pair them now.' },
  { if_added:'cloud',     unless:['grc'],       suggest:'grc',       reason:'Cloud findings map cleanly to ISO 27017 evidence.' },
  { if_added:'cloud',     unless:['offensive'], suggest:'offensive', reason:'External pen test validates the cloud config from an attacker view.' },
];
function pickCross(added, current) {
  for (const r of CROSS_SELL) {
    if (r.if_added !== added) continue;
    if (r.unless.some((c)=>current.includes(c))) continue;
    return r;
  }
  return null;
}

function readForm(category, fieldset) {
  const a = {};
  fieldset.querySelectorAll('input, select, textarea').forEach((el) => {
    if (el.name === 'services' || el.name === 'frameworks' || el.name === 'scope') {
      if (!a[el.name]) a[el.name] = [];
      if (el.checked) a[el.name].push(el.value);
    } else if (el.type === 'checkbox') {
      a[el.name] = el.checked;
    } else {
      a[el.name] = el.value;
    }
  });
  if (a.azure_subs) a.azure_subs = parseInt(a.azure_subs, 10);
  return a;
}

export function initScopeBuilder({ seed }) {
  let state = loadCart();
  const hadResumable = !!state && state.items.length > 0;
  if (!state) state = emptyCart();

  if (hadResumable) {
    const r = document.getElementById('sb-resume');
    if (r) r.hidden = false;
    document.getElementById('sb-resume-continue')?.addEventListener('click', () => { document.getElementById('sb-resume').hidden = true; render(); });
    document.getElementById('sb-resume-fresh')?.addEventListener('click', () => { clearCart(); state = emptyCart(); document.getElementById('sb-resume').hidden = true; render(); });
  }

  document.querySelectorAll('[data-learn]').forEach((b) => b.addEventListener('click', () => openLearn(b.dataset.learn)));
  document.querySelectorAll('.sb-drawer [data-close], .sb-drawer-bg').forEach((el) => el.addEventListener('click', () => closeAllLearn()));
  document.querySelectorAll('[data-add]').forEach((b) => b.addEventListener('click', () => { closeAllLearn(); openConfig(b.dataset.add); }));

  document.querySelectorAll('#sb-cfg-drawer [data-close], #sb-cfg-drawer .sb-cfg-bg').forEach((el) => el.addEventListener('click', closeConfig));
  const form = document.getElementById('sb-cfg-form');
  if (form) form.addEventListener('input', updateLiveRange);
  document.getElementById('sb-cfg-save')?.addEventListener('click', saveFromForm);
  document.getElementById('sb-cart-continue')?.addEventListener('click', goToEnquiry);

  document.getElementById('sb-xs-no')?.addEventListener('click', () => { document.getElementById('sb-crosssell').hidden = true; });
  document.getElementById('sb-xs-yes')?.addEventListener('click', () => {
    const cat = document.getElementById('sb-crosssell').dataset.suggest;
    document.getElementById('sb-crosssell').hidden = true;
    if (cat) openConfig(cat);
  });

  if (seed && ['offensive','grc','cloud'].includes(seed)) setTimeout(() => openConfig(seed), 240);

  let currentEditId = null;
  let currentCategory = null;

  function openLearn(cat) { closeAllLearn(); document.getElementById(`sb-drawer-${cat}`)?.classList.add('is-open'); }
  function closeAllLearn() { document.querySelectorAll('.sb-drawer').forEach((d) => d.classList.remove('is-open')); }

  function openConfig(category, item) {
    currentCategory = category; currentEditId = item ? item.id : null;
    const drawer = document.getElementById('sb-cfg-drawer');
    drawer.classList.add('is-open');
    document.getElementById('sb-cfg-title').textContent = `Configure ${category[0].toUpperCase()}${category.slice(1)}`;
    drawer.querySelectorAll('fieldset[data-cat]').forEach((fs) => { fs.hidden = fs.dataset.cat !== category; });
    if (item) hydrateForm(category, item.answers, item.comments);
    else clearForm();
    updateLiveRange();
  }
  function closeConfig() { document.getElementById('sb-cfg-drawer').classList.remove('is-open'); currentEditId = null; currentCategory = null; }

  function hydrateForm(category, answers, comments) {
    const fs = document.querySelector(`fieldset[data-cat="${category}"]`);
    fs.querySelectorAll('input, select, textarea').forEach((el) => {
      if (Array.isArray(answers[el.name])) { el.checked = answers[el.name].includes(el.value); }
      else if (el.type === 'checkbox') el.checked = !!answers[el.name];
      else if (answers[el.name] !== undefined) el.value = answers[el.name];
    });
    document.querySelector('textarea[name="comments"]').value = comments || '';
  }
  function clearForm() {
    document.querySelectorAll('#sb-cfg-form input, #sb-cfg-form select, #sb-cfg-form textarea').forEach((el) => {
      if (el.type === 'checkbox') el.checked = false;
      else if (el.tagName === 'SELECT') el.selectedIndex = [...el.options].findIndex((o) => o.defaultSelected) || 0;
      else el.value = '';
    });
  }
  function readActiveAnswers() {
    if (!currentCategory) return {};
    const fs = document.querySelector(`fieldset[data-cat="${currentCategory}"]`);
    return readForm(currentCategory, fs);
  }
  function updateLiveRange() {
    const a = readActiveAnswers();
    const r = priceFor(currentCategory, a);
    document.getElementById('sb-cfg-range').textContent = (r.low === 0 && r.high === 0) ? '— pick at least one option —' : fmtRange(r.low, r.high);
  }
  function saveFromForm() {
    const a = readActiveAnswers();
    const r = priceFor(currentCategory, a);
    if (r.low === 0 && r.high === 0) { return; }
    const comments = document.querySelector('textarea[name="comments"]').value.trim();
    const newItem = { id: currentEditId || crypto.randomUUID(), category: currentCategory, answers: a, comments: comments || undefined, range: { low: r.low, high: r.high }, summary: r.summary };
    if (currentEditId) {
      state.items = state.items.map((i) => i.id === currentEditId ? newItem : i);
    } else {
      state.items.push(newItem);
    }
    saveCart(state);
    closeConfig();
    if (!currentEditId) maybeShowCrossSell(newItem.category);
    render();
  }
  function maybeShowCrossSell(addedCat) {
    const cats = state.items.map((i) => i.category);
    const r = pickCross(addedCat, cats);
    const slot = document.getElementById('sb-crosssell');
    if (!slot) return;
    if (!r) { slot.hidden = true; return; }
    slot.hidden = false;
    slot.dataset.suggest = r.suggest;
    document.getElementById('sb-xs-msg').textContent = `You added ${addedCat}. ${r.reason} Add ${r.suggest}?`;
  }
  function removeItem(id) { state.items = state.items.filter((i) => i.id !== id); saveCart(state); render(); }
  function editItem(id) { const item = state.items.find((i) => i.id === id); if (item) openConfig(item.category, item); }
  function render() {
    const list = document.getElementById('sb-cart-list');
    const empty = document.getElementById('sb-cart-empty');
    const totals = document.getElementById('sb-cart-totals');
    const continueBtn = document.getElementById('sb-cart-continue');
    list.innerHTML = '';
    if (state.items.length === 0) {
      list.appendChild(empty);
      totals.hidden = true;
      continueBtn.disabled = true;
      document.getElementById('sb-cart-count').textContent = '0 items';
      return;
    }
    state.items.forEach((it) => {
      const li = document.createElement('li');
      li.innerHTML = `<span class="sb-cart-line-summary">${escapeHtml(it.summary)}</span>
        <span class="sb-cart-line-range">${fmtRange(it.range.low, it.range.high)}</span>
        <span class="sb-cart-line-actions"><button data-edit>Edit</button><button data-remove>Remove</button></span>`;
      li.querySelector('[data-edit]').addEventListener('click', () => editItem(it.id));
      li.querySelector('[data-remove]').addEventListener('click', () => removeItem(it.id));
      list.appendChild(li);
    });
    const b = bundle(state.items);
    document.getElementById('sb-cart-sub').textContent = fmtRange(b.sub.low, b.sub.high);
    document.getElementById('sb-cart-adj').textContent = fmtRange(b.adj.low, b.adj.high);
    const sav = document.getElementById('sb-cart-savings');
    if (b.pct > 0) {
      sav.hidden = false;
      document.getElementById('sb-cart-savings-label').textContent = b.signal;
      document.getElementById('sb-cart-savings-pct').textContent = `−${b.pct}%`;
    } else { sav.hidden = true; }
    totals.hidden = false;
    continueBtn.disabled = false;
    document.getElementById('sb-cart-count').textContent = `${state.items.length} item${state.items.length===1?'':'s'}`;
  }
  function goToEnquiry() { window.location.href = '/scope-builder/enquiry'; }
  function escapeHtml(s) { return String(s).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  render();
}
