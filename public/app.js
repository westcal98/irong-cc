var VER = '7.0';
var SCHEMA_VER = 1;
var DB_NAME = 'ironGCC';
var DB_STORE = 'state';
var LS_KEY = 'ironG_v3';
var commPref = 'text';
var _contactPref = 'sms';
var _customAddOns = [];
var _packageActionTaken = false;
var _currentLockboxCode = null;
var _processReturnId = null;
var db = null;
var currentPage = 'dashboard';
var _currentDraftId = null;
var _currentDraftCreatedAt = null;
var _highestStepReached = 1;
var _lastCalcTid = '';
var _lastAvailTid = '';
var globalVars = {};
var _templateCache = {};
var _trailerNames = {};
var _maintenanceTrailers = [];
var _currentMaintTrailerId = null;
var _editingMaintenanceRecord = null;
var _maintenanceRecordsCache = {};
var _serviceTypes = null;
var _pendingReceiptImage = null;
var _totalCostOverride = false;
var _maintPerformedBy = 'Self';
var _expenseRecordsCache = [];
var _editingExpenseRecord = null;
var _pendingExpenseReceiptImage = null;
var _currentExpenseFilter = 'all';
var _currentExpenseCategoryFilter = '';
var EXPENSE_CATEGORIES = [
  'Trailer Payment (RTO)','Insurance','Storage','Fuel/Mileage',
  'Maintenance & Repairs','Equipment & Supplies',
  'Marketing & Advertising','Software & Subscriptions',
  'Phone & Communications','Professional Services',
  'Licensing & Permits','Meals & Entertainment',
  'Office Supplies','Miscellaneous'
];
var EXPENSE_PAYMENT_METHODS = ['Cash','Debit Card','Credit Card','Check','Bank Transfer','Other'];
var _mileageRecordsCache = [];
var _currentExpensesView = 'expenses';
var DEFAULT_SERVICE_TYPES = [
  'Tire Rotation/Replacement','Wheel Bearing Service','Brake Inspection/Replacement',
  'Light Repair/Replacement','Wiring Repair','Coupler Service/Replacement',
  'Jack Service/Replacement','Safety Chain Replacement','Winch Service/Repair',
  'Ramp Repair/Replacement','Frame Repair/Welding','Rust Treatment',
  'Deck Repair/Replacement','Registration/Inspection','Cleaning/Detail',
  'GPS Tracker Service','Custom'
];

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

// ── IDB HELPERS ──────────────────────────────────────
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
function idbListPrefix(prefix, cb) {
  if (!db) { cb([]); return; }
  try {
    var tx = db.transaction(DB_STORE, 'readonly');
    var store = tx.objectStore(DB_STORE);
    var range = IDBKeyRange.bound(prefix, prefix + '￿', false, false);
    var req = store.openCursor(range);
    var results = [];
    req.onsuccess = function(e) {
      var cursor = e.target.result;
      if (cursor) { results.push({key: cursor.key, value: cursor.value}); cursor.continue(); }
      else { cb(results); }
    };
    req.onerror = function() { cb(results); };
  } catch(e) { cb([]); }
}

function save() {
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch(e) {}
  idbPut('state', state).catch(function(){});
}

function g(id) { return document.getElementById(id); }
function gs(id, def) { var el = g(id); return el ? el.value.trim() || def : def; }

setInterval(function() {
  var n = new Date(); var el = g('clock');
  if (el) el.textContent = n.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'}) + ' · ' + n.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'});
}, 1000);

// ── DRAWER ──────────────────────────────────────────
function openDrawer() { g('drawer').classList.add('open'); g('drawerOverlay').classList.add('open'); }
function closeDrawer() { g('drawer').classList.remove('open'); g('drawerOverlay').classList.remove('open'); }
function navTo(id) { closeDrawer(); showPage(id); }

var FAB_PAGES = ['dashboard', 'active-rentals', 'drafts', 'maintenance', 'expenses'];

function fabAction() {
  if (currentPage === 'maintenance') { openNewMaintenanceRecord(); return; }
  if (currentPage === 'expenses') {
    if (_currentExpensesView === 'mileage') { openNewMileage(); return; }
    openNewExpense(); return;
  }
  startNewDraft();
}

function updateFab() {
  var btn = g('fabBtn'); if (!btn) return;
  btn.style.display = FAB_PAGES.indexOf(currentPage) !== -1 ? '' : 'none';
}

// ── NAVIGATION ──────────────────────────────────────
var titles = {
  dashboard:'Dashboard', fleet:'Fleet Status', 'new-booking':'New Booking',
  'active-rentals':'Active Rentals', messages:'Message Templates', agreement:'Rental Agreement',
  pricing:'Pricing Reference', history:'Rental History', settings:'Settings',
  notifications:'Notifications', drafts:'Drafts', 'process-return':'Process Return',
  messaging:'Messaging', docs:'Documents',
  maintenance:'Maintenance Log', 'maintenance-record':'Maintenance Record',
  expenses:'Business Expenses', financials:'Financials', 'business-info':'Business Info'
};

function showPage(id, skipPush) {
  document.querySelectorAll('.page').forEach(function(p){p.classList.remove('active');});
  var pg = g('page-' + id); if (pg) pg.classList.add('active');
  var tt = g('pageTitle'); if (tt) tt.textContent = titles[id] || id;
  currentPage = id;
  updateFab();
  var bb = g('backBtn');
  if (bb) {
    if (id === 'dashboard') bb.classList.remove('visible');
    else bb.classList.add('visible');
  }
  document.querySelectorAll('.drawer-item').forEach(function(el){ el.classList.remove('active'); });
  var drawerMap = {
    'dashboard':'dnav-dashboard','fleet':'dnav-fleet','active-rentals':'dnav-active-rentals',
    'new-booking':'dnav-new-booking','settings':'dnav-settings','notifications':'dnav-notifications',
    'drafts':'dnav-drafts','messaging':'dnav-messaging','docs':'dnav-docs',
    'maintenance':'dnav-maintenance','expenses':'dnav-expenses','financials':'dnav-financials','business-info':'dnav-business-info'
  };
  var dnavId = drawerMap[id];
  if (dnavId) { var dn = g(dnavId); if (dn) dn.classList.add('active'); }
  if (!skipPush) history.pushState({page: id}, '', '');
  window.scrollTo(0, 0);
  if (id === 'dashboard') drawDashboard();
  if (id === 'fleet') drawFleet();
  if (id === 'active-rentals') drawActiveRentals();
  if (id === 'process-return') drawProcessReturn(_processReturnId);
  if (id === 'history') drawHistory();
  if (id === 'new-booking') drawAvail();
  if (id === 'settings') { drawFleetSettings(); updateStorageUsage(); loadGlobalVarSettings(); loadGoogleDriveStatus(); }
  if (id === 'maintenance') drawMaintenancePage();
  if (id === 'expenses') drawExpensesPage();
  if (id === 'financials') drawFinancialsPage();
  if (id === 'business-info') drawBusinessInfoPage();
  if (id === 'maintenance-record') { /* form already built before navTo */ }
  if (id === 'messaging') drawMessaging();
  if (id === 'docs') drawDocs();
  if (id === 'messages') drawMessages();
  if (id === 'agreement') drawFullAgr();
  if (id === 'notifications') drawNotifications();
  if (id === 'drafts') drawDrafts();
}

function goBack() { history.back(); }

window.addEventListener('popstate', function(e) {
  if (e.state && e.state.page === 'new-booking' && e.state.step && currentPage === 'new-booking') {
    goStep(e.state.step, true); return;
  }
  var page = (e.state && e.state.page) ? e.state.page : 'dashboard';
  if (!e.state) history.pushState({page: 'dashboard'}, '', '');
  showPage(page, true);
});

// ── COMM PREFERENCE ─────────────────────────────────
function setComm(val, el) {
  commPref = val;
  document.querySelectorAll('#commToggle .comm-opt').forEach(function(b){b.classList.remove('active');});
  el.classList.add('active');
}

function setContactPref(val, el) {
  _contactPref = val;
  document.querySelectorAll('#contactPrefToggle .comm-opt').forEach(function(b){b.classList.remove('active');});
  el.classList.add('active');
}

function fmtMoney(n) { return n % 1 === 0 ? '$' + n : '$' + n.toFixed(2); }

// ── PRICING ─────────────────────────────────────────
function getAddOnsTotal() {
  var total = 0, addOns = [];
  document.querySelectorAll('.addon-chk:checked').forEach(function(c) {
    var label = c.getAttribute('data-label'); var amount = parseFloat(c.getAttribute('data-amount')) || 0;
    total += amount; addOns.push({label:label, amount:amount});
  });
  _customAddOns.forEach(function(a) { total += a.amount; addOns.push(a); });
  return {total:total, addOns:addOns};
}

function calcPrice() {
  var tid = g('f-tr') ? g('f-tr').value : '';
  var sd = g('f-sd') ? g('f-sd').value : '';
  var st = g('f-st') ? g('f-st').value : '';
  var ed = g('f-ed') ? g('f-ed').value : '';
  var et = g('f-et') ? g('f-et').value : '';
  checkBookingConflict(tid, sd, ed);
  if (tid && tid !== _lastAvailTid) { _lastAvailTid = tid; updateNextAvailableHelper(tid); }
  var r = doCalc(tid, sd, st, ed, et);
  var div = g('priceCalc');
  if (!r) {
    if (div) div.innerHTML = '<div style="color:var(--muted);font-size:13px;text-align:center;padding:20px;">Select trailer and dates</div>';
    return;
  }
  var depEl = g('f-dep');
  if (depEl) {
    if (tid !== _lastCalcTid) {
      depEl.value = r.dep;
      _lastCalcTid = tid;
      _currentLockboxCode = null;
      idbGet('trailer:' + tid + ':lockboxCode').then(function(code){ _currentLockboxCode = code||null; }).catch(function(){});
    } else {
      var customDep = parseInt(depEl.value, 10);
      if (!isNaN(customDep) && customDep >= 0) { r.dep = customDep; }
    }
  }
  var ao = getAddOnsTotal();
  var TAX_RATE = 0.0885;
  var tax = Math.round((r.base + ao.total) * TAX_RATE * 100) / 100;
  r.addOns = ao.addOns; r.addOnsTotal = ao.total;
  r.taxRate = TAX_RATE; r.tax = tax;
  r.total = r.base + ao.total;
  r.grand = r.base + ao.total + tax + r.dep;
  if (div) div.innerHTML = cpHtml(r);
  state.booking.pricing = r;
}

function doCalc(tid, sd, st, ed, et) {
  if (!tid || !sd || !ed) return null;
  var t = findFleet(tid); if (!t) return null;
  var s = new Date(sd + 'T12:00:00'), e = new Date(ed + 'T12:00:00');
  if (e <= s) return null;
  var pricingDays = Math.round((e-s)/86400000); if (pricingDays <= 0) return null;
  // Exact duration from full datetimes when times provided
  var exactDays = pricingDays, durationLabel = '';
  if (st && et) {
    var sdt = new Date(sd + 'T' + st), edt = new Date(ed + 'T' + et);
    var diffMs = edt - sdt;
    if (diffMs > 0) {
      var totalHrs = diffMs / 3600000;
      exactDays = totalHrs / 24;
      var wholeDays = Math.floor(totalHrs / 24);
      var remHrs = Math.round(totalHrs % 24);
      durationLabel = remHrs === 0
        ? wholeDays + ' day' + (wholeDays !== 1 ? 's' : '')
        : wholeDays + ' day' + (wholeDays !== 1 ? 's' : '') + ' ' + remHrs + ' hr' + (remHrs !== 1 ? 's' : '');
    }
  }
  if (!durationLabel) durationLabel = pricingDays + ' day' + (pricingDays !== 1 ? 's' : '');
  var p = t.p, base = 0, type = '', breakdown = [];
  if (pricingDays >= 7) {
    base = p.wk; type = 'Weekly rate (7 days)';
    breakdown.push({label:'Weekly rate', amount:p.wk});
  } else {
    var d = new Date(s); var wdCount = 0, weCount = 0;
    for (var i = 0; i < pricingDays; i++) {
      var dw = d.getDay();
      if (dw===5||dw===6||dw===0) { weCount++; base += p.we; } else { wdCount++; base += p.wd; }
      d.setDate(d.getDate()+1);
    }
    type = pricingDays === 1 ? 'Daily rate' : pricingDays + '-day rate';
    if (wdCount > 0) breakdown.push({label: wdCount + ' weekday' + (wdCount>1?'s':'') + ' @ $' + p.wd + '/day', amount: wdCount * p.wd});
    if (weCount > 0) breakdown.push({label: weCount + ' weekend day' + (weCount>1?'s':'') + ' @ $' + p.we + '/day', amount: weCount * p.we});
  }
  return {days:exactDays, pricingDays:pricingDays, durationLabel:durationLabel, base:base, total:base, dep:p.dep, grand:base+p.dep, type:type, tname:t.name, breakdown:breakdown};
}

function cpHtml(r) {
  var bkHtml = '';
  if (r.breakdown && r.breakdown.length) {
    r.breakdown.forEach(function(b){ bkHtml += '<div class="crow"><span class="cl">' + b.label + '</span><span class="cv o">$' + b.amount + '</span></div>'; });
  }
  var html = '<div class="cpanel" style="margin:0;"><h4>Price Breakdown — ' + (r.durationLabel || '') + '</h4>' + bkHtml;
  html += '<div class="crow"><span class="cl">Rental Fee</span><span class="cv o">$' + r.base + '</span></div>';
  if (r.addOnsTotal) html += '<div class="crow"><span class="cl">Add-Ons Total</span><span class="cv o">$' + r.addOnsTotal + '</span></div>';
  html += '<div class="crow"><span class="cl">Tax (8.85%)</span><span class="cv">' + fmtMoney(r.tax||0) + '</span></div>';
  html += '<div class="crow"><span class="cl">Deposit</span><span class="cv">$' + r.dep + '</span></div>';
  html += '<div class="crow" style="border-top:1px solid var(--orange-dark);margin-top:6px;padding-top:8px;"><span class="cl" style="color:var(--white);font-weight:700;">TOTAL DUE</span><span class="cv o" style="font-size:22px;">' + fmtMoney(r.grand) + '</span></div>';
  html += '</div>';
  return html;
}

function quickCalc() {
  var r = doCalc(g('qc-tr').value, g('qc-sd')?g('qc-sd').value:'', '', g('qc-ed')?g('qc-ed').value:'', '');
  if (r) {
    r.addOns = []; r.addOnsTotal = 0;
    var TAX_RATE = 0.0885;
    r.tax = Math.round(r.base * TAX_RATE * 100) / 100;
    r.taxRate = TAX_RATE; r.grand = r.base + r.tax + r.dep;
  }
  var div = g('qcResult'); if (!div) return;
  div.innerHTML = r ? cpHtml(r) : '';
}

// ── ADD-ONS HELPERS ──────────────────────────────────
function onStartTimeChange() {
  var st = g('f-st'); var et = g('f-et');
  if (st && et && !et.value && st.value) et.value = st.value;
  calcPrice();
}

function addCustomAddOn() {
  var labelEl = g('addon-new-label'), amtEl = g('addon-new-amount');
  if (!labelEl || !amtEl) return;
  var label = labelEl.value.trim(); var amount = parseFloat(amtEl.value) || 0;
  if (!label) { alert('Enter an add-on label.'); return; }
  _customAddOns.push({label:label, amount:amount});
  labelEl.value = ''; amtEl.value = '';
  renderCustomAddOns(); calcPrice();
}

function removeCustomAddOn(idx) {
  _customAddOns.splice(idx, 1);
  renderCustomAddOns(); calcPrice();
}

function renderCustomAddOns() {
  var div = g('customAddOnsList'); if (!div) return;
  var h = '';
  _customAddOns.forEach(function(a, i) {
    h += '<div class="addon-row addon-custom"><span class="addon-label">' + escHtml(a.label) + '</span><span class="addon-price">$' + a.amount + '</span><button class="btn btn-ghost btn-sm" onclick="removeCustomAddOn(' + i + ')" style="padding:2px 6px;font-size:10px;">✕</button></div>';
  });
  div.innerHTML = h;
}

// ── BOOKING FLOW ─────────────────────────────────────
function goStep(n, fromHistory) {
  if (!fromHistory) {
    if (n === 2) {
      if (!g('f-fn').value.trim() || !g('f-ph').value.trim() || !g('f-em').value.trim() || !g('f-vh').value.trim()) { alert('Please enter name, phone, email, and tow vehicle.'); return; }
      state.booking.customer = {fn:g('f-fn').value, ln:g('f-ln').value, ph:g('f-ph').value, em:g('f-em').value, cy:g('f-cy').value, vh:g('f-vh').value, comm:commPref, contactPref:_contactPref};
    }
    if (n === 3) {
      var _st = g('f-st') ? g('f-st').value : '';
      var _et = g('f-et') ? g('f-et').value : '';
      if (!g('f-tr').value || !g('f-sd').value || !g('f-ed').value || !_st || !_et) { alert('Please select trailer, dates, and times.'); return; }
      if (!(g('f-ld') && g('f-ld').value.trim())) { alert('Please enter what they are hauling.'); return; }
      state.booking.rental = {tid:g('f-tr').value, sd:g('f-sd').value, st:_st, ed:g('f-ed').value, et:_et, ld:g('f-ld').value, src:g('f-src').value, nt:g('f-nt').value};
      calcPrice(); drawStep3();
    }
  }
  for (var i = 1; i <= 4; i++) {
    var el = g('step'+i); if (el) el.style.display = i===n?'block':'none';
    var fs = g('fs'+i);
    if (fs) { fs.classList.remove('active','done','reachable'); if (i<n) fs.classList.add('done'); if (i===n) fs.classList.add('active'); }
  }
  // Mark reachable tabs (can jump to them even when not 'done')
  if (n > _highestStepReached) _highestStepReached = n;
  for (var j = 1; j <= 4; j++) {
    var fj = g('fs'+j);
    if (fj && j <= _highestStepReached && j !== n && !fj.classList.contains('done')) fj.classList.add('reachable');
  }
  window.scrollTo(0, 0);
  if (n < 4 && !fromHistory) {
    saveDraft(n);
    if (n > 1) history.pushState({ page: 'new-booking', step: n }, '', '');
  }
}

function stepTabClick(n) {
  if (n <= _highestStepReached) goStep(n);
}

function drawBookSummary() {
  var c = state.booking.customer, r = state.booking.rental, p = state.booking.pricing;
  var div = g('bookSummary'); if (!div || !c || !r || !p) return;
  var t = findFleet(r.tid);
  var daysDisp = p.durationLabel || (Math.ceil(p.days) + ' day' + (p.days>1?'s':''));
  var timesDisp = (r.st && r.et) ? (r.st + ' – ' + r.et) : '';
  div.innerHTML = '<h4>Booking Summary</h4>' +
    '<div class="crow"><span class="cl">Customer</span><span class="cv">' + c.fn + ' ' + c.ln + '</span></div>' +
    '<div class="crow"><span class="cl">Phone</span><span class="cv o">' + c.ph + '</span></div>' +
    '<div class="crow"><span class="cl">Contact Pref</span><span class="cv">' + (c.contactPref==='email'?'📧 Email':'📱 Text') + '</span></div>' +
    '<div class="crow"><span class="cl">Trailer</span><span class="cv">' + (t?t.name:'') + '</span></div>' +
    '<div class="crow"><span class="cl">Dates</span><span class="cv">' + r.sd + (timesDisp?' '+r.st:'') + ' → ' + r.ed + (timesDisp?' '+r.et:'') + '</span></div>' +
    '<div class="crow"><span class="cl">Duration</span><span class="cv">' + daysDisp + '</span></div>' +
    '<div class="crow"><span class="cl">Rental Fee</span><span class="cv o">$' + p.base + '</span></div>' +
    (p.addOnsTotal ? '<div class="crow"><span class="cl">Add-Ons</span><span class="cv o">$' + p.addOnsTotal + '</span></div>' : '') +
    '<div class="crow"><span class="cl">Tax (8.85%)</span><span class="cv">' + fmtMoney(p.tax||0) + '</span></div>' +
    '<div class="crow"><span class="cl">Deposit</span><span class="cv">$' + p.dep + '</span></div>' +
    '<div class="crow" style="border-top:1px solid var(--orange-dark);margin-top:4px;padding-top:6px;"><span class="cl" style="color:var(--white);font-weight:700;">TOTAL DUE</span><span class="cv o" style="font-size:20px;">' + fmtMoney(p.grand) + '</span></div>';
}

// ── STEP 3 — SEND PACKAGE ────────────────────────────
async function buildPackageMsg() {
  var c = state.booking.customer, r = state.booking.rental, p = state.booking.pricing;
  if (!c || !r || !p) return '';
  var t = findFleet(r.tid);
  var body = await getTemplateBody('pre-booking-package');
  var daysDisp = p.durationLabel || (Math.ceil(p.days) + ' day' + (Math.ceil(p.days)!==1?'s':''));
  var contactTarget = c.contactPref === 'email' ? c.em : c.ph;
  var addOnsArr = p.addOns || [];
  return addTokens(body, {
    firstName: c.fn,
    trailerName: t ? t.name : '',
    startDate: r.sd,
    startTime: r.st,
    endDate: r.ed,
    endTime: r.et,
    days: daysDisp,
    pickupAddress: globalVars.pickupAddress || 'Mother Road RV Boat & Trailer Storage, 16245 W HWY 66, Yukon, OK 73099',
    rentalFee: p.base,
    addOns: addOnsArr,
    tax: (p.tax||0).toFixed(2),
    deposit: p.dep,
    total: p.grand ? p.grand.toFixed(2) : (p.base + (p.addOnsTotal||0) + (p.tax||0) + p.dep).toFixed(2),
    towVehicle: c.vh || '—',
    contactInfo: contactTarget,
    gateCode: globalVars.gateCode || '',
    lockboxCode: '',
    paymentUrl: '',
    businessPhone: globalVars.businessPhone || '(405) 393-4161',
    businessName: globalVars.businessName || 'Iron G Equipment Co.'
  });
}

function drawStep3() {
  var c = state.booking.customer, r = state.booking.rental, p = state.booking.pricing;
  var sumDiv = g('step3-summary');
  if (sumDiv) {
    if (!c || !r || !p) {
      sumDiv.innerHTML = '<div style="color:var(--muted);font-size:13px;text-align:center;padding:16px;">Complete Steps 1 &amp; 2 first.</div>';
    } else {
      var t = findFleet(r.tid);
      var daysDisp = p.durationLabel || (Math.ceil(p.days) + ' day' + (p.days>1?'s':''));
      var prefBadge = c.contactPref === 'email' ? 'via Email' : 'via Text';
      var prefCls = c.contactPref === 'email' ? 'b-rented' : 'b-available';
      var addOnsHtml = '';
      if (p.addOns && p.addOns.length) {
        p.addOns.forEach(function(a){ addOnsHtml += '<div class="crow"><span class="cl" style="padding-left:10px;">— ' + escHtml(a.label) + '</span><span class="cv">' + fmtMoney(a.amount) + '</span></div>'; });
      }
      sumDiv.innerHTML =
        '<div class="crow"><span class="cl">Customer</span><span class="cv">' + escHtml(c.fn) + ' ' + escHtml(c.ln) + '</span></div>' +
        '<div class="crow"><span class="cl">Phone</span><span class="cv o">' + escHtml(c.ph) + '</span></div>' +
        '<div class="crow"><span class="cl">Email</span><span class="cv">' + escHtml(c.em) + '</span></div>' +
        '<div class="crow"><span class="cl">Contact</span><span class="cv"><span class="badge ' + prefCls + '" style="font-size:10px;">' + prefBadge + '</span></span></div>' +
        '<div class="crow"><span class="cl">Tow Vehicle</span><span class="cv">' + escHtml(c.vh||'—') + '</span></div>' +
        '<div class="crow"><span class="cl">Hauling</span><span class="cv">' + escHtml(r.ld||'—') + '</span></div>' +
        '<div class="crow"><span class="cl">Trailer</span><span class="cv">' + escHtml(t?t.name:'—') + '</span></div>' +
        '<div class="crow"><span class="cl">Pickup</span><span class="cv">' + r.sd + ' at ' + r.st + '</span></div>' +
        '<div class="crow"><span class="cl">Return</span><span class="cv">' + r.ed + ' at ' + r.et + '</span></div>' +
        '<div class="crow"><span class="cl">Duration</span><span class="cv">' + daysDisp + '</span></div>' +
        '<div style="height:1px;background:rgba(255,255,255,.06);margin:8px 0;"></div>' +
        '<div class="crow"><span class="cl">Rental Fee</span><span class="cv o">$' + p.base + '</span></div>' +
        addOnsHtml +
        '<div class="crow"><span class="cl">Tax (8.85%)</span><span class="cv">' + fmtMoney(p.tax||0) + '</span></div>' +
        '<div class="crow"><span class="cl">Deposit</span><span class="cv">$' + p.dep + '</span></div>' +
        '<div class="crow" style="border-top:1px solid rgba(255,255,255,.08);margin-top:4px;padding-top:6px;"><span class="cl" style="color:var(--white);font-weight:700;">Total Due</span><span class="cv o">' + fmtMoney(p.grand) + '</span></div>' +
        '<div style="height:1px;background:rgba(255,255,255,.06);margin:8px 0;"></div>' +
        '<div class="crow"><span class="cl">Location</span><span class="cv" style="text-align:right;font-size:11px;line-height:1.4;">Mother Road RV Boat &amp; Trailer Storage<br>16245 W HWY 66, Yukon, OK 73099</span></div>';
    }
  }
  var pkgDiv = g('step3-pkg-preview');
  buildPackageMsg().then(function(msg){ if (pkgDiv) pkgDiv.textContent = msg; });
  var contactPref = c ? (c.contactPref||'sms') : 'sms';
  var badgeEl = g('step3-contact-badge');
  var smsBtnEl = g('pkg3-sms-btn');
  var emailBtnEl = g('pkg3-email-btn');
  if (badgeEl) { badgeEl.textContent = contactPref==='email'?'📧 Email':'📱 Text'; badgeEl.className='badge '+(contactPref==='email'?'b-rented':'b-available'); }
  if (smsBtnEl) smsBtnEl.style.display = contactPref==='sms'?'':'none';
  if (emailBtnEl) emailBtnEl.style.display = contactPref==='email'?'':'none';
  var missing = [];
  if (!c||!c.fn) missing.push('first name');
  if (!c||!c.ph) missing.push('phone');
  if (!c||!c.em) missing.push('email');
  if (!c||!c.vh) missing.push('tow vehicle');
  if (!r||!r.tid) missing.push('trailer');
  if (!r||!r.sd||!r.st||!r.ed||!r.et) missing.push('dates/times');
  if (!r||!r.ld) missing.push('what hauling');
  if (!p) missing.push('pricing');
  var warnDiv = g('pkg-missing-warn');
  var btn = g('send-pkg-btn');
  if (missing.length) {
    if (warnDiv) { warnDiv.style.display=''; warnDiv.textContent='Missing: '+missing.join(', '); }
    if (btn) btn.disabled = true;
  } else {
    if (warnDiv) warnDiv.style.display='none';
    if (btn) btn.disabled = !_packageActionTaken;
  }
}

function pkg3Copy() {
  var el = g('step3-pkg-preview'); if (!el) return;
  var text = el.textContent;
  function fb() { var ta=document.createElement('textarea'); ta.value=text; ta.style.position='fixed'; ta.style.opacity='0'; document.body.appendChild(ta); ta.focus(); ta.select(); try{document.execCommand('copy');}catch(e){} document.body.removeChild(ta); }
  if (navigator.clipboard) { navigator.clipboard.writeText(text).catch(fb); } else { fb(); }
  showToast('Message copied!');
  _packageActionTaken = true; updateSendPkgBtn();
}

function pkg3OpenSms() {
  var c = state.booking.customer; if (!c||!c.ph) return;
  var el = g('step3-pkg-preview'); if (!el) return;
  window.location.href = 'sms:' + c.ph.replace(/\D/g,'') + '?body=' + encodeURIComponent(el.textContent);
  _packageActionTaken = true; updateSendPkgBtn();
}

function pkg3OpenEmail() {
  var c = state.booking.customer; if (!c||!c.em) return;
  var el = g('step3-pkg-preview'); if (!el) return;
  window.location.href = 'mailto:' + encodeURIComponent(c.em) + '?subject=' + encodeURIComponent('Iron G — Booking Summary') + '&body=' + encodeURIComponent(el.textContent);
  _packageActionTaken = true; updateSendPkgBtn();
}

function updateSendPkgBtn() {
  var btn = g('send-pkg-btn'); if (!btn) return;
  var warnDiv = g('pkg-missing-warn');
  var hasMissing = warnDiv && warnDiv.style.display !== 'none' && warnDiv.textContent;
  btn.disabled = !!hasMissing || !_packageActionTaken;
}

function sendPackage() {
  var c = state.booking.customer, r = state.booking.rental, p = state.booking.pricing;
  if (!c||!r||!p) { alert('Complete all steps first.'); return; }
  if (!confirm('Confirm package sent to ' + c.fn + ' ' + c.ln + '?')) return;
  var t = findFleet(r.tid);
  var bk = {
    id: state.nextId++, c: c, trailer: t.name, tid: r.tid, sd: r.sd, ed: r.ed,
    startTime: r.st||'', endTime: r.et||'',
    days: p.days, durationLabel: p.durationLabel||'',
    rental: p.base, dep: p.dep, total: p.base + (p.addOnsTotal||0),
    tax: p.tax||0, taxRate: p.taxRate||0.0885,
    addOns: p.addOns||[], addOnsTotal: p.addOnsTotal||0,
    grand: p.grand, load: r.ld, src: r.src, status: 'docs_pending',
    lockboxCode: _currentLockboxCode||null,
    nt: r.nt, at: new Date().toISOString(), breakdown: p.breakdown||[], type: p.type,
    paymentLinkUrl: null, paymentLinkId: null,
    depositIntentId: null, depositSessionId: null, depositSessionUrl: null, depositStatus: null,
    rentalPaid: false, depositHeld: false, docsVerified: false,
    packageSentAt: new Date().toISOString(), confirmedAt: null
  };
  state.rentals.push(bk);
  state.booking.id = bk.id;
  t.status = 'rented'; t.renter = c.fn + ' ' + c.ln; t.returnDate = r.ed;
  save(); clearDraft(); buildMessages(bk, t); updateStats();
  addAct('Package sent: ' + c.fn + ' ' + c.ln + ' — ' + t.name, 'orange');
  if (window._pendingBookingNotifKey) {
    var pnk = window._pendingBookingNotifKey; window._pendingBookingNotifKey = null;
    markHandled(pnk.key, pnk.id);
  }
  setGate(0,'active','Verify docs to proceed');
  setGate(1,'locked','Locked — verify docs first');
  setGate(2,'locked','Locked — confirm payment first');
  setGate(3,'locked','Locked — send access info first');
  setGate(4,'locked','Send day before return');
  showToast('Package sent — booking saved');
  goStep(4, true);
}

function updateGate0Vh() {
  var el = g('gate0-vh'); if (!el) return;
  var bk = findBookingById(state.booking.id); if (!bk) return;
  bk.c.vh = el.value; save();
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
    startTime: r.st||'', endTime: r.et||'',
    days: p.days, durationLabel: p.durationLabel||'',
    rental: p.base, dep: p.dep, total: p.base + (p.addOnsTotal||0),
    tax: p.tax||0, taxRate: p.taxRate||0.0885,
    addOns: p.addOns||[], addOnsTotal: p.addOnsTotal||0,
    grand: p.grand, load: r.ld, src: r.src, status: 'docs_pending',
    nt: r.nt, at: new Date().toISOString(), breakdown: p.breakdown||[], type: p.type,
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
    var bk = findBookingById(state.booking.id);
    if (bk) { bk.packageSentAt = new Date().toISOString(); bk.status = 'docs_pending'; save(); }
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
    var bk = findBookingById(state.booking.id);
    if (bk) drawGate2(bk);
    addAct('Rental agreement signed', 'green');
  } else {
    setGate(1, 'active', 'Awaiting signature');
    setGate(2, 'locked', 'Locked — sign agreement first');
  }
}

function onPaymentConfirmed() {
  var bk = findBookingById(state.booking.id); if (!bk) return;
  if (!bk.paymentLinkUrl || !bk.depositIntentId) { alert('Generate both payment links first.'); return; }
  setGate(2, 'done', 'Payment received');
  setGate(3, 'active', 'Send pickup instructions');
  setGate(4, 'active', 'Send day before return');
  g('gate3').style.pointerEvents = '';
  g('gate4').style.pointerEvents = '';
  bk.rentalPaid = true; bk.depositHeld = true; bk.depositStatus = 'held';
  bk.status = 'confirmed'; bk.confirmedAt = new Date().toISOString();
  save();
  addAct('Payment confirmed for ' + (state.booking.customer ? state.booking.customer.fn : 'customer'), 'green');
}

// ── GATE FUNCTIONS ────────────────────────────────────

function drawGate0(bk) {
  var div = g('gate0-body'); if (!div || !bk) return;
  var c = bk.c;
  div.innerHTML =
    '<div class="cpanel" style="margin-bottom:14px;"><h4>Booking</h4>' +
      '<div class="crow"><span class="cl">Customer</span><span class="cv">' + escHtml(c.fn + ' ' + c.ln) + '</span></div>' +
      '<div class="crow"><span class="cl">Trailer</span><span class="cv">' + escHtml(bk.trailer) + '</span></div>' +
      '<div class="crow"><span class="cl">Pickup</span><span class="cv">' + bk.sd + (bk.startTime?' at '+bk.startTime:'') + '</span></div>' +
      '<div class="crow"><span class="cl">Return</span><span class="cv">' + bk.ed + (bk.endTime?' at '+bk.endTime:'') + '</span></div>' +
    '</div>' +
    '<div class="fg"><label class="fl">Tow Vehicle (confirm or update if changed)</label>' +
    '<input class="fi" id="gate0-vh" type="text" value="' + escHtml(c.vh||'') + '" placeholder="Year Make Model" oninput="updateGate0Vh()"></div>' +
    '<div style="margin-bottom:14px;">' +
      '<label style="display:flex;gap:10px;align-items:center;margin-bottom:10px;cursor:pointer;"><input type="checkbox" id="doc-chk1" style="accent-color:var(--primary);width:16px;height:16px;flex-shrink:0;" onchange="updateDocsBtn()"><span style="font-size:14px;">Driver\'s license photo received</span></label>' +
      '<label style="display:flex;gap:10px;align-items:center;margin-bottom:10px;cursor:pointer;"><input type="checkbox" id="doc-chk2" style="accent-color:var(--primary);width:16px;height:16px;flex-shrink:0;" onchange="updateDocsBtn()"><span style="font-size:14px;">Vehicle insurance card received</span></label>' +
      '<label style="display:flex;gap:10px;align-items:center;margin-bottom:10px;cursor:pointer;"><input type="checkbox" id="doc-chk3" style="accent-color:var(--primary);width:16px;height:16px;flex-shrink:0;" onchange="updateDocsBtn()"><span style="font-size:14px;">Tow vehicle confirmed</span></label>' +
      '<label style="display:flex;gap:10px;align-items:center;cursor:pointer;"><input type="checkbox" id="doc-chk4" style="accent-color:var(--primary);width:16px;height:16px;flex-shrink:0;" onchange="updateDocsBtn()"><span style="font-size:14px;">Quote reviewed and accepted by client</span></label>' +
    '</div>' +
    '<div class="fg"><label class="fl">Notes</label>' +
    '<textarea class="form-textarea" id="gate0-notes" placeholder="Unusual circumstances, updated vehicle, etc.">' + escHtml(bk.docsNotes||'') + '</textarea></div>' +
    '<button class="btn btn-success" id="docs-verified-btn" onclick="docsVerified()" style="width:100%;" disabled>✓ Docs Verified — Proceed to Payment</button>';
}

