var VER = '6.0';
var SCHEMA_VER = 1;
var DB_NAME = 'ironGCC';
var DB_STORE = 'state';
var LS_KEY = 'ironG_v3';
var commPref = 'text';
var db = null;
var currentPage = 'dashboard';

function defaultState() {
  return {
    v: VER, rentals: [], done: [], nextId: 1,
    fleet: [
      {id:'utility', name:'7x18 Utility Trailer 7K', status:'available', combo:'3651', renter:null, returnDate:null, p:{wd:90,we:110,wk:580,dep:200}},
      {id:'hauler', name:'7x18 Car Hauler 7K', status:'available', combo:'7294', renter:null, returnDate:null, p:{wd:100,we:120,wk:640,dep:250}}
    ],
    booking: {}, activity: [{text:'Iron G Command Center initialized',color:'gray',time:'Ready'}]
  };
}
var state = defaultState();

// IDB helpers
function openDB() {
  return new Promise(function(resolve, reject) {
    var req = indexedDB.open(DB_NAME, SCHEMA_VER);
    req.onupgradeneeded = function(e) {
      var idb = e.target.result;
      if (!idb.objectStoreNames.contains(DB_STORE)) { idb.createObjectStore(DB_STORE); }
    };
    req.onsuccess = function(e) { resolve(e.target.result); };
    req.onerror = function(e) { reject(e.target.error); };
  });
}
function idbGet(key) {
  return new Promise(function(resolve, reject) {
    if (!db) { resolve(null); return; }
    var tx = db.transaction(DB_STORE, 'readonly');
    var req = tx.objectStore(DB_STORE).get(key);
    req.onsuccess = function() { resolve(req.result); };
    req.onerror = function() { reject(req.error); };
  });
}
function idbPut(key, value) {
  return new Promise(function(resolve, reject) {
    if (!db) { resolve(); return; }
    var tx = db.transaction(DB_STORE, 'readwrite');
    var req = tx.objectStore(DB_STORE).put(value, key);
    req.onsuccess = function() { resolve(); };
    req.onerror = function() { reject(req.error); };
  });
}
function idbDelete(key) {
  return new Promise(function(resolve) {
    if (!db) { resolve(); return; }
    try {
      var tx = db.transaction(DB_STORE, 'readwrite');
      tx.objectStore(DB_STORE).delete(key);
      tx.oncomplete = resolve;
      tx.onerror = resolve;
    } catch(e) { resolve(); }
  });
}
function idbClear() {
  return new Promise(function(resolve) {
    if (!db) { resolve(); return; }
    try {
      var tx = db.transaction(DB_STORE, 'readwrite');
      tx.objectStore(DB_STORE).clear();
      tx.oncomplete = resolve;
      tx.onerror = resolve;
    } catch(e) { resolve(); }
  });
}

function save() {
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch(e) {}
  idbPut('state', state).catch(function(){});
}

function g(id) { return document.getElementById(id); }
function gs(id, def) { var el = g(id); return el ? el.value.trim() || def : def; }

// Clock (hidden element, kept for compat)
setInterval(function() {
  var n = new Date(); var el = g('clock');
  if (el) el.textContent = n.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'}) + ' · ' + n.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'});
}, 1000);

// ── DRAWER ──────────────────────────────────────────
function openDrawer() {
  g('drawer').classList.add('open');
  g('drawerOverlay').classList.add('open');
}
function closeDrawer() {
  g('drawer').classList.remove('open');
  g('drawerOverlay').classList.remove('open');
}
function navTo(id) {
  closeDrawer();
  showPage(id);
}
function fabNewBooking() {
  showPage('new-booking');
}

// ── NAVIGATION ──────────────────────────────────────
var titles = {dashboard:'Dashboard',fleet:'Fleet Status','new-booking':'New Booking','active-rentals':'Active Rentals',messages:'Message Templates',agreement:'Rental Agreement',pricing:'Pricing Reference',history:'Rental History',settings:'Settings',notifications:'Notifications'};

function showPage(id, skipPush) {
  document.querySelectorAll('.page').forEach(function(p){p.classList.remove('active');});
  var pg = g('page-' + id); if (pg) pg.classList.add('active');

  var tt = g('pageTitle'); if (tt) tt.textContent = titles[id] || id;
  currentPage = id;

  var bb = g('backBtn');
  if (bb) {
    if (id === 'dashboard') bb.classList.remove('visible');
    else bb.classList.add('visible');
  }

  document.querySelectorAll('.drawer-item').forEach(function(el) {
    el.classList.remove('active');
  });
  var drawerMap = {'dashboard':'dnav-dashboard','fleet':'dnav-fleet','active-rentals':'dnav-active-rentals','new-booking':'dnav-new-booking','settings':'dnav-settings','notifications':'dnav-notifications'};
  var dnavId = drawerMap[id];
  if (dnavId) { var dn = g(dnavId); if (dn) dn.classList.add('active'); }

  if (!skipPush) {
    history.pushState({page: id}, '', '');
  }

  window.scrollTo(0, 0);

  if (id === 'dashboard') drawDashboard();
  if (id === 'fleet') drawFleet();
  if (id === 'active-rentals') drawActiveRentals();
  if (id === 'history') drawHistory();
  if (id === 'new-booking') {
    drawAvail();
    if (window._pendingBooking) populatePendingBooking();
    else checkForDraft();
  }
  if (id === 'settings') { drawFleetSettings(); updateStorageUsage(); }
  if (id === 'messages') drawMessages();
  if (id === 'agreement') drawFullAgr();
  if (id === 'notifications') drawNotifications();
}

function goBack() {
  history.back();
}

window.addEventListener('popstate', function(e) {
  // Handle back within booking flow steps
  if (e.state && e.state.page === 'new-booking' && e.state.step && currentPage === 'new-booking') {
    goStep(e.state.step, true);
    return;
  }
  var page = (e.state && e.state.page) ? e.state.page : 'dashboard';
  if (!e.state) {
    history.pushState({page: 'dashboard'}, '', '');
  }
  showPage(page, true);
});

// ── COMM PREFERENCE ─────────────────────────────────
function setComm(val, el) {
  commPref = val;
  document.querySelectorAll('.comm-opt').forEach(function(b){b.classList.remove('active');});
  el.classList.add('active');
}

// ── PRICING ─────────────────────────────────────────
function calcPrice() {
  var tid = g('f-tr').value, sd = g('f-sd').value, ed = g('f-ed').value;
  var r = doCalc(tid, sd, ed);
  var div = g('priceCalc');
  if (!r) { div.innerHTML = '<div style="color:var(--muted);font-size:13px;text-align:center;padding:20px;">Select trailer and dates</div>'; return; }
  div.innerHTML = cpHtml(r);
  state.booking.pricing = r;
}

function doCalc(tid, sd, ed) {
  if (!tid || !sd || !ed) return null;
  var t = findFleet(tid); if (!t) return null;
  var s = new Date(sd + 'T12:00:00'), e = new Date(ed + 'T12:00:00');
  if (e <= s) return null;
  var days = Math.round((e-s)/86400000); if (days <= 0) return null;
  var p = t.p, base = 0, type = '', breakdown = [];
  if (days >= 7) {
    base = p.wk; type = 'Weekly rate (7 days)';
    breakdown.push({label:'Weekly rate', amount:p.wk});
  } else {
    var d = new Date(s);
    var wdCount = 0, weCount = 0;
    for (var i = 0; i < days; i++) {
      var dw = d.getDay();
      if (dw===5||dw===6||dw===0) { weCount++; base += p.we; }
      else { wdCount++; base += p.wd; }
      d.setDate(d.getDate()+1);
    }
    type = days === 1 ? 'Daily rate' : days + '-day rate';
    if (wdCount > 0) breakdown.push({label: wdCount + ' weekday' + (wdCount>1?'s':'') + ' @ $' + p.wd + '/day', amount: wdCount * p.wd});
    if (weCount > 0) breakdown.push({label: weCount + ' weekend day' + (weCount>1?'s':'') + ' @ $' + p.we + '/day', amount: weCount * p.we});
  }
  return {days:days, base:base, total:base, dep:p.dep, grand:base+p.dep, type:type, tname:t.name, breakdown:breakdown};
}

function cpHtml(r) {
  var bkHtml = '';
  if (r.breakdown && r.breakdown.length) {
    r.breakdown.forEach(function(b){ bkHtml += '<div class="crow"><span class="cl">' + b.label + '</span><span class="cv o">$' + b.amount + '</span></div>'; });
  } else {
    bkHtml = '<div class="crow"><span class="cl">' + r.type + ' (' + r.days + ' day' + (r.days>1?'s':'') + ')</span><span class="cv o">$' + r.base + '</span></div>';
  }
  return '<div class="cpanel" style="margin:0;"><h4>Price Breakdown</h4>' +
    bkHtml +
    '<div class="crow"><span class="cl">Rental subtotal</span><span class="cv o">$' + r.total + '</span></div>' +
    '<div class="crow"><span class="cl">Refundable deposit</span><span class="cv">$' + r.dep + '</span></div>' +
    '<div class="crow" style="border-top:1px solid var(--orange-dark);margin-top:6px;padding-top:8px;"><span class="cl" style="color:var(--white);font-weight:700;">TOTAL TODAY</span><span class="cv o" style="font-size:22px;">$' + r.grand + '</span></div>' +
    '<div style="font-size:11px;color:var(--muted);margin-top:8px;">* Sales tax may apply — confirm with OTC before collecting.</div>' +
    '</div>';
}

function quickCalc() {
  var r = doCalc(g('qc-tr').value, g('qc-sd')?g('qc-sd').value:'', g('qc-ed')?g('qc-ed').value:'');
  var div = g('qcResult'); if (!div) return;
  div.innerHTML = r ? cpHtml(r) : '';
}

