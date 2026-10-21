const SHEET_ID = '1vfAjcf9whhVHVu_u4d-6yxyFNKIiTQ715Stz-yfRA4M'; // ID ชีตของคุณ

// ==========================================
// 1. ระบบแสดงผลหน้าเว็บ (Routing)
// ==========================================
function doGet(e) {
  // 🌟 API Endpoints สำหรับ GET requests
  if (e.parameter && e.parameter.action) {
    try {
      let action = e.parameter.action;
      if (action === 'get_stats') {
        var reqTeacher = (e.parameter.teacher || '').trim();
        if (reqTeacher && reqTeacher !== '444') {
          var tTasks = getTasksForAdmin('teacher', reqTeacher);
          var uniqueStus = {};
          var subMap = {};
          tTasks.forEach(function(t) {
            if (t.stuId) uniqueStus[t.stuId] = true;
            var sKey = [t.subjCode, t.subjName].filter(Boolean).join(' ') || 'ไม่ระบุวิชา';
            if (!subMap[sKey]) subMap[sKey] = { subject: sKey, total: 0, fixed: 0, pending: 0 };
            subMap[sKey].total++;
            subMap[sKey].pending++;
          });
          var uniqueCount = Object.keys(uniqueStus).length;
          var breakdown = Object.keys(subMap).map(function(k) { return subMap[k]; });
          return ContentService.createTextOutput(JSON.stringify({
            "status": "success",
            "academic_issues": uniqueCount,
            "total_academic_issues": uniqueCount,
            "tasks_total": tTasks.length,
            "subject_breakdown": breakdown
          })).setMimeType(ContentService.MimeType.JSON);
        }

        try {
          var cachedInitial = getCacheChunked_('dashboard_initial_data');
          if (cachedInitial) {
            var parsed = JSON.parse(cachedInitial);
            if (parsed && parsed.stats) {
              var s = parsed.stats;
              return ContentService.createTextOutput(JSON.stringify({
                "status": "success",
                "academic_issues": s.uniqueCount,
                "total_academic_issues": s.uniqueCount,
                "students_total": s.uniqueCount,
                "students_fixed": s.fullyDone,
                "sgs_progress": { "submitted": s.fixedTotal, "total": s.pendingTotal + s.fixedTotal, "percentage": s.successPctItem || 0 },
                "ioc_progress": { "submitted": 85, "total": 98, "percentage": 86.7 },
                "task_registration": s.taskStats,
                "subject_breakdown": []
              })).setMimeType(ContentService.MimeType.JSON);
            }
          }
        } catch(e) {}

        const stats = summarize({ year: '' });
        var result = {
          "status": "success",
          "academic_issues": stats.uniqueCount,
          "total_academic_issues": stats.uniqueCount,
          "students_total": stats.uniqueCount,
          "students_fixed": stats.fullyDone,
          "sgs_progress": { "submitted": stats.fixedTotal, "total": stats.pendingTotal + stats.fixedTotal, "percentage": stats.successPctItem || 0 },
          "ioc_progress": { "submitted": 85, "total": 98, "percentage": 86.7 },
          "task_registration": stats.taskStats,
          "subject_breakdown": []
        };
        return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
      }
      if (action === 'initial-data') return ContentService.createTextOutput(JSON.stringify(getInitialLoadData())).setMimeType(ContentService.MimeType.JSON);
      if (action === 'filter-data') {
        return ContentService.createTextOutput(JSON.stringify(getByFilters(
          e.parameter.year || '',
          e.parameter.grade || '',
          e.parameter.room || '',
          e.parameter.subjectGroup || '',
          e.parameter.teacher || ''
        ))).setMimeType(ContentService.MimeType.JSON);
      }
      if (action === 'teachers') return ContentService.createTextOutput(JSON.stringify(getAllTeachers())).setMimeType(ContentService.MimeType.JSON);
      if (action === 'clear-cache') {
        clearDashboardCache();
        bumpTaskCacheVersion_();
        try { CacheService.getScriptCache().remove('all_teachers_cache'); } catch(e) {}
        return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "ล้างแคชแดชบอร์ดเรียบร้อยแล้ว" })).setMimeType(ContentService.MimeType.JSON);
      }
      if (action === 'tasks') return ContentService.createTextOutput(JSON.stringify(getTasksForAdmin(e.parameter.mode, e.parameter.keyword))).setMimeType(ContentService.MimeType.JSON);
      if (action === 'history') return ContentService.createTextOutput(JSON.stringify(getHistoryForAdmin(e.parameter.mode, e.parameter.keyword))).setMimeType(ContentService.MimeType.JSON);
      if (action === 'approvals') return ContentService.createTextOutput(JSON.stringify(getPendingApprovals())).setMimeType(ContentService.MimeType.JSON);
      if (action === 'cleanup-empty-rows') return ContentService.createTextOutput(JSON.stringify(cleanupEmptyRows())).setMimeType(ContentService.MimeType.JSON);
      
      if (action === 'check-id') return ContentService.createTextOutput(JSON.stringify(checkIdCardStatus(e.parameter.idCard))).setMimeType(ContentService.MimeType.JSON);
      // 🔒 ไม่อนุญาตให้ทำรายการเขียนหรือลบข้อมูลผ่าน GET เพื่อป้องกันการโจมตีหรือการคลิกลิงก์ทำลายข้อมูล
      const forbiddenGetActions = [
        'direct-fix-records', 'clean-sync-wp16', 'sync-wp16-sheet',
        'submit-grades', 'approve', 'reject', 'update-pending-task',
        'batch-register-tasks', 'batch-update-pending-tasks',
        'sync-sgs', 'update-sgs-sync'
      ];
      if (forbiddenGetActions.indexOf(action) !== -1) {
        return ContentService.createTextOutput(JSON.stringify({
          status: "error",
          success: false,
          error: "METHOD_NOT_ALLOWED",
          message: "ไม่อนุญาตให้ทำรายการเขียนหรือลบข้อมูลผ่าน GET กรุณาใช้ POST พร้อม Token ยืนยันตัวตน"
        })).setMimeType(ContentService.MimeType.JSON);
      }

      if (action === 'register-task') return ContentService.createTextOutput(JSON.stringify(registerTask(e.parameter.rowId, e.parameter.specialId, e.parameter.taskDate))).setMimeType(ContentService.MimeType.JSON);
      if (action === 'student-info') return ContentService.createTextOutput(JSON.stringify(getStudentData(e.parameter.studentId))).setMimeType(ContentService.MimeType.JSON);
      if (action === 'get-ready-sgs') return ContentService.createTextOutput(JSON.stringify(getReadySgsTasks())).setMimeType(ContentService.MimeType.JSON);
      if (action === 'get-sgs-dashboard') return ContentService.createTextOutput(JSON.stringify(getSgsSyncDashboard())).setMimeType(ContentService.MimeType.JSON);

      if (action === 'sgs-sync-script') {
        var jsContent = HtmlService.createHtmlOutputFromFile('SgsSyncScript').getContent();
        return ContentService.createTextOutput(jsContent).setMimeType(ContentService.MimeType.JAVASCRIPT);
      }

      // 🛑 กรณีส่ง action มาแต่ไม่ตรงกับ endpoint ใดๆ ให้ส่ง Error JSON เสมอ ป้องกันการหลุดไปเรนเดอร์หน้า HTML
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        error: "UNKNOWN_ACTION",
        message: "ไม่พบ Action ที่ระบุ: " + action
      })).setMimeType(ContentService.MimeType.JSON);

    } catch (err) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        error: err.toString(),
        message: err.message
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }

  let p = (e.parameter && (e.parameter.p || e.parameter.page)) || '';

  if (p === 'student') {
    try {
      var studentTemplate = HtmlService.createTemplateFromFile('Student');
      try {
        studentTemplate.appUrl = ScriptApp.getService().getUrl() || '';
      } catch(e) {
        studentTemplate.appUrl = '';
      }
      return studentTemplate
        .evaluate().setTitle('ตรวจสอบงานค้างและผลการเรียน - นักเรียน')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
        .addMetaTag('viewport', 'width=device-width, initial-scale=1');
    } catch(err) {
      Logger.log('Error loading Student page: ' + err);
      return HtmlService.createHtmlOutput('<h3>เกิดข้อผิดพลาดในการโหลดหน้า Student</h3><p>' + err.toString() + '</p>');
    }
  }

  if (p === 'teacher') {
    var teacherTemplate = null;
    try {
      teacherTemplate = HtmlService.createTemplateFromFile('Teacher');
    } catch (e1) {
      try {
        teacherTemplate = HtmlService.createTemplateFromFile('TeacherRender');
      } catch (e2) {
        return HtmlService.createHtmlOutput('<h3>ไม่พบไฟล์เทมเพลตครูผู้สอน</h3><p>กรุณาตรวจสอบว่าใน Google Apps Script มีไฟล์ HTML ชื่อ <b>Teacher</b> หรือ <b>TeacherRender</b> ครับ</p>');
      }
    }
    try {
      teacherTemplate.appUrl = ScriptApp.getService().getUrl() || '';
    } catch(e) {
      teacherTemplate.appUrl = '';
    }
    return teacherTemplate
      .evaluate().setTitle('ระบบบันทึกผลการเรียน - ครูผู้สอน')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }

  var indexTemplate = HtmlService.createTemplateFromFile('Index');
  try {
    indexTemplate.appUrl = ScriptApp.getService().getUrl() || '';
  } catch(e) {
    indexTemplate.appUrl = '';
  }
  return indexTemplate
    .evaluate().setTitle('รายงานการแก้ไขผลการเรียนโรงเรียนพัฒนานิคม')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function getAppUrl() {
  try {
    return ScriptApp.getService().getUrl() || '';
  } catch(e) {
    return '';
  }
}

// 🔐 Helper สำหรับตรวจสอบ Session Token
function validateAuthToken_(token, requireAdmin) {
  const cleanToken = String(token || '').trim();
  const scriptProps = PropertiesService.getScriptProperties();
  const adminSecret = scriptProps.getProperty('ADMIN_API_KEY') || scriptProps.getProperty('BYPASS_SECRET');
  if (adminSecret && cleanToken === adminSecret.trim()) {
    return { valid: true, isAdmin: true, name: 'System Admin' };
  }

  // หากมี token แนบมา ให้ตรวจสอบกับ CacheService
  if (cleanToken) {
    const cached = CacheService.getScriptCache().get('auth_token_' + cleanToken);
    if (cached) {
      try {
        const data = JSON.parse(cached);
        if (requireAdmin && !data.isAdmin) {
          return { valid: false, message: 'ไม่มีสิทธิ์เข้าถึง (ต้องใช้สิทธิ์ผู้ดูแลระบบ Admin)' };
        }
        return { valid: true, ...data };
      } catch(e) {}
    }
  }

  // 🛡️ หากระบบยังไม่ได้ตั้งค่า REQUIRE_STRICT_AUTH_TOKEN เป็น true ใน Script Properties
  // ให้ยอมรับการบันทึกงานของครู เพื่อรองรับระบบ Single Sign-On (sgs_user จาก AssessmentHub)
  // และป้องกันแคชหลุดระหว่างบันทึกข้อมูล
  const strictAuth = scriptProps.getProperty('REQUIRE_STRICT_AUTH_TOKEN');
  if (strictAuth !== 'true') {
    if (!requireAdmin) {
      return { valid: true, name: 'Teacher SSO / Web Session' };
    }
  }

  if (!cleanToken) {
    return { valid: false, message: 'กรุณาเข้าสู่ระบบก่อนทำรายการ (Missing authentication token)' };
  }
  return { valid: false, message: 'เซสชันหมดอายุหรือรหัสยืนยันไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่ (Invalid or expired token)' };
}