function updateDocsBtn() {
  var btn = g('docs-verified-btn'); if (!btn) return;
  btn.disabled = !['doc-chk1','doc-chk2','doc-chk3','doc-chk4'].every(function(id){ var el=g(id); return el&&el.checked; });
}

function docsVerified() {
  var bk = findBookingById(state.booking.id); if (!bk) return;
  if (!['doc-chk1','doc-chk2','doc-chk3','doc-chk4'].every(function(id){ var el=g(id); return el&&el.checked; })) { alert('Complete all checklist items first.'); return; }
  var notesEl = g('gate0-notes'); if (notesEl) bk.docsNotes = notesEl.value;
  bk.docsVerified = true; bk.status = 'payment_pending'; save();
  setGate(0,'done','Docs verified');
  setGate(1,'active','Generate payment link');
  addAct('Docs verified: ' + bk.c.fn + ' ' + bk.c.ln, 'green');
  drawGate1(bk);
  showToast('Docs verified — proceed to payment');
}

function drawGate1(bk) {
  var div = g('gate1-body'); if (!div || !bk) return;
  var total = bk.grand;
  if (bk.paymentLinkUrl) {
    var sendBtn1 = bk.c.contactPref==='email'
      ? '<button class="btn btn-ghost btn-sm" onclick="sendGate1Link()">📧 Send via Email</button>'
      : '<button class="btn btn-ghost btn-sm" onclick="sendGate1Link()">📱 Open SMS</button><button class="btn btn-ghost btn-sm" onclick="openCorporatePhone()">📞 Open Corporate Phone</button>';
    div.innerHTML =
      '<div class="stripe-section"><div class="stripe-section-label">💰 Total — ' + fmtMoney(total) + '</div>' +
        '<input class="stripe-link-input" type="text" readonly value="' + escHtml(bk.paymentLinkUrl) + '">' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px;">' +
          '<button class="btn btn-primary btn-sm" onclick="copyGate1Link()">📋 Copy Link</button>' + sendBtn1 +
        '</div><div class="stripe-sent">✓ Payment link generated</div></div>' +
      '<button class="btn btn-success" onclick="confirmPaymentReceived()" style="width:100%;margin-top:12px;">✓ Mark Payment Received</button>';
  } else {
    var rentalAmt = bk.rental + (bk.addOnsTotal||0) + (bk.tax||0);
    div.innerHTML =
      '<div class="stripe-section"><div class="stripe-section-label">💰 Total — ' + fmtMoney(total) + '</div>' +
        '<div style="font-size:12px;color:var(--muted);margin-bottom:10px;">Rental: ' + fmtMoney(rentalAmt) + ' + Deposit: ' + fmtMoney(bk.dep) + '</div>' +
        '<button class="btn btn-primary" id="gen-single-pay-btn" onclick="generateSinglePaymentLink()" style="width:100%;">🔗 Generate Payment Link</button></div>' +
      '<button class="btn btn-success" onclick="confirmPaymentReceived()" style="width:100%;margin-top:12px;" disabled>✓ Mark Payment Received</button>';
  }
}

async function generateSinglePaymentLink() {
  var bk = findBookingById(state.booking.id); if (!bk) return;
  var btn = g('gen-single-pay-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Generating...'; }
  try {
    var res = await fetch('/stripe/checkout-session', {method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({bookingId:bk.id, rentalAmount:bk.rental, addOnsTotal:bk.addOnsTotal||0, tax:bk.tax||0, dep:bk.dep, addOns:bk.addOns||[], trailerName:bk.trailer, firstName:bk.c.fn})});
    var data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || 'Request failed');
    bk.paymentLinkUrl = data.url; bk.checkoutSessionId = data.sessionId; save();
    drawGate1(bk);
  } catch(e) { alert('Error: ' + e.message); if (btn) { btn.disabled=false; btn.textContent='🔗 Generate Payment Link'; } }
}

function copyGate1Link() {
  var bk = findBookingById(state.booking.id); if (!bk||!bk.paymentLinkUrl) return;
  if (navigator.clipboard) navigator.clipboard.writeText(bk.paymentLinkUrl).catch(function(){});
  showToast('Payment link copied!');
}

async function sendGate1Link() {
  var bk = findBookingById(state.booking.id); if (!bk||!bk.paymentLinkUrl) return;
  var body = await getTemplateBody('payment-link');
  var msg = addTokens(body, {
    firstName: bk.c.fn,
    paymentUrl: bk.paymentLinkUrl,
    total: bk.grand ? ('' + bk.grand) : '',
    deposit: '' + bk.dep,
    businessPhone: globalVars.businessPhone || '(405) 393-4161',
    businessName: globalVars.businessName || 'Iron G Equipment Co.'
  });
  if (bk.c.contactPref==='email') {
    window.location.href = 'mailto:' + encodeURIComponent(bk.c.em) + '?subject=' + encodeURIComponent('Iron G Payment Link') + '&body=' + encodeURIComponent(msg);
  } else {
    window.location.href = 'sms:' + bk.c.ph.replace(/\D/g,'') + '?body=' + encodeURIComponent(msg);
  }
}

async function confirmPaymentReceived() {
  var bk = findBookingById(state.booking.id); if (!bk) return;
  if (!bk.paymentLinkUrl) { alert('Generate payment link first.'); return; }
  if (!confirm('Confirm full payment of ' + fmtMoney(bk.grand) + ' received?')) return;
  bk.rentalPaid = true; bk.depositHeld = true; bk.depositStatus = 'held';
  bk.status = 'confirmed'; save();
  setGate(1,'done','Payment received');
  setGate(2,'active','Send access info');
  var g1div = g('gate1-body');
  if (g1div) {
    g1div.innerHTML =
      '<div style="color:var(--success);font-size:13px;margin-bottom:10px;">✓ Payment received — ' + fmtMoney(bk.grand) + '</div>' +
      '<div id="gate1-pi-status" style="font-size:12px;color:var(--muted);margin-bottom:10px;">Retrieving payment details...</div>';
  }
  addAct('Payment confirmed: ' + bk.c.fn + ' ' + bk.c.ln, 'green');
  drawGate2(bk);
  showToast('Payment confirmed — proceed to confirmation');
  var attempts = 0;
  var pollTimer = setInterval(async function() {
    attempts++;
    try {
      var res = await fetch('/booking/' + bk.id + '/payment-intent');
      var data = await res.json();
      if (data.paymentIntentId) {
        clearInterval(pollTimer);
        bk.paymentIntentId = data.paymentIntentId; save();
        var statusEl = g('gate1-pi-status');
        if (statusEl) statusEl.innerHTML = '<span style="color:var(--success);">✓ Payment verified</span>';
        return;
      }
    } catch(e) {}
    if (attempts >= 5) {
      clearInterval(pollTimer);
      var statusEl = g('gate1-pi-status');
      if (statusEl) {
        statusEl.innerHTML =
          '<div style="font-size:12px;color:var(--muted);margin-bottom:8px;">Payment Intent ID not found automatically. Find this in your Stripe dashboard under Payments.</div>' +
          '<div class="fg"><label class="fl">Payment Intent ID (for refunds)</label>' +
          '<input class="fi" id="gate1-pi-id" type="text" placeholder="pi_..." value="' + escHtml(bk.paymentIntentId||'') + '" oninput="savePaymentIntentId()"></div>' +
          '<button class="btn btn-ghost btn-sm" style="margin-top:8px;" onclick="skipPaymentIntent()">Skip for now</button>';
      }
    }
  }, 3000);
}

function skipPaymentIntent() {
  var el = g('gate1-pi-status'); if (el) el.style.display = 'none';
}

async function drawGate2(bk) {
  var div = g('gate2-body'); if (!div || !bk) return;
  var gateCode = null;
  try { gateCode = await idbGet('gateCode'); } catch(e) {}
  var lockCode = bk.lockboxCode || null;
  var sendBtn2 = bk.c.contactPref==='email'
    ? '<button class="btn btn-ghost btn-sm" onclick="sendAccessInfo()">📧 Send via Email</button>'
    : '<button class="btn btn-ghost btn-sm" onclick="sendAccessInfo()">📱 Open SMS</button><button class="btn btn-ghost btn-sm" onclick="openCorporatePhone()">📞 Open Corporate Phone</button>';
  div.innerHTML =
    '<div class="cpanel" style="margin-bottom:14px;"><h4>Access Codes</h4>' +
      '<div class="crow"><span class="cl">Gate Code</span><span class="cv o" style="font-family:Oswald,sans-serif;letter-spacing:3px;">' + escHtml(gateCode||'Set gate code in Settings') + '</span></div>' +
      '<div class="crow"><span class="cl">Lockbox Code</span><span class="cv o" style="font-family:Oswald,sans-serif;letter-spacing:3px;">' + escHtml(lockCode||'No lockbox code on file') + '</span></div>' +
    '</div>' +
    '<div class="msg-text" id="gate2-msg" style="background:#111;border:1px solid #2a2a2a;border-radius:4px;padding:14px;margin-bottom:12px;"></div>' +
    '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;">' +
      '<button class="btn btn-primary btn-sm" onclick="copyGate2Msg()">📋 Copy</button>' + sendBtn2 +
    '</div>' +
    '<button class="btn btn-success" onclick="markConfirmedActive()" style="width:100%;">✓ Mark Confirmed &amp; Active</button>';
  var msgEl = g('gate2-msg');
  if (msgEl) buildAccessInfoMsg(bk, gateCode, lockCode).then(function(msg){ msgEl.textContent = msg; });
}

async function buildAccessInfoMsg(bk, gateCode, lockCode) {
  var c = bk.c;
  var body = await getTemplateBody('gate2-confirmation');
  var contactTarget = c.contactPref === 'email' ? c.em : c.ph;
  return addTokens(body, {
    firstName: c.fn,
    trailerName: bk.trailer,
    startDate: bk.sd,
    startTime: bk.startTime || '',
    endDate: bk.ed,
    endTime: bk.endTime || '',
    pickupAddress: globalVars.pickupAddress || 'Mother Road RV Boat & Trailer Storage, 16245 W HWY 66, Yukon, OK 73099',
    gateCode: gateCode || globalVars.gateCode || 'Set gate code in Settings',
    lockboxCode: lockCode || 'No lockbox code on file',
    contactInfo: contactTarget,
    businessPhone: globalVars.businessPhone || '(405) 393-4161',
    businessName: globalVars.businessName || 'Iron G Equipment Co.'
  });
}

function copyGate2Msg() {
  var el = g('gate2-msg'); if (!el) return;
  var text = el.textContent;
  function fb() { var ta=document.createElement('textarea'); ta.value=text; ta.style.position='fixed'; ta.style.opacity='0'; document.body.appendChild(ta); ta.focus(); ta.select(); try{document.execCommand('copy');}catch(e){} document.body.removeChild(ta); }
  if (navigator.clipboard) { navigator.clipboard.writeText(text).catch(fb); } else { fb(); }
  showToast('Message copied!');
}

function sendAccessInfo() {
  var bk = findBookingById(state.booking.id); if (!bk) return;
  var el = g('gate2-msg'); if (!el) return;
  var msg = el.textContent; var c = bk.c;
  if (c.contactPref==='email') {
    window.location.href = 'mailto:' + encodeURIComponent(c.em) + '?subject=' + encodeURIComponent('Iron G — Your Rental Confirmation') + '&body=' + encodeURIComponent(msg);
  } else {
    window.location.href = 'sms:' + c.ph.replace(/\D/g,'') + '?body=' + encodeURIComponent(msg);
  }
}

function markConfirmedActive() {
  var bk = findBookingById(state.booking.id); if (!bk) return;
  if (!confirm('Mark booking active for ' + bk.c.fn + ' ' + bk.c.ln + '?')) return;
  bk.status = 'active'; bk.confirmedAt = new Date().toISOString(); save();
  addAct('Booking active: ' + bk.c.fn + ' ' + bk.c.ln + ' — ' + bk.trailer, 'green');
  setGate(2,'done','Sent');
  updateStats(); drawDashboard();
  showToast('Booking active!');
  showPage('dashboard');
}

async function generatePaymentLink() {
  var bk = findBookingById(state.booking.id); if (!bk) return;
  var btn = g('gen-pay-link-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Generating...'; }
  try {
    var res = await fetch('/stripe/checkout-session', { method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({bookingId:bk.id, rentalAmount:bk.rental, addOnsTotal:bk.addOnsTotal||0, tax:bk.tax||0, dep:bk.dep, addOns:bk.addOns||[], trailerName:bk.trailer, firstName:bk.c.fn}) });
    var data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || 'Request failed');
    bk.paymentLinkUrl = data.url; bk.checkoutSessionId = data.sessionId; save(); drawGate2(bk);
  } catch(e) { alert('Error generating payment link: ' + e.message); if (btn) { btn.disabled=false; btn.textContent='🔗 Generate Rental Payment Link'; } }
}

async function generateDepositHold() {
  var bk = findBookingById(state.booking.id); if (!bk) return;
  var btn = g('gen-dep-link-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Generating...'; }
  try {
    var res = await fetch('/stripe/deposit-intent', { method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({amount:bk.dep, description:'Iron G deposit hold — '+bk.trailer, bookingId:bk.id}) });
    var data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || 'Request failed');
    bk.depositIntentId = data.paymentIntentId; bk.depositSessionId = data.sessionId;
    bk.depositSessionUrl = data.url; bk.depositStatus = 'pending'; save(); drawGate2(bk);
  } catch(e) { alert('Error generating deposit hold: ' + e.message); if (btn) { btn.disabled=false; btn.textContent='🔐 Generate Deposit Hold Link'; } }
}

function copyPayLink() {
  var bk = findBookingById(state.booking.id); if (!bk || !bk.paymentLinkUrl) return;
  if (navigator.clipboard) navigator.clipboard.writeText(bk.paymentLinkUrl).catch(function(){});
  showToast('Payment link copied!');
}
function textPayLink() {
  var bk = findBookingById(state.booking.id); if (!bk || !bk.paymentLinkUrl) return;
  window.location.href = 'sms:' + bk.c.ph.replace(/\D/g,'') + '?body=' + encodeURIComponent('Iron G — Rental payment link for your ' + bk.trailer + ':\n' + bk.paymentLinkUrl);
}
function copyDepLink() {
  var bk = findBookingById(state.booking.id); if (!bk || !bk.depositSessionUrl) return;
  if (navigator.clipboard) navigator.clipboard.writeText(bk.depositSessionUrl).catch(function(){});
  showToast('Deposit link copied!');
}
function textDepLink() {
  var bk = findBookingById(state.booking.id); if (!bk || !bk.depositSessionUrl) return;
  window.location.href = 'sms:' + bk.c.ph.replace(/\D/g,'') + '?body=' + encodeURIComponent('Iron G — Deposit authorization link ($' + bk.dep + ' hold — refundable on clean return):\n' + bk.depositSessionUrl);
}

function packageSent(msgId, action) {
  if (action === 'copy') copyEl(msgId); else openSMS(msgId);
  var chk = g('quoteSent');
  if (chk && !chk.checked) { chk.checked = true; onQuoteSent(); }
}

// ── DEPOSIT RELEASE / CAPTURE ────────────────────────
async function releaseDeposit(id) {
  var bk = findBookingById(id); if (!bk) return;
  if (!confirm('Release $' + bk.dep + ' deposit hold to ' + bk.c.fn + '?\n\nThe hold will drop from their card automatically.')) return;
  try {
    var res = await fetch('/stripe/deposit-cancel', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({paymentIntentId:bk.depositIntentId})});
    var data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || 'Request failed');
    bk.depositStatus = 'released'; bk.status = 'complete';
    state.rentals = state.rentals.filter(function(r){return r.id !== id;});
    state.done.push(bk); save(); updateStats(); drawActiveRentals(); drawDashboard();
    showToast('Deposit hold released ✓');
  } catch(e) { alert('Error releasing deposit: ' + e.message); }
}

async function captureDeposit(id) {
  var bk = findBookingById(id); if (!bk) return;
  if (!confirm('Capture $' + bk.dep + ' deposit from ' + bk.c.fn + '?\n\nThis charges their card immediately.\nThis cannot be undone.')) return;
  try {
    var res = await fetch('/stripe/deposit-capture', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({paymentIntentId:bk.depositIntentId})});
    var data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || 'Request failed');
    bk.depositStatus = 'captured'; bk.status = 'complete';
    state.rentals = state.rentals.filter(function(r){return r.id !== id;});
    state.done.push(bk); save(); updateStats(); drawActiveRentals(); drawDashboard();
    showToast('Deposit captured ✓');
  } catch(e) { alert('Error capturing deposit: ' + e.message); }
}

function resolveManually(id) {
  var bk = findBookingById(id); if (!bk) return;
  if (!confirm('Mark deposit as manually resolved for ' + bk.c.fn + '?')) return;
  bk.status = 'complete';
  state.rentals = state.rentals.filter(function(r){return r.id !== id;});
  state.done.push(bk); save(); updateStats(); drawActiveRentals(); drawDashboard();
  showToast('Booking marked complete ✓');
}

// ── DRAFT SYSTEM ─────────────────────────────────────

function loadAllDrafts(cb) {
  idbListPrefix('draft:', function(items) {
    var drafts = items.map(function(i){ return i.value; }).filter(Boolean);
    drafts.sort(function(a,b){ return new Date(b.updatedAt||0) - new Date(a.updatedAt||0); });
    cb(drafts);
  });
}

function saveDraft(step) {
  if (!_currentDraftId) return;
  var draft = {
    id: _currentDraftId,
    step: step,
    createdAt: _currentDraftCreatedAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    notificationId: window._pendingBookingNotifKey ? window._pendingBookingNotifKey.id : null,
    fields: {
      fn: gs('f-fn',''), ln: gs('f-ln',''), ph: gs('f-ph',''),
      em: gs('f-em',''), cy: gs('f-cy',''), vh: gs('f-vh',''),
      comm: commPref, contactPref: _contactPref,
      tr: g('f-tr') ? g('f-tr').value : '',
      sd: g('f-sd') ? g('f-sd').value : '',
      st: g('f-st') ? g('f-st').value : '',
      ed: g('f-ed') ? g('f-ed').value : '',
      et: g('f-et') ? g('f-et').value : '',
      dep: g('f-dep') ? g('f-dep').value : '',
      ld: gs('f-ld',''), src: g('f-src') ? g('f-src').value : '',
      nt: gs('f-nt',''), addOns: _customAddOns.slice()
    },
    pricing: state.booking.pricing || null
  };
  idbPut('draft:' + _currentDraftId, draft).catch(function(){});
}

function clearDraft() {
  if (_currentDraftId) idbDelete('draft:' + _currentDraftId).catch(function(){});
  _currentDraftId = null;
  _currentDraftCreatedAt = null;
}

function _resetForm() {
  state.booking = {};
  ['f-fn','f-ln','f-ph','f-em','f-cy','f-vh','f-ld','f-nt','f-dep'].forEach(function(id){ var el = g(id); if (el) el.value = ''; });
  ['f-tr','f-sd','f-st','f-ed','f-et','f-src'].forEach(function(id){ var el = g(id); if (el) el.value = ''; });
  ['chk1','chk2','chk3'].forEach(function(id){ var el = g(id); if (el) el.checked = false; });
  var cw = g('chk-warn'); if (cw) cw.style.display = 'none';
  // Reset contactPref toggle
  _contactPref = 'sms';
  var cpEls = document.querySelectorAll('#contactPrefToggle .comm-opt');
  cpEls.forEach(function(b){b.classList.remove('active');});
  if (cpEls[0]) cpEls[0].classList.add('active');
  // Reset comm toggle
  commPref = 'text';
  var commEls = document.querySelectorAll('#commToggle .comm-opt');
  commEls.forEach(function(b){b.classList.remove('active');});
  if (commEls[0]) commEls[0].classList.add('active');
  // Reset package action flag and lockbox cache
  _packageActionTaken = false;
  _currentLockboxCode = null;
  // Reset add-ons
  _customAddOns = [];
  document.querySelectorAll('.addon-chk').forEach(function(c){c.checked = false;});
  var cal = g('customAddOnsList'); if (cal) cal.innerHTML = '';
  var pc = g('priceCalc'); if (pc) pc.innerHTML = '<div style="color:var(--muted);font-size:13px;text-align:center;padding:20px;">Select trailer and dates</div>';
  _lastCalcTid = '';
  _lastAvailTid = '';
  _conflictCheckTid = '';
  _conflictRanges = null;
  _conflictFetching = false;
  var cb = g('avail-conflict-banner'); if (cb) cb.style.display = 'none';
  var nh = g('avail-next-helper'); if (nh) nh.style.display = 'none';
  var s2btn = g('step2-next-btn'); if (s2btn) s2btn.disabled = false;
  _highestStepReached = 1;
}

function _applyDraftToForm(draft) {
  _resetForm();
  var f = draft.fields || {};
  var set = function(id, val) { var el = g(id); if (el && val) el.value = val; };
  set('f-fn', f.fn); set('f-ln', f.ln); set('f-ph', f.ph);
  set('f-em', f.em); set('f-cy', f.cy); set('f-vh', f.vh);
  set('f-ld', f.ld); set('f-nt', f.nt);
  set('f-tr', f.tr); set('f-sd', f.sd); set('f-st', f.st); set('f-ed', f.ed); set('f-et', f.et);
  // Set deposit before calcPrice so _lastCalcTid sync works correctly
  if (f.dep) { var depEl = g('f-dep'); if (depEl) depEl.value = f.dep; }
  if (f.tr) {
    _lastCalcTid = f.tr; // prevent calcPrice from resetting custom dep
    _currentLockboxCode = null;
    idbGet('trailer:' + f.tr + ':lockboxCode').then(function(code){ _currentLockboxCode = code||null; }).catch(function(){});
  }
  if (f.src) {
    var srcEl = g('f-src');
    if (srcEl) for (var i = 0; i < srcEl.options.length; i++) {
      if (srcEl.options[i].value === f.src || srcEl.options[i].text === f.src) { srcEl.selectedIndex = i; break; }
    }
  }
  // Restore contactPref toggle
  _contactPref = f.contactPref || 'sms';
  var cpEls = document.querySelectorAll('#contactPrefToggle .comm-opt');
  cpEls.forEach(function(b){b.classList.remove('active');});
  if (cpEls[_contactPref === 'email' ? 1 : 0]) cpEls[_contactPref === 'email' ? 1 : 0].classList.add('active');
  // Restore comm toggle
  commPref = f.comm || 'text';
  var commEls = document.querySelectorAll('#commToggle .comm-opt');
  var commMap = {text:0, email:1, both:2};
  commEls.forEach(function(el){ el.classList.remove('active'); });
  var cIdx = commMap[commPref] !== undefined ? commMap[commPref] : 0;
  if (commEls[cIdx]) commEls[cIdx].classList.add('active');
  // Restore custom add-ons
  _customAddOns = (f.addOns && Array.isArray(f.addOns)) ? f.addOns.slice() : [];
  renderCustomAddOns();
  if (draft.pricing) state.booking.pricing = draft.pricing;
  var step = Math.min(draft.step || 1, 3);
  if (step >= 2) {
    state.booking.customer = {fn:f.fn, ln:f.ln, ph:f.ph, em:f.em, cy:f.cy, vh:f.vh, comm:f.comm||'text', contactPref:f.contactPref||'sms'};
  }
  if (step >= 3) {
    state.booking.rental = {tid:f.tr, sd:f.sd, st:f.st||'', ed:f.ed, et:f.et||'', ld:f.ld, src:f.src, nt:f.nt};
    if (f.tr && f.sd && f.ed) { calcPrice(); drawStep3(); }
  }
}

function startNewDraft(notifId) {
  loadAllDrafts(function(drafts) {
    if (drafts.length >= 10) {
      showToast('Maximum drafts reached. Complete or delete a draft first.');
      showPage('drafts'); return;
    }
    var now = new Date().toISOString();
    var newId = Date.now();
    _currentDraftId = newId;
    _currentDraftCreatedAt = now;
    _highestStepReached = 1;
    var draft = {
      id: newId, step: 1, createdAt: now, updatedAt: now,
      notificationId: notifId || null,
      fields: {fn:'',ln:'',ph:'',em:'',cy:'',vh:'',comm:'text',contactPref:'sms',tr:'',sd:'',st:'',ed:'',et:'',dep:'',ld:'',src:'',nt:'',addOns:[]},
      pricing: null
    };
    idbPut('draft:' + newId, draft).catch(function(){});
    _resetForm();
    showPage('new-booking');
    goStep(1, true);
  });
}

function resumeDraftById(id) {
  idbGet('draft:' + id).then(function(draft) {
    if (!draft) { showToast('Draft not found.'); return; }
    _currentDraftId = id;
    _currentDraftCreatedAt = draft.createdAt || new Date().toISOString();
    _highestStepReached = draft.step || 1;
    _applyDraftToForm(draft);
    if (draft.notificationId) {
      window._pendingBookingNotifKey = { key: 'submission:' + draft.notificationId, id: draft.notificationId };
    }
    showPage('new-booking');
    goStep(Math.min(draft.step || 1, 3), true);
  }).catch(function() { showToast('Error loading draft.'); });
}

function discardDraftById(id) {
  if (!confirm('Discard this draft?')) return;
  idbDelete('draft:' + id).then(function() {
    if (_currentDraftId === id) { _currentDraftId = null; _currentDraftCreatedAt = null; }
    drawDrafts();
  }).catch(function() { drawDrafts(); });
}

function newBooking() { startNewDraft(); }

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
  var vhLine = (c.vh || '').trim() || 'please confirm year/make/model';
  var daysDisp = bk.durationLabel || (Math.ceil(bk.days) + ' day' + (Math.ceil(bk.days)>1?'s':''));
  var packageMsg = 'Hi ' + c.fn + ' ' + c.ln + ', this is Frank with Iron G Equipment Co.\n' +
    'Your ' + bk.trailer + ' reservation for ' + sdFmt + ' through ' + edFmt + ' (' + daysDisp + ') is being processed.\n\n' +
    'TOTAL: $' + bk.rental + ' rental + $' + bk.dep + ' refundable deposit hold = $' + bk.grand + ' total\n\n' +
    'To confirm your reservation please:\n' +
    '1. Reply with a photo of your driver\'s license\n' +
    '2. Reply with a photo of your proof of auto insurance\n' +
    '3. Confirm your tow vehicle: ' + vhLine + '\n\n' +
    'Once received I\'ll send your payment links and you\'re all set.\n\n' +
    'Questions? Call/text ' + ph + '\n— Iron G Equipment Co.';
  var mq = g('msg-quote'); if (mq) mq.textContent = packageMsg;
  var g0vh = g('gate0-vh'); if (g0vh) g0vh.value = c.vh || '';
  var confText = '✅ ' + c.fn + ', payment confirmed! Here are your pickup details:\n\n🚛 ' + bk.trailer + '\n📍 ' + addr + '\n🔐 Combo lock code: ' + bk.combo + '\n   (Spin to your code, pull handle down to open)\n📅 Return by: ' + retDate + '\n\n' + tips + '\n\n📸 When returning: lock the coupler and text me a photo.\n\nQuestions? Call/text Frank: ' + phDot + '\n\nThanks for choosing Iron G! 🤙';
  var confEmail = 'Subject: Iron G Equipment Co. — Pickup Instructions #' + bk.id + '\n\nHi ' + c.fn + ',\n\nPayment received — you\'re all set! Here are your pickup details:\n\nTRAILER: ' + bk.trailer + '\nPICKUP: ' + addr + '\nCOMBO CODE: ' + bk.combo + '\n(Spin dials to ' + bk.combo + ', pull shackle down to open)\n\nRETURN DUE: ' + retDate + '\n\n' + tips + '\n\nRETURN INSTRUCTIONS:\n• Return to same storage space\n• Lock the coupler\n• Text a photo of locked coupler to ' + ph + '\n• Deposit released within 3 business days\n\nQuestions? ' + ph + ' | ' + em + '\n\nThank you!\nFrank Garza — Owner\n' + biz;
  var remText = 'Hey ' + c.fn + '! Quick reminder from Iron G — your trailer is due back TOMORROW.\n\n📍 Return to: ' + addr + '\n🔐 Lock the coupler and text me a return photo\n📅 Due: ' + retDate + '\n\nNeed more time? Text me ASAP.\n\n— Frank ' + phDot + ' · Iron G Equipment Co.';
  var mr = g('msg-reminder'); if (mr) mr.textContent = remText;
  var comm = c.comm || 'text';
  var commDisp = g('commDisplay'); if (commDisp) commDisp.textContent = comm==='text'?'📱 Text':comm==='email'?'📧 Email':'📱 Text + 📧 Email';
  var cm = g('confirmMsgs');
  if (cm) {
    var html = '';
    if (comm==='text'||comm==='both') html += '<div class="msg"><div class="msg-label">📱 Confirmation Text with Combo Code</div><div class="msg-text" id="msg-conf-txt">' + confText.replace(/</g,'&lt;') + '</div><div class="msg-actions"><button class="btn btn-primary btn-sm" onclick="copyEl(\'msg-conf-txt\')">📋 Copy Text</button><button class="btn btn-ghost btn-sm" onclick="openSMS(\'msg-conf-txt\')">📱 Open in Messages</button><button class="btn btn-ghost btn-sm" onclick="openCorporatePhone()">📞 Open Corporate Phone</button></div></div>';
    if (comm==='email'||comm==='both') html += '<div class="msg"><div class="msg-label">📧 Confirmation Email with Combo Code</div><div class="msg-text" id="msg-conf-em">' + confEmail.replace(/</g,'&lt;') + '</div><div class="msg-actions"><button class="btn btn-primary btn-sm" onclick="copyEl(\'msg-conf-em\')">📋 Copy Email</button></div></div>';
    cm.innerHTML = html;
  }
  var ap = g('agreementPreview'); if (ap) ap.innerHTML = makeAgrHTML(bk, biz, ph, em);
  drawGate0(bk);
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
    '<h3>2. Key Terms</h3>' +
    '<p><strong>2.1</strong> Valid drivers license and proof of towing insurance required at pickup.</p>' +
    '<p><strong>2.2</strong> Renter is solely responsible for ensuring their tow vehicle meets minimum towing requirements.</p>' +
    '<p><strong>2.3 Contactless Pickup.</strong> Renter acknowledges combo code was delivered via text/email and accepts full responsibility from code delivery until return photo received by Iron G Equipment Co. LLC.</p>' +
    '<p><strong>2.4 Return.</strong> Return to storage by due date, lock coupler, text photo to ' + ph + '. Late returns charged at daily rate.</p>' +
    '<p><strong>2.5</strong> Renter agrees not to exceed GVWR, not to sub-rent or loan the trailer, and to comply with all Oklahoma towing laws.</p>' +
    '<p><strong>2.6</strong> Renter responsible for all damage beyond normal wear. Security deposit applied toward repair costs. If repairs exceed deposit, remaining balance charged to card on file.</p>' +
    '<p><strong>2.7</strong> Deposit released within 3 business days of satisfactory return. Trailer equipped with GPS tracking.</p>' +
    '<p><strong>2.8</strong> This agreement is governed by the laws of the State of Oklahoma.</p>' +
    '<h3>3. Signatures</h3>' +
    '<p>Renter Signature: _____________________________ &nbsp; Date: ____________</p>' +
    '<p style="margin-top:14px;">' + biz + ' — Frank Garza, Owner &nbsp; Date: ____________</p>' +
    '<div style="margin-top:12px;font-size:10px;color:#aaa;text-align:center;">' + biz + ' · Yukon, OK · ' + ph + ' · ' + em + '</div>';
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

function escHtml(s) { return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function showToast(msg) {
  var t = g('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
  t.textContent = msg; t.className = 'toast-visible';
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(function(){ t.className = ''; }, 2500);
}

function saveSettings() {
  state.settings = {
    biz:gs('s-biz','Iron G Equipment Co. LLC'), own:gs('s-own','Frank Garza'),
    ph:gs('s-ph','(405) 393-4161'), em:gs('s-em','info@irongequipment.com'),
    addr:gs('s-addr','16245 W HWY 66, Yukon OK 73099'),
    ca:gs('s-ca',''), vm:gs('s-vm',''), sq:gs('s-sq','')
  };
  save(); addAct('Settings saved','green'); alert('Settings saved!');
}

function resetData() {
  if (!confirm('Remove ALL data including bookings, rentals, history, and settings?\n\nThis cannot be undone.')) return;
  try { localStorage.removeItem(LS_KEY); } catch(e) {}
  idbClear().catch(function(){});
  state = defaultState(); save(); updateStats(); drawDashboard(); drawFleet();
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
  var input = document.createElement('input'); input.type = 'file'; input.accept = '.json';
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
      var usedKB = Math.round((est.usage||0)/1024); var quotaMB = Math.round((est.quota||0)/1024/1024);
      div.innerHTML = 'Data: ~' + Math.round(lsBytes/1024) + ' KB &nbsp;·&nbsp; Browser storage: ' + usedKB + ' KB / ' + quotaMB + ' MB quota';
    }).catch(function(){ div.innerHTML = '~' + Math.round(lsBytes/1024) + ' KB in localStorage'; });
  } else { div.innerHTML = '~' + Math.round(lsBytes/1024) + ' KB in localStorage'; }
}

// ── DRAW FUNCTIONS ───────────────────────────────────
async function drawFleet() {
  await loadTrailerNames();
  var fc = g('fleetCards');
  if (fc) {
    var h = '';
    state.fleet.forEach(function(t){
      var tName = _trailerNames[t.id] || t.name;
      h += '<div class="fleet-card ' + t.status + '">' +
        '<div id="fcname-' + t.id + '" class="fc-name-edit-row">' +
          '<div class="fc-name-display" id="fcname-disp-' + t.id + '" onclick="editTrailerName(\'' + t.id + '\')" style="cursor:pointer;" title="Tap to edit name">' + escHtml(tName) + '</div>' +
          '<span class="badge b-' + t.status + '">' + (t.status==='available'?'✓ Available':'⚡ Rented') + '</span>' +
        '</div>' +
        (t.status==='available'
          ? '<div style="margin-top:10px;"><button class="btn btn-primary btn-sm" onclick="startNewDraft()">+ Book This Trailer</button></div>'
          : '<div class="fc-renter">Rented to: <strong>' + t.renter + '</strong></div><div class="fc-renter">Due: <strong>' + t.returnDate + '</strong></div><div style="margin-top:10px;"><button class="btn btn-success btn-sm" onclick="markRetByTrailer(\'' + t.id + '\')">✓ Mark Returned</button></div>'
        ) +
        '<div id="lbx-' + t.id + '" style="margin-top:14px;padding-top:14px;border-top:1px solid #1a1a1a;"><div class="fc-label" style="color:var(--muted);">Loading lockbox...</div></div>' +
        '<div id="avail-cal-' + t.id + '" style="margin-top:14px;padding-top:14px;border-top:1px solid #1a1a1a;"><div style="color:var(--muted);font-size:12px;">Loading availability...</div></div>' +
        '</div>';
    });
    fc.innerHTML = h;
    state.fleet.forEach(function(t){ drawLockboxSection(t.id); });
    state.fleet.forEach(function(t){ drawFleetAvailability(t.id); });
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

// ── LOCKBOX CODES ────────────────────────────────────
async function drawLockboxSection(tid) {
  var div = g('lbx-' + tid); if (!div) return;
  var code = null, log = [];
  try { code = await idbGet('trailer:' + tid + ':lockboxCode'); } catch(e) {}
  try { var l = await idbGet('trailer:' + tid + ':lockboxLog'); if (Array.isArray(l)) log = l; } catch(e) {}
  renderLockboxDisplay(tid, code, log, div);
}

function renderLockboxDisplay(tid, code, log, div) {
  if (!div) return;
  var lastChanged = (log && log.length)
    ? 'Last changed: ' + new Date(log[0].changedAt).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})
    : 'Never set';
  var codeDisp = code
    ? '<div class="fc-combo" style="margin:6px 0;">' + escHtml(String(code)) + '</div>'
    : '<div style="color:var(--muted);font-size:13px;font-style:italic;margin:6px 0;">No code set</div>';
  var histHtml = '';
  if (log && log.length) {
    var recent = log.slice(0, 5);
    histHtml = '<div id="lbx-hist-' + tid + '" style="display:none;margin-top:8px;">' +
      recent.map(function(e) {
        var d = new Date(e.changedAt);
        var ds = d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) + ' at ' + d.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'});
        return '<div style="font-size:11px;color:var(--muted);padding:3px 0;border-bottom:1px solid #1a1a1a;">' + escHtml(String(e.code)) + ' — changed ' + ds + '</div>';
      }).join('') +
    '</div>';
  }
  div.innerHTML =
    '<div class="fc-label">Lockbox Code</div>' +
    codeDisp +
    '<div style="font-size:11px;color:var(--muted);margin-bottom:10px;">' + lastChanged + '</div>' +
    '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
      '<button class="btn btn-ghost btn-sm" onclick="editLockbox(\'' + tid + '\')">✏️ Edit Code</button>' +
      (log && log.length ? '<button class="btn btn-ghost btn-sm" id="lbx-hist-btn-' + tid + '" onclick="toggleLockboxHistory(\'' + tid + '\')">View History</button>' : '') +
    '</div>' +
    histHtml;
}