// ── BOOKING FLOW ─────────────────────────────────────
function goStep(n, fromHistory) {
  if (!fromHistory) {
    if (n === 2) {
      if (!g('f-fn').value.trim() || !g('f-ph').value.trim()) { alert('Please enter customer name and phone.'); return; }
      state.booking.customer = {fn:g('f-fn').value, ln:g('f-ln').value, ph:g('f-ph').value, em:g('f-em').value, cy:g('f-cy').value, vh:g('f-vh').value, comm:commPref};
    }
    if (n === 3) {
      if (!g('f-tr').value || !g('f-sd').value || !g('f-ed').value) { alert('Please select trailer and dates.'); return; }
      state.booking.rental = {tid:g('f-tr').value, sd:g('f-sd').value, ed:g('f-ed').value, ld:g('f-ld') ? g('f-ld').value : '', src:g('f-src').value, nt:g('f-nt').value};
      calcPrice();
      drawBookSummary();
      drawComboAssign();
    }
  }
  for (var i = 1; i <= 4; i++) {
    var el = g('step'+i); if (el) el.style.display = i===n?'block':'none';
    var fs = g('fs'+i);
    if (fs) { fs.classList.remove('active','done'); if (i<n) fs.classList.add('done'); if (i===n) fs.classList.add('active'); }
  }
  window.scrollTo(0, 0);
  // Save draft and push step into browser history (not for step 4 — that's post-confirm)
  if (n < 4 && !fromHistory) {
    saveDraft(n);
    if (n > 1) history.pushState({ page: 'new-booking', step: n }, '', '');
  }
}

// Step tab click handler — allows backward navigation only
function stepTabClick(n) {
  var fs = g('fs'+n); if (!fs) return;
  if (fs.classList.contains('done')) goStep(n);
}

function drawBookSummary() {
  var c = state.booking.customer, r = state.booking.rental, p = state.booking.pricing;
  var div = g('bookSummary'); if (!div || !c || !r || !p) return;
  var t = findFleet(r.tid);
  div.innerHTML = '<h4>Booking Summary</h4>' +
    '<div class="crow"><span class="cl">Customer</span><span class="cv">' + c.fn + ' ' + c.ln + '</span></div>' +
    '<div class="crow"><span class="cl">Phone</span><span class="cv o">' + c.ph + '</span></div>' +
    '<div class="crow"><span class="cl">Contact Pref</span><span class="cv">' + (c.comm==='text'?'📱 Text':c.comm==='email'?'📧 Email':'📱 Text + 📧 Email') + '</span></div>' +
    '<div class="crow"><span class="cl">Trailer</span><span class="cv">' + (t?t.name:'') + '</span></div>' +
    '<div class="crow"><span class="cl">Dates</span><span class="cv">' + r.sd + ' to ' + r.ed + '</span></div>' +
    '<div class="crow"><span class="cl">Duration</span><span class="cv">' + p.days + ' day' + (p.days>1?'s':'') + '</span></div>' +
    '<div class="crow"><span class="cl">Rental</span><span class="cv o">$' + p.base + '</span></div>' +
    '<div class="crow"><span class="cl">Deposit</span><span class="cv">$' + p.dep + '</span></div>' +
    '<div class="crow" style="border-top:1px solid var(--orange-dark);margin-top:4px;padding-top:6px;"><span class="cl" style="color:var(--white);font-weight:700;">TOTAL TODAY</span><span class="cv o" style="font-size:20px;">$' + p.grand + '</span></div>';
}

function drawComboAssign() {
  var div = g('comboAssign'); if (!div) return;
  var r = state.booking.rental; if (!r || !r.tid) { div.innerHTML = '<div style="color:var(--muted);font-size:13px;">Select trailer first</div>'; return; }
  var t = findFleet(r.tid);
  var digs = ''; for (var i = 0; i < t.combo.length; i++) digs += '<div class="combo-dig">' + t.combo[i] + '</div>';
  var name = state.booking.customer ? state.booking.customer.fn : 'customer';
  div.innerHTML = '<div style="margin-bottom:12px;"><div class="fc-label">Current combo for ' + t.name + ':</div><div class="combo-disp">' + digs + '</div></div>' +
    '<div class="alert ai" style="margin-bottom:12px;">This code will be included in ' + name + '\'s pickup instructions in Step 4.</div>' +
    '<label class="fl">Change combo before sending (optional)</label>' +
    '<input class="fi" id="newCombo" type="text" maxlength="4" placeholder="0000" style="font-family:Oswald,sans-serif;font-size:22px;font-weight:700;text-align:center;letter-spacing:6px;margin-bottom:8px;">' +
    '<div style="display:flex;gap:8px;"><button class="btn btn-ghost btn-sm" onclick="applyCombo()" style="flex:1;">✓ Update Code</button><button class="btn btn-ghost btn-sm" onclick="randCombo()" style="flex:1;">🎲 Random</button></div>';
}

function applyCombo() {
  var val = g('newCombo') ? g('newCombo').value : ''; if (!/^\d{4}$/.test(val)) { alert('Enter exactly 4 digits'); return; }
  var r = state.booking.rental; var t = findFleet(r.tid); t.combo = val; save(); drawComboAssign();
  addAct('Combo updated for ' + t.name + ' to ' + val, 'yellow');
}
function randCombo() { var el = g('newCombo'); if (el) el.value = String(Math.floor(1000+Math.random()*9000)); }

function confirmBooking() {
  var c = state.booking.customer, r = state.booking.rental, p = state.booking.pricing;
  if (!c || !r || !p) { alert('Complete all steps first.'); return; }
  var cks = ['chk1','chk2','chk3'], labs = ['Valid drivers license','Proof of insurance','Tow vehicle verified'];
  var miss = []; for (var i = 0; i < cks.length; i++) { var el = g(cks[i]); if (!el || !el.checked) miss.push(labs[i]); }
  if (miss.length > 0) {
    var w = g('chk-warn'); if (w) { w.style.display = 'block'; w.innerHTML = '⚠️ Complete before confirming: ' + miss.join(' · '); }
    return;
  }
  var ww = g('chk-warn'); if (ww) ww.style.display = 'none';
  var t = findFleet(r.tid);
  var bk = {
    id: state.nextId++, c: c, trailer: t.name, tid: r.tid, sd: r.sd, ed: r.ed,
    days: p.days, rental: p.base, dep: p.dep, total: p.total, grand: p.grand,
    combo: t.combo, load: r.ld, src: r.src,
    status: 'docs_pending',
    nt: r.nt, at: new Date().toISOString(), breakdown: p.breakdown||[], type: p.type,
    // Stripe fields
    paymentLinkUrl: null, paymentLinkId: null,
    depositIntentId: null, depositSessionId: null, depositSessionUrl: null, depositStatus: null,
    rentalPaid: false, depositHeld: false, docsVerified: false,
    packageSentAt: null, confirmedAt: null
  };
  state.rentals.push(bk);
  state.booking.id = bk.id;
  t.status = 'rented'; t.renter = c.fn + ' ' + c.ln; t.returnDate = r.ed;
  save(); clearDraft(); buildMessages(bk, t); updateStats();
  addAct('Booking: ' + c.fn + ' ' + c.ln + ' — ' + t.name, 'orange');
  if (window._pendingBookingNotifKey) {
    var pnk = window._pendingBookingNotifKey; window._pendingBookingNotifKey = null;
    markHandled(pnk.key, pnk.id);
  }
  setGate(0,'active','Send before agreement');
  setGate(1,'locked','Locked — send package first');
  setGate(2,'locked','Locked — sign agreement first');
  setGate(3,'locked','Locked — confirm payment first');
  setGate(4,'locked','Send day before return');
  var qs = g('quoteSent'); if (qs) qs.checked = false;
  var ag = g('agrSigned'); if (ag) ag.checked = false;
  goStep(4, true);
}

// ── GATE SYSTEM ──────────────────────────────────────
function setGate(n, gateState, statusText) {
  var el = g('gate'+n); if (!el) return;
  el.classList.remove('gate-active','gate-locked','gate-done');
  el.classList.add('gate-' + gateState);
  if (gateState !== 'locked') el.style.pointerEvents = '';
  else el.style.pointerEvents = 'none';
  var st = g('gate'+n+'-status'); if (st) st.textContent = statusText;
}

function onQuoteSent() {
  var chk = g('quoteSent'); if (!chk) return;
  if (chk.checked) {
    setGate(0, 'done', 'Package sent');
    setGate(1, 'active', 'Awaiting signature');
    g('gate1').style.pointerEvents = '';
    addAct('Pre-booking package sent, awaiting docs', 'green');
  } else {
    setGate(0, 'active', 'Send before agreement');
    setGate(1, 'locked', 'Locked — send package first');
  }
}

function onAgrSigned() {
  var chk = g('agrSigned'); if (!chk) return;
  if (chk.checked) {
    setGate(1, 'done', 'Signed');
    setGate(2, 'active', 'Send payment links');
    g('gate2').style.pointerEvents = '';
    // Render gate 2 Stripe sections
    var bk = findBookingById(state.booking.id);
    if (bk) drawGate2(bk);
    addAct('Rental agreement signed', 'green');
  } else {
    setGate(1, 'active', 'Awaiting signature');
    setGate(2, 'locked', 'Locked — sign agreement first');
  }
}

function onPaymentConfirmed() {
  var bk = findBookingById(state.booking.id);
  if (!bk) return;
  if (!bk.paymentLinkUrl || !bk.depositIntentId) {
    alert('Generate both payment links first.'); return;
  }
  setGate(2, 'done', 'Payment received');
  setGate(3, 'active', 'Send pickup instructions');
  setGate(4, 'active', 'Send day before return');
  g('gate3').style.pointerEvents = '';
  g('gate4').style.pointerEvents = '';
  bk.rentalPaid = true;
  bk.depositHeld = true;
  bk.depositStatus = 'held';
  bk.status = 'confirmed';
  bk.confirmedAt = new Date().toISOString();
  save();
  addAct('Payment confirmed for ' + (state.booking.customer ? state.booking.customer.fn : 'customer'), 'green');
}

// ── STRIPE GATE 2 FUNCTIONS ──────────────────────────