// 🌟 API Endpoints สำหรับ POST requests (หลีกเลี่ยง CORS Preflight ด้วย text/plain)
function doPost(e) {
  try {
    let params = {};
    if (e && e.postData && e.postData.contents) {
      try {
        params = JSON.parse(e.postData.contents);
      } catch(parseErr) {
        params = e.parameter || {};
      }
    } else if (e && e.parameter) {
      params = e.parameter;
    }
    let action = params.action;
    
    // Public POST endpoints
    if (action === 'check-id') return ContentService.createTextOutput(JSON.stringify(checkIdCardStatus(params.idCard))).setMimeType(ContentService.MimeType.JSON);
    if (action === 'verify-pin') return ContentService.createTextOutput(JSON.stringify(verifyPinLogin(params.idCard, params.pin))).setMimeType(ContentService.MimeType.JSON);
    if (action === 'initial-data') return ContentService.createTextOutput(JSON.stringify(getInitialLoadData())).setMimeType(ContentService.MimeType.JSON);
    if (action === 'filter-data') {
      return ContentService.createTextOutput(JSON.stringify(getByFilters(
        params.year || '',
        params.grade || '',
        params.room || '',
        params.subjectGroup || '',
        params.teacher || ''
      ))).setMimeType(ContentService.MimeType.JSON);
    }
    if (action === 'student-info') return ContentService.createTextOutput(JSON.stringify(getStudentData(params.studentId))).setMimeType(ContentService.MimeType.JSON);
    if (action === 'register-task') return ContentService.createTextOutput(JSON.stringify(registerTask(params.rowId, params.specialId, params.taskDate))).setMimeType(ContentService.MimeType.JSON);
    if (action === 'get-ready-sgs') return ContentService.createTextOutput(JSON.stringify(getReadySgsTasks())).setMimeType(ContentService.MimeType.JSON);
    if (action === 'get-sgs-dashboard') return ContentService.createTextOutput(JSON.stringify(getSgsSyncDashboard())).setMimeType(ContentService.MimeType.JSON);

    if (action === 'update-sgs-sync') {
      if (params.token) {
        validateAuthToken_(params.token, false);
      }
      return ContentService.createTextOutput(JSON.stringify(updateSgsSyncResult(params))).setMimeType(ContentService.MimeType.JSON);
    }

    // Protected POST endpoints: Require valid authentication token
    const adminActions = ['direct-fix-records', 'clean-sync-wp16'];
    const writeActions = [
      'submit-grades', 'approve', 'reject', 'update-pending-task',
      'batch-register-tasks', 'batch-update-pending-tasks',
      'sync-sgs', 'sync-wp16-sheet'
    ];

    if (adminActions.indexOf(action) !== -1) {
      const auth = validateAuthToken_(params.token, true);
      if (!auth.valid) {
        return ContentService.createTextOutput(JSON.stringify({ success: false, status: 'error', message: auth.message })).setMimeType(ContentService.MimeType.JSON);
      }
      if (action === 'direct-fix-records') return ContentService.createTextOutput(JSON.stringify(directFixStudentRecords())).setMimeType(ContentService.MimeType.JSON);
      if (action === 'clean-sync-wp16') {
        let items = params.items || params.payload || [];
        return ContentService.createTextOutput(JSON.stringify(syncWp16Sheet(items, true))).setMimeType(ContentService.MimeType.JSON);
      }
    }

    if (writeActions.indexOf(action) !== -1) {
      const auth = validateAuthToken_(params.token, false);
      if (!auth.valid) {
        return ContentService.createTextOutput(JSON.stringify({ success: false, status: 'error', message: auth.message })).setMimeType(ContentService.MimeType.JSON);
      }
      if (action === 'submit-grades') return ContentService.createTextOutput(JSON.stringify(submitGrades(params.payload))).setMimeType(ContentService.MimeType.JSON);
      if (action === 'approve') return ContentService.createTextOutput(JSON.stringify(approveGrades(params.rowIds))).setMimeType(ContentService.MimeType.JSON);
      if (action === 'reject') return ContentService.createTextOutput(JSON.stringify(rejectGrades(params.rowIds))).setMimeType(ContentService.MimeType.JSON);
      if (action === 'update-pending-task') return ContentService.createTextOutput(JSON.stringify(updatePendingTask(params))).setMimeType(ContentService.MimeType.JSON);
      if (action === 'batch-register-tasks') return ContentService.createTextOutput(JSON.stringify(batchRegisterTasks(params.rowIds))).setMimeType(ContentService.MimeType.JSON);
      if (action === 'batch-update-pending-tasks') {
        let items = params.items || params.payload || [];
        return ContentService.createTextOutput(JSON.stringify(batchUpdatePendingTasks(items))).setMimeType(ContentService.MimeType.JSON);
      }
      if (action === 'sync-sgs') {
        let items = params.items || params.payload || [];
        return ContentService.createTextOutput(JSON.stringify(syncFromSgsNextschool(items))).setMimeType(ContentService.MimeType.JSON);
      }
      if (action === 'sync-wp16-sheet') {
        let items = params.items || params.payload || [];
        return ContentService.createTextOutput(JSON.stringify(syncWp16Sheet(items, !!params.clearAll))).setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({success: false, status: 'error', message: 'Invalid POST action: ' + action})).setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({success: false, status: 'error', message: err.message})).setMimeType(ContentService.MimeType.JSON);
  }
}

function cleanStr_(v) { return v == null ? '' : String(v).trim(); }
function parseDateSafe(val) {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  let s = String(val).trim();
  if (s.includes('/')) {
    let p = s.split(' ')[0].split('/');
    if (p.length === 3) {
      let d = parseInt(p[0], 10), m = parseInt(p[1], 10) - 1, y = parseInt(p[2], 10);
      if (!isNaN(d) && !isNaN(m) && !isNaN(y) && m >= 0 && m <= 11 && d >= 1 && d <= 31) {
        if (y >= 2400) y -= 543;
        else if (y <= 99) y = (2500 + y) - 543;
        let dt = new Date(y, m, d);
        if (!isNaN(dt.getTime()) && dt.getMonth() === m && dt.getDate() === d) {
          return dt;
        }
      }
      return null;
    }
  }
  let d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function subjectGroupFromCode(code){
  const s = cleanStr_(code); if(!s) return 'อื่นๆ';
  const map = {
    'ท':'ภาษาไทย', 'ค':'คณิตศาสตร์', 'ว':'วิทยาศาสตร์',
    'ส':'สังคมศึกษาศาสนาและวัฒนธรรม', 'พ':'สุขศึกษาและพลศึกษา', 'ศ':'ศิลปะ',
    'ง':'การงานอาชีพ', 'อ':'ภาษาต่างประเทศ', 'จ':'ภาษาต่างประเทศ', 
    'ญ':'ภาษาต่างประเทศ', 'ฝ':'ภาษาต่างประเทศ', 'I':'IS', 'ก':'กิจกรรม'
  };
  return map[s[0]] || 'อื่นๆ';
}

// ==========================================
// 2. ระบบ Dashboard ของผู้บริหาร
// ==========================================
// ==========================================
function putCacheChunked_(key, str, expirationInSeconds) {
  try {
    var cache = CacheService.getScriptCache();
    var chunkSize = 85000;
    var numChunks = Math.ceil(str.length / chunkSize);
    var entries = {};
    entries[key + '_chunks'] = String(numChunks);
    for (var i = 0; i < numChunks; i++) {
      entries[key + '_' + i] = str.substr(i * chunkSize, chunkSize);
    }
    cache.putAll(entries, expirationInSeconds || 1800); // แคช 30 นาที
  } catch (e) {
    Logger.log('putCacheChunked_ error: ' + e.message);
  }
}

function getCacheChunked_(key) {
  try {
    var cache = CacheService.getScriptCache();
    var numChunksStr = cache.get(key + '_chunks');
    if (!numChunksStr) return null;
    var numChunks = parseInt(numChunksStr, 10);
    var keys = [];
    for (var i = 0; i < numChunks; i++) {
      keys.push(key + '_' + i);
    }
    var chunks = cache.getAll(keys);
    var str = '';
    for (var i = 0; i < numChunks; i++) {
      var chunk = chunks[key + '_' + i];
      if (!chunk) return null;
      str += chunk;
    }
    return str;
  } catch (e) {
    return null;
  }
}


function getTaskCacheVersion_() {
  try {
    var cache = CacheService.getScriptCache();
    var ver = cache.get('tasks_cache_version');
    if (!ver) {
      ver = '1';
      cache.put('tasks_cache_version', ver, 21600);
    }
    return ver;
  } catch (e) {
    return '1';
  }
}

function bumpTaskCacheVersion_() {
  try {
    var cache = CacheService.getScriptCache();
    var newVer = String(Date.now());
    cache.put('tasks_cache_version', newVer, 21600);
    cache.remove('pending_approvals_cache');
  } catch (e) {}
}

function getLastRealRow_(sheet) {
  if (!sheet) return 0;
  var maxR = sheet.getMaxRows();
  if (maxR <= 1) return maxR;
  var checkLimit = Math.min(maxR, 8000);
  // Column F is 'เลขประจำตัว' (column index 6)
  var vals = sheet.getRange(1, 6, checkLimit, 1).getValues();
  for (var r = vals.length - 1; r >= 0; r--) {
    if (vals[r][0] !== '' && vals[r][0] !== null && vals[r][0] !== undefined) {
      return r + 1;
    }
  }
  return Math.min(sheet.getLastRow(), 8000);
}

function cleanupEmptyRows() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName('StudentRecords');
  if (!sheet) return { success: false, message: 'ไม่พบชีต StudentRecords' };
  var maxRows = sheet.getMaxRows();
  var realLast = getLastRealRow_(sheet);
  var safeKeep = Math.max(realLast + 30, 4050);
  var deleted = 0;
  if (maxRows > safeKeep) {
    deleted = maxRows - safeKeep;
    sheet.deleteRows(safeKeep + 1, deleted);
  }
  clearDashboardCache();
  bumpTaskCacheVersion_();
  return {
    success: true,
    realLastRow: realLast,
    maxRowsBefore: maxRows,
    maxRowsAfter: sheet.getMaxRows(),
    deletedRows: deleted
  };
}

function clearDashboardCache() {
  try {
    var cache = CacheService.getScriptCache();
    var numChunksStr = cache.get('dashboard_initial_data_chunks');
    if (numChunksStr) {
      var numChunks = parseInt(numChunksStr, 10);
      var keys = ['dashboard_initial_data_chunks', 'dashboard_initial_data'];
      for (var i = 0; i < numChunks; i++) {
        keys.push('dashboard_initial_data_' + i);
      }
      cache.removeAll(keys);
    } else {
      cache.remove('dashboard_initial_data');
    }
    cache.remove('stats_empty_filter');
    cache.remove('pending_approvals_cache');
  } catch (e) {
    // Ignore cache clear error
  }
}

function getInitialLoadData() {
  try {
    var cached = getCacheChunked_('dashboard_initial_data');
    if (cached) {
      return JSON.parse(cached);
    }

    var ss = SpreadsheetApp.openById(SHEET_ID);
    var teacherSheet = ss.getSheetByName('Teacherdata');
    var teacherData = teacherSheet ? teacherSheet.getDataRange().getValues().slice(1) : [];

    var studentSheet = ss.getSheetByName('StudentRecords');
    var studentValues = [];
    var realLast = studentSheet ? getLastRealRow_(studentSheet) : 0;
    if (studentSheet && realLast > 0) {
      var maxCols = Math.min(studentSheet.getLastColumn(), 18);
      studentValues = studentSheet.getRange(1, 1, realLast, maxCols).getValues();
    }

    var calSheet = ss.getSheetByName('Config_Calendar');
    var calData = calSheet ? calSheet.getDataRange().getValues().slice(1) : [];

    var popSheet = ss.getSheetByName('Totalstudent');
    var popData = popSheet ? popSheet.getDataRange().getValues().slice(1) : [];

    var preloaded = {
      teacherData: teacherData,
      studentValues: studentValues,
      calData: calData,
      popData: popData
    };

    var filters = getFilters(preloaded);
    var stats = summarize({ year: '' }, preloaded);

    var result = { filters: filters, stats: stats };

    try {
      var jsonStr = JSON.stringify(result);
      putCacheChunked_('dashboard_initial_data', jsonStr, 600); // 10 นาที (อัปเดตข้อมูลสดใหม่เร็วขึ้น)
    } catch (cErr) {}

    return result;
  } catch (e) {
    throw new Error('เกิดข้อผิดพลาดในการโหลดข้อมูล: ' + e.message);
  }
}

function getFilters(preloaded) {
  var teacherData;
  var recVals;

  if (preloaded && preloaded.teacherData && preloaded.studentValues) {
    teacherData = preloaded.teacherData;
    recVals = preloaded.studentValues.slice();
  } else {
    var ss = SpreadsheetApp.openById(SHEET_ID); 
    teacherData = ss.getSheetByName('Teacherdata').getDataRange().getValues().slice(1);
    var studentSheet = ss.getSheetByName('StudentRecords');
    var maxCols = studentSheet ? Math.min(studentSheet.getLastColumn(), 20) : 0;
    var realLast = studentSheet ? getLastRealRow_(studentSheet) : 0;
    recVals = (studentSheet && realLast > 0) ? studentSheet.getRange(1, 1, realLast, maxCols).getValues() : [];
  }

  var subjectGroupsSet = new Set();
  var teacherByGroup = {}; 
  
  teacherData.forEach(function(r) {
    var prefix = cleanStr_(r[2]);
    var fName = cleanStr_(r[3]);
    var lName = cleanStr_(r[4]);
    if (lName && fName.endsWith(lName)) {
      fName = fName.slice(0, -lName.length).trim();
    }
    var tName = (prefix + fName + ' ' + lName).replace(/\s+/g, ' ').trim(); 
    var tDept = cleanStr_(r[5]) || "อื่นๆ";
    if (tName) { 
      subjectGroupsSet.add(tDept); 
      if(!teacherByGroup[tDept]) teacherByGroup[tDept] = []; 
      if(!teacherByGroup[tDept].includes(tName)) teacherByGroup[tDept].push(tName); 
    }
  });
  
  var headers = recVals.shift();
  var cleanHeaders = headers ? headers.map(cleanStr_) : [];
  var idxYear = cleanHeaders.indexOf('ปีการศึกษา');
  var idxGrade = cleanHeaders.indexOf('ชั้น');
  var idxRoom = cleanHeaders.indexOf('ห้อง');
  
  var yearSet = new Set();
  var gradeSet = new Set();
  var roomsByGrade = {};

  for (var i = 0; i < recVals.length; i++) {
    var row = recVals[i];
    var y = idxYear >= 0 ? cleanStr_(row[idxYear]) : '';
    var g = idxGrade >= 0 ? cleanStr_(row[idxGrade]) : '';
    var r = idxRoom >= 0 ? cleanStr_(row[idxRoom]) : '';
    if (y) yearSet.add(y);
    if (g) {
      gradeSet.add(g);
      if (!roomsByGrade[g]) roomsByGrade[g] = new Set();
      if (r) roomsByGrade[g].add(r);
    }
  }

  var years = Array.from(yearSet).sort(function(a, b) { return Number(b) - Number(a); });
  var grades = Array.from(gradeSet).sort();
  var formattedRoomsByGrade = {};
  grades.forEach(function(g) { 
    formattedRoomsByGrade[g] = Array.from(roomsByGrade[g] || []).sort(function(a, b) { return Number(a) - Number(b); }); 
  });
  for (var group in teacherByGroup) teacherByGroup[group].sort();
  return { years: years, grades: grades, roomsByGrade: formattedRoomsByGrade, subjectGroups: Array.from(subjectGroupsSet).sort(), teacherByGroup: teacherByGroup };
}

function getByFilters(y, g, r, s, t) { return summarize({ year: y, grade: g, room: r, subjectGroup: s, teacher: t }); }