function editLockbox(tid) {
  var div = g('lbx-' + tid); if (!div) return;
  div.innerHTML =
    '<div class="fc-label">Lockbox Code</div>' +
    '<input class="fi" id="lbx-inp-' + tid + '" type="text" maxlength="10" placeholder="Enter code" style="margin-bottom:8px;">' +
    '<div style="display:flex;gap:8px;">' +
      '<button class="btn btn-primary btn-sm" onclick="saveLockboxCode(\'' + tid + '\')">Save</button>' +
      '<button class="btn btn-ghost btn-sm" onclick="cancelLockboxEdit(\'' + tid + '\')">Cancel</button>' +
    '</div>';
  var inp = g('lbx-inp-' + tid); if (inp) inp.focus();
}

async function saveLockboxCode(tid) {
  var inp = g('lbx-inp-' + tid); if (!inp) return;
  var newCode = inp.value.trim();
  if (!newCode) { alert('Enter a code.'); return; }
  var log = [];
  try { var l = await idbGet('trailer:' + tid + ':lockboxLog'); if (Array.isArray(l)) log = l; } catch(e) {}
  log.unshift({code: newCode, changedAt: Date.now()});
  if (log.length > 10) log = log.slice(0, 10);
  await idbPut('trailer:' + tid + ':lockboxCode', newCode).catch(function(){});
  await idbPut('trailer:' + tid + ':lockboxLog', log).catch(function(){});
  var div = g('lbx-' + tid);
  renderLockboxDisplay(tid, newCode, log, div);
  showToast('Lockbox code updated');
}

async function cancelLockboxEdit(tid) {
  var div = g('lbx-' + tid); if (!div) return;
  var code = null, log = [];
  try { code = await idbGet('trailer:' + tid + ':lockboxCode'); } catch(e) {}
  try { var l = await idbGet('trailer:' + tid + ':lockboxLog'); if (Array.isArray(l)) log = l; } catch(e) {}
  renderLockboxDisplay(tid, code, log, div);
}

function toggleLockboxHistory(tid) {
  var el = g('lbx-hist-' + tid); if (!el) return;
  var btn = g('lbx-hist-btn-' + tid);
  var open = el.style.display !== 'none';
  el.style.display = open ? 'none' : 'block';
  if (btn) btn.textContent = open ? 'View History' : 'Hide History';
}

function drawActiveRentals() {
  var container = g('activeBody'); if (!container) return;
  if (!state.rentals.length) {
    container.innerHTML = '<div style="text-align:center;color:var(--muted);padding:40px 20px;font-size:14px;">No active rentals.<br><br><button class="btn btn-primary" onclick="startNewDraft()">+ New Booking</button></div>';
    return;
  }
  var statusLabels = {
    'docs_pending':{cls:'b-pending',text:'DOCS PENDING'}, 'payment_pending':{cls:'b-rented',text:'PAYMENT PENDING'},
    'confirmed':{cls:'b-available',text:'CONFIRMED'}, 'active':{cls:'b-rented',text:'OUT'},
    'returned':{cls:'b-returned',text:'RETURNED'}, 'cancelled':{cls:'b-overdue',text:'CANCELLED'}
  };
  var h = '<div style="font-family:Oswald,sans-serif;font-size:11px;color:var(--muted);letter-spacing:2px;text-transform:uppercase;margin-bottom:10px;">' + state.rentals.length + ' booking' + (state.rentals.length>1?'s':'') + '</div>';
  state.rentals.forEach(function(r){
    var sl = statusLabels[r.status] || {cls:'b-pending', text:(r.status||'IN PROGRESS').toUpperCase()};
    var dl = Math.ceil((new Date(r.ed+'T12:00:00')-new Date())/86400000);
    h += '<div class="rental-card">' +
      '<div class="rental-card-header"><div><div class="rental-name">' + escHtml(r.c.fn) + ' ' + escHtml(r.c.ln) + '</div><div class="rental-phone">' + escHtml(r.c.ph) + '</div></div>' +
      '<span class="badge ' + sl.cls + '">' + sl.text + '</span></div>' +
      '<div class="rental-field"><span class="rental-label">Trailer</span><span class="rental-value">' + escHtml(r.trailer) + '</span></div>' +
      '<div class="rental-field"><span class="rental-label">Dates</span><span class="rental-value">' + r.sd + ' → ' + r.ed + '</span></div>';
    if (r.status === 'active') {
      var bc = dl<=0?'b-overdue':dl===1?'b-pending':'b-available';
      var bt = dl<=0?'OVERDUE':dl===1?'DUE TOMORROW':r.days+'-DAY RENTAL';
      var isDueToday = (r.ed === new Date().toISOString().split('T')[0]);
      h += '<div class="rental-field"><span class="rental-label">Return</span><span class="rental-value"><span class="badge ' + bc + '">' + bt + '</span></span></div>';
      h += '<div class="rental-field"><span class="rental-label">Combo</span><span class="rental-value accent">' + r.combo + '</span></div>';
      h += '<div class="rental-field"><span class="rental-label">Amount</span><span class="rental-value">$' + r.total + ' <span style="color:var(--muted);font-weight:400;">+$' + r.dep + ' dep</span></span></div>';
      if (r.reminderSentAt) {
        h += '<div style="font-size:11px;color:var(--success);padding:4px 0;">✓ Reminder sent ' + new Date(r.reminderSentAt).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}) + '</div>';
      }
      h += '<div id="reminder-panel-' + r.id + '" style="display:none;margin-top:10px;background:#111;border:1px solid #2a2a2a;border-radius:4px;padding:12px;">' +
        '<div class="msg-text" id="reminder-msg-' + r.id + '" style="margin-bottom:10px;font-size:12px;"></div>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
          '<button class="btn btn-primary btn-sm" onclick="copyReminderMsg(' + r.id + ')">📋 Copy</button>' +
          (r.c.contactPref==='email'
            ? '<button class="btn btn-ghost btn-sm" onclick="sendReminderMsg(' + r.id + ')">📧 Send Email</button>'
            : '<button class="btn btn-ghost btn-sm" onclick="sendReminderMsg(' + r.id + ')">📱 Send SMS</button>') +
        '</div></div>';
      h += '<div class="rental-actions">' +
        '<button class="btn btn-ghost btn-sm" onclick="toggleReminderPanel(' + r.id + ')" style="' + (isDueToday?'border-color:var(--warning);color:var(--warning);':'') + '">📨 Reminder</button>' +
        '<button class="btn btn-primary btn-sm" onclick="goToProcessReturn(' + r.id + ')">📋 Process Return</button>' +
      '</div>';
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
      h += '<div class="rental-field"><span class="rental-label">Amount</span><span class="rental-value">$' + r.total + ' <span style="color:var(--muted);font-weight:400;">+$' + r.dep + ' dep</span></span></div>';
    }
    h += '<div style="margin-top:10px;padding-top:10px;border-top:1px solid #1a1a1a;display:flex;justify-content:space-between;align-items:center;">' +
      '<span style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;font-family:Oswald,sans-serif;">Documents</span>' +
      '<button class="btn btn-ghost btn-sm" onclick="toggleBookingDocs(' + r.id + ')">📄 Docs</button>' +
    '</div>' +
    '<div id="booking-docs-' + r.id + '" style="display:none;margin-top:8px;"></div>';
    h += '</div>';
  });
  container.innerHTML = h;
}

// ── RETURN REMINDER ──────────────────────────────────
function goToProcessReturn(id) {
  _processReturnId = id;
  showPage('process-return');
}

function toggleReminderPanel(id) {
  var panel = g('reminder-panel-' + id); if (!panel) return;
  var bk = findBookingById(id); if (!bk) return;
  if (panel.style.display !== 'none') { panel.style.display = 'none'; return; }
  var msgEl = g('reminder-msg-' + id);
  panel.style.display = '';
  buildReminderMsg(bk).then(function(msg){ if (msgEl) msgEl.textContent = msg; });
}

async function buildReminderMsg(bk) {
  var c = bk.c;
  var body = await getTemplateBody('return-reminder');
  var contactTarget = c.contactPref === 'email' ? c.em : c.ph;
  var endDateFmt = new Date(bk.ed+'T12:00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});
  var endTimeFmt = bk.endTime ? new Date('2000-01-01T'+bk.endTime).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}) : '';
  return addTokens(body, {
    firstName: c.fn,
    endDate: endDateFmt,
    endTime: endTimeFmt,
    pickupAddress: globalVars.pickupAddress || 'Mother Road RV Boat & Trailer Storage, 16245 W HWY 66, Yukon, OK 73099',
    gateCode: globalVars.gateCode || '',
    contactInfo: contactTarget,
    businessPhone: globalVars.businessPhone || '(405) 393-4161',
    businessName: globalVars.businessName || 'Iron G Equipment Co.'
  });
}

function copyReminderMsg(id) {
  var el = g('reminder-msg-' + id); if (!el) return;
  var text = el.textContent;
  function fb() { var ta=document.createElement('textarea'); ta.value=text; ta.style.position='fixed'; ta.style.opacity='0'; document.body.appendChild(ta); ta.focus(); ta.select(); try{document.execCommand('copy');}catch(e){} document.body.removeChild(ta); }
  if (navigator.clipboard) { navigator.clipboard.writeText(text).catch(fb); } else { fb(); }
  markReminderSent(id);
  showToast('Reminder copied!');
}

function sendReminderMsg(id) {
  var bk = findBookingById(id); if (!bk) return;
  var el = g('reminder-msg-' + id); if (!el) return;
  var msg = el.textContent;
  if (bk.c.contactPref==='email') {
    window.location.href = 'mailto:' + encodeURIComponent(bk.c.em) + '?subject=' + encodeURIComponent('Trailer Return Reminder') + '&body=' + encodeURIComponent(msg);
  } else {
    window.location.href = 'sms:' + bk.c.ph.replace(/\D/g,'') + '?body=' + encodeURIComponent(msg);
  }
  markReminderSent(id);
}

function markReminderSent(id) {
  var bk = findBookingById(id); if (!bk) return;
  bk.reminderSentAt = new Date().toISOString(); save();
}

function savePaymentIntentId() {
  var el = g('gate1-pi-id'); if (!el) return;
  var bk = findBookingById(state.booking.id); if (!bk) return;
  bk.paymentIntentId = el.value.trim(); save();
}

// ── PROCESS RETURN ────────────────────────────────────
function drawProcessReturn(id) {
  var container = g('processReturnBody'); if (!container) return;
  var bk = findBookingById(id);
  if (!bk) { container.innerHTML = '<div style="color:var(--muted);text-align:center;padding:40px;">Booking not found.</div>'; return; }
  var today = new Date();
  var todayStr = today.toISOString().split('T')[0];
  var nowTime = today.getHours().toString().padStart(2,'0') + ':' + today.getMinutes().toString().padStart(2,'0');
  var endTimeFmt = bk.endTime ? new Date('2000-01-01T'+bk.endTime).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}) : '';

  container.innerHTML =
    '<div class="card"><div class="card-header"><div class="card-title">' + escHtml(bk.c.fn+' '+bk.c.ln) + ' — Return</div></div>' +
      '<div class="card-body">' +
        '<div class="crow"><span class="cl">Trailer</span><span class="cv">' + escHtml(bk.trailer) + '</span></div>' +
        '<div class="crow"><span class="cl">Booked Return</span><span class="cv">' + bk.ed + (endTimeFmt?' at '+endTimeFmt:'') + '</span></div>' +
      '</div></div>' +

    '<div class="card"><div class="card-header"><div class="card-title">Section 1 — Return Details</div></div><div class="card-body">' +
      '<div class="fr">' +
        '<div class="fg"><label class="fl">Actual Return Date</label><input class="fi" id="ret-date" type="date" value="' + todayStr + '" oninput="updateReturnDiff()"></div>' +
        '<div class="fg"><label class="fl">Actual Return Time</label><input class="fi" id="ret-time" type="time" value="' + nowTime + '" oninput="updateReturnDiff()"></div>' +
      '</div>' +
      '<div id="ret-diff-display" style="margin-bottom:14px;"></div>' +
      '<div id="early-refund-section" style="display:none;">' +
        '<div class="fg"><label class="fl">Early Return Refund</label>' +
          '<label style="display:flex;gap:8px;align-items:center;margin-bottom:8px;cursor:pointer;"><input type="radio" name="early-refund" value="full" onchange="updateEarlyRefundOptions()"><span id="early-full-label">Full refund of difference</span></label>' +
          '<label style="display:flex;gap:8px;align-items:center;margin-bottom:8px;cursor:pointer;"><input type="radio" name="early-refund" value="partial" onchange="updateEarlyRefundOptions()"><span>Partial refund</span></label>' +
          '<div id="early-partial-input" style="display:none;margin-bottom:8px;padding-left:22px;"><input class="fi" id="early-partial-amt" type="number" min="0" step="0.01" placeholder="Amount ($)" oninput="updateReturnSummary()"></div>' +
          '<label style="display:flex;gap:8px;align-items:center;cursor:pointer;"><input type="radio" name="early-refund" value="none" checked onchange="updateEarlyRefundOptions()"><span>No refund</span></label>' +
        '</div>' +
      '</div>' +
      '<div class="fg"><label style="display:flex;gap:10px;align-items:center;cursor:pointer;">' +
        '<input type="checkbox" id="add-charge-toggle" style="accent-color:var(--primary);width:16px;height:16px;" onchange="updateAdditionalCharge()">' +
        '<span style="font-size:14px;">Add additional charge?</span></label>' +
        '<div id="add-charge-inputs" style="display:none;margin-top:10px;">' +
          '<div class="fr"><div class="fg"><label class="fl">Charge Label</label><input class="fi" id="add-charge-label" type="text" placeholder="Cleaning fee, damage..." oninput="updateReturnSummary()"></div>' +
          '<div class="fg"><label class="fl">Amount ($)</label><input class="fi" id="add-charge-amount" type="number" min="0" step="0.01" placeholder="0" oninput="updateReturnSummary()"></div></div>' +
        '</div>' +
      '</div>' +
    '</div></div>' +

    '<div class="card"><div class="card-header"><div class="card-title">Section 2 — Return Documentation</div></div><div class="card-body">' +
      '<div style="font-size:12px;color:var(--muted);margin-bottom:12px;">Confirm all return media received</div>' +
      '<label style="display:flex;gap:10px;align-items:center;margin-bottom:10px;cursor:pointer;"><input type="checkbox" id="ret-chk1" style="accent-color:var(--primary);width:16px;height:16px;" onchange="updateCompleteReturnBtn()"><span style="font-size:14px;">Photo — Front</span></label>' +
      '<label style="display:flex;gap:10px;align-items:center;margin-bottom:10px;cursor:pointer;"><input type="checkbox" id="ret-chk2" style="accent-color:var(--primary);width:16px;height:16px;" onchange="updateCompleteReturnBtn()"><span style="font-size:14px;">Photo — Rear</span></label>' +
      '<label style="display:flex;gap:10px;align-items:center;margin-bottom:10px;cursor:pointer;"><input type="checkbox" id="ret-chk3" style="accent-color:var(--primary);width:16px;height:16px;" onchange="updateCompleteReturnBtn()"><span style="font-size:14px;">Photo — Driver side</span></label>' +
      '<label style="display:flex;gap:10px;align-items:center;margin-bottom:10px;cursor:pointer;"><input type="checkbox" id="ret-chk4" style="accent-color:var(--primary);width:16px;height:16px;" onchange="updateCompleteReturnBtn()"><span style="font-size:14px;">Photo — Passenger side</span></label>' +
      '<label style="display:flex;gap:10px;align-items:center;margin-bottom:10px;cursor:pointer;"><input type="checkbox" id="ret-chk5" style="accent-color:var(--primary);width:16px;height:16px;" onchange="updateCompleteReturnBtn()"><span style="font-size:14px;">Walk-around video</span></label>' +
      '<label style="display:flex;gap:10px;align-items:center;cursor:pointer;"><input type="checkbox" id="damage-toggle" style="accent-color:var(--danger);width:16px;height:16px;" onchange="updateDamageSection()"><span style="font-size:14px;color:var(--danger);">Damage noted?</span></label>' +
      '<div id="damage-section" style="display:none;margin-top:12px;">' +
        '<div class="fg"><label class="fl">Damage Description *</label><textarea class="form-textarea" id="damage-desc" placeholder="Describe damage..." oninput="updateCompleteReturnBtn()"></textarea></div>' +
        '<label style="display:flex;gap:10px;align-items:center;cursor:pointer;"><input type="checkbox" id="ret-chk6" style="accent-color:var(--primary);width:16px;height:16px;" onchange="updateCompleteReturnBtn()"><span style="font-size:14px;">Additional damage photos received</span></label>' +
      '</div>' +
    '</div></div>' +

    '<div class="card"><div class="card-header"><div class="card-title">Section 3 — Financial Resolution</div></div><div class="card-body">' +
      '<div style="font-size:13px;color:var(--muted);margin-bottom:14px;">Deposit held: <strong style="color:var(--white);">' + fmtMoney(bk.dep) + '</strong></div>' +
      '<div class="fg"><label class="fl">Deposit Resolution *</label>' +
        '<label style="display:flex;gap:8px;align-items:center;margin-bottom:8px;cursor:pointer;"><input type="radio" name="dep-res" value="release" onchange="updateReturnSummary();updateCompleteReturnBtn()"><span>Release full deposit — refund ' + fmtMoney(bk.dep) + ' to customer</span></label>' +
        '<label style="display:flex;gap:8px;align-items:center;margin-bottom:8px;cursor:pointer;"><input type="radio" name="dep-res" value="keep" onchange="updateReturnSummary();updateCompleteReturnBtn()"><span>Keep full deposit — damage/loss</span></label>' +
        '<label style="display:flex;gap:8px;align-items:center;cursor:pointer;"><input type="radio" name="dep-res" value="split" onchange="updateReturnSummary();updateCompleteReturnBtn()"><span>Split deposit</span></label>' +
        '<div id="dep-split-inputs" style="display:none;margin-top:10px;padding-left:22px;">' +
          '<div class="fr"><div class="fg"><label class="fl">Keep ($)</label><input class="fi" id="dep-keep-amt" type="number" min="0" step="0.01" placeholder="0" oninput="updateReturnSummary()"></div>' +
          '<div class="fg"><label class="fl">Refund ($)</label><input class="fi" id="dep-refund-amt" type="number" min="0" step="0.01" placeholder="0" oninput="updateReturnSummary()"></div></div>' +
        '</div>' +
      '</div>' +
      '<div class="cpanel" id="ret-summary-panel" style="margin-top:14px;"></div>' +
    '</div></div>' +

    '<button class="btn btn-success" id="complete-return-btn" onclick="completeReturn()" style="width:100%;padding:14px;font-size:14px;letter-spacing:1px;margin-bottom:8px;" disabled>✓ Complete Return</button>' +
    '<div><button class="btn btn-ghost" onclick="showPage(\'active-rentals\')">← Back to Bookings</button></div>';

  updateReturnDiff();
}

function calcEarlyRefund(bk, actualDt, bookedDt) {
  var earlyMs = bookedDt - actualDt;
  if (earlyMs <= 0) return 0;
  var earlyDays = Math.floor(earlyMs / 86400000);
  if (earlyDays <= 0) return 0;
  var totalDays = Math.max(1, Math.ceil(bk.days));
  return Math.round((earlyDays / totalDays) * bk.rental * 100) / 100;
}

function updateReturnDiff() {
  var bk = findBookingById(_processReturnId); if (!bk) return;
  var retDateEl = g('ret-date'), retTimeEl = g('ret-time'); if (!retDateEl || !retTimeEl) return;
  var endTime = bk.endTime || '12:00';
  var booked = new Date(bk.ed + 'T' + endTime);
  var actual = new Date(retDateEl.value + 'T' + (retTimeEl.value||'12:00'));
  var diffMs = actual - booked;
  var div = g('ret-diff-display'), earlySection = g('early-refund-section');
  if (!div) return;
  if (Math.abs(diffMs) < 3600000) {
    div.innerHTML = '<div style="color:var(--success);font-size:13px;font-weight:600;">✓ Returned on time</div>';
    if (earlySection) earlySection.style.display = 'none';
  } else if (diffMs < 0) {
    var earlyH = Math.abs(Math.round(diffMs / 3600000));
    var earlyDays = Math.floor(earlyH / 24), earlyHRem = earlyH % 24;
    var label = earlyDays > 0 ? earlyDays + ' day' + (earlyDays>1?'s':'') + (earlyHRem?' '+earlyHRem+' hr':'') : earlyH + ' hr' + (earlyH>1?'s':'');
    var refAmt = calcEarlyRefund(bk, actual, booked);
    var fullLabel = g('early-full-label');
    if (fullLabel) fullLabel.textContent = 'Full refund of difference (' + fmtMoney(refAmt) + ')';
    div.innerHTML = '<div style="color:var(--success);font-size:13px;font-weight:600;">↩ Returned ' + label + ' early' + (refAmt>0?' — rental difference: '+fmtMoney(refAmt):'') + '</div>';
    if (earlySection) earlySection.style.display = '';
  } else {
    var lateH = Math.round(diffMs / 3600000);
    var lateDays = Math.floor(lateH / 24), lateHRem = lateH % 24;
    var lateLabel = lateDays > 0 ? lateDays + ' day' + (lateDays>1?'s':'') + (lateHRem?' '+lateHRem+' hr':'') + ' late' : lateH + ' hr' + (lateH>1?'s':'') + ' late';
    div.innerHTML = '<div style="color:var(--warning);font-size:13px;font-weight:600;">⚠️ Returned ' + lateLabel + ' — additional charge may apply</div>';
    if (earlySection) earlySection.style.display = 'none';
  }
  updateReturnSummary();
  updateCompleteReturnBtn();
}

function updateEarlyRefundOptions() {
  var v = (document.querySelector('input[name="early-refund"]:checked')||{}).value;
  var pi = g('early-partial-input'); if (pi) pi.style.display = v==='partial'?'':'none';
  updateReturnSummary();
}

function updateDamageSection() {
  var t = g('damage-toggle'), s = g('damage-section');
  if (s) s.style.display = (t&&t.checked)?'':'none';
  updateCompleteReturnBtn();
}

function updateAdditionalCharge() {
  var t = g('add-charge-toggle'), i = g('add-charge-inputs');
  if (i) i.style.display = (t&&t.checked)?'':'none';
  updateReturnSummary();
}

function updateReturnSummary() {
  var bk = findBookingById(_processReturnId); if (!bk) return;
  var div = g('ret-summary-panel'); if (!div) return;
  var depRes = (document.querySelector('input[name="dep-res"]:checked')||{}).value||'';
  var depRefund = 0;
  if (depRes==='release') { depRefund = bk.dep; }
  else if (depRes==='split') {
    var re = g('dep-refund-amt'); depRefund = parseFloat(re&&re.value||0)||0;
    var ds = g('dep-split-inputs'); if (ds) ds.style.display = '';
  }
  if (depRes!=='split') { var ds2 = g('dep-split-inputs'); if (ds2) ds2.style.display = 'none'; }

  var earlyRes = (document.querySelector('input[name="early-refund"]:checked')||{}).value||'none';
  var earlyRefund = 0;
  if (earlyRes==='full') {
    var rd = g('ret-date'), rt = g('ret-time');
    if (rd&&rt) earlyRefund = calcEarlyRefund(bk, new Date(rd.value+'T'+(rt.value||'12:00')), new Date(bk.ed+'T'+(bk.endTime||'12:00')));
  } else if (earlyRes==='partial') {
    var pa = g('early-partial-amt'); earlyRefund = parseFloat(pa&&pa.value||0)||0;
  }

  var addCharge = 0, addLabel = '';
  var act = g('add-charge-toggle');
  if (act&&act.checked) {
    var al = g('add-charge-label'), aa = g('add-charge-amount');
    addLabel = al?al.value.trim():''; addCharge = parseFloat(aa&&aa.value||0)||0;
  }

  div.innerHTML = '<h4>Summary</h4>' +
    '<div class="crow"><span class="cl">Deposit Refund</span><span class="cv' + (depRefund>0?' o':'') + '">' + (depRefund>0?fmtMoney(depRefund):'None') + '</span></div>' +
    '<div class="crow"><span class="cl">Early Return Refund</span><span class="cv' + (earlyRefund>0?' o':'') + '">' + (earlyRefund>0?fmtMoney(earlyRefund):'N/A') + '</span></div>' +
    '<div class="crow"><span class="cl">Additional Charge</span><span class="cv">' + (addCharge>0?(addLabel?escHtml(addLabel)+' — ':'')+fmtMoney(addCharge):'None') + '</span></div>' +
    '<div class="crow" style="border-top:1px solid rgba(255,255,255,.08);margin-top:4px;padding-top:6px;"><span class="cl" style="color:var(--white);font-weight:700;">Net Refund to Customer</span><span class="cv o">' + fmtMoney(depRefund+earlyRefund) + '</span></div>' +
    (addCharge>0?'<div class="crow"><span class="cl" style="color:var(--warning);">Additional Charge Owed</span><span class="cv" style="color:var(--warning);">' + fmtMoney(addCharge) + '</span></div>':'');
}

function updateCompleteReturnBtn() {
  var btn = g('complete-return-btn'); if (!btn) return;
  var req = ['ret-chk1','ret-chk2','ret-chk3','ret-chk4','ret-chk5'];
  var dt = g('damage-toggle');
  if (dt&&dt.checked) {
    req.push('ret-chk6');
    var dd = g('damage-desc'); if (!dd||!dd.value.trim()) { btn.disabled=true; return; }
  }
  var allChk = req.every(function(id){ var el=g(id); return el&&el.checked; });
  var depSel = document.querySelector('input[name="dep-res"]:checked');
  btn.disabled = !(allChk&&depSel);
}

async function completeReturn() {
  var bk = findBookingById(_processReturnId); if (!bk) return;
  var rdEl=g('ret-date'), rtEl=g('ret-time');
  var actualDate=rdEl?rdEl.value:bk.ed, actualTime=rtEl?rtEl.value:'';
  var depRes=(document.querySelector('input[name="dep-res"]:checked')||{}).value||'';
  var depRefund=0;
  if (depRes==='release') depRefund=bk.dep;
  else if (depRes==='split') { var rfe=g('dep-refund-amt'); depRefund=parseFloat(rfe&&rfe.value||0)||0; }
  var depStatus=depRes==='release'?'released':depRes==='keep'?'captured':'partial';

  var earlyRes=(document.querySelector('input[name="early-refund"]:checked')||{}).value||'none';
  var earlyRefund=0;
  if (earlyRes==='full') earlyRefund=calcEarlyRefund(bk,new Date(actualDate+'T'+(actualTime||'12:00')),new Date(bk.ed+'T'+(bk.endTime||'12:00')));
  else if (earlyRes==='partial') { var pa=g('early-partial-amt'); earlyRefund=parseFloat(pa&&pa.value||0)||0; }

  var addCharge=0,addLabel='';
  var act=g('add-charge-toggle');
  if (act&&act.checked) { var al=g('add-charge-label'),aa=g('add-charge-amount'); addLabel=al?al.value.trim():''; addCharge=parseFloat(aa&&aa.value||0)||0; }

  var dt2=g('damage-toggle'), hasDamage=dt2&&dt2.checked;
  var damageDesc=hasDamage&&g('damage-desc')?g('damage-desc').value.trim():'';

  var summary='Complete return for '+bk.c.fn+' '+bk.c.ln+'?\n\n';
  summary+='Deposit: '+depRes+(depRefund>0?' (refund '+fmtMoney(depRefund)+')':'')+'\n';
  if (earlyRefund>0) summary+='Early return refund: '+fmtMoney(earlyRefund)+'\n';
  if (addCharge>0) summary+='Additional charge: '+(addLabel||'charge')+' — '+fmtMoney(addCharge)+'\n';
  summary+='\nThis cannot be undone.';
  if (!confirm(summary)) return;

  var btn=g('complete-return-btn');
  if (btn) { btn.disabled=true; btn.textContent='Processing...'; }

  var notes=[];

  if (depRefund>0) {
    if (bk.paymentIntentId) {
      try {
        var r1=await fetch('/stripe/refund',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({paymentIntentId:bk.paymentIntentId,amount:depRefund})});
        var d1=await r1.json();
        if (!r1.ok||d1.error) notes.push('Deposit refund error: '+(d1.error||'failed'));
      } catch(e){ notes.push('Deposit refund: '+e.message); }
    } else { notes.push('No Payment Intent ID — process deposit refund of '+fmtMoney(depRefund)+' manually in Stripe dashboard.'); }
  }

  if (earlyRefund>0) {
    if (bk.paymentIntentId) {
      try {
        var r2=await fetch('/stripe/refund',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({paymentIntentId:bk.paymentIntentId,amount:earlyRefund})});
        var d2=await r2.json();
        if (!r2.ok||d2.error) notes.push('Early return refund error: '+(d2.error||'failed'));
      } catch(e){ notes.push('Early refund: '+e.message); }
    } else { notes.push('No Payment Intent ID — process early return refund of '+fmtMoney(earlyRefund)+' manually in Stripe dashboard.'); }
  }

  var addChargeLinkUrl=null;
  if (addCharge>0) {
    try {
      var r3=await fetch('/stripe/checkout-session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({bookingId:bk.id,rentalAmount:addCharge,addOnsTotal:0,tax:0,dep:0,addOns:[],trailerName:bk.trailer,firstName:bk.c.fn})});
      var d3=await r3.json();
      if (!r3.ok||d3.error) notes.push('Additional charge link error: '+(d3.error||'failed'));
      else addChargeLinkUrl=d3.url;
    } catch(e){ notes.push('Additional charge link: '+e.message); }
  }

  bk.status='complete'; bk.returnedAt=new Date().toISOString();
  bk.actualReturnDate=actualDate; bk.actualReturnTime=actualTime;
  bk.depositStatus=depStatus; bk.depositRefundAmount=depRefund;
  bk.earlyRefundAmount=earlyRefund; bk.earlyRefundType=earlyRes;
  if (addCharge>0) bk.additionalCharge={label:addLabel,amount:addCharge,linkUrl:addChargeLinkUrl};
  if (hasDamage) bk.damageNotes=damageDesc;
  var t=findFleet(bk.tid);
  if (t) { t.status='available'; t.renter=null; t.returnDate=null; }
  state.rentals=state.rentals.filter(function(r){return r.id!==bk.id;});
  state.done.push(bk); save(); updateStats();
  addAct('Return complete: '+bk.c.fn+' '+bk.c.ln+' — '+bk.trailer,'green');

  if (notes.length||addChargeLinkUrl) {
    var msg=''; if (notes.length) msg+=notes.join('\n')+'\n\n';
    if (addChargeLinkUrl) msg+='Additional charge link:\n'+addChargeLinkUrl;
    if (msg.trim()) alert(msg.trim());
  }
  showToast('Rental complete');
  showPage('dashboard');
}

function drawDrafts() {
  var container = g('draftsBody'); if (!container) return;
  container.innerHTML = '<div style="color:var(--muted);font-size:13px;text-align:center;padding:20px;">Loading...</div>';
  loadAllDrafts(function(drafts) {
    if (!drafts.length) {
      container.innerHTML = '<div style="text-align:center;color:var(--muted);padding:40px 20px;font-size:14px;">No saved drafts.</div>';
      return;
    }
    var h = '<div style="font-family:Oswald,sans-serif;font-size:11px;color:var(--muted);letter-spacing:2px;text-transform:uppercase;margin-bottom:10px;">' + drafts.length + ' draft' + (drafts.length>1?'s':'') + '</div>';
    drafts.forEach(function(d) {
      var f = d.fields || {};
      var name = ((f.fn||'') + ' ' + (f.ln||'')).trim() || 'New Booking';
      var trailerLabel = f.tr === 'utility' ? '7x18 Utility Trailer' : f.tr === 'hauler' ? '7x18 Car Hauler' : 'Not selected';
      var sd = f.sd || 'No date';
      var edited = relativeTime(d.updatedAt);
      h += '<div class="rental-card">' +
        '<div class="rental-card-header">' +
          '<div><div class="rental-name">' + escHtml(name) + '</div><div class="rental-phone">Step ' + (d.step||1) + ' · Edited ' + edited + '</div></div>' +
          '<span class="badge b-pending">DRAFT</span>' +
        '</div>' +
        '<div class="rental-field"><span class="rental-label">Trailer</span><span class="rental-value">' + escHtml(trailerLabel) + '</span></div>' +
        '<div class="rental-field"><span class="rental-label">Start Date</span><span class="rental-value">' + escHtml(sd) + '</span></div>' +
        '<div class="rental-actions">' +
          '<button class="btn btn-primary btn-sm" onclick="resumeDraftById(' + d.id + ')">Resume</button>' +
          '<button class="btn btn-danger btn-sm" onclick="discardDraftById(' + d.id + ')">Discard</button>' +
        '</div>' +
        '</div>';
    });
    container.innerHTML = h;
  });
}

