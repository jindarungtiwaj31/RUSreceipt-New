(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const STORE_KEY = 'rusreceipt_new_complete_v1';
  const CONFIG = window.RECEIPT_APP_DATABASE_CONFIG || {};
  const SEED = window.RUS_RECEIPT_SEED || {};
  const session = { role: '', user: null, page: 'dashboard' };
  let db = normalize(loadLocal());
  let cloud = null;
  let cloudReady = false;
  let applyingRemote = false;

  document.addEventListener('DOMContentLoaded', () => {
    bindLogin();
    bindShell();
    connectCloud();
    markDb();
  });

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function uid(prefix) { return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`; }
  function now() { return new Date().toISOString(); }
  function today() { return now().slice(0, 10); }
  function money(n) { return Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function baht(n) { return `${money(n)} บาท`; }
  function esc(v) { return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function thaiDate(v) {
    const [y, m, d] = String(v || '').split('-').map(Number);
    return y ? `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y + 543}` : '-';
  }
  function thaiDateTime(v) {
    try { return new Date(v || Date.now()).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' }); }
    catch { return '-'; }
  }
  function optionList(items) { return (items || []).map((x) => `<option>${esc(x)}</option>`).join(''); }
  function toast(message, type = 'info') {
    const el = $('toast');
    if (!el) return alert(message);
    el.textContent = message;
    el.className = `toast ${type}`;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.classList.add('hidden'), 3000);
  }

  function loadLocal() {
    try {
      return JSON.parse(localStorage.getItem(STORE_KEY) || localStorage.getItem('rusreceipt_new_database_v2') || localStorage.getItem('rusreceipt_new_database_v1') || 'null');
    } catch { return null; }
  }
  function normalize(raw) {
    const src = raw && typeof raw === 'object' ? raw : {};
    const out = clone({
      meta: { projectName: 'RUSreceipt-New', version: '1.2.0', updatedAt: now() },
      settings: {}, users: [], prefixes: [], paymentItems: [], projects: [], departments: [], banks: [], books: [], receipts: []
    });
    Object.assign(out, clone(SEED), src);
    out.meta = Object.assign({}, SEED.meta || {}, src.meta || {}, { updatedAt: src.meta?.updatedAt || now() });
    out.settings = Object.assign({}, SEED.settings || {}, src.settings || {});
    ['users', 'prefixes', 'paymentItems', 'projects', 'departments', 'banks', 'books', 'receipts'].forEach((key) => {
      out[key] = Array.isArray(src[key]) ? src[key] : clone(SEED[key] || []);
    });
    if (!out.books.length) out.books = clone(SEED.books || []);
    out.books = out.books.map((b, i) => ({
      id: b.id || uid('book'), name: b.name || `เล่มที่ ${i + 1}`, prefix: b.prefix || 'RUS',
      start: Number(b.start || 1), current: Number(b.current || b.start || 1), end: Number(b.end || 9999),
      digits: Number(b.digits || 5), active: b.active !== false, note: b.note || ''
    }));
    out.users = out.users.map((u) => ({
      id: u.id || uid('usr'), code: String(u.code || '').padStart(4, '0').slice(0, 4),
      name: u.name || 'User', note: u.note || '', active: u.active !== false, createdAt: u.createdAt || now()
    })).filter((u) => /^\d{4}$/.test(u.code));
    out.receipts = out.receipts.map(cleanReceipt);
    return out;
  }
  function cleanReceipt(r) {
    const items = (Array.isArray(r.items) ? r.items : []).map((x) => ({
      desc: x.desc || x.name || '', qty: Number(x.qty || 1), amount: Number(x.amount || 0)
    })).filter((x) => x.desc && x.amount >= 0);
    return {
      id: r.id || uid('rcp'), number: r.number || '', bookId: r.bookId || 'book_main', date: r.date || today(),
      payer: r.payer || '', payerTaxId: r.payerTaxId || '', payerAddress: r.payerAddress || '', payerPhone: r.payerPhone || '',
      department: r.department || '', projectName: r.projectName || '', paymentMethod: r.paymentMethod || 'เงินสด', paymentRef: r.paymentRef || '',
      note: r.note || '', items, total: items.reduce((sum, x) => sum + (x.qty * x.amount), 0),
      status: r.status || 'active', createdBy: r.createdBy || 'Admin', createdAt: r.createdAt || now(), cancelledAt: r.cancelledAt || ''
    };
  }
  function save(sync = true) {
    db.meta.updatedAt = now();
    localStorage.setItem(STORE_KEY, JSON.stringify(db));
    if (sync && cloud && !applyingRemote) {
      cloud.set(clone(db)).then(() => { cloudReady = true; markDb(); }).catch(() => {
        cloudReady = false; markDb(); toast('บันทึกในเครื่องแล้ว แต่ส่งขึ้นฐานกลางไม่สำเร็จ', 'warn');
      });
    }
    markDb();
  }

  function connectCloud() {
    const url = CONFIG.firebaseConfig?.databaseURL || CONFIG.databaseURL;
    const path = CONFIG.path || 'receipt-app/RUSreceipt-New';
    if (!CONFIG.enabled || !url) return;
    const endpoint = `${url.replace(/\/$/, '')}/${path.replace(/^\/+|\/+$/g, '')}.json`;
    cloud = {
      get: async () => { const res = await fetch(endpoint, { cache: 'no-store' }); if (!res.ok) throw Error(res.status); return res.json(); },
      set: async (value) => { const res = await fetch(endpoint, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value) }); if (!res.ok) throw Error(res.status); return res.json(); }
    };
    cloud.get().then((remote) => {
      if (remote) applyRemote(remote); else return cloud.set(clone(db));
      cloudReady = true; markDb();
    }).catch(() => { cloudReady = false; markDb(); });
    setInterval(() => cloud.get().then(applyRemote).catch(() => { cloudReady = false; markDb(); }), 25000);
  }
  function applyRemote(remote) {
    if (!remote || typeof remote !== 'object') return;
    applyingRemote = true;
    db = normalize(remote);
    localStorage.setItem(STORE_KEY, JSON.stringify(db));
    applyingRemote = false;
    cloudReady = true;
    markDb();
    if (session.role) render();
  }
  function markDb() {
    ['dbBadge', 'cloudStatus'].forEach((target) => {
      const el = $(target);
      if (!el) return;
      el.textContent = cloudReady ? 'ฐานข้อมูลกลางเชื่อมต่อแล้ว' : 'Local DB';
      el.className = `badge ${cloudReady ? 'cloud' : 'local'}`;
    });
  }

  function bindLogin() {
    $$('[data-login-tab]').forEach((button) => button.addEventListener('click', () => {
      $$('[data-login-tab]').forEach((item) => item.classList.remove('active'));
      button.classList.add('active');
      $('adminLoginForm').classList.toggle('hidden', button.dataset.loginTab !== 'admin');
      $('userLoginForm').classList.toggle('hidden', button.dataset.loginTab !== 'user');
    }));
    $('adminLoginForm').addEventListener('submit', (event) => {
      event.preventDefault();
      const user = $('adminUsername').value.trim();
      const pass = $('adminPassword').value;
      if (user === db.settings.adminUsername && pass === db.settings.adminPassword) {
        session.role = 'admin'; session.user = { name: 'Admin' }; session.page = 'dashboard'; openApp();
      } else toast('Username หรือ Password ไม่ถูกต้อง', 'error');
    });
    $('userLoginForm').addEventListener('submit', (event) => {
      event.preventDefault();
      const code = $('userCode').value.trim();
      const user = db.users.find((item) => item.code === code && item.active !== false);
      if (!/^\d{4}$/.test(code)) return toast('กรุณากรอกรหัส User 4 หลัก', 'error');
      if (!user) return toast('ไม่พบ User หรือ User ถูกปิดใช้งาน', 'error');
      session.role = 'user'; session.user = user; session.page = 'receipt'; openApp();
    });
  }
  function bindShell() {
    $('logoutBtn').addEventListener('click', () => {
      session.role = ''; session.user = null;
      $('appShell').classList.add('hidden'); $('loginScreen').classList.remove('hidden');
    });
    $('quickReceiptBtn').addEventListener('click', () => go('receipt'));
  }
  function openApp() { $('loginScreen').classList.add('hidden'); $('appShell').classList.remove('hidden'); render(); }
  function navItems() {
    const all = [['dashboard','ภาพรวม'],['receipt','ออกใบเสร็จ'],['reports','รายงาน'],['users','ผู้ใช้งาน'],['masters','ข้อมูลหลังบ้าน'],['books','เล่มใบเสร็จ'],['settings','ตั้งค่า Admin'],['database','ฐานข้อมูล']];
    return session.role === 'admin' ? all : all.filter(([key]) => ['receipt', 'reports'].includes(key));
  }
  function go(page) { session.page = page; render(); }
  function render() {
    if (session.role !== 'admin' && !['receipt', 'reports'].includes(session.page)) session.page = 'receipt';
    $('roleLabel').textContent = session.role === 'admin' ? 'Admin' : `User: ${session.user?.name || ''}`;
    $('mainNav').innerHTML = navItems().map(([key, text]) => `<button class="${session.page === key ? 'active' : ''}" data-page="${key}">${esc(text)}</button>`).join('');
    $$('[data-page]', $('mainNav')).forEach((button) => button.addEventListener('click', () => go(button.dataset.page)));
    const pages = { dashboard, receipt: receiptPage, reports, users, masters, books, settings, database };
    pages[session.page]($('viewRoot'));
  }
  function setTitle(title, sub = 'RUSreceipt-New') { $('pageTitle').textContent = title; $('pageEyebrow').textContent = sub; }
  function requireAdmin() { if (session.role !== 'admin') throw Error('Admin only'); }

  function dashboard(view) {
    requireAdmin(); setTitle('ภาพรวมระบบ', 'Dashboard');
    const active = db.receipts.filter((r) => r.status !== 'cancelled');
    const total = active.reduce((sum, r) => sum + r.total, 0);
    const todayTotal = active.filter((r) => r.date === today()).reduce((sum, r) => sum + r.total, 0);
    view.innerHTML = `
      <div class="grid stats">
        ${stat('ใบเสร็จทั้งหมด', db.receipts.length)}${stat('ยอดเงินรวม', baht(total))}${stat('ยอดวันนี้', baht(todayTotal))}${stat('User เปิดใช้งาน', db.users.filter((u) => u.active).length)}
      </div>
      <div class="grid two-col">
        <section class="panel"><h3>สถานะฐานข้อมูล</h3><p>สถานะ: <b>${cloudReady ? 'Firebase Realtime Database' : 'Local DB'}</b></p><p>อัปเดตล่าสุด: <b>${thaiDateTime(db.meta.updatedAt)}</b></p><p>Path: <code>${esc(CONFIG.path || 'receipt-app/RUSreceipt-New')}</code></p></section>
        <section class="panel"><h3>ความพร้อมของระบบ</h3><p class="muted">มีข้อมูลตั้งต้นครบ: คำนำหน้า รายการชำระเงิน โครงการ หน่วยงาน วิธีชำระเงิน เล่มใบเสร็จ และหน้าพิมพ์ต้นฉบับ/สำเนา</p><button class="primary" id="dashReceipt">ออกใบเสร็จใหม่</button></section>
      </div>
      <section class="panel"><div class="panel-title"><h3>ใบเสร็จล่าสุด</h3></div>${receiptTable(db.receipts.slice().reverse().slice(0, 8), true)}</section>`;
    $('dashReceipt').addEventListener('click', () => go('receipt'));
  }
  function stat(label, value) { return `<article class="stat"><span>${esc(label)}</span><strong>${esc(value)}</strong></article>`; }

  function receiptPage(view) {
    setTitle('ออกใบเสร็จรับเงิน', 'Receipt');
    const books = db.books.filter((book) => book.active !== false);
    view.innerHTML = `
      <form id="receiptForm" class="panel form-grid">
        <div class="wide"><h3>ข้อมูลใบเสร็จ</h3><p class="muted">กรอกข้อมูลผู้ชำระเงิน รายการรับเงิน และบันทึกเพื่อพิมพ์ต้นฉบับ</p></div>
        <label>เล่มใบเสร็จ<select id="bookId">${books.map((b) => `<option value="${esc(b.id)}">${esc(b.name)} — ${esc(b.prefix)}${String(b.current).padStart(b.digits, '0')}</option>`).join('')}</select></label>
        <label>วันที่<input id="receiptDate" type="date" value="${today()}"></label>
        <label>คำนำหน้า<select id="payerPrefix"><option value="">-</option>${optionList(db.prefixes)}</select></label>
        <label>ชื่อผู้ชำระเงิน<input id="payerName" required placeholder="ชื่อ-นามสกุล / หน่วยงาน"></label>
        <label>เลขผู้เสียภาษี/บัตรประชาชน<input id="payerTax" placeholder="ไม่บังคับ"></label>
        <label>เบอร์โทร<input id="payerPhone" placeholder="ไม่บังคับ"></label>
        <label class="wide">ที่อยู่ผู้ชำระเงิน<input id="payerAddress" placeholder="ไม่บังคับ"></label>
        <label>หน่วยงาน/คณะ<select id="department"><option value="">-</option>${optionList(db.departments)}</select></label>
        <label>โครงการ/หมวดรายรับ<select id="projectName"><option value="">-</option>${optionList(db.projects)}</select></label>
        <label>วิธีชำระเงิน<select id="paymentMethod">${optionList(db.banks)}</select></label>
        <label>เลขอ้างอิง<input id="paymentRef" placeholder="เลขสลิป/เช็ค ถ้ามี"></label>
        <label class="wide">หมายเหตุ<input id="note" placeholder="ไม่บังคับ"></label>
        <div class="wide"><div class="panel-title"><h3>รายการรับเงิน</h3><button type="button" class="secondary" id="addItem">+ เพิ่มรายการ</button></div><div class="table-wrap"><table><thead><tr><th>รายการ</th><th>จำนวน</th><th class="right">ราคาต่อหน่วย</th><th class="right">รวม</th><th></th></tr></thead><tbody id="itemRows"></tbody><tfoot><tr><th colspan="3">รวมทั้งสิ้น</th><th id="grandTotal" class="right">0.00</th><th></th></tr></tfoot></table></div></div>
        <div class="wide actions"><button class="primary">บันทึกและพิมพ์ต้นฉบับ</button><button type="button" class="secondary" id="saveOnly">บันทึกอย่างเดียว</button><button type="button" class="ghost" id="clearForm">ล้างฟอร์ม</button></div>
      </form>`;
    if (!books.length) view.insertAdjacentHTML('afterbegin', '<section class="panel"><b class="danger">ยังไม่มีเล่มใบเสร็จที่เปิดใช้งาน กรุณาให้ Admin ตั้งค่าเล่มใบเสร็จ</b></section>');
    addDatalist();
    const items = [{ desc: db.paymentItems[0] || '', qty: 1, amount: '' }];
    drawItems(items);
    $('addItem').addEventListener('click', () => { items.push({ desc: '', qty: 1, amount: '' }); drawItems(items); });
    $('clearForm').addEventListener('click', () => receiptPage(view));
    $('saveOnly').addEventListener('click', () => saveReceipt(items, false, view));
    $('receiptForm').addEventListener('submit', (event) => { event.preventDefault(); saveReceipt(items, true, view); });
  }
  function addDatalist() {
    let dl = $('paymentItemsList');
    if (!dl) { dl = document.createElement('datalist'); dl.id = 'paymentItemsList'; document.body.appendChild(dl); }
    dl.innerHTML = db.paymentItems.map((x) => `<option value="${esc(x)}"></option>`).join('');
  }
  function drawItems(items) {
    $('itemRows').innerHTML = items.map((item, index) => `<tr><td><input data-desc="${index}" list="paymentItemsList" value="${esc(item.desc)}"></td><td><input data-qty="${index}" type="number" min="1" step="1" value="${item.qty || 1}"></td><td><input data-amount="${index}" class="right" type="number" min="0" step="0.01" value="${esc(item.amount)}"></td><td class="right"><b>${money((Number(item.qty || 1)) * Number(item.amount || 0))}</b></td><td><button type="button" class="ghost danger" data-delete-item="${index}">ลบ</button></td></tr>`).join('');
    $$('[data-desc]').forEach((input) => input.addEventListener('input', () => { items[Number(input.dataset.desc)].desc = input.value; }));
    $$('[data-qty]').forEach((input) => input.addEventListener('input', () => { items[Number(input.dataset.qty)].qty = Number(input.value || 1); drawItems(items); }));
    $$('[data-amount]').forEach((input) => input.addEventListener('input', () => { items[Number(input.dataset.amount)].amount = input.value; drawItems(items); }));
    $$('[data-delete-item]').forEach((button) => button.addEventListener('click', () => { if (items.length < 2) return toast('ต้องมีอย่างน้อย 1 รายการ', 'warn'); items.splice(Number(button.dataset.deleteItem), 1); drawItems(items); }));
    $('grandTotal').textContent = money(items.reduce((sum, item) => sum + Number(item.qty || 1) * Number(item.amount || 0), 0));
  }
  function saveReceipt(items, shouldPrint, view) {
    const book = db.books.find((b) => b.id === $('bookId')?.value);
    if (!book) return toast('กรุณาตั้งค่าเล่มใบเสร็จก่อน', 'error');
    const cleanItems = items.map((x) => ({ desc: x.desc.trim(), qty: Number(x.qty || 1), amount: Number(x.amount || 0) })).filter((x) => x.desc && x.amount > 0);
    const payer = [$('payerPrefix').value, $('payerName').value.trim()].filter(Boolean).join(' ');
    if (!payer) return toast('กรุณากรอกชื่อผู้ชำระเงิน', 'error');
    if (!cleanItems.length) return toast('กรุณาใส่รายการรับเงิน', 'error');
    if (book.current > book.end) return toast('เลขใบเสร็จเล่มนี้หมดแล้ว', 'error');
    const number = `${book.prefix}${String(book.current).padStart(book.digits, '0')}`;
    const receipt = cleanReceipt({
      id: uid('rcp'), number, bookId: book.id, date: $('receiptDate').value || today(), payer,
      payerTaxId: $('payerTax').value.trim(), payerPhone: $('payerPhone').value.trim(), payerAddress: $('payerAddress').value.trim(),
      department: $('department').value, projectName: $('projectName').value, paymentMethod: $('paymentMethod').value, paymentRef: $('paymentRef').value.trim(), note: $('note').value.trim(),
      items: cleanItems, createdBy: session.role === 'admin' ? 'Admin' : (session.user?.name || session.user?.code), createdAt: now()
    });
    db.receipts.push(receipt); book.current += 1; save(); toast(`บันทึกใบเสร็จ ${number} แล้ว`, 'success');
    if (shouldPrint) printReceipt(receipt.id, 'ต้นฉบับ');
    receiptPage(view);
  }

  function reports(view) {
    setTitle('รายงานการชำระเงิน', 'Reports');
    view.innerHTML = `<section class="panel"><div class="filters"><label>ค้นหา<input id="searchText" placeholder="เลขที่ / ชื่อ / รายการ"></label><label>ตั้งแต่<input id="dateFrom" type="date"></label><label>ถึง<input id="dateTo" type="date"></label><label>สถานะ<select id="statusFilter"><option value="all">ทั้งหมด</option><option value="active">ปกติ</option><option value="cancelled">ยกเลิก</option></select></label><button class="secondary" id="csvBtn">Export CSV</button></div><div id="reportResult"></div></section>`;
    const draw = () => {
      const rows = visibleReceipts().filter(reportFilter).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
      $('reportResult').innerHTML = `<div class="summary">พบ ${rows.length} รายการ | ยอดรวม ${baht(rows.filter((r) => r.status !== 'cancelled').reduce((sum, r) => sum + r.total, 0))}</div>${receiptTable(rows)}`;
      bindReceiptButtons(draw); $('csvBtn').onclick = () => exportCsv(rows);
    };
    ['searchText', 'dateFrom', 'dateTo', 'statusFilter'].forEach((x) => $(x).addEventListener('input', draw)); draw();
  }
  function visibleReceipts() { return session.role === 'admin' ? db.receipts : db.receipts.filter((r) => r.createdBy === (session.user?.name || session.user?.code)); }
  function reportFilter(r) {
    const text = JSON.stringify(r).toLowerCase();
    const q = $('searchText').value.toLowerCase(); const from = $('dateFrom').value; const to = $('dateTo').value; const status = $('statusFilter').value;
    return (!q || text.includes(q)) && (!from || r.date >= from) && (!to || r.date <= to) && (status === 'all' || r.status === status);
  }
  function receiptTable(rows, compact = false) {
    if (!rows.length) return '<div class="empty">ยังไม่มีข้อมูล</div>';
    return `<div class="table-wrap"><table><thead><tr><th>เลขที่</th><th>วันที่</th><th>ผู้ชำระเงิน</th><th>หน่วยงาน/โครงการ</th><th>รายการ</th><th class="right">ยอดรวม</th><th>สถานะ</th>${compact ? '' : '<th>จัดการ</th>'}</tr></thead><tbody>${rows.map((r) => `<tr><td><b>${esc(r.number)}</b></td><td>${thaiDate(r.date)}</td><td>${esc(r.payer)}${r.payerPhone ? `<br><small>${esc(r.payerPhone)}</small>` : ''}</td><td>${esc(r.department || '-')}<br><small>${esc(r.projectName || '-')}</small></td><td>${esc(r.items.map((x) => x.desc).join(', '))}</td><td class="right">${money(r.total)}</td><td>${r.status === 'cancelled' ? '<span class="badge danger">ยกเลิก</span>' : '<span class="badge cloud">ปกติ</span>'}</td>${compact ? '' : `<td class="actions"><button class="ghost" data-detail="${r.id}">รายละเอียด</button><button class="ghost" data-print="${r.id}:ต้นฉบับ">ต้นฉบับ</button><button class="ghost" data-print="${r.id}:สำเนา">สำเนา</button>${session.role === 'admin' && r.status !== 'cancelled' ? `<button class="ghost danger" data-cancel="${r.id}">ยกเลิก</button>` : ''}</td>`}</tr>`).join('')}</tbody></table></div>`;
  }
  function bindReceiptButtons(redraw) {
    $$('[data-print]').forEach((button) => button.addEventListener('click', () => { const [rid, type] = button.dataset.print.split(':'); printReceipt(rid, type); }));
    $$('[data-detail]').forEach((button) => button.addEventListener('click', () => showReceiptDetail(button.dataset.detail)));
    $$('[data-cancel]').forEach((button) => button.addEventListener('click', () => { if (!confirm('ยืนยันยกเลิกใบเสร็จนี้?')) return; const r = db.receipts.find((x) => x.id === button.dataset.cancel); if (r) { r.status = 'cancelled'; r.cancelledAt = now(); save(); redraw(); } }));
  }
  function showReceiptDetail(rid) { const r = db.receipts.find((x) => x.id === rid); if (r) alert(`เลขที่: ${r.number}\nวันที่: ${thaiDate(r.date)}\nผู้ชำระเงิน: ${r.payer}\nยอดรวม: ${baht(r.total)}\nสถานะ: ${r.status === 'cancelled' ? 'ยกเลิก' : 'ปกติ'}`); }

  function users(view) { requireAdmin(); setTitle('จัดการผู้ใช้งาน', 'Users'); view.innerHTML = `<section class="panel"><form id="userForm" class="inline-form"><label>รหัส 4 หลัก<input id="userCodeNew" maxlength="4" required></label><label>ชื่อ User<input id="userNameNew" required></label><label>หมายเหตุ<input id="userNoteNew"></label><button class="primary">เพิ่ม User</button></form><div class="table-wrap"><table><thead><tr><th>รหัส</th><th>ชื่อ</th><th>หมายเหตุ</th><th>สถานะ</th><th>จัดการ</th></tr></thead><tbody>${db.users.map((u) => `<tr><td><b>${u.code}</b></td><td>${esc(u.name)}</td><td>${esc(u.note || '-')}</td><td>${u.active ? '<span class="badge cloud">เปิด</span>' : '<span class="badge danger">ปิด</span>'}</td><td class="actions"><button class="ghost" data-toggle-user="${u.id}">${u.active ? 'ปิด' : 'เปิด'}</button><button class="ghost danger" data-delete-user="${u.id}">ลบ</button></td></tr>`).join('') || '<tr><td colspan="5">ยังไม่มี User</td></tr>'}</tbody></table></div></section>`; $('userForm').onsubmit = (event) => { event.preventDefault(); const code = $('userCodeNew').value.trim(); if (!/^\d{4}$/.test(code)) return toast('รหัสต้องเป็นตัวเลข 4 หลัก', 'error'); if (db.users.some((u) => u.code === code)) return toast('รหัสนี้ถูกใช้แล้ว', 'error'); db.users.push({ id: uid('usr'), code, name: $('userNameNew').value.trim(), note: $('userNoteNew').value.trim(), active: true, createdAt: now() }); save(); users(view); }; $$('[data-toggle-user]').forEach((b) => b.onclick = () => { const u = db.users.find((x) => x.id === b.dataset.toggleUser); u.active = !u.active; save(); users(view); }); $$('[data-delete-user]').forEach((b) => b.onclick = () => { if (confirm('ยืนยันลบ User?')) { db.users = db.users.filter((u) => u.id !== b.dataset.deleteUser); save(); users(view); } }); }
  function masters(view) { requireAdmin(); setTitle('จัดการข้อมูลหลังบ้าน', 'Master data'); const cards = [['คำนำหน้า', 'prefixes'], ['รายการชำระเงิน', 'paymentItems'], ['โครงการ/หมวดรายรับ', 'projects'], ['หน่วยงาน/คณะ', 'departments'], ['ธนาคาร/วิธีชำระเงิน', 'banks']]; view.innerHTML = `<div class="grid two-col">${cards.map(([title, key]) => masterCard(title, key)).join('')}</div>`; $$('.master-form').forEach((form) => form.onsubmit = (event) => { event.preventDefault(); const key = form.dataset.key; const value = form.querySelector('input').value.trim(); if (value && !db[key].includes(value)) db[key].push(value); save(); masters(view); }); $$('[data-master-delete]').forEach((button) => button.onclick = () => { const [key, index] = button.dataset.masterDelete.split(':'); db[key].splice(Number(index), 1); save(); masters(view); }); }
  function masterCard(title, key) { return `<section class="panel"><div class="panel-title"><h3>${esc(title)}</h3><span class="badge local">${db[key].length} รายการ</span></div><form class="inline-form master-form" data-key="${key}"><input placeholder="เพิ่ม${esc(title)}"><button class="secondary">เพิ่ม</button></form><div class="chips">${db[key].map((item, index) => `<span class="chip">${esc(item)} <button data-master-delete="${key}:${index}">×</button></span>`).join('')}</div></section>`; }
  function books(view) { requireAdmin(); setTitle('จัดการเล่มใบเสร็จ', 'Receipt books'); view.innerHTML = `<section class="panel"><form id="bookForm" class="form-grid"><label>ชื่อเล่ม<input id="bookName" required></label><label>Prefix<input id="bookPrefix" value="RUS" required></label><label>เลขเริ่มต้น<input id="bookStart" type="number" value="1"></label><label>เลขสิ้นสุด<input id="bookEnd" type="number" value="9999"></label><label>จำนวนหลัก<input id="bookDigits" type="number" value="5"></label><label>หมายเหตุ<input id="bookNote"></label><div class="wide"><button class="primary">เพิ่มเล่มใบเสร็จ</button></div></form><div class="table-wrap"><table><thead><tr><th>ชื่อเล่ม</th><th>เลขถัดไป</th><th>ช่วงเลข</th><th>หมายเหตุ</th><th>สถานะ</th><th>จัดการ</th></tr></thead><tbody>${db.books.map((b) => `<tr><td>${esc(b.name)}</td><td><b>${esc(b.prefix)}${String(b.current).padStart(b.digits, '0')}</b></td><td>${b.start}-${b.end}</td><td>${esc(b.note || '-')}</td><td>${b.active ? '<span class="badge cloud">เปิด</span>' : '<span class="badge danger">ปิด</span>'}</td><td><button class="ghost" data-toggle-book="${b.id}">${b.active ? 'ปิด' : 'เปิด'}</button></td></tr>`).join('')}</tbody></table></div></section>`; $('bookForm').onsubmit = (event) => { event.preventDefault(); const start = Number($('bookStart').value || 1), end = Number($('bookEnd').value || 9999); if (end < start) return toast('เลขสิ้นสุดต้องมากกว่าเลขเริ่มต้น', 'error'); db.books.push({ id: uid('book'), name: $('bookName').value.trim(), prefix: $('bookPrefix').value.trim(), start, current: start, end, digits: Number($('bookDigits').value || 5), active: true, note: $('bookNote').value.trim() }); save(); books(view); }; $$('[data-toggle-book]').forEach((b) => b.onclick = () => { const book = db.books.find((x) => x.id === b.dataset.toggleBook); book.active = !book.active; save(); books(view); }); }
  function settings(view) { requireAdmin(); setTitle('ตั้งค่า Admin / ข้อมูลองค์กร', 'Settings'); const s = db.settings; view.innerHTML = `<form id="settingsForm" class="panel form-grid"><label>ชื่อหน่วยงาน<input id="orgName" value="${esc(s.orgName)}"></label><label>ชื่อระบบ<input id="systemName" value="${esc(s.systemName)}"></label><label>ฝ่าย/งานการเงิน<input id="financeUnit" value="${esc(s.financeUnit)}"></label><label>เบอร์โทร<input id="orgPhone" value="${esc(s.phone)}"></label><label class="wide">ที่อยู่<textarea id="orgAddress">${esc(s.address)}</textarea></label><label>เลขผู้เสียภาษี<input id="orgTax" value="${esc(s.taxId)}"></label><label>ชื่อผู้รับเงิน<input id="cashierName" value="${esc(s.cashierName)}"></label><label class="wide">ข้อความท้ายใบเสร็จ<input id="receiptFooter" value="${esc(s.receiptFooter)}"></label><label>Admin username<input id="adminUser" value="${esc(s.adminUsername)}"></label><label>Admin password<input id="adminPass" type="password" value="${esc(s.adminPassword)}"></label><div class="wide"><button class="primary">บันทึกการตั้งค่า</button></div></form>`; $('settingsForm').onsubmit = (event) => { event.preventDefault(); Object.assign(db.settings, { orgName: $('orgName').value.trim(), systemName: $('systemName').value.trim(), financeUnit: $('financeUnit').value.trim(), phone: $('orgPhone').value.trim(), address: $('orgAddress').value.trim(), taxId: $('orgTax').value.trim(), cashierName: $('cashierName').value.trim(), receiptFooter: $('receiptFooter').value.trim(), adminUsername: $('adminUser').value.trim() || 'admin', adminPassword: $('adminPass').value || 'admin123' }); save(); toast('บันทึกการตั้งค่าแล้ว', 'success'); }; }
  function database(view) { requireAdmin(); setTitle('ฐานข้อมูล / สำรองข้อมูล', 'Database'); view.innerHTML = `<section class="panel"><h3>ฐานข้อมูล</h3><p>สถานะ: <b>${cloudReady ? 'ฐานข้อมูลกลางเชื่อมต่อแล้ว' : 'Local DB'}</b></p><p>Database URL: <code>${esc(CONFIG.firebaseConfig?.databaseURL || CONFIG.databaseURL || '-')}</code></p><p>Path: <code>${esc(CONFIG.path || 'receipt-app/RUSreceipt-New')}</code></p><div class="actions"><button class="primary" id="backupBtn">สำรอง JSON</button><label class="file-button">นำเข้า JSON<input id="importJson" type="file" accept="application/json" hidden></label><button class="secondary" id="pushCloud">ส่งขึ้นฐานกลาง</button><button class="secondary" id="pullCloud">ดึงจากฐานกลาง</button><button class="ghost danger" id="resetLocal">ล้างข้อมูลในเครื่อง</button></div></section>`; $('backupBtn').onclick = () => downloadFile(`rusreceipt-backup-${Date.now()}.json`, JSON.stringify(db, null, 2), 'application/json'); $('importJson').onchange = importJson; $('pushCloud').onclick = () => cloud ? cloud.set(clone(db)).then(() => toast('ส่งขึ้นฐานกลางแล้ว', 'success')) : toast('ยังไม่ได้เชื่อมฐานกลาง', 'warn'); $('pullCloud').onclick = () => cloud ? cloud.get().then((data) => { applyRemote(data); toast('ดึงข้อมูลแล้ว', 'success'); }) : toast('ยังไม่ได้เชื่อมฐานกลาง', 'warn'); $('resetLocal').onclick = () => { if (confirm('ล้างข้อมูลในเครื่อง?')) { localStorage.removeItem(STORE_KEY); db = normalize(null); save(false); render(); } }; }

  function importJson(event) { const file = event.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => { try { db = normalize(JSON.parse(reader.result)); save(); render(); toast('นำเข้าข้อมูลสำเร็จ', 'success'); } catch { toast('ไฟล์ JSON ไม่ถูกต้อง', 'error'); } }; reader.readAsText(file, 'utf-8'); }
  function exportCsv(rows) { const head = ['number','date','payer','department','projectName','items','paymentMethod','paymentRef','total','status','createdBy']; const lines = [head.join(',')].concat(rows.map((r) => head.map((key) => csvCell(key === 'items' ? r.items.map((x) => `${x.desc} x${x.qty} ${x.amount}`).join(' | ') : r[key])).join(','))); downloadFile(`rusreceipt-report-${Date.now()}.csv`, '\ufeff' + lines.join('\n'), 'text/csv;charset=utf-8'); }
  function csvCell(value) { return `"${String(value ?? '').replaceAll('"', '""')}"`; }
  function downloadFile(name, content, type) { const blob = new Blob([content], { type }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url); }

  function printReceipt(rid, copyType) {
    const r = db.receipts.find((x) => x.id === rid); if (!r) return;
    const s = db.settings; const popup = window.open('', '_blank');
    const rows = r.items.map((x, i) => `<tr><td class="right">${i + 1}</td><td>${esc(x.desc)}</td><td class="right">${x.qty}</td><td class="right">${money(x.qty * x.amount)}</td></tr>`).join('');
    popup.document.write(`<!doctype html><html lang="th"><head><meta charset="utf-8"><title>${esc(r.number)}</title><style>*{box-sizing:border-box}body{font-family:Tahoma,Arial,sans-serif;margin:0;color:#111}.receipt{width:148mm;min-height:210mm;margin:0 auto;padding:10mm;position:relative}.water{position:absolute;inset:0;display:grid;place-items:center;font-size:66px;font-weight:900;color:#00000010;transform:rotate(-18deg)}.head{display:grid;grid-template-columns:18mm 1fr 35mm;gap:8px;border-bottom:2px solid #111;padding-bottom:6px;position:relative;z-index:1}.logo{width:16mm;height:16mm;border:2px solid #111;border-radius:50%;display:grid;place-items:center;font-weight:900}.center{text-align:center}.center h2{font-size:17px;margin:0 0 3px}.center p,.line{font-size:12px;margin:2px 0}.meta{font-size:12px;border:1px solid #111;padding:4px}.copy{text-align:center;font-size:24px;font-weight:900;margin:8mm 0 5mm;position:relative;z-index:1}table{width:100%;border-collapse:collapse;margin-top:6mm;position:relative;z-index:1}th,td{border:1px solid #111;padding:6px;font-size:12px}th{background:#f2f2f2}.right{text-align:right}.sign{display:grid;grid-template-columns:1fr 1fr;gap:20mm;text-align:center;margin-top:18mm;font-size:12px}.cancel{position:absolute;right:18mm;top:70mm;color:#b00000;border:4px solid #b00000;font-size:34px;font-weight:900;transform:rotate(-12deg);z-index:2}@page{size:A5 portrait;margin:0}</style></head><body><article class="receipt"><div class="water">${copyType === 'สำเนา' ? 'COPY' : 'ORIGINAL'}</div>${r.status === 'cancelled' ? '<div class="cancel">ยกเลิก</div>' : ''}<header class="head"><div class="logo">RUS</div><div class="center"><h2>${esc(s.orgName)}</h2><p>${esc(s.systemName)}</p><p>${esc(s.financeUnit)}</p><p>${esc(s.address)}</p><p>${esc(s.phone)} ${s.taxId ? ' | เลขผู้เสียภาษี ' + esc(s.taxId) : ''}</p></div><div class="meta"><b>เลขที่</b><br>${esc(r.number)}<br><b>วันที่</b><br>${thaiDate(r.date)}</div></header><div class="copy">ใบเสร็จรับเงิน (${esc(copyType)})</div><p class="line">ได้รับเงินจาก: <b>${esc(r.payer)}</b></p>${r.payerTaxId ? `<p class="line">เลขประจำตัว: ${esc(r.payerTaxId)}</p>` : ''}${r.payerAddress ? `<p class="line">ที่อยู่: ${esc(r.payerAddress)}</p>` : ''}<p class="line">หน่วยงาน/โครงการ: ${esc(r.department || '-')} / ${esc(r.projectName || '-')}</p><table><thead><tr><th>ลำดับ</th><th>รายการ</th><th class="right">จำนวน</th><th class="right">จำนวนเงิน</th></tr></thead><tbody>${rows}</tbody><tfoot><tr><th colspan="3">รวมทั้งสิ้น</th><th class="right">${baht(r.total)}</th></tr></tfoot></table><p class="line">วิธีชำระเงิน: <b>${esc(r.paymentMethod)}</b>${r.paymentRef ? ' | อ้างอิง: ' + esc(r.paymentRef) : ''}</p>${r.note ? `<p class="line">หมายเหตุ: ${esc(r.note)}</p>` : ''}<p class="line">${esc(s.receiptFooter)}</p><div class="sign"><div>ผู้รับเงิน<br><br>....................................<br>${esc(s.cashierName || '')}</div><div>ผู้จ่ายเงิน<br><br>....................................</div></div></article></body></html>`);
    popup.document.close(); setTimeout(() => popup.print(), 300);
  }
})();
