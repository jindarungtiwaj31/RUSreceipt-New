(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const STORE_KEY = 'rusreceipt_new_database_v1';
  const CONFIG = window.RECEIPT_APP_DATABASE_CONFIG || {};
  let cloudRef = null;
  let cloudReady = false;
  let applyingRemote = false;

  const session = { role: null, user: null, page: 'dashboard' };
  const defaults = {
    meta: {
      version: '1.0.0',
      projectName: 'RUSreceipt-New',
      createdAt: new Date().toISOString()
    },
    settings: {
      orgName: 'มหาวิทยาลัยเทคโนโลยีราชมงคลสุวรรณภูมิ',
      systemName: 'ระบบออกใบเสร็จรับเงิน RUSreceipt-New',
      address: '',
      taxId: '',
      adminUsername: 'admin',
      adminPassword: 'admin123'
    },
    users: [],
    prefixes: ['นาย', 'นาง', 'นางสาว', 'บริษัท', 'ห้างหุ้นส่วนจำกัด'],
    paymentItems: ['ค่าลงทะเบียน', 'ค่าธรรมเนียม', 'ค่าบำรุงการศึกษา', 'ค่าเอกสาร'],
    projects: ['ทั่วไป'],
    banks: ['เงินสด', 'โอนเงิน', 'เช็ค'],
    books: [{
      id: 'book_main',
      name: 'เล่มหลัก',
      prefix: 'RUS',
      current: 1,
      start: 1,
      end: 9999,
      digits: 5,
      active: true
    }],
    receipts: []
  };

  let state = normalize(loadLocal());

  document.addEventListener('DOMContentLoaded', () => {
    bindLogin();
    bindGlobalButtons();
    initCloud();
    refreshDbBadges();
  });

  function normalize(input) {
    const src = input && typeof input === 'object' ? input : {};
    const data = structuredCloneSafe(defaults);
    Object.assign(data.meta, src.meta || {});
    Object.assign(data.settings, src.settings || {});
    ['users', 'prefixes', 'paymentItems', 'projects', 'banks', 'books', 'receipts'].forEach((key) => {
      if (Array.isArray(src[key])) data[key] = src[key];
    });
    if (!data.books.length) data.books = structuredCloneSafe(defaults.books);
    return data;
  }

  function structuredCloneSafe(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function loadLocal() {
    try {
      return JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    } catch (error) {
      console.warn('Cannot parse local database', error);
      return null;
    }
  }

  function save(options = {}) {
    const syncCloud = options.syncCloud !== false;
    state.meta.updatedAt = new Date().toISOString();
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
    if (syncCloud && cloudRef && !applyingRemote) {
      cloudRef.set(stripRuntime(state)).catch((error) => {
        console.warn('Firebase save failed', error);
        toast('บันทึกในเครื่องแล้ว แต่ส่งขึ้น Firebase ไม่สำเร็จ', 'warn');
      });
    }
    refreshDbBadges();
  }

  function stripRuntime(data) {
    return JSON.parse(JSON.stringify(data));
  }

  function initCloud() {
    if (!CONFIG.enabled) {
      refreshDbBadges();
      return;
    }
    if (!window.firebase || !CONFIG.firebaseConfig || !CONFIG.firebaseConfig.apiKey) {
      toast('เปิด Firebase ไว้ แต่ยังไม่ได้ใส่ config ให้ครบ', 'warn');
      refreshDbBadges();
      return;
    }

    try {
      if (!firebase.apps.length) firebase.initializeApp(CONFIG.firebaseConfig);
      cloudRef = firebase.database().ref(CONFIG.path || 'receipt-app/RUSreceipt-New');
      cloudRef.on('value', (snapshot) => {
        const remote = snapshot.val();
        if (remote && typeof remote === 'object') {
          applyingRemote = true;
          state = normalize(remote);
          localStorage.setItem(STORE_KEY, JSON.stringify(state));
          applyingRemote = false;
          if (session.role) renderApp();
        } else {
          save({ syncCloud: true });
        }
        cloudReady = true;
        refreshDbBadges();
      });
    } catch (error) {
      console.warn('Firebase init failed', error);
      toast('เชื่อมต่อ Firebase ไม่สำเร็จ ระบบใช้ Local DB ก่อน', 'warn');
      cloudReady = false;
      refreshDbBadges();
    }
  }

  function refreshDbBadges() {
    const label = cloudReady ? 'ฐานข้อมูลกลางเชื่อมต่อแล้ว' : 'Local DB';
    const type = cloudReady ? 'cloud' : 'local';
    ['dbBadge', 'cloudStatus'].forEach((id) => {
      const el = $(id);
      if (!el) return;
      el.textContent = label;
      el.className = `badge ${type}`;
    });
  }

  function bindLogin() {
    $$('[data-login-tab]').forEach((button) => {
      button.addEventListener('click', () => {
        $$('[data-login-tab]').forEach((item) => item.classList.remove('active'));
        button.classList.add('active');
        const tab = button.dataset.loginTab;
        $('adminLoginForm').classList.toggle('hidden', tab !== 'admin');
        $('userLoginForm').classList.toggle('hidden', tab !== 'user');
      });
    });

    $('adminLoginForm').addEventListener('submit', (event) => {
      event.preventDefault();
      const username = $('adminUsername').value.trim();
      const password = $('adminPassword').value;
      if (username === state.settings.adminUsername && password === state.settings.adminPassword) {
        session.role = 'admin';
        session.user = { name: 'Admin' };
        session.page = 'dashboard';
        openApp();
      } else {
        toast('Username หรือ Password ไม่ถูกต้อง', 'error');
      }
    });

    $('userLoginForm').addEventListener('submit', (event) => {
      event.preventDefault();
      const code = $('userCode').value.trim();
      const user = state.users.find((item) => item.code === code && item.active !== false);
      if (!/^\d{4}$/.test(code)) return toast('กรุณากรอกรหัส User 4 หลัก', 'error');
      if (!user) return toast('ไม่พบ User หรือ User ถูกปิดใช้งาน', 'error');
      session.role = 'user';
      session.user = user;
      session.page = 'receipt';
      openApp();
    });
  }

  function bindGlobalButtons() {
    $('logoutBtn').addEventListener('click', () => {
      session.role = null;
      session.user = null;
      $('appShell').classList.add('hidden');
      $('loginScreen').classList.remove('hidden');
    });
    $('quickReceiptBtn').addEventListener('click', () => navigate('receipt'));
  }

  function openApp() {
    $('loginScreen').classList.add('hidden');
    $('appShell').classList.remove('hidden');
    renderApp();
  }

  function navItems() {
    const all = [
      ['dashboard', 'ภาพรวม', 'Dashboard'],
      ['receipt', 'ออกใบเสร็จ', 'Receipt'],
      ['reports', 'รายงาน', 'Reports'],
      ['users', 'ผู้ใช้งาน', 'Users'],
      ['masters', 'ข้อมูลหลังบ้าน', 'Master data'],
      ['books', 'เล่มใบเสร็จ', 'Receipt books'],
      ['settings', 'ตั้งค่า Admin', 'Settings'],
      ['database', 'ฐานข้อมูล', 'Database']
    ];
    return session.role === 'admin' ? all : all.filter(([key]) => ['receipt', 'reports'].includes(key));
  }

  function renderApp() {
    $('roleLabel').textContent = session.role === 'admin' ? 'Admin' : `User: ${session.user?.name || session.user?.code || ''}`;
    $('mainNav').innerHTML = navItems().map(([key, title]) => (
      `<button class="${session.page === key ? 'active' : ''}" data-page="${key}">${esc(title)}</button>`
    )).join('');
    $$('[data-page]', $('mainNav')).forEach((button) => {
      button.addEventListener('click', () => navigate(button.dataset.page));
    });
    renderPage();
  }

  function navigate(page) {
    session.page = page;
    renderApp();
  }

  function setPage(title, eyebrow) {
    $('pageTitle').textContent = title;
    $('pageEyebrow').textContent = eyebrow || 'RUSreceipt-New';
  }

  function renderPage() {
    if (session.role !== 'admin' && !['receipt', 'reports'].includes(session.page)) session.page = 'receipt';
    const view = $('viewRoot');
    switch (session.page) {
      case 'dashboard': return renderDashboard(view);
      case 'receipt': return renderReceiptForm(view);
      case 'reports': return renderReports(view);
      case 'users': return renderUsers(view);
      case 'masters': return renderMasters(view);
      case 'books': return renderBooks(view);
      case 'settings': return renderSettings(view);
      case 'database': return renderDatabase(view);
      default: return renderDashboard(view);
    }
  }

  function renderDashboard(view) {
    setPage('ภาพรวมระบบ', 'Dashboard');
    const totalReceipts = state.receipts.length;
    const activeUsers = state.users.filter((u) => u.active !== false).length;
    const totalAmount = state.receipts.filter((r) => r.status !== 'cancelled').reduce((sum, r) => sum + Number(r.total || 0), 0);
    const latest = state.receipts.slice().reverse().slice(0, 8);
    view.innerHTML = `
      <div class="grid stats">
        ${statCard('จำนวนใบเสร็จ', totalReceipts)}
        ${statCard('ยอดเงินรวม', money(totalAmount))}
        ${statCard('User ใช้งาน', activeUsers)}
        ${statCard('เล่มใบเสร็จ', state.books.length)}
      </div>
      <section class="panel">
        <div class="panel-title">
          <h3>ใบเสร็จล่าสุด</h3>
          <button class="secondary" data-go="receipt">ออกใบเสร็จใหม่</button>
        </div>
        ${receiptTable(latest, { compact: true })}
      </section>`;
    $('[data-go="receipt"]', view).addEventListener('click', () => navigate('receipt'));
  }

  function statCard(label, value) {
    return `<article class="stat"><span>${esc(label)}</span><strong>${esc(String(value))}</strong></article>`;
  }

  function renderReceiptForm(view) {
    setPage('ออกใบเสร็จ', 'Receipt');
    const activeBooks = state.books.filter((book) => book.active !== false);
    if (!activeBooks.length) activeBooks.push(defaults.books[0]);
    view.innerHTML = `
      <form id="receiptForm" class="panel form-grid">
        <label>เล่มใบเสร็จ
          <select id="receiptBook">${activeBooks.map((book) => `<option value="${esc(book.id)}">${esc(book.name)} (${esc(book.prefix)}${String(book.current).padStart(Number(book.digits || 5), '0')})</option>`).join('')}</select>
        </label>
        <label>วันที่
          <input id="receiptDate" type="date" value="${today()}" />
        </label>
        <label>คำนำหน้า
          <select id="payerPrefix"><option value="">-</option>${state.prefixes.map((item) => `<option>${esc(item)}</option>`).join('')}</select>
        </label>
        <label>ชื่อผู้ชำระเงิน
          <input id="payerName" required placeholder="ชื่อ-นามสกุล / หน่วยงาน" />
        </label>
        <label>เลขประจำตัวผู้เสียภาษี/บัตรประชาชน
          <input id="payerTaxId" placeholder="ไม่บังคับ" />
        </label>
        <label>โครงการ
          <select id="projectName"><option value="">-</option>${state.projects.map((item) => `<option>${esc(item)}</option>`).join('')}</select>
        </label>
        <label>วิธีชำระเงิน
          <select id="paymentMethod">${state.banks.map((item) => `<option>${esc(item)}</option>`).join('')}</select>
        </label>
        <label>หมายเหตุ
          <input id="receiptNote" placeholder="ไม่บังคับ" />
        </label>

        <div class="wide">
          <div class="panel-title">
            <h3>รายการชำระเงิน</h3>
            <button type="button" class="secondary" id="addItemBtn">+ เพิ่มรายการ</button>
          </div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>รายการ</th><th class="amount-col">จำนวนเงิน</th><th></th></tr></thead>
              <tbody id="receiptItems"></tbody>
              <tfoot><tr><th>รวม</th><th id="receiptTotal" class="right">0.00</th><th></th></tr></tfoot>
            </table>
          </div>
        </div>
        <div class="wide actions">
          <button class="primary" type="submit">บันทึกและพิมพ์ต้นฉบับ</button>
          <button class="secondary" type="button" id="saveOnlyBtn">บันทึกอย่างเดียว</button>
        </div>
      </form>`;

    const items = [{ desc: state.paymentItems[0] || '', amount: '' }];
    const drawItems = () => {
      $('receiptItems').innerHTML = items.map((item, index) => `
        <tr>
          <td><input data-item-desc="${index}" list="paymentItemList" value="${esc(item.desc)}" placeholder="ระบุรายการ" /></td>
          <td><input data-item-amount="${index}" type="number" min="0" step="0.01" value="${esc(item.amount)}" /></td>
          <td class="right"><button class="ghost danger" type="button" data-remove-item="${index}">ลบ</button></td>
        </tr>`).join('');
      if (!$('paymentItemList')) {
        const dl = document.createElement('datalist');
        dl.id = 'paymentItemList';
        dl.innerHTML = state.paymentItems.map((item) => `<option value="${esc(item)}"></option>`).join('');
        document.body.appendChild(dl);
      }
      bindItemEvents();
      updateReceiptTotal();
    };

    const bindItemEvents = () => {
      $$('[data-item-desc]').forEach((input) => {
        input.addEventListener('input', () => { items[Number(input.dataset.itemDesc)].desc = input.value; });
      });
      $$('[data-item-amount]').forEach((input) => {
        input.addEventListener('input', () => {
          items[Number(input.dataset.itemAmount)].amount = input.value;
          updateReceiptTotal();
        });
      });
      $$('[data-remove-item]').forEach((button) => {
        button.addEventListener('click', () => {
          if (items.length === 1) return toast('ต้องมีอย่างน้อย 1 รายการ', 'warn');
          items.splice(Number(button.dataset.removeItem), 1);
          drawItems();
        });
      });
    };

    const updateReceiptTotal = () => {
      const total = items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
      $('receiptTotal').textContent = money(total);
    };

    const saveReceipt = (printAfter) => {
      const book = state.books.find((item) => item.id === $('receiptBook').value) || state.books[0];
      const cleanItems = items
        .map((item) => ({ desc: String(item.desc || '').trim(), amount: Number(item.amount || 0) }))
        .filter((item) => item.desc && item.amount > 0);
      const payer = [$('payerPrefix').value, $('payerName').value.trim()].filter(Boolean).join(' ');
      if (!payer) return toast('กรุณากรอกชื่อผู้ชำระเงิน', 'error');
      if (!cleanItems.length) return toast('กรุณาเพิ่มรายการและจำนวนเงิน', 'error');
      if (Number(book.current) > Number(book.end || 999999)) return toast('เลขใบเสร็จในเล่มนี้หมดแล้ว', 'error');

      const number = `${book.prefix || ''}${String(book.current || 1).padStart(Number(book.digits || 5), '0')}`;
      const receipt = {
        id: uid('rcp'),
        number,
        bookId: book.id,
        date: $('receiptDate').value || today(),
        payer,
        payerTaxId: $('payerTaxId').value.trim(),
        projectName: $('projectName').value,
        paymentMethod: $('paymentMethod').value,
        note: $('receiptNote').value.trim(),
        items: cleanItems,
        total: cleanItems.reduce((sum, item) => sum + item.amount, 0),
        status: 'active',
        createdBy: session.role === 'admin' ? 'Admin' : (session.user?.name || session.user?.code || 'User'),
        createdAt: new Date().toISOString()
      };
      state.receipts.push(receipt);
      book.current = Number(book.current || 1) + 1;
      save();
      toast(`บันทึกใบเสร็จเลขที่ ${number} แล้ว`, 'success');
      if (printAfter) printReceipt(receipt.id, 'ต้นฉบับ');
      renderReceiptForm(view);
    };

    $('addItemBtn').addEventListener('click', () => { items.push({ desc: '', amount: '' }); drawItems(); });
    $('receiptForm').addEventListener('submit', (event) => { event.preventDefault(); saveReceipt(true); });
    $('saveOnlyBtn').addEventListener('click', () => saveReceipt(false));
    drawItems();
  }

  function renderReports(view) {
    setPage('รายงานการชำระเงิน', 'Reports');
    const allowed = session.role === 'admin'
      ? state.receipts
      : state.receipts.filter((r) => r.createdBy === (session.user?.name || session.user?.code));
    view.innerHTML = `
      <section class="panel">
        <div class="filters">
          <label>ค้นหา <input id="reportSearch" placeholder="เลขที่ / ชื่อ / รายการ" /></label>
          <label>ตั้งแต่ <input id="dateFrom" type="date" /></label>
          <label>ถึง <input id="dateTo" type="date" /></label>
          <button class="secondary" id="exportCsvBtn">Export CSV</button>
        </div>
        <div id="reportResult"></div>
      </section>`;

    const draw = () => {
      const q = $('reportSearch').value.trim().toLowerCase();
      const from = $('dateFrom').value;
      const to = $('dateTo').value;
      const rows = allowed.filter((receipt) => {
        const text = JSON.stringify(receipt).toLowerCase();
        return (!q || text.includes(q)) && (!from || receipt.date >= from) && (!to || receipt.date <= to);
      }).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
      $('reportResult').innerHTML = `<div class="summary">พบ ${rows.length} รายการ | ยอดรวม ${money(rows.filter((r) => r.status !== 'cancelled').reduce((sum, r) => sum + Number(r.total || 0), 0))} บาท</div>${receiptTable(rows)}`;
      bindReceiptActions();
    };

    const bindReceiptActions = () => {
      $$('[data-print-original]').forEach((button) => button.addEventListener('click', () => printReceipt(button.dataset.printOriginal, 'ต้นฉบับ')));
      $$('[data-print-copy]').forEach((button) => button.addEventListener('click', () => printReceipt(button.dataset.printCopy, 'สำเนา')));
      $$('[data-cancel-receipt]').forEach((button) => {
        button.addEventListener('click', () => {
          if (!confirm('ยืนยันยกเลิกใบเสร็จนี้?')) return;
          const receipt = state.receipts.find((item) => item.id === button.dataset.cancelReceipt);
          if (receipt) {
            receipt.status = 'cancelled';
            receipt.cancelledAt = new Date().toISOString();
            save();
            draw();
          }
        });
      });
    };

    ['reportSearch', 'dateFrom', 'dateTo'].forEach((id) => $(id).addEventListener('input', draw));
    $('exportCsvBtn').addEventListener('click', () => exportCsv(allowed));
    draw();
  }

  function receiptTable(rows, options = {}) {
    if (!rows.length) return '<div class="empty">ยังไม่มีข้อมูล</div>';
    return `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>เลขที่</th><th>วันที่</th><th>ผู้ชำระเงิน</th><th>รายการ</th><th class="right">ยอดรวม</th><th>สถานะ</th>${options.compact ? '' : '<th>จัดการ</th>'}
            </tr>
          </thead>
          <tbody>
            ${rows.map((receipt) => `
              <tr>
                <td><strong>${esc(receipt.number)}</strong></td>
                <td>${esc(receipt.date)}</td>
                <td>${esc(receipt.payer)}</td>
                <td>${esc((receipt.items || []).map((item) => item.desc).join(', '))}</td>
                <td class="right">${money(receipt.total)}</td>
                <td>${receipt.status === 'cancelled' ? '<span class="badge danger">ยกเลิก</span>' : '<span class="badge cloud">ปกติ</span>'}</td>
                ${options.compact ? '' : `<td class="actions">
                  <button class="ghost" data-print-original="${esc(receipt.id)}">ต้นฉบับ</button>
                  <button class="ghost" data-print-copy="${esc(receipt.id)}">สำเนา</button>
                  ${session.role === 'admin' && receipt.status !== 'cancelled' ? `<button class="ghost danger" data-cancel-receipt="${esc(receipt.id)}">ยกเลิก</button>` : ''}
                </td>`}
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  }

  function renderUsers(view) {
    requireAdmin();
    setPage('จัดการผู้ใช้งาน', 'Users');
    view.innerHTML = `
      <section class="panel">
        <form id="userForm" class="inline-form">
          <label>รหัส 4 หลัก <input id="newUserCode" maxlength="4" inputmode="numeric" required /></label>
          <label>ชื่อ User <input id="newUserName" required /></label>
          <button class="primary">เพิ่ม User</button>
        </form>
        <div class="table-wrap">
          <table>
            <thead><tr><th>รหัส</th><th>ชื่อ</th><th>สถานะ</th><th>จัดการ</th></tr></thead>
            <tbody>
              ${state.users.map((user) => `
                <tr>
                  <td><strong>${esc(user.code)}</strong></td>
                  <td>${esc(user.name)}</td>
                  <td>${user.active === false ? '<span class="badge danger">ปิด</span>' : '<span class="badge cloud">เปิด</span>'}</td>
                  <td class="actions">
                    <button class="ghost" data-toggle-user="${esc(user.id)}">${user.active === false ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}</button>
                    <button class="ghost danger" data-delete-user="${esc(user.id)}">ลบ</button>
                  </td>
                </tr>`).join('') || '<tr><td colspan="4">ยังไม่มี User</td></tr>'}
            </tbody>
          </table>
        </div>
      </section>`;
    $('userForm').addEventListener('submit', (event) => {
      event.preventDefault();
      const code = $('newUserCode').value.trim();
      const name = $('newUserName').value.trim();
      if (!/^\d{4}$/.test(code)) return toast('รหัส User ต้องเป็นตัวเลข 4 หลัก', 'error');
      if (state.users.some((user) => user.code === code)) return toast('รหัสนี้ถูกใช้แล้ว', 'error');
      state.users.push({ id: uid('usr'), code, name, active: true, createdAt: new Date().toISOString() });
      save();
      renderUsers(view);
    });
    $$('[data-toggle-user]').forEach((button) => button.addEventListener('click', () => {
      const user = state.users.find((item) => item.id === button.dataset.toggleUser);
      if (user) user.active = user.active === false;
      save();
      renderUsers(view);
    }));
    $$('[data-delete-user]').forEach((button) => button.addEventListener('click', () => {
      if (!confirm('ยืนยันลบ User นี้?')) return;
      state.users = state.users.filter((item) => item.id !== button.dataset.deleteUser);
      save();
      renderUsers(view);
    }));
  }

  function renderMasters(view) {
    requireAdmin();
    setPage('จัดการข้อมูลหลังบ้าน', 'Master data');
    view.innerHTML = `
      <div class="grid two-col">
        ${masterCard('คำนำหน้า', 'prefixes')}
        ${masterCard('รายการชำระเงิน', 'paymentItems')}
        ${masterCard('โครงการ', 'projects')}
        ${masterCard('ธนาคาร/วิธีชำระเงิน', 'banks')}
      </div>`;
    $$('.master-form').forEach((form) => {
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        const key = form.dataset.key;
        const input = form.querySelector('input');
        const value = input.value.trim();
        if (!value) return;
        if (!state[key].includes(value)) state[key].push(value);
        input.value = '';
        save();
        renderMasters(view);
      });
    });
    $$('[data-master-delete]').forEach((button) => {
      button.addEventListener('click', () => {
        const [key, index] = button.dataset.masterDelete.split(':');
        state[key].splice(Number(index), 1);
        save();
        renderMasters(view);
      });
    });
  }

  function masterCard(title, key) {
    return `
      <section class="panel">
        <h3>${esc(title)}</h3>
        <form class="inline-form master-form" data-key="${esc(key)}">
          <input placeholder="เพิ่ม${esc(title)}" />
          <button class="secondary">เพิ่ม</button>
        </form>
        <div class="chips">
          ${state[key].map((item, index) => `<span class="chip">${esc(item)} <button data-master-delete="${esc(key)}:${index}" title="ลบ">×</button></span>`).join('') || '<span class="muted">ยังไม่มีข้อมูล</span>'}
        </div>
      </section>`;
  }

  function renderBooks(view) {
    requireAdmin();
    setPage('จัดการเล่มใบเสร็จ', 'Receipt books');
    view.innerHTML = `
      <section class="panel">
        <form id="bookForm" class="form-grid">
          <label>ชื่อเล่ม <input id="bookName" required placeholder="เช่น เล่มปี 2569" /></label>
          <label>Prefix <input id="bookPrefix" required value="RUS" /></label>
          <label>เลขเริ่มต้น <input id="bookStart" type="number" min="1" value="1" /></label>
          <label>เลขสิ้นสุด <input id="bookEnd" type="number" min="1" value="9999" /></label>
          <label>จำนวนหลัก <input id="bookDigits" type="number" min="1" max="10" value="5" /></label>
          <div class="wide"><button class="primary">เพิ่มเล่มใบเสร็จ</button></div>
        </form>
        <div class="table-wrap">
          <table>
            <thead><tr><th>ชื่อเล่ม</th><th>เลขถัดไป</th><th>ช่วงเลข</th><th>สถานะ</th><th>จัดการ</th></tr></thead>
            <tbody>
              ${state.books.map((book) => `
                <tr>
                  <td>${esc(book.name)}</td>
                  <td><strong>${esc(book.prefix)}${String(book.current).padStart(Number(book.digits || 5), '0')}</strong></td>
                  <td>${esc(String(book.start))} - ${esc(String(book.end))}</td>
                  <td>${book.active === false ? '<span class="badge danger">ปิด</span>' : '<span class="badge cloud">เปิด</span>'}</td>
                  <td><button class="ghost" data-toggle-book="${esc(book.id)}">${book.active === false ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}</button></td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </section>`;
    $('bookForm').addEventListener('submit', (event) => {
      event.preventDefault();
      const start = Number($('bookStart').value || 1);
      state.books.push({
        id: uid('book'),
        name: $('bookName').value.trim(),
        prefix: $('bookPrefix').value.trim(),
        start,
        current: start,
        end: Number($('bookEnd').value || 9999),
        digits: Number($('bookDigits').value || 5),
        active: true
      });
      save();
      renderBooks(view);
    });
    $$('[data-toggle-book]').forEach((button) => button.addEventListener('click', () => {
      const book = state.books.find((item) => item.id === button.dataset.toggleBook);
      if (book) book.active = book.active === false;
      save();
      renderBooks(view);
    }));
  }

  function renderSettings(view) {
    requireAdmin();
    setPage('ตั้งค่า Admin / ข้อมูลองค์กร', 'Settings');
    view.innerHTML = `
      <form id="settingsForm" class="panel form-grid">
        <label>ชื่อหน่วยงาน <input id="orgName" value="${esc(state.settings.orgName)}" /></label>
        <label>ชื่อระบบ <input id="systemName" value="${esc(state.settings.systemName)}" /></label>
        <label class="wide">ที่อยู่ <textarea id="address">${esc(state.settings.address || '')}</textarea></label>
        <label>เลขผู้เสียภาษี <input id="taxId" value="${esc(state.settings.taxId || '')}" /></label>
        <label>Admin username <input id="adminUser" value="${esc(state.settings.adminUsername)}" /></label>
        <label>Admin password <input id="adminPass" type="password" value="${esc(state.settings.adminPassword)}" /></label>
        <div class="wide"><button class="primary">บันทึกการตั้งค่า</button></div>
      </form>`;
    $('settingsForm').addEventListener('submit', (event) => {
      event.preventDefault();
      state.settings.orgName = $('orgName').value.trim();
      state.settings.systemName = $('systemName').value.trim();
      state.settings.address = $('address').value.trim();
      state.settings.taxId = $('taxId').value.trim();
      state.settings.adminUsername = $('adminUser').value.trim() || 'admin';
      state.settings.adminPassword = $('adminPass').value || 'admin123';
      save();
      toast('บันทึกการตั้งค่าแล้ว', 'success');
    });
  }

  function renderDatabase(view) {
    requireAdmin();
    setPage('ฐานข้อมูล / สำรองข้อมูล', 'Database');
    view.innerHTML = `
      <section class="panel">
        <p>สถานะ: <strong>${cloudReady ? 'Firebase connected' : 'Local DB'}</strong></p>
        <p class="muted">Firebase path: <code>${esc(CONFIG.path || 'receipt-app/RUSreceipt-New')}</code></p>
        <div class="actions">
          <button class="primary" id="backupBtn">สำรองฐานข้อมูล JSON</button>
          <label class="file-button">นำเข้า JSON <input id="importJson" type="file" accept="application/json" hidden /></label>
          <button class="secondary" id="pushCloudBtn">ส่งข้อมูลเครื่องนี้ขึ้นฐานกลาง</button>
          <button class="ghost danger" id="resetBtn">ล้างข้อมูลในเครื่อง</button>
        </div>
      </section>`;
    $('backupBtn').addEventListener('click', () => downloadFile(`rusreceipt-new-backup-${Date.now()}.json`, JSON.stringify(state, null, 2), 'application/json'));
    $('importJson').addEventListener('change', importJson);
    $('pushCloudBtn').addEventListener('click', () => {
      if (!cloudRef) return toast('ยังไม่ได้เชื่อม Firebase', 'warn');
      save({ syncCloud: true });
      toast('ส่งข้อมูลขึ้นฐานกลางแล้ว', 'success');
    });
    $('resetBtn').addEventListener('click', () => {
      if (!confirm('ยืนยันล้างข้อมูล Local DB ในเครื่องนี้?')) return;
      localStorage.removeItem(STORE_KEY);
      state = normalize(null);
      save({ syncCloud: false });
      renderApp();
      toast('ล้างข้อมูลในเครื่องแล้ว', 'success');
    });
  }

  function importJson(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        state = normalize(JSON.parse(reader.result));
        save();
        renderApp();
        toast('นำเข้าข้อมูลสำเร็จ', 'success');
      } catch (error) {
        toast('ไฟล์ JSON ไม่ถูกต้อง', 'error');
      }
    };
    reader.readAsText(file, 'utf-8');
  }

  function exportCsv(rows) {
    const header = ['number', 'date', 'payer', 'items', 'total', 'status', 'createdBy'];
    const lines = [header.join(',')].concat(rows.map((r) => header.map((key) => csvCell(key === 'items' ? (r.items || []).map((i) => `${i.desc} ${i.amount}`).join(' | ') : r[key])).join(',')));
    downloadFile(`rusreceipt-new-report-${Date.now()}.csv`, '\ufeff' + lines.join('\n'), 'text/csv;charset=utf-8');
  }

  function csvCell(value) {
    const text = String(value ?? '');
    return `"${text.replaceAll('"', '""')}"`;
  }

  function downloadFile(filename, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  function printReceipt(id, copyType) {
    const receipt = state.receipts.find((item) => item.id === id);
    if (!receipt) return toast('ไม่พบใบเสร็จ', 'error');
    const html = `<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8" />
<title>${esc(receipt.number)} - ${esc(copyType)}</title>
<style>
  body{font-family:Tahoma,Arial,sans-serif;background:#fff;margin:0;color:#111}
  .receipt{width:148mm;min-height:210mm;margin:0 auto;padding:10mm;box-sizing:border-box;position:relative}
  header{display:flex;gap:12px;align-items:center;border-bottom:2px solid #111;padding-bottom:8px}
  .logo{width:54px;height:54px;border:2px solid #111;border-radius:50%;display:grid;place-items:center;font-weight:900}
  h1,h2,p{margin:0 0 4px}
  .meta{display:flex;justify-content:space-between;margin:12px 0;font-size:15px}
  .copy{font-size:28px;text-align:center;font-weight:900;margin:12px 0}
  table{width:100%;border-collapse:collapse;margin-top:12px}
  th,td{border:1px solid #111;padding:8px;vertical-align:top}
  th{background:#f2f2f2}
  .right{text-align:right}
  .sign{display:flex;justify-content:space-around;margin-top:28mm;text-align:center}
  .watermark{position:absolute;inset:0;display:grid;place-items:center;font-size:68px;font-weight:900;color:#00000010;transform:rotate(-18deg);pointer-events:none}
  @page{size:A5 portrait;margin:0}
  @media print{button{display:none}.receipt{margin:0}}
</style>
</head>
<body>
<article class="receipt">
  <div class="watermark">${copyType === 'สำเนา' ? 'COPY' : 'ORIGINAL'}</div>
  <header>
    <div class="logo">RUS</div>
    <div>
      <h2>${esc(state.settings.orgName)}</h2>
      <p>${esc(state.settings.systemName)}</p>
      <p>${esc(state.settings.address || '')}</p>
    </div>
  </header>
  <div class="copy">${esc(copyType)}</div>
  <div class="meta"><span>เลขที่ <strong>${esc(receipt.number)}</strong></span><span>วันที่ <strong>${esc(receipt.date)}</strong></span></div>
  <p>ได้รับเงินจาก: <strong>${esc(receipt.payer)}</strong></p>
  ${receipt.payerTaxId ? `<p>เลขประจำตัว: ${esc(receipt.payerTaxId)}</p>` : ''}
  <table>
    <thead><tr><th>รายการ</th><th class="right">จำนวนเงิน</th></tr></thead>
    <tbody>${(receipt.items || []).map((item) => `<tr><td>${esc(item.desc)}</td><td class="right">${money(item.amount)}</td></tr>`).join('')}</tbody>
    <tfoot><tr><th>รวมทั้งสิ้น</th><th class="right">${money(receipt.total)} บาท</th></tr></tfoot>
  </table>
  <p style="margin-top:12px">วิธีชำระเงิน: <strong>${esc(receipt.paymentMethod || '-')}</strong></p>
  ${receipt.note ? `<p>หมายเหตุ: ${esc(receipt.note)}</p>` : ''}
  <div class="sign"><div>ผู้รับเงิน<br><br>....................................</div><div>ผู้จ่ายเงิน<br><br>....................................</div></div>
</article>
<script>window.onload=()=>setTimeout(()=>window.print(),200)</script>
</body>
</html>`;
    const popup = window.open('', '_blank');
    popup.document.open();
    popup.document.write(html);
    popup.document.close();
  }

  function requireAdmin() {
    if (session.role !== 'admin') {
      toast('หน้านี้สำหรับ Admin เท่านั้น', 'error');
      navigate('receipt');
      throw new Error('Admin only');
    }
  }

  function uid(prefix) {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  function money(value) {
    return Number(value || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[char]));
  }

  function toast(message, type = 'info') {
    const el = $('toast');
    if (!el) return alert(message);
    el.textContent = message;
    el.className = `toast ${type}`;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.classList.add('hidden'), 2800);
  }
})();