function drawGate2(bk) {
  var sa = g('gate2-rental-section'); var sb = g('gate2-deposit-section');
  if (!sa || !sb || !bk) return;

  // Section A — Rental fee payment link
  var aHtml = '<div class="stripe-section">' +
    '<div class="stripe-section-label">💰 Rental Fee — $' + bk.rental + '</div>';
  if (bk.paymentLinkUrl) {
    aHtml += '<input class="stripe-link-input" type="text" readonly value="' + bk.paymentLinkUrl + '">' +
      '<div style="display:flex;gap:8px;margin-bottom:6px;">' +
        '<button class="btn btn-primary btn-sm" onclick="copyPayLink()">📋 Copy Link</button>' +
        '<button class="btn btn-ghost btn-sm" onclick="textPayLink()">💬 Text to ' + escHtml(bk.c.ph) + '</button>' +
      '</div>' +
      '<div class="stripe-sent">✓ Rental link generated</div>';
  } else {
    aHtml += '<button class="btn btn-primary" id="gen-pay-link-btn" onclick="generatePaymentLink()" style="width:100%;">🔗 Generate Rental Payment Link</button>';
  }
  aHtml += '</div>';
  sa.innerHTML = aHtml;

  // Section B — Deposit authorization hold
  var bHtml = '<div class="stripe-section">' +
    '<div class="stripe-section-label">🔐 Deposit Authorization Hold — $' + bk.dep + '</div>';
  if (bk.depositSessionUrl) {
    bHtml += '<input class="stripe-link-input" type="text" readonly value="' + bk.depositSessionUrl + '">' +
      '<div style="display:flex;gap:8px;margin-bottom:6px;">' +
        '<button class="btn btn-primary btn-sm" onclick="copyDepLink()">📋 Copy Link</button>' +
        '<button class="btn btn-ghost btn-sm" onclick="textDepLink()">💬 Text to ' + escHtml(bk.c.ph) + '</button>' +
      '</div>' +
      '<div class="stripe-sent">✓ Deposit link generated</div>' +
      '<div class="stripe-note">ℹ️ This is an authorization hold only. No money is charged unless damage occurs.</div>';
  } else {
    bHtml += '<button class="btn btn-primary" id="gen-dep-link-btn" onclick="generateDepositHold()" style="width:100%;margin-bottom:8px;">🔐 Generate Deposit Hold Link</button>' +
      '<div class="stripe-note">ℹ️ This is an authorization hold only. No money is charged unless damage occurs.</div>';
  }
  bHtml += '</div>';
  sb.innerHTML = bHtml;

  // Enable/disable confirm button
  var confirmBtn = g('payConfirmBtn');
  if (confirmBtn) confirmBtn.disabled = !(bk.paymentLinkUrl && bk.depositIntentId);
}

async function generatePaymentLink() {
  var bk = findBookingById(state.booking.id); if (!bk) return;
  var btn = g('gen-pay-link-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Generating...'; }
  try {
    var res = await fetch('/stripe/payment-link', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        amount: bk.rental,
        description: 'Iron G — ' + bk.days + '-day ' + bk.trailer + ' rental',
        bookingId: bk.id
      })
    });
    var data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || 'Request failed');
    bk.paymentLinkUrl = data.url;
    bk.paymentLinkId = data.id;
    save();
    drawGate2(bk);
  } catch(e) {
    alert('Error generating payment link: ' + e.message);
    if (btn) { btn.disabled = false; btn.textContent = '🔗 Generate Rental Payment Link'; }
  }
}

async function generateDepositHold() {
  var bk = findBookingById(state.booking.id); if (!bk) return;
  var btn = g('gen-dep-link-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Generating...'; }
  try {
    var res = await fetch('/stripe/deposit-intent', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        amount: bk.dep,
        description: 'Iron G deposit hold — ' + bk.trailer,
        bookingId: bk.id
      })
    });
    var data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || 'Request failed');
    bk.depositIntentId = data.paymentIntentId;
    bk.depositSessionId = data.sessionId;
    bk.depositSessionUrl = data.url;
    bk.depositStatus = 'pending';
    save();
    drawGate2(bk);
  } catch(e) {
    alert('Error generating deposit hold: ' + e.message);
    if (btn) { btn.disabled = false; btn.textContent = '🔐 Generate Deposit Hold Link'; }
  }
}

function copyPayLink() {
  var bk = findBookingById(state.booking.id); if (!bk || !bk.paymentLinkUrl) return;
  if (navigator.clipboard) { navigator.clipboard.writeText(bk.paymentLinkUrl).catch(function(){}); }
  showToast('Payment link copied!');
}
function textPayLink() {
  var bk = findBookingById(state.booking.id); if (!bk || !bk.paymentLinkUrl) return;
  var ph = bk.c.ph.replace(/\D/g,'');
  var msg = 'Iron G Equipment Co. — Rental payment link for your ' + bk.trailer + ':\n' + bk.paymentLinkUrl;
  window.location.href = 'sms:' + ph + '?body=' + encodeURIComponent(msg);
}
function copyDepLink() {
  var bk = findBookingById(state.booking.id); if (!bk || !bk.depositSessionUrl) return;
  if (navigator.clipboard) { navigator.clipboard.writeText(bk.depositSessionUrl).catch(function(){}); }
  showToast('Deposit link copied!');
}
function textDepLink() {
  var bk = findBookingById(state.booking.id); if (!bk || !bk.depositSessionUrl) return;
  var ph = bk.c.ph.replace(/\D/g,'');
  var msg = 'Iron G Equipment Co. — Deposit authorization link ($' + bk.dep + ' hold — refundable on clean return):\n' + bk.depositSessionUrl;
  window.location.href = 'sms:' + ph + '?body=' + encodeURIComponent(msg);
}

// Called when pre-booking package copy/SMS button is tapped — auto-checks Gate 0
function packageSent(msgId, action) {
  if (action === 'copy') {
    copyEl(msgId);
  } else {
    openSMS(msgId);
  }
  var chk = g('quoteSent');
  if (chk && !chk.checked) {
    chk.checked = true;
    onQuoteSent();
  }
  var bk = findBookingById(state.booking.id);
  if (bk) {
    bk.packageSentAt = new Date().toISOString();
    bk.status = 'docs_pending';
    save();
  }
}

// ── DEPOSIT RELEASE / CAPTURE ──────────────────────

async function releaseDeposit(id) {
  var bk = findBookingById(id); if (!bk) return;
  if (!confirm('Release $' + bk.dep + ' deposit hold to ' + bk.c.fn + '?\n\nThe hold will drop from their card automatically.')) return;
  try {
    var res = await fetch('/stripe/deposit-cancel', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ paymentIntentId: bk.depositIntentId })
    });
    var data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || 'Request failed');
    bk.depositStatus = 'released';
    bk.status = 'complete';
    state.rentals = state.rentals.filter(function(r){return r.id !== id;});
    state.done.push(bk);
    save(); updateStats(); drawActiveRentals(); drawDashboard();
    showToast('Deposit hold released ✓');
  } catch(e) {
    alert('Error releasing deposit: ' + e.message);
  }
}

async function captureDeposit(id) {
  var bk = findBookingById(id); if (!bk) return;
  if (!confirm('Capture $' + bk.dep + ' deposit from ' + bk.c.fn + '?\n\nThis charges their card immediately.\nThis cannot be undone.')) return;
  try {
    var res = await fetch('/stripe/deposit-capture', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ paymentIntentId: bk.depositIntentId })
    });
    var data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || 'Request failed');
    bk.depositStatus = 'captured';
    bk.status = 'complete';
    state.rentals = state.rentals.filter(function(r){return r.id !== id;});
    state.done.push(bk);
    save(); updateStats(); drawActiveRentals(); drawDashboard();
    showToast('Deposit captured ✓');
  } catch(e) {
    alert('Error capturing deposit: ' + e.message);
  }
}

function resolveManually(id) {
  var bk = findBookingById(id); if (!bk) return;
  if (!confirm('Mark deposit as manually resolved for ' + bk.c.fn + '?')) return;
  bk.status = 'complete';
  state.rentals = state.rentals.filter(function(r){return r.id !== id;});
  state.done.push(bk);
  save(); updateStats(); drawActiveRentals(); drawDashboard();
  showToast('Booking marked complete ✓');
}

// ── DRAFT PERSISTENCE ────────────────────────────────

var _currentDraft = null;

function saveDraft(step) {
  var draft = {
    step: step,
    notifKey: window._pendingBookingNotifKey || null,
    fields: {
      fn: gs('f-fn',''), ln: gs('f-ln',''), ph: gs('f-ph',''),
      em: gs('f-em',''), cy: gs('f-cy',''), vh: gs('f-vh',''),
      comm: commPref,
      tr: g('f-tr') ? g('f-tr').value : '',
      sd: g('f-sd') ? g('f-sd').value : '',
      ed: g('f-ed') ? g('f-ed').value : '',
      ld: gs('f-ld',''), src: g('f-src') ? g('f-src').value : '',
      nt: gs('f-nt','')
    },
    pricing: state.booking.pricing || null,
    savedAt: new Date().toISOString()
  };
  idbPut('bookingDraft', draft).catch(function(){});
}

function loadDraft(cb) {
  idbGet('bookingDraft').then(function(draft) {
    if (!draft || !draft.savedAt) { cb(null); return; }
    var age = Date.now() - new Date(draft.savedAt).getTime();
    if (age > 86400000) { idbDelete('bookingDraft').catch(function(){}); cb(null); return; }
    cb(draft);
  }).catch(function() { cb(null); });
}

function clearDraft() {
  idbDelete('bookingDraft').catch(function(){});
  _currentDraft = null;
}

function checkForDraft() {
  loadDraft(function(draft) {
    var b = g('draftBanner');
    if (draft) { _currentDraft = draft; if (b) b.style.display = 'flex'; }
    else { if (b) b.style.display = 'none'; }
  });
}