function drawHistory() {
  var container = g('histBody'); if (!container) return;
  var all = state.done.slice().reverse();
  var hs = g('histStats');
  if (!all.length) { if (hs) hs.textContent = ''; container.innerHTML = '<div style="text-align:center;color:var(--muted);padding:40px 20px;font-size:14px;">No completed rentals yet.</div>'; return; }
  var rev = 0; all.forEach(function(r){rev += r.rental + (r.wt||0);});
  if (hs) hs.textContent = all.length + ' rentals · $' + rev + ' total revenue';
  var h = '';
  all.forEach(function(r){
    h += '<div class="rental-card">' +
      '<div class="rental-card-header"><div><div class="rental-name">' + escHtml(r.c.fn) + ' ' + escHtml(r.c.ln) + '</div><div class="rental-phone">#' + r.id + (r.src?' · '+escHtml(r.src):'') + '</div></div><span class="badge b-returned">Returned</span></div>' +
      '<div class="rental-field"><span class="rental-label">Trailer</span><span class="rental-value">' + escHtml(r.trailer) + '</span></div>' +
      '<div class="rental-field"><span class="rental-label">Dates</span><span class="rental-value">' + r.sd + ' → ' + r.ed + '</span></div>' +
      '<div class="rental-field"><span class="rental-label">Duration</span><span class="rental-value">' + r.days + ' day' + (r.days>1?'s':'') + '</span></div>' +
      '<div class="rental-field"><span class="rental-label">Revenue</span><span class="rental-value accent">$' + r.rental + '</span></div>' +
      '<div style="margin-top:10px;padding-top:10px;border-top:1px solid #1a1a1a;display:flex;justify-content:space-between;align-items:center;">' +
        '<span style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;font-family:Oswald,sans-serif;">Documents</span>' +
        '<button class="btn btn-ghost btn-sm" onclick="toggleBookingDocs(' + r.id + ')">📄 Docs</button>' +
      '</div>' +
      '<div id="booking-docs-' + r.id + '" style="display:none;margin-top:8px;"></div>' +
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

// ── GATE CODE SETTINGS ───────────────────────────────
async function loadGateCodeSettings() {
  var div = g('gateCodeSection'); if (!div) return;
  var code = null;
  try { code = await idbGet('gateCode'); } catch(e) {}
  renderGateCodeSettings(code, div);
}

function renderGateCodeSettings(code, div) {
  if (!div) return;
  div.innerHTML =
    (code
      ? '<div style="font-family:Oswald,sans-serif;font-size:22px;font-weight:700;color:var(--primary);letter-spacing:4px;margin-bottom:8px;">' + escHtml(String(code)) + '</div>'
      : '<div style="color:var(--muted);font-size:13px;margin-bottom:8px;">No gate code set</div>') +
    '<button class="btn btn-ghost btn-sm" onclick="editGateCode()">✏️ Edit Gate Code</button>';
}

function editGateCode() {
  var div = g('gateCodeSection'); if (!div) return;
  div.innerHTML =
    '<input class="fi" id="gate-code-inp" type="text" maxlength="10" placeholder="Enter gate code" style="margin-bottom:8px;">' +
    '<div style="display:flex;gap:8px;">' +
      '<button class="btn btn-primary btn-sm" onclick="saveGateCode()">Save</button>' +
      '<button class="btn btn-ghost btn-sm" onclick="loadGateCodeSettings()">Cancel</button>' +
    '</div>';
  var el = g('gate-code-inp');
  if (el) {
    idbGet('gateCode').then(function(code){ if (el && code) el.value = code; });
    el.focus();
  }
}

async function saveGateCode() {
  var el = g('gate-code-inp'); if (!el) return;
  var code = el.value.trim();
  if (!code) { alert('Enter a gate code.'); return; }
  await idbPut('gateCode', code).catch(function(){});
  var div = g('gateCodeSection');
  renderGateCodeSettings(code, div);
  showToast('Gate code saved');
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
    '<h3>1. Rental Information</h3><p>Renter Name: _________________________________</p>' +
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
    '<h3>3. Signatures</h3><p>Renter Signature: ______________________________ Date: ____________</p>' +
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

function openCorporatePhone() {
  window.location.href = 'intent:#Intent;action=android.intent.action.MAIN;package=com.corporatetools.phoneservice;end';
}

// ── DASHBOARD ────────────────────────────────────────
function drawDashboard() {
  updateStats();
  loadDashboardMaintAlerts();
  loadDashboardTaxReminder();
  loadDashboardInsurReminder();
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

// ── TOKEN ENGINE ─────────────────────────────────────

var LOCAL_TEMPLATE_DEFAULTS = {};
LOCAL_TEMPLATE_DEFAULTS['pre-booking-package'] = "Hi {firstName}! This is Frank with Iron G Equipment Co. Here's your booking summary:\n\n🚛 Trailer: {trailerName}\n📅 Pickup: {startDate} at {startTime}\n📅 Return: {endDate} at {endTime} ({days} days)\n📍 Location: {pickupAddress}\n\n💰 Quote:\n- Rental Fee: ${rentalFee}\n{addOns}- Tax (8.85%): ${tax}\n- Deposit (refundable): ${deposit}\n- Total Due: ${total}\n\nBefore we confirm your booking, please send the following to {contactInfo}:\n☐ Driver's license photo\n☐ Vehicle insurance card\n☐ Confirm tow vehicle: {towVehicle} — reply if different\n\nPlease also review the rental agreement. Reply to confirm or with any questions. We'll send your payment link once docs are verified.\n\n— Frank | Iron G Equipment Co. | {businessPhone}";
LOCAL_TEMPLATE_DEFAULTS['gate2-confirmation'] = "Hi {firstName}! Your Iron G rental is confirmed. Here's everything you need:\n\n🚛 Trailer: {trailerName}\n📅 Pickup: {startDate} at {startTime}\n📅 Return: {endDate} at {endTime}\n📍 {pickupAddress}\n🔐 Gate Code: {gateCode}\n🔑 Lockbox Code: {lockboxCode} (contains your coupler lock combo)\n\nIMPORTANT RETURN INSTRUCTIONS:\n- Return trailer by {endDate} at {endTime}\n- Late returns may result in additional charges\n- To complete your return, send to {contactInfo}:\n  - Minimum 4 photos: front, rear, driver side, passenger side\n  - Additional photos if any damage\n  - 1 walk-around video\n- Lock the coupler on return\n\nQuestions? Call or text Frank at {businessPhone}\n\n— Iron G Equipment Co.";
LOCAL_TEMPLATE_DEFAULTS['return-reminder'] = "Hi {firstName}! Reminder from Iron G — your trailer is due back TOMORROW ({endDate}) by {endTime}.\n\n📍 Return to: {pickupAddress}\n🔐 Gate Code: {gateCode}\n\nTo complete your return please send to {contactInfo}:\n- Minimum 4 photos: front, rear, driver side, passenger side\n- Additional photos if any damage occurred\n- 1 walk-around video\n\n⚠️ Returns after {endTime} on {endDate} may result in additional charges.\n\nLock the coupler when done and text Frank at {businessPhone} when returned.\n\n— Iron G Equipment Co.";
LOCAL_TEMPLATE_DEFAULTS['late-return'] = "Hi {firstName}, this is Frank with Iron G Equipment Co. Your trailer was due back on {endDate} at {endTime} and we haven't received your return confirmation yet.\n\nPlease return the trailer to {pickupAddress} as soon as possible.\n\nAdditional charges may apply for the extra time. Please text Frank at {businessPhone} immediately to confirm your return plan.\n\n— Iron G Equipment Co.";
LOCAL_TEMPLATE_DEFAULTS['payment-link'] = "Hi {firstName}! Here is your Iron G payment link:\n\n{paymentUrl}\n\nTotal: ${total} (includes ${deposit} refundable deposit)\n\nPlease complete payment to confirm your booking. Link expires in 24 hours.\n\nReply with any questions.\n\n— Frank | Iron G Equipment Co. | {businessPhone}";

function addTokens(body, data) {
  if (!body) return '';
  var result = body;
  var addOnsStr = '';
  if (data.addOns && Array.isArray(data.addOns) && data.addOns.length) {
    data.addOns.forEach(function(a) { addOnsStr += '- ' + (a.label || a.name || '') + ': $' + (a.amount || 0) + '\n'; });
  }
  var map = {
    firstName: data.firstName, lastName: data.lastName,
    trailerName: data.trailerName,
    startDate: data.startDate, startTime: data.startTime,
    endDate: data.endDate, endTime: data.endTime, days: data.days,
    pickupAddress: data.pickupAddress, rentalFee: data.rentalFee,
    addOns: addOnsStr, tax: data.tax, deposit: data.deposit, total: data.total,
    towVehicle: data.towVehicle, contactInfo: data.contactInfo,
    gateCode: data.gateCode, lockboxCode: data.lockboxCode,
    paymentUrl: data.paymentUrl, businessPhone: data.businessPhone,
    businessName: data.businessName,
    date: data.date, email: data.email, city: data.city,
    phone: data.phone,
    actualReturnDate: data.actualReturnDate, actualReturnTime: data.actualReturnTime,
    bookingId: data.bookingId !== undefined && data.bookingId !== null ? data.bookingId : undefined
  };
  for (var token in map) {
    if (map[token] !== undefined && map[token] !== null) {
      result = result.split('{' + token + '}').join(String(map[token]));
    }
  }
  return result;
}

async function getTemplateBody(id) {
  if (_templateCache[id]) return _templateCache[id];
  try {
    var res = await fetch('/templates/' + id);
    if (res.ok) {
      var data = await res.json();
      if (data && data.body) { _templateCache[id] = data.body; return data.body; }
    }
  } catch(e) {}
  return LOCAL_TEMPLATE_DEFAULTS[id] || '';
}

// ── MESSAGING PAGE ────────────────────────────────────

var TEMPLATE_DEFS = [
  { id: 'pre-booking-package', label: 'Pre-Booking Package' },
  { id: 'payment-link', label: 'Payment Link Message' },
  { id: 'gate2-confirmation', label: 'Confirmation & Access Info' },
  { id: 'return-reminder', label: 'Return Reminder' },
  { id: 'late-return', label: 'Late Return Notice' }
];

async function drawMessaging() {
  var container = g('messagingBody'); if (!container) return;
  container.innerHTML = '<div style="color:var(--muted);text-align:center;padding:20px;font-size:13px;">Loading templates...</div>';
  var savedTemplates = {};
  try {
    var res = await fetch('/templates');
    if (res.ok) {
      var arr = await res.json();
      arr.forEach(function(t){ savedTemplates[t.id] = t; });
    }
  } catch(e) {}
  var h = '';
  TEMPLATE_DEFS.forEach(function(def) {
    var saved = savedTemplates[def.id];
    var body = saved ? saved.body : (LOCAL_TEMPLATE_DEFAULTS[def.id] || '');
    var updatedAt = saved ? saved.updatedAt : null;
    var updatedLabel = updatedAt ? 'Saved ' + relativeTime(new Date(updatedAt).toISOString()) : 'Default';
    var bodyEsc = escHtml(body);
    h += '<div class="card" id="tpl-card-' + def.id + '">' +
      '<div class="card-header">' +
        '<div class="card-title">' + def.label + '</div>' +
        '<span id="tpl-updated-' + def.id + '" style="font-size:11px;color:var(--muted);">' + updatedLabel + '</span>' +
      '</div>' +
      '<div class="card-body">' +
        '<textarea class="fi form-textarea" id="tpl-body-' + def.id + '" oninput="updateTplCharCount(\'' + def.id + '\')" style="min-height:200px;font-size:12px;line-height:1.6;font-family:Barlow,sans-serif;">' + bodyEsc + '</textarea>' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;margin-bottom:10px;">' +
          '<span id="tpl-chars-' + def.id + '" style="font-size:11px;color:var(--muted);">' + body.length + ' chars</span>' +
          '<span id="tpl-save-status-' + def.id + '" style="font-size:11px;"></span>' +
        '</div>' +
        '<div style="display:flex;gap:8px;">' +
          '<button class="btn btn-primary btn-sm" onclick="saveTemplate(\'' + def.id + '\')">Save</button>' +
          '<button class="btn btn-ghost btn-sm" onclick="resetTemplate(\'' + def.id + '\')">Reset to Default</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  });
  container.innerHTML = h;
}

function updateTplCharCount(id) {
  var ta = g('tpl-body-' + id); var ct = g('tpl-chars-' + id);
  if (ta && ct) ct.textContent = ta.value.length + ' chars';
}

async function saveTemplate(id) {
  var ta = g('tpl-body-' + id); var statusEl = g('tpl-save-status-' + id);
  if (!ta) return;
  var body = ta.value;
  if (statusEl) { statusEl.textContent = 'Saving...'; statusEl.style.color = 'var(--muted)'; }
  try {
    var label = (TEMPLATE_DEFS.find(function(d){ return d.id === id; }) || {}).label || id;
    var res = await fetch('/templates/' + id, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ label: label, body: body }) });
    var data = await res.json();
    if (res.ok && data.success) {
      _templateCache[id] = body;
      if (statusEl) { statusEl.textContent = '✓ Saved'; statusEl.style.color = 'var(--success)'; setTimeout(function(){ if (statusEl) statusEl.textContent = ''; }, 3000); }
      var updEl = g('tpl-updated-' + id); if (updEl) updEl.textContent = 'Just saved';
    } else {
      if (statusEl) { statusEl.textContent = 'Save failed'; statusEl.style.color = 'var(--danger)'; }
    }
  } catch(e) { if (statusEl) { statusEl.textContent = 'Save failed'; statusEl.style.color = 'var(--danger)'; } }
}

async function resetTemplate(id) {
  if (!confirm('Reset this template to default? Your changes will be lost.')) return;
  try {
    var res = await fetch('/templates/reset/' + id, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
    var data = await res.json();
    if (res.ok && data.success) {
      _templateCache[id] = data.body;
      var ta = g('tpl-body-' + id); if (ta) { ta.value = data.body; updateTplCharCount(id); }
      var updEl = g('tpl-updated-' + id); if (updEl) updEl.textContent = 'Default';
      showToast('Reset to default');
    }
  } catch(e) { alert('Reset failed: ' + e.message); }
}

function toggleTokenRef() {
  var body = g('tokenRefBody'); var btn = g('tokenRefToggle'); if (!body) return;
  var open = body.style.display !== 'none';
  body.style.display = open ? 'none' : 'block';
  if (btn) btn.textContent = open ? 'Show' : 'Hide';
}

// ── DOCS PAGE ─────────────────────────────────────────

var LOCAL_DOC_DEFAULTS = {};
LOCAL_DOC_DEFAULTS['rental-agreement'] = "IRON G EQUIPMENT CO. LLC\nTRAILER RENTAL AGREEMENT\n\nDate: {date}\nBooking ID: {bookingId}\n\nRENTER INFORMATION\nName: {firstName} {lastName}\nPhone: {phone}\nEmail: {email}\nCity: {city}\nTow Vehicle: {towVehicle}\nDriver License: ___________________\n\nRENTAL DETAILS\nTrailer: {trailerName}\nPickup: {startDate} at {startTime}\nReturn: {endDate} at {endTime}\nTotal Days: {days}\nPickup Location: {pickupAddress}\n\nCHARGES\nRental Fee: ${rentalFee}\n{addOns}Tax (8.85%): ${tax}\nRefundable Deposit: ${deposit}\nTotal Due: ${total}\n\nTERMS AND CONDITIONS\n1. RENTER must be 18 years or older with a valid driver's license.\n2. RENTER is responsible for the trailer from time of pickup until return is confirmed.\n3. RENTER assumes full liability for any damage, theft, or loss occurring during the rental period.\n4. Trailer must be returned to {pickupAddress} by {endDate} at {endTime}. Late returns will be charged at the daily rental rate.\n5. RENTER must have adequate tow vehicle and equipment. Iron G Equipment Co. LLC is not responsible for accidents or damage caused by improper towing.\n6. No off-road use. Trailer must remain on paved or improved surfaces.\n7. RENTER must not sublet or loan the trailer to any third party.\n8. Deposit of ${deposit} will be refunded upon confirmed clean return with required photos and video. Deposit may be fully or partially withheld for damage, excessive cleaning, or missing equipment.\n9. Early returns do not automatically qualify for partial refunds. Contact Iron G Equipment Co. to discuss.\n10. RENTER agrees to submit minimum 4 photos (front, rear, driver side, passenger side) plus 1 walk-around video upon return.\n\nACKNOWLEDGEMENTS\nRenter confirms tow vehicle is capable of safely towing this trailer: ______\nRenter confirms they have reviewed and understand all terms: ______\nRenter confirms trailer was inspected at pickup and accepted in good condition: ______\n\nSIGNATURES\nRenter Signature: ___________________ Date: ________\nPrinted Name: ___________________\nIron G Equipment Co. Representative: ___________________ Date: ________";
LOCAL_DOC_DEFAULTS['damage-report'] = "IRON G EQUIPMENT CO. LLC\nDAMAGE / INCIDENT REPORT\n\nDate: {date}\nBooking ID: {bookingId}\nRental Period: {startDate} — {endDate}\n\nRENTER INFORMATION\nName: {firstName} {lastName}\nPhone: {phone}\n\nTRAILER INFORMATION\nTrailer: {trailerName}\n\nDAMAGE DESCRIPTION\nDate/Time Discovered: ___________________\nLocation Discovered: ___________________\nDescription of Damage:\n_______________________________________________\n_______________________________________________\n\nESTIMATED REPAIR COST: $___________________\nDEPOSIT HELD: ${deposit}\nADDITIONAL AMOUNT OWED: $___________________\n\nPHOTOS/VIDEO ON FILE: ☐ Yes  ☐ No\nNUMBER OF PHOTOS: _______\n\nNOTES:\n_______________________________________________\n\nIron G Equipment Co. Representative: ___________________ Date: ________";
LOCAL_DOC_DEFAULTS['return-confirmation'] = "IRON G EQUIPMENT CO. LLC\nRETURN CONFIRMATION\n\nDate: {date}\nBooking ID: {bookingId}\n\nRENTER: {firstName} {lastName}\nTRAILER: {trailerName}\nRENTAL PERIOD: {startDate} at {startTime} — {endDate} at {endTime}\n\nRETURN DETAILS\nActual Return Date: {actualReturnDate}\nActual Return Time: {actualReturnTime}\nCondition: ☐ Clean  ☐ Damage noted\n\nFINANCIAL SUMMARY\nTotal Charged: ${total}\nDeposit Held: ${deposit}\nDeposit Refunded: $___________________\nAdditional Charges: $___________________\nEarly Return Refund: $___________________\n\nRETURN DOCUMENTATION RECEIVED\n☐ Photo — Front\n☐ Photo — Rear\n☐ Photo — Driver Side\n☐ Photo — Passenger Side\n☐ Additional damage photos\n☐ Walk-around video\n\nNOTES:\n_______________________________________________\n\nIron G Equipment Co. Representative: ___________________ Date: ________";

var DOC_DEFS = [
  { id: 'rental-agreement', label: 'Rental Agreement', category: 'customer' },
  { id: 'damage-report', label: 'Damage / Incident Report', category: 'customer' },
  { id: 'return-confirmation', label: 'Return Confirmation', category: 'customer' }
];

var DOC_LABELS = { 'rental-agreement':'Rental Agreement', 'damage-report':'Damage / Incident Report', 'return-confirmation':'Return Confirmation' };

var _docGenSelections = {};

async function drawDocs() {
  var container = g('docsBody'); if (!container) return;
  container.innerHTML = '<div style="color:var(--muted);text-align:center;padding:20px;font-size:13px;">Loading...</div>';
  var savedDocs = {};
  try {
    var res = await fetch('/docs');
    if (res.ok) { var arr = await res.json(); arr.forEach(function(d){ savedDocs[d.id] = d; }); }
  } catch(e) {}
  var h = '<div class="doc-section-label">Customer Documents</div>';
  DOC_DEFS.forEach(function(def) {
    var saved = savedDocs[def.id];
    var body = saved ? saved.body : (LOCAL_DOC_DEFAULTS[def.id] || '');
    var updatedAt = saved ? saved.updatedAt : null;
    var updatedLabel = updatedAt ? 'Saved ' + relativeTime(new Date(updatedAt).toISOString()) : 'Default';
    var bodyEsc = escHtml(body);
    var allBks = state.rentals.concat(state.done);
    var opts = '<option value="">— Select a booking —</option>';
    allBks.forEach(function(bk){ opts += '<option value="' + bk.id + '">' + escHtml((bk.c.fn||'') + ' ' + (bk.c.ln||'') + ' — ' + (bk.trailer||'') + ' — ' + (bk.sd||'')) + '</option>'; });
    h += '<div class="card" id="doc-card-' + def.id + '">' +
      '<div class="card-header">' +
        '<div class="card-title">' + def.label + '</div>' +
        '<span id="doc-updated-' + def.id + '" style="font-size:11px;color:var(--muted);">' + updatedLabel + '</span>' +
      '</div>' +
      '<div class="card-body">' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;">' +
          '<button class="btn btn-ghost btn-sm" onclick="toggleDocEdit(\'' + def.id + '\')">✏️ Edit Template</button>' +
          '<button class="btn btn-primary btn-sm" onclick="toggleDocGenerate(\'' + def.id + '\')">📄 Generate for Booking</button>' +
        '</div>' +
        '<div id="doc-edit-area-' + def.id + '" style="display:none;">' +
          '<textarea class="fi form-textarea" id="doc-body-' + def.id + '" oninput="updateDocCharCount(\'' + def.id + '\')" style="min-height:300px;font-size:12px;line-height:1.5;font-family:monospace;">' + bodyEsc + '</textarea>' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;margin-bottom:10px;">' +
            '<span id="doc-chars-' + def.id + '" style="font-size:11px;color:var(--muted);">' + body.length + ' chars</span>' +
            '<span id="doc-save-status-' + def.id + '" style="font-size:11px;"></span>' +
          '</div>' +
          '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
            '<button class="btn btn-primary btn-sm" onclick="saveDoc(\'' + def.id + '\')">Save Template</button>' +
            '<button class="btn btn-ghost btn-sm" onclick="resetDoc(\'' + def.id + '\')">Reset to Default</button>' +
            '<button class="btn btn-ghost btn-sm" onclick="toggleDocEdit(\'' + def.id + '\')">Close</button>' +
          '</div>' +
        '</div>' +
        '<div id="doc-gen-panel-' + def.id + '" style="display:none;">' +
          '<div style="margin-bottom:10px;"><label class="fl">Select Booking</label>' +
          '<select class="form-select" id="doc-bk-select-' + def.id + '" onchange="generateDocForBooking(\'' + def.id + '\')">' + opts + '</select></div>' +
          '<div id="doc-preview-' + def.id + '" style="display:none;">' +
            '<div id="doc-preview-text-' + def.id + '" style="background:#111;border:1px solid #2a2a2a;border-radius:4px;padding:14px;font-size:12px;line-height:1.5;font-family:monospace;white-space:pre-wrap;max-height:400px;overflow-y:auto;margin-bottom:10px;color:var(--text);"></div>' +
            '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
              '<button class="btn btn-primary btn-sm" onclick="copyDocPreview(\'' + def.id + '\')">📋 Copy</button>' +
              '<button class="btn btn-ghost btn-sm" id="doc-sms-btn-' + def.id + '" style="display:none;" onclick="sendDocPreviewSms(\'' + def.id + '\')">📱 SMS</button>' +
              '<button class="btn btn-ghost btn-sm" id="doc-email-btn-' + def.id + '" style="display:none;" onclick="sendDocPreviewEmail(\'' + def.id + '\')">📧 Email</button>' +
              '<button class="btn btn-success btn-sm" onclick="saveDocToBooking(\'' + def.id + '\')">💾 Save to Booking</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  });
  h += '<div class="doc-section-label" style="margin-top:8px;">Operational &amp; Reference</div>';
  ['Insurance Certificate', 'LLC Documents', 'Trailer Registration'].forEach(function(label) {
    h += '<div class="card"><div class="card-header"><div class="card-title">' + label + '</div></div><div class="card-body"><div style="font-size:13px;color:var(--muted);">Upload or link coming soon</div></div></div>';
  });
  container.innerHTML = h;
}

function toggleDocEdit(id) {
  var el = g('doc-edit-area-' + id); if (!el) return;
  var open = el.style.display !== 'none';
  el.style.display = open ? 'none' : 'block';
  if (!open) { var gp = g('doc-gen-panel-' + id); if (gp) gp.style.display = 'none'; }
}

function toggleDocGenerate(id) {
  var el = g('doc-gen-panel-' + id); if (!el) return;
  var open = el.style.display !== 'none';
  el.style.display = open ? 'none' : 'block';
  if (!open) { var ea = g('doc-edit-area-' + id); if (ea) ea.style.display = 'none'; }
}

function updateDocCharCount(id) {
  var ta = g('doc-body-' + id); var ct = g('doc-chars-' + id);
  if (ta && ct) ct.textContent = ta.value.length + ' chars';
}

async function saveDoc(id) {
  var ta = g('doc-body-' + id); var statusEl = g('doc-save-status-' + id);
  if (!ta) return;
  var body = ta.value;
  if (statusEl) { statusEl.textContent = 'Saving...'; statusEl.style.color = 'var(--muted)'; }
  try {
    var def = DOC_DEFS.filter(function(d){ return d.id === id; })[0] || {};
    var res = await fetch('/docs/' + id, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ label: def.label || id, body: body, category: 'customer' }) });
    var data = await res.json();
    if (res.ok && data.success) {
      if (statusEl) { statusEl.textContent = '✓ Saved'; statusEl.style.color = 'var(--success)'; setTimeout(function(){ if (statusEl) statusEl.textContent = ''; }, 3000); }
      var updEl = g('doc-updated-' + id); if (updEl) updEl.textContent = 'Just saved';
    } else { if (statusEl) { statusEl.textContent = 'Save failed'; statusEl.style.color = 'var(--danger)'; } }
  } catch(e) { if (statusEl) { statusEl.textContent = 'Save failed'; statusEl.style.color = 'var(--danger)'; } }
}

async function resetDoc(id) {
  if (!confirm('Reset this document to default? Your changes will be lost.')) return;
  try {
    var res = await fetch('/docs/reset/' + id, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
    var data = await res.json();
    if (res.ok && data.success) {
      var ta = g('doc-body-' + id); if (ta) { ta.value = data.body; updateDocCharCount(id); }
      var updEl = g('doc-updated-' + id); if (updEl) updEl.textContent = 'Default';
      showToast('Reset to default');
    }
  } catch(e) { alert('Reset failed: ' + e.message); }
}

async function getDocBody(id) {
  try {
    var res = await fetch('/docs/' + id);
    if (res.ok) { var data = await res.json(); if (data && data.body) return data.body; }
  } catch(e) {}
  return LOCAL_DOC_DEFAULTS[id] || '';
}

function buildDocData(bk) {
  var c = bk.c || {};
  var today = new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' });
  var daysDisp = bk.durationLabel || (Math.ceil(bk.days||1) + ' day' + (Math.ceil(bk.days||1)!==1?'s':''));
  var contactTarget = c.contactPref === 'email' ? (c.em||'') : (c.ph||'');
  var tax = bk.tax || 0;
  var grand = bk.grand || bk.total || 0;
  return {
    date: today, bookingId: '' + bk.id,
    firstName: c.fn||'', lastName: c.ln||'', phone: c.ph||'', email: c.em||'', city: c.cy||'',
    towVehicle: c.vh||'', trailerName: bk.trailer||'',
    startDate: bk.sd||'', startTime: bk.startTime||'', endDate: bk.ed||'', endTime: bk.endTime||'',
    days: daysDisp,
    pickupAddress: globalVars.pickupAddress || 'Mother Road RV Boat & Trailer Storage, 16245 W HWY 66, Yukon, OK 73099',
    rentalFee: '' + (bk.rental||0),
    addOns: bk.addOns || [],
    tax: (typeof tax === 'number' ? tax.toFixed(2) : '' + tax),
    deposit: '' + (bk.dep||0),
    total: (typeof grand === 'number' ? grand.toFixed(2) : '' + grand),
    contactInfo: contactTarget,
    gateCode: globalVars.gateCode || '',
    lockboxCode: bk.lockboxCode || '',
    actualReturnDate: bk.actualReturnDate || '',
    actualReturnTime: bk.actualReturnTime || '',
    businessPhone: globalVars.businessPhone || '(405) 393-4161',
    businessName: globalVars.businessName || 'Iron G Equipment Co.',
    paymentUrl: bk.paymentLinkUrl || ''
  };
}

async function generateDocForBooking(docId) {
  var sel = g('doc-bk-select-' + docId); if (!sel || !sel.value) return;
  var bkId = parseInt(sel.value, 10);
  var bk = findBookingById(bkId); if (!bk) return;
  _docGenSelections[docId] = bkId;
  var body = await getDocBody(docId);
  var generated = addTokens(body, buildDocData(bk));
  var previewDiv = g('doc-preview-' + docId);
  var previewText = g('doc-preview-text-' + docId);
  if (previewText) previewText.textContent = generated;
  if (previewDiv) previewDiv.style.display = 'block';
  var smsBtn = g('doc-sms-btn-' + docId);
  var emailBtn = g('doc-email-btn-' + docId);
  if (smsBtn) smsBtn.style.display = (bk.c.contactPref !== 'email') ? 'inline-flex' : 'none';
  if (emailBtn) emailBtn.style.display = (bk.c.contactPref === 'email') ? 'inline-flex' : 'none';
}

function copyDocPreview(docId) {
  var el = g('doc-preview-text-' + docId); if (!el) return;
  var text = el.textContent;
  function fb() { var ta=document.createElement('textarea'); ta.value=text; ta.style.position='fixed'; ta.style.opacity='0'; document.body.appendChild(ta); ta.focus(); ta.select(); try{document.execCommand('copy');}catch(e){} document.body.removeChild(ta); }
  if (navigator.clipboard) { navigator.clipboard.writeText(text).catch(fb); } else { fb(); }
  showToast('📋 Copied!');
}

function sendDocPreviewSms(docId) {
  var bkId = _docGenSelections[docId]; if (!bkId) return;
  var bk = findBookingById(bkId); if (!bk) return;
  var el = g('doc-preview-text-' + docId); if (!el) return;
  window.location.href = 'sms:' + bk.c.ph.replace(/\D/g,'') + '?body=' + encodeURIComponent(el.textContent);
}

function sendDocPreviewEmail(docId) {
  var bkId = _docGenSelections[docId]; if (!bkId) return;
  var bk = findBookingById(bkId); if (!bk) return;
  var el = g('doc-preview-text-' + docId); if (!el) return;
  var def = DOC_DEFS.filter(function(d){ return d.id === docId; })[0] || {};
  window.location.href = 'mailto:' + encodeURIComponent(bk.c.em||'') + '?subject=' + encodeURIComponent((def.label||docId) + ' — Iron G Equipment Co.') + '&body=' + encodeURIComponent(el.textContent);
}

async function saveDocToBooking(docId) {
  var bkId = _docGenSelections[docId];
  if (!bkId) { showToast('Select a booking first'); return; }
  var bk = findBookingById(bkId); if (!bk) return;
  var el = g('doc-preview-text-' + docId); if (!el) return;
  var body = el.textContent;
  try {
    var res = await fetch('/docs/booking/' + bkId + '/' + docId, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body: body }) });
    var data = await res.json();
    if (res.ok && data.success) { showToast('✓ Saved to booking ' + (bk.c.fn||'') + ' ' + (bk.c.ln||'')); }
    else { showToast('Save failed'); }
  } catch(e) { showToast('Save failed'); }
}

async function toggleBookingDocs(id) {
  var el = g('booking-docs-' + id); if (!el) return;
  if (el.style.display !== 'none') { el.style.display = 'none'; return; }
  el.style.display = 'block';
  el.innerHTML = '<div style="color:var(--muted);font-size:12px;padding:6px 0;">Loading...</div>';
  try {
    var res = await fetch('/docs/booking/' + id);
    var items = res.ok ? await res.json() : [];
    if (!items.length) {
      el.innerHTML = '<div style="color:var(--muted);font-size:12px;padding:6px 0;">No saved documents.</div>';
      return;
    }
    var h = '';
    items.forEach(function(item) {
      var label = DOC_LABELS[item.docId] || item.docId;
      var savedAgo = relativeTime(new Date(item.savedAt).toISOString());
      h += '<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid #1a1a1a;font-size:12px;">' +
        '<div><div style="color:var(--white);font-weight:600;">' + escHtml(label) + '</div><div style="color:var(--muted);font-size:11px;">Saved ' + savedAgo + '</div></div>' +
        '<button class="btn btn-ghost btn-sm" onclick="viewBookingDoc(' + id + ',\'' + item.docId + '\')">View</button>' +
      '</div>';
    });
    el.innerHTML = h;
  } catch(e) { el.innerHTML = '<div style="color:var(--danger);font-size:12px;padding:6px 0;">Load failed</div>'; }
}

async function viewBookingDoc(bookingId, docId) {
  var bk = findBookingById(parseInt(bookingId, 10));
  var pnl = g('booking-docs-' + bookingId); if (!pnl) return;
  var viewId = 'viewed-doc-' + bookingId + '-' + docId;
  if (g(viewId)) { g(viewId).remove(); return; }
  try {
    var res = await fetch('/docs/booking/' + bookingId + '/' + docId);
    var data = await res.json();
    if (!data || !data.body) { showToast('Document not found'); return; }
    var label = DOC_LABELS[docId] || docId;
    var contactPref = bk ? (bk.c.contactPref || 'sms') : 'sms';
    var smsBtnHtml = (contactPref !== 'email' && bk && bk.c.ph)
      ? '<button class="btn btn-ghost btn-sm" onclick="sendViewedDocSms(\'' + bookingId + '\',\'' + docId + '\',\'' + viewId + '\')">📱 SMS</button>' : '';
    var emailBtnHtml = (contactPref === 'email' && bk && bk.c.em)
      ? '<button class="btn btn-ghost btn-sm" onclick="sendViewedDocEmail(\'' + bookingId + '\',\'' + docId + '\',\'' + escHtml(label) + '\',\'' + viewId + '\')">📧 Email</button>' : '';
    var el = document.createElement('div');
    el.id = viewId;
    el.style.marginTop = '10px';
    el.innerHTML =
      '<div style="font-size:11px;color:var(--primary);text-transform:uppercase;letter-spacing:1px;font-family:Oswald,sans-serif;margin-bottom:6px;">' + escHtml(label) + '</div>' +
      '<div id="vdt-' + viewId + '" style="background:#111;border:1px solid #2a2a2a;border-radius:4px;padding:12px;font-size:12px;line-height:1.5;font-family:monospace;white-space:pre-wrap;max-height:300px;overflow-y:auto;margin-bottom:8px;color:var(--text);">' + escHtml(data.body) + '</div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
        '<button class="btn btn-primary btn-sm" onclick="copyViewedDoc(\'' + viewId + '\')">📋 Copy</button>' +
        smsBtnHtml + emailBtnHtml +
        '<button class="btn btn-ghost btn-sm" onclick="document.getElementById(\'' + viewId + '\').remove()">Close</button>' +
      '</div>';
    pnl.appendChild(el);
  } catch(e) { showToast('Load failed'); }
}

function copyViewedDoc(viewId) {
  var el = g('vdt-' + viewId); if (!el) return;
  var text = el.textContent;
  function fb() { var ta=document.createElement('textarea'); ta.value=text; ta.style.position='fixed'; ta.style.opacity='0'; document.body.appendChild(ta); ta.focus(); ta.select(); try{document.execCommand('copy');}catch(e){} document.body.removeChild(ta); }
  if (navigator.clipboard) { navigator.clipboard.writeText(text).catch(fb); } else { fb(); }
  showToast('📋 Copied!');
}

function sendViewedDocSms(bookingId, docId, viewId) {
  var bk = findBookingById(parseInt(bookingId, 10)); if (!bk) return;
  var el = g('vdt-' + viewId); if (!el) return;
  window.location.href = 'sms:' + bk.c.ph.replace(/\D/g,'') + '?body=' + encodeURIComponent(el.textContent);
}

function sendViewedDocEmail(bookingId, docId, label, viewId) {
  var bk = findBookingById(parseInt(bookingId, 10)); if (!bk) return;
  var el = g('vdt-' + viewId); if (!el) return;
  window.location.href = 'mailto:' + encodeURIComponent(bk.c.em||'') + '?subject=' + encodeURIComponent(label + ' — Iron G Equipment Co.') + '&body=' + encodeURIComponent(el.textContent);
}

// ── GLOBAL VARS SETTINGS ──────────────────────────────

async function loadGlobalVarSettings() {
  try {
    var res = await fetch('/globalvars'); if (!res.ok) return;
    var data = await res.json();
    globalVars = data;
    var el;
    el = g('gv-biz-name'); if (el) el.value = data.businessName || '';
    el = g('gv-biz-phone'); if (el) el.value = data.businessPhone || '';
    el = g('gv-pickup-addr'); if (el) el.value = data.pickupAddress || '';
    el = g('gv-gate-code'); if (el) el.value = data.gateCode || '';
  } catch(e) { console.warn('[IronG CC] loadGlobalVarSettings error:', e); }
}

async function saveGlobalVarSettings() {
  var payload = {
    businessName: (g('gv-biz-name') ? g('gv-biz-name').value.trim() : '') || globalVars.businessName,
    businessPhone: (g('gv-biz-phone') ? g('gv-biz-phone').value.trim() : '') || globalVars.businessPhone,
    pickupAddress: (g('gv-pickup-addr') ? g('gv-pickup-addr').value.trim() : '') || globalVars.pickupAddress,
    gateCode: g('gv-gate-code') ? g('gv-gate-code').value.trim() : (globalVars.gateCode || '')
  };
  try {
    var res = await fetch('/globalvars', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (res.ok) {
      globalVars = Object.assign({}, globalVars, payload);
      if (payload.gateCode) idbPut('gateCode', payload.gateCode).catch(function(){});
      showToast('✓ Settings saved');
    } else { showToast('Save failed'); }
  } catch(e) { showToast('Save failed'); }
}

// ── INIT ─────────────────────────────────────────────
async function initApp() {
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().then(function(g){ console.log('[IronG CC] Persistent storage:', g); });
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js');
  try { db = await openDB(); } catch(e) { console.warn('[IronG CC] IDB unavailable:', e); }

  var lsData = null;
  try { var raw = localStorage.getItem(LS_KEY); if (raw) { var parsed = JSON.parse(raw); if (parsed && parsed.fleet && parsed.fleet.length >= 2) lsData = parsed; } } catch(e) {}
  var idbData = null;
  if (!lsData) {
    try { idbData = await idbGet('state'); } catch(e) {}
    if (idbData && (!idbData.fleet || idbData.fleet.length < 2)) idbData = null;
  }
  if (lsData) { state = lsData; idbPut('state', state).catch(function(){}); console.log('[IronG CC] Loaded ' + (state.rentals.length + state.done.length) + ' items'); }
  else if (idbData) { state = idbData; try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch(e) {} console.log('[IronG CC] Loaded ' + (state.rentals.length + state.done.length) + ' items'); }
  else { state = defaultState(); console.log('[IronG CC] First install — seeding defaults'); save(); }

  if (state.settings) {
    var smap = {'s-biz':'biz','s-own':'own','s-ph':'ph','s-em':'em','s-addr':'addr','s-ca':'ca','s-vm':'vm','s-sq':'sq'};
    for (var sid in smap) { var el = g(sid); if (el && state.settings[smap[sid]]!==undefined) el.value = state.settings[smap[sid]]; }
  }

  var today = new Date().toISOString().split('T')[0];
  ['f-sd','f-ed','qc-sd','qc-ed'].forEach(function(id){ var el = g(id); if (el) el.setAttribute('min',today); });
  history.replaceState({page: 'dashboard'}, '', '');
  updateStats(); drawDashboard(); drawFleet(); showPage('dashboard', true);
  try { var gvRes = await fetch('/globalvars'); if (gvRes.ok) globalVars = await gvRes.json(); } catch(e) {}
  fetchNotifications(); setInterval(fetchNotifications, 60000);
  initPushNotifications();
  // Check OAuth callback in hash
  var hashStr = window.location.hash || '';
  if (hashStr.includes('auth=success')) {
    window.history.replaceState({}, '', '/');
    showToast('✓ Google Drive connected');
    setTimeout(function(){ navTo('settings'); }, 300);
  } else if (hashStr.includes('auth=error')) {
    window.history.replaceState({}, '', '/');
    showToast('Google Drive connection failed — please try again');
    setTimeout(function(){ navTo('settings'); }, 300);
  }
  var authParam = new URLSearchParams(window.location.search).get('auth');
  if (authParam === 'success' && !hashStr.includes('auth=')) {
    window.history.replaceState({}, '', '/');
    showToast('✓ Google Drive connected');
    setTimeout(function(){ navTo('settings'); }, 300);
  } else if (authParam === 'error' && !hashStr.includes('auth=')) {
    window.history.replaceState({}, '', '/');
    showToast('Google Drive connection failed — please try again');
    setTimeout(function(){ navTo('settings'); }, 300);
  }

  var urlParams = new URLSearchParams(window.location.search);
  var paymentStatus = urlParams.get('payment');
  var paymentBookingId = urlParams.get('bookingId');
  if (paymentStatus && paymentBookingId) {
    window.history.replaceState({}, '', '/');
    var payBk = findBookingById(parseInt(paymentBookingId, 10));
    if (paymentStatus === 'success') {
      showToast('✓ Payment received — booking ' + paymentBookingId);
      if (payBk) { state.booking.id = payBk.id; showPage('active-rentals'); }
    } else if (paymentStatus === 'cancelled') {
      showToast('Payment cancelled — resend payment link if needed');
      if (payBk) { state.booking.id = payBk.id; showPage('active-rentals'); }
    }
  }
}

// ── NOTIFICATIONS ─────────────────────────────────────
var notifications = [];
var webhookAlerts = [];
var notifBadgeCount = 0;

async function fetchNotifications() {
  try {
    var notifRes = await fetch('/notifications?handled=false');
    var alertRes = await fetch('/webhook/alerts?handled=false');
    if (notifRes.ok) notifications = await notifRes.json();
    if (alertRes.ok) webhookAlerts = await alertRes.json(); else webhookAlerts = [];
    var urgentCount = webhookAlerts.filter(function(a){ return a.urgent; }).length;
    notifBadgeCount = (Array.isArray(notifications) ? notifications.length : 0) + urgentCount;
    updateNotifBadge();
    if (currentPage === 'notifications') drawNotifications();
  } catch(e) { console.error('[IronG] fetchNotifications error:', e); }
}

function updateNotifBadge() {
  var hb = g('notifHeaderBadge'); var db = g('drawerNotifBadge');
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
  var el = g('nd-' + id); var btn = g('ndb-' + id); if (!el) return;
  var open = el.style.display !== 'none';
  el.style.display = open ? 'none' : 'block';
  if (btn) btn.textContent = open ? 'View Details' : 'Hide Details';
}

async function markHandled(key, id) {
  try {
    var res = await fetch('/notifications/handled', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({id:key})});
    if (!res.ok) { console.error('[IronG] markHandled failed'); return; }
    notifications = notifications.filter(function(n){ return n.id !== id; });
    notifBadgeCount = notifications.length; updateNotifBadge(); drawNotifications();
  } catch(e) { console.error('[IronG] markHandled error:', e); }
}

function notifDetailRow(label, val) {
  return '<div class="notif-field"><span class="notif-label">' + label + '</span><span class="notif-value">' + (val||'—') + '</span></div>';
}

function drawNotifications() {
  var container = g('notifBody'); if (!container) return;
  var urgentAlerts = webhookAlerts.filter(function(a){ return a.urgent; });
  var nonUrgentAlerts = webhookAlerts.filter(function(a){ return !a.urgent; });
  if (!notifications.length && !webhookAlerts.length) {
    container.innerHTML = '<div style="text-align:center;color:var(--muted);padding:40px 20px;font-size:14px;">No new requests. You\'re all caught up.</div>';
    return;
  }
  var h = '';
  urgentAlerts.forEach(function(a) {
    var bkLink = (a.bookingId && a.bookingId !== 'unknown')
      ? '<span style="cursor:pointer;text-decoration:underline;color:var(--white);" onclick="showBooking(\'' + escHtml(String(a.bookingId)) + '\')">#' + escHtml(String(a.bookingId)) + '</span>'
      : '—';
    h += '<div class="notif-card notif-alert-urgent">' +
      '<div class="notif-card-header">' +
        '<span class="notif-type-badge ntb-urgent">⚠️ URGENT</span>' +
        '<div class="notif-name">' + bkLink + '</div>' +
      '</div>' +
      '<div style="font-size:13px;color:var(--text);margin:8px 0;">' + escHtml(a.message||'') + '</div>' +
      '<div class="notif-actions">' +
        (a.type === 'dispute' ? '<button class="btn btn-danger btn-sm" onclick="window.open(\'https://dashboard.stripe.com/disputes\',\'_blank\')">Open Stripe Dashboard</button>' : '') +
        '<button class="btn btn-success btn-sm" onclick="markWebhookAlertHandled(\'' + escHtml(a._key||'') + '\')">✓ Mark Handled</button>' +
      '</div>' +
    '</div>';
  });
  if (notifications.length) {
    h += '<div style="font-family:\'Oswald\',sans-serif;font-size:11px;color:var(--muted);letter-spacing:2px;text-transform:uppercase;margin-bottom:10px;">' + notifications.length + ' unhandled request' + (notifications.length>1?'s':'') + '</div>';
    notifications.forEach(function(n) {
      var isRental = n.type === 'rental';
      h += '<div class="notif-card">' +
        '<div class="notif-card-header">' +
          '<span class="notif-type-badge ' + (isRental?'ntb-rental':'ntb-info') + '">' + (isRental?'RENTAL':'INFO') + '</span>' +
          '<div class="notif-name">' + (n.name||'—') + '</div>' +
          '<div class="notif-meta">' + relativeTime(n.receivedAt) + '</div>' +
        '</div>' +
        '<div class="notif-quick">' +
          '<div class="notif-field"><span class="notif-label">Phone</span><a class="notif-phone" href="tel:' + (n.phone||'').replace(/\D/g,'') + '">' + (n.phone||'—') + '</a></div>' +
          '<div class="notif-field"><span class="notif-label">Trailer</span><span class="notif-value">' + (n.trailer||'—') + '</span></div>' +
          '<div class="notif-field"><span class="notif-label">Start Date</span><span class="notif-value">' + (n.startDate||'—') + '</span></div>' +
        '</div>' +
        '<div class="notif-detail" id="nd-' + n.id + '" style="display:none;">' +
          '<div style="height:1px;background:#1a1a1a;margin:12px 0;"></div>' +
          notifDetailRow('Name',n.name) + notifDetailRow('Phone',n.phone) + notifDetailRow('Email',n.email) +
          notifDetailRow('City',n.city) + notifDetailRow('Trailer',n.trailer) + notifDetailRow('Start Date',n.startDate) +
          notifDetailRow('Duration',n.duration) + notifDetailRow('Tow Vehicle',n.towVehicle) +
          notifDetailRow('Hauling',n.hauling) + notifDetailRow('Referral',n.referral) +
          notifDetailRow('Notes',n.notes) + notifDetailRow('Source',n.source) +
          notifDetailRow('Submitted',n.timestamp) + notifDetailRow('Received',n.receivedAt) +
          notifDetailRow('Email Sent',n.emailSent?'Yes':'No') +
        '</div>' +
        '<div class="notif-actions">' +
          '<button class="btn btn-ghost btn-sm" id="ndb-' + n.id + '" onclick="toggleNotifDetail(' + n.id + ')">View Details</button>' +
          '<button class="btn btn-primary btn-sm" onclick="createBookingFromNotif(' + n.id + ')">📋 Create Booking</button>' +
          '<button class="btn btn-success btn-sm" onclick="markHandled(\'submission:' + n.id + '\',' + n.id + ')">✓ Mark Handled</button>' +
        '</div>' +
      '</div>';
    });
  }
  nonUrgentAlerts.forEach(function(a) {
    var bkLink = (a.bookingId && a.bookingId !== 'unknown')
      ? '<span style="cursor:pointer;text-decoration:underline;color:var(--white);" onclick="showBooking(\'' + escHtml(String(a.bookingId)) + '\')">#' + escHtml(String(a.bookingId)) + '</span>'
      : '—';
    h += '<div class="notif-card notif-alert-warn">' +
      '<div class="notif-card-header">' +
        '<span class="notif-type-badge ntb-warn">' + escHtml((a.type||'alert').toUpperCase().replace(/_/g,' ')) + '</span>' +
        '<div class="notif-name">' + bkLink + '</div>' +
      '</div>' +
      '<div style="font-size:13px;color:var(--text);margin:8px 0;">' + escHtml(a.message||'') + '</div>' +
      '<div class="notif-actions">' +
        '<button class="btn btn-success btn-sm" onclick="markWebhookAlertHandled(\'' + escHtml(a._key||'') + '\')">✓ Mark Handled</button>' +
      '</div>' +
    '</div>';
  });
  container.innerHTML = h;
}

async function markWebhookAlertHandled(key) {
  try {
    var res = await fetch('/webhook/alerts/handled', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({key:key})});
    if (!res.ok) { console.error('[IronG] markWebhookAlertHandled failed'); return; }
    webhookAlerts = webhookAlerts.filter(function(a){ return a._key !== key; });
    var urgentCount = webhookAlerts.filter(function(a){ return a.urgent; }).length;
    notifBadgeCount = (Array.isArray(notifications) ? notifications.length : 0) + urgentCount;
    updateNotifBadge(); drawNotifications();
  } catch(e) { console.error('[IronG] markWebhookAlertHandled error:', e); }
}

function showBooking(bookingId) {
  var id = parseInt(bookingId, 10);
  var bk = findBookingById(id);
  if (!bk) { showToast('Booking #' + bookingId + ' not found'); return; }
  state.booking.id = id;
  showPage(bk.status === 'complete' ? 'history' : 'active-rentals');
}

// ── WEB PUSH ─────────────────────────────────────────
var _vapidPublicKey = null;

async function initPushNotifications() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  try {
    var perm = Notification.permission; if (perm === 'denied') return;
    var reg = await navigator.serviceWorker.ready;
    if (perm === 'granted') { await subscribeAndPost(reg); updatePushPrompt(); return; }
    updatePushPrompt();
  } catch(e) { console.error('[IronG] Push init error:', e); }
}

