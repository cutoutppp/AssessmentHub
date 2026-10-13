// ==========================================
// Moresor - Google Sheets API (GAS)
// ==========================================

const SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();

function getSheetByNameFallback_(ss, primaryName, fallbacks) {
  if (!ss) return null;
  var s = ss.getSheetByName(primaryName);
  if (s) return s;
  for (var i = 0; i < fallbacks.length; i++) {
    s = ss.getSheetByName(fallbacks[i]);
    if (s) return s;
  }
  return null;
}

function doGet(e) {
  try {
    const action = e.parameter ? e.parameter.action : null;
    
    if (action === 'getDashboardData') {
      return handleGetDashboardData();
    }
    
    if (action === 'getConfig') {
      return handleGetConfig();
    }

    return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Invalid action' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  let lock = LockService.getScriptLock();
  
  try {
    lock.waitLock(30000); 
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      error: 'ระบบไม่ว่าง กรุณาลองใหม่ในอีกสักครู่' 
    })).setMimeType(ContentService.MimeType.JSON);
  }

  try {
    let payload;
    if (e.postData && e.postData.contents) {
        try {
            payload = JSON.parse(e.postData.contents);
        } catch (err) {
            payload = e.parameter;
        }
    } else {
        payload = e.parameter;
    }
    
    const action = payload ? payload.action : null;

    if (action === 'uploadPdfToDrive') {
      return handleUploadPdfToDrive(payload);
    }
    if (action === 'submitReport') {
      return handleSubmitReport(payload);
    }
    if (action === 'updateStudentStatus') {
      return handleUpdateStudentStatus(payload);
    }
    if (action === 'getTeacherReport') {
      return handleGetTeacherReport(payload);
    }

    return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Invalid POST action' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function handleGetDashboardData() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  const courseSheet = getSheetByNameFallback_(ss, 'Masterdata', ['View_ClassTeacher', 'Teacherdata', 'MasterData']);
  if (!courseSheet) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'ไม่พบชีต Masterdata หรือ View_ClassTeacher' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const courseData = courseSheet.getDataRange().getValues();
  if (courseData.length === 0) {
    return ContentService.createTextOutput(JSON.stringify({ success: true, courses: [], statuses: [] }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const courseHeaders = courseData[0];
  const courses = courseData.slice(1).map(row => {
    let obj = {};
    courseHeaders.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });

  const logSheet = getSheetByNameFallback_(ss, 'Log_Submissions', ['Submission_Status', 'Log', 'Logs']);
  let statuses = [];
  if (logSheet) {
    const logData = logSheet.getDataRange().getValues();
    if (logData.length > 0) {
      const logHeaders = logData[0];
      statuses = logData.slice(1).map(row => {
        let obj = {};
        logHeaders.forEach((h, i) => obj[h] = row[i]);
        return obj;
      });
    }
  }

  return ContentService.createTextOutput(JSON.stringify({ success: true, courses, statuses }))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleGetConfig() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const configSheet = ss.getSheetByName('Config');
  if (!configSheet) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'ไม่พบหน้า Config' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  const data = configSheet.getDataRange().getValues();
  const config = data.slice(1).map(row => ({ Key: row[0], Value: row[1] }));
  return ContentService.createTextOutput(JSON.stringify({ success: true, config }))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleGetTeacherReport(payload) {
  const teacherName = payload.teacherName;
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = getSheetByNameFallback_(ss, 'Student_Reports', ['M.S. Report', 'MS_Report', 'StudentReports']);
  if (!sheet) {
    return ContentService.createTextOutput(JSON.stringify({ success: true, data: [] }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const teacherIdx = headers.indexOf('ครูผู้สอน');
  
  const report = data.slice(1).filter(row => teacherIdx > -1 && String(row[teacherIdx]).trim() === String(teacherName).trim()).map(row => {
    let obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
  
  return ContentService.createTextOutput(JSON.stringify({ success: true, data: report }))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleUploadPdfToDrive(payload) {
  const { fileBase64, fileName, courseCode, classRoom, teacherName, submissionMode } = payload;
  const decoded = Utilities.base64Decode(fileBase64);
  const blob = Utilities.newBlob(decoded, 'application/pdf', fileName);
  
  const folderName = "Moresor_PDF_Uploads";
  let folders = DriveApp.getFoldersByName(folderName);
  let folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
  
  const file = folder.createFile(blob);
  const fileUrl = file.getUrl();

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let logSheet = getSheetByNameFallback_(ss, 'Log_Submissions', ['Submission_Status', 'Log']);
  if (!logSheet) {
    logSheet = ss.insertSheet('Log_Submissions');
    logSheet.appendRow(['Timestamp', 'ครูผู้สอน', 'รหัสวิชา', 'กลุ่ม-ห้อง', 'ลิงก์ไฟล์ PDF', 'สถานะการส่ง', 'รอบการส่ง']);
  }
  
  const sMode = Number(submissionMode) || 1;
  const statusStr = sMode === 1 ? "ส่งแล้ว (รอบ 1)" : "ส่งแล้ว (รอบ 2)";
  
  logSheet.appendRow([
    new Date(),
    teacherName,
    courseCode,
    classRoom,
    fileUrl,
    statusStr,
    sMode
  ]);
  
  return ContentService.createTextOutput(JSON.stringify({ success: true, fileUrl }))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleSubmitReport(payload) {
  const { data, courseCode, classRoom, teacherName } = payload;
  if (!data || !Array.isArray(data)) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Data must be an array' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = getSheetByNameFallback_(ss, 'Student_Reports', ['M.S. Report', 'MS_Report']);
  if (!sheet) {
    sheet = ss.insertSheet('Student_Reports');
    sheet.appendRow(['Timestamp', 'ครูผู้สอน', 'รหัสวิชา', 'ชั้น', 'กลุ่ม-ห้อง', 'รหัสประจำตัว', 'ชื่อ-สกุล', 'เวลาเรียน(%)', 'หมายเหตุ', 'อนุญาตให้เข้าสอบ']);
  }
  
  const timestamp = Utilities.formatDate(new Date(), "Asia/Bangkok", "yyyy-MM-dd HH:mm:ss");
  const levelPart = (classRoom || '').split('/')[0] || '';
  const roomPart = (classRoom || '').split('/')[1] || '';

  data.forEach(s => {
    const studentId = s['รหัสประจำตัว'] ?? s.studentId ?? '';
    const studentName = s['ชื่อ - นามสกุล (ใส่คำนำหน้าเต็ม)'] ?? s['ชื่อ-สกุล'] ?? s.studentName ?? s.fullName ?? '';
    const percentage = s['คิดเป็นร้อยละที่มาเรียน'] ?? s['เวลาเรียน(%)'] ?? s.percentage ?? '';
    const remark = s['หมายเหตุ'] ?? s.remark ?? '';
    const allowExam = s['อนุญาตให้เข้าสอบ'] !== undefined ? s['อนุญาตให้เข้าสอบ'] : (s.allowExam !== undefined ? s.allowExam : false);

    sheet.appendRow([
      timestamp,
      teacherName,
      courseCode,
      levelPart,
      roomPart,
      studentId,
      studentName,
      percentage,
      remark,
      allowExam
    ]);
  });
  
  return ContentService.createTextOutput(JSON.stringify({ success: true, count: data.length }))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleUpdateStudentStatus(payload) {
  const { studentId, courseCode, classRoom, allowExam, remark } = payload;
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = getSheetByNameFallback_(ss, 'Student_Reports', ['M.S. Report', 'MS_Report']);
  if (!sheet) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Sheet not found' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const stdIdIdx = headers.indexOf('รหัสประจำตัว');
  const courseIdx = headers.indexOf('รหัสวิชา');
  const levelIdx = headers.indexOf('ชั้น');
  const roomIdx = headers.indexOf('กลุ่ม-ห้อง');
  const allowExamIdx = headers.indexOf('อนุญาตให้เข้าสอบ');
  const remarkIdx = headers.indexOf('หมายเหตุ');
  
  let targetLevel = '';
  let targetRoom = '';
  if (classRoom && classRoom.includes('/')) {
    targetLevel = classRoom.split('/')[0].trim();
    targetRoom = classRoom.split('/')[1].trim();
  }

  let updated = false;
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const matchId = String(row[stdIdIdx]).trim() === String(studentId).trim();
    const matchCourse = String(row[courseIdx]).trim() === String(courseCode).trim();
    let matchClass = true;
    if (targetLevel && targetRoom && levelIdx > -1 && roomIdx > -1) {
      const rowLevel = String(row[levelIdx]).trim();
      const rowRoom = String(row[roomIdx]).trim();
      matchClass = (rowLevel === targetLevel && rowRoom === targetRoom);
    }

    if (matchId && matchCourse && matchClass) {
      if (allowExamIdx > -1) {
        sheet.getRange(i + 1, allowExamIdx + 1).setValue(allowExam);
      }
      if (remark !== undefined && remark !== null && remarkIdx > -1) {
        sheet.getRange(i + 1, remarkIdx + 1).setValue(remark);
      }
      updated = true;
      break;
    }
  }
  
  if (updated) {
    return ContentService.createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } else {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Student not found in this course' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