function resumeDraft() {
  var draft = _currentDraft; if (!draft) return;
  _currentDraft = null;
  var b = g('draftBanner'); if (b) b.style.display = 'none';

  newBooking();

  var f = draft.fields;
  var set = function(id, val) { var el = g(id); if (el && val !== undefined) el.value = val; };
  set('f-fn', f.fn); set('f-ln', f.ln); set('f-ph', f.ph);
  set('f-em', f.em); set('f-cy', f.cy); set('f-vh', f.vh);
  set('f-ld', f.ld); set('f-nt', f.nt);
  set('f-tr', f.tr); set('f-sd', f.sd); set('f-ed', f.ed);
  if (f.src) {
    var srcEl = g('f-src');
    if (srcEl) {
      for (var i = 0; i < srcEl.options.length; i++) {
        if (srcEl.options[i].value === f.src || srcEl.options[i].text === f.src) { srcEl.selectedIndex = i; break; }
      }
    }
  }
  // Restore comm preference toggle
  commPref = f.comm || 'text';
  var commEls = document.querySelectorAll('.comm-opt');
  var commMap = {text:0, email:1, both:2};
  commEls.forEach(function(el){ el.classList.remove('active'); });
  var cIdx = commMap[commPref] !== undefined ? commMap[commPref] : 0;
  if (commEls[cIdx]) commEls[cIdx].classList.add('active');

  if (draft.notifKey) window._pendingBookingNotifKey = draft.notifKey;

  if (draft.pricing) state.booking.pricing = draft.pricing;

  // Go to saved step (cap at 3 — step 4 requires a confirmed booking)
  var targetStep = Math.min(draft.step, 3);
  if (targetStep >= 2) {
    state.booking.customer = {fn:f.fn, ln:f.ln, ph:f.ph, em:f.em, cy:f.cy, vh:f.vh, comm:f.comm||'text'};
  }
  if (targetStep >= 3) {
    state.booking.rental = {tid:f.tr, sd:f.sd, ed:f.ed, ld:f.ld, src:f.src, nt:f.nt};
    if (draft.pricing) { calcPrice(); drawBookSummary(); drawComboAssign(); }
  }
  goStep(targetStep, true);
}

function discardDraft() {
  _currentDraft = null;
  clearDraft();
  newBooking();
}

// ── MESSAGE GENERATION ───────────────────────────────
function buildMessages(bk, trailer) {
  var c = bk.c;
  var retDate = new Date(bk.ed + 'T12:00:00').toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'});
  var ph = gs('s-ph','(405) 393-4161');
  var phClean = ph.replace(/\D/g,'');
  var phDot = phClean.length === 10 ? phClean.slice(0,3)+'.'+phClean.slice(3,6)+'.'+phClean.slice(6) : ph;
  var em = gs('s-em','info@irongequipment.com');
  var addr = gs('s-addr','16245 W HWY 66, Yukon OK 73099');
  var biz = gs('s-biz','Iron G Equipment Co. LLC');
  var isHauler = bk.tid === 'hauler';
  var tips = isHauler
    ? '⚠️ CAR HAULER TIPS:\n⚠️ Ensure vehicle is centered on deck and strapped at all 4 wheels\n⚠️ Max speed 55 mph when loaded\n⚠️ Secure ALL loads with ratchet straps — minimum 4 tie-down points\n⚠️ Check all straps after first 10 miles'
    : '⚠️ UTILITY TRAILER TIPS:\n⚠️ Load heavy items toward the FRONT (tongue end)\n⚠️ Max speed 55 mph when loaded\n⚠️ Secure ALL loads with straps — nothing loose\n⚠️ Check all tie-downs before every trip';

  var sdFmt = new Date(bk.sd + 'T12:00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});
  var edFmt = new Date(bk.ed + 'T12:00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});

  // Gate 0 — Pre-booking package message
  var vhLine = (c.vh || '').trim() || 'please confirm year/make/model';
  var packageMsg = 'Hi ' + c.fn + ' ' + c.ln + ', this is Frank with Iron G Equipment Co.\n' +
    'Your ' + bk.trailer + ' reservation for ' + sdFmt + ' through ' + edFmt + ' (' + bk.days + ' day' + (bk.days>1?'s':'') + ') is being processed.\n\n' +
    'TOTAL: $' + bk.rental + ' rental + $' + bk.dep + ' refundable deposit hold = $' + bk.grand + ' total\n\n' +
    'To confirm your reservation please:\n' +
    '1. Reply with a photo of your driver\'s license\n' +
    '2. Reply with a photo of your proof of auto insurance\n' +
    '3. Confirm your tow vehicle: ' + vhLine + '\n\n' +
    'Once received I\'ll send your payment links and you\'re all set.\n\n' +
    'Questions? Call/text ' + ph + '\n— Iron G Equipment Co.';
  var mq = g('msg-quote'); if (mq) mq.textContent = packageMsg;

  // Gate 3 — Pickup confirmation messages
  var confText = '✅ ' + c.fn + ', payment confirmed! Here are your pickup details:\n\n🚛 ' + bk.trailer + '\n📍 ' + addr + '\n🔐 Combo lock code: ' + bk.combo + '\n   (Spin to your code, pull handle down to open)\n📅 Return by: ' + retDate + '\n\n' + tips + '\n\n📸 When returning: lock the coupler and text me a photo.\n\nQuestions? Call/text Frank: ' + phDot + '\n\nThanks for choosing Iron G! 🤙';
  var confEmail = 'Subject: Iron G Equipment Co. — Pickup Instructions #' + bk.id + '\n\nHi ' + c.fn + ',\n\nPayment received — you\'re all set! Here are your pickup details:\n\nTRAILER: ' + bk.trailer + '\nPICKUP: ' + addr + '\nCOMBO CODE: ' + bk.combo + '\n(Spin dials to ' + bk.combo + ', pull shackle down to open)\n\nRETURN DUE: ' + retDate + '\n\n' + tips + '\n\nRETURN INSTRUCTIONS:\n• Return to same storage space\n• Lock the coupler\n• Text a photo of locked coupler to ' + ph + '\n• Deposit released within 3 business days\n\nQuestions? ' + ph + ' | ' + em + '\n\nThank you!\nFrank Garza — Owner\n' + biz;
  var remText = 'Hey ' + c.fn + '! Quick reminder from Iron G — your trailer is due back TOMORROW.\n\n📍 Return to: ' + addr + '\n🔐 Lock the coupler and text me a return photo\n📅 Due: ' + retDate + '\n\nNeed more time? Text me ASAP.\n\n— Frank ' + phDot + ' · Iron G Equipment Co.';
  var mr = g('msg-reminder'); if (mr) mr.textContent = remText;

  var comm = c.comm || 'text';
  var commDisp = g('commDisplay');
  if (commDisp) commDisp.textContent = comm === 'text' ? '📱 Text' : comm === 'email' ? '📧 Email' : '📱 Text + 📧 Email';
  var cm = g('confirmMsgs');
  if (cm) {
    var html = '';
    if (comm === 'text' || comm === 'both') {
      html += '<div class="msg"><div class="msg-label">📱 Confirmation Text with Combo Code</div><div class="msg-text" id="msg-conf-txt">' + confText.replace(/</g,'&lt;') + '</div><div class="msg-actions"><button class="btn btn-primary btn-sm" onclick="copyEl(\'msg-conf-txt\')">📋 Copy Text</button><button class="btn btn-ghost btn-sm" onclick="openSMS(\'msg-conf-txt\')">📱 Open in Messages</button></div></div>';
    }
    if (comm === 'email' || comm === 'both') {
      html += '<div class="msg"><div class="msg-label">📧 Confirmation Email with Combo Code</div><div class="msg-text" id="msg-conf-em">' + confEmail.replace(/</g,'&lt;') + '</div><div class="msg-actions"><button class="btn btn-primary btn-sm" onclick="copyEl(\'msg-conf-em\')">📋 Copy Email</button></div></div>';
    }
    cm.innerHTML = html;
  }

  var ap = g('agreementPreview'); if (ap) ap.innerHTML = makeAgrHTML(bk, biz, ph, em);

  // Initialize Gate 2 Stripe sections
  drawGate2(bk);
}

function makeAgrHTML(bk, biz, ph, em) {
  biz = biz || gs('s-biz','Iron G Equipment Co. LLC');
  ph = ph || gs('s-ph','(405) 393-4161');
  em = em || gs('s-em','info@irongequipment.com');
  return '<h2>' + biz + '</h2>' +
    '<p style="text-align:center;font-size:11px;color:#666;">Trailer Rental Agreement · ' + ph + ' · ' + em + '</p>' +
    '<div style="height:1px;background:#ddd;margin:10px 0;"></div>' +
    '<h3>1. Rental Information</h3>' +
    '<p><strong>Renter:</strong> ' + bk.c.fn + ' ' + bk.c.ln + '</p>' +
    '<p><strong>Phone:</strong> ' + bk.c.ph + ' &nbsp; <strong>Email:</strong> ' + (bk.c.em||'—') + '</p>' +
    '<p><strong>Tow Vehicle:</strong> ' + (bk.c.vh||'—') + '</p>' +
    '<p><strong>Trailer:</strong> ' + bk.trailer + '</p>' +
    '<p><strong>Start:</strong> ' + bk.sd + ' &nbsp; <strong>Return Due:</strong> ' + bk.ed + '</p>' +
    '<p><strong>Rental:</strong> $' + bk.rental + ' &nbsp; <strong>Deposit:</strong> $' + bk.dep + ' &nbsp; <strong>Total:</strong> $' + bk.grand + '</p>' +
    '<p><strong>Total Charged:</strong> $' + bk.grand + '</p>' +
    '<h3>2. Key Terms</h3>' +
    '<p><strong>2.1</strong> Valid drivers license and proof of towing insurance required at pickup.</p>' +
    '<p><strong>2.2</strong> Renter is solely responsible for ensuring their tow vehicle meets minimum towing requirements.</p>' +
    '<p><strong>2.3 Contactless Pickup.</strong> Renter acknowledges combo code was delivered via text/email and accepts full responsibility from code delivery until return photo received by Iron G Equipment Co. LLC.</p>' +
    '<p><strong>2.4 Return.</strong> Return to storage by due date, lock coupler, text photo to ' + ph + '. Late returns charged at daily rate.</p>' +
    '<p><strong>2.5</strong> Renter agrees not to exceed GVWR, not to sub-rent or loan the trailer, and to comply with all Oklahoma towing laws.</p>' +
    '<p><strong>2.6</strong> Renter responsible for all damage beyond normal wear. Security deposit will be applied toward repair costs. If repairs exceed deposit, remaining balance charged to card on file.</p>' +
    '<p><strong>2.7</strong> Deposit released within 3 business days of satisfactory return. Trailer equipped with GPS tracking.</p>' +
    '<p><strong>2.8</strong> This agreement is governed by the laws of the State of Oklahoma.</p>' +
    '<h3>3. Signatures</h3>' +
    '<p>Renter Signature: _____________________________ &nbsp; Date: ____________</p>' +
    '<p style="margin-top:14px;">' + biz + ' — Frank Garza, Owner &nbsp; Date: ____________</p>' +
    '<div style="margin-top:12px;font-size:10px;color:#aaa;text-align:center;">' + biz + ' · Yukon, OK · ' + ph + ' · ' + em + '</div>';
}

function newBooking() {
  state.booking = {};
  var flds = ['f-fn','f-ln','f-ph','f-em','f-cy','f-vh','f-ld','f-nt'];
  flds.forEach(function(id){ var el = g(id); if (el) el.value = ''; });
  ['f-tr','f-sd','f-ed','f-src'].forEach(function(id){ var el = g(id); if (el) el.value = ''; });
  ['chk1','chk2','chk3'].forEach(function(id){ var el = g(id); if (el) el.checked = false; });
  var cw = g('chk-warn'); if (cw) cw.style.display = 'none';
  commPref = 'text';
  document.querySelectorAll('.comm-opt').forEach(function(b){b.classList.remove('active');});
  var first = document.querySelector('.comm-opt'); if (first) first.classList.add('active');
  var pc = g('priceCalc'); if (pc) pc.innerHTML = '<div style="color:var(--muted);font-size:13px;text-align:center;padding:20px;">Select trailer and dates</div>';
  var db = g('draftBanner'); if (db) db.style.display = 'none';
  clearDraft();
  goStep(1, true);
}

function markReturned(id) {
  var bk = null;
  for (var i = 0; i < state.rentals.length; i++) { if (state.rentals[i].id === id) { bk = state.rentals[i]; break; } }
  if (!bk) return;
  bk.status = 'returned';
  var t = findFleet(bk.tid); if (t) { t.status = 'available'; t.renter = null; t.returnDate = null; }
  addAct(bk.c.fn + ' ' + bk.c.ln + ' returned ' + bk.trailer, 'green');
  save(); updateStats(); drawActiveRentals(); drawDashboard();
  alert('Trailer marked returned!\n\nUse the deposit buttons below to release or capture the deposit.\n\nAlso remember to:\n1. Inspect the trailer\n2. Change the combo code (Fleet Status page)');
}

function markRetByTrailer(tid) { for (var i = 0; i < state.rentals.length; i++) { if (state.rentals[i].tid===tid && state.rentals[i].status==='active') { markReturned(state.rentals[i].id); return; } } }

function setComboFleet(id) {
  var el = g('ci-'+id); if (!el) return;
  var val = el.value; if (!/^\d{4}$/.test(val)) { alert('4 digits required'); return; }
  var t = findFleet(id); if (!t) return;
  t.combo = val; save(); drawFleet(); addAct('Combo updated for ' + t.name + ' to ' + val, 'yellow');
}
function randComboFleet(id) { var el = g('ci-'+id); if (el) el.value = String(Math.floor(1000+Math.random()*9000)); }

function updateStats() {
  var active = state.rentals.filter(function(r){return r.status !== 'returned' && r.status !== 'cancelled';});
  var avail = state.fleet.filter(function(t){return t.status==='available';}).length;
  var now = new Date(), rev = 0;
  for (var i = 0; i < state.done.length; i++) { var d = new Date(state.done[i].at||state.done[i].sd); if (d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear()) rev += state.done[i].rental + (state.done[i].wt||0); }
  var sa = g('stat-avail'); if (sa) sa.textContent = avail;
  var sac = g('stat-active'); if (sac) sac.textContent = active.length;
  var sr = g('stat-rev'); if (sr) sr.textContent = '$' + rev;
  var st = g('stat-total'); if (st) st.textContent = state.rentals.length + state.done.length;
  var ab = g('activeBadge'); if (ab) { ab.textContent = active.length; ab.style.display = active.length > 0 ? 'inline' : 'none'; }
}

function addAct(text, color) {
  var now = new Date();
  state.activity.push({text:text, color:color, time:now.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})});
  if (state.activity.length > 50) state.activity.shift();
  save();
}