async function getVapidKey() {
  if (_vapidPublicKey) return _vapidPublicKey;
  try { var res = await fetch('/vapid-public-key'); var data = await res.json(); _vapidPublicKey = data.publicKey; } catch(e) { console.error('[IronG] Failed to fetch VAPID key:', e); }
  return _vapidPublicKey;
}

async function subscribeAndPost(reg) {
  var pubKey = await getVapidKey(); if (!pubKey) return;
  var sub = await reg.pushManager.subscribe({userVisibleOnly:true, applicationServerKey:urlB64ToUint8Array(pubKey)});
  await fetch('/push/subscribe', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(sub.toJSON())});
  try { localStorage.setItem('ironG_pushSub', '1'); } catch(e) {}
}

async function enablePushNotifications() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  try {
    var perm = await Notification.requestPermission(); if (perm !== 'granted') { updatePushPrompt(); return; }
    var reg = await navigator.serviceWorker.ready; await subscribeAndPost(reg); updatePushPrompt();
  } catch(e) { console.error('[IronG] Enable push error:', e); }
}

function updatePushPrompt() {
  var banner = g('pushPromptBanner'); if (!banner) return;
  banner.style.display = (Notification.permission === 'default' && 'PushManager' in window) ? 'block' : 'none';
}

function urlB64ToUint8Array(base64String) {
  var padding = '='.repeat((4 - base64String.length % 4) % 4);
  var base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  var rawData = atob(base64); var outputArray = new Uint8Array(rawData.length);
  for (var i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

// ── CREATE BOOKING FROM NOTIFICATION ─────────────────
function createBookingFromNotif(id) {
  var n = null;
  for (var i = 0; i < notifications.length; i++) { if (notifications[i].id === id) { n = notifications[i]; break; } }
  if (!n) return;

  loadAllDrafts(function(drafts) {
    // Check if a draft for this notification already exists
    for (var i = 0; i < drafts.length; i++) {
      if (drafts[i].notificationId === id) { resumeDraftById(drafts[i].id); return; }
    }
    // No match — create new draft with notification data
    if (drafts.length >= 10) { showToast('Maximum drafts reached. Complete or delete a draft first.'); showPage('drafts'); return; }
    var nameParts = (n.name || '').trim().split(/\s+/);
    var trailerId = '';
    if (n.trailer) { var tl = n.trailer.toLowerCase(); if (tl.includes('utility')) trailerId = 'utility'; else if (tl.includes('hauler')) trailerId = 'hauler'; }
    var now = new Date().toISOString();
    var newId = Date.now();
    _currentDraftId = newId;
    _currentDraftCreatedAt = now;
    _highestStepReached = 1;
    var draft = {
      id: newId, step: 1, createdAt: now, updatedAt: now,
      notificationId: id,
      fields: {
        fn: nameParts[0]||'', ln: nameParts.slice(1).join(' ')||'',
        ph: n.phone||'', em: n.email||'', cy: n.city||'', vh: n.towVehicle||'',
        comm: 'text', contactPref: 'sms', tr: trailerId,
        sd: n.startDate||'', st: '', ed: '', et: '',
        dep: '', ld: n.hauling||'', src: n.referral||'', nt: n.notes||'', addOns: []
      },
      pricing: null
    };
    idbPut('draft:' + newId, draft).catch(function(){});
    window._pendingBookingNotifKey = { key: 'submission:' + n.id, id: n.id };
    _applyDraftToForm(draft);
    showPage('new-booking');
    goStep(1, true);
  });
}

// ── AVAILABILITY CALENDAR (FLEET PAGE) ───────────────
async function drawFleetAvailability(tid) {
  var div = g('avail-cal-' + tid); if (!div) return;
  try {
    var res1 = fetch('/availability/' + tid);
    var res2 = fetch('/availability/next/' + tid);
    var r1 = await res1, r2 = await res2;
    var ranges = r1.ok ? await r1.json() : [];
    var nextData = r2.ok ? await r2.json() : null;
    if (!Array.isArray(ranges)) ranges = [];
    var calHtml = buildAvailCalendarHtml(ranges);
    var nextTxt = '';
    if (nextData && nextData.nextAvailableFormatted) {
      var today = new Date().toISOString().slice(0,10);
      nextTxt = nextData.nextAvailable === today
        ? '<div class="avail-next" style="color:var(--success);">Available now</div>'
        : '<div class="avail-next">Next available: ' + escHtml(nextData.nextAvailableFormatted) + '</div>';
    }
    div.innerHTML =
      '<div class="fc-label" style="margin-bottom:8px;">Availability</div>' +
      (ranges.length === 0 ? '<div style="font-size:12px;color:var(--success);margin-bottom:6px;">Available now</div>' : '') +
      calHtml + nextTxt;
  } catch(e) {
    div.innerHTML = '<div class="fc-label">Availability</div><div style="font-size:12px;color:var(--muted);">Unable to load</div>';
  }
}

function buildAvailCalendarHtml(ranges) {
  var today = new Date(); today.setHours(0,0,0,0);
  var todayStr = today.getFullYear() + '-' + _p2(today.getMonth()+1) + '-' + _p2(today.getDate());
  var html = '';
  for (var m = 0; m < 2; m++) {
    var ms = new Date(today.getFullYear(), today.getMonth() + m, 1);
    var yr = ms.getFullYear(), mo = ms.getMonth();
    var mName = ms.toLocaleDateString('en-US', {month:'long', year:'numeric'});
    var firstDow = ms.getDay();
    var daysInMo = new Date(yr, mo+1, 0).getDate();
    html += '<div class="avail-cal"><div class="avail-cal-header">' + mName + '</div><div class="avail-cal-grid">';
    ['Su','Mo','Tu','We','Th','Fr','Sa'].forEach(function(d){ html += '<div class="avail-day-hdr">' + d + '</div>'; });
    for (var b = 0; b < firstDow; b++) html += '<div class="avail-day avail-empty"></div>';
    for (var dy = 1; dy <= daysInMo; dy++) {
      var ds = yr + '-' + _p2(mo+1) + '-' + _p2(dy);
      var isBooked = ranges.some(function(r){ return ds >= r.startDate && ds <= r.endDate; });
      var isPast = ds < todayStr;
      var isToday = ds === todayStr;
      var cls = 'avail-day';
      if (isBooked) cls += ' avail-booked';
      else if (isPast) cls += ' avail-past';
      if (isToday) cls += ' avail-today';
      html += '<div class="' + cls + '">' + dy + '</div>';
    }
    html += '</div></div>';
  }
  return html;
}

function _p2(n) { return n < 10 ? '0' + n : '' + n; }

// ── STEP 2 — CONFLICT DETECTION ──────────────────────
var _conflictCheckTid = '';
var _conflictRanges = null;
var _conflictFetching = false;

function checkBookingConflict(tid, sd, ed) {
  var banner = g('avail-conflict-banner');
  var nextBtn = g('step2-next-btn');
  if (!banner) return;
  if (!tid || !sd || !ed || sd >= ed) {
    banner.style.display = 'none';
    if (nextBtn) nextBtn.disabled = false;
    return;
  }
  // If tid changed, clear cached ranges and re-fetch
  if (tid !== _conflictCheckTid) {
    _conflictCheckTid = tid;
    _conflictRanges = null;
    _conflictFetching = false;
  }
  if (_conflictFetching) return;
  if (_conflictRanges !== null) {
    _applyConflictCheck(sd, ed, _conflictRanges, banner, nextBtn);
    return;
  }
  _conflictFetching = true;
  fetch('/availability/' + tid).then(function(res) {
    if (!res.ok) throw new Error('fetch error');
    return res.json();
  }).then(function(ranges) {
    _conflictFetching = false;
    _conflictRanges = Array.isArray(ranges) ? ranges : [];
    var curSd = g('f-sd') ? g('f-sd').value : '';
    var curEd = g('f-ed') ? g('f-ed').value : '';
    _applyConflictCheck(curSd, curEd, _conflictRanges, banner, nextBtn);
  }).catch(function() {
    _conflictFetching = false;
    banner.style.display = '';
    banner.className = 'avail-conflict-banner avail-conflict-caution';
    banner.textContent = 'Unable to verify availability — proceed with caution';
    if (nextBtn) nextBtn.disabled = false;
  });
}

function _applyConflictCheck(sd, ed, ranges, banner, nextBtn) {
  if (!sd || !ed || sd >= ed) { banner.style.display = 'none'; if (nextBtn) nextBtn.disabled = false; return; }
  var conflict = null;
  for (var i = 0; i < ranges.length; i++) {
    var r = ranges[i];
    if (r.startDate && r.endDate && sd < r.endDate && ed > r.startDate) { conflict = r; break; }
  }
  if (conflict) {
    banner.style.display = '';
    banner.className = 'avail-conflict-banner avail-conflict-warn';
    banner.textContent = '⚠️ This trailer is already booked ' + conflict.startDate + ' – ' + conflict.endDate + '. Please choose different dates.';
    if (nextBtn) nextBtn.disabled = true;
  } else {
    banner.style.display = '';
    banner.className = 'avail-conflict-banner avail-conflict-ok';
    banner.textContent = '✓ Dates available';
    if (nextBtn) nextBtn.disabled = false;
  }
}

// ── STEP 2 — NEXT AVAILABLE HELPER ───────────────────
async function updateNextAvailableHelper(tid) {
  var el = g('avail-next-helper'); if (!el) return;
  if (!tid) { el.style.display = 'none'; return; }
  el.style.display = '';
  el.textContent = 'Checking availability...';
  try {
    var res = await fetch('/availability/next/' + tid);
    if (!res.ok) throw new Error('fetch error');
    var data = await res.json();
    var today = new Date().toISOString().slice(0,10);
    if (data.nextAvailable === today) {
      el.style.color = 'var(--success)';
      el.textContent = 'Available now';
    } else {
      el.style.color = 'var(--muted)';
      el.textContent = 'Next available: ' + (data.nextAvailableFormatted || data.nextAvailable);
    }
  } catch(e) {
    el.style.display = 'none';
  }
}

initApp();

// ── TRAILER NAMES ─────────────────────────────────────

async function loadTrailerNames() {
  try {
    var res = await fetch('/trailers');
    if (res.ok) {
      var arr = await res.json();
      _maintenanceTrailers = arr;
      _trailerNames = {};
      arr.forEach(function(t){
        _trailerNames[t.id] = t.name;
        idbPut('trailer:' + t.id + ':name', t.name).catch(function(){});
      });
      populateTrailerDropdown();
      return;
    }
  } catch(e) {}
  _maintenanceTrailers = [{id:'utility',name:'Utility Trailer'},{id:'hauler',name:'Car Hauler'}];
  _trailerNames = {utility:'Utility Trailer',hauler:'Car Hauler'};
  populateTrailerDropdown();
}

function populateTrailerDropdown() {
  var sel = g('f-tr'); if (!sel) return;
  var cur = sel.value;
  var html = '<option value="">— Select —</option>';
  _maintenanceTrailers.forEach(function(t){
    html += '<option value="' + escHtml(t.id) + '"' + (t.id === cur ? ' selected' : '') + '>' + escHtml(_trailerNames[t.id] || t.name) + '</option>';
  });
  sel.innerHTML = html;
}

function editTrailerName(tid) {
  var row = g('fcname-' + tid); if (!row) return;
  var current = (_trailerNames[tid] || '');
  row.innerHTML =
    '<input class="fi" id="fcname-inp-' + tid + '" type="text" value="' + escHtml(current) + '" style="flex:1;font-family:\'Oswald\',sans-serif;font-size:15px;font-weight:700;text-transform:uppercase;letter-spacing:1px;" placeholder="Trailer name">' +
    '<button class="btn btn-primary btn-sm" onclick="saveTrailerName(\'' + tid + '\')">Save</button>' +
    '<button class="btn btn-ghost btn-sm" onclick="cancelTrailerNameEdit(\'' + tid + '\')">Cancel</button>';
  var inp = g('fcname-inp-' + tid); if (inp) inp.focus();
}

async function saveTrailerName(tid) {
  var inp = g('fcname-inp-' + tid); if (!inp) return;
  var name = inp.value.trim(); if (!name) { showToast('Enter a name'); return; }
  try {
    var res = await fetch('/trailers/' + tid + '/name', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({name: name})
    });
    if (!res.ok) throw new Error('save failed');
    _trailerNames[tid] = name;
    var idx = _maintenanceTrailers.findIndex(function(t){ return t.id === tid; });
    if (idx >= 0) _maintenanceTrailers[idx].name = name;
    idbPut('trailer:' + tid + ':name', name).catch(function(){});
    populateTrailerDropdown();
    var row = g('fcname-' + tid);
    if (row) row.innerHTML =
      '<div class="fc-name-display" id="fcname-disp-' + tid + '" onclick="editTrailerName(\'' + tid + '\')" style="cursor:pointer;">' + escHtml(name) + '</div>';
    showToast('Trailer name updated');
  } catch(e) { showToast('Failed to save name'); }
}

async function cancelTrailerNameEdit(tid) {
  var row = g('fcname-' + tid); if (!row) return;
  var name = _trailerNames[tid] || '';
  row.innerHTML =
    '<div class="fc-name-display" id="fcname-disp-' + tid + '" onclick="editTrailerName(\'' + tid + '\')" style="cursor:pointer;">' + escHtml(name) + '</div>';
}

// ── MAINTENANCE PAGE ──────────────────────────────────

async function drawMaintenancePage() {
  var page = g('page-maintenance'); if (!page) return;
  await loadTrailerNames();
  if (!_currentMaintTrailerId) _currentMaintTrailerId = 'all';
  var tabHtml = '<button class="maint-tab' + (_currentMaintTrailerId === 'all' ? ' active' : '') + '" onclick="selectMaintTrailer(\'all\')">All</button>';
  tabHtml += _maintenanceTrailers.map(function(t){
    var active = t.id === _currentMaintTrailerId ? ' active' : '';
    return '<button class="maint-tab' + active + '" onclick="selectMaintTrailer(\'' + t.id + '\')">' + escHtml(t.name) + '</button>';
  }).join('');
  page.innerHTML =
    '<div class="maint-page-header">' +
      '<button class="btn btn-ghost btn-sm" onclick="toggleMaintAnalytics()">📊 Analytics</button>' +
      '<div class="maint-export-group">' +
        '<button class="btn btn-ghost btn-sm" onclick="exportMaintenanceCSV()">⬇ CSV</button>' +
        '<button class="btn btn-ghost btn-sm" onclick="printMaintenanceLog()">🖨 Print</button>' +
      '</div>' +
    '</div>' +
    '<div id="maint-analytics-section" class="maint-analytics-section" style="display:none;"></div>' +
    '<div id="maint-tab-bar" class="maint-tab-bar">' + tabHtml + '</div>' +
    '<div id="maint-records-body"></div>';
  await loadMaintenanceRecords(_currentMaintTrailerId);
}

async function selectMaintTrailer(tid) {
  _currentMaintTrailerId = tid;
  var tabBar = g('maint-tab-bar');
  if (tabBar) {
    var tabHtml = '<button class="maint-tab' + (tid === 'all' ? ' active' : '') + '" onclick="selectMaintTrailer(\'all\')">All</button>';
    tabHtml += _maintenanceTrailers.map(function(t){
      var active = t.id === tid ? ' active' : '';
      return '<button class="maint-tab' + active + '" onclick="selectMaintTrailer(\'' + t.id + '\')">' + escHtml(t.name) + '</button>';
    }).join('');
    tabBar.innerHTML = tabHtml;
  }
  await loadMaintenanceRecords(tid);
}

function loadMaintenanceRecords(tid) {
  var container = g('maint-records-body'); if (!container) return Promise.resolve();
  container.innerHTML = '<div style="color:var(--muted);text-align:center;padding:20px;font-size:13px;">Loading...</div>';
  if (tid === 'all') {
    loadAllMaintenanceRecordsFromIDB(container);
    return Promise.resolve();
  }
  return new Promise(function(resolve) {
    var hasIdbData = false;
    idbListPrefix('maintenance:' + tid + ':', function(items) {
      var idbRecords = items.map(function(i){ return i.value; }).filter(Boolean);
      idbRecords.sort(function(a, b){ return (b.date||'').localeCompare(a.date||''); });
      if (idbRecords.length) {
        hasIdbData = true;
        _maintenanceRecordsCache[tid] = idbRecords;
        renderMaintenanceRecords(idbRecords, tid, container);
      }
      fetch('/maintenance/' + tid).then(function(res) {
        if (!res.ok) throw new Error('fetch error');
        return res.json();
      }).then(function(records) {
        _maintenanceRecordsCache[tid] = records;
        records.forEach(function(r) {
          var stored = Object.assign({}, r, {trailerId: tid});
          idbPut('maintenance:' + tid + ':' + r.id, stored).catch(function(){});
        });
        renderMaintenanceRecords(records, tid, container);
        resolve();
      }).catch(function() {
        if (!hasIdbData) {
          container.innerHTML = '<div style="color:var(--danger);text-align:center;padding:20px;font-size:13px;">Failed to load records.</div>';
        }
        resolve();
      });
    });
  });
}

function loadAllMaintenanceRecordsFromIDB(container) {
  var allRecords = [];
  var trailers = _maintenanceTrailers;
  var pending = trailers.length;
  if (!pending) {
    _maintenanceRecordsCache['all'] = [];
    renderMaintenanceRecords([], 'all', container);
    return;
  }
  trailers.forEach(function(t) {
    idbListPrefix('maintenance:' + t.id + ':', function(items) {
      var recs = items.map(function(i){ return i.value; }).filter(Boolean);
      recs.forEach(function(r){ if (!r.trailerId) r.trailerId = t.id; });
      allRecords = allRecords.concat(recs);
      pending--;
      if (pending === 0) {
        allRecords.sort(function(a, b){ return (b.date||'').localeCompare(a.date||''); });
        _maintenanceRecordsCache['all'] = allRecords;
        renderMaintenanceRecords(allRecords, 'all', container);
      }
    });
  });
}

function fmtDateLong(dateStr) {
  if (!dateStr) return '—';
  var d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', {month:'long', day:'numeric', year:'numeric'});
}

function renderMaintenanceRecords(records, tid, container) {
  if (!records.length) {
    container.innerHTML = '<div style="text-align:center;color:var(--muted);padding:40px 20px;font-size:14px;">No maintenance records yet. Tap + Add Record to get started.</div>';
    return;
  }
  var today = new Date().toISOString().slice(0,10);
  var soonDate = new Date(); soonDate.setDate(soonDate.getDate() + 30);
  var soonStr = soonDate.toISOString().slice(0,10);
  var h = '';
  records.forEach(function(r) {
    var cardTid = (tid === 'all' && r.trailerId) ? r.trailerId : tid;
    var totalCost = parseFloat(r.totalCost) || ((parseFloat(r.laborCost)||0) + (parseFloat(r.partsCost)||0));
    var nextDueHtml = '';
    if (r.nextServiceDue) {
      var cls = r.nextServiceDue < today ? 'maint-next-overdue' : (r.nextServiceDue <= soonStr ? 'maint-next-soon' : 'maint-next-ok');
      nextDueHtml = '<span class="maint-next-due ' + cls + '">Next: ' + escHtml(fmtDateLong(r.nextServiceDue)) + '</span>';
    }
    var thumbHtml = r.receiptImage ? '<div style="margin-bottom:8px;"><img src="' + escHtml(r.receiptImage) + '" class="receipt-thumb" onclick="event.stopPropagation();viewReceiptFull(\'' + escHtml(r.id) + '\',\'' + cardTid + '\')" alt="Receipt"></div>' : '';
    var serviceLabel = r.serviceType === 'Custom' && r.customType ? r.customType : (r.serviceType || '');
    var vendorDisplay = '';
    if (r.performedBy && r.performedBy.toLowerCase() === 'self') { vendorDisplay = 'Self'; }
    else if (r.vendorName || r.vendor) { vendorDisplay = r.vendorName || r.vendor; }
    h += '<div class="maint-record-card" id="mrc-' + r.id + '">' +
      '<div onclick="toggleMaintDetail(\'' + r.id + '\',\'' + cardTid + '\')" style="cursor:pointer;">' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;gap:10px;">' +
          '<div>' +
            '<div style="font-size:12px;color:var(--muted);font-family:\'Oswald\',sans-serif;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px;">' + escHtml(fmtDateLong(r.date)) + '</div>' +
            (serviceLabel ? '<span class="maint-stype-badge">' + escHtml(serviceLabel) + '</span>' : '') +
          '</div>' +
          '<div class="maint-cost">$' + totalCost.toFixed(2) + '</div>' +
        '</div>' +
        (vendorDisplay ? '<div style="font-size:13px;color:var(--text);margin-bottom:6px;">' + escHtml(vendorDisplay) + '</div>' : '') +
        (nextDueHtml ? '<div style="margin-bottom:8px;">' + nextDueHtml + '</div>' : '') +
        thumbHtml +
        '<div id="mrd-' + r.id + '" class="maint-record-detail"></div>' +
      '</div>' +
      '<div style="display:flex;gap:8px;margin-top:10px;padding-top:10px;border-top:1px solid #1a1a1a;flex-wrap:wrap;">' +
        '<button class="btn btn-ghost btn-sm" onclick="editMaintenanceRecord(\'' + cardTid + '\',\'' + r.id + '\')">Edit</button>' +
        '<button class="btn btn-danger btn-sm" onclick="deleteMaintenanceRecord(\'' + cardTid + '\',\'' + r.id + '\')">Delete</button>' +
      '</div>' +
    '</div>';
  });
  container.innerHTML = h;
}

function toggleMaintDetail(id, tid) {
  var el = g('mrd-' + id); if (!el) return;
  var open = el.classList.contains('open');
  if (open) { el.classList.remove('open'); return; }
  var records = _maintenanceRecordsCache[tid] || _maintenanceRecordsCache['all'] || [];
  var r = null; for (var i = 0; i < records.length; i++) { if (records[i].id === id) { r = records[i]; break; } }
  if (!r) return;
  el.innerHTML =
    crow('Description', r.description) +
    crow('Parts Used', r.partsUsed) +
    crow('Performed By', r.performedBy) +
    crow('Vendor', r.vendorName || r.vendor) +
    crow('Vendor Phone', r.vendorPhone) +
    crow('Invoice Ref', r.invoiceRef) +
    crow('Labor Cost', r.laborCost ? '$' + r.laborCost : null) +
    crow('Parts Cost', r.partsCost ? '$' + r.partsCost : null) +
    crow('Total Cost', r.totalCost ? '$' + r.totalCost : null) +
    crow('Next Service Due', r.nextServiceDue ? fmtDateLong(r.nextServiceDue) : null) +
    crow('Rental Count', r.rentalCountAtService) +
    crow('Notes', r.notes) +
    crow('Created At', r.createdAt ? new Date(r.createdAt).toLocaleString() : null);
  el.classList.add('open');
}

function crow(label, val) {
  if (!val) return '';
  return '<div class="rental-field"><span class="rental-label">' + escHtml(label) + '</span><span class="rental-value" style="text-align:right;max-width:65%;word-break:break-word;">' + escHtml(String(val)) + '</span></div>';
}

function viewReceiptFull(id, tid) {
  var records = _maintenanceRecordsCache[tid] || _maintenanceRecordsCache['all'] || [];
  var r = null; for (var i = 0; i < records.length; i++) { if (records[i].id === id) { r = records[i]; break; } }
  if (!r || !r.receiptImage) return;
  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.9);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;';
  overlay.onclick = function(){ document.body.removeChild(overlay); };
  overlay.innerHTML = '<img src="' + escHtml(r.receiptImage) + '" style="max-width:100%;max-height:90vh;border-radius:4px;">';
  document.body.appendChild(overlay);
}