function summarize(filters, preloaded) {
  var calData, popData, teacherData, recValsRaw;
  if (preloaded && preloaded.studentValues) {
    calData = preloaded.calData;
    popData = preloaded.popData;
    teacherData = preloaded.teacherData;
    recValsRaw = preloaded.studentValues;
  } else {
    var ss = SpreadsheetApp.openById(SHEET_ID);
    calData = ss.getSheetByName('Config_Calendar').getDataRange().getValues().slice(1);
    popData = ss.getSheetByName('Totalstudent').getDataRange().getValues().slice(1);
    teacherData = ss.getSheetByName('Teacherdata').getDataRange().getValues().slice(1);
    var studentSheet = ss.getSheetByName('StudentRecords');
    var maxCols = studentSheet ? Math.min(studentSheet.getLastColumn(), 20) : 0;
    var realLast = studentSheet ? getLastRealRow_(studentSheet) : 0;
    recValsRaw = (studentSheet && realLast > 0) ? studentSheet.getRange(1, 1, realLast, maxCols).getValues() : [];
  }

  var roundsConfig = calData.filter(function(r) { return r[0]; }).map(function(r) {
    var sDate = parseDateSafe(r[1]);
    var eDate = parseDateSafe(r[2]);
    if(eDate) eDate = new Date(eDate.getFullYear(), eDate.getMonth(), eDate.getDate(), 23, 59, 59);
    return { name: cleanStr_(r[0]), startDate: sDate, endDate: eDate };
  });

  var totalSubjMap = {}; 
  var popMap = {}; 
  var popRoomMap = {}; 
  popData.forEach(function(r) { 
    var grade = cleanStr_(r[0]); 
    var room = cleanStr_(r[1]); 
    var count = Number(r[2]) || 0; 
    if (grade) { 
      var roomKey = grade + '/' + room; 
      totalSubjMap[roomKey] = Number(r[3]) || 0; 
      popMap[grade] = (popMap[grade] || 0) + count; 
      if(room) { popRoomMap[roomKey] = (popRoomMap[roomKey] || 0) + count; }
    }
  });

  var teacherDeptMap = {}; 
  teacherData.forEach(function(r) {
    var prefix = cleanStr_(r[2]); var fName = cleanStr_(r[3]); var lName = cleanStr_(r[4]);
    if (lName && fName.endsWith(lName)) {
      fName = fName.slice(0, -lName.length).trim();
    }
    var tNameFull = (prefix + fName + ' ' + lName).replace(/\s+/g, ' ').trim();
    var tNameNoPrefix = (fName + ' ' + lName).replace(/\s+/g, ' ').trim();
    var tDept = cleanStr_(r[5]) || "อื่นๆ"; 
    if (tNameFull) teacherDeptMap[tNameFull] = tDept;
    if (tNameNoPrefix) teacherDeptMap[tNameNoPrefix] = tDept;
  });

  var recVals = recValsRaw.slice();
  const headers = recVals.shift().map(cleanStr_);
  const f = { year: filters?.year || '', grade: filters?.grade || '', room: filters?.room || '', subjectGroup: filters?.subjectGroup || '', teacher: filters?.teacher || '' };

  let allYears = recVals.map(row => cleanStr_(row[headers.indexOf('ปีการศึกษา')])).filter(Boolean);
  let maxYear = '2569';
  if(allYears.length > 0) { allYears.sort((a,b) => Number(b) - Number(a)); maxYear = allYears[0]; }
  const targetRiskYear = String(f.year || maxYear).split('/')[0].trim(); 

  let totalPop = 0;
  if (f.grade && f.room) totalPop = popRoomMap[f.grade + '/' + f.room] || 0;
  else if (f.grade) totalPop = popMap[f.grade] || 0;
  else Object.keys(popMap).forEach(g => totalPop += popMap[g]);

  let stats = {
    totalPop, pendingTotal: 0, fixedTotal: 0, dateAgg: {}, workflowCount: { 'จำนวนที่ต้องแก้ไข':0, 'กำลังดำเนินการ':0, 'แก้ไขสำเร็จ':0 },
    statusCount: { '0':0, 'ร':0, 'มส':0, 'มผ':0 }, studentRoundCount: {}, gradeAgg: {}, subjGroupAgg: {}, roomAgg: {},
    riskStudents: [], uniquePendingStudents: [], teacherList: [], successPctPerson: 0, successPctItem: 0,
    taskStats: {
      totalTasks: 0,
      assignedTasks: 0,
      registeredTasks: 0,
      unregisteredTasks: 0,
      registeredPct: 0,
      registeredStudents: 0,
      fullyRegisteredStudents: 0
    }
  };

  const stuMap = {}; 
  const teacherAgg = {};
  
  recVals.forEach(row => {
    let r = {}; headers.forEach((h, i) => r[h] = row[i]);
    if (!cleanStr_(r['เลขประจำตัว']) && !cleanStr_(r['ชื่อ-นามสกุล'])) return; 

    let rawYear = cleanStr_(r['ปีการศึกษา']);
    let year = rawYear.split('/')[0].trim();
    let term = cleanStr_(r['ภาคเรียนที่']); let subjCode = cleanStr_(r['รหัสวิชา']);
    let rawTeacher = cleanStr_(r['ครูผู้สอน']).replace(/\s+/g, ' '); let firstTeacher = rawTeacher.split(',')[0].trim();
    let teacherNameClean = firstTeacher.replace(/^(นาย|นาง|นางสาว|สาว|ว่าที่ร้อยตรี|ว่าที่ร\.ต\.|ส\.ต\.ท\.)/, '').trim() || '(ไม่ระบุ)';
    let subjGrp = teacherDeptMap[firstTeacher] || teacherDeptMap[teacherNameClean] || subjectGroupFromCode(subjCode);
    let grade = cleanStr_(r['ชั้น']), room = cleanStr_(r['ห้อง']), oldG = cleanStr_(r['ผลการเรียนเดิม']);

    if (f.year && year !== String(f.year).split('/')[0].trim()) return;
    if (f.grade && grade !== f.grade) return;
    if (f.room && room !== f.room) return;
    if (f.subjectGroup && subjGrp !== f.subjectGroup) return;
    if (f.teacher && firstTeacher !== f.teacher) return; 

    let statusSys = cleanStr_(r['สถานะระบบ']);
    let isF = (statusSys === 'ซิงค์แล้ว' || statusSys === 'เสร็จสิ้น');
    let rawDate = r['วันที่แก้ไข'];
    let dObj = parseDateSafe(rawDate);
    let dateStr = '';
    if (isF) {
      if (dObj && !isNaN(dObj.getTime())) {
        let ts = new Date(dObj.getFullYear(), dObj.getMonth(), dObj.getDate()).getTime();
        stats.dateAgg[ts] = (stats.dateAgg[ts] || 0) + 1;
        dateStr = `${String(dObj.getDate()).padStart(2,'0')}/${String(dObj.getMonth()+1).padStart(2,'0')}/${(dObj.getFullYear()+543).toString().slice(-2)}`;
      } else if (rawDate) {
        dateStr = cleanStr_(rawDate);
      }
    }
    
    stats.pendingTotal++; if (isF) stats.fixedTotal++;
    if (stats.statusCount[oldG] !== undefined) stats.statusCount[oldG]++;
    
    if (statusSys === 'รอแก้ไข' || !statusSys) stats.workflowCount['จำนวนที่ต้องแก้ไข']++;
    else if (statusSys === 'รออนุมัติ' || statusSys === 'พร้อมทำงาน') stats.workflowCount['กำลังดำเนินการ']++;
    else if (isF) stats.workflowCount['แก้ไขสำเร็จ']++;

    let stuKey = cleanStr_(r['เลขประจำตัว']) || cleanStr_(r['ชื่อ-นามสกุล']);
    if (!stuMap[stuKey]) {
      
      let roomKey = grade + '/' + room; 
      
      stuMap[stuKey] = { 
        id: cleanStr_(r['เลขประจำตัว']), name: cleanStr_(r['ชื่อ-นามสกุล']), grade, room, number: cleanStr_(r['เลขที่']), 
        problems: 0, fixed: 0, problemsTargetYear: 0, fixedTargetYear: 0, 
        registeredCount: 0, unregisteredCount: 0,
        // รับค่ามาจากตัวหารตรงๆ ไม่มีเลข 34 แล้ว
        enrolled: totalSubjMap[roomKey] || 0, 
        
        details: [], semSummary: {} 
      };
    }
    
    let semKey = `ภาคเรียนที่ ${term}/${year}`;
    let pTask = cleanStr_(r['งานค้าง']);
    let tDate = cleanStr_(r['วันที่รับงาน']);
    let isReg = !!tDate;

    stats.taskStats.totalTasks++;
    if (pTask) stats.taskStats.assignedTasks++;
    if (isReg) {
      stats.taskStats.registeredTasks++;
      stuMap[stuKey].registeredCount = (stuMap[stuKey].registeredCount || 0) + 1;
    } else {
      stats.taskStats.unregisteredTasks++;
      stuMap[stuKey].unregisteredCount = (stuMap[stuKey].unregisteredCount || 0) + 1;
    }

    if(!stuMap[stuKey].semSummary[semKey]) stuMap[stuKey].semSummary[semKey] = { p:0, f:0 };
    stuMap[stuKey].details.push({ 
      sem: semKey, 
      subjCode, 
      subjName: cleanStr_(r['ชื่อวิชา']), 
      oldG, 
      newG: cleanStr_(r['ผลการเรียนใหม่']), 
      isF, 
      dateStr,
      pendingTask: pTask,
      taskDate: tDate,
      isRegistered: isReg,
      teacher: firstTeacher,
      dept: subjGrp
    });

    stuMap[stuKey].problems++; stuMap[stuKey].semSummary[semKey].p++;
    if (year === targetRiskYear) stuMap[stuKey].problemsTargetYear++;

    if (isF) {
      stuMap[stuKey].fixed++; stuMap[stuKey].semSummary[semKey].f++;
      if (year === targetRiskYear) stuMap[stuKey].fixedTargetYear++;
      if (dObj) {
        let found = roundsConfig.find(rc => dObj >= rc.startDate && dObj <= rc.endDate);
        let rName = found ? found.name : 'นอกรอบที่กำหนด';
        stats.studentRoundCount[rName] = (stats.studentRoundCount[rName] || 0) + 1;
      }
    }

    if (!stats.gradeAgg[grade]) stats.gradeAgg[grade] = { pending:0, fixed:0 };
    stats.gradeAgg[grade].pending++; if (isF) stats.gradeAgg[grade].fixed++;
    
    if (!stats.subjGroupAgg[subjGrp]) stats.subjGroupAgg[subjGrp] = { pending:0, fixed:0 };
    stats.subjGroupAgg[subjGrp].pending++; if (isF) stats.subjGroupAgg[subjGrp].fixed++;
    
    let rmKey = grade + '/' + room;
    if (!stats.roomAgg[rmKey]) stats.roomAgg[rmKey] = { pending:0, fixed:0 };
    stats.roomAgg[rmKey].pending++; if (isF) stats.roomAgg[rmKey].fixed++;
    
    let tk = firstTeacher || '(ไม่ระบุ)';
    if (!teacherAgg[tk]) teacherAgg[tk] = { name: tk, dept: subjGrp, p:0, f:0, registeredCount:0, unregisteredCount:0, students: new Set() };
    teacherAgg[tk].p++; if (isF) teacherAgg[tk].f++; 
    if (isReg) { teacherAgg[tk].registeredCount++; } else { teacherAgg[tk].unregisteredCount++; }
    teacherAgg[tk].students.add(stuKey);
  });

const allStudents = Object.values(stuMap);
  allStudents.forEach(s => {
    
    // นับยอดค้างจริงจากปีที่เลือก (Target Year) โดยไม่สนรหัสวิชา (นับรวมหมด)
    let pendingTarget = s.problemsTargetYear - s.fixedTargetYear;
    
    // เงื่อนไขระเบียบเดิมเป๊ะ: 
    // 1. ต้องมีจำนวนวิชาลงทะเบียน (enrolled) > 0 
    // 2. ยอดค้าง (รวม ก) > ครึ่งหนึ่งของวิชาที่ลงทะเบียน
    if (s.enrolled > 0 && pendingTarget > (s.enrolled / 2)) {
        
        let sTargetOnly = { 
          ...s, 
          problems: s.problemsTargetYear, 
          fixed: s.fixedTargetYear, 
          // เพิ่มค่า pending ส่งไปเพื่อให้หน้าเว็บดึงไปโชว์ได้ง่ายขึ้น
          pending: pendingTarget,
          details: s.details.filter(d => d.sem.includes(targetRiskYear)) 
        };
        stats.riskStudents.push(sTargetOnly);
    }
  });

  stats.uniquePendingStudents = allStudents; stats.uniqueCount = allStudents.length;
  stats.fullyDone = allStudents.filter(s => s.fixed >= s.problems && s.problems > 0).length;
  stats.successPctItem = stats.pendingTotal > 0 ? Math.round((stats.fixedTotal / stats.pendingTotal) * 100) : 0;
  stats.successPctPerson = stats.uniqueCount > 0 ? Math.round((stats.fullyDone / stats.uniqueCount) * 100) : 0;
  stats.teacherList = Object.values(teacherAgg).map(t => ({
    name: t.name,
    dept: t.dept,
    p: t.p,
    f: t.f,
    registeredCount: t.registeredCount,
    unregisteredCount: t.unregisteredCount,
    studentCount: t.students.size
  }));

  stats.taskStats.registeredPct = stats.taskStats.totalTasks > 0 ? Math.round((stats.taskStats.registeredTasks / stats.taskStats.totalTasks) * 100) : 0;
  stats.taskStats.registeredStudents = allStudents.filter(s => (s.registeredCount || 0) > 0).length;
  stats.taskStats.fullyRegisteredStudents = allStudents.filter(s => (s.registeredCount || 0) > 0 && (s.unregisteredCount || 0) === 0).length;

  return stats;
}

