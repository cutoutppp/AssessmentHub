// ==========================================
// Moresor - Google Sheets API (GAS)
// ==========================================

const SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();

function doGet(e) {
  const action = e.parameter.action;
  
  if (action === 'getDashboardData') {
    return handleGetDashboardData();
  }
  
  if (action === 'getConfig') {
    return handleGetConfig();
  }

  if (action === 'getAllStudentReports') {
    return handleGetAllStudentReports();
  }

  return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Invalid action' }))
    .setMimeType(ContentService.MimeType.JSON);
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
    
    const action = payload.action;

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
  
  const courseSheet = ss.getSheetByName('Masterdata');
  const courseData = courseSheet.getDataRange().getValues();
  const courseHeaders = courseData[0];
  const courses = courseData.slice(1).map(row => {
    let obj = {};
    courseHeaders.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });

  const logSheet = ss.getSheetByName('Log_Submissions');
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
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'ไม่พบหน้า Config' })).setMimeType(ContentService.MimeType.JSON);
  }
  const data = configSheet.getDataRange().getValues();
  const config = data.slice(1).map(row => ({ Key: row[0], Value: row[1] }));
  return ContentService.createTextOutput(JSON.stringify({ success: true, config })).setMimeType(ContentService.MimeType.JSON);
}

function handleGetTeacherReport(payload) {
  const teacherName = payload.teacherName;
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Student_Reports');
  if (!sheet) {
    return ContentService.createTextOutput(JSON.stringify({ success: true, data: [] })).setMimeType(ContentService.MimeType.JSON);
  }
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  const report = data.slice(1).filter(row => row[headers.indexOf('ครูผู้สอน')] === teacherName).map(row => {
    let obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
  
  return ContentService.createTextOutput(JSON.stringify({ success: true, data: report })).setMimeType(ContentService.MimeType.JSON);
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
  let logSheet = ss.getSheetByName('Log_Submissions');
  if (!logSheet) {
    logSheet = ss.insertSheet('Log_Submissions');
    logSheet.appendRow(['Timestamp', 'ครูผู้สอน', 'รหัสวิชา', 'กลุ่ม-ห้อง', 'ลิงก์ไฟล์ PDF', 'สถานะการส่ง', 'รอบการส่ง']);
  }
  
  const statusStr = submissionMode === 1 ? "ส่งแล้ว (รอบ 1)" : "ส่งแล้ว (รอบ 2)";
  
  logSheet.appendRow([
    new Date(),
    teacherName,
    courseCode,
    classRoom,
    fileUrl,
    statusStr,
    submissionMode || "-"
  ]);
  
  return ContentService.createTextOutput(JSON.stringify({ success: true, fileUrl }))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleSubmitReport(payload) {
  const { data, courseCode, classRoom, teacherName } = payload;
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName('Student_Reports');
  if (!sheet) {
    sheet = ss.insertSheet('Student_Reports');
    sheet.appendRow(['Timestamp', 'ครูผู้สอน', 'รหัสวิชา', 'ชั้น', 'กลุ่ม-ห้อง', 'รหัสประจำตัว', 'ชื่อ-สกุล', 'เวลาเรียน(%)', 'หมายเหตุ', 'อนุญาตให้เข้าสอบ']);
  }
  
  const timestamp = new Date();
  data.forEach(s => {
    sheet.appendRow([
      timestamp,
      teacherName,
      courseCode,
      classRoom.split('/')[0] || '',
      classRoom.split('/')[1] || '',
      s.studentId,
      s.studentName,
      s.percentage,
      s.remark,
      s.allowExam
    ]);
  });
  
  return ContentService.createTextOutput(JSON.stringify({ success: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleUpdateStudentStatus(payload) {
  const { studentId, courseCode, allowExam, remark } = payload;
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Student_Reports');
  if (!sheet) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Sheet not found' })).setMimeType(ContentService.MimeType.JSON);
  }
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const stdIdIdx = headers.indexOf('รหัสประจำตัว');
  const courseIdx = headers.indexOf('รหัสวิชา');
  const allowExamIdx = headers.indexOf('อนุญาตให้เข้าสอบ');
  const remarkIdx = headers.indexOf('หมายเหตุ');
  
  let updated = false;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][stdIdIdx]) === String(studentId) && String(data[i][courseIdx]) === String(courseCode)) {
      sheet.getRange(i + 1, allowExamIdx + 1).setValue(allowExam);
      if (remark !== undefined && remark !== null) {
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