async function editMaintenanceRecord(tid, id) {
  var records = _maintenanceRecordsCache[tid] || _maintenanceRecordsCache['all'] || [];
  var r = null; for (var i = 0; i < records.length; i++) { if (records[i].id === id) { r = records[i]; break; } }
  if (!r) return;
  _editingMaintenanceRecord = r;
  await openMaintenanceRecordForm(tid, r);
}

async function deleteMaintenanceRecord(tid, id) {
  if (!confirm('Delete this maintenance record? This cannot be undone.')) return;
  try {
    var res = await fetch('/maintenance/' + tid + '/' + id, {method:'DELETE'});
    if (!res.ok) throw new Error('delete failed');
    idbDelete('maintenance:' + tid + ':' + id).catch(function(){});
    if (_maintenanceRecordsCache[tid]) {
      _maintenanceRecordsCache[tid] = _maintenanceRecordsCache[tid].filter(function(r){ return r.id !== id; });
    }
    if (_maintenanceRecordsCache['all']) {
      _maintenanceRecordsCache['all'] = _maintenanceRecordsCache['all'].filter(function(r){ return r.id !== id; });
    }
    var container = g('maint-records-body');
    if (container) renderMaintenanceRecords(_maintenanceRecordsCache[_currentMaintTrailerId] || [], _currentMaintTrailerId, container);
    showToast('Record deleted');
  } catch(e) { showToast('Delete failed'); }
}

async function openNewMaintenanceRecord() {
  _editingMaintenanceRecord = null;
  _pendingReceiptImage = null;
  await openMaintenanceRecordForm(_currentMaintTrailerId, null);
}

async function openMaintenanceRecordForm(tid, record) {
  _editingMaintenanceRecord = record || null;
  _pendingReceiptImage = null;
  _totalCostOverride = false;
  var r = record || {};
  var isEdit = !!record;
  var types = await getServiceTypes();
  var today = new Date().toISOString().slice(0,10);

  var selectedTid = isEdit ? (r.trailerId || tid) : (tid !== 'all' ? tid : '');
  var trailerOptions = '<option value="">— Select Trailer —</option>' +
    _maintenanceTrailers.map(function(t){
      return '<option value="' + escHtml(t.id) + '"' + (t.id === selectedTid ? ' selected' : '') + '>' + escHtml(_trailerNames[t.id] || t.name) + '</option>';
    }).join('');

  var typeOptions = '<option value="">— Select —</option>' + types.map(function(t){
    return '<option value="' + escHtml(t) + '"' + (t === (r.serviceType || '') ? ' selected' : '') + '>' + escHtml(t) + '</option>';
  }).join('');

  var showCustom = (r.serviceType === 'Custom') ? '' : 'none';
  var laborVal = r.laborCost != null ? String(r.laborCost) : '0';
  var partsVal = r.partsCost != null ? String(r.partsCost) : '0';
  var totalVal = r.totalCost != null ? String(r.totalCost) : String((parseFloat(laborVal)||0)+(parseFloat(partsVal)||0));

  var pbVal = (r.performedBy === 'Vendor') ? 'Vendor' : 'Self';
  _maintPerformedBy = pbVal;

  var thumbHtml = r.receiptImage
    ? '<div id="receipt-thumb-wrap" style="margin-top:8px;display:flex;align-items:center;gap:8px;"><img id="receipt-thumb-preview" src="' + escHtml(r.receiptImage) + '" class="receipt-thumb"><button class="btn btn-ghost btn-sm" id="receipt-remove-btn" onclick="removeReceiptImage()" type="button">× Remove</button></div>'
    : '<div id="receipt-thumb-wrap" style="margin-top:8px;display:none;flex-direction:row;align-items:center;gap:8px;"><img id="receipt-thumb-preview" src="" class="receipt-thumb" style="display:none;"><button class="btn btn-ghost btn-sm" id="receipt-remove-btn" onclick="removeReceiptImage()" type="button" style="display:none;">× Remove</button></div>';

  var html =
    '<div class="fg"><label class="fl">Trailer *</label>' +
      '<select class="form-select" id="mf-trailer">' + trailerOptions + '</select>' +
      '<div class="maint-field-error" id="mf-err-trailer">Select a trailer</div>' +
    '</div>' +

    '<div class="fg"><label class="fl">Service Date *</label>' +
      '<input class="fi" id="mf-date" type="date" value="' + escHtml(r.date || today) + '">' +
      '<div class="maint-field-error" id="mf-err-date">Service date is required</div>' +
    '</div>' +

    '<div class="fg"><label class="fl">Service Type *</label>' +
      '<div style="display:flex;gap:8px;align-items:center;">' +
        '<select class="form-select" id="mf-service-type" onchange="onServiceTypeChange()" style="flex:1;">' + typeOptions + '</select>' +
        '<button class="btn btn-ghost btn-sm" onclick="openManageServiceTypes()" type="button">Manage</button>' +
      '</div>' +
      '<div class="maint-field-error" id="mf-err-service-type">Select a service type</div>' +
    '</div>' +

    '<div id="mf-custom-type-row" class="fg" style="display:' + showCustom + ';">' +
      '<label class="fl">Custom Type *</label>' +
      '<input class="fi" id="mf-custom-type" type="text" value="' + escHtml(r.customType || '') + '" placeholder="Describe service type">' +
      '<div class="maint-field-error" id="mf-err-custom-type">Custom type is required</div>' +
    '</div>' +

    '<div id="stype-manage-area" style="display:none;"></div>' +

    '<div class="fg"><label class="fl">Description *</label>' +
      '<textarea class="fi form-textarea" id="mf-description" rows="3" placeholder="What was done?">' + escHtml(r.description || '') + '</textarea>' +
      '<div class="maint-field-error" id="mf-err-description">Description is required</div>' +
    '</div>' +

    '<div class="fg"><label class="fl">Parts Used</label>' +
      '<input class="fi" id="mf-parts-used" type="text" value="' + escHtml(r.partsUsed || '') + '" placeholder="Part numbers, descriptions...">' +
    '</div>' +

    '<div class="fg"><label class="fl">Labor Cost</label>' +
      '<div class="maint-cost-row"><span class="maint-cost-prefix">$</span>' +
        '<input class="fi" id="mf-labor" type="number" min="0" step="0.01" value="' + escHtml(laborVal) + '" oninput="calcMaintenanceTotalCost()" style="flex:1;">' +
      '</div>' +
    '</div>' +

    '<div class="fg"><label class="fl">Parts Cost</label>' +
      '<div class="maint-cost-row"><span class="maint-cost-prefix">$</span>' +
        '<input class="fi" id="mf-parts" type="number" min="0" step="0.01" value="' + escHtml(partsVal) + '" oninput="calcMaintenanceTotalCost()" style="flex:1;">' +
      '</div>' +
    '</div>' +

    '<div class="fg">' +
      '<div class="maint-total-header"><label class="fl">Total Cost</label>' +
        '<button id="mf-total-toggle" class="btn btn-ghost btn-sm" onclick="toggleTotalCostOverride()" type="button" style="font-size:10px;padding:3px 8px;">Override</button>' +
      '</div>' +
      '<div class="maint-cost-row"><span class="maint-cost-prefix">$</span>' +
        '<input class="fi" id="mf-total" type="number" min="0" step="0.01" value="' + escHtml(totalVal) + '" readonly style="flex:1;background:#111;color:var(--muted);">' +
      '</div>' +
    '</div>' +

    '<div class="fg"><label class="fl">Vendor Name</label>' +
      '<input class="fi" id="mf-vendor" type="text" value="' + escHtml(r.vendorName || r.vendor || '') + '">' +
    '</div>' +

    '<div class="fg"><label class="fl">Vendor Phone</label>' +
      '<input class="fi" id="mf-vendor-phone" type="tel" value="' + escHtml(r.vendorPhone || '') + '">' +
    '</div>' +

    '<div class="fg"><label class="fl">Invoice / Receipt #</label>' +
      '<input class="fi" id="mf-invoice-ref" type="text" value="' + escHtml(r.invoiceRef || '') + '">' +
    '</div>' +

    '<div class="fg"><label class="fl">Performed By</label>' +
      '<div class="maint-pill-toggle">' +
        '<button class="maint-pill-opt' + (pbVal === 'Self' ? ' active' : '') + '" id="mpb-self" onclick="setPerformedBy(\'Self\')" type="button">Self</button>' +
        '<button class="maint-pill-opt' + (pbVal === 'Vendor' ? ' active' : '') + '" id="mpb-vendor" onclick="setPerformedBy(\'Vendor\')" type="button">Vendor</button>' +
      '</div>' +
    '</div>' +

    '<div class="fg"><label class="fl">Next Service Due</label>' +
      '<input class="fi" id="mf-next-due" type="date" value="' + escHtml(r.nextServiceDue || '') + '">' +
    '</div>' +

    '<div class="fg"><label class="fl">Notes</label>' +
      '<textarea class="fi form-textarea" id="mf-notes" rows="3">' + escHtml(r.notes || '') + '</textarea>' +
    '</div>' +

    '<div class="fg"><label class="fl">Rental Count at Service</label>' +
      '<input class="fi" id="mf-rental-count" type="number" min="0" value="' + escHtml(r.rentalCountAtService != null ? String(r.rentalCountAtService) : '') + '" placeholder="How many rentals on this trailer so far">' +
    '</div>' +

    '<div class="fg"><label class="fl">Receipt Scanner</label>' +
      '<input type="file" id="mf-receipt-input" accept="image/*" capture="camera" style="display:none;" onchange="scanReceiptImage(this)">' +
      '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">' +
        '<button class="btn btn-ghost btn-sm" onclick="g(\'mf-receipt-input\').click()" type="button">📷 Scan Receipt</button>' +
        '<span id="scan-receipt-status" style="font-size:12px;color:var(--muted);display:none;"></span>' +
      '</div>' +
      thumbHtml +
    '</div>' +

    '<button class="btn btn-primary" id="maint-save-btn" onclick="saveMaintenanceRecord()" style="width:100%;padding:14px;font-size:14px;letter-spacing:2px;margin-top:8px;" type="button">Save Record</button>';

  var titleEl = g('maint-panel-title');
  if (titleEl) titleEl.textContent = isEdit ? 'Edit Record' : 'New Record';
  var panelBody = g('maint-panel-body');
  if (panelBody) panelBody.innerHTML = html;
  openMaintPanel();
}