function findFleet(id) { for (var i = 0; i < state.fleet.length; i++) { if (state.fleet[i].id===id) return state.fleet[i]; } return null; }

function findBookingById(id) {
  for (var i = 0; i < state.rentals.length; i++) { if (state.rentals[i].id === id) return state.rentals[i]; }
  for (var i = 0; i < state.done.length; i++) { if (state.done[i].id === id) return state.done[i]; }
  return null;
}

function escHtml(s) { return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function showToast(msg) {
  var t = g('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.className = 'toast-visible';
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(function(){ t.className = ''; }, 2500);
}

function saveSettings() {
  state.settings = {
    biz: gs('s-biz','Iron G Equipment Co. LLC'),
    own: gs('s-own','Frank Garza'),
    ph: gs('s-ph','(405) 393-4161'),
    em: gs('s-em','info@irongequipment.com'),
    addr: gs('s-addr','16245 W HWY 66, Yukon OK 73099'),
    ca: gs('s-ca',''), vm: gs('s-vm',''), sq: gs('s-sq','')
  };
  save();
  addAct('Settings saved','green');
  alert('Settings saved!');
}

function resetData() {
  if (!confirm('Remove ALL data including bookings, rentals, history, and settings?\n\nThis cannot be undone.')) return;
  try { localStorage.removeItem(LS_KEY); } catch(e) {}
  idbClear().catch(function(){});
  state = defaultState();
  save(); updateStats(); drawDashboard(); drawFleet();
  alert('All data cleared.'); showPage('dashboard');
}

function exportBackup() {
  var blob = new Blob([JSON.stringify(state, null, 2)], {type:'application/json'});
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url; a.download = 'irong-cc-backup-' + new Date().toISOString().split('T')[0] + '.json';
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
}

function importBackup() {
  var input = document.createElement('input');
  input.type = 'file'; input.accept = '.json';
  input.onchange = function(e) {
    var file = e.target.files[0]; if (!file) return;
    var reader = new FileReader();
    reader.onload = function(ev) {
      try {
        var data = JSON.parse(ev.target.result);
        if (!data || !data.fleet || !Array.isArray(data.fleet)) { alert('Invalid backup file.'); return; }
        if (!confirm('Replace all current data with backup?\n\nThis cannot be undone.')) return;
        state = data; save();
        if (state.settings) {
          var smap = {'s-biz':'biz','s-own':'own','s-ph':'ph','s-em':'em','s-addr':'addr','s-ca':'ca','s-vm':'vm','s-sq':'sq'};
          for (var sid in smap) { var el = g(sid); if (el && state.settings[smap[sid]]!==undefined) el.value = state.settings[smap[sid]]; }
        }
        updateStats(); drawDashboard(); drawFleet(); alert('Backup restored!');
      } catch(err) { alert('Failed to parse backup: ' + err.message); }
    };
    reader.readAsText(file);
  };
  input.click();
}

function updateStorageUsage() {
  var div = g('storageUsage'); if (!div) return;
  var lsBytes = 0;
  try { var raw = localStorage.getItem(LS_KEY); if (raw) lsBytes = new Blob([raw]).size; } catch(e) {}
  if (navigator.storage && navigator.storage.estimate) {
    navigator.storage.estimate().then(function(est) {
      var usedKB = Math.round((est.usage||0)/1024);
      var quotaMB = Math.round((est.quota||0)/1024/1024);
      div.innerHTML = 'Data: ~' + Math.round(lsBytes/1024) + ' KB &nbsp;·&nbsp; Browser storage: ' + usedKB + ' KB / ' + quotaMB + ' MB quota';
    }).catch(function() { div.innerHTML = '~' + Math.round(lsBytes/1024) + ' KB in localStorage'; });
  } else { div.innerHTML = '~' + Math.round(lsBytes/1024) + ' KB in localStorage'; }
}

// ── DRAW FUNCTIONS ───────────────────────────────────
function drawFleet() {
  var fc = g('fleetCards');
  if (fc) {
    var h = '';
    state.fleet.forEach(function(t){
      h += '<div class="fleet-card ' + t.status + '">' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;"><div class="fc-name">' + t.name + '</div><span class="badge b-' + t.status + '">' + (t.status==='available'?'✓ Available':'⚡ Rented') + '</span></div>' +
        (t.status==='available'
          ? '<div class="fc-label">Current Combo Code</div><div class="fc-combo">' + t.combo + '</div><div style="margin-top:10px;"><button class="btn btn-primary btn-sm" onclick="showPage(\'new-booking\')">+ Book This Trailer</button></div>'
          : '<div class="fc-renter">Rented to: <strong>' + t.renter + '</strong></div><div class="fc-renter">Due: <strong>' + t.returnDate + '</strong></div><div class="fc-label" style="margin-top:10px;">Active Combo</div><div class="fc-combo">' + t.combo + '</div><div style="margin-top:10px;"><button class="btn btn-success btn-sm" onclick="markRetByTrailer(\'' + t.id + '\')">✓ Mark Returned</button></div>'
        ) + '</div>';
    });
    fc.innerHTML = h;
  }
  var cm = g('comboManager');
  if (cm) {
    var ch = '';
    state.fleet.forEach(function(t){
      var digs = ''; for (var i = 0; i < t.combo.length; i++) digs += '<div class="combo-dig">' + t.combo[i] + '</div>';
      ch += '<div style="margin-bottom:20px;padding-bottom:20px;border-bottom:1px solid #1a1a1a;">' +
        '<div style="font-family:Oswald,sans-serif;font-size:14px;font-weight:600;color:var(--white);margin-bottom:10px;text-transform:uppercase;">' + t.name + '</div>' +
        '<div class="combo-disp">' + digs + '</div>' +
        '<div style="display:flex;gap:8px;margin-top:10px;align-items:center;"><input class="fi" id="ci-' + t.id + '" type="text" maxlength="4" placeholder="0000" style="width:90px;font-family:Oswald,sans-serif;font-size:22px;font-weight:700;text-align:center;letter-spacing:4px;">' +
        '<button class="btn btn-ghost btn-sm" onclick="setComboFleet(\'' + t.id + '\')">Set</button>' +
        '<button class="btn btn-ghost btn-sm" onclick="randComboFleet(\'' + t.id + '\')">🎲</button></div></div>';
    });
    cm.innerHTML = ch;
  }
}

function drawActiveRentals() {
  var container = g('activeBody'); if (!container) return;
  if (!state.rentals.length) {
    container.innerHTML = '<div style="text-align:center;color:var(--muted);padding:40px 20px;font-size:14px;">No active rentals.<br><br><button class="btn btn-primary" onclick="showPage(\'new-booking\')">+ New Booking</button></div>';
    return;
  }

  var statusLabels = {
    'docs_pending':    {cls:'b-pending',  text:'DOCS PENDING'},
    'payment_pending': {cls:'b-rented',   text:'PAYMENT PENDING'},
    'confirmed':       {cls:'b-available',text:'CONFIRMED'},
    'active':          {cls:'b-rented',   text:'OUT'},
    'returned':        {cls:'b-returned', text:'RETURNED'},
    'cancelled':       {cls:'b-overdue',  text:'CANCELLED'}
  };

  var h = '<div style="font-family:Oswald,sans-serif;font-size:11px;color:var(--muted);letter-spacing:2px;text-transform:uppercase;margin-bottom:10px;">' + state.rentals.length + ' booking' + (state.rentals.length>1?'s':'') + '</div>';

  state.rentals.forEach(function(r){
    var sl = statusLabels[r.status] || {cls:'b-pending', text:(r.status||'IN PROGRESS').toUpperCase()};
    var dl = Math.ceil((new Date(r.ed+'T12:00:00')-new Date())/86400000);

    h += '<div class="rental-card">' +
      '<div class="rental-card-header">' +
        '<div><div class="rental-name">' + escHtml(r.c.fn) + ' ' + escHtml(r.c.ln) + '</div><div class="rental-phone">' + escHtml(r.c.ph) + '</div></div>' +
        '<span class="badge ' + sl.cls + '">' + sl.text + '</span>' +
      '</div>' +
      '<div class="rental-field"><span class="rental-label">Trailer</span><span class="rental-value">' + escHtml(r.trailer) + '</span></div>' +
      '<div class="rental-field"><span class="rental-label">Dates</span><span class="rental-value">' + r.sd + ' → ' + r.ed + '</span></div>';

    if (r.status === 'active') {
      var bc = dl<=0?'b-overdue':dl===1?'b-pending':'b-available';
      var bt = dl<=0?'OVERDUE':dl===1?'DUE TOMORROW':r.days+'-DAY RENTAL';
      h += '<div class="rental-field"><span class="rental-label">Return</span><span class="rental-value"><span class="badge ' + bc + '">' + bt + '</span></span></div>';
      h += '<div class="rental-field"><span class="rental-label">Combo</span><span class="rental-value accent">' + r.combo + '</span></div>';
      h += '<div class="rental-field"><span class="rental-label">Amount</span><span class="rental-value">$' + r.total + ' <span style="color:var(--muted);font-weight:400;">+$' + r.dep + ' dep</span></span></div>';
      h += '<div class="rental-actions"><button class="btn btn-success btn-sm" onclick="markReturned(' + r.id + ')">✓ Mark Returned</button></div>';
    } else if (r.status === 'returned') {
      h += '<div class="rental-field"><span class="rental-label">Deposit</span><span class="rental-value">$' + r.dep + '</span></div>';
      h += '<div class="deposit-actions">';
      if (r.depositIntentId && r.depositStatus === 'held') {
        h += '<button class="btn btn-success btn-sm" style="width:100%;" onclick="releaseDeposit(' + r.id + ')">✅ Release Deposit — Clean Return</button>' +
             '<button class="btn btn-danger btn-sm" style="width:100%;" onclick="captureDeposit(' + r.id + ')">⚠️ Capture Deposit — Damage</button>';
      } else {
        h += '<div class="deposit-manual">📞 Deposit handled manually — mark as resolved</div>' +
             '<button class="btn btn-ghost btn-sm" style="width:100%;" onclick="resolveManually(' + r.id + ')">Mark Resolved</button>';
      }
      h += '</div>';
    } else {
      // docs_pending, payment_pending, confirmed
      h += '<div class="rental-field"><span class="rental-label">Amount</span><span class="rental-value">$' + r.total + ' <span style="color:var(--muted);font-weight:400;">+$' + r.dep + ' dep</span></span></div>';
    }

    h += '</div>';
  });

  container.innerHTML = h;
}

function drawHistory() {
  var container = g('histBody'); if (!container) return;
  var all = state.done.slice().reverse();
  var hs = g('histStats');
  if (!all.length) {
    if (hs) hs.textContent = '';
    container.innerHTML = '<div style="text-align:center;color:var(--muted);padding:40px 20px;font-size:14px;">No completed rentals yet.</div>';
    return;
  }
  var rev = 0; all.forEach(function(r){rev += r.rental + (r.wt||0);});
  if (hs) hs.textContent = all.length + ' rentals · $' + rev + ' total revenue';
  var h = '';
  all.forEach(function(r){
    h += '<div class="rental-card">' +
      '<div class="rental-card-header">' +
        '<div><div class="rental-name">' + escHtml(r.c.fn) + ' ' + escHtml(r.c.ln) + '</div><div class="rental-phone">#' + r.id + (r.src ? ' · ' + escHtml(r.src) : '') + '</div></div>' +
        '<span class="badge b-returned">Returned</span>' +
      '</div>' +
      '<div class="rental-field"><span class="rental-label">Trailer</span><span class="rental-value">' + escHtml(r.trailer) + '</span></div>' +
      '<div class="rental-field"><span class="rental-label">Dates</span><span class="rental-value">' + r.sd + ' → ' + r.ed + '</span></div>' +
      '<div class="rental-field"><span class="rental-label">Duration</span><span class="rental-value">' + r.days + ' day' + (r.days>1?'s':'') + '</span></div>' +
      '<div class="rental-field"><span class="rental-label">Revenue</span><span class="rental-value accent">$' + r.rental + '</span></div>' +
      '</div>';
  });
  container.innerHTML = h;
}

function drawAvail() {
  var div = g('availPanel'); if (!div) return;
  var h = '';
  state.fleet.forEach(function(t){
    h += '<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid #1a1a1a;">' +
      '<div><div style="font-weight:600;color:var(--white);font-size:14px;">' + t.name + '</div>' +
      '<div style="font-size:12px;color:var(--muted);margin-top:2px;">' + (t.status==='rented'?'Out — returns '+t.returnDate:'Open & ready') + '</div></div>' +
      '<span class="badge b-' + t.status + '">' + (t.status==='available'?'✓ Open':'⚡ Out') + '</span></div>';
  });
  div.innerHTML = h + '<div style="margin-top:12px;font-size:12px;color:var(--muted);">Confirm dates before booking.</div>';
}

function drawFleetSettings() {
  var div = g('fleetSettings'); if (!div) return;
  var h = '';
  state.fleet.forEach(function(t){
    h += '<div style="margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid #1a1a1a;">' +
      '<div style="font-family:Oswald,sans-serif;font-size:14px;font-weight:600;color:var(--white);margin-bottom:6px;text-transform:uppercase;">' + t.name + '</div>' +
      '<div style="font-size:13px;color:var(--muted);">Status: <span class="badge b-' + t.status + '" style="margin-left:6px;">' + t.status + '</span></div></div>';
  });
  div.innerHTML = h;
}

function drawMessages() {
  var tpls = [
    {l:'Inquiry — Available', t:'Hey [Name]! This is Frank with Iron G Equipment Co. Great news — the [trailer] is available on [dates].\n\nI\'ll send you a quote with the full breakdown — just need:\n• Your tow vehicle (year/make/model)\n• Pickup and return dates\n• What you\'re hauling\n\nOnce I have that I\'ll get you a quote right away.\n\n— Frank (405) 393-4161'},
    {l:'Inquiry — Not Available', t:'Hey [Name]! The [trailer] is already booked for [dates].\n\nI have availability starting [next date] — would that work?\n\n— Frank (405) 393-4161 · Iron G Equipment Co.'},
    {l:'Return Reminder (Day Before)', t:'Hey [Name]! Quick reminder — your trailer is due back tomorrow.\n\n📍 Mother Road Storage, 16245 W HWY 66, Yukon\n🔐 Lock coupler and text me a photo when done\n\nNeed more time? Text me ASAP.\n\n— Frank (405) 393-4161'},
    {l:'Late Return Warning', t:'Hey [Name] — trailer was due back [DATE] and I haven\'t received a return photo.\n\nPlease return ASAP and text me a locked coupler photo.\n\nLate fee: $[rate]/day from [due date].\n\n— Frank (405) 393-4161'},
    {l:'Deposit Release', t:'Hey [Name]! Trailer returned and inspected — all good! ✅\n\nYour $[deposit] deposit has been released. Shows on your card within 3 business days.\n\nThanks — hope to see you next time! 🤙 — Frank'},
    {l:'Review Request', t:'Hey [Name]! Thanks for renting with Iron G — hope the [trailer] got the job done! 💪\n\nIf you have 2 mins, a Google review means a lot to us:\n👉 [Google Review Link]\n\nNeed a trailer again? Just text me! — Frank (405) 393-4161'}
  ];
  var decl = [{l:'Vehicle Too Light — Safety Decline', t:'Hey [Name] — I want to be straight with you: based on your [vehicle], the trailer + load combo would exceed your truck\'s tow rating. That\'s a real safety risk.\n\nYou\'d need at least an F-250 or Ram 2500. If you can get access to one, I\'d love to help. Otherwise I can\'t put you at risk.\n\n— Frank (405) 393-4161'}];
  function buildTPL(items) {
    var h = '';
    items.forEach(function(item, idx){
      var uid = 'tpl-' + idx + '-' + Date.now();
      h += '<div class="msg"><div class="msg-label">' + item.l + '</div><div class="msg-text" id="' + uid + '">' + item.t + '</div><div class="msg-actions"><button class="btn btn-primary btn-sm" onclick="copyEl(\'' + uid + '\')">📋 Copy</button></div></div>';
    });
    return h;
  }
  var t1 = g('tpl1'); if (t1) t1.innerHTML = buildTPL(tpls);
  var t2 = g('tpl2'); if (t2) t2.innerHTML = buildTPL(decl);
}

function drawFullAgr() {
  var div = g('fullAgr'); if (!div) return;
  var ph = gs('s-ph','(405) 393-4161'), em = gs('s-em','info@irongequipment.com'), biz = gs('s-biz','Iron G Equipment Co. LLC');
  div.innerHTML = '<h2>' + biz + '</h2>' +
    '<p style="text-align:center;font-size:11px;color:#666;">Trailer Rental Agreement · ' + ph + ' · ' + em + '</p>' +
    '<div style="height:1px;background:#ddd;margin:10px 0;"></div>' +
    '<h3>1. Rental Information</h3>' +
    '<p>Renter Name: _________________________________</p>' +
    '<p>Phone: __________________ Email: ____________________________</p>' +
    '<p>Drivers License #: ______________________ State: ______</p>' +
    '<p>Tow Vehicle: ____________________________________________</p>' +
    '<p>Trailer: ____________________________________________</p>' +
    '<p>Rental Start: _________________ Return Due: _________________</p>' +
    '<p>Rental Amount: $_________ &nbsp; Deposit: $_________</p>' +
    '<h3>2. Terms and Conditions</h3>' +
    '<p><strong>2.1</strong> Valid drivers license and proof of auto insurance covering towing required.</p>' +
    '<p><strong>2.2</strong> Renter solely responsible for ensuring tow vehicle meets minimum towing requirements including a functioning brake controller compatible with electric trailer brakes.</p>' +
    '<p><strong>2.3 Contactless Pickup.</strong> Renter acknowledges combo code delivered via text/email. Full responsibility from code delivery until return photo received.</p>' +
    '<p><strong>2.4 Return.</strong> Return to storage by due date, lock coupler, text photo to ' + ph + '. Late returns: $25/hr for first 4 hours, then full daily rate per additional day.</p>' +
    '<p><strong>2.5</strong> Renter agrees not to exceed GVWR, not to sub-rent or loan the trailer, and to comply with all Oklahoma towing laws.</p>' +
    '<p><strong>2.6</strong> Renter responsible for all damage beyond normal wear. Security deposit applied toward repair costs. Remaining balance charged to card on file if repairs exceed deposit.</p>' +
    '<p><strong>2.7</strong> Deposit released within 3 business days of satisfactory return. Trailer equipped with GPS tracking.</p>' +
    '<p><strong>2.8</strong> Governed by laws of the State of Oklahoma. Venue: Canadian County, Oklahoma.</p>' +
    '<h3>3. Signatures</h3>' +
    '<p>Renter Signature: ______________________________ Date: ____________</p>' +
    '<p style="margin-top:14px;">' + biz + ' — Frank Garza, Owner &nbsp; Date: ____________</p>' +
    '<div style="margin-top:12px;font-size:10px;color:#aaa;text-align:center;">' + biz + ' · Yukon, OK · ' + ph + ' · ' + em + '</div>';
}

// ── COPY / SMS HELPERS ───────────────────────────────
function copyEl(id) {
  var el = g(id); if (!el) return;
  var text = el.innerText || el.textContent;
  function fb() { var ta = document.createElement('textarea'); ta.value = text; ta.style.position='fixed'; ta.style.opacity='0'; document.body.appendChild(ta); ta.focus(); ta.select(); try { document.execCommand('copy'); } catch(e) {} document.body.removeChild(ta); }
  if (navigator.clipboard) { navigator.clipboard.writeText(text).catch(fb); } else { fb(); }
  var btns = document.querySelectorAll('[onclick*="' + id + '"]');
  btns.forEach(function(b){ var ot = b.textContent; b.textContent = '✓ Copied!'; setTimeout(function(){ b.textContent = ot; }, 2000); });
}

function openSMS(id) {
  var el = g(id); if (!el) return;
  var ph = state.booking.customer ? state.booking.customer.ph.replace(/\D/g,'') : '';
  window.location.href = 'sms:' + ph + '?body=' + encodeURIComponent(el.textContent);
}

// ── DASHBOARD ────────────────────────────────────────
function drawDashboard() {
  updateStats();
  var df = g('dashFleet');
  if (df) {
    var h = '';
    state.fleet.forEach(function(t){
      h += '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #1a1a1a;">' +
        '<div><div style="font-weight:600;color:var(--white);font-size:14px;">' + t.name + '</div>' +
        '<div style="font-size:12px;color:var(--muted);margin-top:2px;">' + (t.status==='rented'?'Out to '+t.renter+' — due '+t.returnDate:'Ready to rent') + '</div></div>' +
        '<span class="badge b-' + t.status + '">' + (t.status==='available'?'✓ Available':'⚡ Out') + '</span></div>';
    });
    df.innerHTML = h;
  }
  var da = g('dashActivity');
  if (da) {
    var acts = state.activity.slice(-6).reverse(), ah = '';
    var colorMap = {orange:'var(--primary)',green:'var(--success)',yellow:'var(--warning)',gray:'#3a3a3a'};
    acts.forEach(function(a){
      var c = colorMap[a.color] || '#3a3a3a';
      ah += '<div class="act-item"><div style="width:8px;height:8px;border-radius:50%;background:' + c + ';flex-shrink:0;margin-top:5px;"></div><div><div style="font-size:13px;color:var(--text);">' + a.text + '</div><div style="font-size:11px;color:var(--muted);">' + a.time + '</div></div></div>';
    });
    da.innerHTML = ah || '<div style="color:var(--muted);font-size:13px;">No activity yet.</div>';
  }
  var dr = g('dashReturns');
  if (dr) {
    var active = state.rentals.filter(function(r){return r.status==='active';});
    if (!active.length) { dr.innerHTML = '<div style="color:var(--muted);font-size:13px;text-align:center;padding:16px;">No active rentals.</div>'; return; }
    var rh = '';
    active.forEach(function(r){
      var dl = Math.ceil((new Date(r.ed+'T12:00:00')-new Date())/86400000);
      var bc = dl<=0?'b-overdue':dl===1?'b-pending':'b-available';
      var bt = dl<=0?'OVERDUE':dl===1?'DUE TOMORROW':r.days+'-DAY RENTAL';
      rh += '<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid #1a1a1a;gap:8px;">' +
        '<div style="min-width:0;"><div style="font-weight:600;color:var(--white);font-size:14px;">' + escHtml(r.c.fn) + ' ' + escHtml(r.c.ln) + '</div><div style="font-size:12px;color:var(--muted);">' + escHtml(r.trailer) + ' · Return: ' + r.ed + '</div></div>' +
        '<div style="display:flex;gap:8px;align-items:center;flex-shrink:0;"><span class="badge ' + bc + '">' + bt + '</span><button class="btn btn-success btn-sm" onclick="markReturned(' + r.id + ')">Return</button></div></div>';
    });
    dr.innerHTML = rh;
  }
}

// ── INIT ─────────────────────────────────────────────
async function initApp() {
  if (navigator.storage && navigator.storage.persist) {
    navigator.storage.persist().then(function(granted) {
      console.log('[IronG CC] Persistent storage:', granted);
    });
  }
  if ('serviceWorker' in navigator) { navigator.serviceWorker.register('/sw.js'); }
  try { db = await openDB(); } catch(e) { console.warn('[IronG CC] IDB unavailable:', e); }

  var lsData = null;
  try {
    var raw = localStorage.getItem(LS_KEY);
    if (raw) { var parsed = JSON.parse(raw); if (parsed && parsed.fleet && parsed.fleet.length >= 2) lsData = parsed; }
  } catch(e) {}

  var idbData = null;
  if (!lsData) {
    try { idbData = await idbGet('state'); } catch(e) {}
    if (idbData && (!idbData.fleet || idbData.fleet.length < 2)) idbData = null;
  }

  if (lsData) {
    state = lsData;
    idbPut('state', state).catch(function(){});
    console.log('[IronG CC] Init complete — loaded ' + (state.rentals.length + state.done.length) + ' items');
  } else if (idbData) {
    state = idbData;
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch(e) {}
    console.log('[IronG CC] Init complete — loaded ' + (state.rentals.length + state.done.length) + ' items');
  } else {
    state = defaultState();
    console.log('[IronG CC] First install — seeding defaults');
    save();
  }

  if (state.settings) {
    var smap = {'s-biz':'biz','s-own':'own','s-ph':'ph','s-em':'em','s-addr':'addr','s-ca':'ca','s-vm':'vm','s-sq':'sq'};
    for (var sid in smap) { var el = g(sid); if (el && state.settings[smap[sid]]!==undefined) el.value = state.settings[smap[sid]]; }
  }

  var today = new Date().toISOString().split('T')[0];
  ['f-sd','f-ed','qc-sd','qc-ed'].forEach(function(id){ var el = g(id); if (el) el.setAttribute('min',today); });

  history.replaceState({page: 'dashboard'}, '', '');

  updateStats();
  drawDashboard();
  drawFleet();
  showPage('dashboard', true);

  fetchNotifications();
  setInterval(fetchNotifications, 60000);

  initPushNotifications();
}

// ── NOTIFICATIONS ─────────────────────────────────────
var notifications = [];
var notifBadgeCount = 0;

async function fetchNotifications() {
  try {
    var res = await fetch('/notifications?handled=false');
    if (!res.ok) return;
    notifications = await res.json();
    notifBadgeCount = Array.isArray(notifications) ? notifications.length : 0;
    updateNotifBadge();
    if (currentPage === 'notifications') drawNotifications();
  } catch(e) {
    console.error('[IronG] fetchNotifications error:', e);
  }
}

function updateNotifBadge() {
  var hb = g('notifHeaderBadge');
  var db = g('drawerNotifBadge');
  if (hb) { hb.textContent = notifBadgeCount; hb.style.display = notifBadgeCount > 0 ? 'inline-flex' : 'none'; }
  if (db) { db.textContent = notifBadgeCount; db.style.display = notifBadgeCount > 0 ? 'inline-flex' : 'none'; }
}

function relativeTime(iso) {
  if (!iso) return '—';
  var diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return Math.floor(diff / 60) + ' min ago';
  var hrs = Math.floor(diff / 3600);
  if (diff < 86400) return hrs + ' hr' + (hrs > 1 ? 's' : '') + ' ago';
  var days = Math.floor(diff / 86400);
  return days + ' day' + (days > 1 ? 's' : '') + ' ago';
}

function toggleNotifDetail(id) {
  var el = g('nd-' + id);
  var btn = g('ndb-' + id);
  if (!el) return;
  var open = el.style.display !== 'none';
  el.style.display = open ? 'none' : 'block';
  if (btn) btn.textContent = open ? 'View Details' : 'Hide Details';
}

async function markHandled(key, id) {
  try {
    var res = await fetch('/notifications/handled', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: key }),
    });
    if (!res.ok) { console.error('[IronG] markHandled failed'); return; }
    notifications = notifications.filter(function(n) { return n.id !== id; });
    notifBadgeCount = notifications.length;
    updateNotifBadge();
    drawNotifications();
  } catch(e) {
    console.error('[IronG] markHandled error:', e);
  }
}