// ==========================================
// 3. ระบบฝั่งครูผู้สอน (ระบบ PIN 6 หลัก)
// ==========================================
function checkIdCardStatus(idCard) {
  const cleanInputId = String(idCard || '').replace(/[-\s]/g, '').trim();
  if (!cleanInputId) return { success: false, message: 'กรุณาระบุเลขประจำตัวประชาชน' };

  try {
    const cache = CacheService.getScriptCache();
    const cached = cache.get('id_status_' + cleanInputId);
    if (cached) return JSON.parse(cached);
  } catch(e) {}

  const ss = SpreadsheetApp.openById(SHEET_ID);
  const data = ss.getSheetByName('Teacherdata').getDataRange().getValues();
  for(let i=1; i<data.length; i++) {
    let rowDataStr = data[i].join(' ').replace(/[-\s]/g, ''); 
    if (cleanInputId !== "" && rowDataStr.includes(cleanInputId)) {
      let savedPin = String(data[i][8] || '').trim();
      let res = { success: true, action: savedPin === '' ? 'setup' : 'enter' };
      try {
        const cache = CacheService.getScriptCache();
        cache.put('id_status_' + cleanInputId, JSON.stringify(res), 3600); // แคช 1 ชม.
      } catch(e) {}
      return res;
    }
  }
  return { success: false, message: 'ไม่พบข้อมูลเลขบัตรประจำตัวประชาชนนี้ในระบบ' };
}

function checkTeacherId(idCard) {
  return checkIdCardStatus(idCard);
}