function openMaintPanel() {
  var overlay = g('maint-panel-overlay');
  var panel = g('maint-slide-panel');
  if (overlay) overlay.classList.add('open');
  if (panel) panel.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeMaintPanel() {
  var overlay = g('maint-panel-overlay');
  var panel = g('maint-slide-panel');
  if (overlay) overlay.classList.remove('open');
  if (panel) panel.classList.remove('open');
  document.body.style.overflow = '';
  _editingMaintenanceRecord = null;
  _pendingReceiptImage = null;
  _totalCostOverride = false;
  _maintPerformedBy = 'Self';
}

function setPerformedBy(val) {
  _maintPerformedBy = val;
  var selfBtn = g('mpb-self'), vendorBtn = g('mpb-vendor');
  if (selfBtn) selfBtn.classList.toggle('active', val === 'Self');
  if (vendorBtn) vendorBtn.classList.toggle('active', val === 'Vendor');
}

function toggleTotalCostOverride() {
  _totalCostOverride = !_totalCostOverride;
  var inp = g('mf-total'), btn = g('mf-total-toggle');
  if (_totalCostOverride) {
    if (inp) { inp.removeAttribute('readonly'); inp.style.background = ''; inp.style.color = ''; inp.focus(); }
    if (btn) btn.textContent = 'Auto';
  } else {
    if (inp) { inp.setAttribute('readonly', ''); inp.style.background = '#111'; inp.style.color = 'var(--muted)'; }
    if (btn) btn.textContent = 'Override';
    calcMaintenanceTotalCost();
  }
}

function onServiceTypeChange() {
  var sel = g('mf-service-type'); if (!sel) return;
  var row = g('mf-custom-type-row');
  if (row) row.style.display = sel.value === 'Custom' ? '' : 'none';
}

function calcMaintenanceTotalCost() {
  if (_totalCostOverride) return;
  var labor = parseFloat(g('mf-labor') ? g('mf-labor').value : 0) || 0;
  var parts = parseFloat(g('mf-parts') ? g('mf-parts').value : 0) || 0;
  var tot = g('mf-total');
  if (tot) tot.value = (labor + parts).toFixed(2);
}

// ── SERVICE TYPE MANAGEMENT ───────────────────────────

async function getServiceTypes() {
  if (_serviceTypes !== null) return _serviceTypes;
  var stored = await idbGet('maintenance:serviceTypes').catch(function(){ return null; });
  _serviceTypes = (Array.isArray(stored) && stored.length) ? stored : DEFAULT_SERVICE_TYPES.slice();
  return _serviceTypes;
}

async function saveServiceTypesToIDB(types) {
  _serviceTypes = types;
  await idbPut('maintenance:serviceTypes', types).catch(function(){});
}

function openManageServiceTypes() {
  var area = g('stype-manage-area'); if (!area) return;
  if (area.style.display !== 'none') { area.style.display = 'none'; return; }
  area.style.display = 'block';
  renderServiceTypeManager();
}

async function renderServiceTypeManager() {
  var area = g('stype-manage-area'); if (!area) return;
  var types = await getServiceTypes();
  var h = '<div class="stype-manage-panel"><div style="font-family:\'Oswald\',sans-serif;font-size:10px;color:var(--muted);letter-spacing:2px;text-transform:uppercase;margin-bottom:10px;">Manage Service Types</div>';
  types.forEach(function(t) {
    var isBuiltIn = DEFAULT_SERVICE_TYPES.indexOf(t) >= 0;
    h += '<div class="stype-item"><span style="font-size:13px;color:var(--text);">' + escHtml(t) + '</span>';
    if (isBuiltIn) {
      h += '<span style="font-size:10px;color:var(--muted);">built-in</span>';
    } else {
      h += '<button class="btn btn-ghost btn-sm" onclick="removeServiceType(\'' + escHtml(t).replace(/\\/g,'\\\\').replace(/'/g,"\\'") + '\')" style="padding:2px 6px;font-size:10px;">✕</button>';
    }
    h += '</div>';
  });
  h += '<div style="display:flex;gap:8px;margin-top:10px;padding-top:10px;border-top:1px solid #1a1a1a;">' +
    '<input class="fi" id="new-stype-input" type="text" placeholder="Add new service type..." style="flex:1;">' +
    '<button class="btn btn-primary btn-sm" onclick="addServiceType()">Add</button>' +
  '</div>' +
  '<button class="btn btn-ghost btn-sm" onclick="openManageServiceTypes()" style="width:100%;margin-top:8px;">Done</button>' +
  '</div>';
  area.innerHTML = h;
}

async function addServiceType() {
  var inp = g('new-stype-input'); if (!inp) return;
  var val = inp.value.trim(); if (!val) return;
  var types = await getServiceTypes();
  if (types.indexOf(val) >= 0) { showToast('Already exists'); return; }
  var customIdx = types.indexOf('Custom');
  if (customIdx >= 0) types.splice(customIdx, 0, val); else types.push(val);
  await saveServiceTypesToIDB(types);
  var sel = g('mf-service-type');
  if (sel) {
    var cur = sel.value;
    sel.innerHTML = '<option value="">— Select —</option>' + types.map(function(t){ return '<option value="' + escHtml(t) + '"' + (t === cur ? ' selected' : '') + '>' + escHtml(t) + '</option>'; }).join('');
  }
  inp.value = '';
  renderServiceTypeManager();
}

async function removeServiceType(name) {
  if (DEFAULT_SERVICE_TYPES.indexOf(name) >= 0) return;
  var types = await getServiceTypes();
  types = types.filter(function(t){ return t !== name; });
  await saveServiceTypesToIDB(types);
  var sel = g('mf-service-type');
  if (sel) {
    var cur = sel.value === name ? '' : sel.value;
    sel.innerHTML = '<option value="">— Select —</option>' + types.map(function(t){ return '<option value="' + escHtml(t) + '"' + (t === cur ? ' selected' : '') + '>' + escHtml(t) + '</option>'; }).join('');
  }
  renderServiceTypeManager();
}

// ── RECEIPT SCANNER ───────────────────────────────────

function scanReceiptImage(input) {
  var file = input.files[0]; if (!file) return;
  var statusEl = g('scan-receipt-status');
  if (statusEl) { statusEl.textContent = 'Reading receipt...'; statusEl.style.color = 'var(--muted)'; statusEl.style.display = ''; }
  var reader = new FileReader();
  reader.onload = function(e) {
    var dataUrl = e.target.result;
    var base64 = dataUrl.split(',')[1];
    var mimeType = file.type || 'image/jpeg';
    _pendingReceiptImage = dataUrl;
    var wrap = g('receipt-thumb-wrap');
    var thumb = g('receipt-thumb-preview');
    var removeBtn = g('receipt-remove-btn');
    if (thumb) { thumb.src = dataUrl; thumb.style.display = 'block'; }
    if (removeBtn) { removeBtn.style.display = 'inline-flex'; }
    if (wrap) { wrap.style.display = 'flex'; }
    fetch('/maintenance/scan-receipt', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({imageBase64: base64, mimeType: mimeType})
    }).then(function(res) {
      if (!res.ok) throw new Error('scan failed');
      return res.json();
    }).then(function(data) {
      function setField(id, val) { var el = g(id); if (el && val != null && String(val).trim()) el.value = val; }
      setField('mf-vendor', data.vendorName);
      setField('mf-vendor-phone', data.vendorPhone);
      setField('mf-invoice-ref', data.invoiceRef);
      if (data.laborCost != null) { setField('mf-labor', data.laborCost); calcMaintenanceTotalCost(); }
      if (data.partsCost != null) { setField('mf-parts', data.partsCost); calcMaintenanceTotalCost(); }
      if (data.totalCost != null) setField('mf-total', data.totalCost);
      var _today = new Date().toISOString().slice(0,10);
      var dateEl = g('mf-date'); if (dateEl && dateEl.value === _today && data.date) dateEl.value = data.date;
      if (data.notes) { var notesEl = g('mf-notes'); if (notesEl) notesEl.value = (notesEl.value ? notesEl.value + '\n' : '') + data.notes; }
      if (statusEl) statusEl.style.display = 'none';
      showToast('✓ Receipt scanned — review and confirm fields');
    }).catch(function() {
      if (statusEl) { statusEl.textContent = 'Could not read receipt — please enter manually'; statusEl.style.color = 'var(--danger)'; }
    });
  };
  reader.readAsDataURL(file);
}

function removeReceiptImage() {
  _pendingReceiptImage = null;
  var thumb = g('receipt-thumb-preview'); if (thumb) { thumb.src = ''; thumb.style.display = 'none'; }
  var removeBtn = g('receipt-remove-btn'); if (removeBtn) removeBtn.style.display = 'none';
  var wrap = g('receipt-thumb-wrap'); if (wrap) wrap.style.display = 'none';
  var inp = g('mf-receipt-input'); if (inp) inp.value = '';
  if (_editingMaintenanceRecord) _editingMaintenanceRecord._clearImage = true;
}

// ── SAVE MAINTENANCE RECORD ───────────────────────────

function _setMaintErr(id, show) {
  var el = g(id); if (el) el.classList.toggle('vis', show);
}
function _clearMaintErrs() {
  ['mf-err-trailer','mf-err-date','mf-err-service-type','mf-err-custom-type','mf-err-description'].forEach(function(id){
    var el = g(id); if (el) el.classList.remove('vis');
  });
}

async function saveMaintenanceRecord() {
  _clearMaintErrs();
  var trailerEl = g('mf-trailer');
  var tid = trailerEl ? trailerEl.value : '';
  var dateVal = g('mf-date') ? g('mf-date').value : '';
  var serviceType = g('mf-service-type') ? g('mf-service-type').value : '';
  var customType = g('mf-custom-type') ? g('mf-custom-type').value.trim() : '';
  var description = g('mf-description') ? g('mf-description').value.trim() : '';

  var valid = true;
  if (!tid) { _setMaintErr('mf-err-trailer', true); valid = false; }
  if (!dateVal) { _setMaintErr('mf-err-date', true); valid = false; }
  if (!serviceType) { _setMaintErr('mf-err-service-type', true); valid = false; }
  if (serviceType === 'Custom' && !customType) { _setMaintErr('mf-err-custom-type', true); valid = false; }
  if (!description) { _setMaintErr('mf-err-description', true); valid = false; }
  if (!valid) return;

  var laborCost = parseFloat(g('mf-labor') ? g('mf-labor').value : 0) || 0;
  var partsCost = parseFloat(g('mf-parts') ? g('mf-parts').value : 0) || 0;
  var totalEl = g('mf-total');
  var totalCost = totalEl ? (parseFloat(totalEl.value) || (laborCost + partsCost)) : (laborCost + partsCost);
  var existingImage = _editingMaintenanceRecord && !(_editingMaintenanceRecord._clearImage) ? _editingMaintenanceRecord.receiptImage : null;
  var now = Date.now();
  var record = {
    id: _editingMaintenanceRecord ? _editingMaintenanceRecord.id : now,
    trailerId: tid,
    trailerName: _trailerNames[tid] || tid,
    date: dateVal,
    serviceType: serviceType,
    customType: serviceType === 'Custom' ? customType : '',
    description: description,
    partsUsed: g('mf-parts-used') ? g('mf-parts-used').value.trim() : '',
    laborCost: laborCost,
    partsCost: partsCost,
    totalCost: totalCost,
    vendorName: g('mf-vendor') ? g('mf-vendor').value.trim() : '',
    vendorPhone: g('mf-vendor-phone') ? g('mf-vendor-phone').value.trim() : '',
    invoiceRef: g('mf-invoice-ref') ? g('mf-invoice-ref').value.trim() : '',
    performedBy: _maintPerformedBy,
    nextServiceDue: g('mf-next-due') ? g('mf-next-due').value : '',
    notes: g('mf-notes') ? g('mf-notes').value.trim() : '',
    rentalCountAtService: (function(){ var el = g('mf-rental-count'); return (el && el.value !== '') ? parseInt(el.value, 10) : null; })(),
    receiptImage: _pendingReceiptImage || existingImage || null,
    createdAt: _editingMaintenanceRecord ? (_editingMaintenanceRecord.createdAt || now) : now
  };

  var btn = g('maint-save-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }
  try {
    var url = _editingMaintenanceRecord
      ? '/maintenance/' + tid + '/' + _editingMaintenanceRecord.id
      : '/maintenance/' + tid;
    var method = _editingMaintenanceRecord ? 'PUT' : 'POST';
    var res = await fetch(url, {method: method, headers: {'Content-Type':'application/json'}, body: JSON.stringify(record)});
    if (!res.ok) throw new Error('save failed');
    var savedRecord = null;
    try { savedRecord = await res.json(); } catch(e) {}
    var savedId = (savedRecord && savedRecord.id) ? savedRecord.id : record.id;
    var idbRecord = Object.assign({}, record, savedRecord || {}, {trailerId: tid});
    idbPut('maintenance:' + tid + ':' + savedId, idbRecord).catch(function(){});

    _pendingReceiptImage = null;
    _editingMaintenanceRecord = null;
    delete _maintenanceRecordsCache[tid];
    delete _maintenanceRecordsCache['all'];

    closeMaintPanel();
    showToast('Record saved — syncing to Drive...');

    var container = g('maint-records-body');
    if (container) await loadMaintenanceRecords(_currentMaintTrailerId);

    setTimeout(async function() {
      try {
        var sr = await fetch('/auth/google/status');
        var sd = await sr.json();
        showToast(sd.connected ? '✓ Synced to Google Drive' : 'Saved locally — connect Drive in Settings');
      } catch(e) {}
    }, 2000);
  } catch(e) {
    showToast('Save failed — please try again');
    if (btn) { btn.disabled = false; btn.textContent = 'Save Record'; }
  }
}

// ── GOOGLE DRIVE STATUS (SETTINGS) ───────────────────

async function loadGoogleDriveStatus() {
  var area = g('drive-status-area'); if (!area) return;
  try {
    var res = await fetch('/auth/google/status');
    if (!res.ok) throw new Error('status fetch failed');
    var data = await res.json();
    if (data.connected) {
      var emailLabel = data.email ? ' — ' + escHtml(data.email) : '';
      area.innerHTML =
        '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:8px;">' +
          '<span class="drive-status-badge drive-connected">✓ Connected' + emailLabel + '</span>' +
          '<button class="btn btn-ghost btn-sm" onclick="disconnectGoogleDrive()">Disconnect</button>' +
        '</div>' +
        '<div style="font-size:12px;color:var(--muted);line-height:1.5;">Maintenance logs sync automatically after each save.</div>';
    } else {
      area.innerHTML =
        '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:8px;">' +
          '<span class="drive-status-badge drive-disconnected">Not Connected</span>' +
          '<a href="/auth/google" class="btn btn-primary btn-sm" style="text-decoration:none;">Connect Google Drive</a>' +
        '</div>' +
        '<div style="font-size:12px;color:var(--muted);line-height:1.5;">Connect to automatically back up maintenance logs to Google Drive.</div>';
    }
  } catch(e) {
    area.innerHTML =
      '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">' +
        '<span style="font-size:13px;color:var(--muted);">Status unavailable</span>' +
        '<button class="btn btn-ghost btn-sm" onclick="loadGoogleDriveStatus()">Retry</button>' +
      '</div>';
  }
}

async function disconnectGoogleDrive() {
  if (!confirm('Disconnect Google Drive? Maintenance logs will no longer sync automatically.')) return;
  try {
    var res = await fetch('/auth/google/disconnect', {method:'POST'});
    if (!res.ok) throw new Error('disconnect failed');
    showToast('Google Drive disconnected');
    loadGoogleDriveStatus();
  } catch(e) { showToast('Disconnect failed'); }
}

// ── MAINTENANCE ANALYTICS ─────────────────────────────

function toggleMaintAnalytics() {
  var section = g('maint-analytics-section'); if (!section) return;
  if (section.style.display !== 'none') { section.style.display = 'none'; return; }
  section.style.display = 'block';
  section.innerHTML = '<div style="text-align:center;padding:20px;color:var(--muted);font-size:13px;">Loading analytics...</div>';
  loadMaintAnalytics();
}

async function loadMaintAnalytics() {
  var section = g('maint-analytics-section'); if (!section) return;
  try {
    var res = await fetch('/maintenance/summary/all');
    if (!res.ok) throw new Error('fetch failed');
    var data = await res.json();
    renderMaintAnalytics(data, section);
  } catch(e) {
    section.innerHTML = '<div style="color:var(--danger);text-align:center;padding:20px;font-size:13px;">Failed to load analytics.</div>';
  }
}

function renderMaintAnalytics(data, section) {
  // 1. Summary cards
  var cardsHtml = '<div class="maint-analytics-cards">';
  cardsHtml += '<div class="maint-analytics-card">' +
    '<div class="mac-label">Total Spent</div>' +
    '<div class="mac-value mac-primary">$' + (data.totalCost || 0).toFixed(2) + '</div>' +
    '<div class="mac-sub">' + (data.totalRecords || 0) + ' records total</div>' +
  '</div>';
  Object.keys(data.byTrailer || {}).forEach(function(tid) {
    var bt = data.byTrailer[tid];
    cardsHtml += '<div class="maint-analytics-card">' +
      '<div class="mac-label">' + escHtml(bt.trailerName) + '</div>' +
      '<div class="mac-value">$' + (bt.totalCost || 0).toFixed(2) + '</div>' +
      '<div class="mac-sub">' + (bt.recordCount || 0) + ' records</div>' +
    '</div>';
  });
  cardsHtml += '</div>';

  // 2. Monthly breakdown (last 6 months, most recent first)
  var months = Object.keys(data.byMonth || {}).sort().reverse().slice(0, 6);
  var monthlyHtml = '';
  if (months.length) {
    monthlyHtml = '<div class="maint-analytics-divider"></div>' +
      '<div class="maint-analytics-section-title">Monthly Breakdown</div>' +
      '<div class="maint-analytics-table">';
    months.forEach(function(m) {
      var md = data.byMonth[m];
      var d = new Date(m + '-01T00:00:00');
      var label = d.toLocaleDateString('en-US', {month:'short', year:'numeric'});
      monthlyHtml += '<div class="mat-row">' +
        '<span class="mat-label">' + escHtml(label) + '</span>' +
        '<span class="mat-sub">' + md.recordCount + ' record' + (md.recordCount !== 1 ? 's' : '') + '</span>' +
        '<span class="mat-cost">$' + (md.totalCost || 0).toFixed(2) + '</span>' +
      '</div>';
    });
    monthlyHtml += '</div>';
  }

  // 3. By service type (sorted by totalCost desc)
  var stypes = Object.keys(data.byServiceType || {}).sort(function(a, b) {
    return (data.byServiceType[b].totalCost || 0) - (data.byServiceType[a].totalCost || 0);
  });
  var stypeHtml = '';
  if (stypes.length) {
    stypeHtml = '<div class="maint-analytics-divider"></div>' +
      '<div class="maint-analytics-section-title">By Service Type</div>' +
      '<div class="maint-analytics-table">';
    stypes.forEach(function(st) {
      var s = data.byServiceType[st];
      stypeHtml += '<div class="mat-row">' +
        '<span class="mat-label">' + escHtml(st) + '</span>' +
        '<span class="mat-sub">' + s.count + '×</span>' +
        '<span class="mat-cost">$' + (s.totalCost || 0).toFixed(2) + '</span>' +
      '</div>';
    });
    stypeHtml += '</div>';
  }

  // 4. Service alerts (overdue + upcoming within 60 days)
  var overdueItems = data.overdueService || [];
  var upcomingItems = data.upcomingService || [];
  var overdueHtml = '';
  var upcomingHtml = '';
  if (overdueItems.length) {
    overdueHtml = '<div class="maint-service-alert">' +
      '<div class="maint-analytics-section-title mast-danger">⚠ Overdue (' + overdueItems.length + ')</div>';
    overdueItems.forEach(function(item) {
      overdueHtml += '<div class="msa-item">' +
        '<div class="msa-name">' + escHtml(item.trailerName) + '</div>' +
        '<div class="msa-type">' + escHtml(item.serviceType) + '</div>' +
        '<div class="msa-due msa-overdue">' + escHtml(fmtDateLong(item.nextServiceDue)) + '</div>' +
        '<button class="btn btn-ghost btn-sm msa-view-btn" onclick="selectMaintTrailer(\'' + escHtml(item.trailerId) + '\')">View</button>' +
      '</div>';
    });
    overdueHtml += '</div>';
  }
  if (upcomingItems.length) {
    upcomingHtml = '<div class="maint-service-alert">' +
      '<div class="maint-analytics-section-title mast-warning">🔔 Upcoming (' + upcomingItems.length + ')</div>';
    upcomingItems.forEach(function(item) {
      var daysUntil = Math.ceil((new Date(item.nextServiceDue + 'T00:00:00') - new Date()) / 86400000);
      upcomingHtml += '<div class="msa-item">' +
        '<div class="msa-name">' + escHtml(item.trailerName) + '</div>' +
        '<div class="msa-type">' + escHtml(item.serviceType) + '</div>' +
        '<div class="msa-due msa-upcoming">' + escHtml(fmtDateLong(item.nextServiceDue)) + (daysUntil > 0 ? ' (' + daysUntil + 'd)' : '') + '</div>' +
      '</div>';
    });
    upcomingHtml += '</div>';
  }
  var serviceAlertHtml = '<div class="maint-analytics-divider"></div>' +
    '<div class="maint-analytics-section-title">Service Alerts</div>';
  if (!overdueHtml && !upcomingHtml) {
    serviceAlertHtml += '<div style="color:var(--muted);font-size:13px;padding:4px 0;">No upcoming service reminders.</div>';
  } else {
    serviceAlertHtml += '<div class="maint-service-alerts-row">' + overdueHtml + upcomingHtml + '</div>';
  }

  // 5. Cost per rental (totalCost / latest record's rentalCountAtService per trailer)
  var trailerLatestRental = {};
  Object.keys(_maintenanceRecordsCache).forEach(function(cacheKey) {
    (_maintenanceRecordsCache[cacheKey] || []).forEach(function(r) {
      var rtid = r.trailerId || cacheKey;
      if (rtid === 'all') return;
      if (r.rentalCountAtService != null && r.rentalCountAtService > 0) {
        var cur = trailerLatestRental[rtid];
        if (!cur || (r.date || '') >= (cur.date || '')) trailerLatestRental[rtid] = r;
      }
    });
  });
  var rentalCostHtml = '';
  var trailerKeys = Object.keys(data.byTrailer || {});
  if (trailerKeys.length) {
    rentalCostHtml = '<div class="maint-analytics-divider"></div>' +
      '<div class="maint-analytics-section-title">Cost per Rental</div>' +
      '<div class="maint-analytics-table">';
    trailerKeys.forEach(function(tid) {
      var bt = data.byTrailer[tid];
      var lr = trailerLatestRental[tid];
      var cpr = lr ? '$' + (bt.totalCost / lr.rentalCountAtService).toFixed(2) : 'N/A';
      rentalCostHtml += '<div class="mat-row">' +
        '<span class="mat-label">' + escHtml(bt.trailerName) + '</span>' +
        '<span class="mat-cost">' + escHtml(cpr) + '</span>' +
      '</div>';
    });
    rentalCostHtml += '</div>' +
      '<div style="font-size:11px;color:var(--muted);margin-top:6px;">Based on maintenance cost ÷ rentals logged</div>';
  }

  section.innerHTML = '<div class="maint-analytics-inner">' +
    cardsHtml + monthlyHtml + stypeHtml + serviceAlertHtml + rentalCostHtml +
  '</div>';
}

// ── MAINTENANCE EXPORT ────────────────────────────────

async function exportMaintenanceCSV() {
  var tid = _currentMaintTrailerId || 'all';
  showToast('Downloading CSV...');
  try {
    var res = await fetch('/maintenance/export/' + tid);
    if (!res.ok) throw new Error('export failed');
    var blob = await res.blob();
    var today = new Date().toISOString().slice(0, 10);
    var filename = 'maintenance-log-' + tid + '-' + today + '.csv';
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
  } catch(e) { showToast('Export failed'); }
}

function printMaintenanceLog() {
  var records = _maintenanceRecordsCache[_currentMaintTrailerId] || [];
  var trailerLabel = _currentMaintTrailerId === 'all'
    ? 'All Trailers'
    : (_trailerNames[_currentMaintTrailerId] || _currentMaintTrailerId);
  var today = new Date().toLocaleDateString('en-US', {year:'numeric', month:'long', day:'numeric'});

  var totalCostSum = 0;
  var rows = records.map(function(r) {
    var cost = parseFloat(r.totalCost) || ((parseFloat(r.laborCost)||0) + (parseFloat(r.partsCost)||0));
    totalCostSum += cost;
    var serviceLabel = (r.serviceType === 'Custom' && r.customType) ? r.customType : (r.serviceType || '—');
    return '<tr>' +
      '<td>' + escHtml(r.date || '—') + '</td>' +
      '<td>' + escHtml(serviceLabel) + '</td>' +
      '<td>' + escHtml(r.description || '—') + '</td>' +
      '<td>$' + cost.toFixed(2) + '</td>' +
      '<td>' + escHtml(r.vendorName || r.vendor || '—') + '</td>' +
      '<td>' + escHtml(r.performedBy || '—') + '</td>' +
      '<td>' + escHtml(r.nextServiceDue || '—') + '</td>' +
    '</tr>';
  }).join('');

  var printDiv = document.createElement('div');
  printDiv.id = 'maint-print-area';
  printDiv.innerHTML =
    '<div class="maint-print-doc">' +
    '<div class="maint-print-header">' +
      '<div class="maint-print-co">Iron G Equipment Co.</div>' +
      '<div class="maint-print-title">Maintenance Log</div>' +
      '<div class="maint-print-sub">' + escHtml(trailerLabel) + '</div>' +
    '</div>' +
    '<table class="maint-print-table">' +
      '<thead><tr>' +
        '<th>Date</th><th>Service Type</th><th>Description</th>' +
        '<th>Total Cost</th><th>Vendor</th><th>Performed By</th><th>Next Service Due</th>' +
      '</tr></thead>' +
      '<tbody>' + (rows || '<tr><td colspan="7" style="text-align:center;color:#999;">No records.</td></tr>') + '</tbody>' +
      '<tfoot><tr>' +
        '<td colspan="3" style="text-align:right;">Total</td>' +
        '<td>$' + totalCostSum.toFixed(2) + '</td>' +
        '<td colspan="3"></td>' +
      '</tr></tfoot>' +
    '</table>' +
    '<div class="maint-print-footer">Generated ' + escHtml(today) + ' — Iron G Equipment Co. LLC</div>' +
    '</div>';

  document.body.appendChild(printDiv);
  function cleanup() { if (printDiv.parentNode) document.body.removeChild(printDiv); }
  window.addEventListener('afterprint', cleanup, {once: true});
  setTimeout(cleanup, 60000);
  window.print();
}

// ── DASHBOARD MAINTENANCE ALERTS ──────────────────────

async function loadDashboardMaintAlerts() {
  var container = g('dash-maint-alerts'); if (!container) return;
  try {
    var res = await fetch('/maintenance/summary/all');
    if (!res.ok) throw new Error('failed');
    var data = await res.json();
    var overdue = data.overdueService || [];
    var in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    var upcoming30 = (data.upcomingService || []).filter(function(s) { return s.nextServiceDue <= in30Days; });

    if (overdue.length) {
      var itemsHtml = overdue.map(function(s) {
        return '<div style="font-size:13px;color:var(--text);margin-bottom:4px;">' + escHtml(s.trailerName) + ' — ' + escHtml(s.serviceType) + '</div>';
      }).join('');
      container.innerHTML = '<div class="card dash-maint-alert-card dash-maint-overdue">' +
        '<div class="card-header"><div class="card-title" style="color:var(--danger);">⚠ ' + overdue.length + ' Overdue Service Item' + (overdue.length !== 1 ? 's' : '') + '</div>' +
        '<button class="btn btn-ghost btn-sm" onclick="navTo(\'maintenance\')">View</button></div>' +
        '<div class="card-body">' + itemsHtml + '</div></div>';
    } else if (upcoming30.length) {
      var itemsHtml = upcoming30.map(function(s) {
        return '<div style="font-size:13px;color:var(--text);margin-bottom:4px;">' + escHtml(s.trailerName) + ' — ' + escHtml(s.serviceType) + ' (' + escHtml(s.nextServiceDue) + ')</div>';
      }).join('');
      container.innerHTML = '<div class="card dash-maint-alert-card dash-maint-upcoming">' +
        '<div class="card-header"><div class="card-title" style="color:var(--warning);">🔔 ' + upcoming30.length + ' Service Due Soon</div>' +
        '<button class="btn btn-ghost btn-sm" onclick="navTo(\'maintenance\')">View</button></div>' +
        '<div class="card-body">' + itemsHtml + '</div></div>';
    } else {
      container.innerHTML = '';
    }
  } catch(e) {
    container.innerHTML = '';
  }
}

// ── EXPENSES PAGE ─────────────────────────────────────

async function drawExpensesPage() {
  var page = g('page-expenses'); if (!page) return;
  page.innerHTML =
    '<div class="expense-view-tabs">' +
      '<button class="expense-view-tab' + (_currentExpensesView === 'expenses' ? ' active' : '') + '" id="evt-expenses" onclick="switchExpensesView(\'expenses\')">Expenses</button>' +
      '<button class="expense-view-tab' + (_currentExpensesView === 'mileage' ? ' active' : '') + '" id="evt-mileage" onclick="switchExpensesView(\'mileage\')">Mileage</button>' +
    '</div>' +
    '<div id="expense-view-content"><div style="text-align:center;padding:20px;color:var(--muted);font-size:13px;">Loading...</div></div>';
  if (_currentExpensesView === 'mileage') {
    await drawMileageView();
  } else {
    await drawExpenseView();
  }
}

async function switchExpensesView(view) {
  _currentExpensesView = view;
  ['expenses', 'mileage'].forEach(function(v) {
    var t = g('evt-' + v); if (t) t.classList.toggle('active', v === view);
  });
  var content = g('expense-view-content');
  if (content) content.innerHTML = '<div style="text-align:center;padding:20px;color:var(--muted);font-size:13px;">Loading...</div>';
  if (view === 'mileage') { await drawMileageView(); } else { await drawExpenseView(); }
}

async function drawExpenseView() {
  var content = g('expense-view-content'); if (!content) return;
  try {
    var results = await Promise.allSettled([fetch('/expenses/summary'), fetch('/expenses')]);
    var summaryResult = results[0], recordsResult = results[1];
    var summary = {};
    if (summaryResult.status === 'fulfilled' && summaryResult.value.ok) {
      try { summary = await summaryResult.value.json(); } catch(e) {}
    }
    var records = [];
    if (recordsResult.status === 'fulfilled' && recordsResult.value.ok) {
      try { records = await recordsResult.value.json(); } catch(e) {}
    }
    _expenseRecordsCache = Array.isArray(records) ? records : [];

    if (!g('expense-view-content')) return;

    var catOptions = '<option value="">All Categories</option>' +
      EXPENSE_CATEGORIES.map(function(c) {
        return '<option value="' + escHtml(c) + '"' + (_currentExpenseCategoryFilter === c ? ' selected' : '') + '>' + escHtml(c) + '</option>';
      }).join('');

    content.innerHTML =
      '<div class="expense-page-header">' +
        '<div style="font-family:\'Oswald\',sans-serif;font-size:11px;color:var(--muted);letter-spacing:2px;text-transform:uppercase;">All Expenses</div>' +
        '<button class="btn btn-ghost btn-sm" onclick="exportExpensesCSV()">⬇ Export CSV</button>' +
      '</div>' +
      '<div class="expense-summary-pills">' +
        '<div class="expense-pill"><div class="expense-pill-label">This Month</div><div class="expense-pill-value" id="exp-pill-month">$' + ((summary.currentMonthTotal || 0).toFixed(2)) + '</div></div>' +
        '<div class="expense-pill"><div class="expense-pill-label">Last Month</div><div class="expense-pill-value" id="exp-pill-lastmonth">$' + ((summary.lastMonthTotal || 0).toFixed(2)) + '</div></div>' +
        '<div class="expense-pill"><div class="expense-pill-label">Tax Ded. YTD</div><div class="expense-pill-value" id="exp-pill-deductible">$' + ((summary.taxDeductibleTotal || 0).toFixed(2)) + '</div></div>' +
      '</div>' +
      '<div class="expense-filter-row">' +
        '<button class="expense-filter-tab' + (_currentExpenseFilter === 'all' ? ' active' : '') + '" onclick="setExpenseFilter(\'all\')">All</button>' +
        '<button class="expense-filter-tab' + (_currentExpenseFilter === 'month' ? ' active' : '') + '" onclick="setExpenseFilter(\'month\')">This Month</button>' +
        '<button class="expense-filter-tab' + (_currentExpenseFilter === 'lastmonth' ? ' active' : '') + '" onclick="setExpenseFilter(\'lastmonth\')">Last Month</button>' +
        '<select class="form-select" id="expense-cat-filter" onchange="setExpenseCategoryFilter(this.value)" style="flex:1;min-width:0;font-size:12px;padding:8px 28px 8px 10px;">' + catOptions + '</select>' +
      '</div>' +
      '<div id="expense-records-body"></div>';

    renderExpenseCards(_expenseRecordsCache);
  } catch(e) {
    var c2 = g('expense-view-content');
    if (c2) c2.innerHTML = '<div style="color:var(--danger);text-align:center;padding:20px;font-size:13px;">Failed to load expenses.</div>';
  }
}

function setExpenseFilter(filter) {
  _currentExpenseFilter = filter;
  document.querySelectorAll('.expense-filter-tab').forEach(function(t, i) {
    var map = ['all', 'month', 'lastmonth'];
    t.classList.toggle('active', map[i] === filter);
  });
  renderExpenseCards(_expenseRecordsCache);
}

function setExpenseCategoryFilter(val) {
  _currentExpenseCategoryFilter = val;
  renderExpenseCards(_expenseRecordsCache);
}

function renderExpenseCards(records) {
  var container = g('expense-records-body'); if (!container) return;
  var now = new Date();
  var currentMonth = now.toISOString().slice(0, 7);
  var lmDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  var lastMonth = lmDate.toISOString().slice(0, 7);

  var filtered = records;
  if (_currentExpenseFilter === 'month') {
    filtered = filtered.filter(function(r) { return r.date && r.date.startsWith(currentMonth); });
  } else if (_currentExpenseFilter === 'lastmonth') {
    filtered = filtered.filter(function(r) { return r.date && r.date.startsWith(lastMonth); });
  }
  if (_currentExpenseCategoryFilter) {
    filtered = filtered.filter(function(r) { return r.category === _currentExpenseCategoryFilter; });
  }

  if (!filtered.length) {
    container.innerHTML = '<div style="text-align:center;color:var(--muted);padding:40px 20px;font-size:14px;">No expenses recorded yet. Tap + to add your first expense.</div>';
    return;
  }

  var h = '';
  filtered.forEach(function(r) {
    var amount = parseFloat(r.amount) || 0;
    var displayName = r.vendorName || r.description || '—';
    var deductibleHtml = r.taxDeductible ? '<span class="expense-deductible-tag">✓ Deductible</span>' : '';
    var thumbHtml = r.receiptImage
      ? '<div style="margin-bottom:8px;"><img src="' + escHtml(r.receiptImage) + '" class="receipt-thumb" onclick="event.stopPropagation();viewExpenseReceiptFull(\'' + escHtml(String(r.id)) + '\')" alt="Receipt"></div>'
      : '';
    h += '<div class="expense-card" id="exc-' + escHtml(String(r.id)) + '">' +
      '<div onclick="toggleExpenseDetail(\'' + escHtml(String(r.id)) + '\')" style="cursor:pointer;">' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;gap:10px;">' +
          '<div style="flex:1;min-width:0;">' +
            '<div style="font-size:12px;color:var(--muted);font-family:\'Oswald\',sans-serif;letter-spacing:1px;text-transform:uppercase;margin-bottom:5px;">' + escHtml(fmtDateLong(r.date)) + '</div>' +
            '<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">' +
              (r.category ? '<span class="expense-cat-badge">' + escHtml(r.category) + '</span>' : '') +
              deductibleHtml +
            '</div>' +
          '</div>' +
          '<div class="expense-amount">$' + amount.toFixed(2) + '</div>' +
        '</div>' +
        '<div style="font-size:13px;color:var(--text);margin-bottom:4px;">' + escHtml(displayName) + '</div>' +
        thumbHtml +
        '<div id="exd-' + escHtml(String(r.id)) + '" class="expense-detail"></div>' +
      '</div>' +
      '<div style="display:flex;gap:8px;margin-top:10px;padding-top:10px;border-top:1px solid #1a1a1a;">' +
        '<button class="btn btn-ghost btn-sm" onclick="editExpense(\'' + escHtml(String(r.id)) + '\')">Edit</button>' +
        '<button class="btn btn-danger btn-sm" onclick="deleteExpense(\'' + escHtml(String(r.id)) + '\')">Delete</button>' +
      '</div>' +
    '</div>';
  });
  container.innerHTML = h;
}

function toggleExpenseDetail(id) {
  var el = g('exd-' + id); if (!el) return;
  if (el.classList.contains('open')) { el.classList.remove('open'); return; }
  var r = null;
  for (var i = 0; i < _expenseRecordsCache.length; i++) { if (String(_expenseRecordsCache[i].id) === String(id)) { r = _expenseRecordsCache[i]; break; } }
  if (!r) return;
  el.innerHTML =
    crow('Description', r.description) +
    crow('Payment Method', r.paymentMethod) +
    crow('Vendor Name', r.vendorName) +
    crow('Invoice / Receipt #', r.invoiceRef) +
    crow('Notes', r.notes) +
    crow('Created At', r.createdAt ? new Date(r.createdAt).toLocaleString() : null);
  el.classList.add('open');
}

function viewExpenseReceiptFull(id) {
  var r = null;
  for (var i = 0; i < _expenseRecordsCache.length; i++) { if (String(_expenseRecordsCache[i].id) === String(id)) { r = _expenseRecordsCache[i]; break; } }
  if (!r || !r.receiptImage) return;
  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.9);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;';
  overlay.onclick = function() { document.body.removeChild(overlay); };
  overlay.innerHTML = '<img src="' + escHtml(r.receiptImage) + '" style="max-width:100%;max-height:90vh;border-radius:4px;">';
  document.body.appendChild(overlay);
}

function editExpense(id) {
  var r = null;
  for (var i = 0; i < _expenseRecordsCache.length; i++) { if (String(_expenseRecordsCache[i].id) === String(id)) { r = _expenseRecordsCache[i]; break; } }
  if (!r) return;
  openExpenseForm(r);
}

async function deleteExpense(id) {
  if (!confirm('Delete this expense? This cannot be undone.')) return;
  try {
    var res = await fetch('/expenses/' + id, {method: 'DELETE'});
    if (!res.ok) throw new Error('delete failed');
    _expenseRecordsCache = _expenseRecordsCache.filter(function(r) { return String(r.id) !== String(id); });
    var container = g('expense-records-body');
    if (container) renderExpenseCards(_expenseRecordsCache);
    refreshExpenseSummaryPills();
    showToast('Expense deleted');
  } catch(e) { showToast('Delete failed'); }
}

async function refreshExpenseSummaryPills() {
  try {
    var res = await fetch('/expenses/summary');
    if (!res.ok) return;
    var summary = await res.json();
    var mEl = g('exp-pill-month'); if (mEl) mEl.textContent = '$' + (summary.currentMonthTotal || 0).toFixed(2);
    var lEl = g('exp-pill-lastmonth'); if (lEl) lEl.textContent = '$' + (summary.lastMonthTotal || 0).toFixed(2);
    var dEl = g('exp-pill-deductible'); if (dEl) dEl.textContent = '$' + (summary.taxDeductibleTotal || 0).toFixed(2);
  } catch(e) {}
}

async function exportExpensesCSV() {
  showToast('Downloading CSV...');
  try {
    var res = await fetch('/expenses/export');
    if (!res.ok) throw new Error('export failed');
    var blob = await res.blob();
    var year = new Date().getFullYear();
    var filename = 'iron-g-expenses-' + year + '.csv';
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
  } catch(e) { showToast('Export failed'); }
}

// ── EXPENSE FORM ──────────────────────────────────────

function openNewExpense() {
  _editingExpenseRecord = null;
  _pendingExpenseReceiptImage = null;
  openExpenseForm(null);
}

function openExpenseForm(record) {
  _editingExpenseRecord = record || null;
  _pendingExpenseReceiptImage = null;
  var r = record || {};
  var isEdit = !!record;
  var today = new Date().toISOString().slice(0, 10);
  var taxOn = (r.taxDeductible !== false);

  var catOptions = '<option value="">— Select —</option>' +
    EXPENSE_CATEGORIES.map(function(c) {
      return '<option value="' + escHtml(c) + '"' + (c === (r.category || '') ? ' selected' : '') + '>' + escHtml(c) + '</option>';
    }).join('');

  var pmOptions = '<option value="">— Select —</option>' +
    EXPENSE_PAYMENT_METHODS.map(function(m) {
      return '<option value="' + escHtml(m) + '"' + (m === (r.paymentMethod || '') ? ' selected' : '') + '>' + escHtml(m) + '</option>';
    }).join('');

  var thumbHtml = r.receiptImage
    ? '<div id="exp-receipt-thumb-wrap" style="margin-top:8px;display:flex;align-items:center;gap:8px;"><img id="exp-receipt-thumb-preview" src="' + escHtml(r.receiptImage) + '" class="receipt-thumb"><button class="btn btn-ghost btn-sm" id="exp-receipt-remove-btn" onclick="removeExpenseReceiptImage()" type="button">× Remove</button></div>'
    : '<div id="exp-receipt-thumb-wrap" style="margin-top:8px;display:none;align-items:center;gap:8px;"><img id="exp-receipt-thumb-preview" src="" class="receipt-thumb" style="display:none;"><button class="btn btn-ghost btn-sm" id="exp-receipt-remove-btn" onclick="removeExpenseReceiptImage()" type="button" style="display:none;">× Remove</button></div>';

  var html =
    '<div class="fg"><label class="fl">Date *</label>' +
      '<input class="fi" id="ef-date" type="date" value="' + escHtml(r.date || today) + '">' +
    '</div>' +

    '<div class="fg"><label class="fl">Category *</label>' +
      '<select class="form-select" id="ef-category">' + catOptions + '</select>' +
      '<div class="maint-field-error" id="ef-err-category">Category is required</div>' +
    '</div>' +

    '<div class="fg"><label class="fl">Description *</label>' +
      '<input class="fi" id="ef-description" type="text" value="' + escHtml(r.description || '') + '" placeholder="What was this expense for?">' +
      '<div class="maint-field-error" id="ef-err-description">Description is required</div>' +
    '</div>' +

    '<div class="fg"><label class="fl">Amount *</label>' +
      '<div class="maint-cost-row"><span class="maint-cost-prefix">$</span>' +
        '<input class="fi" id="ef-amount" type="number" min="0" step="0.01" value="' + escHtml(r.amount != null ? String(r.amount) : '') + '" placeholder="0.00" style="flex:1;">' +
      '</div>' +
      '<div class="maint-field-error" id="ef-err-amount">Amount is required</div>' +
    '</div>' +

    '<div class="fg"><label class="fl">Payment Method</label>' +
      '<select class="form-select" id="ef-payment-method">' + pmOptions + '</select>' +
    '</div>' +

    '<div class="fg"><label class="fl">Vendor Name</label>' +
      '<input class="fi" id="ef-vendor" type="text" value="' + escHtml(r.vendorName || '') + '" placeholder="Optional">' +
    '</div>' +

    '<div class="fg"><label class="fl">Invoice / Receipt #</label>' +
      '<input class="fi" id="ef-invoice" type="text" value="' + escHtml(r.invoiceRef || '') + '" placeholder="Optional">' +
    '</div>' +

    '<div class="fg" style="margin-bottom:14px;">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;">' +
        '<label class="fl" style="margin:0;">Tax Deductible</label>' +
        '<label class="expense-toggle">' +
          '<input type="checkbox" id="ef-tax-deductible"' + (taxOn ? ' checked' : '') + '>' +
          '<span class="expense-toggle-slider"></span>' +
        '</label>' +
      '</div>' +
    '</div>' +

    '<div class="fg"><label class="fl">Notes</label>' +
      '<textarea class="fi form-textarea" id="ef-notes" rows="2" placeholder="Optional">' + escHtml(r.notes || '') + '</textarea>' +
    '</div>' +

    '<div class="fg"><label class="fl">Receipt / Image Scanner</label>' +
      '<input type="file" id="ef-receipt-input" accept="image/*,.jpg,.jpeg,.png,.webp" style="display:none;" onchange="scanExpenseReceiptImage(this)">' +
      '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">' +
        '<button class="btn btn-ghost btn-sm" onclick="g(\'ef-receipt-input\').click()" type="button">📷 Scan Receipt or Image</button>' +
        '<span id="exp-scan-status" style="font-size:12px;color:var(--muted);display:none;"></span>' +
      '</div>' +
      thumbHtml +
    '</div>' +

    '<button class="btn btn-primary" id="expense-save-btn" onclick="saveExpenseRecord()" style="width:100%;padding:14px;font-size:14px;letter-spacing:2px;margin-top:8px;" type="button">Save Expense</button>';

  var titleEl = g('expense-panel-title');
  if (titleEl) titleEl.textContent = isEdit ? 'Edit Expense' : 'New Expense';
  var panelBody = g('expense-panel-body');
  if (panelBody) panelBody.innerHTML = html;
  openExpensePanel();
}

function openExpensePanel() {
  var overlay = g('expense-panel-overlay');
  var panel = g('expense-slide-panel');
  if (overlay) overlay.classList.add('open');
  if (panel) panel.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeExpensePanel() {
  var overlay = g('expense-panel-overlay');
  var panel = g('expense-slide-panel');
  if (overlay) overlay.classList.remove('open');
  if (panel) panel.classList.remove('open');
  document.body.style.overflow = '';
  _editingExpenseRecord = null;
  _pendingExpenseReceiptImage = null;
}

function scanExpenseReceiptImage(input) {
  var file = input.files[0]; if (!file) return;
  var statusEl = g('exp-scan-status');
  if (statusEl) { statusEl.textContent = 'Reading receipt...'; statusEl.style.color = 'var(--muted)'; statusEl.style.display = ''; }
  var reader = new FileReader();
  reader.onload = function(e) {
    var dataUrl = e.target.result;
    var base64 = dataUrl.split(',')[1];
    var mimeType = file.type || 'image/jpeg';
    _pendingExpenseReceiptImage = dataUrl;
    var wrap = g('exp-receipt-thumb-wrap');
    var thumb = g('exp-receipt-thumb-preview');
    var removeBtn = g('exp-receipt-remove-btn');
    if (thumb) { thumb.src = dataUrl; thumb.style.display = 'block'; }
    if (removeBtn) { removeBtn.style.display = 'inline-flex'; }
    if (wrap) { wrap.style.display = 'flex'; }
    fetch('/expenses/scan-receipt', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({imageBase64: base64, mimeType: mimeType})
    }).then(function(res) {
      if (!res.ok) throw new Error('scan failed');
      return res.json();
    }).then(function(data) {
      function setField(id, val) { var el = g(id); if (el && val != null && String(val).trim()) el.value = val; }
      setField('ef-vendor', data.vendorName);
      if (data.amount != null) setField('ef-amount', data.amount);
      setField('ef-description', data.description);
      var _today = new Date().toISOString().slice(0, 10);
      var dateEl = g('ef-date');
      if (dateEl && dateEl.value === _today && data.date) dateEl.value = data.date;
      if (statusEl) statusEl.style.display = 'none';
      showToast('✓ Scanned — review and confirm fields');
    }).catch(function() {
      if (statusEl) { statusEl.textContent = 'Could not read image — enter manually'; statusEl.style.color = 'var(--danger)'; }
    });
  };
  reader.readAsDataURL(file);
}

function removeExpenseReceiptImage() {
  _pendingExpenseReceiptImage = null;
  var thumb = g('exp-receipt-thumb-preview'); if (thumb) { thumb.src = ''; thumb.style.display = 'none'; }
  var removeBtn = g('exp-receipt-remove-btn'); if (removeBtn) removeBtn.style.display = 'none';
  var wrap = g('exp-receipt-thumb-wrap'); if (wrap) wrap.style.display = 'none';
  var inp = g('ef-receipt-input'); if (inp) inp.value = '';
  if (_editingExpenseRecord) _editingExpenseRecord._clearImage = true;
}

function _clearExpenseErrors() {
  ['ef-err-category', 'ef-err-description', 'ef-err-amount'].forEach(function(id) {
    var el = g(id); if (el) el.classList.remove('vis');
  });
}

async function saveExpenseRecord() {
  _clearExpenseErrors();
  var dateVal = g('ef-date') ? g('ef-date').value : '';
  var category = g('ef-category') ? g('ef-category').value : '';
  var description = g('ef-description') ? g('ef-description').value.trim() : '';
  var amountEl = g('ef-amount');
  var amount = amountEl ? parseFloat(amountEl.value) : NaN;

  var valid = true;
  if (!category) { var e1 = g('ef-err-category'); if (e1) e1.classList.add('vis'); valid = false; }
  if (!description) { var e2 = g('ef-err-description'); if (e2) e2.classList.add('vis'); valid = false; }
  if (!amountEl || amountEl.value === '' || isNaN(amount)) { var e3 = g('ef-err-amount'); if (e3) e3.classList.add('vis'); valid = false; }
  if (!valid) return;

  var taxDeductibleEl = g('ef-tax-deductible');
  var existingImage = _editingExpenseRecord && !(_editingExpenseRecord._clearImage) ? _editingExpenseRecord.receiptImage : null;
  var now = Date.now();
  var record = {
    id: _editingExpenseRecord ? _editingExpenseRecord.id : now,
    date: dateVal || new Date().toISOString().slice(0, 10),
    category: category,
    description: description,
    amount: amount,
    paymentMethod: g('ef-payment-method') ? g('ef-payment-method').value : '',
    vendorName: g('ef-vendor') ? g('ef-vendor').value.trim() : '',
    invoiceRef: g('ef-invoice') ? g('ef-invoice').value.trim() : '',
    taxDeductible: taxDeductibleEl ? taxDeductibleEl.checked : true,
    notes: g('ef-notes') ? g('ef-notes').value.trim() : '',
    receiptImage: _pendingExpenseReceiptImage || existingImage || null,
    createdAt: _editingExpenseRecord ? (_editingExpenseRecord.createdAt || now) : now
  };

  var btn = g('expense-save-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }
  try {
    var url = _editingExpenseRecord ? '/expenses/' + _editingExpenseRecord.id : '/expenses';
    var method = _editingExpenseRecord ? 'PUT' : 'POST';
    var res = await fetch(url, {method: method, headers: {'Content-Type': 'application/json'}, body: JSON.stringify(record)});
    if (!res.ok) throw new Error('save failed');
    _pendingExpenseReceiptImage = null;
    _editingExpenseRecord = null;
    closeExpensePanel();
    showToast('Expense saved');
    var listRes = await fetch('/expenses');
    if (listRes.ok) { try { _expenseRecordsCache = await listRes.json(); } catch(ex) {} }
    var container = g('expense-records-body');
    if (container) renderExpenseCards(_expenseRecordsCache);
    refreshExpenseSummaryPills();
  } catch(e) {
    showToast('Save failed — please try again');
    if (btn) { btn.disabled = false; btn.textContent = 'Save Expense'; }
  }
}

// ── MILEAGE LOG ────────────────────────────────────────

var IRS_RATE = 0.70;

async function drawMileageView() {
  var content = g('expense-view-content'); if (!content) return;
  try {
    var results = await Promise.allSettled([fetch('/mileage/summary'), fetch('/mileage')]);
    var summary = {}, records = [];
    if (results[0].status === 'fulfilled' && results[0].value.ok) {
      try { summary = await results[0].value.json(); } catch(e) {}
    }
    if (results[1].status === 'fulfilled' && results[1].value.ok) {
      try { records = await results[1].value.json(); } catch(e) {}
    }
    _mileageRecordsCache = Array.isArray(records) ? records : [];

    if (!g('expense-view-content')) return;

    var ytdMiles = parseFloat(summary.totalMiles || summary.totalMilesYtd || 0);
    var ytdDed = parseFloat(summary.totalDeduction || summary.totalDeductionYtd || (ytdMiles * IRS_RATE));
    var monMiles = parseFloat(summary.currentMonthMiles || summary.monthMiles || 0);

    content.innerHTML =
      '<div class="expense-page-header">' +
        '<div style="font-family:\'Oswald\',sans-serif;font-size:11px;color:var(--muted);letter-spacing:2px;text-transform:uppercase;">Mileage Log</div>' +
        '<button class="btn btn-ghost btn-sm" onclick="exportMileageCSV()">⬇ Export CSV</button>' +
      '</div>' +
      '<div class="expense-summary-pills">' +
        '<div class="expense-pill"><div class="expense-pill-label">Miles This Year</div><div class="expense-pill-value" id="mil-pill-miles">' + ytdMiles.toFixed(1) + ' mi</div></div>' +
        '<div class="expense-pill"><div class="expense-pill-label">Deduction YTD</div><div class="expense-pill-value" id="mil-pill-ded">$' + ytdDed.toFixed(2) + '</div></div>' +
        '<div class="expense-pill"><div class="expense-pill-label">This Month</div><div class="expense-pill-value" id="mil-pill-month">' + monMiles.toFixed(1) + ' mi</div></div>' +
      '</div>' +
      '<div id="mileage-records-body"></div>';

    renderMileageCards(_mileageRecordsCache);
  } catch(e) {
    var c2 = g('expense-view-content');
    if (c2) c2.innerHTML = '<div style="color:var(--danger);text-align:center;padding:20px;font-size:13px;">Failed to load mileage log.</div>';
  }
}

function renderMileageCards(records) {
  var container = g('mileage-records-body'); if (!container) return;
  var sorted = records.slice().sort(function(a, b) { return (b.date || '').localeCompare(a.date || ''); });
  if (!sorted.length) {
    container.innerHTML = '<div style="text-align:center;color:var(--muted);padding:40px 20px;font-size:14px;">No trips logged yet. Tap + Add Trip to start tracking mileage.</div>';
    return;
  }
  var h = '';
  sorted.forEach(function(r) {
    var miles = parseFloat(r.miles) || 0;
    var deduction = miles * IRS_RATE;
    h += '<div class="mileage-card" id="mlc-' + escHtml(String(r.id)) + '">' +
      '<div onclick="toggleMileageDetail(\'' + escHtml(String(r.id)) + '\')" style="cursor:pointer;">' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">' +
          '<div style="flex:1;min-width:0;">' +
            '<div style="font-size:12px;color:var(--muted);font-family:\'Oswald\',sans-serif;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px;">' + escHtml(fmtDateLong(r.date)) + '</div>' +
            '<div style="font-size:13px;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + escHtml(r.purpose || '—') + '</div>' +
          '</div>' +
          '<div style="text-align:right;flex-shrink:0;">' +
            '<div class="mileage-miles">' + miles.toFixed(1) + ' mi</div>' +
            '<div style="font-size:12px;color:var(--muted);margin-top:2px;">$' + deduction.toFixed(2) + '</div>' +
          '</div>' +
        '</div>' +
        '<div id="mld-' + escHtml(String(r.id)) + '" class="mileage-detail"></div>' +
      '</div>' +
      '<div style="display:flex;gap:8px;margin-top:10px;padding-top:10px;border-top:1px solid #1a1a1a;">' +
        '<button class="btn btn-danger btn-sm" onclick="deleteMileageRecord(\'' + escHtml(String(r.id)) + '\')">Delete</button>' +
      '</div>' +
    '</div>';
  });
  container.innerHTML = h;
}

function toggleMileageDetail(id) {
  var el = g('mld-' + id); if (!el) return;
  if (el.classList.contains('open')) { el.classList.remove('open'); return; }
  var r = null;
  for (var i = 0; i < _mileageRecordsCache.length; i++) { if (String(_mileageRecordsCache[i].id) === String(id)) { r = _mileageRecordsCache[i]; break; } }
  if (!r) return;
  el.innerHTML = crow('Notes', r.notes) + crow('Logged At', r.createdAt ? new Date(r.createdAt).toLocaleString() : null);
  el.classList.add('open');
}

async function deleteMileageRecord(id) {
  if (!confirm('Delete this trip? This cannot be undone.')) return;
  try {
    var res = await fetch('/mileage/' + id, {method: 'DELETE'});
    if (!res.ok) throw new Error('delete failed');
    _mileageRecordsCache = _mileageRecordsCache.filter(function(r) { return String(r.id) !== String(id); });
    var container = g('mileage-records-body');
    if (container) renderMileageCards(_mileageRecordsCache);
    refreshMileageSummaryPills();
    showToast('Trip deleted');
  } catch(e) { showToast('Delete failed'); }
}

async function refreshMileageSummaryPills() {
  try {
    var res = await fetch('/mileage/summary');
    if (!res.ok) return;
    var summary = await res.json();
    var ytdMiles = parseFloat(summary.totalMiles || summary.totalMilesYtd || 0);
    var ytdDed = parseFloat(summary.totalDeduction || summary.totalDeductionYtd || (ytdMiles * IRS_RATE));
    var monMiles = parseFloat(summary.currentMonthMiles || summary.monthMiles || 0);
    var mEl = g('mil-pill-miles'); if (mEl) mEl.textContent = ytdMiles.toFixed(1) + ' mi';
    var dEl = g('mil-pill-ded'); if (dEl) dEl.textContent = '$' + ytdDed.toFixed(2);
    var mnEl = g('mil-pill-month'); if (mnEl) mnEl.textContent = monMiles.toFixed(1) + ' mi';
  } catch(e) {}
}

function exportMileageCSV() {
  if (!_mileageRecordsCache.length) { showToast('No trips to export'); return; }
  var sorted = _mileageRecordsCache.slice().sort(function(a, b) { return (a.date || '').localeCompare(b.date || ''); });
  var rows = [['Date', 'Purpose', 'Miles', 'Deduction ($' + IRS_RATE.toFixed(2) + '/mile)', 'Notes']];
  var totalMiles = 0, totalDed = 0;
  sorted.forEach(function(r) {
    var miles = parseFloat(r.miles) || 0;
    var ded = miles * IRS_RATE;
    totalMiles += miles; totalDed += ded;
    rows.push([r.date || '', r.purpose || '', miles.toFixed(1), ded.toFixed(2), r.notes || '']);
  });
  rows.push(['', 'TOTAL', totalMiles.toFixed(1), totalDed.toFixed(2), '']);
  var csv = rows.map(function(row) {
    return row.map(function(cell) {
      var s = String(cell);
      if (s.indexOf(',') !== -1 || s.indexOf('"') !== -1 || s.indexOf('\n') !== -1) { s = '"' + s.replace(/"/g, '""') + '"'; }
      return s;
    }).join(',');
  }).join('\r\n');
  var year = new Date().getFullYear();
  var blob = new Blob([csv], {type: 'text/csv'});
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url; a.download = 'iron-g-mileage-' + year + '.csv';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
}

// ── MILEAGE FORM ───────────────────────────────────────

function openNewMileage() {
  var today = new Date().toISOString().slice(0, 10);
  var html =
    '<div class="fg"><label class="fl">Date *</label>' +
      '<input class="fi" id="mf-date" type="date" value="' + today + '">' +
    '</div>' +
    '<div class="fg"><label class="fl">Purpose *</label>' +
      '<input class="fi" id="mf-purpose" type="text" placeholder="e.g. Trailer pickup from Custom Trailer Sales">' +
      '<div class="maint-field-error" id="mf-err-purpose">Purpose is required</div>' +
    '</div>' +
    '<div class="fg"><label class="fl">Miles *</label>' +
      '<input class="fi" id="mf-miles" type="number" min="0.1" step="0.1" placeholder="0.0" oninput="_updateMileageDeductionPreview()">' +
      '<div class="maint-field-error" id="mf-err-miles">Miles is required</div>' +
      '<div id="mf-ded-preview" style="font-size:12px;color:var(--muted);margin-top:6px;">IRS deduction: — (enter miles above)</div>' +
    '</div>' +
    '<div class="fg"><label class="fl">Notes</label>' +
      '<textarea class="fi form-textarea" id="mf-notes" rows="2" placeholder="Optional"></textarea>' +
    '</div>' +
    '<button class="btn btn-primary" id="mileage-save-btn" onclick="saveMileageRecord()" style="width:100%;padding:14px;font-size:14px;letter-spacing:2px;margin-top:8px;" type="button">Log Trip</button>';

  var titleEl = g('expense-panel-title');
  if (titleEl) titleEl.textContent = 'Log Trip';
  var panelBody = g('expense-panel-body');
  if (panelBody) panelBody.innerHTML = html;
  openExpensePanel();
}

function _updateMileageDeductionPreview() {
  var milesEl = g('mf-miles');
  var preview = g('mf-ded-preview');
  if (!milesEl || !preview) return;
  var miles = parseFloat(milesEl.value);
  if (isNaN(miles) || miles <= 0) {
    preview.textContent = 'IRS deduction: — (enter miles above)';
  } else {
    var ded = miles * IRS_RATE;
    preview.textContent = 'IRS deduction: $' + ded.toFixed(2) + ' (' + miles.toFixed(1) + ' miles × $' + IRS_RATE.toFixed(2) + '/mile)';
  }
}

function _clearMileageErrors() {
  ['mf-err-purpose', 'mf-err-miles'].forEach(function(id) {
    var el = g(id); if (el) el.classList.remove('vis');
  });
}

async function saveMileageRecord() {
  _clearMileageErrors();
  var dateVal = g('mf-date') ? g('mf-date').value : '';
  var purpose = g('mf-purpose') ? g('mf-purpose').value.trim() : '';
  var milesEl = g('mf-miles');
  var miles = milesEl ? parseFloat(milesEl.value) : NaN;

  var valid = true;
  if (!purpose) { var e1 = g('mf-err-purpose'); if (e1) e1.classList.add('vis'); valid = false; }
  if (!milesEl || milesEl.value === '' || isNaN(miles) || miles <= 0) { var e2 = g('mf-err-miles'); if (e2) e2.classList.add('vis'); valid = false; }
  if (!valid) return;

  var now = Date.now();
  var record = {
    id: now,
    date: dateVal || new Date().toISOString().slice(0, 10),
    purpose: purpose,
    miles: miles,
    notes: g('mf-notes') ? g('mf-notes').value.trim() : '',
    createdAt: now
  };

  var btn = g('mileage-save-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }
  try {
    var res = await fetch('/mileage', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(record)});
    if (!res.ok) throw new Error('save failed');
    closeExpensePanel();
    var deduction = miles * IRS_RATE;
    showToast('Trip logged — $' + deduction.toFixed(2) + ' deduction added');
    var listRes = await fetch('/mileage');
    if (listRes.ok) { try { _mileageRecordsCache = await listRes.json(); } catch(ex) {} }
    var container = g('mileage-records-body');
    if (container) renderMileageCards(_mileageRecordsCache);
    refreshMileageSummaryPills();
  } catch(e) {
    showToast('Save failed — please try again');
    if (btn) { btn.disabled = false; btn.textContent = 'Log Trip'; }
  }
}

// ── FINANCIALS PAGE ────────────────────────────────────

async function drawFinancialsPage() {
  var page = g('page-financials'); if (!page) return;
  page.innerHTML = '<div style="text-align:center;padding:40px;color:var(--muted);font-size:13px;">Loading financials...</div>';
  try {
    var results = await Promise.allSettled([
      fetch('/revenue/summary'),
      fetch('/expenses/summary'),
      fetch('/tax/liability')
    ]);
    var revSummary = {}, expSummary = {}, taxData = {};
    if (results[0].status === 'fulfilled' && results[0].value.ok) { try { revSummary = await results[0].value.json(); } catch(e) {} }
    if (results[1].status === 'fulfilled' && results[1].value.ok) { try { expSummary = await results[1].value.json(); } catch(e) {} }
    if (results[2].status === 'fulfilled' && results[2].value.ok) { try { taxData = await results[2].value.json(); } catch(e) {} }

    if (!g('page-financials')) return;

    var now = new Date();
    var lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    var lastMonthStr = lastMonthDate.toISOString().slice(0, 7);
    var filedStatuses = {};
    var taxMonths = taxData.months || taxData.data || [];
    for (var mi = 0; mi < taxMonths.length; mi++) {
      var mkey = taxMonths[mi].month;
      if (mkey) filedStatuses[mkey] = !!(await idbGet('tax:filed:' + mkey));
    }
    if (!filedStatuses.hasOwnProperty(lastMonthStr)) {
      filedStatuses[lastMonthStr] = !!(await idbGet('tax:filed:' + lastMonthStr));
    }

    page.innerHTML =
      _finBuildPLSection(revSummary, expSummary) +
      _finBuildTaxSection(taxData, filedStatuses) +
      _finBuildMonthlyBreakdown(revSummary, expSummary, taxData) +
      _finBuildExpenseBreakdown(expSummary);
  } catch(e) {
    var pg = g('page-financials');
    if (pg) pg.innerHTML = '<div style="color:var(--danger);text-align:center;padding:40px;font-size:13px;">Failed to load financials.</div>';
  }
}

function _finBuildPLSection(rev, exp) {
  var totalRev = parseFloat(rev.total || rev.totalRevenue || rev.allTimeRevenue || 0);
  var totalExp = parseFloat(exp.total || exp.totalExpenses || exp.allTime || 0);
  var netAll = totalRev - totalExp;
  var monRev = parseFloat(rev.currentMonthRevenue || rev.currentMonth || 0);
  var monExp = parseFloat(exp.currentMonthTotal || 0);
  var monNet = monRev - monExp;
  var lmRev = parseFloat(rev.lastMonthRevenue || rev.lastMonth || 0);
  var lmExp = parseFloat(exp.lastMonthTotal || 0);
  var lmNet = lmRev - lmExp;

  function netFmt(n) { return (n >= 0 ? '' : '−') + '$' + Math.abs(n).toFixed(2); }
  function netClr(n) { return n >= 0 ? 'var(--success)' : 'var(--danger)'; }

  return '<div class="card fin-section">' +
    '<div class="card-header"><div class="card-title">P&amp;L Summary</div></div>' +
    '<div class="card-body">' +
      '<div class="fin-pl-stats">' +
        '<div class="fin-pl-stat"><div class="fin-pl-label" style="color:#5ba3d9;">REVENUE</div><div class="fin-pl-value" style="color:#5ba3d9;">$' + totalRev.toFixed(2) + '</div></div>' +
        '<div class="fin-pl-stat"><div class="fin-pl-label" style="color:var(--primary);">EXPENSES</div><div class="fin-pl-value" style="color:var(--primary);">$' + totalExp.toFixed(2) + '</div></div>' +
        '<div class="fin-pl-stat"><div class="fin-pl-label" style="color:' + netClr(netAll) + ';">NET PROFIT</div><div class="fin-pl-value" style="color:' + netClr(netAll) + ';">' + netFmt(netAll) + '</div></div>' +
      '</div>' +
      '<div class="fin-pl-monthly">' +
        '<div class="fin-pl-month-col">' +
          '<div class="fin-pl-month-title">This Month</div>' +
          '<div class="fin-pl-row"><span>Revenue</span><span style="color:#5ba3d9;">$' + monRev.toFixed(2) + '</span></div>' +
          '<div class="fin-pl-row"><span>Expenses</span><span style="color:var(--primary);">$' + monExp.toFixed(2) + '</span></div>' +
          '<div class="fin-pl-row fin-pl-net-row"><span>Net</span><span style="color:' + netClr(monNet) + ';">' + netFmt(monNet) + '</span></div>' +
        '</div>' +
        '<div class="fin-pl-month-col">' +
          '<div class="fin-pl-month-title">Last Month</div>' +
          '<div class="fin-pl-row"><span>Revenue</span><span style="color:#5ba3d9;">$' + lmRev.toFixed(2) + '</span></div>' +
          '<div class="fin-pl-row"><span>Expenses</span><span style="color:var(--primary);">$' + lmExp.toFixed(2) + '</span></div>' +
          '<div class="fin-pl-row fin-pl-net-row"><span>Net</span><span style="color:' + netClr(lmNet) + ';">' + netFmt(lmNet) + '</span></div>' +
        '</div>' +
      '</div>' +
      '<div style="font-size:11px;color:var(--muted);line-height:1.6;">Revenue from confirmed, active, and completed bookings. Expenses from logged records.</div>' +
    '</div>' +
  '</div>';
}

function _finBuildTaxSection(taxData, filedStatuses) {
  var now = new Date();
  var today = now.toISOString().slice(0, 10);
  var currentMonthStr = now.toISOString().slice(0, 7);
  var lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  var lastMonthStr = lastMonthDate.toISOString().slice(0, 7);
  var taxMonths = taxData.months || taxData.data || [];
  var curData = null, lmData = null;
  taxMonths.forEach(function(m) {
    if (m.month === currentMonthStr) curData = m;
    if (m.month === lastMonthStr) lmData = m;
  });
  var curTax = parseFloat((curData || {}).taxCollected || (curData || {}).tax || 0);
  var lmTax = parseFloat((lmData || {}).taxCollected || (lmData || {}).tax || 0);
  var ytd = parseFloat(taxData.ytdCollected || taxData.totalCollected || 0);

  var curDueName = new Date(now.getFullYear(), now.getMonth() + 1, 20).toLocaleDateString('en-US', {month:'long', day:'numeric'});
  var lmDueDateStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-20';
  var lmDueName = new Date(lmDueDateStr + 'T00:00:00').toLocaleDateString('en-US', {month:'long', day:'numeric'});
  var curMonthLabel = new Date(currentMonthStr + '-01T00:00:00').toLocaleDateString('en-US', {month:'long', year:'numeric'});
  var lmMonthLabel = new Date(lastMonthStr + '-01T00:00:00').toLocaleDateString('en-US', {month:'long', year:'numeric'});

  var lmFiled = filedStatuses[lastMonthStr];
  var lmStatus, lmCls;
  if (lmFiled) {
    lmStatus = '✓ Filed'; lmCls = 'fin-tax-filed';
  } else if (today > lmDueDateStr) {
    lmStatus = 'PAST DUE'; lmCls = 'fin-tax-overdue';
  } else {
    var diff = Math.round((new Date(lmDueDateStr + 'T00:00:00') - new Date(today + 'T00:00:00')) / (1000*60*60*24));
    lmStatus = diff <= 10 ? 'Due Soon' : 'Pending';
    lmCls = diff <= 10 ? 'fin-tax-soon' : 'fin-tax-pending';
  }

  var fileBtn = lmFiled ? '' :
    '<button class="btn btn-ghost btn-sm" id="tax-file-btn-' + lastMonthStr + '" onclick="markTaxFiled(\'' + lastMonthStr + '\')" style="margin-top:10px;width:100%;">Mark as Filed</button>';

  return '<div class="card fin-section">' +
    '<div class="card-header"><div class="card-title">Sales Tax Liability</div></div>' +
    '<div class="card-body">' +
      '<div class="fin-tax-cards">' +
        '<div class="fin-tax-card">' +
          '<div class="fin-tax-month">' + escHtml(curMonthLabel) + '</div>' +
          '<div class="fin-tax-amount">$' + curTax.toFixed(2) + '</div>' +
          '<div class="fin-tax-due">Due ' + escHtml(curDueName) + '</div>' +
          '<span class="fin-tax-badge fin-tax-inprogress">In Progress</span>' +
        '</div>' +
        '<div class="fin-tax-card">' +
          '<div class="fin-tax-month">' + escHtml(lmMonthLabel) + '</div>' +
          '<div class="fin-tax-amount">$' + lmTax.toFixed(2) + '</div>' +
          '<div class="fin-tax-due">Due ' + escHtml(lmDueName) + '</div>' +
          '<span class="fin-tax-badge ' + lmCls + '" id="tax-badge-' + lastMonthStr + '">' + lmStatus + '</span>' +
          fileBtn +
        '</div>' +
      '</div>' +
      '<div style="font-size:13px;color:var(--muted);margin-top:12px;">Year to Date Collected: <strong style="color:var(--text);">$' + ytd.toFixed(2) + '</strong></div>' +
      '<div style="font-size:11px;color:var(--muted);margin-top:6px;">File monthly at oktap.gov by the 20th of each month.</div>' +
      '<button class="btn btn-ghost btn-sm" style="margin-top:10px;" onclick="window.open(\'https://oktap.ok.gov\',\'_blank\')">Go to OkTAP ↗</button>' +
    '</div>' +
  '</div>';
}

function _finBuildMonthlyBreakdown(rev, exp, taxData) {
  var now = new Date();
  var months = [];
  for (var i = 0; i < 6; i++) {
    months.push(new Date(now.getFullYear(), now.getMonth() - i, 1).toISOString().slice(0, 7));
  }
  var currentMonthStr = now.toISOString().slice(0, 7);
  var lmStr = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 7);

  var revByM = {};
  (rev.byMonth || rev.months || []).forEach(function(m) { revByM[m.month] = parseFloat(m.total || m.revenue || 0); });
  if (rev.currentMonthRevenue !== undefined || rev.currentMonth !== undefined) revByM[currentMonthStr] = parseFloat(rev.currentMonthRevenue || rev.currentMonth || 0);
  if (rev.lastMonthRevenue !== undefined || rev.lastMonth !== undefined) revByM[lmStr] = parseFloat(rev.lastMonthRevenue || rev.lastMonth || 0);

  var taxByM = {};
  (taxData.months || taxData.data || []).forEach(function(m) { taxByM[m.month] = parseFloat(m.taxCollected || m.tax || 0); });

  var expByM = {};
  expByM[currentMonthStr] = parseFloat(exp.currentMonthTotal || 0);
  expByM[lmStr] = parseFloat(exp.lastMonthTotal || 0);

  var rows = '';
  months.forEach(function(m) {
    var label = new Date(m + '-01T00:00:00').toLocaleDateString('en-US', {month:'short', year:'numeric'});
    var mRev = revByM[m] || 0, mTax = taxByM[m] || 0, mExp = expByM[m] || 0;
    var mNet = mRev - mExp;
    var ns = mNet >= 0 ? 'color:var(--success);' : 'color:var(--danger);';
    rows += '<tr><td>' + escHtml(label) + '</td><td>$' + mRev.toFixed(2) + '</td><td>$' + mTax.toFixed(2) + '</td><td>$' + mExp.toFixed(2) + '</td>' +
      '<td style="' + ns + 'font-weight:600;">' + (mNet >= 0 ? '' : '−') + '$' + Math.abs(mNet).toFixed(2) + '</td></tr>';
  });

  return '<div class="card fin-section">' +
    '<div class="card-header"><div class="card-title">Monthly Breakdown</div><button class="btn btn-ghost btn-sm" onclick="_finExportPL()">⬇ Export P&amp;L</button></div>' +
    '<div class="card-body" style="padding:0;overflow-x:auto;">' +
      '<table class="fin-table">' +
        '<thead><tr><th>Month</th><th>Revenue</th><th>Tax Coll.</th><th>Expenses</th><th>Net P/L</th></tr></thead>' +
        '<tbody>' + rows + '</tbody>' +
      '</table>' +
    '</div>' +
  '</div>';
}

function _finExportPL() {
  var rows = [['Month', 'Revenue', 'Tax Collected', 'Expenses', 'Net Profit/Loss']];
  document.querySelectorAll('.fin-table tbody tr').forEach(function(tr) {
    var cells = tr.querySelectorAll('td');
    if (cells.length >= 5) rows.push(Array.from(cells).map(function(td) { return td.textContent.trim(); }));
  });
  var csv = rows.map(function(row) {
    return row.map(function(cell) {
      var s = String(cell);
      if (s.indexOf(',') !== -1 || s.indexOf('"') !== -1) s = '"' + s.replace(/"/g, '""') + '"';
      return s;
    }).join(',');
  }).join('\r\n');
  var year = new Date().getFullYear();
  var blob = new Blob([csv], {type: 'text/csv'});
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url; a.download = 'iron-g-pl-' + year + '.csv';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
}

function _finBuildExpenseBreakdown(exp) {
  var byCategory = exp.byCategory || {};
  var totalDeductible = parseFloat(exp.taxDeductibleTotal || 0);
  var cats = Object.keys(byCategory).map(function(k) { return {name: k, amount: parseFloat(byCategory[k]) || 0}; })
    .filter(function(c) { return c.amount > 0; })
    .sort(function(a, b) { return b.amount - a.amount; });
  var totalExp = cats.reduce(function(s, c) { return s + c.amount; }, 0) || 1;

  if (!cats.length) {
    return '<div class="card fin-section">' +
      '<div class="card-header"><div class="card-title">Expense Breakdown</div></div>' +
      '<div class="card-body"><div style="color:var(--muted);font-size:13px;text-align:center;padding:20px;">No expense data yet.</div></div>' +
    '</div>';
  }

  var bars = cats.map(function(c) {
    var pct = (c.amount / totalExp) * 100;
    return '<div class="fin-cat-row">' +
      '<div style="display:flex;justify-content:space-between;margin-bottom:4px;">' +
        '<span class="fin-cat-name">' + escHtml(c.name) + '</span>' +
        '<span class="fin-cat-amount">$' + c.amount.toFixed(2) + ' <span class="fin-cat-pct">(' + pct.toFixed(0) + '%)</span></span>' +
      '</div>' +
      '<div class="fin-cat-bar-wrap"><div class="fin-cat-bar" style="width:' + Math.max(pct, 2).toFixed(1) + '%"></div></div>' +
    '</div>';
  }).join('');

  return '<div class="card fin-section">' +
    '<div class="card-header"><div class="card-title">Expense Breakdown</div></div>' +
    '<div class="card-body">' +
      bars +
      '<div style="margin-top:14px;padding-top:14px;border-top:1px solid #1a1a1a;">' +
        '<div style="font-size:13px;color:var(--muted);">Estimated tax deductible expenses: <strong style="color:#00c87a;">$' + totalDeductible.toFixed(2) + '</strong></div>' +
        '<div style="font-size:11px;color:var(--muted);margin-top:6px;">Consult a tax professional for filing advice.</div>' +
      '</div>' +
    '</div>' +
  '</div>';
}

async function markTaxFiled(month) {
  try { await idbPut('tax:filed:' + month, true); } catch(e) {}
  var badge = g('tax-badge-' + month);
  if (badge) { badge.className = 'fin-tax-badge fin-tax-filed'; badge.textContent = '✓ Filed'; }
  var btn = g('tax-file-btn-' + month);
  if (btn) btn.style.display = 'none';
  loadDashboardTaxReminder();
  showToast('Marked as filed');
}

// ── DASHBOARD TAX REMINDER ─────────────────────────────

async function loadDashboardTaxReminder() {
  var container = g('dash-tax-reminder'); if (!container) return;
  var now = new Date();
  var today = now.toISOString().slice(0, 10);
  var lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  var lastMonthStr = lastMonthDate.toISOString().slice(0, 7);

  var filed = await idbGet('tax:filed:' + lastMonthStr);
  if (filed) { container.innerHTML = ''; return; }

  var dueY = now.getFullYear(), dueM = now.getMonth() + 1;
  var dueDateStr = dueY + '-' + String(dueM).padStart(2, '0') + '-20';
  var daysUntilDue = Math.round((new Date(dueDateStr + 'T00:00:00') - new Date(today + 'T00:00:00')) / (1000*60*60*24));

  if (daysUntilDue > 10) { container.innerHTML = ''; return; }

  var taxAmount = 0;
  try {
    var res = await fetch('/tax/liability');
    if (res.ok) {
      var td = await res.json();
      var tms = td.months || td.data || [];
      for (var i = 0; i < tms.length; i++) {
        if (tms[i].month === lastMonthStr) { taxAmount = parseFloat(tms[i].taxCollected || tms[i].tax || 0); break; }
      }
    }
  } catch(e) {}

  var lmLabel = lastMonthDate.toLocaleDateString('en-US', {month:'long', year:'numeric'});
  var dueDateLabel = new Date(dueDateStr + 'T00:00:00').toLocaleDateString('en-US', {month:'long', day:'numeric'});
  var lmSafe = escHtml(lastMonthStr);

  if (daysUntilDue < 0) {
    container.innerHTML = '<div class="card dash-tax-card dash-tax-urgent">' +
      '<div class="card-header"><div class="card-title" style="color:var(--danger);">⚠ Sales Tax PAST DUE — $' + taxAmount.toFixed(2) + '</div>' +
        '<button class="btn btn-ghost btn-sm" onclick="markTaxFiled(\'' + lmSafe + '\')">Mark Filed</button></div>' +
      '<div class="card-body">' +
        '<div style="font-size:13px;color:var(--text);margin-bottom:4px;">' + escHtml(lmLabel) + ' — was due ' + escHtml(dueDateLabel) + '</div>' +
        '<div style="font-size:12px;color:var(--muted);">File immediately at <strong>oktap.ok.gov</strong></div>' +
      '</div>' +
    '</div>';
  } else {
    container.innerHTML = '<div class="card dash-tax-card dash-tax-warning">' +
      '<div class="card-header"><div class="card-title" style="color:var(--warning);">🔔 Sales Tax Due ' + escHtml(dueDateLabel) + ' — $' + taxAmount.toFixed(2) + '</div>' +
        '<button class="btn btn-ghost btn-sm" onclick="markTaxFiled(\'' + lmSafe + '\')">Mark Filed</button></div>' +
      '<div class="card-body">' +
        '<div style="font-size:13px;color:var(--text);margin-bottom:4px;">' + escHtml(lmLabel) + '</div>' +
        '<div style="font-size:12px;color:var(--muted);">File by ' + escHtml(dueDateLabel) + ' at <strong>oktap.ok.gov</strong></div>' +
      '</div>' +
    '</div>';
  }
}

// ── BUSINESS INFO PAGE ─────────────────────────────────

var _biAdditionalPermits = [];

async function drawBusinessInfoPage() {
  var page = g('page-business-info'); if (!page) return;
  page.innerHTML = '<div style="text-align:center;padding:40px;color:var(--muted);font-size:13px;">Loading...</div>';

  var d = {};
  try {
    var res = await fetch('/businessinfo');
    if (res.ok) { try { d = await res.json(); } catch(e) {} }
  } catch(e) {}

  _biAdditionalPermits = Array.isArray(d.additionalPermits)
    ? d.additionalPermits.map(function(p) { return {name: p.name || '', number: p.number || ''}; })
    : [];

  var now = new Date();
  var today = now.toISOString().slice(0, 10);
  var nextDueDate = new Date(now.getFullYear(), now.getMonth() + 1, 20);
  var nextDueDateStr = nextDueDate.toISOString().slice(0, 10);
  var daysToFile = Math.round((nextDueDate - now) / (1000 * 60 * 60 * 24));
  var nextDueLabel = nextDueDate.toLocaleDateString('en-US', {month: 'long', day: 'numeric', year: 'numeric'});
  var nextDueColor = today > nextDueDateStr ? 'var(--danger)' : (daysToFile <= 10 ? 'var(--warning)' : 'var(--text)');

  var insurWarning = '';
  if (d.renewalDate) {
    var renewDate = new Date(d.renewalDate + 'T00:00:00');
    var daysToRenew = Math.round((renewDate - now) / (1000 * 60 * 60 * 24));
    var rLabel = renewDate.toLocaleDateString('en-US', {month: 'long', day: 'numeric', year: 'numeric'});
    if (daysToRenew < 0) {
      insurWarning = '<div style="background:rgba(255,60,60,.1);border:1px solid rgba(255,60,60,.3);border-radius:6px;padding:10px 14px;margin-bottom:12px;font-size:13px;color:var(--danger);">⚠ Insurance renewal may be overdue — check policy</div>';
    } else if (daysToRenew <= 30) {
      insurWarning = '<div style="background:rgba(255,183,0,.1);border:1px solid rgba(255,183,0,.3);border-radius:6px;padding:10px 14px;margin-bottom:12px;font-size:13px;color:var(--warning);">⚠ Insurance renewal coming up on ' + escHtml(rLabel) + '</div>';
    }
  }

  function fi(id, label, type, val, ph, extra) {
    var ea = extra ? ' ' + extra : '';
    if (type === 'textarea') {
      return '<div class="fg"><label class="fl">' + label + '</label>' +
        '<textarea class="fi form-textarea" id="' + id + '" rows="2" placeholder="' + escHtml(ph || '') + '"' + ea + '>' + escHtml(val || '') + '</textarea></div>';
    }
    return '<div class="fg"><label class="fl">' + label + '</label>' +
      '<input class="fi" id="' + id + '" type="' + type + '" value="' + escHtml(String(val || '')) + '" placeholder="' + escHtml(ph || '') + '"' + ea + '></div>';
  }

  page.innerHTML =
    '<div class="expense-page-header">' +
      '<div style="font-family:\'Oswald\',sans-serif;font-size:11px;color:var(--muted);letter-spacing:2px;text-transform:uppercase;">Business Info</div>' +
      '<button class="btn btn-ghost btn-sm" onclick="exportBusinessInfo()">⬇ Export</button>' +
    '</div>' +

    '<div class="card">' +
      '<div class="card-header"><div class="card-title"><span class="bi-section-header">Business Identity</span></div></div>' +
      '<div class="card-body">' +
        fi('bi-legalName', 'Legal Business Name', 'text', d.legalName, 'Iron G Equipment Co. LLC') +
        fi('bi-dba', 'DBA / Trade Name', 'text', d.dba, 'Iron G Equipment Co.') +
        fi('bi-ein', 'EIN', 'text', d.ein, 'XX-XXXXXXX') +
        fi('bi-formationDate', 'Formation Date', 'date', d.formationDate, '') +
        fi('bi-formationState', 'State of Formation', 'text', d.formationState || 'Oklahoma', 'Oklahoma') +
        fi('bi-llcType', 'LLC Type', 'text', d.llcType || 'Single-member LLC', 'Single-member LLC') +
      '</div>' +
    '</div>' +

    '<div class="card">' +
      '<div class="card-header"><div class="card-title"><span class="bi-section-header">Registered Agent</span></div></div>' +
      '<div class="card-body">' +
        fi('bi-agentName', 'Agent Name', 'text', d.agentName || 'Northwest Registered Agent', 'Northwest Registered Agent') +
        fi('bi-agentAddress', 'Registered Address', 'textarea', d.agentAddress, '') +
        fi('bi-agentPhone', 'Agent Phone', 'tel', d.agentPhone, '') +
        fi('bi-agentEmail', 'Agent Email', 'email', d.agentEmail, '') +
      '</div>' +
    '</div>' +

    '<div class="card">' +
      '<div class="card-header"><div class="card-title"><span class="bi-section-header">Contact &amp; Location</span></div></div>' +
      '<div class="card-body">' +
        fi('bi-businessPhone', 'Business Phone', 'tel', d.businessPhone || '(405) 393-4161', '(405) 393-4161') +
        fi('bi-businessEmail', 'Business Email', 'email', d.businessEmail || 'frank@irongequipment.com', 'frank@irongequipment.com') +
        fi('bi-website', 'Website', 'text', d.website || 'irongequipment.com', 'irongequipment.com') +
        fi('bi-mailingAddress', 'Mailing Address', 'textarea', d.mailingAddress, 'If different from registered address') +
        fi('bi-operatingLocation', 'Operating Location', 'textarea', d.operatingLocation || 'Mother Road RV Boat & Trailer Storage, 16245 W HWY 66, Yukon, OK 73099', '') +
      '</div>' +
    '</div>' +

    '<div class="card">' +
      '<div class="card-header"><div class="card-title"><span class="bi-section-header">Licenses &amp; Permits</span></div></div>' +
      '<div class="card-body">' +
        fi('bi-salesTaxPermit', 'Oklahoma Sales Tax Permit #', 'text', d.salesTaxPermit, '') +
        fi('bi-filingFrequency', 'Filing Frequency', 'text', d.filingFrequency || 'Monthly', 'Monthly') +
        '<div class="fg"><label class="fl">🔒 Next Filing Due</label>' +
          '<div class="bi-readonly-field" style="color:' + nextDueColor + ';">' + escHtml(nextDueLabel) + '</div>' +
        '</div>' +
        '<div class="fg">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">' +
            '<label class="fl" style="margin:0;">Additional Permits</label>' +
            '<button class="btn btn-ghost btn-sm" onclick="addBIPermit()" type="button">+ Add Permit</button>' +
          '</div>' +
          '<div id="bi-permits-list"></div>' +
        '</div>' +
      '</div>' +
    '</div>' +

    '<div class="card">' +
      '<div class="card-header"><div class="card-title"><span class="bi-section-header">Banking &amp; Payments</span></div></div>' +
      '<div class="card-body">' +
        fi('bi-bankName', 'Bank Name', 'text', d.bankName, '') +
        fi('bi-accountType', 'Account Type', 'text', d.accountType, 'Business Checking') +
        fi('bi-stripeAccountId', 'Stripe Account ID', 'text', d.stripeAccountId, 'acct_XXXXXXXXX (reference only)') +
        '<div style="font-size:11px;color:var(--muted);margin-top:4px;">Never store full account numbers or passwords here.</div>' +
      '</div>' +
    '</div>' +

    '<div class="card">' +
      '<div class="card-header"><div class="card-title"><span class="bi-section-header">Insurance</span></div></div>' +
      '<div class="card-body">' +
        insurWarning +
        fi('bi-insuranceProvider', 'Insurance Provider', 'text', d.insuranceProvider, '') +
        fi('bi-policyNumber', 'Policy Number', 'text', d.policyNumber, '') +
        fi('bi-coverageType', 'Coverage Type', 'text', d.coverageType, 'Commercial General Liability') +
        '<div class="fg"><label class="fl">Annual Premium</label>' +
          '<div class="maint-cost-row"><span class="maint-cost-prefix">$</span>' +
            '<input class="fi" id="bi-premiumAmount" type="number" min="0" step="0.01" value="' + escHtml(String(d.premiumAmount || '')) + '" placeholder="0.00" style="flex:1;">' +
          '</div>' +
        '</div>' +
        fi('bi-renewalDate', 'Renewal Date', 'date', d.renewalDate, '') +
        fi('bi-agentContactName', 'Agent Contact Name', 'text', d.agentContactName, '') +
        fi('bi-agentContactPhone', 'Agent Contact Phone', 'tel', d.agentContactPhone, '') +
      '</div>' +
    '</div>' +

    '<div class="card">' +
      '<div class="card-header"><div class="card-title"><span class="bi-section-header">Notes</span></div></div>' +
      '<div class="card-body">' +
        fi('bi-notes', 'Notes', 'textarea', d.notes, 'Any additional business notes, reminders, or reference info', 'rows="4"') +
      '</div>' +
    '</div>' +

    '<div style="padding:0 16px 24px;">' +
      '<button class="btn btn-primary" id="bi-save-btn" onclick="saveBusinessInfo()" style="width:100%;padding:14px;font-size:14px;letter-spacing:2px;" type="button">Save All</button>' +
    '</div>';

  _biRenderPermits();
}

function _biRenderPermits() {
  var container = g('bi-permits-list'); if (!container) return;
  if (!_biAdditionalPermits.length) {
    container.innerHTML = '<div style="color:var(--muted);font-size:12px;padding:6px 0;">No additional permits. Tap + Add Permit to add one.</div>';
    return;
  }
  container.innerHTML = _biAdditionalPermits.map(function(p, i) {
    return '<div class="bi-permit-row">' +
      '<input class="fi" id="bi-permit-name-' + i + '" type="text" value="' + escHtml(p.name) + '" placeholder="Permit name">' +
      '<input class="fi" id="bi-permit-num-' + i + '" type="text" value="' + escHtml(p.number) + '" placeholder="Permit #">' +
      '<button class="btn btn-danger btn-sm" onclick="removeBIPermit(' + i + ')" type="button">✕</button>' +
    '</div>';
  }).join('');
}

function _biSyncPermitsFromDOM() {
  _biAdditionalPermits.forEach(function(p, i) {
    var ne = g('bi-permit-name-' + i); if (ne) p.name = ne.value;
    var ue = g('bi-permit-num-' + i); if (ue) p.number = ue.value;
  });
}

function addBIPermit() {
  _biSyncPermitsFromDOM();
  _biAdditionalPermits.push({name: '', number: ''});
  _biRenderPermits();
}

function removeBIPermit(idx) {
  _biSyncPermitsFromDOM();
  _biAdditionalPermits.splice(idx, 1);
  _biRenderPermits();
}

async function saveBusinessInfo() {
  _biSyncPermitsFromDOM();
  function fv(id) { var el = g(id); return el ? el.value.trim() : ''; }
  var data = {
    legalName: fv('bi-legalName'), dba: fv('bi-dba'), ein: fv('bi-ein'),
    formationDate: fv('bi-formationDate'), formationState: fv('bi-formationState'), llcType: fv('bi-llcType'),
    agentName: fv('bi-agentName'), agentAddress: fv('bi-agentAddress'), agentPhone: fv('bi-agentPhone'), agentEmail: fv('bi-agentEmail'),
    businessPhone: fv('bi-businessPhone'), businessEmail: fv('bi-businessEmail'), website: fv('bi-website'),
    mailingAddress: fv('bi-mailingAddress'), operatingLocation: fv('bi-operatingLocation'),
    salesTaxPermit: fv('bi-salesTaxPermit'), filingFrequency: fv('bi-filingFrequency'),
    additionalPermits: _biAdditionalPermits.filter(function(p) { return p.name || p.number; }),
    bankName: fv('bi-bankName'), accountType: fv('bi-accountType'), stripeAccountId: fv('bi-stripeAccountId'),
    insuranceProvider: fv('bi-insuranceProvider'), policyNumber: fv('bi-policyNumber'), coverageType: fv('bi-coverageType'),
    premiumAmount: fv('bi-premiumAmount'), renewalDate: fv('bi-renewalDate'),
    agentContactName: fv('bi-agentContactName'), agentContactPhone: fv('bi-agentContactPhone'),
    notes: fv('bi-notes')
  };
  var btn = g('bi-save-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }
  try {
    var res = await fetch('/businessinfo', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data)});
    if (!res.ok) throw new Error('save failed');
    showToast('Business info saved — syncing to Drive...');
    setTimeout(function() { showToast('✓ Synced to Google Drive'); }, 2000);
    loadDashboardInsurReminder();
  } catch(e) {
    showToast('Save failed — please try again');
  }
  if (btn) { btn.disabled = false; btn.textContent = 'Save All'; }
}

async function exportBusinessInfo() {
  try {
    var res = await fetch('/businessinfo/export');
    if (!res.ok) throw new Error('export failed');
    var blob = await res.blob();
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = 'iron-g-business-info.txt';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
  } catch(e) { showToast('Export failed'); }
}

// ── DASHBOARD INSURANCE REMINDER ──────────────────────

async function loadDashboardInsurReminder() {
  var container = g('dash-insur-reminder'); if (!container) return;
  try {
    var res = await fetch('/businessinfo');
    if (!res.ok) { container.innerHTML = ''; return; }
    var d = await res.json();
    if (!d.renewalDate) { container.innerHTML = ''; return; }
    var now = new Date();
    var renewDate = new Date(d.renewalDate + 'T00:00:00');
    var daysToRenew = Math.round((renewDate - now) / (1000 * 60 * 60 * 24));
    var renewLabel = renewDate.toLocaleDateString('en-US', {month: 'long', day: 'numeric', year: 'numeric'});
    var provider = d.insuranceProvider ? escHtml(d.insuranceProvider) : 'Check policy details';
    if (daysToRenew < 0) {
      container.innerHTML = '<div class="card dash-insur-card dash-insur-urgent">' +
        '<div class="card-header"><div class="card-title" style="color:var(--danger);">⚠ Insurance renewal may be overdue</div>' +
          '<button class="btn btn-ghost btn-sm" onclick="navTo(\'business-info\')">View</button></div>' +
        '<div class="card-body"><div style="font-size:13px;color:var(--text);">' + provider + '</div></div>' +
      '</div>';
    } else if (daysToRenew <= 30) {
      container.innerHTML = '<div class="card dash-insur-card dash-insur-warning">' +
        '<div class="card-header"><div class="card-title" style="color:var(--warning);">🔔 Insurance renewal due ' + escHtml(renewLabel) + '</div>' +
          '<button class="btn btn-ghost btn-sm" onclick="navTo(\'business-info\')">View</button></div>' +
        '<div class="card-body"><div style="font-size:13px;color:var(--text);">' + provider + '</div></div>' +
      '</div>';
    } else {
      container.innerHTML = '';
    }
  } catch(e) { container.innerHTML = ''; }
}
