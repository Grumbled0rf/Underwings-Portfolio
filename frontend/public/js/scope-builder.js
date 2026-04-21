/* ==========================================================================
   Scope Builder Wizard — Offensive Security
   Vanilla JS, no framework. 4-step wizard → pricing calc → /api/scope-builder
   ========================================================================== */

(function () {
  'use strict';

  const form = document.getElementById('sb-form');
  if (!form) return;

  const panels = Array.from(form.querySelectorAll('[data-panel]'));
  // v2 DOM (preferred): step nodes + rail fill
  const railFill = document.getElementById('sb-rail-fill');
  const stepNodes = Array.from(document.querySelectorAll('#sb-progress .sb-step-node'));
  // v1 DOM fallback — progress bar + step pills (kept for safety if markup reverts)
  const progressBar = document.querySelector('#sb-progress .sb-progress-bar');
  const progressSteps = Array.from(document.querySelectorAll('#sb-progress .sb-step'));
  // Sidebar (desktop)
  const sideList = document.getElementById('sb-side-list');
  const sideEstimate = document.getElementById('sb-side-estimate');
  const sideEstimateVal = document.getElementById('sb-side-estimate-value');

  // ── Pricing matrix (AED) ────────────────────────────────────────────
  const PRICES = {
    network_ext:   { low: 20000, high: 45000 },
    network_int:   { low: 35000, high: 65000 },
    web:           { low: 15000, high: 40000 }, // per app
    mobile_one:    { low: 18000, high: 35000 }, // per platform
    mobile_both:   { low: 30000, high: 55000 },
    api:           { low: 15000, high: 35000 },
    cloud:         { low: 12000, high: 25000 }, // per provider
    phishing_base: { low:  8000, high: 15000 }, // up to 200 employees
    phishing_add:  { low:  3000, high:  5000 }, // per additional 200
    va_only:       { low:  5000, high: 15000 },
  };

  const SIZE_MULT = { xs: 0.85, s: 1.0, m: 1.15, l: 1.3 };
  const URGENT_MULT = 1.2;

  // Bundle discount on TOTAL when 2+ distinct categories.
  const BUNDLE_DISCOUNT = { 2: 0.15, 3: 0.20 };

  const FRAMEWORK_LABELS = {
    iso27001: 'ISO 27001',
    uae_ia:   'UAE IA V2',
    adhics:   'ADHICS v2 (UAE Healthcare)',
    pci_dss:  'PCI DSS',
    soc2:     'SOC 2',
    other:    'your framework',
  };

  // Compliance-driven scope auto-suggestion (used when driver=compliance
  // and user has NOT checked any asset boxes yet — acts as prefill).
  const FRAMEWORK_REQUIRED_SCOPE = {
    iso27001: ['network_ext', 'web'],
    uae_ia:   ['network_ext', 'network_int', 'phishing'],
    adhics:   ['network_ext', 'web'],
    pci_dss:  ['network_ext', 'network_int', 'web'],
    soc2:     ['network_ext', 'web', 'api'],
    other:    [],
  };

  // ── State ──────────────────────────────────────────────────────────
  const state = {
    currentStep: 1,
    driver: '',
    framework: '',
    assets: {}, // keyed by asset_* name → 1 or details object
    timeline: '',
    size: '',
  };

  // ── Helpers ────────────────────────────────────────────────────────
  function showPanel(n) {
    panels.forEach(p => {
      const target = String(p.dataset.panel);
      if (target === String(n)) p.classList.add('active'), p.removeAttribute('hidden');
      else p.classList.remove('active'), p.setAttribute('hidden', '');
    });
    state.currentStep = n;
    updateProgress(n);
    try { window.scrollTo({ top: document.querySelector('#sb-progress').offsetTop - 20, behavior: 'smooth' }); } catch (e) {}
  }

  function updateProgress(n) {
    if (typeof n !== 'number') return;
    // Rail fills 0% → 100% across steps 1 → 5.
    const pct = Math.min(100, ((n - 1) / 4) * 100);
    if (railFill) railFill.style.width = pct + '%';
    if (progressBar) progressBar.style.width = Math.min(100, (n / 5) * 100) + '%';
    stepNodes.forEach(s => {
      const step = parseInt(s.dataset.step, 10);
      s.classList.toggle('active', step <= n);
      s.classList.toggle('current', step === n);
    });
    progressSteps.forEach(s => {
      const step = parseInt(s.dataset.step, 10);
      s.classList.toggle('active', step <= n);
      s.classList.toggle('current', step === n);
    });
    const el = document.getElementById('sb-progress');
    if (el) el.setAttribute('aria-valuenow', String(n));
  }

  // ── Live sidebar summary ───────────────────────────────────────────
  const DRIVER_LABELS_JS = {
    compliance: 'Compliance or audit',
    client_request: 'Enterprise client requested',
    product_launch: 'Product launch',
    incident: 'Incident / close call',
    unsure: 'Exploring / not sure',
  };
  const FRAMEWORK_LABELS_JS = {
    iso27001: 'ISO 27001', uae_ia: 'UAE IA V2', adhics: 'ADHICS', pci_dss: 'PCI DSS', soc2: 'SOC 2', other: 'Other',
  };
  const TIMELINE_LABELS_JS = {
    urgent: 'Urgent · 2 weeks', quarter: 'This quarter', planning: '3 – 6 months', exploring: 'Exploring',
  };
  const SIZE_LABELS_JS = {
    xs: '1 – 20 employees', s: '20 – 100', m: '100 – 500', l: '500+',
  };
  const ASSET_LABELS_JS = {
    asset_network_ext: 'External network',
    asset_network_int: 'Internal network / AD',
    asset_web: 'Web application(s)',
    asset_mobile: 'Mobile app',
    asset_api: 'Standalone API',
    asset_cloud: 'Cloud config',
    asset_phishing: 'Phishing simulation',
    asset_va_only: 'VA only',
  };

  function updateSidebar() {
    if (!sideList) return;
    const fd = new FormData(form);
    const items = [];

    const driver = fd.get('driver');
    if (driver) {
      let val = DRIVER_LABELS_JS[driver] || driver;
      const fw = fd.get('framework');
      if (driver === 'compliance' && fw) val += ' — ' + (FRAMEWORK_LABELS_JS[fw] || fw);
      items.push({ key: 'Driver', val });
    }

    const assetKeys = Object.keys(ASSET_LABELS_JS).filter(k => fd.get(k));
    if (assetKeys.length) {
      const labels = assetKeys.map(k => {
        let lbl = ASSET_LABELS_JS[k];
        if (k === 'asset_web') {
          const c = parseInt(fd.get('asset_web_count') || '1', 10);
          if (c > 1) lbl = `Web apps × ${c}`;
        }
        if (k === 'asset_mobile') {
          const p = fd.get('asset_mobile_platform');
          if (p === 'both') lbl = 'Mobile (iOS + Android)';
          else if (p === 'ios') lbl = 'Mobile (iOS)';
          else if (p === 'android') lbl = 'Mobile (Android)';
        }
        if (k === 'asset_cloud') {
          const c = parseInt(fd.get('asset_cloud_count') || '1', 10);
          if (c > 1) lbl = `Cloud × ${c} providers`;
        }
        if (k === 'asset_phishing') {
          const c = parseInt(fd.get('asset_phishing_count') || '100', 10);
          lbl = `Phishing (${c} users)`;
        }
        return lbl;
      });
      items.push({ key: 'Scope', val: labels.join(' · ') });
    }

    const tl = fd.get('timeline');
    if (tl) items.push({ key: 'Timeline', val: TIMELINE_LABELS_JS[tl] || tl });

    const sz = fd.get('size');
    if (sz) items.push({ key: 'Size', val: SIZE_LABELS_JS[sz] || sz });

    if (items.length === 0) {
      sideList.innerHTML = '<li class="sb-side-empty">As you answer, your selections appear here.</li>';
    } else {
      sideList.innerHTML = items.map(i => `<li><span class="sb-side-key">${i.key}</span><span class="sb-side-val">${i.val}</span></li>`).join('');
    }

    // Show cheap estimate once all 4 answered
    if (driver && assetKeys.length && tl && sz) {
      try {
        const ans = collectAnswers();
        const q = calculateQuote(ans);
        if (q.lines.length && sideEstimate && sideEstimateVal) {
          sideEstimateVal.textContent = `${fmtAED(q.low)} – ${fmtAED(q.high)}`;
          sideEstimate.removeAttribute('hidden');
        }
      } catch (e) { /* ignore */ }
    } else if (sideEstimate) {
      sideEstimate.setAttribute('hidden', '');
    }
  }

  function fmtAED(n) {
    return 'AED ' + Math.round(n).toLocaleString('en-US');
  }

  // Validate next-button enablement per panel.
  function validateStep(n) {
    switch (n) {
      case 1: {
        const driver = form.querySelector('input[name="driver"]:checked');
        if (!driver) return false;
        if (driver.value === 'compliance') {
          return !!form.querySelector('input[name="framework"]:checked');
        }
        return true;
      }
      case 2: {
        return form.querySelectorAll('.sb-assets input[type="checkbox"]:checked').length > 0;
      }
      case 3: return !!form.querySelector('input[name="timeline"]:checked');
      case 4: return !!form.querySelector('input[name="size"]:checked');
      default: return true;
    }
  }

  function refreshNextButton(n) {
    const panel = panels.find(p => String(p.dataset.panel) === String(n));
    if (!panel) return;
    const nextBtn = panel.querySelector('[data-next]');
    if (!nextBtn) return;
    nextBtn.disabled = !validateStep(n);
  }

  // ── Step 1 — driver + framework sub-question ───────────────────────
  form.querySelectorAll('input[name="driver"]').forEach(el => {
    el.addEventListener('change', () => {
      state.driver = el.value;
      const sub = document.getElementById('sb-subq-framework');
      if (el.value === 'compliance') sub.removeAttribute('hidden');
      else {
        sub.setAttribute('hidden', '');
        form.querySelectorAll('input[name="framework"]').forEach(f => { f.checked = false; });
        state.framework = '';
      }
      refreshNextButton(1);
      updateSidebar();
    });
  });
  form.querySelectorAll('input[name="framework"]').forEach(el => {
    el.addEventListener('change', () => {
      state.framework = el.value;
      refreshNextButton(1);
      updateSidebar();
    });
  });

  // ── Step 2 — asset checkboxes with count triggers ──────────────────
  form.querySelectorAll('.sb-asset input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', () => {
      const trigger = cb.dataset.countTrigger;
      if (trigger) {
        const detail = form.querySelector('[data-count-for="' + trigger + '"]');
        if (detail) {
          if (cb.checked) detail.removeAttribute('hidden');
          else detail.setAttribute('hidden', '');
        }
      }
      refreshNextButton(2);
      updateSidebar();
    });
  });
  // Count / platform nested inputs also refresh sidebar
  form.querySelectorAll('.sb-asset-count input').forEach(inp => {
    inp.addEventListener('input', updateSidebar);
    inp.addEventListener('change', updateSidebar);
  });

  // ── Step 3 & 4 — radio choices ─────────────────────────────────────
  form.querySelectorAll('input[name="timeline"]').forEach(el => {
    el.addEventListener('change', () => { state.timeline = el.value; refreshNextButton(3); updateSidebar(); });
  });
  form.querySelectorAll('input[name="size"]').forEach(el => {
    el.addEventListener('change', () => { state.size = el.value; refreshNextButton(4); updateSidebar(); });
  });

  // ── Navigation buttons ─────────────────────────────────────────────
  form.querySelectorAll('[data-next]').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = parseInt(btn.dataset.next, 10);
      if (!validateStep(state.currentStep)) return;
      if (target === 5) computeAndRenderOutput();
      showPanel(target);
    });
  });
  form.querySelectorAll('[data-prev]').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = parseInt(btn.dataset.prev, 10);
      showPanel(target);
    });
  });

  // ── Gather form state ──────────────────────────────────────────────
  function collectAnswers() {
    const fd = new FormData(form);
    const a = {
      network_ext: !!fd.get('asset_network_ext'),
      network_int: !!fd.get('asset_network_int'),
      web: !!fd.get('asset_web'),
      web_count: parseInt(fd.get('asset_web_count') || '1', 10),
      mobile: !!fd.get('asset_mobile'),
      mobile_platform: fd.get('asset_mobile_platform') || '',
      api: !!fd.get('asset_api'),
      cloud: !!fd.get('asset_cloud'),
      cloud_count: parseInt(fd.get('asset_cloud_count') || '1', 10),
      phishing: !!fd.get('asset_phishing'),
      phishing_count: parseInt(fd.get('asset_phishing_count') || '100', 10),
      va_only: !!fd.get('asset_va_only'),
    };
    return {
      driver: state.driver,
      framework: state.framework,
      timeline: state.timeline,
      size: state.size,
      assets: a,
    };
  }

  // ── Core pricing calculator ────────────────────────────────────────
  function calculateQuote(ans) {
    const a = ans.assets;
    const lines = []; // [{ key, label, low, high }]

    if (a.network_ext) lines.push({ key: 'network_ext', label: 'External Network Penetration Test', ...PRICES.network_ext });
    if (a.network_int) lines.push({ key: 'network_int', label: 'Internal Network / Active Directory Pentest', ...PRICES.network_int });

    if (a.web) {
      const n = Math.max(1, a.web_count || 1);
      const p = PRICES.web;
      // Additional web apps cost +60% of base each (shared tester ramp-up)
      const low = p.low + (n - 1) * p.low * 0.6;
      const high = p.high + (n - 1) * p.high * 0.6;
      lines.push({ key: 'web', label: n === 1 ? 'Web Application Pentest' : `Web Application Pentest (${n} apps)`, low, high });
    }

    if (a.mobile) {
      if (a.mobile_platform === 'both') {
        lines.push({ key: 'mobile', label: 'Mobile App Pentest (iOS + Android)', ...PRICES.mobile_both });
      } else if (a.mobile_platform === 'ios' || a.mobile_platform === 'android') {
        const plat = a.mobile_platform === 'ios' ? 'iOS' : 'Android';
        lines.push({ key: 'mobile', label: `Mobile App Pentest (${plat} only)`, ...PRICES.mobile_one });
      } else {
        // Platform not specified — default to one platform
        lines.push({ key: 'mobile', label: 'Mobile App Pentest (1 platform)', ...PRICES.mobile_one });
      }
    }

    if (a.api) lines.push({ key: 'api', label: 'API Pentest (OWASP API Top 10)', ...PRICES.api });

    if (a.cloud) {
      const n = Math.max(1, a.cloud_count || 1);
      const p = PRICES.cloud;
      const low = p.low * n;
      const high = p.high * n;
      lines.push({ key: 'cloud', label: n === 1 ? 'Cloud Configuration Review' : `Cloud Configuration Review (${n} providers)`, low, high });
    }

    if (a.phishing) {
      const emp = Math.max(10, a.phishing_count || 100);
      const extraBlocks = Math.max(0, Math.ceil((emp - 200) / 200));
      const base = PRICES.phishing_base;
      const add = PRICES.phishing_add;
      const low = base.low + extraBlocks * add.low;
      const high = base.high + extraBlocks * add.high;
      lines.push({ key: 'phishing', label: `Phishing Simulation (up to ${emp} employees)`, low, high });
    }

    if (a.va_only) lines.push({ key: 'va_only', label: 'Vulnerability Assessment only', ...PRICES.va_only });

    // ── Totals and modifiers ─────────────────────────────────────────
    let low = lines.reduce((s, l) => s + l.low, 0);
    let high = lines.reduce((s, l) => s + l.high, 0);

    // Bundle discount — distinct categories (excluding va_only as standalone)
    const distinctCategories = lines.filter(l => l.key !== 'va_only').length;
    let bundleDiscount = 0;
    if (distinctCategories >= 3) bundleDiscount = BUNDLE_DISCOUNT[3];
    else if (distinctCategories === 2) bundleDiscount = BUNDLE_DISCOUNT[2];
    if (bundleDiscount > 0) {
      low = low * (1 - bundleDiscount);
      high = high * (1 - bundleDiscount);
    }

    // Size multiplier
    const sizeMult = SIZE_MULT[ans.size] || 1.0;
    low *= sizeMult;
    high *= sizeMult;

    // Urgency surcharge
    if (ans.timeline === 'urgent') {
      low *= URGENT_MULT;
      high *= URGENT_MULT;
    }

    return {
      lines,
      low,
      high,
      bundleDiscount,
      sizeMult,
      urgent: ans.timeline === 'urgent',
      distinctCategories,
    };
  }

  // ── Timeline estimate text ─────────────────────────────────────────
  function estimateDuration(ans, quote) {
    const weeks = {
      network_ext: [1, 2],
      network_int: [2, 3],
      web: [2, 3],
      mobile: [1.5, 2],
      api: [1, 2],
      cloud: [1, 1.5],
      phishing: [2, 2],
      va_only: [0.5, 1],
    };
    let low = 0, high = 0;
    quote.lines.forEach(l => {
      const w = weeks[l.key] || [1, 1];
      low += w[0];
      high += w[1];
    });
    // Parallel testers reduce total by ~25% on multi-scope
    if (quote.lines.length >= 2) { low *= 0.75; high *= 0.8; }
    low = Math.max(0.5, low);
    high = Math.max(low, high);
    const fmt = (w) => w < 1 ? `${Math.round(w * 7)} days` : (Number.isInteger(w) ? `${w} weeks` : `${w.toFixed(1)} weeks`);
    return `${fmt(low)} – ${fmt(high)} end-to-end`;
  }

  // ── LOCKED PREVIEW (step 5) ────────────────────────────────────────
  // Populates the gate screen: confirmed answers, teaser stats, stashed quote.
  // Does NOT reveal price or scope — that's gated behind email submit.
  function renderLockedPreview() {
    const ans = collectAnswers();
    const quote = calculateQuote(ans);

    // Confirmed-answers list
    const confirmList = document.getElementById('sb-confirm-list');
    if (confirmList) {
      const items = [];
      if (ans.driver) {
        let v = DRIVER_LABELS_JS[ans.driver] || ans.driver;
        if (ans.driver === 'compliance' && ans.framework) v += ' — ' + (FRAMEWORK_LABELS_JS[ans.framework] || ans.framework);
        items.push({ k: 'Driver', v });
      }
      if (quote.lines.length) {
        items.push({ k: 'Scope', v: quote.lines.map(l => l.label).join(' · ') });
      }
      if (ans.timeline) items.push({ k: 'Timeline', v: TIMELINE_LABELS_JS[ans.timeline] || ans.timeline });
      if (ans.size) items.push({ k: 'Company size', v: SIZE_LABELS_JS[ans.size] || ans.size });
      confirmList.innerHTML = items.map(i =>
        `<li><span class="sb-confirm-key">${i.k}</span><span class="sb-confirm-val">${i.v}</span></li>`
      ).join('');
    }

    // Teaser stats (NOT revealing price)
    const scopeCountEl = document.getElementById('sb-locked-scope-count');
    const discountEl = document.getElementById('sb-locked-discount');
    const weeksEl = document.getElementById('sb-locked-weeks');
    if (scopeCountEl) scopeCountEl.textContent = String(quote.lines.length);
    if (discountEl) discountEl.textContent = quote.bundleDiscount > 0 ? `-${Math.round(quote.bundleDiscount * 100)}%` : '—';
    if (weeksEl) weeksEl.textContent = quote.lines.length ? estimateDuration(ans, quote).split(' end-to-end')[0] : '—';

    // Stash quote for the submit handler
    form.dataset.quote = JSON.stringify({ answers: ans, quote: {
      lines: quote.lines,
      low: quote.low,
      high: quote.high,
      bundleDiscount: quote.bundleDiscount,
      sizeMult: quote.sizeMult,
      distinctCategories: quote.distinctCategories,
      urgent: quote.urgent,
      timeline: quote.lines.length ? estimateDuration(ans, quote) : '—',
    }});
  }

  // ── UNLOCKED OUTPUT (done panel) ──────────────────────────────────
  // Rendered AFTER successful email submission. Populates the full reveal:
  // price hero, scope list, timeline, compliance, founding-client offer.
  function renderUnlockedOutput(clientEmail) {
    let stash = {};
    try { stash = JSON.parse(form.dataset.quote || '{}'); } catch (e) {}
    const ans = stash.answers || {};
    const quote = stash.quote || { lines: [], low: 0, high: 0, bundleDiscount: 0, sizeMult: 1, urgent: false, timeline: '—' };

    // Client-email echo
    const emailEcho = document.getElementById('sb-unlocked-email');
    if (emailEcho && clientEmail) emailEcho.textContent = clientEmail;

    // Scope list
    const scopeEl = document.getElementById('sb-rec-scope');
    if (scopeEl) {
      scopeEl.innerHTML = '';
      if (!quote.lines.length) {
        scopeEl.innerHTML = '<li><em>No scope selected.</em></li>';
      } else {
        quote.lines.forEach(l => {
          const li = document.createElement('li');
          li.innerHTML = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M2 7l3 3 7-7" stroke="#37dc82" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg> <span>${l.label}</span>`;
          scopeEl.appendChild(li);
        });
      }
    }

    // Price hero
    const priceEl = document.getElementById('sb-rec-price');
    if (priceEl) priceEl.textContent = quote.lines.length ? `${fmtAED(quote.low)} – ${fmtAED(quote.high)}` : 'AED —';

    // Modifiers
    const bundleEl = document.getElementById('sb-rec-bundle');
    if (bundleEl) {
      const msgs = [];
      if (quote.bundleDiscount > 0) msgs.push(`Bundle discount: <strong>-${Math.round(quote.bundleDiscount * 100)}%</strong>`);
      if (quote.sizeMult !== 1) {
        const pct = Math.round((quote.sizeMult - 1) * 100);
        msgs.push(`Company size: <strong>${pct >= 0 ? '+' : ''}${pct}%</strong>`);
      }
      if (quote.urgent) msgs.push(`Urgent expedite: <strong>+20%</strong>`);
      if (msgs.length) { bundleEl.innerHTML = msgs.join(' · '); bundleEl.removeAttribute('hidden'); }
      else bundleEl.setAttribute('hidden', '');
    }

    // Timeline
    const tlEl = document.getElementById('sb-rec-timeline');
    if (tlEl) tlEl.textContent = quote.timeline || '—';
    const tlNote = document.getElementById('sb-rec-timeline-note');
    if (tlNote) {
      if (ans.timeline === 'urgent') tlNote.textContent = 'Expedited delivery. We re-prioritise our backlog to start within 2 weeks.';
      else if (ans.timeline === 'planning') tlNote.textContent = 'Planning horizon. Budget/audit-cycle friendly — flexible start date.';
      else tlNote.textContent = 'Typical engagement duration including scoping, testing, reporting, and walkthrough.';
    }

    // Compliance
    const compCard = document.getElementById('sb-rec-compliance-card');
    const compText = document.getElementById('sb-rec-compliance-text');
    if (compCard && compText) {
      if (ans.driver === 'compliance' && ans.framework && ans.framework !== 'other') {
        const label = FRAMEWORK_LABELS[ans.framework] || ans.framework;
        compText.innerHTML = `Report structured to satisfy <strong>${label}</strong> — CVSS-scored findings, control mapping, named-tester credentials, re-test evidence. Usable as audit deliverable.`;
        compCard.removeAttribute('hidden');
      } else if (ans.driver === 'compliance' && ans.framework === 'other') {
        compText.innerHTML = `We'll confirm the specific framework alignment on the scoping call. Reports are CVSS-scored and auditor-friendly across ISO 27001, UAE IA, ADHICS, PCI DSS, SOC 2, and more.`;
        compCard.removeAttribute('hidden');
      } else {
        compCard.setAttribute('hidden', '');
      }
    }

    // Founding offer — shown on real engagements
    const founding = document.getElementById('sb-founding');
    if (founding) {
      if (quote.low >= 15000) founding.removeAttribute('hidden');
      else founding.setAttribute('hidden', '');
    }
  }

  // Back-compat alias — called by the next→5 handler
  function computeAndRenderOutput() { renderLockedPreview(); }

  // ── Analytics — Plausible-compatible custom events ────────────────
  function trackEvent(name, props) {
    try {
      if (typeof window.plausible === 'function') window.plausible(name, { props: props || {} });
      if (typeof window.umami === 'object' && typeof window.umami.track === 'function') window.umami.track(name, props);
      if (typeof window.gtag === 'function') window.gtag('event', name, props || {});
      window.dispatchEvent(new CustomEvent('sb-event', { detail: { name, props } }));
    } catch (e) {}
  }

  // ── localStorage persistence ───────────────────────────────────────
  const LS_KEY = 'sb-state-v1';
  function saveState() {
    try {
      const fd = new FormData(form);
      const snap = { answers: {}, timestamp: Date.now() };
      ['driver','framework','timeline','size','asset_mobile_platform'].forEach(k => { const v = fd.get(k); if (v) snap.answers[k] = String(v); });
      ['asset_network_ext','asset_network_int','asset_web','asset_mobile','asset_api','asset_cloud','asset_phishing','asset_va_only'].forEach(k => {
        if (fd.get(k)) snap.answers[k] = '1';
      });
      ['asset_web_count','asset_cloud_count','asset_phishing_count'].forEach(k => { const v = fd.get(k); if (v) snap.answers[k] = String(v); });
      snap.currentStep = state.currentStep;
      localStorage.setItem(LS_KEY, JSON.stringify(snap));
    } catch (e) {}
  }
  function restoreState() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      const snap = JSON.parse(raw);
      // Ignore stashes older than 48 hours
      if (!snap || !snap.answers || (Date.now() - (snap.timestamp || 0)) > 48 * 60 * 60 * 1000) { localStorage.removeItem(LS_KEY); return; }
      Object.entries(snap.answers).forEach(([k, v]) => {
        const inputs = form.querySelectorAll(`[name="${CSS.escape(k)}"]`);
        inputs.forEach(inp => {
          if (inp.type === 'checkbox') {
            if (v === '1') { inp.checked = true; inp.dispatchEvent(new Event('change', { bubbles: true })); }
          } else if (inp.type === 'radio') {
            if (inp.value === v) { inp.checked = true; inp.dispatchEvent(new Event('change', { bubbles: true })); }
          } else {
            inp.value = v;
            inp.dispatchEvent(new Event('input', { bubbles: true }));
          }
        });
      });
      // Jump to last step if they made progress past step 1
      const step = Math.min(4, Math.max(1, parseInt(snap.currentStep, 10) || 1));
      if (step > 1) showPanel(step);
    } catch (e) {}
  }
  function clearState() { try { localStorage.removeItem(LS_KEY); } catch (e) {} }

  // Persist on every change
  form.addEventListener('change', saveState);
  form.addEventListener('input', saveState);

  // ── Turnstile token handling ──────────────────────────────────────
  let turnstileToken = '';
  window.sbTurnstileCallback = function (token) { turnstileToken = token || ''; };
  window.sbTurnstileExpired = function () { turnstileToken = ''; };

  // ── Clickable step indicator (jump nav) ───────────────────────────
  stepNodes.forEach(node => {
    const step = parseInt(node.dataset.step, 10);
    node.setAttribute('role', 'button');
    node.setAttribute('tabindex', '0');
    node.setAttribute('aria-label', `Go to step ${step}`);
    const go = () => {
      // Only allow jumping to a step you've already visited or passed
      if (step > state.currentStep + 1) return;
      if (step === 5 && !validateStep(1) || step >= 2 && !validateStep(1)) {
        // First driver must be chosen before any jump
        if (step > 1 && !validateStep(1)) return;
      }
      if (step === 5) renderLockedPreview();
      showPanel(step);
      trackEvent('sb_step_jump', { to: step });
    };
    node.addEventListener('click', go);
    node.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
  });
  // Mark visited steps as clickable (visual affordance)
  function refreshStepClickable() {
    stepNodes.forEach(node => {
      const step = parseInt(node.dataset.step, 10);
      node.classList.toggle('clickable', step <= Math.max(1, state.currentStep));
    });
  }

  // Hook clickable refresh into updateProgress via MutationObserver-lite
  const _origUpdateProgress = updateProgress;
  updateProgress = function (n) { _origUpdateProgress(n); refreshStepClickable(); };

  // ── Submit ──────────────────────────────────────────────────────
  const submitBtn = document.getElementById('sb-submit');
  const msgEl = form.querySelector('.sb-capture-msg');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!submitBtn) return;

    const name = form.querySelector('#sb-name').value.trim();
    const email = form.querySelector('#sb-email').value.trim();
    const company = form.querySelector('#sb-company').value.trim();
    const phone = form.querySelector('#sb-phone').value.trim();

    if (!name) {
      msgEl.textContent = 'Please enter your full name.';
      msgEl.className = 'sb-capture-note sb-capture-msg sb-msg-err';
      form.querySelector('#sb-name').focus();
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      msgEl.textContent = 'Please enter a valid work email address.';
      msgEl.className = 'sb-capture-note sb-capture-msg sb-msg-err';
      form.querySelector('#sb-email').focus();
      return;
    }
    if (!company) {
      msgEl.textContent = 'Please enter your company name.';
      msgEl.className = 'sb-capture-note sb-capture-msg sb-msg-err';
      form.querySelector('#sb-company').focus();
      return;
    }

    // Turnstile gate — if widget is present, token required
    const turnstileEl = document.querySelector('.cf-turnstile');
    if (turnstileEl && !turnstileToken) {
      msgEl.textContent = 'Please complete the CAPTCHA challenge before submitting.';
      msgEl.className = 'sb-capture-note sb-capture-msg sb-msg-err';
      return;
    }

    const consent_marketing = !!(form.querySelector('#sb-consent') || {}).checked;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending…';
    submitBtn.setAttribute('aria-busy', 'true');
    msgEl.textContent = '';
    msgEl.className = 'sb-capture-note sb-capture-msg';

    trackEvent('sb_submit_attempt', { has_consent: consent_marketing });

    let stashed = {};
    try { stashed = JSON.parse(form.dataset.quote || '{}'); } catch (e) { stashed = {}; }

    const payload = {
      name, email, company, phone,
      answers: stashed.answers || null,
      consent_marketing,
      'cf-turnstile-response': turnstileToken || undefined,
    };

    try {
      const res = await fetch('/api/scope-builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        const err = data.error || 'Something went wrong. Please try again or email contact@underwings.org.';
        msgEl.textContent = err;
        msgEl.className = 'sb-capture-note sb-capture-msg sb-msg-err';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Unlock & email me the brief';
        submitBtn.removeAttribute('aria-busy');
        trackEvent('sb_submit_error', { status: res.status, error: err });
        // Reset Turnstile if 403 (token consumed or invalid)
        if (res.status === 403 && window.turnstile) { try { window.turnstile.reset(); } catch (e) {} turnstileToken = ''; }
        return;
      }

      // Use server-returned quote (tightened range, authoritative math)
      if (data.quote) {
        const serverQuote = {
          lines: data.quote.lines || [],
          low: data.quote.low || 0,
          high: data.quote.high || 0,
          mid: data.quote.mid || 0,
          bundleDiscount: data.quote.bundleDiscount || 0,
          sizeMult: data.quote.sizeMult || 1,
          urgent: !!data.quote.urgent,
          timeline: data.quote.timeline || '—',
        };
        form.dataset.quote = JSON.stringify({ answers: stashed.answers, quote: serverQuote });
      }

      trackEvent('sb_submit_success', {
        score_band: (stashed.answers && stashed.answers.driver === 'client_request') ? 'high_intent' : 'normal',
      });

      // Clear persisted state (completed)
      clearState();

      // Success → render unlocked output then reveal done panel
      renderUnlockedOutput(email);
      panels.forEach(p => { p.classList.remove('active'); p.setAttribute('hidden', ''); });
      const ty = form.querySelector('[data-panel="done"]');
      if (ty) { ty.removeAttribute('hidden'); ty.classList.add('active'); }
      updateProgress(5);
      const sidebar = document.querySelector('.sb-side');
      if (sidebar) sidebar.style.display = 'none';
      try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) {}
    } catch (err) {
      msgEl.textContent = 'Network error. Please try again or email contact@underwings.org.';
      msgEl.className = 'sb-capture-note sb-capture-msg sb-msg-err';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Unlock & email me the brief';
      submitBtn.removeAttribute('aria-busy');
      trackEvent('sb_submit_error', { error: 'network' });
    }
  });

  // ── Analytics: fire step-enter + option-select ────────────────────
  const _origShowPanel = showPanel;
  showPanel = function (n) { _origShowPanel(n); trackEvent('sb_step_enter', { step: n }); };

  form.querySelectorAll('input[name="driver"], input[name="timeline"], input[name="size"], input[name="framework"]').forEach(el => {
    el.addEventListener('change', () => trackEvent('sb_option_select', { field: el.name, value: el.value }));
  });
  form.querySelectorAll('.sb-asset input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', () => trackEvent('sb_asset_toggle', { asset: cb.name, checked: cb.checked }));
  });

  // ── Tightened display: swap raw quote range for ±15% tightened ────
  // Wrap renderLockedPreview + renderUnlockedOutput to re-format the price.
  // Helper used both client + mirrored server-side.
  function tightenRange(low, high) {
    const mid = (low + high) / 2;
    const margin = 0.15;
    const round500 = (n) => Math.round(n / 500) * 500;
    return { low: round500(mid * (1 - margin)), high: round500(mid * (1 + margin)), mid: round500(mid) };
  }
  // Monkey-patch price display in renderUnlockedOutput by post-adjusting
  const _origRenderUnlocked = renderUnlockedOutput;
  renderUnlockedOutput = function (clientEmail) {
    _origRenderUnlocked(clientEmail);
    let stash = {};
    try { stash = JSON.parse(form.dataset.quote || '{}'); } catch (e) { return; }
    const q = stash.quote;
    if (!q || !q.lines || !q.lines.length) return;
    const t = tightenRange(q.low, q.high);
    const priceEl = document.getElementById('sb-rec-price');
    if (priceEl) priceEl.textContent = `${fmtAED(t.low)} – ${fmtAED(t.high)}`;
  };

  // Initial refresh
  refreshNextButton(1);
  updateProgress(1);
  updateSidebar();
  restoreState();
})();