function notifDetailRow(label, val) {
  return '<div class="notif-field"><span class="notif-label">' + label + '</span><span class="notif-value">' + (val || '—') + '</span></div>';
}

function drawNotifications() {
  var container = g('notifBody');
  if (!container) return;
  if (!notifications.length) {
    container.innerHTML = '<div style="text-align:center;color:var(--muted);padding:40px 20px;font-size:14px;">No new requests. You\'re all caught up.</div>';
    return;
  }
  var h = '<div style="font-family:\'Oswald\',sans-serif;font-size:11px;color:var(--muted);letter-spacing:2px;text-transform:uppercase;margin-bottom:10px;">' + notifications.length + ' unhandled request' + (notifications.length > 1 ? 's' : '') + '</div>';
  notifications.forEach(function(n) {
    var isRental = n.type === 'rental';
    h += '<div class="notif-card">' +
      '<div class="notif-card-header">' +
        '<span class="notif-type-badge ' + (isRental ? 'ntb-rental' : 'ntb-info') + '">' + (isRental ? 'RENTAL' : 'INFO') + '</span>' +
        '<div class="notif-name">' + (n.name || '—') + '</div>' +
        '<div class="notif-meta">' + relativeTime(n.receivedAt) + '</div>' +
      '</div>' +
      '<div class="notif-quick">' +
        '<div class="notif-field"><span class="notif-label">Phone</span><a class="notif-phone" href="tel:' + (n.phone || '').replace(/\D/g, '') + '">' + (n.phone || '—') + '</a></div>' +
        '<div class="notif-field"><span class="notif-label">Trailer</span><span class="notif-value">' + (n.trailer || '—') + '</span></div>' +
        '<div class="notif-field"><span class="notif-label">Start Date</span><span class="notif-value">' + (n.startDate || '—') + '</span></div>' +
      '</div>' +
      '<div class="notif-detail" id="nd-' + n.id + '" style="display:none;">' +
        '<div style="height:1px;background:#1a1a1a;margin:12px 0;"></div>' +
        notifDetailRow('Name', n.name) +
        notifDetailRow('Phone', n.phone) +
        notifDetailRow('Email', n.email) +
        notifDetailRow('City', n.city) +
        notifDetailRow('Trailer', n.trailer) +
        notifDetailRow('Start Date', n.startDate) +
        notifDetailRow('Duration', n.duration) +
        notifDetailRow('Tow Vehicle', n.towVehicle) +
        notifDetailRow('Hauling', n.hauling) +
        notifDetailRow('Referral', n.referral) +
        notifDetailRow('Notes', n.notes) +
        notifDetailRow('Source', n.source) +
        notifDetailRow('Submitted', n.timestamp) +
        notifDetailRow('Received', n.receivedAt) +
        notifDetailRow('Email Sent', n.emailSent ? 'Yes' : 'No') +
      '</div>' +
      '<div class="notif-actions">' +
        '<button class="btn btn-ghost btn-sm" id="ndb-' + n.id + '" onclick="toggleNotifDetail(' + n.id + ')">View Details</button>' +
        '<button class="btn btn-primary btn-sm" onclick="createBookingFromNotif(' + n.id + ')">📋 Create Booking</button>' +
        '<button class="btn btn-success btn-sm" onclick="markHandled(\'submission:' + n.id + '\',' + n.id + ')">✓ Mark Handled</button>' +
      '</div>' +
    '</div>';
  });
  container.innerHTML = h;
}

