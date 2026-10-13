// sgs_grade_sync.js - ระบบซิงค์ผลการเรียน (แก้ 0, ร, มส, มผ) อัตโนมัติ + รีเช็คความถูกต้อง (โรงเรียนพัฒนานิคม)
// รองรับทั้ง Chrome Extension บนคอมพิวเตอร์ และ Bookmarklet บนมือถือ/iPad (ผ่าน SAMEORIGIN Worker Frame)

(function () {
  // ป้องกันไม่ให้รันซ้ำซ้อน หรือรันใน iframe ย่อยของตัวเอง
  if (window !== window.top) return;
  if (window.__NEXTSGS_GRADE_SYNC_INITIALIZED__) {
    if (typeof window.openNextSgsGradeSyncModal === 'function') {
      window.openNextSgsGradeSyncModal();
    }
    return;
  }
  window.__NEXTSGS_GRADE_SYNC_INITIALIZED__ = true;

  const DEFAULT_GAS_URL = 'https://script.google.com/macros/s/AKfycbx8fjFhCFgUpyrU05_xAon8yan5bOmHK-tardnunLyWJMOrGepFBtrjhCe3vw4cqq3ZFg/exec';
  const SHEET_ID = '1vfAjcf9whhVHVu_u4d-6yxyFNKIiTQ715Stz-yfRA4M';
  const STUDENT_RECORDS_GID = '2143121488';
  const SGS_EDIT_ALL_PATH = '/sgs/TblTranscripts/Edit-TblTranscripts-TableAll.aspx';

  // ดึงรายการ 'พร้อมทำงาน' โดยตรงจาก Google Sheets (TSV Export) ครบทุกชนิดข้อมูล (รวมเกรด 'ผ' และรหัสนักเรียนที่เป็นข้อความ)
  async function fetchReadyTasksDirectFromGviz() {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=tsv&gid=${STUDENT_RECORDS_GID}&_t=${Date.now()}`;
    const res = await fetch(url, { method: 'GET', credentials: 'omit' });
    const text = await res.text();
    const lines = text.split(/\r?\n/);
    if (lines.length < 2) {
      return { status: 'success', success: true, count: 0, tasks: [], fromDirectGviz: true };
    }

    const cols = lines[0].split('\t').map(c => cleanStr(c));
    const idx = name => cols.indexOf(name);
    const iSubjCode = idx('รหัสวิชา'),
          iSubjName = idx('ชื่อวิชา'),
          iRoom = idx('ห้อง'),
          iGrade = idx('ชั้น'),
          iTeacher = idx('ครูผู้สอน'),
          iStuId = idx('เลขประจำตัว'),
          iStuName = idx('ชื่อ-นามสกุล'),
          iYear = idx('ปีการศึกษา'),
          iTerm = idx('ภาคเรียนที่'),
          iOldScore = idx('คะแนนเดิม'),
          iOldGrade = idx('ผลการเรียนเดิม'),
          iNewGrade = idx('ผลการเรียนใหม่'),
          iStatus = idx('สถานะระบบ'),
          iSpecialId = idx('เลขเฉพาะ');

    const getVal = (cells, cIdx) => {
      if (cIdx < 0 || !cells || cIdx >= cells.length || cells[cIdx] === undefined) return '';
      return cleanStr(cells[cIdx]);
    };

    const tasks = [];
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i]) continue;
      const cells = lines[i].split('\t');
      const status = getVal(cells, iStatus);
      if (status !== 'พร้อมทำงาน') continue;

      const subjCode = getVal(cells, iSubjCode);
      const specialId = getVal(cells, iSpecialId);
      let stuId = getVal(cells, iStuId);
      if (!stuId && specialId && subjCode && specialId.startsWith(subjCode)) {
        stuId = cleanStr(specialId.slice(subjCode.length));
      }

      const oldGrade = getVal(cells, iOldGrade) || '';
      let newGrade = getVal(cells, iNewGrade);
      if (!newGrade && oldGrade === 'มผ') newGrade = 'ผ';
      if (!stuId || !subjCode || !newGrade) continue;

      const gradeStr = getVal(cells, iGrade);
      const roomRaw = getVal(cells, iRoom);
      const roomStr = roomRaw ? roomRaw.replace(/\.0+$/, '') : '';

      tasks.push({
        rowId: i + 1,
        specialId: specialId || (subjCode + stuId),
        stuId,
        stuName: getVal(cells, iStuName),
        grade: gradeStr,
        room: roomStr,
        gradeRoom: gradeStr + (roomStr ? '/' + roomStr : ''),
        subjCode,
        subjName: getVal(cells, iSubjName),
        teacher: getVal(cells, iTeacher),
        year: getVal(cells, iYear).replace(/\.0+$/, ''),
        term: getVal(cells, iTerm).replace(/\.0+$/, ''),
        oldScore: getVal(cells, iOldScore),
        oldGrade,
        newGrade,
        targetBox: oldGrade === 'มส' ? 'RepeatGr' : 'ReGr',
        status
      });
    }
    return { status: 'success', success: true, count: tasks.length, tasks, fromDirectGviz: true };
  }

  let syncQueue = [];
  let isSyncRunning = false;
  let stopRequested = false;
  let currentSyncIndex = -1;
  let lastAlertMsg = '';

  function getGasUrl() {
    try {
      return localStorage.getItem('nextsgs_grade_sync_gas_url') || DEFAULT_GAS_URL;
    } catch (e) {
      return DEFAULT_GAS_URL;
    }
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function cleanStr(v) {
    return v == null ? '' : String(v).trim();
  }

  // เปรียบเทียบเกรดที่แสดงในตาราง SGS (คอลัมน์ที่ 8) กับผลการเรียนใหม่ที่ต้องการ
  function gradesMatch(actual, expected) {
    const a = cleanStr(actual);
    const e = cleanStr(expected);
    if (!a || !e) return false;
    if (a === e) return true;
    const numA = Number(a);
    const numE = Number(e);
    if (!isNaN(numA) && !isNaN(numE) && a !== '' && e !== '') {
      return Math.abs(numA - numE) < 0.001;
    }
    return false;
  }

  // เรียก API ไปยัง Google Apps Script (Code.gs) พร้อมระบบตรวจจับผลลัพธ์และ Fallback POST -> GET
  async function callGasApi(action, payload = {}, method = 'POST') {
    const baseUrl = getGasUrl();
    let lastErr = null;

    // 1. ลอง POST ก่อน (text/plain เลี่ยงปัญหา CORS preflight ในบราวเซอร์)
    if (method === 'POST') {
      try {
        const res = await fetch(baseUrl, {
          method: 'POST',
          credentials: 'omit',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action, ...payload })
        });
        const resData = await res.json();
        if (resData && (resData.success === true || resData.status === 'success')) {
          return resData;
        }
        if (resData && (resData.success === false || resData.status === 'error')) {
          lastErr = new Error(resData.message || resData.error || 'เซิร์ฟเวอร์แจ้งข้อผิดพลาด');
        }
      } catch (err) {
        lastErr = err;
      }
    }

    // 2. Fallback: ลอง GET หาก POST คืนค่า Invalid Action หรือมีปัญหาเน็ตเวิร์ก
    try {
      const url = new URL(baseUrl);
      url.searchParams.set('action', action);
      if (typeof payload === 'object' && payload !== null) {
        url.searchParams.set('payload', JSON.stringify(payload));
        Object.entries(payload).forEach(([k, v]) => {
          if (v !== undefined && v !== null && typeof v !== 'object') {
            url.searchParams.set(k, String(v));
          }
        });
      }
      url.searchParams.set('_t', Date.now());
      const res = await fetch(url.toString(), { method: 'GET', credentials: 'omit' });
      const resData = await res.json();
      if (resData && (resData.success === true || resData.status === 'success')) {
        return resData;
      }
      if (resData && (resData.success === false || resData.status === 'error')) {
        throw new Error(resData.message || resData.error || 'เซิร์ฟเวอร์แจ้งข้อผิดพลาด');
      }
      return resData;
    } catch (err) {
      throw lastErr || err;
    }
  }

  // ตรวจสอบว่าอยู่บนเว็บ SGS หรือไม่
  function isSgsDomain() {
    const h = window.location.hostname.toLowerCase();
    return h.includes('bopp-obec.info') || h.includes('sgs');
  }

  function isGradeCorrectionPage() {
    return /edit-?tbltranscripts-?tableall/i.test(window.location.href);
  }

  // สร้างปุ่มลอยสำหรับเปิดแผงซิงค์แก้ 0, ร, มส, มผ (แสดงเฉพาะหน้า Edit-TblTranscripts-TableAll.aspx เท่านั้น)
  function createFloatingSyncLauncher() {
    if (!isSgsDomain() || !isGradeCorrectionPage()) return;
    if (document.getElementById('nextsgs-grade-sync-fab')) return;

    const fab = document.createElement('button');
    fab.id = 'nextsgs-grade-sync-fab';
    fab.type = 'button';
    fab.innerHTML = `
      <span style="font-size:16px;">🤖</span>
      <span>ซิงค์แก้ 0, ร, มส อัตโนมัติ</span>
      <span id="nextsgs-fab-ready-badge" style="display:none; background:#ef4444; color:#fff; padding:1px 7px; border-radius:999px; font-size:11px; font-weight:800;">0</span>
    `;
    fab.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 20px;
      z-index: 999998;
      background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
      color: #ffffff;
      border: 2px solid rgba(255,255,255,0.25);
      border-radius: 999px;
      padding: 10px 18px;
      font-family: 'Prompt', 'Sarabun', sans-serif;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 10px 25px -5px rgba(79, 70, 229, 0.55);
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s ease;
    `;
    fab.onmouseenter = () => { fab.style.transform = 'translateY(-2px) scale(1.02)'; };
    fab.onmouseleave = () => { fab.style.transform = 'translateY(0) scale(1)'; };
    fab.onclick = () => openNextSgsGradeSyncModal();

    document.body.appendChild(fab);

    // ถ้าอยู่หน้า Edit-TblTranscripts-TableAll.aspx ให้เช็คจำนวนรายการ 'พร้อมทำงาน' อัตโนมัติ (ดึงตรงจาก TSV เร็ว 0.5 วินาที)
    if (isGradeCorrectionPage()) {
      fetchReadyTasksDirectFromGviz()
        .catch(() => callGasApi('get-ready-sgs', {}, 'GET'))
        .then(res => {
          if (res && res.success && Array.isArray(res.tasks)) {
            const badge = document.getElementById('nextsgs-fab-ready-badge');
            if (badge && res.tasks.length > 0) {
              badge.style.display = 'inline-block';
              badge.textContent = res.tasks.length + ' คน';
            }
          }
        }).catch(() => {});
    }
  }

  // สร้างหน้าต่าง Modal หลักสำหรับซิงค์และรีเช็คเกรด
  function openNextSgsGradeSyncModal() {
    let modal = document.getElementById('nextsgs-grade-sync-modal');
    if (modal) {
      modal.style.display = 'flex';
      if (syncQueue.length === 0 && !isSyncRunning) {
        fetchReadyTasksFromSheet();
      }
      return;
    }

    modal = document.createElement('div');
    modal.id = 'nextsgs-grade-sync-modal';
    modal.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 999999;
      background: rgba(15, 23, 42, 0.72);
      backdrop-filter: blur(4px);
      display: flex;
      flex-direction: column;
      padding: 6px;
      font-family: 'Prompt', 'Sarabun', -apple-system, BlinkMacSystemFont, sans-serif;
      box-sizing: border-box;
    `;

    modal.innerHTML = `
      <div style="background:#ffffff; border-radius:16px; width:100%; height:100%; display:flex; flex-direction:column; overflow:hidden; box-shadow:0 25px 50px -12px rgba(0,0,0,0.45); border:1px solid #cbd5e1;">
        <!-- Header -->
        <div style="background:linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%); color:#fff; padding:10px 16px; display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:8px; flex-shrink:0;">
          <div style="display:flex; align-items:center; gap:10px;">
            <span style="font-size:20px;">🤖</span>
            <div>
              <div style="font-size:14.5px; font-weight:800; letter-spacing:0.2px;">ระบบซิงค์แก้ 0, ร, มส, มผ อัตโนมัติ + รีเช็คความถูกต้อง (แบ่งจอ ซ้าย-ขวา)</div>
              <div style="font-size:11px; color:#c7d2fe;">ฝั่งซ้าย: คิวรายการ "พร้อมทำงาน" จาก Google Sheets | ฝั่งขวา: หน้าจอปฏิบัติการ SGS สด + รีเช็คช่องที่ 8 (Grade)</div>
            </div>
          </div>
          <div style="display:flex; flex-wrap:wrap; align-items:center; gap:6px;">
            <button id="nsgs-btn-line-summary" type="button" style="background:linear-gradient(135deg, #059669 0%, #047857 100%); color:#fff; border:none; border-radius:9px; padding:7px 13px; font-size:12px; font-weight:800; cursor:pointer; box-shadow:0 3px 10px rgba(5,150,105,0.35); display:flex; align-items:center; gap:5px;" title="สรุปรายงานผลการแก้ไขสำหรับส่งกลุ่ม LINE">
              📋 สรุปส่ง LINE
            </button>
            <button id="nsgs-btn-retry-sheet" type="button" style="display:none; background:linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color:#fff; border:none; border-radius:9px; padding:7px 13px; font-size:12px; font-weight:800; cursor:pointer; box-shadow:0 3px 10px rgba(59,130,246,0.35); align-items:center; gap:5px;" title="ส่งผลรายการที่บันทึกใน SGS ผ่านแล้วไปอัปเดตลง Google Sheets ทันที">
              ⚡ ส่งผลลงชีตซ้ำ
            </button>
            <button id="nsgs-btn-reload" type="button" style="background:rgba(255,255,255,0.15); color:#fff; border:1px solid rgba(255,255,255,0.3); border-radius:9px; padding:6px 12px; font-size:12px; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:5px;">
              🔄 ดึงรายการ "พร้อมทำงาน"
            </button>
            <button id="nsgs-btn-start" type="button" style="background:linear-gradient(135deg, #10b981 0%, #059669 100%); color:#fff; border:none; border-radius:9px; padding:7px 15px; font-size:12.5px; font-weight:800; cursor:pointer; box-shadow:0 4px 12px rgba(16,185,129,0.4); display:flex; align-items:center; gap:6px;">
              ▶ เริ่มซิงค์ + รีเช็คอัตโนมัติ
            </button>
            <button id="nsgs-btn-stop" type="button" style="display:none; background:linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color:#fff; border:none; border-radius:9px; padding:7px 15px; font-size:12.5px; font-weight:800; cursor:pointer; align-items:center; gap:6px;">
              ⏸ หยุดพัก
            </button>
            <button id="nsgs-btn-ratio" type="button" title="สลับสัดส่วนหน้าจอซ้าย-ขวา" style="background:rgba(255,255,255,0.12); color:#e0e7ff; border:1px solid rgba(255,255,255,0.2); border-radius:9px; padding:6px 10px; font-size:11px; font-weight:700; cursor:pointer;">
              ⇄ สัดส่วน 50:50
            </button>
            <button id="nsgs-btn-toggle-frame" type="button" style="background:rgba(255,255,255,0.12); color:#e0e7ff; border:1px solid rgba(255,255,255,0.2); border-radius:9px; padding:6px 10px; font-size:11px; font-weight:600; cursor:pointer;">
              👁️ ซ่อน/แสดงจอ SGS
            </button>
            <button id="nsgs-btn-close" type="button" style="background:rgba(239,68,68,0.25); color:#fecaca; border:1px solid rgba(239,68,68,0.4); border-radius:9px; padding:6px 11px; font-size:12px; font-weight:800; cursor:pointer;">
              ✕ ย่อหน้าต่าง
            </button>
          </div>
        </div>

        <!-- Status & Summary Bar -->
        <div style="background:#f8fafc; border-bottom:1px solid #e2e8f0; padding:8px 16px; display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:8px; flex-shrink:0;">
          <div style="display:flex; flex-wrap:wrap; gap:8px; align-items:center;">
            <div style="background:#eff6ff; border:1px solid #bfdbfe; color:#1e40af; padding:4px 11px; border-radius:8px; font-size:12px; font-weight:700;">
              📋 รอซิงค์: <span id="nsgs-stat-pending">0</span>
            </div>
            <div style="background:#ecfdf5; border:1px solid #a7f3d0; color:#065f46; padding:4px 11px; border-radius:8px; font-size:12px; font-weight:700;">
              ✅ สำเร็จ (รีเช็คผ่าน): <span id="nsgs-stat-success">0</span>
            </div>
            <div style="background:#fef2f2; border:1px solid #fecaca; color:#991b1b; padding:4px 11px; border-radius:8px; font-size:12px; font-weight:700;">
              ❌ ผิดพลาด: <span id="nsgs-stat-error">0</span>
            </div>
          </div>
          <div id="nsgs-live-status" style="font-size:12px; font-weight:700; color:#334155; background:#fff; border:1px solid #cbd5e1; padding:5px 14px; border-radius:999px; flex:1; min-width:240px; max-width:620px; text-align:center; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
            ⏳ พร้อมทำงาน — กด "ดึงรายการ พร้อมทำงาน" เพื่อโหลดคิวล่าสุด
          </div>
        </div>

        <!-- Notice Bar for Google Apps Script deployment status -->
        <div id="nsgs-gas-notice-bar" style="display:none; background:#fff7ed; border-bottom:1px solid #fdba74; padding:8px 16px; font-size:12px; color:#9a3412; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:10px; flex-shrink:0;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:16px;">⚠️</span>
            <span id="nsgs-gas-notice-text">ตรวจพบเกรดบันทึกลง SGS แล้ว แต่ยังไม่สามารถเปลี่ยนสถานะเป็น "ซิงค์แล้ว" ใน Google Sheets ได้ (เนื่องจาก Web App ปลายทางยังไม่ได้เลือก Deploy เวอร์ชัน 107)</span>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <a href="https://script.google.com/d/1RzCRw4dLAIfwqQ7abOJOWfMy7NSlQxnUC-uI_M-TaSHXIwVndQks0iAE/edit" target="_blank" style="background:#ea580c; color:#fff; text-decoration:none; padding:5px 12px; border-radius:7px; font-weight:800; font-size:11.5px; box-shadow:0 2px 4px rgba(234,88,12,0.3);">
              ⚙️ เปิด Apps Script เพื่อ Deploy (เลือก V.107)
            </a>
            <button id="nsgs-btn-notice-retry" type="button" style="background:#2563eb; color:#fff; border:none; padding:5px 12px; border-radius:7px; font-weight:800; font-size:11.5px; cursor:pointer;">
              ⚡ อัปเดตลงชีตเดี๋ยวนี้
            </button>
          </div>
        </div>

        <!-- Main Body Split: Left (Queue Table) + Right (SGS Live Worker Frame) -->
        <div id="nsgs-split-body" style="flex:1; display:flex; flex-direction:row; overflow:hidden; min-height:0; width:100%;">
          <!-- Left Half: Queue Table Container -->
          <div id="nsgs-table-panel" style="width:50%; height:100%; overflow-y:auto; overflow-x:auto; padding:10px 12px; box-sizing:border-box; background:#ffffff;">
            <table style="width:100%; border-collapse:collapse; font-size:11.5px;">
              <thead>
                <tr style="background:#f1f5f9; color:#475569; text-align:left; border-bottom:2px solid #cbd5e1; position:sticky; top:0; z-index:2;">
                  <th style="padding:7px 5px; width:28px; text-align:center;"><input type="checkbox" id="nsgs-chk-all" checked style="cursor:pointer;" /></th>
                  <th style="padding:7px 5px; width:32px; text-align:center;">#</th>
                  <th style="padding:7px 6px;">นักเรียน (รหัส / ชื่อ / ชั้น)</th>
                  <th style="padding:7px 6px;">วิชา (ปี/เทอม)</th>
                  <th style="padding:7px 6px; text-align:center;">เดิม ➡️ ใหม่</th>
                  <th style="padding:7px 6px; text-align:center;">รีเช็ค (ช่อง 8)</th>
                  <th style="padding:7px 6px;">สถานะ / รายงานผล</th>
                </tr>
              </thead>
              <tbody id="nsgs-queue-tbody">
                <tr>
                  <td colspan="7" style="padding:30px; text-align:center; color:#64748b;">กำลังโหลดข้อมูลจาก Google Sheets...</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Right Half: Live SGS Worker Frame Container -->
          <div id="nsgs-worker-container" style="width:50%; height:100%; border-left:3px solid #4f46e5; display:flex; flex-direction:column; background:#0f172a; flex-shrink:0; box-sizing:border-box;">
            <div style="background:#1e293b; color:#cbd5e1; padding:6px 12px; font-size:11px; font-weight:600; display:flex; justify-content:space-between; align-items:center; flex-shrink:0;">
              <span>🖥️ หน้าจอ SGS สด (ค้นหา ➡️ กรอกเกรด ➡️ บันทึก ➡️ รีเช็คช่อง 8)</span>
              <span id="nsgs-frame-url-indicator" style="color:#94a3b8; font-size:10px;">${SGS_EDIT_ALL_PATH}</span>
            </div>
            <iframe id="nsgs-worker-frame" src="${SGS_EDIT_ALL_PATH}" style="width:100%; flex:1; height:100%; border:none; background:#fff;"></iframe>
          </div>
        </div>

        <!-- Modal Popup: สรุปรายงานสำหรับส่ง LINE -->
        <div id="nsgs-line-summary-modal" style="display:none; position:fixed; inset:0; z-index:99999999; background:rgba(15,23,42,0.65); backdrop-filter:blur(5px); align-items:center; justify-content:center; padding:16px; box-sizing:border-box;">
          <div style="background:#ffffff; border-radius:18px; width:100%; max-width:640px; max-height:90vh; display:flex; flex-direction:column; overflow:hidden; box-shadow:0 25px 50px -12px rgba(0,0,0,0.5); border:1px solid #cbd5e1;">
            <div style="background:linear-gradient(135deg, #065f46 0%, #047857 50%, #059669 100%); color:#fff; padding:14px 20px; display:flex; justify-content:space-between; align-items:center; flex-shrink:0;">
              <div style="display:flex; align-items:center; gap:10px;">
                <span style="font-size:22px;">📊</span>
                <div>
                  <div style="font-size:15px; font-weight:800;">สรุปรายงานผลการแก้ไข (พร้อมส่ง LINE)</div>
                  <div style="font-size:11px; color:#a7f3d0;">คัดลอกข้อความด้านล่างนี้ไปวางในกลุ่มไลน์ได้ทันที</div>
                </div>
              </div>
              <button id="nsgs-btn-close-line-modal" type="button" style="background:rgba(255,255,255,0.2); color:#fff; border:none; border-radius:8px; padding:5px 11px; font-size:13px; font-weight:800; cursor:pointer;">✕</button>
            </div>
            <div style="padding:16px; flex:1; display:flex; flex-direction:column; gap:12px; overflow:hidden;">
              <textarea id="nsgs-line-summary-textarea" readonly style="width:100%; flex:1; min-height:280px; font-family:'Sarabun', -apple-system, monospace; font-size:12.5px; line-height:1.55; padding:12px 14px; border-radius:10px; border:1px solid #cbd5e1; background:#f8fafc; color:#1e293b; resize:none; box-sizing:border-box; white-space:pre-wrap; outline:none;"></textarea>
              <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; flex-shrink:0;">
                <span id="nsgs-line-copy-hint" style="font-size:11.5px; color:#64748b; font-weight:600;">💡 ข้อความนี้จัดรูปแบบพร้อมส่งใน LINE ทันที</span>
                <div style="display:flex; gap:8px;">
                  <button id="nsgs-btn-copy-line" type="button" style="background:linear-gradient(135deg, #059669 0%, #10b981 100%); color:#fff; border:none; border-radius:10px; padding:9px 20px; font-size:13px; font-weight:800; cursor:pointer; box-shadow:0 4px 12px rgba(16,185,129,0.4); display:flex; align-items:center; gap:6px;">
                    <span>📲 คัดลอกข้อความส่ง LINE</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // ผูก Event ปุ่มต่างๆ
    document.getElementById('nsgs-btn-reload').onclick = () => {
      if (isSyncRunning) {
        alert('กรุณาหยุดการซิงค์ก่อนโหลดข้อมูลใหม่ครับ');
        return;
      }
      fetchReadyTasksFromSheet();
    };

    document.getElementById('nsgs-btn-start').onclick = () => {
      startAutoSyncLoop();
    };

    document.getElementById('nsgs-btn-stop').onclick = () => {
      stopRequested = true;
      setLiveStatus('🛑 กำลังหยุดพักหลังจบนักเรียนคนปัจจุบัน...', '#b45309');
    };

    let currentRatioMode = 0; // 0 = 50:50, 1 = 42:58, 2 = 58:42
    document.getElementById('nsgs-btn-ratio').onclick = () => {
      const tp = document.getElementById('nsgs-table-panel');
      const wc = document.getElementById('nsgs-worker-container');
      const btn = document.getElementById('nsgs-btn-ratio');
      if (!tp || !wc) return;
      wc.style.display = 'flex';
      currentRatioMode = (currentRatioMode + 1) % 3;
      if (currentRatioMode === 0) {
        tp.style.width = '50%';
        wc.style.width = '50%';
        if (btn) btn.textContent = '⇄ สัดส่วน 50:50';
      } else if (currentRatioMode === 1) {
        tp.style.width = '40%';
        wc.style.width = '60%';
        if (btn) btn.textContent = '⇄ สัดส่วน 40:60';
      } else {
        tp.style.width = '60%';
        wc.style.width = '40%';
        if (btn) btn.textContent = '⇄ สัดส่วน 60:40';
      }
    };

    document.getElementById('nsgs-btn-toggle-frame').onclick = () => {
      const tp = document.getElementById('nsgs-table-panel');
      const wc = document.getElementById('nsgs-worker-container');
      if (!wc || !tp) return;
      if (wc.style.display === 'none') {
        wc.style.display = 'flex';
        tp.style.width = '50%';
        wc.style.width = '50%';
      } else {
        wc.style.display = 'none';
        tp.style.width = '100%';
      }
    };

    document.getElementById('nsgs-btn-close').onclick = () => {
      modal.style.display = 'none';
    };

    const chkAll = document.getElementById('nsgs-chk-all');
    if (chkAll) {
      chkAll.onchange = () => {
        const checked = chkAll.checked;
        syncQueue.forEach(item => {
          if (item.syncStatus !== 'success') {
            item.selected = checked;
          }
        });
        renderQueueTable();
      };
    }

    const btnRetrySheet = document.getElementById('nsgs-btn-retry-sheet');
    if (btnRetrySheet) btnRetrySheet.onclick = () => retrySheetSync();

    const btnNoticeRetry = document.getElementById('nsgs-btn-notice-retry');
    if (btnNoticeRetry) btnNoticeRetry.onclick = () => retrySheetSync();

    const btnLineSummary = document.getElementById('nsgs-btn-line-summary');
    if (btnLineSummary) btnLineSummary.onclick = () => showLineSummaryModal();

    const btnCloseLineModal = document.getElementById('nsgs-btn-close-line-modal');
    if (btnCloseLineModal) btnCloseLineModal.onclick = () => hideLineSummaryModal();

    const btnCopyLine = document.getElementById('nsgs-btn-copy-line');
    if (btnCopyLine) btnCopyLine.onclick = () => copyLineSummaryToClipboard();

    fetchReadyTasksFromSheet();
  }

  // 📊 ฟังก์ชันสร้างข้อความสรุปรายงานสำหรับส่งกลุ่ม LINE
  function generateLineSummaryText() {
    const successTasks = syncQueue.filter(t => t.syncStatus === 'success');
    const errorTasks = syncQueue.filter(t => t.syncStatus === 'error');
    const totalProcessed = successTasks.length + errorTasks.length;

    const now = new Date();
    const dateStr = now.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';

    let text = `📊 สรุปผลการซิงค์แก้ผลการเรียน (SGS)\n`;
    text += `🏫 โรงเรียนพัฒนานิคม\n`;
    text += `🗓️ วันที่ ${dateStr} เวลา ${timeStr}\n`;
    text += `━━━━━━━━━━━━━━━━━━\n`;
    text += `👥 ผลการดำเนินงาน:\n`;
    text += `✅ ซิงค์สำเร็จ: ${successTasks.length} รายการ\n`;
    if (errorTasks.length > 0) {
      text += `❌ ไม่สำเร็จ: ${errorTasks.length} รายการ\n`;
    }
    text += `รวมดำเนินการ: ${totalProcessed} รายการ\n`;
    text += `━━━━━━━━━━━━━━━━━━\n\n`;

    if (successTasks.length > 0) {
      text += `📝 รายชื่อนักเรียนที่แก้ไขสำเร็จ:\n`;
      successTasks.forEach((t, i) => {
        text += `${i + 1}. [${t.stuId}] ${t.stuName} (${t.gradeRoom || '-'})\n`;
        text += `   • วิชา: ${t.subjCode} ${t.subjName || ''} (${t.year || '-'}/${t.term || '-'})\n`;
        text += `   • เกรด: ${t.oldGrade} ➡️ ${t.newGrade} (รีเช็ค: ${t.verifiedGrade || t.newGrade} ✅)\n`;
      });
      text += `\n`;
    }

    if (errorTasks.length > 0) {
      text += `⚠️ รายการที่พบปัญหา/ต้องตรวจสอบ:\n`;
      errorTasks.forEach((t, i) => {
        text += `${i + 1}. [${t.stuId}] ${t.stuName} (${t.gradeRoom || '-'})\n`;
        text += `   • วิชา: ${t.subjCode} (${t.oldGrade} ➡️ ${t.newGrade})\n`;
        text += `   • สาเหตุ: ${t.statusMessage || 'เกิดข้อผิดพลาด'}\n`;
      });
      text += `\n`;
    }

    text += `━━━━━━━━━━━━━━━━━━\n`;
    text += `🔒 อัปเดตสถานะ "ซิงค์แล้ว" ในระบบ Google Sheets เรียบร้อย`;
    return text;
  }

  function showLineSummaryModal() {
    const modal = document.getElementById('nsgs-line-summary-modal');
    const textarea = document.getElementById('nsgs-line-summary-textarea');
    const btnCopy = document.getElementById('nsgs-btn-copy-line');
    if (!modal || !textarea) return;

    const summaryText = generateLineSummaryText();
    textarea.value = summaryText || 'ยังไม่มีรายการที่ได้รับการซิงค์ในรอบนี้ครับ';
    if (btnCopy) {
      btnCopy.innerHTML = `<span>📲 คัดลอกข้อความส่ง LINE</span>`;
      btnCopy.style.background = 'linear-gradient(135deg, #059669 0%, #10b981 100%)';
    }
    modal.style.display = 'flex';
  }

  function hideLineSummaryModal() {
    const modal = document.getElementById('nsgs-line-summary-modal');
    if (modal) modal.style.display = 'none';
  }

  function copyLineSummaryToClipboard() {
    const textarea = document.getElementById('nsgs-line-summary-textarea');
    const btnCopy = document.getElementById('nsgs-btn-copy-line');
    const text = textarea ? textarea.value : '';
    if (!text) return;

    const setCopiedUI = () => {
      if (btnCopy) {
        btnCopy.innerHTML = `<span>✅ คัดลอกสำเร็จแล้ว!</span>`;
        btnCopy.style.background = 'linear-gradient(135deg, #15803d 0%, #16a34a 100%)';
        setTimeout(() => {
          if (btnCopy) {
            btnCopy.innerHTML = `<span>📲 คัดลอกข้อความส่ง LINE</span>`;
            btnCopy.style.background = 'linear-gradient(135deg, #059669 0%, #10b981 100%)';
          }
        }, 3000);
      }
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        setCopiedUI();
      }).catch(() => {
        if (textarea) {
          textarea.focus();
          textarea.select();
          document.execCommand('copy');
          setCopiedUI();
        }
      });
    } else if (textarea) {
      textarea.focus();
      textarea.select();
      document.execCommand('copy');
      setCopiedUI();
    }
  }

  // ส่งรายการที่บันทึก SGS ผ่านแล้ว แต่ชีตยังไม่อัปเดต ไปอัปเดตลงชีตซ้ำ
  async function retrySheetSync() {
    const successTasks = syncQueue.filter(t => t.syncStatus === 'success' && t.sheetUpdated !== true);
    if (successTasks.length === 0) {
      alert('ไม่มีรายการที่ซิงค์ SGS ผ่านและรออัปเดตชีต');
      return;
    }

    setLiveStatus(`⏳ กำลังส่งผล ${successTasks.length} รายการไปอัปเดตชีต StudentRecords...`, '#2563eb');
    try {
      const items = successTasks.map(task => ({
        rowId: task.rowId,
        specialId: task.specialId,
        stuId: task.stuId,
        stuName: task.stuName,
        gradeRoom: task.gradeRoom,
        subjCode: task.subjCode,
        subjName: task.subjName,
        year: task.year,
        term: task.term,
        oldGrade: task.oldGrade,
        newGrade: task.newGrade,
        verifiedGrade: task.verifiedGrade || task.newGrade,
        success: true,
        status: 'สำเร็จ',
        message: 'รีเช็คตาราง SGS ตรงกับเกรดใหม่ 100%'
      }));

      const res = await callGasApi('update-sgs-sync', { items }, 'POST');
      if (res && (res.success || res.status === 'success')) {
        successTasks.forEach(task => {
          task.sheetUpdated = true;
          task.statusMessage = 'อัปเดตชีต "ซิงค์แล้ว" เรียบร้อยแล้ว ✅';
        });
        renderQueueTable();
        hideGasDeployNotice();
        setLiveStatus(`✅ อัปเดตสถานะ "ซิงค์แล้ว" ลงชีตสำเร็จ ${res.updatedCount || successTasks.length} รายการ!`, '#059669');
        alert(`✅ อัปเดตสถานะ "ซิงค์แล้ว" ลง Google Sheets เรียบร้อยแล้ว ${res.updatedCount || successTasks.length} รายการ!`);
      } else {
        throw new Error((res && res.message) || 'เซิร์ฟเวอร์ยังไม่เปิดใช้ action update-sgs-sync');
      }
    } catch (err) {
      showGasDeployNotice(successTasks.length, err.message);
      setLiveStatus(`❌ ไม่สามารถอัปเดตชีตได้: ${err.message}`, '#dc2626');
      alert(`❌ บันทึกลงชีตไม่สำเร็จ: ${err.message}\n\nกรุณาเปิด Apps Script แล้ว Deploy เลือกเวอร์ชัน 104 ก่อน แล้วกลับมากดปุ่มนี้อีกครั้งครับ`);
    }
  }

  function showGasDeployNotice(count, errMsg = '') {
    const bar = document.getElementById('nsgs-gas-notice-bar');
    const txt = document.getElementById('nsgs-gas-notice-text');
    const btnRetry = document.getElementById('nsgs-btn-retry-sheet');
    if (bar) bar.style.display = 'flex';
    if (btnRetry) btnRetry.style.display = 'flex';
    if (txt) {
      txt.innerHTML = `บันทึกใน SGS สำเร็จแล้ว แต่ยังไม่สามารถอัปเดตสถานะในชีตได้ <b>${count} รายการ</b>${errMsg ? ' (' + errMsg + ')' : ''} — <b>กรุณากดเปิด Apps Script แล้ว Deploy เลือกเวอร์ชัน 104</b>`;
    }
  }

  function hideGasDeployNotice() {
    const bar = document.getElementById('nsgs-gas-notice-bar');
    const btnRetry = document.getElementById('nsgs-btn-retry-sheet');
    if (bar) bar.style.display = 'none';
    if (btnRetry) btnRetry.style.display = 'none';
  }

  window.openNextSgsGradeSyncModal = openNextSgsGradeSyncModal;

  function setLiveStatus(text, color = '#334155') {
    const el = document.getElementById('nsgs-live-status');
    if (el) {
      el.textContent = text;
      el.style.color = color;
    }
  }

  function updateSummaryCounts() {
    const pending = syncQueue.filter(x => x.syncStatus !== 'success' && x.syncStatus !== 'error').length;
    const success = syncQueue.filter(x => x.syncStatus === 'success').length;
    const error = syncQueue.filter(x => x.syncStatus === 'error').length;

    const pEl = document.getElementById('nsgs-stat-pending');
    const sEl = document.getElementById('nsgs-stat-success');
    const eEl = document.getElementById('nsgs-stat-error');
    if (pEl) pEl.textContent = pending;
    if (sEl) sEl.textContent = success;
    if (eEl) eEl.textContent = error;

    const badge = document.getElementById('nextsgs-fab-ready-badge');
    if (badge) {
      if (pending > 0) {
        badge.style.display = 'inline-block';
        badge.textContent = pending + ' คน';
      } else {
        badge.style.display = 'none';
      }
    }
  }

  async function fetchReadyTasksFromSheet() {
    setLiveStatus('🔄 กำลังดึงรายการ "พร้อมทำงาน" จาก Google Sheets...', '#2563eb');
    const tbody = document.getElementById('nsgs-queue-tbody');
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="7" style="padding:30px; text-align:center; color:#2563eb; font-weight:700;">🔄 กำลังเชื่อมต่อ Google Sheets (StudentRecords)...</td></tr>`;
    }

    try {
      let res = await fetchReadyTasksDirectFromGviz().catch(() => null);
      if (!res || !res.success) {
        res = await callGasApi('get-ready-sgs', {}, 'GET');
      }

      syncQueue = (res.tasks || []).map((t, idx) => ({
        ...t,
        index: idx + 1,
        selected: true,
        syncStatus: 'pending', // pending | running | success | error
        verifiedGrade: '-',
        statusMessage: '⏳ รอซิงค์'
      }));

      renderQueueTable();
      updateSummaryCounts();

      if (syncQueue.length === 0) {
        setLiveStatus('✨ ไม่มีรายการที่ค้างสถานะ "พร้อมทำงาน" ในขณะนี้', '#059669');
      } else {
        setLiveStatus(`✅ โหลดสำเร็จ ${syncQueue.length} รายการ — กด "▶ เริ่มซิงค์ + รีเช็คอัตโนมัติ" ได้เลย`, '#059669');
      }
    } catch (err) {
      setLiveStatus('❌ โหลดข้อมูลไม่สำเร็จ: ' + err.message, '#dc2626');
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="7" style="padding:24px; text-align:center; color:#dc2626; font-weight:700;">❌ เกิดข้อผิดพลาด: ${err.message}</td></tr>`;
      }
    }
  }

  function renderQueueTable() {
    const tbody = document.getElementById('nsgs-queue-tbody');
    if (!tbody) return;

    if (syncQueue.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="padding:32px; text-align:center; color:#64748b; font-size:13px;">
            ไม่มีรายการที่มีสถานะ <b>"พร้อมทำงาน"</b> ในชีต StudentRecords<br>
            <span style="font-size:11px; color:#94a3b8;">(กรุณาไปที่หน้าอนุมัติผลการเรียนเพื่อกดอนุมัติให้เป็น "พร้อมทำงาน" ก่อน)</span>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = syncQueue.map((item, idx) => {
      const isMs = cleanStr(item.oldGrade) === 'มส';
      const targetBoxLabel = isMs
        ? `<span style="background:#fef3c7; color:#92400e; padding:1px 6px; border-radius:4px; font-weight:700; font-size:10px;">RepeatGr</span>`
        : `<span style="background:#e0f2fe; color:#0369a1; padding:1px 6px; border-radius:4px; font-weight:700; font-size:10px;">ReGr</span>`;

      let rowBg = '#ffffff';
      let statusBadge = `<span style="color:#64748b; font-weight:600;">${item.statusMessage}</span>`;
      if (item.syncStatus === 'running') {
        rowBg = '#eff6ff';
        statusBadge = `<span style="color:#2563eb; font-weight:800;">⚡ ${item.statusMessage}</span>`;
      } else if (item.syncStatus === 'success') {
        rowBg = '#f0fdf4';
        if (item.sheetUpdated === false) {
          statusBadge = `<span style="color:#b45309; font-weight:800;">⚠️ SGS ผ่าน (รออัปเดตชีต)</span><div style="font-size:10px; color:#dc2626; margin-top:2px;">${item.sheetError || 'Apps Script ยังไม่เปิด V.107'}</div>`;
        } else if (item.sheetUpdated === true) {
          statusBadge = `<span style="color:#15803d; font-weight:800;">✅ ซิงค์ & บันทึกชีตแล้ว</span><div style="font-size:10.5px; color:#166534; margin-top:1px;">${item.statusMessage}</div>`;
        } else {
          statusBadge = `<span style="color:#15803d; font-weight:800;">✅ ${item.statusMessage}</span>`;
        }
      } else if (item.syncStatus === 'error') {
        rowBg = '#fef2f2';
        statusBadge = `<span style="color:#b91c1c; font-weight:800;">❌ ${item.statusMessage}</span>`;
      }

      return `
        <tr id="nsgs-row-${idx}" style="background:${rowBg}; border-bottom:1px solid #e2e8f0; transition:background 0.2s;">
          <td style="padding:6px 4px; text-align:center;">
            <input type="checkbox" class="nsgs-item-chk" data-idx="${idx}" ${item.selected ? 'checked' : ''} ${item.syncStatus === 'success' ? 'disabled' : ''} style="cursor:pointer;" />
          </td>
          <td style="padding:6px 4px; text-align:center; color:#64748b; font-weight:700;">${idx + 1}</td>
          <td style="padding:6px 6px;">
            <div style="font-weight:800; color:#1e293b;"><span style="font-family:monospace; color:#312e81;">${item.stuId}</span> ${item.stuName}</div>
            <div style="font-size:10.5px; color:#64748b;">ชั้น ${item.gradeRoom || '-'}</div>
          </td>
          <td style="padding:6px 6px;">
            <div><b style="color:#312e81;">${item.subjCode}</b> <span style="color:#475569; font-size:11px;">${item.subjName || ''}</span></div>
            <div style="font-size:10.5px; color:#64748b;">ปี ${item.year || '-'} / เทอม ${item.term || '-'}</div>
          </td>
          <td style="padding:6px 6px; text-align:center; white-space:nowrap;">
            <div>
              <span style="background:#fee2e2; color:#991b1b; padding:1px 6px; border-radius:5px; font-weight:800;">${item.oldGrade}</span>
              <span style="color:#94a3b8; font-size:10px;">➡️</span>
              <span style="background:#dcfce7; color:#166534; padding:1px 6px; border-radius:5px; font-weight:800;">${item.newGrade}</span>
            </div>
            <div style="margin-top:2px;">${targetBoxLabel}</div>
          </td>
          <td style="padding:6px 6px; text-align:center; font-weight:900; font-size:13px; color:${item.syncStatus === 'success' ? '#15803d' : (item.syncStatus === 'error' ? '#b91c1c' : '#64748b')};">${item.verifiedGrade || '-'}</td>
          <td style="padding:6px 6px; font-size:11px; line-height:1.35;">${statusBadge}</td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('.nsgs-item-chk').forEach(cb => {
      cb.onchange = () => {
        const i = parseInt(cb.getAttribute('data-idx'), 10);
        if (syncQueue[i]) syncQueue[i].selected = cb.checked;
      };
    });
  }

  // รอจนกว่า iframe ของ SGS โหลดเสร็จและไม่อยู่ระหว่าง Async PostBack (UpdatePanel)
  async function waitForWorkerReady(iframe, timeoutMs = 20000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try {
        const win = iframe.contentWindow;
        const doc = iframe.contentDocument || (win && win.document);
        if (win && doc && doc.readyState === 'complete') {
          // ดักจับ alert / confirm และปลดล็อก submitcount อัตโนมัติไม่ให้ค้าง
          try {
            win.alert = function (msg) {
              console.log('[SGS Worker Alert]', msg);
              lastAlertMsg = String(msg || '');
              return true;
            };
            win.confirm = function (msg) {
              console.log('[SGS Worker Confirm]', msg);
              return true;
            };
            win.submitcount = 0;
          } catch (e) {}

          let inAsync = false;
          if (win.Sys && win.Sys.WebForms && win.Sys.WebForms.PageRequestManager) {
            const prm = win.Sys.WebForms.PageRequestManager.getInstance();
            if (prm && prm.get_isInAsyncPostBack()) {
              inAsync = true;
            }
          }
          if (!inAsync && doc.body) {
            return { win, doc };
          }
        }
      } catch (e) {}
      await sleep(120);
    }
    throw new Error('หน้าเว็บ SGS ใช้เวลาโหลดนานเกินกำหนด (Timeout)');
  }

  // ตั้งค่าช่องค้นหาใน SGS โดยปลดล็อก ASP.NET TextBoxWatermarkBehavior อย่างถูกต้อง
  function setSgsSearchField(win, doc, inputId, watermarkId, clientStateId, value) {
    const strVal = cleanStr(value);
    const inp = doc.getElementById(inputId);
    if (!inp) return;

    // 1. กระตุ้น focus และ keypress ก่อน เพื่อปลดล็อก Watermark ของ AjaxControlToolkit
    try {
      inp.focus();
      inp.dispatchEvent(new Event('focus', { bubbles: false }));
      inp.dispatchEvent(new KeyboardEvent('keypress', { key: strVal[0] || '0', keyCode: 48, charCode: 48, bubbles: true }));
    } catch (e) {}

    // 2. เรียกผ่าน AjaxControlToolkit API โดยตรง
    try {
      if (win && typeof win.$find === 'function') {
        const wm = win.$find(watermarkId);
        if (wm && typeof wm.set_Text === 'function') {
          wm.set_Text(strVal);
        }
      }
    } catch (e) {}

    try {
      if (win && win.Sys && win.Sys.Extended && win.Sys.Extended.UI && win.Sys.Extended.UI.TextBoxWrapper) {
        const wrapper = win.Sys.Extended.UI.TextBoxWrapper.get_Wrapper(inp);
        if (wrapper) {
          wrapper.set_IsWatermarked(false);
          if (typeof wrapper.set_Current === 'function') wrapper.set_Current(strVal);
          if (typeof wrapper.set_Value === 'function') wrapper.set_Value(strVal);
        }
      }
    } catch (e) {}

    // 3. กำหนดค่าลงใน DOM input โดยตรงอีกครั้ง
    inp.classList.remove('Search_InputHint');
    inp.value = strVal;
    const cs = doc.getElementById(clientStateId);
    if (cs) cs.value = '';
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    inp.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // ค้นหาแถวนักเรียนในตารางผลลัพธ์ของ SGS
  function findMatchingStudentRowInDoc(doc, task) {
    const allRows = Array.from(doc.querySelectorAll('.tre table tr, table.dBody tr'));
    const dataRows = allRows.filter(tr => tr.querySelectorAll('td.ttc').length >= 9);
    if (dataRows.length === 0) return null;

    const targetStuId = cleanStr(task.stuId);
    const targetSubj = cleanStr(task.subjCode);
    const targetYear = cleanStr(task.year);
    const targetTerm = cleanStr(task.term);

    // คอลัมน์ td.ttc ในหน้า Edit-TblTranscripts-TableAll.aspx:
    // ttc[0]=ปีการศึกษา, ttc[1]=ภาคเรียน, ttc[2]=ระดับชั้น, ttc[3]=วิชา, ttc[4]=นก.,
    // ttc[5]=เลขประจำตัว, ttc[6]=ชื่อ-นามสกุล, ttc[7]=ปกติ(ผลเดิม), ttc[8]=Grade(ผลสุทธิ),
    // ttc[9]=แก้ตัว(ReGr), ttc[10]=เรียนซ้ำ(RepeatGr), ttc[11]=Remark
    const matches = dataRows.filter(tr => {
      const cells = tr.querySelectorAll('td.ttc');
      const cellSubj = cleanStr(cells[3] ? cells[3].innerText : '');
      const cellStuId = cleanStr(cells[5] ? cells[5].innerText : '');
      const stuOk = !targetStuId || cellStuId === targetStuId;
      const subjOk = !targetSubj || cellSubj === targetSubj;
      return stuOk && subjOk;
    });

    if (matches.length === 0) {
      if (dataRows.length === 1 && cleanStr(dataRows[0].innerText).includes(targetStuId) && cleanStr(dataRows[0].innerText).includes(targetSubj)) {
        return dataRows[0];
      }
      return null;
    }

    // กรณีพบแถวข้อมูล ให้ค้นหาแถวที่ตรงกับ ปีการศึกษา และ ภาคเรียน
    const normTargetYr = targetYear ? targetYear.split('/')[0].trim() : '';
    const exactTerm = matches.find(tr => {
      const cells = tr.querySelectorAll('td.ttc');
      const cellYr = cleanStr(cells[0] ? cells[0].innerText : '').split('/')[0].trim();
      const cellTr = cleanStr(cells[1] ? cells[1].innerText : '');
      const yrOk = !normTargetYr || cellYr === normTargetYr;
      const trOk = !targetTerm || cellTr === targetTerm;
      return yrOk && trOk;
    });

    if (exactTerm) return exactTerm;
    if (matches.length === 1 && !normTargetYr && !targetTerm) return matches[0];
    return null;
  }

  // สั่งค้นหา เลขประจำตัว + รหัสวิชา ใน iframe
  async function performSgsSearch(iframe, task) {
    let { win, doc } = await waitForWorkerReady(iframe);

    const searchStuInput = doc.getElementById('ctl00_PageContent_TblTranscriptsSearch5');
    const searchSubjInput = doc.getElementById('ctl00_PageContent_TblTranscriptsSearch');
    if (!searchStuInput || !searchSubjInput) {
      // ถ้าไม่อยู่หน้า Edit-TblTranscripts-TableAll.aspx ให้โหลดหน้าใหม่
      iframe.src = SGS_EDIT_ALL_PATH;
      await sleep(1500);
      ({ win, doc } = await waitForWorkerReady(iframe));
    }

    if (!doc.getElementById('ctl00_PageContent_TblTranscriptsSearch5')) {
      throw new Error('SESSION_EXPIRED: ไม่พบช่องค้นหาใน SGS (กรุณาตรวจสอบว่ายังล็อกอิน SGS อยู่)');
    }

    setSgsSearchField(
      win,
      doc,
      'ctl00_PageContent_TblTranscriptsSearch5',
      'ctl00_PageContent_TextBoxWatermark',
      'ctl00_PageContent_TextBoxWatermark_ClientState',
      task.stuId
    );
    setSgsSearchField(
      win,
      doc,
      'ctl00_PageContent_TblTranscriptsSearch',
      'ctl00_PageContent_TextBoxWatermark1',
      'ctl00_PageContent_TextBoxWatermark1_ClientState',
      task.subjCode
    );

    await sleep(100);

    // ทำเครื่องหมายตารางเดิมก่อนกดค้นหา เพื่อตรวจจับเมื่อตารางใหม่โหลดเสร็จจริง
    const oldMarker = doc.getElementById('ctl00_PageContent_TblTranscriptsToggleAll') || doc.querySelector('.tre table');
    if (oldMarker) oldMarker.setAttribute('data-nsgs-stale', '1');
    try { win.submitcount = 0; } catch (e) {}

    // ปุ่มค้นหาใน Edit-TblTranscripts-TableAll.aspx ใช้ ID: ctl00_PageContent_TblTranscriptsSearchButton__Button
    const searchBtn =
      doc.getElementById('ctl00_PageContent_TblTranscriptsSearchButton__Button') ||
      doc.getElementById('ctl00_PageContent_TblTranscriptsSearchButton_Button') ||
      doc.getElementById('ctl00_PageContent_TblTranscriptsSearchButton') ||
      doc.querySelector('a[id*="TblTranscriptsSearchButton"], input[id*="TblTranscriptsSearchButton"], a[href*="TblTranscriptsSearchButton"]');

    if (searchBtn) {
      searchBtn.click();
    } else if (win && typeof win.__doPostBack === 'function') {
      win.__doPostBack('ctl00$PageContent$TblTranscriptsSearchButton$_Button', '');
    } else {
      throw new Error('ไม่พบปุ่มค้นหา (#ctl00_PageContent_TblTranscriptsSearchButton__Button)');
    }

    // รอจนกว่าตารางผลลัพธ์ใหม่จะถูกอัปเดตกลับมาจริงจากเซิร์ฟเวอร์ SGS
    const waitStart = Date.now();
    while (Date.now() - waitStart < 10000) {
      await sleep(120);
      ({ win, doc } = await waitForWorkerReady(iframe));
      const curMarker = doc.getElementById('ctl00_PageContent_TblTranscriptsToggleAll') || doc.querySelector('.tre table');
      if (curMarker && curMarker.getAttribute('data-nsgs-stale') !== '1') {
        break;
      }
    }
    await sleep(150);
    return { win, doc };
  }

  // ดำเนินการซิงค์ + รีเช็ค สำหรับนักเรียน 1 คน
  async function processSingleStudentTask(iframe, task, idx) {
    lastAlertMsg = '';

    // 1. ค้นหานักเรียน + รหัสวิชา
    task.statusMessage = `กำลังค้นหา รหัส ${task.stuId} วิชา ${task.subjCode}...`;
    renderQueueTable();
    setLiveStatus(`🔎 [${idx + 1}/${syncQueue.length}] กำลังค้นหา ${task.stuId} ${task.stuName} (${task.subjCode})...`, '#2563eb');

    let { win, doc } = await performSgsSearch(iframe, task);

    // 2. ค้นหาแถวข้อมูลในตาราง
    let row = findMatchingStudentRowInDoc(doc, task);
    if (!row) {
      return {
        success: false,
        verifiedGrade: '-',
        message: `ไม่พบรายการใน SGS (รหัส ${task.stuId} วิชา ${task.subjCode})`
      };
    }

    row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const cellsBefore = row.querySelectorAll('td.ttc');
    const sgsOldGrade = cleanStr(cellsBefore[7] ? cellsBefore[7].innerText : '');
    const currentDisplayedGrade = cleanStr(cellsBefore[8] ? cellsBefore[8].innerText : '');

    // 3. เลือกช่องกรอกตามผลการเรียนเดิม (มส -> RepeatGr, อื่นๆ -> ReGr)
    const isMs = cleanStr(task.oldGrade) === 'มส' || sgsOldGrade === 'มส';
    const inputSelector = isMs
      ? 'input[id*="RepeatGr"], input[name*="RepeatGr"]'
      : 'input[id*="ReGr"], input[name*="ReGr"]';
    const boxTypeName = isMs ? 'เรียนซ้ำ (RepeatGr)' : 'แก้ตัว (ReGr)';

    const gradeInput = row.querySelector(inputSelector);

    if (!gradeInput || gradeInput.disabled || gradeInput.readOnly) {
      // ถ้ารีเช็คพบว่าคอลัมน์ที่ 8 (Grade) มีเกรดใหม่ตรงอยู่แล้ว ถือว่าสำเร็จ
      if (gradesMatch(currentDisplayedGrade, task.newGrade)) {
        if (cellsBefore[8]) {
          cellsBefore[8].style.backgroundColor = '#86efac';
          cellsBefore[8].style.border = '2px solid #16a34a';
        }
        return {
          success: true,
          verifiedGrade: currentDisplayedGrade,
          message: `มีเกรด ${currentDisplayedGrade} ในระบบ SGS อยู่แล้ว (รีเช็คตรง 100%)`
        };
      }
      return {
        success: false,
        verifiedGrade: currentDisplayedGrade || '-',
        message: `ไม่พบช่องกรอก ${boxTypeName} หรือช่องถูกล็อก (ผลเดิมใน SGS: ${sgsOldGrade || '-'})`
      };
    }

    // 4. กรอกผลการเรียนใหม่
    task.statusMessage = `กำลังกรอกเกรด ${task.newGrade} ลงช่อง ${boxTypeName}...`;
    renderQueueTable();
    setLiveStatus(`✏️ [${idx + 1}/${syncQueue.length}] กรอกเกรด ${task.newGrade} ให้ ${task.stuName} (${task.subjCode})...`, '#4f46e5');

    gradeInput.style.backgroundColor = '#fef08a';
    gradeInput.style.border = '2px solid #ca8a04';
    gradeInput.focus();
    gradeInput.value = cleanStr(task.newGrade);
    gradeInput.dispatchEvent(new Event('input', { bubbles: true }));
    gradeInput.dispatchEvent(new Event('change', { bubbles: true }));
    gradeInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', code: 'Tab', keyCode: 9, bubbles: true }));
    gradeInput.blur();

    await sleep(250);

    // 5. กดปุ่มบันทึก (#ctl00_PageContent_TblTranscriptsSaveButton)
    task.statusMessage = `กำลังกดบันทึกและรอรีเช็ค...`;
    renderQueueTable();
    setLiveStatus(`💾 [${idx + 1}/${syncQueue.length}] กำลังบันทึกข้อมูลของ ${task.stuName}...`, '#0284c7');

    const saveBtn = doc.getElementById('ctl00_PageContent_TblTranscriptsSaveButton') ||
                    doc.querySelector('input[id*="SaveButton"], input[name*="SaveButton"]');
    if (!saveBtn) {
      return {
        success: false,
        verifiedGrade: currentDisplayedGrade || '-',
        message: 'ไม่พบปุ่มบันทึก (#ctl00_PageContent_TblTranscriptsSaveButton)'
      };
    }

    // ทำเครื่องหมายตารางเดิมและดักจับการโหลดหน้าใหม่ของ iframe หลังกดปุ่มบันทึก
    const oldSaveMarker = doc.getElementById('ctl00_PageContent_TblTranscriptsToggleAll') || doc.querySelector('.tre table');
    if (oldSaveMarker) oldSaveMarker.setAttribute('data-nsgs-stale', '1');
    try { win.submitcount = 0; } catch (e) {}

    let frameReloaded = false;
    const onLoadHandler = () => { frameReloaded = true; };
    iframe.addEventListener('load', onLoadHandler, { once: true });

    saveBtn.click();

    // รอให้หน้าเว็บเริ่มและจบการโหลดหลังกด Save
    const waitSaveStart = Date.now();
    while (Date.now() - waitSaveStart < 10000) {
      await sleep(150);
      if (frameReloaded) break;
      try {
        const curDoc = iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document);
        const curMarker = curDoc && (curDoc.getElementById('ctl00_PageContent_TblTranscriptsToggleAll') || curDoc.querySelector('.tre table'));
        if (curMarker && curMarker.getAttribute('data-nsgs-stale') !== '1') {
          break;
        }
      } catch (e) {}
    }
    await sleep(250);
    ({ win, doc } = await waitForWorkerReady(iframe));
    await sleep(200);

    // 6. รีเช็คความถูกต้อง (Verification) จากคอลัมน์ที่ 8 (td.ttc:eq(8))
    task.statusMessage = `กำลังรีเช็คค่าในตาราง (คอลัมน์ที่ 8)...`;
    renderQueueTable();
    setLiveStatus(`🔍 [${idx + 1}/${syncQueue.length}] กำลังรีเช็คความถูกต้องของเกรดในตาราง SGS...`, '#7c3aed');

    let verifyRow = findMatchingStudentRowInDoc(doc, task);
    if (!verifyRow) {
      // กรณีหลังกด Save แล้วตารางรีเซ็ต ให้ค้นหาซ้ำเพื่อดึงแถวกลับมารีเช็คให้เห็นชัดๆ
      ({ win, doc } = await performSgsSearch(iframe, task));
      verifyRow = findMatchingStudentRowInDoc(doc, task);
    }

    if (!verifyRow) {
      return {
        success: false,
        verifiedGrade: '-',
        message: 'รีเช็คไม่ผ่าน: ไม่พบแถวนักเรียนหลังกดบันทึก'
      };
    }

    verifyRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const verifyCells = verifyRow.querySelectorAll('td.ttc');
    // td.ttc:eq(8) คือคอลัมน์ Grade ตามโครงสร้างตารางของ SGS
    const verifiedGrade = cleanStr(verifyCells[8] ? verifyCells[8].innerText : '');

    if (gradesMatch(verifiedGrade, task.newGrade)) {
      if (verifyCells[8]) {
        verifyCells[8].style.backgroundColor = '#86efac';
        verifyCells[8].style.fontWeight = '900';
        verifyCells[8].style.border = '2px solid #16a34a';
      }
      return {
        success: true,
        verifiedGrade: verifiedGrade,
        message: `สำเร็จ (รีเช็คช่อง 8 ตรงเป๊ะ: ${verifiedGrade})`
      };
    } else {
      if (verifyCells[8]) {
        verifyCells[8].style.backgroundColor = '#fca5a5';
        verifyCells[8].style.fontWeight = '900';
        verifyCells[8].style.border = '2px solid #dc2626';
      }
      return {
        success: false,
        verifiedGrade: verifiedGrade || '(ว่าง)',
        message: `รีเช็คไม่ผ่าน: ช่องที่ 8 แสดง "${verifiedGrade || 'ว่าง'}" (ต้องการ "${task.newGrade}")${lastAlertMsg ? ' [Alert: ' + lastAlertMsg + ']' : ''}`
      };
    }
  }

  // ลูปทำงานอัตโนมัติทีละคนจนครบคิว
  async function startAutoSyncLoop() {
    if (isSyncRunning) return;

    const pendingItems = syncQueue.filter(x => x.selected && x.syncStatus !== 'success');
    if (pendingItems.length === 0) {
      alert('ไม่มีรายการที่เลือกไว้สำหรับซิงค์ (หรือซิงค์สำเร็จครบหมดแล้ว)');
      return;
    }

    const iframe = document.getElementById('nsgs-worker-frame');
    if (!iframe) return;

    isSyncRunning = true;
    stopRequested = false;

    const btnStart = document.getElementById('nsgs-btn-start');
    const btnStop = document.getElementById('nsgs-btn-stop');
    const btnReload = document.getElementById('nsgs-btn-reload');
    if (btnStart) btnStart.style.display = 'none';
    if (btnStop) btnStop.style.display = 'flex';
    if (btnReload) btnReload.disabled = true;

    let doneSuccess = 0;
    let doneError = 0;
    const pendingSheetUpdates = [];

    for (let i = 0; i < syncQueue.length; i++) {
      if (stopRequested) break;

      const task = syncQueue[i];
      if (!task.selected || task.syncStatus === 'success') continue;

      currentSyncIndex = i;
      task.syncStatus = 'running';
      renderQueueTable();

      const rowEl = document.getElementById(`nsgs-row-${i}`);
      if (rowEl) rowEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

      try {
        const result = await processSingleStudentTask(iframe, task, i);
        task.verifiedGrade = result.verifiedGrade;

        if (result.success) {
          task.syncStatus = 'success';
          task.selected = false;
          task.statusMessage = result.message + ' — กำลังบันทึกสถานะลงชีต...';
          doneSuccess++;
          renderQueueTable();

          // ส่งผลไปอัปเดตสถานะเป็น 'ซิงค์แล้ว' และบันทึกลง SGS_Log แบบพื้นหลัง (ไม่ต้องรอก่อนข้ามไปคนถัดไป)
          const p = callGasApi('update-sgs-sync', {
            rowId: task.rowId,
            specialId: task.specialId,
            stuId: task.stuId,
            stuName: task.stuName,
            gradeRoom: task.gradeRoom,
            subjCode: task.subjCode,
            subjName: task.subjName,
            year: task.year,
            term: task.term,
            oldGrade: task.oldGrade,
            newGrade: task.newGrade,
            verifiedGrade: result.verifiedGrade,
            success: true,
            status: 'สำเร็จ',
            message: result.message
          }, 'POST').then((res) => {
            if (res && (res.success || res.status === 'success')) {
              task.sheetUpdated = true;
              task.statusMessage = result.message + ' (อัปเดตชีต "ซิงค์แล้ว" ✅)';
            } else {
              task.sheetUpdated = false;
              task.sheetError = (res && res.message) || 'Apps Script ยังไม่เปิด V.107';
              task.statusMessage = result.message + ' (⚠️ บันทึกชีตไม่สำเร็จ: ' + task.sheetError + ')';
            }
            renderQueueTable();
          }).catch((err) => {
            task.sheetUpdated = false;
            task.sheetError = err.message;
            task.statusMessage = result.message + ' (⚠️ บันทึกชีตไม่สำเร็จ: ' + err.message + ')';
            renderQueueTable();
          });
          pendingSheetUpdates.push(p);
        } else {
          task.syncStatus = 'error';
          task.statusMessage = result.message;
          doneError++;

          // บันทึกสาเหตุความผิดพลาดลง SGS_Log แบบพื้นหลัง
          const p = callGasApi('update-sgs-sync', {
            rowId: task.rowId,
            specialId: task.specialId,
            stuId: task.stuId,
            stuName: task.stuName,
            gradeRoom: task.gradeRoom,
            subjCode: task.subjCode,
            subjName: task.subjName,
            year: task.year,
            term: task.term,
            oldGrade: task.oldGrade,
            newGrade: task.newGrade,
            verifiedGrade: result.verifiedGrade,
            success: false,
            status: 'ผิดพลาด',
            message: result.message
          }, 'POST').then(() => {
            task.sheetUpdated = true;
          }).catch((err) => {
            task.sheetUpdated = false;
            task.sheetError = err.message;
          });
          pendingSheetUpdates.push(p);
        }
      } catch (err) {
        task.syncStatus = 'error';
        task.statusMessage = err.message || 'เกิดข้อผิดพลาดระหว่างทำงาน';
        doneError++;

        if (String(err.message || '').includes('SESSION_EXPIRED')) {
          renderQueueTable();
          updateSummaryCounts();
          alert('⚠️ เซสชันการล็อกอิน SGS หมดอายุ!\nกรุณาล็อกอินเข้าสู่ระบบ SGS ในหน้าจอด้านล่าง แล้วกด "▶ เริ่มซิงค์ + รีเช็คอัตโนมัติ" เพื่อทำต่อได้เลยครับ');
          break;
        }
      }

      renderQueueTable();
      updateSummaryCounts();
      await sleep(150);
    }

    if (pendingSheetUpdates.length > 0) {
      setLiveStatus(`⏳ กำลังรอบันทึกสถานะลง Google Sheets ให้ครบทุกแถว...`, '#2563eb');
      await Promise.allSettled(pendingSheetUpdates);
    }

    isSyncRunning = false;
    currentSyncIndex = -1;
    if (btnStart) btnStart.style.display = 'flex';
    if (btnStop) btnStop.style.display = 'none';
    if (btnReload) btnReload.disabled = false;

    const failedSheetTasks = syncQueue.filter(t => t.syncStatus === 'success' && t.sheetUpdated === false);
    if (failedSheetTasks.length > 0) {
      showGasDeployNotice(failedSheetTasks.length, failedSheetTasks[0].sheetError || '');
      setLiveStatus(`⚠️ ใน SGS บันทึกสำเร็จแล้ว แต่ยังไม่ได้บันทึกลง Google Sheets ${failedSheetTasks.length} รายการ (เนื่องจาก Apps Script ยังไม่ได้เลือก V.107)`, '#dc2626');
    } else {
      hideGasDeployNotice();
      if (stopRequested) {
        setLiveStatus(`⏸ หยุดพักแล้ว (สำเร็จ ${doneSuccess} รายการ, ผิดพลาด ${doneError} รายการ)`, '#b45309');
      } else {
        setLiveStatus(`🎉 เสร็จสิ้นรอบการทำงาน! สำเร็จ ${doneSuccess} รายการ | ผิดพลาด ${doneError} รายการ`, doneError > 0 ? '#b45309' : '#059669');
      }
    }

    // เด้งหน้าต่างสรุปผลสำหรับส่งกลุ่ม LINE ทันทีเมื่อซิงค์เสร็จ (ถ้ามีรายการสำเร็จหรือผิดพลาด)
    if (!stopRequested && (doneSuccess > 0 || doneError > 0)) {
      setTimeout(() => {
        showLineSummaryModal();
      }, 500);
    }
  }

  // รองรับการกดเปิดหน้าต่างจาก Popup ของส่วนขยายแอดมิน
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      if (msg && msg.action === 'OPEN_SGS_GRADE_SYNC_MODAL') {
        openNextSgsGradeSyncModal();
        sendResponse({ ok: true });
      }
    });
  }

  // เริ่มต้นสร้างปุ่มลอยเมื่อโหลดหน้าเสร็จ
  function initOnLoad() {
    createFloatingSyncLauncher();
    if (window.__NEXTSGS_BOOKMARKLET__) {
      openNextSgsGradeSyncModal();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initOnLoad);
  } else {
    initOnLoad();
  }
})();