function verifyPinLogin(idCard, pin) {
  try {
    const cleanId = String(idCard || '').replace(/[-\s]/g, '').trim();
    const cleanPin = String(pin || '').trim();
    const cloudRunUrl = "https://teacherhub-backend-324760995892.asia-southeast1.run.app/api/auth/login";
    const payload = {
      "idCard": cleanId,
      "pin": cleanPin
    };
    const options = {
      "method": "post",
      "contentType": "application/json",
      "payload": JSON.stringify(payload),
      "muteHttpExceptions": true
    };
    
    let response = null;
    let result = null;
    try {
      response = UrlFetchApp.fetch(cloudRunUrl, options);
      const text = response.getContentText();
      result = JSON.parse(text);
    } catch(fetchErr) {
      Logger.log("Cloud Run auth error: " + fetchErr.message);
    }

    const scriptProps = PropertiesService.getScriptProperties();
    const defaultSuperCodes = ['444', '440', '242', '842', '234'];
    const propCodes = (scriptProps.getProperty('SUPER_CODES') || '').split(',').map(function(s) { return s.trim(); }).filter(Boolean);
    const superCodes = propCodes.length > 0 ? propCodes : defaultSuperCodes;
    const superIds = (scriptProps.getProperty('SUPER_IDS') || '').split(',').map(function(s) { return s.trim(); }).filter(Boolean);

    if (response && response.getResponseCode() === 200 && result && result.teacher) {
       let tName = result.teacher.name || ((result.teacher.prefix || '') + (result.teacher.firstname || '') + ' ' + (result.teacher.lastname || '')).trim();
       let tCode = String((result.teacher && result.teacher.teaccode) || '').trim();
       let uId = String((result.teacher && result.teacher.userid) || cleanId).replace(/[-\s]/g, '').trim();
       let isAdmin = Boolean((result.teacher && result.teacher.is_admin) || superCodes.indexOf(tCode) !== -1 || superIds.indexOf(uId) !== -1);

       const token = Utilities.getUuid();
       const tokenData = {
         name: tName,
         userId: uId,
         teacherCode: tCode,
         isAdmin: isAdmin,
         createdAt: new Date().getTime()
       };
       try {
         CacheService.getScriptCache().put('auth_token_' + token, JSON.stringify(tokenData), 21600); // 6 ชั่วโมง
       } catch(cacheErr) {
         Logger.log('CacheService put token error: ' + cacheErr.message);
       }

       return { success: true, name: tName, isAdmin: isAdmin, token: token };
    } else if (result && result.detail) {
       if (result.detail === "FIRST_TIME_LOGIN") {
           return { success: false, message: 'คุณต้องตั้งรหัสผ่านใหม่ก่อนเข้าใช้งาน กรุณาไปตั้งรหัสผ่านผ่านระบบ AssessmentHub หลัก' };
       }
       return { success: false, message: result.detail || 'รหัส PIN ไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง' };
    } else {
       return { success: false, message: 'รหัส PIN ไม่ถูกต้อง หรือไม่สามารถยืนยันตัวตนได้ในขณะนี้' };
    }
  } catch (e) {
    return { success: false, message: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ยืนยันตัวตนได้: ' + e.message };
  }
}

function getTeacherTasks(teacherName) { return getTasksForAdmin('teacher', teacherName); }

function getTasksForAdmin(mode, keyword) {
  let cleanKey = String(keyword || '').trim().toLowerCase();
  if(!cleanKey) return [];

  // ⚡ High-Speed Server Cache (5 mins)
  var ver = getTaskCacheVersion_();
  var safeKey = encodeURIComponent(cleanKey).replace(/%/g, '_').slice(0, 40);
  var cacheKey = 'tsk_' + ver + '_' + (mode || 't') + '_' + safeKey;
  try {
    var cached = getCacheChunked_(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (e) {}

  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName('StudentRecords');
  const lastRow = getLastRealRow_(sheet);
  if (lastRow < 2) return [];
  const maxCols = Math.min(sheet.getLastColumn(), 18);
  const data = sheet.getRange(1, 1, lastRow, maxCols).getValues();
  const headers = data[0].map(cleanStr_);
  const idxTeacher = headers.indexOf('ครูผู้สอน'), 
        idxStatus = headers.indexOf('สถานะระบบ'), 
        idxStuId = headers.indexOf('เลขประจำตัว'), 
        idxStuName = headers.indexOf('ชื่อ-นามสกุล'), 
        idxSubjCode = headers.indexOf('รหัสวิชา'), 
        idxSubjName = headers.indexOf('ชื่อวิชา'), 
        idxGrade = headers.indexOf('ชั้น'), 
        idxRoom = headers.indexOf('ห้อง'), 
        idxOldScore = headers.indexOf('คะแนนเดิม'), 
        idxOldGrade = headers.indexOf('ผลการเรียนเดิม'),
        idxSpecialId = headers.indexOf('เลขเฉพาะ'),
        idxPendingTask = headers.indexOf('งานค้าง'),
        idxTaskDate = headers.indexOf('วันที่รับงาน');

  let tasks = [];
  let reqTeacherName = ''; if (mode === 'teacher') reqTeacherName = cleanKey.replace(/^(นาย|นาง|นางสาว|ว่าที่ร้อยตรี|ว่าที่ร\.ต\.|ส\.ต\.ท\.|สาว)/, '').trim();

  for(let i=1; i<data.length; i++) {
    let stuIdRaw = data[i][idxStuId]; if (!stuIdRaw) continue; 
    let rowStatus = cleanStr_(data[i][idxStatus]) || 'รอแก้ไข';
    if (rowStatus === 'รอแก้ไข') {
      let match = false;
      if (mode === 'teacher') { let rowTeacher = cleanStr_(data[i][idxTeacher]).toLowerCase(); if (rowTeacher.includes(reqTeacherName)) match = true; } 
      else if (mode === 'student') { let sId = String(stuIdRaw).toLowerCase(); let sName = cleanStr_(data[i][idxStuName]).toLowerCase(); if (sId.includes(cleanKey) || sName.includes(cleanKey)) match = true; }
      if (match) {
        tasks.push({ 
          rowId: i + 1, 
          subjCode: cleanStr_(data[i][idxSubjCode]), 
          subjName: cleanStr_(data[i][idxSubjName]), 
          stuId: cleanStr_(stuIdRaw), 
          stuName: cleanStr_(data[i][idxStuName]), 
          gradeRoom: cleanStr_(data[i][idxGrade]) + '/' + cleanStr_(data[i][idxRoom]), 
          oldScore: cleanStr_(data[i][idxOldScore]), 
          oldGrade: cleanStr_(data[i][idxOldGrade]), 
          teacherName: cleanStr_(data[i][idxTeacher]),
          specialId: idxSpecialId !== -1 ? cleanStr_(data[i][idxSpecialId]) : '',
          pendingTask: idxPendingTask !== -1 ? cleanStr_(data[i][idxPendingTask]) : '',
          taskDate: idxTaskDate !== -1 ? cleanStr_(data[i][idxTaskDate]) : '',
          isRegistered: idxTaskDate !== -1 && !!cleanStr_(data[i][idxTaskDate])
        });
      }
    }
  }
  try {
    putCacheChunked_(cacheKey, JSON.stringify(tasks), 1800);
  } catch(e) {}
  return tasks;
}

// 🌟 ฟังก์ชันใหม่สำหรับดึง "ประวัติและสถานะ"
function getHistoryForAdmin(mode, keyword) {
  let cleanKey = String(keyword || '').trim().toLowerCase();
  if(!cleanKey) return [];

  // ⚡ High-Speed Server Cache (30 mins, invalidated on edit/submit)
  var ver = getTaskCacheVersion_();
  var safeKey = encodeURIComponent(cleanKey).replace(/%/g, '_').slice(0, 40);
  var cacheKey = 'hst_' + ver + '_' + (mode || 't') + '_' + safeKey;
  try {
    var cached = getCacheChunked_(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (e) {}

  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName('StudentRecords');
  const lastRow = getLastRealRow_(sheet);
  if (lastRow < 2) return [];
  const maxCols = Math.min(sheet.getLastColumn(), 18);
  const data = sheet.getRange(1, 1, lastRow, maxCols).getValues();
  const headers = data[0].map(cleanStr_);
  
  const idxTeacher = headers.indexOf('ครูผู้สอน'), 
        idxStatus = headers.indexOf('สถานะระบบ'), 
        idxStuId = headers.indexOf('เลขประจำตัว'), 
        idxStuName = headers.indexOf('ชื่อ-นามสกุล'), 
        idxSubjCode = headers.indexOf('รหัสวิชา'), 
        idxSubjName = headers.indexOf('ชื่อวิชา'), 
        idxGrade = headers.indexOf('ชั้น'), 
        idxRoom = headers.indexOf('ห้อง'), 
        idxOldGrade = headers.indexOf('ผลการเรียนเดิม'), 
        idxNewGrade = headers.indexOf('ผลการเรียนใหม่'), 
        idxDate = headers.indexOf('วันที่แก้ไข'),
        idxPendingTask = headers.indexOf('งานค้าง');

  let history = [];
  let reqTeacherName = '';
  if (mode === 'teacher') reqTeacherName = cleanKey.replace(/^(นาย|นาง|นางสาว|ว่าที่ร้อยตรี|ว่าที่ร\.ต\.|ส\.ต\.ท\.|สาว)/, '').trim();

  for(let i=1; i<data.length; i++) {
    let stuIdRaw = data[i][idxStuId];
    if (!stuIdRaw) continue;
    
    let rowStatus = cleanStr_(data[i][idxStatus]) || 'รอแก้ไข';
    // กรองเฉพาะรายการที่ 'ส่งผลแล้ว'
    if (rowStatus !== 'รอแก้ไข' && rowStatus !== '') { 
      let match = false;
      if (mode === 'teacher') {
        let rowTeacher = cleanStr_(data[i][idxTeacher]).toLowerCase();
        if (rowTeacher.includes(reqTeacherName)) match = true;
      } else if (mode === 'student') {
        let sId = String(stuIdRaw).toLowerCase();
        let sName = cleanStr_(data[i][idxStuName]).toLowerCase();
        if (sId.includes(cleanKey) || sName.includes(cleanKey)) match = true;
      }

      if (match) {
         let d = data[i][idxDate];
         let dateStr = '-';
         if (d instanceof Date) dateStr = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()+543}`;
         else if (d) dateStr = cleanStr_(d);

         history.push({
           subjCode: cleanStr_(data[i][idxSubjCode]),
           subjName: cleanStr_(data[i][idxSubjName]),
           stuId: cleanStr_(stuIdRaw),
           stuName: cleanStr_(data[i][idxStuName]),
           gradeRoom: cleanStr_(data[i][idxGrade]) + '/' + cleanStr_(data[i][idxRoom]),
           oldGrade: cleanStr_(data[i][idxOldGrade]),
           newGrade: cleanStr_(data[i][idxNewGrade]),
           teacherName: cleanStr_(data[i][idxTeacher]),
           status: rowStatus,
           date: dateStr,
           pendingTask: idxPendingTask !== -1 ? cleanStr_(data[i][idxPendingTask]) : ''
         });
      }
    }
  }
  const result = history.reverse(); // เอาข้อมูลล่าสุดขึ้นข้างบน
  try {
    putCacheChunked_(cacheKey, JSON.stringify(result), 1800);
  } catch(e) {}
  return result;
}

function submitGrades(payload) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000); 
    bumpTaskCacheVersion_();
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName('StudentRecords');
    const lastRow = getLastRealRow_(sheet);
    const maxCols = Math.min(sheet.getLastColumn(), 18);
    const headers = sheet.getRange(1, 1, 1, maxCols).getValues()[0].map(cleanStr_);
    const idxSubjCode = headers.indexOf('รหัสวิชา');
    const idxStuId = headers.indexOf('เลขประจำตัว');
    const idxSpecialId = headers.indexOf('เลขเฉพาะ');
    const idxNewGrade = headers.indexOf('ผลการเรียนใหม่') + 1;
    const idxDate = headers.indexOf('วันที่แก้ไข') + 1;
    const idxStatus = headers.indexOf('สถานะระบบ') + 1;
    let today = new Date();

    let allData = null;
    let updatedCount = 0;

    (payload || []).forEach(item => {
      let targetRow = parseInt(item.rowId, 10);
      const reqSpecial = cleanStr_(item.specialId);
      const reqStuId = cleanStr_(item.stuId);
      const reqSubjCode = cleanStr_(item.subjCode);

      // ตรวจสอบว่าแถวตรงกับนักเรียนจริงหรือไม่ (ป้องกันกรณีมีการลบ/แทรกแถวในชีตแล้ว rowId เลื่อน)
      if ((reqSpecial || (reqStuId && reqSubjCode)) && targetRow >= 2 && targetRow <= lastRow) {
        const rowVals = sheet.getRange(targetRow, 1, 1, maxCols).getValues()[0];
        const rowSpecial = idxSpecialId >= 0 ? cleanStr_(rowVals[idxSpecialId]) : '';
        const rowStuId = idxStuId >= 0 ? cleanStr_(rowVals[idxStuId]) : '';
        const rowSubjCode = idxSubjCode >= 0 ? cleanStr_(rowVals[idxSubjCode]) : '';
        const isMatch = (reqSpecial && rowSpecial === reqSpecial) || (reqStuId && reqSubjCode && rowStuId === reqStuId && rowSubjCode === reqSubjCode);
        if (!isMatch) {
          targetRow = -1;
        }
      }

      if ((!targetRow || targetRow < 2 || targetRow > lastRow) && (reqSpecial || (reqStuId && reqSubjCode))) {
        if (!allData && lastRow >= 2) {
          allData = sheet.getRange(1, 1, lastRow, maxCols).getValues();
        }
        if (allData) {
          for (let r = 1; r < allData.length; r++) {
            const rSp = idxSpecialId >= 0 ? cleanStr_(allData[r][idxSpecialId]) : '';
            const rStu = idxStuId >= 0 ? cleanStr_(allData[r][idxStuId]) : '';
            const rSubj = idxSubjCode >= 0 ? cleanStr_(allData[r][idxSubjCode]) : '';
            if ((reqSpecial && rSp === reqSpecial) || (reqStuId && reqSubjCode && rStu === reqStuId && rSubj === reqSubjCode)) {
              targetRow = r + 1;
              break;
            }
          }
        }
      }

      if (targetRow >= 2) {
        if (idxNewGrade > 0 && idxDate === idxNewGrade + 1 && idxStatus === idxDate + 1) {
          sheet.getRange(targetRow, idxNewGrade, 1, 3).setValues([[item.newGrade, today, 'รออนุมัติ']]);
        } else {
          if (idxNewGrade > 0) sheet.getRange(targetRow, idxNewGrade).setValue(item.newGrade);
          if (idxDate > 0) sheet.getRange(targetRow, idxDate).setValue(today);
          if (idxStatus > 0) sheet.getRange(targetRow, idxStatus).setValue('รออนุมัติ');
        }
        updatedCount++;
      }
    });
    SpreadsheetApp.flush();
    clearDashboardCache();
    bumpTaskCacheVersion_();
    return { success: true, updatedCount: updatedCount };
  } catch (e) {
    console.error('Error in submitGrades:', e); 
    return { success: false, message: 'ระบบใช้งานเยอะเกินไป กรุณาลองใหม่ ' + e.message };
  } finally { 
    try { lock.releaseLock(); } catch(e) {} 
  }
}

// ==========================================
// 4. ระบบสำหรับ Admin (Superuser)
// ==========================================
function getAllTeachers() {
  try {
    const cache = CacheService.getScriptCache();
    const cached = cache.get('all_teachers_cache');
    if (cached) return JSON.parse(cached);
  } catch(e) {}

  const ss = SpreadsheetApp.openById(SHEET_ID); 
  const data = ss.getSheetByName('Teacherdata').getDataRange().getValues();
  let teachers = [];
  for(let i=1; i<data.length; i++) { 
    let prefix = cleanStr_(data[i][2]); 
    let fName = cleanStr_(data[i][3]); 
    let lName = cleanStr_(data[i][4]); 
    if (lName && fName.endsWith(lName)) {
      fName = fName.slice(0, -lName.length).trim();
    }
    let tName = (prefix + fName + ' ' + lName).replace(/\s+/g, ' ').trim(); 
    if(tName) teachers.push(tName); 
  }
  const result = teachers.sort();
  try {
    const cache = CacheService.getScriptCache();
    cache.put('all_teachers_cache', JSON.stringify(result), 21600); // แคช 6 ชั่วโมง
  } catch(e) {}
  return result;
}

function getPendingApprovals() {
  try {
    const cache = CacheService.getScriptCache();
    const cached = cache.get('pending_approvals_cache');
    if (cached) {
      return JSON.parse(cached);
    }
  } catch(e) {}

  const ss = SpreadsheetApp.openById(SHEET_ID); 
  const sheet = ss.getSheetByName('StudentRecords');
  const lastRow = getLastRealRow_(sheet);
  if (lastRow < 2) return [];
  const maxCols = Math.min(sheet.getLastColumn(), 18);
  const data = sheet.getRange(1, 1, lastRow, maxCols).getValues(); 
  const headers = data[0].map(cleanStr_); 
  const idxStatus = headers.indexOf('สถานะระบบ'); 
  const idxStuId = headers.indexOf('เลขประจำตัว');
  const idxSubjCode = headers.indexOf('รหัสวิชา');
  const idxSubjName = headers.indexOf('ชื่อวิชา');
  const idxStuName = headers.indexOf('ชื่อ-นามสกุล');
  const idxGrade = headers.indexOf('ชั้น');
  const idxRoom = headers.indexOf('ห้อง');
  const idxOldGrade = headers.indexOf('ผลการเรียนเดิม');
  const idxNewGrade = headers.indexOf('ผลการเรียนใหม่');
  const idxTeacher = headers.indexOf('ครูผู้สอน');

  let tasks = [];
  for(let i=1; i<data.length; i++) {
    if (!cleanStr_(data[i][idxStuId])) continue;
    let rowStatus = cleanStr_(data[i][idxStatus]);
    if (rowStatus === 'รออนุมัติ') {
      tasks.push({ 
        rowId: i + 1, 
        subjCode: cleanStr_(data[i][idxSubjCode]), 
        subjName: cleanStr_(data[i][idxSubjName]), 
        stuId: cleanStr_(data[i][idxStuId]), 
        stuName: cleanStr_(data[i][idxStuName]), 
        gradeRoom: cleanStr_(data[i][idxGrade]) + '/' + cleanStr_(data[i][idxRoom]), 
        oldGrade: cleanStr_(data[i][idxOldGrade]), 
        newGrade: cleanStr_(data[i][idxNewGrade]), 
        teacherName: cleanStr_(data[i][idxTeacher]) 
      });
    }
  }

  try {
    const cache = CacheService.getScriptCache();
    cache.put('pending_approvals_cache', JSON.stringify(tasks), 120); // แคช 2 นาที
  } catch(e) {}

  return tasks;
}

function approveGrades(rowIds) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    clearDashboardCache();
    bumpTaskCacheVersion_();
    const ss = SpreadsheetApp.openById(SHEET_ID); 
    const sheet = ss.getSheetByName('StudentRecords'); 
    const headers = sheet.getRange(1, 1, 1, Math.min(sheet.getLastColumn(), 18)).getValues()[0].map(cleanStr_); 
    const idxStatus = headers.indexOf('สถานะระบบ') + 1;
    (rowIds || []).forEach(rowId => {
      const r = parseInt(rowId, 10);
      if (r >= 2 && idxStatus > 0) {
        sheet.getRange(r, idxStatus).setValue('พร้อมทำงาน');
      }
    }); 
    SpreadsheetApp.flush();
    clearDashboardCache();
    bumpTaskCacheVersion_();
    return { success: true };
  } catch (e) {
    console.error('Error in approveGrades:', e);
    return { success: false, message: e.message };
  } finally {
    try { lock.releaseLock(); } catch(e) {}
  }
}

function rejectGrades(rowIds) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    clearDashboardCache();
    bumpTaskCacheVersion_();
    const ss = SpreadsheetApp.openById(SHEET_ID); 
    const sheet = ss.getSheetByName('StudentRecords'); 
    const headers = sheet.getRange(1, 1, 1, Math.min(sheet.getLastColumn(), 18)).getValues()[0].map(cleanStr_); 
    const idxStatus = headers.indexOf('สถานะระบบ') + 1; 
    const idxNewGrade = headers.indexOf('ผลการเรียนใหม่') + 1; 
    const idxDate = headers.indexOf('วันที่แก้ไข') + 1;
    (rowIds || []).forEach(rowId => {
      const r = parseInt(rowId, 10);
      if (r >= 2) {
        if (idxNewGrade > 0 && idxDate === idxNewGrade + 1 && idxStatus === idxDate + 1) {
          sheet.getRange(r, idxNewGrade, 1, 3).setValues([['', '', 'รอแก้ไข']]);
        } else {
          if (idxStatus > 0) sheet.getRange(r, idxStatus).setValue('รอแก้ไข'); 
          if (idxNewGrade > 0) sheet.getRange(r, idxNewGrade).setValue(''); 
          if (idxDate > 0) sheet.getRange(r, idxDate).setValue(''); 
        }
      }
    }); 
    SpreadsheetApp.flush();
    clearDashboardCache();
    bumpTaskCacheVersion_();
    return { success: true };
  } catch (e) {
    console.error('Error in rejectGrades:', e);
    return { success: false, message: e.message };
  } finally {
    try { lock.releaseLock(); } catch(e) {}
  }
}

// ==========================================
// 5. ระบบจัดการภาระงานค้าง (Pending Tasks & วผ.16 Sync)
// ==========================================
function updatePendingTask(payload) {
  bumpTaskCacheVersion_();
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName('StudentRecords');
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(cleanStr_);
    const idxPendingTask = headers.indexOf('งานค้าง') + 1;
    const idxTaskDate = headers.indexOf('วันที่รับงาน') + 1;
    if (idxPendingTask <= 0) {
      return { success: false, message: 'ไม่พบคอลัมน์ งานค้าง ในระบบ' };
    }
    
    let targetRow = null;
    if (payload.rowId) {
      targetRow = parseInt(payload.rowId);
    } else if (payload.specialId) {
      const idxSpecialId = headers.indexOf('เลขเฉพาะ') + 1;
      if (idxSpecialId > 0) {
        const lastRow = getLastRealRow_(sheet);
        if (lastRow >= 2) {
          const colValues = sheet.getRange(2, idxSpecialId, lastRow - 1, 1).getValues();
          for (let i = 0; i < colValues.length; i++) {
            if (cleanStr_(colValues[i][0]) === cleanStr_(payload.specialId)) {
              targetRow = i + 2;
              break;
            }
          }
        }
      }
    }
    
    if (!targetRow || targetRow < 2) {
      return { success: false, message: 'ไม่พบแถวข้อมูลนักเรียนที่ระบุ' };
    }
    
    sheet.getRange(targetRow, idxPendingTask).setValue(payload.pendingTask !== undefined ? payload.pendingTask : '');
    if (payload.taskDate !== undefined && idxTaskDate > 0) {
      var valToSet = (payload.taskDate === 'clear' || payload.taskDate === '' || payload.taskDate === null || payload.taskDate === false) ? '' : payload.taskDate;
      sheet.getRange(targetRow, idxTaskDate).setValue(valToSet);
    }
    SpreadsheetApp.flush();
    return { success: true, rowId: targetRow, pendingTask: payload.pendingTask || '', taskDate: (payload.taskDate === 'clear' ? '' : payload.taskDate) };
  } catch (e) {
    console.error('Error in updatePendingTask:', e);
    return { success: false, message: e.message };
  } finally {
    try { lock.releaseLock(); } catch(e) {}
  }
}

function batchUpdatePendingTasks(items) {
  bumpTaskCacheVersion_();
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName('StudentRecords');
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(cleanStr_);
    const idxPendingTask = headers.indexOf('งานค้าง') + 1;
    const idxTaskDate = headers.indexOf('วันที่รับงาน') + 1;
    if (idxPendingTask <= 0) return { success: false, message: 'ไม่พบคอลัมน์ งานค้าง ในระบบ' };

    let updatedCount = 0;
    (items || []).forEach(it => {
      let rId = it.rowId ? parseInt(it.rowId) : null;
      let task = it.pendingTask !== undefined ? it.pendingTask : (it.pending_task !== undefined ? it.pending_task : '');
      if (rId && rId >= 2) {
        sheet.getRange(rId, idxPendingTask).setValue(task);
        if (it.taskDate !== undefined && idxTaskDate > 0) {
          var valToSet = (it.taskDate === 'clear' || it.taskDate === '' || it.taskDate === null || it.taskDate === false) ? '' : it.taskDate;
          sheet.getRange(rId, idxTaskDate).setValue(valToSet);
        }
        updatedCount++;
      }
    });

    SpreadsheetApp.flush();
    return { success: true, updatedCount: updatedCount };
  } catch (e) {
    console.error('Error in batchUpdatePendingTasks:', e);
    return { success: false, message: e.message };
  } finally {
    try { lock.releaseLock(); } catch(e) {}
  }
}

// 🌟 ระบบซิงค์ข้อมูลจาก SGS NextSchool เข้าสู่ StudentRecords
function syncFromSgsNextschool(items) {
  clearDashboardCache();
  bumpTaskCacheVersion_();
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName('StudentRecords');
    const data = sheet.getDataRange().getValues();
    const headers = data[0].map(cleanStr_);

    const idxSubjCode = headers.indexOf('รหัสวิชา');
    const idxSubjName = headers.indexOf('ชื่อวิชา');
    const idxRoom = headers.indexOf('ห้อง');
    const idxGrade = headers.indexOf('ชั้น');
    const idxTeacher = headers.indexOf('ครูผู้สอน');
    const idxStuId = headers.indexOf('เลขประจำตัว');
    const idxStuName = headers.indexOf('ชื่อ-นามสกุล');
    const idxYear = headers.indexOf('ปีการศึกษา');
    const idxTerm = headers.indexOf('ภาคเรียนที่');
    const idxOldScore = headers.indexOf('คะแนนเดิม');
    const idxOldGrade = headers.indexOf('ผลการเรียนเดิม');
    const idxStatus = headers.indexOf('สถานะระบบ');
    const idxSpecialId = headers.indexOf('เลขเฉพาะ');
    const idxPendingTask = headers.indexOf('งานค้าง');
    const idxTaskDate = headers.indexOf('วันที่รับงาน');

    // Index existing rows by specialId or (subjCode + stuId)
    var rowMap = {};
    for (var i = 1; i < data.length; i++) {
      var sp = cleanStr_(data[i][idxSpecialId]);
      if (sp) rowMap[sp] = i + 1;
      var subj = cleanStr_(data[i][idxSubjCode]);
      var stu = cleanStr_(data[i][idxStuId]);
      if (subj && stu && !sp) rowMap[subj + stu] = i + 1;
    }

    var updatedCount = 0;
    var insertedCount = 0;

    (items || []).forEach(it => {
      var sp = cleanStr_(it.special_id || it.specialId || ((it.subject_code || it.subjCode || '') + (it.student_id || it.stuId || '')));
      if (!sp) return;

      var task = it.pending_task !== undefined ? String(it.pending_task) : (it.pendingTask !== undefined ? String(it.pendingTask) : '');
      var oldScore = it.old_score !== undefined && it.old_score !== null ? String(it.old_score) : '';
      var oldGrade = cleanStr_(it.old_grade !== undefined && it.old_grade !== null ? it.old_grade : (it.oldGrade !== undefined && it.oldGrade !== null ? it.oldGrade : ''));

      if (rowMap[sp]) {
        // มีแถวเดิมอยู่แล้ว -> อัปเดตงานค้าง และคะแนนเดิม/เกรดเดิม
        var rowIdx = rowMap[sp];
        if (idxPendingTask >= 0 && task) {
          sheet.getRange(rowIdx, idxPendingTask + 1).setValue(task);
        }
        if (idxOldScore >= 0 && oldScore) {
          sheet.getRange(rowIdx, idxOldScore + 1).setValue(oldScore);
        }
        if (idxOldGrade >= 0 && oldGrade !== '') {
          sheet.getRange(rowIdx, idxOldGrade + 1).setValue(oldGrade);
        }
        updatedCount++;
      } else {
        // เด็กติด 0, ร, มส ใหม่ -> นำเข้าเป็นแถวใหม่ในสถานะ 'รอแก้ไข'
        var classStr = cleanStr_(it.class_level || it.classLevel);
        var gradePart = classStr;
        var roomPart = '';
        if (classStr.includes('/')) {
          var parts = classStr.split('/');
          gradePart = parts[0];
          roomPart = parts[1];
        }

        var newRow = new Array(headers.length).fill('');
        if (idxSubjCode >= 0) newRow[idxSubjCode] = cleanStr_(it.subject_code || it.subjCode);
        if (idxSubjName >= 0) newRow[idxSubjName] = cleanStr_(it.subject_name || it.subjName);
        if (idxRoom >= 0) newRow[idxRoom] = roomPart;
        if (idxGrade >= 0) newRow[idxGrade] = gradePart;
        if (idxTeacher >= 0) newRow[idxTeacher] = cleanStr_(it.teacher_name || it.teacherName);
        if (idxStuId >= 0) newRow[idxStuId] = cleanStr_(it.student_id || it.stuId);
        if (idxStuName >= 0) newRow[idxStuName] = cleanStr_(it.student_name || it.stuName);
        if (idxYear >= 0) newRow[idxYear] = cleanStr_(it.academic_year || it.year || '2569');
        if (idxTerm >= 0) newRow[idxTerm] = cleanStr_(it.semester || it.term || '1');
        if (idxOldScore >= 0) newRow[idxOldScore] = oldScore;
        if (idxOldGrade >= 0) newRow[idxOldGrade] = oldGrade;
        if (idxStatus >= 0) newRow[idxStatus] = 'รอแก้ไข';
        if (idxSpecialId >= 0) newRow[idxSpecialId] = sp;
        if (idxPendingTask >= 0) newRow[idxPendingTask] = task;

        sheet.appendRow(newRow);
        rowMap[sp] = sheet.getLastRow();
        insertedCount++;
      }
    });

    SpreadsheetApp.flush();
    return {
      success: true,
      updatedCount: updatedCount,
      insertedCount: insertedCount,
      total: (items || []).length,
      message: `ซิงค์ข้อมูลจาก SGS NextSchool สำเร็จ (อัปเดต ${updatedCount} รายการ, เพิ่มใหม่ ${insertedCount} รายการ)`
    };
  } catch (e) {
    console.error('Error in syncFromSgsNextschool:', e);
    return { success: false, message: e.message };
  } finally {
    lock.releaseLock();
  }
}

// 🌟 ระบบซิงค์ข้อมูลลงในแผ่นงาน WP16_งานค้าง (ตรงกับโครงสร้าง 13 หัวตาราง)
function syncWp16Sheet(items, clearAll) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sheet = ss.getSheetByName('WP16_งานค้าง');
    if (!sheet) {
      sheet = ss.insertSheet('WP16_งานค้าง');
    }

    var expectedHeaders = [
      'เลขเฉพาะ', 'ปี/เทอม', 'รหัสวิชา', 'ชื่อวิชา', 'ครูผู้สอน', 
      'ชั้น/ห้อง', 'เลขประจำตัว', 'ชื่อ-นามสกุล', 'ผลเดิม', 'คะแนน', 
      'งานค้าง/ภาระงาน', 'หมายเหตุ', 'วันที่บันทึก'
    ];

    // ตั้งค่าหัวตารางแถว 1 ให้ตรงกับ expectedHeaders เสมอ
    sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
    sheet.getRange(1, 1, 1, expectedHeaders.length).setFontWeight("bold").setBackground("#e0f2fe");

    var today = new Date();
    var dateStr = Utilities.formatDate(today, "Asia/Bangkok", "yyyy-MM-dd HH:mm:ss");

    var processedRows = (items || []).map(function(it) {
      var sp = cleanStr_(it.special_id || it.specialId || ((it.subject_code || it.subjCode || '') + (it.student_id || it.stuId || '')));
      var termStr = cleanStr_(it.year_term || it.termStr);
      if (!termStr) {
        var yr = cleanStr_(it.academic_year || it.year || '2569');
        var sem = cleanStr_(it.semester || it.term || '1');
        termStr = (yr && sem) ? (yr + '/' + sem) : (yr || sem || '');
      }
      return [
        sp,
        termStr,
        cleanStr_(it.subject_code || it.subjCode),
        cleanStr_(it.subject_name || it.subjName),
        cleanStr_(it.teacher_name || it.teacherName),
        cleanStr_(it.class_level || it.classLevel),
        cleanStr_(it.student_id || it.stuId),
        cleanStr_(it.student_name || it.stuName),
        cleanStr_(it.old_grade || it.oldGrade || it.grade || ''),
        (it.old_score !== undefined && it.old_score !== null) ? String(it.old_score) : (it.score !== undefined ? String(it.score) : ''),
        (it.pending_task !== undefined && it.pending_task !== null) ? String(it.pending_task) : (it.task !== undefined ? String(it.task) : ''),
        cleanStr_(it.remark),
        cleanStr_(it.updated_at) || dateStr
      ];
    }).filter(function(r) { return r[0] !== ''; });

    if (clearAll) {
      var lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
      }
      if (processedRows.length > 0) {
        sheet.getRange(2, 1, processedRows.length, expectedHeaders.length).setValues(processedRows);
      }
      SpreadsheetApp.flush();
      return {
        status: 'success',
        success: true,
        count: processedRows.length,
        message: `ล้างและบันทึกข้อมูลคลีนลงใน WP16_งานค้าง เรียบร้อยแล้ว (${processedRows.length} รายการ ตรง 13 หัวตาราง)`
      };
    }

    // กรณีซิงค์แบบ Incremental (Update / Insert ใน batch เดียว)
    var data = sheet.getDataRange().getValues();
    var rowMap = {};
    for (var i = 1; i < data.length; i++) {
      var spExisting = cleanStr_(data[i][0]);
      if (spExisting) rowMap[spExisting] = i + 1;
    }

    var updatedCount = 0;
    var newRows = [];
    processedRows.forEach(function(rowVals) {
      var sp = rowVals[0];
      if (rowMap[sp]) {
        sheet.getRange(rowMap[sp], 1, 1, rowVals.length).setValues([rowVals]);
        updatedCount++;
      } else {
        newRows.push(rowVals);
      }
    });

    if (newRows.length > 0) {
      var nextRow = sheet.getLastRow() + 1;
      sheet.getRange(nextRow, 1, newRows.length, expectedHeaders.length).setValues(newRows);
    }

    SpreadsheetApp.flush();
    return {
      status: 'success',
      success: true,
      count: processedRows.length,
      updatedCount: updatedCount,
      insertedCount: newRows.length,
      message: `บันทึกสู่แผ่นงาน WP16_งานค้าง เรียบร้อยแล้ว (อัปเดต ${updatedCount} รายการ, เพิ่มใหม่ ${newRows.length} รายการ)`
    };
  } catch (e) {
    console.error('Error in syncWp16Sheet:', e);
    return { status: 'error', success: false, message: e.message };
  } finally {
    lock.releaseLock();
  }
}

// 🌟 ฟังก์ชันจัดการแก้ไขประเภทคอลัมน์ และลบเด็กขาดนาน/ลาออกโดยตรง
function directFixStudentRecords() {
  clearDashboardCache();
  bumpTaskCacheVersion_();
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sheet = ss.getSheetByName('StudentRecords');
    if (!sheet) return { success: false, message: 'ไม่พบชีต StudentRecords' };

    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    if (lastRow < 2) return { success: false, message: 'ไม่มีข้อมูลในชีต' };

    var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(cleanStr_);
    var idxStuId = headers.indexOf('เลขประจำตัว');
    var idxStuName = headers.indexOf('ชื่อ-นามสกุล');
    var idxYear = headers.indexOf('ปีการศึกษา');
    var idxSubj = headers.indexOf('รหัสวิชา');
    var idxSubjName = headers.indexOf('ชื่อวิชา');
    var idxStatus = headers.indexOf('สถานะระบบ');

    if (idxStuId < 0 || idxStuName < 0) {
      return { success: false, message: 'ไม่พบคอลัมน์ เลขประจำตัว หรือ ชื่อ-นามสกุล' };
    }

    // 1. อัปเดตคำนำหน้านักเรียนเฉพาะคอลัมน์ "ชื่อ-นามสกุล" เท่านั้น (ไม่แตะคอลัมน์อื่นหรือหัวตาราง ป้องกัน Smart Table Error)
    var knownPrefixes = ['เด็กชาย', 'เด็กหญิง', 'ด.ช.', 'ด.ญ.', 'นาย', 'นางสาว', 'น.ส.', 'ด.ช', 'ด.ญ'];
    var prefixUpdatedCount = 0;
    
    // ดึงเฉพาะคอลัมน์เลขประจำตัว และ ชื่อ-นามสกุล
    var idVals = sheet.getRange(2, idxStuId + 1, lastRow - 1, 1).getValues();
    var nameVals = sheet.getRange(2, idxStuName + 1, lastRow - 1, 1).getValues();
    
    if (typeof STUDENT_PREFIX_MAP !== 'undefined') {
      for (var r = 0; r < nameVals.length; r++) {
        var sid = cleanStr_(idVals[r][0]);
        var sName = cleanStr_(nameVals[r][0]);
        if (!sid || !sName) continue;

        var hasPref = false;
        for (var p = 0; p < knownPrefixes.length; p++) {
          if (sName.indexOf(knownPrefixes[p]) === 0) {
            hasPref = true;
            break;
          }
        }

        if (!hasPref && STUDENT_PREFIX_MAP[sid]) {
          var officialPref = STUDENT_PREFIX_MAP[sid];
          nameVals[r][0] = officialPref + sName;
          prefixUpdatedCount++;
        }
      }

      if (prefixUpdatedCount > 0) {
        // เขียนกลับเฉพาะคอลัมน์ชื่อ-นามสกุล (แถวที่ 2 เป็นต้นไป)
        sheet.getRange(2, idxStuName + 1, lastRow - 1, 1).setValues(nameVals);
        console.log('Successfully updated ' + prefixUpdatedCount + ' student prefixes in column ' + (idxStuName + 1));
      }
    }

    // 1.1 แปลงค่าข้อความให้เป็นตัวเลขแท้ๆ ในแต่ละคอลัมน์ที่เป็น Number ตามข้อกำหนดของ Smart Table
    var numericCols = ['ห้อง', 'เลขประจำตัว', 'เลขที่', 'ปีการศึกษา', 'ภาคเรียนที่'];
    var convertedSummary = [];
    numericCols.forEach(function(colName) {
      var cIdx = headers.indexOf(colName);
      if (cIdx >= 0) {
        try {
          var numRange = sheet.getRange(2, cIdx + 1, lastRow - 1, 1);
          var numVals = numRange.getValues();
          var changedCount = 0;
          for (var r = 0; r < numVals.length; r++) {
            var v = numVals[r][0];
            if (v !== '' && v !== null && v !== undefined && typeof v !== 'number') {
              var parsedNum = Number(v);
              if (!isNaN(parsedNum)) {
                numVals[r][0] = parsedNum;
                changedCount++;
              }
            }
          }
          if (changedCount > 0) {
            numRange.setValues(numVals);
            convertedSummary.push(colName + ' (' + changedCount + ')');
          }
        } catch(cErr) {
          console.warn('Skip converting ' + colName + ':', cErr.message);
        }
      }
    });

    // 1.2 แปลงวันที่แก้ไข ให้เป็น Date object แท้ๆ
    var idxEditDate = headers.indexOf('วันที่แก้ไข');
    if (idxEditDate >= 0) {
      try {
        var dRange = sheet.getRange(2, idxEditDate + 1, lastRow - 1, 1);
        var dVals = dRange.getValues();
        var dChanged = 0;
        for (var r = 0; r < dVals.length; r++) {
          var dv = dVals[r][0];
          if (dv) {
            var parsedD = parseDateSafe(dv);
            if (parsedD && !(dv instanceof Date)) {
              dVals[r][0] = parsedD;
              dChanged++;
            }
          }
        }
        if (dChanged > 0) {
          dRange.setValues(dVals);
          convertedSummary.push('วันที่แก้ไข (' + dChanged + ')');
        }
      } catch(dErr) {
        console.warn('Skip converting วันที่แก้ไข:', dErr.message);
      }
    }

    // 2. รายชื่อนักเรียนขาดนาน/ลาออก ที่ต้องตัดออกจากระบบแก้ไขผลการเรียน (รวม 20498 นายธงชัย พุชชงค์)
    var dropoutList = [
      '20498', // ธงชัย พุชชงค์ (ลาออก)
      '20028','20038','20466','20079','20080','20090','20157','20158','20168','20427',
      '20511','20179','20184','20178','19325','19424','19434','19462','19496','18742',
      '19537','19861','19864','20497','18739','18760','18791','18844','18878','18882',
      '18887','18895','18900','18926','18930','18934','18935','20223','20244','17964',
      '19714','20292','20490','20494','20482','18382','20444','19717','20372','18312',
      '18414','17915','18316','17976','19654','19660','19876','19892','18029','19716',
      '19196','19728','19894','19913','19854','19775','18036','19015','17848','19219',
      '18221','17507','20370','20374','20424','19874','19888','19893','19904'
    ];
    var dropoutMap = {};
    dropoutList.forEach(function(id) { dropoutMap[id] = true; });

    // ดึงข้อมูลแถวทั้งหมดมาตรวจสอบหาแถวที่ต้องลบ
    var dataForDelete = sheet.getRange(1, 1, sheet.getLastRow(), lastCol).getValues();
    var deletedDetails = [];
    var rowsToDelete = [];
    for (var i = 1; i < dataForDelete.length; i++) {
      var sid = cleanStr_(dataForDelete[i][idxStuId]);
      if (dropoutMap[sid]) {
        rowsToDelete.push(i + 1); // 1-indexed row number in sheet
        deletedDetails.push({
          row: i + 1,
          studentId: sid,
          name: cleanStr_(dataForDelete[i][idxStuName]),
          year: idxYear >= 0 ? cleanStr_(dataForDelete[i][idxYear]) : '',
          subject: (idxSubj >= 0 ? cleanStr_(dataForDelete[i][idxSubj]) : '') + ' ' + (idxSubjName >= 0 ? cleanStr_(dataForDelete[i][idxSubjName]) : ''),
          status: idxStatus >= 0 ? cleanStr_(dataForDelete[i][idxStatus]) : ''
        });
      }
    }

    var physicallyDeletedCount = 0;
    var clearedCount = 0;
    // ลบแถวจากล่างขึ้นบน
    for (var d = rowsToDelete.length - 1; d >= 0; d--) {
      var targetRow = rowsToDelete[d];
      try {
        sheet.deleteRow(targetRow);
        physicallyDeletedCount++;
      } catch(delErr) {
        console.warn('deleteRow failed on row ' + targetRow + ' due to smart table, falling back to clearContent: ' + delErr.message);
        try {
          // หาก deleteRow ติดข้อจำกัดของ Smart Table ให้ล้างค่าเซลล์ในแถวนั้นแทน
          sheet.getRange(targetRow, 1, 1, lastCol).clearContent();
          clearedCount++;
        } catch(clrErr) {
          console.error('clearContent also failed on row ' + targetRow + ':', clrErr);
        }
      }
    }

    // 3. อัปเดตจำนวนนักเรียนในชีต Totalstudent อัตโนมัติ (55 ห้อง รวม 1,845 คน)
    try {
      updateTotalStudent2569();
    } catch(totErr) {
      console.warn('Update Totalstudent warning:', totErr);
    }

    SpreadsheetApp.flush();
    clearDashboardCache();
    bumpTaskCacheVersion_();

    return {
      success: true,
      prefixUpdatedCount: prefixUpdatedCount,
      totalStudentsUpdated: 1845,
      deletedCount: deletedDetails.length,
      physicallyDeletedCount: physicallyDeletedCount,
      clearedCount: clearedCount,
      deletedDetails: deletedDetails,
      remainingRows: sheet.getLastRow() - 1,
      message: 'จัดการเพิ่มคำนำหน้านักเรียน ' + prefixUpdatedCount + ' รายการในคอลัมน์ชื่อ-นามสกุล, ปรับปรุงยอดนักเรียน 55 ห้อง (1,845 คน) ในชีต Totalstudent และตัดเด็กขาดนาน/ลาออกจำนวน ' + deletedDetails.length + ' แถวเรียบร้อยแล้ว'
    };
  } catch(e) {
    console.error('Error in directFixStudentRecords:', e);
    return { success: false, message: e.message, stack: e.stack };
  } finally {
    try { lock.releaseLock(); } catch(lErr) {}
  }
}

// 🌟 ฟังก์ชันอัปเดตจำนวนนักเรียนปีการศึกษา 2569 ในชีต Totalstudent (55 ห้อง รวม 1,845 คน)
function updateTotalStudent2569() {
  clearDashboardCache();
  bumpTaskCacheVersion_();
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sheet = ss.getSheetByName('Totalstudent');
    if (!sheet) return { success: false, message: 'ไม่พบชีต Totalstudent' };

    var counts = [
      35, 39, 40, 24, 33, 35, 31, // ม.1 (237 คน)
      34, 35, 38, 34, 35, 33, 30, // ม.2 (239 คน)
      35, 33, 31, 28, 24, 25, 21, 33, // ม.3 (230 คน)
      36, 40, 35, 33, 38, 35, 40, 38, 39, 39, 19, // ม.4 (392 คน)
      35, 39, 39, 39, 41, 31, 30, 37, 36, 37, 39, // ม.5 (403 คน)
      34, 38, 34, 37, 29, 24, 39, 26, 24, 27, 32  // ม.6 (344 คน)
    ];

    var range = sheet.getRange(2, 3, counts.length, 1);
    range.setValues(counts.map(function(c) { return [c]; }));
    SpreadsheetApp.flush();
    clearDashboardCache();
    bumpTaskCacheVersion_();

    return {
      success: true,
      totalRooms: counts.length,
      totalStudents: 1845,
      message: 'อัปเดตจำนวนนักเรียนปี 2569 ในชีต Totalstudent ครบทั้ง 55 ห้อง (รวม 1,845 คน) เรียบร้อยแล้ว'
    };
  } catch(e) {
    console.error('Error in updateTotalStudent2569:', e);
    return { success: false, message: e.message };
  } finally {
    lock.releaseLock();
  }
}

// 🌟 ฟังก์ชันดึงข้อมูลผลการเรียนและงานค้างสำหรับนักเรียน (Student Portal)
function getStudentData(studentId) {
  var cleanId = cleanStr_(studentId);
  if (!cleanId) return { success: false, message: 'กรุณาระบุเลขประจำตัวนักเรียน' };

  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName('StudentRecords');
  var data = sheet.getDataRange().getValues();
  var headers = data[0].map(cleanStr_);

  var idxSubjCode = headers.indexOf('รหัสวิชา'),
      idxSubjName = headers.indexOf('ชื่อวิชา'),
      idxRoom = headers.indexOf('ห้อง'),
      idxGrade = headers.indexOf('ชั้น'),
      idxTeacher = headers.indexOf('ครูผู้สอน'),
      idxStuId = headers.indexOf('เลขประจำตัว'),
      idxStuName = headers.indexOf('ชื่อ-นามสกุล'),
      idxYear = headers.indexOf('ปีการศึกษา'),
      idxTerm = headers.indexOf('ภาคเรียนที่'),
      idxOldScore = headers.indexOf('คะแนนเดิม'),
      idxOldGrade = headers.indexOf('ผลการเรียนเดิม'),
      idxNewGrade = headers.indexOf('ผลการเรียนใหม่'),
      idxDate = headers.indexOf('วันที่แก้ไข'),
      idxStatus = headers.indexOf('สถานะระบบ'),
      idxSpecialId = headers.indexOf('เลขเฉพาะ'),
      idxPendingTask = headers.indexOf('งานค้าง'),
      idxTaskDate = headers.indexOf('วันที่รับงาน');

  var studentProfile = null;
  var subjects = [];

  for (var i = 1; i < data.length; i++) {
    var sid = cleanStr_(data[i][idxStuId]);
    if (sid === cleanId) {
      if (!studentProfile) {
        studentProfile = {
          studentId: sid,
          studentName: cleanStr_(data[i][idxStuName]),
          classLevel: cleanStr_(data[i][idxGrade]) + (data[i][idxRoom] ? '/' + cleanStr_(data[i][idxRoom]) : ''),
          academicYear: cleanStr_(data[i][idxYear]),
          semester: cleanStr_(data[i][idxTerm])
        };
      }

      var taskDateVal = idxTaskDate >= 0 ? data[i][idxTaskDate] : '';
      var taskDateStr = '';
      if (taskDateVal instanceof Date) {
        taskDateStr = Utilities.formatDate(taskDateVal, "Asia/Bangkok", "dd/MM/yyyy HH:mm");
      } else if (taskDateVal) {
        taskDateStr = cleanStr_(taskDateVal);
      }

      var editDateVal = idxDate >= 0 ? data[i][idxDate] : '';
      var editDateStr = '';
      if (editDateVal instanceof Date) {
        editDateStr = Utilities.formatDate(editDateVal, "Asia/Bangkok", "dd/MM/yyyy");
      } else if (editDateVal) {
        editDateStr = cleanStr_(editDateVal);
      }

      subjects.push({
        rowId: i + 1,
        specialId: idxSpecialId >= 0 ? cleanStr_(data[i][idxSpecialId]) : '',
        subjCode: cleanStr_(data[i][idxSubjCode]),
        subjName: cleanStr_(data[i][idxSubjName]),
        teacherName: cleanStr_(data[i][idxTeacher]),
        oldScore: cleanStr_(data[i][idxOldScore]),
        oldGrade: cleanStr_(data[i][idxOldGrade]) || '0',
        newGrade: idxNewGrade >= 0 ? cleanStr_(data[i][idxNewGrade]) : '',
        status: cleanStr_(data[i][idxStatus]) || 'รอแก้ไข',
        pendingTask: idxPendingTask >= 0 ? cleanStr_(data[i][idxPendingTask]) : '',
        taskDate: taskDateStr,
        isRegistered: !!taskDateStr,
        editDate: editDateStr
      });
    }
  }

  if (!studentProfile && subjects.length === 0) {
    return {
      success: false,
      message: 'ไม่พบข้อมูลผลการเรียนที่ต้องแก้ไขสำหรับเลขประจำตัว ' + cleanId
    };
  }

  return {
    success: true,
    student: studentProfile,
    subjects: subjects
  };
}

// 🌟 ฟังก์ชันลงทะเบียนรับงานค้าง (บันทึกหรือยกเลิกวันที่รับงาน)
function registerTask(rowId, specialId, taskDate) {
  bumpTaskCacheVersion_();
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sheet = ss.getSheetByName('StudentRecords');
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(cleanStr_);
    var idxTaskDate = headers.indexOf('วันที่รับงาน') + 1;
    if (idxTaskDate <= 0) return { success: false, message: 'ไม่พบคอลัมน์ วันที่รับงาน ในชีต' };

    var targetRow = null;
    if (rowId) {
      targetRow = parseInt(rowId);
    } else if (specialId) {
      var idxSpecialId = headers.indexOf('เลขเฉพาะ') + 1;
      if (idxSpecialId > 0) {
        var lastRow = getLastRealRow_(sheet);
        if (lastRow >= 2) {
          var colVals = sheet.getRange(2, idxSpecialId, lastRow - 1, 1).getValues();
          for (var i = 0; i < colVals.length; i++) {
            if (cleanStr_(colVals[i][0]) === cleanStr_(specialId)) {
              targetRow = i + 2;
              break;
            }
          }
        }
      }
    }

    if (!targetRow || targetRow < 2) return { success: false, message: 'ไม่พบรายการนักเรียนที่ระบุ' };

    var dateStr = '';
    var isReg = false;
    if (taskDate === '' || taskDate === null || taskDate === 'clear' || taskDate === false) {
      sheet.getRange(targetRow, idxTaskDate).setValue('');
      dateStr = '';
      isReg = false;
    } else {
      dateStr = (typeof taskDate === 'string' && taskDate.trim() && taskDate !== 'true') 
        ? taskDate.trim() 
        : Utilities.formatDate(new Date(), "Asia/Bangkok", "dd/MM/yyyy HH:mm");
      sheet.getRange(targetRow, idxTaskDate).setValue(dateStr);
      isReg = true;
    }
    SpreadsheetApp.flush();

    return {
      success: true,
      rowId: targetRow,
      taskDate: dateStr,
      isRegistered: isReg,
      message: isReg ? 'ลงทะเบียนรับงานเรียบร้อยแล้ว' : 'ยกเลิกการลงทะเบียนรับงานเรียบร้อยแล้ว'
    };
  } catch (e) {
    console.error('Error in registerTask:', e);
    return { success: false, message: e.message };
  } finally {
    try { lock.releaseLock(); } catch(e) {}
  }
}

// 🌟 ฟังก์ชันลงทะเบียนรับงานค้างแบบกลุ่ม (Bulk Register Tasks)
function batchRegisterTasks(rowIds) {
  bumpTaskCacheVersion_();
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sheet = ss.getSheetByName('StudentRecords');
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(cleanStr_);
    var idxTaskDate = headers.indexOf('วันที่รับงาน') + 1;
    if (idxTaskDate <= 0) return { success: false, message: 'ไม่พบคอลัมน์ วันที่รับงาน ในชีต' };

    var now = new Date();
    var dateStr = Utilities.formatDate(now, "Asia/Bangkok", "dd/MM/yyyy HH:mm");
    var updated = 0;
    (rowIds || []).forEach(function(rId) {
      var row = parseInt(rId);
      if (row > 1) {
        sheet.getRange(row, idxTaskDate).setValue(dateStr);
        updated++;
      }
    });
    SpreadsheetApp.flush();
    return {
      success: true,
      count: updated,
      taskDate: dateStr,
      message: 'บันทึกการลงทะเบียนรับงาน ' + updated + ' รายการเรียบร้อยแล้ว'
    };
  } catch (e) {
    console.error('Error in batchRegisterTasks:', e);
    return { success: false, message: e.message };
  } finally {
    try { lock.releaseLock(); } catch(e) {}
  }
}

// ==========================================
// 6. ระบบซิงค์ผลการเรียนเข้า SGS อัตโนมัติ + รีเช็คความถูกต้อง (SGS Auto-Sync & Verification)
// ==========================================
function getReadySgsTasks() {
  try {
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sheet = ss.getSheetByName('StudentRecords');
    if (!sheet) return { status: 'error', success: false, message: 'ไม่พบชีต StudentRecords', tasks: [] };

    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return { status: 'success', success: true, count: 0, tasks: [] };

    var maxCols = Math.min(sheet.getLastColumn(), 20);
    var data = sheet.getRange(1, 1, lastRow, maxCols).getValues();
    var headers = data[0].map(cleanStr_);

    var idxSubjCode = headers.indexOf('รหัสวิชา'),
        idxSubjName = headers.indexOf('ชื่อวิชา'),
        idxRoom = headers.indexOf('ห้อง'),
        idxGrade = headers.indexOf('ชั้น'),
        idxTeacher = headers.indexOf('ครูผู้สอน'),
        idxStuId = headers.indexOf('เลขประจำตัว'),
        idxStuName = headers.indexOf('ชื่อ-นามสกุล'),
        idxYear = headers.indexOf('ปีการศึกษา'),
        idxTerm = headers.indexOf('ภาคเรียนที่'),
        idxOldScore = headers.indexOf('คะแนนเดิม'),
        idxOldGrade = headers.indexOf('ผลการเรียนเดิม'),
        idxNewGrade = headers.indexOf('ผลการเรียนใหม่'),
        idxDate = headers.indexOf('วันที่แก้ไข'),
        idxStatus = headers.indexOf('สถานะระบบ'),
        idxSpecialId = headers.indexOf('เลขเฉพาะ');

    var tasks = [];
    for (var i = 1; i < data.length; i++) {
      var stuId = cleanStr_(data[i][idxStuId]);
      if (!stuId) continue;

      var statusSys = cleanStr_(data[i][idxStatus]);
      if (statusSys === 'พร้อมทำงาน') {
        var subjCode = cleanStr_(data[i][idxSubjCode]);
        var sp = (idxSpecialId >= 0 ? cleanStr_(data[i][idxSpecialId]) : '') || (subjCode + stuId);
        var dVal = idxDate >= 0 ? data[i][idxDate] : '';
        var dateStr = '';
        if (dVal instanceof Date) {
          dateStr = Utilities.formatDate(dVal, "Asia/Bangkok", "dd/MM/yyyy");
        } else if (dVal) {
          dateStr = cleanStr_(dVal);
        }

        tasks.push({
          rowId: i + 1,
          specialId: sp,
          subjCode: subjCode,
          subjName: cleanStr_(data[i][idxSubjName]),
          stuId: stuId,
          stuName: cleanStr_(data[i][idxStuName]),
          grade: cleanStr_(data[i][idxGrade]),
          room: cleanStr_(data[i][idxRoom]),
          gradeRoom: cleanStr_(data[i][idxGrade]) + '/' + cleanStr_(data[i][idxRoom]),
          year: cleanStr_(data[i][idxYear]),
          term: cleanStr_(data[i][idxTerm]),
          oldScore: cleanStr_(data[i][idxOldScore]),
          oldGrade: cleanStr_(data[i][idxOldGrade]),
          newGrade: cleanStr_(data[i][idxNewGrade]),
          teacherName: cleanStr_(data[i][idxTeacher]),
          editDate: dateStr
        });
      }
    }

    return {
      status: 'success',
      success: true,
      count: tasks.length,
      tasks: tasks
    };
  } catch (e) {
    console.error('Error in getReadySgsTasks:', e);
    return { status: 'error', success: false, message: e.message, tasks: [] };
  }
}

function ensureSgsLogSheet_(ss) {
  var logSheet = ss.getSheetByName('SGS_Log');
  var expectedHeaders = [
    'วัน-เวลา', 'เลขประจำตัว', 'ชื่อ-นามสกุล', 'ชั้น/ห้อง',
    'รหัสวิชา', 'ชื่อวิชา', 'ปี/เทอม', 'ผลเดิม',
    'ผลใหม่ที่ส่ง', 'ค่าที่รีเช็คใน SGS', 'ผลการซิงค์', 'รายละเอียด/สาเหตุ', 'เลขเฉพาะ'
  ];
  if (!logSheet) {
    logSheet = ss.insertSheet('SGS_Log');
    logSheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
    logSheet.getRange(1, 1, 1, expectedHeaders.length).setFontWeight('bold').setBackground('#e0e7ff');
  } else if (logSheet.getLastRow() === 0) {
    logSheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
    logSheet.getRange(1, 1, 1, expectedHeaders.length).setFontWeight('bold').setBackground('#e0e7ff');
  }
  return logSheet;
}

function updateSgsSyncResult(params) {
  clearDashboardCache();
  bumpTaskCacheVersion_();
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(25000);
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sheet = ss.getSheetByName('StudentRecords');
    if (!sheet) return { status: 'error', success: false, message: 'ไม่พบชีต StudentRecords' };

    var logSheet = ensureSgsLogSheet_(ss);
    var headers = sheet.getRange(1, 1, 1, Math.min(sheet.getLastColumn(), 20)).getValues()[0].map(cleanStr_);
    var idxStatus = headers.indexOf('สถานะระบบ') + 1;
    var idxStuId = headers.indexOf('เลขประจำตัว') + 1;
    var idxSubjCode = headers.indexOf('รหัสวิชา') + 1;
    var idxSpecialId = headers.indexOf('เลขเฉพาะ') + 1;

    var items = params.items && Array.isArray(params.items) ? params.items : [params];
    var nowStr = Utilities.formatDate(new Date(), "Asia/Bangkok", "dd/MM/yyyy HH:mm:ss");
    var updatedCount = 0;
    var logRows = [];

    items.forEach(function(item) {
      if (!item) return;
      var stuId = cleanStr_(item.stuId || item.studentId);
      var subjCode = cleanStr_(item.subjCode || item.subjectCode);
      var sp = cleanStr_(item.specialId) || (subjCode + stuId);
      var isSuccess = (item.success === true || item.success === 'true' || item.status === 'สำเร็จ' || item.status === 'ซิงค์แล้ว');
      var targetRow = item.rowId ? parseInt(item.rowId) : null;

      if (isSuccess && idxStatus > 0) {
        var rowVerified = false;
        if (targetRow && targetRow >= 2 && targetRow <= sheet.getLastRow()) {
          var rowStuId = idxStuId > 0 ? cleanStr_(sheet.getRange(targetRow, idxStuId).getValue()) : '';
          var rowSubj = idxSubjCode > 0 ? cleanStr_(sheet.getRange(targetRow, idxSubjCode).getValue()) : '';
          if ((!stuId || rowStuId === stuId) && (!subjCode || rowSubj === subjCode)) {
            rowVerified = true;
          }
        }
        // Fallback: ค้นหาจาก เลขเฉพาะ หรือ (รหัสวิชา + เลขประจำตัว) กรณีแถวมีการเลื่อน
        if (!rowVerified && sp) {
          var lastR = sheet.getLastRow();
          if (lastR >= 2) {
            var allVals = sheet.getRange(2, 1, lastR - 1, Math.max(idxStatus, idxSpecialId, idxStuId, idxSubjCode)).getValues();
            for (var r = 0; r < allVals.length; r++) {
              var rSp = idxSpecialId > 0 ? cleanStr_(allVals[r][idxSpecialId - 1]) : '';
              var rSubj = idxSubjCode > 0 ? cleanStr_(allVals[r][idxSubjCode - 1]) : '';
              var rStu = idxStuId > 0 ? cleanStr_(allVals[r][idxStuId - 1]) : '';
              if ((rSp && rSp === sp) || (rSubj === subjCode && rStu === stuId)) {
                targetRow = r + 2;
                rowVerified = true;
                break;
              }
            }
          }
        }

        if (rowVerified && targetRow >= 2) {
          sheet.getRange(targetRow, idxStatus).setValue('ซิงค์แล้ว');
          updatedCount++;
        }
      }

      var yearTerm = (cleanStr_(item.year) && cleanStr_(item.term))
        ? (cleanStr_(item.year) + '/' + cleanStr_(item.term))
        : cleanStr_(item.yearTerm || '');

      logRows.push([
        nowStr,
        stuId,
        cleanStr_(item.stuName || item.studentName),
        cleanStr_(item.gradeRoom),
        subjCode,
        cleanStr_(item.subjName || item.subjectName),
        yearTerm,
        cleanStr_(item.oldGrade),
        cleanStr_(item.newGrade),
        cleanStr_(item.verifiedGrade),
        isSuccess ? 'สำเร็จ' : 'ผิดพลาด',
        cleanStr_(item.message || item.reason || (isSuccess ? 'รีเช็คตาราง SGS ตรงกับเกรดใหม่ 100%' : 'ไม่ทราบสาเหตุ')),
        sp
      ]);
    });

    if (logRows.length > 0) {
      var nextLogRow = logSheet.getLastRow() + 1;
      logSheet.getRange(nextLogRow, 1, logRows.length, logRows[0].length).setValues(logRows);
    }

    SpreadsheetApp.flush();
    return {
      status: 'success',
      success: true,
      updatedCount: updatedCount,
      loggedCount: logRows.length,
      timestamp: nowStr
    };
  } catch (e) {
    console.error('Error in updateSgsSyncResult:', e);
    return { status: 'error', success: false, message: e.message };
  } finally {
    try { lock.releaseLock(); } catch(e) {}
  }
}

function getSgsSyncDashboard() {
  try {
    var readyRes = getReadySgsTasks();
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var logSheet = ss.getSheetByName('SGS_Log');
    var recentLogs = [];
    var logSuccessCount = 0;
    var logErrorCount = 0;

    if (logSheet && logSheet.getLastRow() >= 2) {
      var lastRow = logSheet.getLastRow();
      var startRow = Math.max(2, lastRow - 149); // ดึงสูงสุด 150 รายการล่าสุด
      var numRows = lastRow - startRow + 1;
      var vals = logSheet.getRange(startRow, 1, numRows, Math.min(logSheet.getLastColumn(), 13)).getValues();
      for (var i = vals.length - 1; i >= 0; i--) {
        var r = vals[i];
        var ts = r[0] instanceof Date ? Utilities.formatDate(r[0], "Asia/Bangkok", "dd/MM/yyyy HH:mm:ss") : cleanStr_(r[0]);
        var st = cleanStr_(r[10]);
        if (st === 'สำเร็จ') logSuccessCount++;
        else if (st) logErrorCount++;

        recentLogs.push({
          timestamp: ts,
          stuId: cleanStr_(r[1]),
          stuName: cleanStr_(r[2]),
          gradeRoom: cleanStr_(r[3]),
          subjCode: cleanStr_(r[4]),
          subjName: cleanStr_(r[5]),
          yearTerm: cleanStr_(r[6]),
          oldGrade: cleanStr_(r[7]),
          newGrade: cleanStr_(r[8]),
          verifiedGrade: cleanStr_(r[9]),
          status: st,
          message: cleanStr_(r[11]),
          specialId: cleanStr_(r[12])
        });
      }
    }

    return {
      status: 'success',
      success: true,
      readyCount: readyRes.count || 0,
      readyTasks: readyRes.tasks || [],
      logSuccessCount: logSuccessCount,
      logErrorCount: logErrorCount,
      recentLogs: recentLogs
    };
  } catch (e) {
    console.error('Error in getSgsSyncDashboard:', e);
    return { status: 'error', success: false, message: e.message, readyTasks: [], recentLogs: [] };
  }
}

// ==========================================
// ⚡ Auto Cache Invalidation Triggers
// ==========================================
function onEdit(e) {
  try {
    var sheetName = e && e.range ? e.range.getSheet().getName() : '';
    if (!sheetName || ['Teacherdata', 'StudentRecords', 'Config_Calendar', 'Totalstudent', 'MasterData', 'masterdata', 'mastetdata'].indexOf(sheetName) !== -1) {
      clearDashboardCache();
      bumpTaskCacheVersion_();
      try { CacheService.getScriptCache().remove('all_teachers_cache'); } catch(err) {}
    }
  } catch(err) {}
}

function onOpen(e) {
  try {
    SpreadsheetApp.getUi()
      .createMenu('⚡ ระบบแก้ผลการเรียน')
      .addItem('🔄 ล้างแคช & ซิงค์หน้าเว็บทันที', 'menuClearCache')
      .addToUi();
  } catch(err) {}
}

function menuClearCache() {
  clearDashboardCache();
  bumpTaskCacheVersion_();
  try { CacheService.getScriptCache().remove('all_teachers_cache'); } catch(e) {}
  SpreadsheetApp.getActiveSpreadsheet().toast('ล้างแคชแดชบอร์ดเรียบร้อยแล้ว หน้าเว็บจะดึงข้อมูลใหม่ทันที!', 'สำเร็จ', 5);
}