// ── WEB PUSH SUBSCRIPTION ────────────────────────────
var _vapidPublicKey = null;

async function initPushNotifications() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  try {
    var perm = Notification.permission;
    if (perm === 'denied') return;
    var reg = await navigator.serviceWorker.ready;
    if (perm === 'granted') {
      await subscribeAndPost(reg);
      updatePushPrompt();
      return;
    }
    updatePushPrompt();
  } catch(e) {
    console.error('[IronG] Push init error:', e);
  }
}

async function getVapidKey() {
  if (_vapidPublicKey) return _vapidPublicKey;
  try {
    var res = await fetch('/vapid-public-key');
    var data = await res.json();
    _vapidPublicKey = data.publicKey;
  } catch(e) {
    console.error('[IronG] Failed to fetch VAPID key:', e);
  }
  return _vapidPublicKey;
}

async function subscribeAndPost(reg) {
  var pubKey = await getVapidKey();
  if (!pubKey) return;
  var sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlB64ToUint8Array(pubKey),
  });
  await fetch('/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sub.toJSON()),
  });
  try { localStorage.setItem('ironG_pushSub', '1'); } catch(e) {}
}

async function enablePushNotifications() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  try {
    var perm = await Notification.requestPermission();
    if (perm !== 'granted') { updatePushPrompt(); return; }
    var reg = await navigator.serviceWorker.ready;
    await subscribeAndPost(reg);
    updatePushPrompt();
  } catch(e) {
    console.error('[IronG] Enable push error:', e);
  }
}

function updatePushPrompt() {
  var banner = g('pushPromptBanner');
  if (!banner) return;
  var perm = Notification.permission;
  banner.style.display = (perm === 'default' && 'PushManager' in window) ? 'block' : 'none';
}

function urlB64ToUint8Array(base64String) {
  var padding = '='.repeat((4 - base64String.length % 4) % 4);
  var base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  var rawData = atob(base64);
  var outputArray = new Uint8Array(rawData.length);
  for (var i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

// ── CREATE BOOKING FROM NOTIFICATION ─────────────────
function createBookingFromNotif(id) {
  var n = null;
  for (var i = 0; i < notifications.length; i++) {
    if (notifications[i].id === id) { n = notifications[i]; break; }
  }
  if (!n) return;

  var nameParts = (n.name || '').trim().split(/\s+/);
  var trailerId = '';
  if (n.trailer) {
    var tl = n.trailer.toLowerCase();
    if (tl.includes('utility')) trailerId = 'utility';
    else if (tl.includes('hauler')) trailerId = 'hauler';
  }

  window._pendingBooking = {
    fn: nameParts[0] || '',
    ln: nameParts.slice(1).join(' ') || '',
    ph: n.phone || '',
    em: n.email || '',
    cy: n.city || '',
    vh: n.towVehicle || '',
    trailerId: trailerId,
    startDate: n.startDate || '',
    ld: n.hauling || '',
    src: n.referral || '',
    nt: n.notes || '',
  };
  window._pendingBookingNotifKey = { key: 'submission:' + n.id, id: n.id };

  showPage('new-booking');
}

function populatePendingBooking() {
  var pb = window._pendingBooking;
  if (!pb) return;
  window._pendingBooking = null;

  newBooking();

  var set = function(id, val) { var el = g(id); if (el && val) el.value = val; };
  set('f-fn', pb.fn);
  set('f-ln', pb.ln);
  set('f-ph', pb.ph);
  set('f-em', pb.em);
  set('f-cy', pb.cy);
  set('f-vh', pb.vh);
  set('f-nt', pb.nt);
  set('f-ld', pb.ld);
  if (pb.startDate) set('f-sd', pb.startDate);
  if (pb.trailerId) {
    set('f-tr', pb.trailerId);
    calcPrice();
  }
  if (pb.src) {
    var src = g('f-src');
    if (src) {
      for (var i = 0; i < src.options.length; i++) {
        if (src.options[i].text === pb.src || src.options[i].value === pb.src) {
          src.selectedIndex = i; break;
        }
      }
    }
  }
}

initApp();
