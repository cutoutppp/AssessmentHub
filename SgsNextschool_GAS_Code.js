/**
 * Google Apps Script สำหรับรับข้อมูลจากเว็บ SGS NextSchool Validator
 * 1. บันทึกข้อมูลสถิติลง Google Sheets (History)
 * 2. สร้างโครงสร้างโฟลเดอร์ใน Google Drive อัตโนมัติ (ปี > เทอม > รอบ > กลุ่มสาระ > ชื่อครู)
 * 3. แปลง Base64 เป็นไฟล์ PDF และเซฟลง Drive
 * 4. 🌟 รองรับการบันทึกและซิงค์ข้อมูลงานค้างนักเรียนลงชีต "WP16_งานค้าง" (13 คอลัมน์)
 */

function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // 1. ดึงการตั้งค่า
    var settingsSheet = ss.getSheetByName("Settings");
    var year = "2566";
    var sem = "1";
    if (settingsSheet) {
      var sData = settingsSheet.getDataRange().getValues();
      for (var r = 0; r < sData.length; r++) {
         for (var c = 0; c < sData[r].length; c++) {
            var cellVal = String(sData[r][c]).trim();
            // ค้นหาแนวนอน (คอลัมน์ถัดไป)
            if (cellVal === "ปีการศึกษา" && c + 1 < sData[r].length && String(sData[r][c+1]).trim() !== "ภาคเรียน") {
               year = String(sData[r][c+1]).trim();
            }
            if (cellVal === "ภาคเรียน" && c + 1 < sData[r].length) {
               sem = String(sData[r][c+1]).trim();
            }
            // ค้นหาแนวตั้ง (แถวถัดไป)
            if (cellVal === "ปีการศึกษา" && r + 1 < sData.length && String(sData[r+1][c]).trim() !== "") {
               if (String(sData[r+1][c]).trim() !== "ภาคเรียน") {
                 year = String(sData[r+1][c]).trim();
               }
            }
            if (cellVal === "ภาคเรียน" && r + 1 < sData.length && String(sData[r+1][c]).trim() !== "") {
               sem = String(sData[r+1][c]).trim();
            }
         }
      }
    }
    
    // 2. ดึงข้อมูลครูผู้สอน
    var teachersSheet = ss.getSheetByName("Teachers") || ss.getSheetByName("View_ClassTeacher") || ss.getSheets()[0];
    var teachers = [];
    if (teachersSheet) {
      var data = teachersSheet.getDataRange().getValues();
      if (data.length > 0) {
        var headers = data[0];
        var subjIdx = headers.indexOf("รหัสวิชา");
        
        var subjNameIdx = headers.indexOf("วิชา");
        if (subjNameIdx === -1) subjNameIdx = headers.indexOf("ชื่อวิชา");
        
        var groupIdx = headers.indexOf("กลุ่มสาระ");
        var nameIdx = headers.indexOf("ชื่อครู");
        var prefixIdx = headers.indexOf("คำนำหน้า");
        var fnameIdx = headers.indexOf("ชื่อ");
        var lnameIdx = headers.indexOf("นามสกุล");
        var classIdx = headers.indexOf("ชั้น");
        var roomIdx = headers.indexOf("ห้อง");
        var groupRoomIdx = headers.indexOf("กลุ่ม-ห้อง");
        
        var getSubjectGroup = function(code) {
          if (!code) return 'อื่นๆ';
          var firstChar = code.charAt(0);
          if (firstChar === 'I' || firstChar === 'i') return 'IS (Independent Study)';
          if (['อ', 'จ', 'ญ', 'ฝ', 'ก'].indexOf(firstChar) > -1) return 'ภาษาต่างประเทศ';
          if (firstChar === 'ท') return 'ภาษาไทย';
          if (firstChar === 'ค') return 'คณิตศาสตร์';
          if (firstChar === 'ว') return 'วิทยาศาสตร์และเทคโนโลยี';
          if (firstChar === 'ส') return 'สังคมศึกษา ศาสนา และวัฒนธรรม';
          if (firstChar === 'พ') return 'สุขศึกษาและพลศึกษา';
          if (firstChar === 'ศ') return 'ศิลปะ';
          if (firstChar === 'ง') return 'การงานอาชีพ';
          return 'อื่นๆ';
        };
        
        if (subjIdx > -1 && (nameIdx > -1 || fnameIdx > -1)) {
          for (var i = 1; i < data.length; i++) {
            var subjectCode = String(data[i][subjIdx] || "").trim();
            if (!subjectCode) continue;
            
            var subjectName = "";
            if (subjNameIdx > -1) {
              subjectName = String(data[i][subjNameIdx] || "").trim();
            }
            
            var teacherName = "";
            if (nameIdx > -1 && data[i][nameIdx]) {
              teacherName = String(data[i][nameIdx]).trim();
            } else if (fnameIdx > -1) {
              var prefix = prefixIdx > -1 ? String(data[i][prefixIdx] || "").trim() : "";
              var fname = String(data[i][fnameIdx] || "").trim();
              var lname = lnameIdx > -1 ? String(data[i][lnameIdx] || "").trim() : "";
              teacherName = prefix + fname + " " + lname;
              teacherName = teacherName.trim();
            }
            
            var subjectGroup = "";
            if (groupIdx > -1 && data[i][groupIdx]) {
               subjectGroup = String(data[i][groupIdx]).trim();
            } else {
               subjectGroup = getSubjectGroup(subjectCode);
            }
            var classStr = classIdx > -1 ? String(data[i][classIdx] || "").trim() : "";
            var roomStr = roomIdx > -1 ? String(data[i][roomIdx] || "").trim() : "";
            var groupRoomStr = groupRoomIdx > -1 ? String(data[i][groupRoomIdx] || "").trim() : "";
            
            var combinedClass = classStr;
            var actualRoom = roomStr || groupRoomStr;
            
            if (actualRoom && classStr && classStr.indexOf("/") === -1 && actualRoom.indexOf("/") === -1) {
              combinedClass = classStr + "/" + actualRoom;
            } else if (actualRoom && !classStr) {
              combinedClass = actualRoom;
            } else if (actualRoom && actualRoom.indexOf("/") > -1) {
              combinedClass = actualRoom;
            }
            
            teachers.push({
              subject_code: subjectCode,
              subject_name: subjectName,
              subject_group: subjectGroup,
              teacher_name: teacherName,
              class_level: combinedClass
            });
          }
        }
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      "status": "success",
      "settings": {"year": year, "semester": sem},
      "teachers": teachers,
      "submissions": getSubmissionHistory(ss),
      "scores": getScores(ss)
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({"status": "error", "message": String(err)})).setMimeType(ContentService.MimeType.JSON);
  }
}

function getScores(ss) {
  var scoreSheet = ss.getSheetByName("Scores") || ss.getSheetByName("score") || ss.getSheetByName("คะแนน");
  if (!scoreSheet) return [];
  
  var data = scoreSheet.getDataRange().getValues();
  if (data.length < 2) return [];
  
  var headers = data[0];
  var result = [];
  
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var obj = {};
    var hasData = false;
    for (var j = 0; j < headers.length; j++) {
      var header = String(headers[j]).trim();
      if (header) {
        obj[header] = row[j];
        if (row[j] !== "" && row[j] !== null) hasData = true;
      }
    }
    if (hasData && obj["รหัสวิชา"]) {
      result.push(obj);
    }
  }
  
  return result;
}

function getSubmissionHistory(ss) {
  var historySheet = ss.getSheetByName("History");
  if (!historySheet) {
    historySheet = ss.getSheets()[0];
    if (historySheet.getName() === "Settings" || historySheet.getName() === "Teachers" || historySheet.getName() === "View_ClassTeacher") {
       return [];
    }
  }
  
  var data = historySheet.getDataRange().getValues();
  var history = [];
  if (data.length > 1) {
    var headers = data[0];
    var isNewFormat = headers.indexOf("ชั้น") > -1;
    
    for (var i = 1; i < data.length; i++) {
       var row = data[i];
       if (!row[1] || !row[6]) continue;
       
       var getStatStr = function(cols) {
         var parts = [];
         for (var k=0; k<cols.length; k++) {
           var idx = headers.indexOf(cols[k].col);
           if (idx > -1 && row[idx] !== "") {
             parts.push(cols[k].label + "=" + row[idx]);
           }
         }
         return parts.join(", ");
       };
       
       var gradesStat = headers.indexOf("ผลการเรียน") > -1 ? String(row[headers.indexOf("ผลการเรียน")]) : 
         getStatStr([
           {col: "เกรด 4", label: "4"}, {col: "เกรด 3.5", label: "3.5"}, {col: "เกรด 3", label: "3"}, {col: "เกรด 2.5", label: "2.5"},
           {col: "เกรด 2", label: "2"}, {col: "เกรด 1.5", label: "1.5"}, {col: "เกรด 1", label: "1"}, {col: "เกรด 0", label: "0"},
           {col: "ร", label: "ร"}, {col: "มส", label: "มส"}
         ]);
         
       var attrStat = headers.indexOf("คุณลักษณะ") > -1 ? String(row[headers.indexOf("คุณลักษณะ")]) : 
         getStatStr([
           {col: "คุณลักษณะ 3", label: "3"}, {col: "คุณลักษณะ 2", label: "2"}, {col: "คุณลักษณะ 1", label: "1"}, {col: "คุณลักษณะ 0", label: "0"}
         ]);
         
       var readStat = headers.indexOf("อ่านคิดวิเคราะห์") > -1 ? String(row[headers.indexOf("อ่านคิดวิเคราะห์")]) : 
         getStatStr([
           {col: "อ่านคิดฯ 3", label: "3"}, {col: "อ่านคิดฯ 2", label: "2"}, {col: "อ่านคิดฯ 1", label: "1"}, {col: "อ่านคิดฯ 0", label: "0"}
         ]);

       history.push({
         timestamp: row[0],
         year: String(row[1]),
         semester: String(row[2]),
         round: String(row[3]),
         subject_group: String(row[4]),
         teacher_name: String(row[5]),
         subject_code: String(row[6]),
         class_level: isNewFormat ? String(row[headers.indexOf("ชั้น")]) : "",
         status: String(row[isNewFormat ? 8 : 7]),
         errors: parseInt(row[isNewFormat ? 9 : 8]) || 0,
         warnings: parseInt(row[isNewFormat ? 10 : 9]) || 0,
         total_students: headers.indexOf("จำนวนนักเรียน") > -1 ? row[headers.indexOf("จำนวนนักเรียน")] : 0,
         grades_stat: gradesStat,
         attributes_stat: attrStat,
         reading_stat: readStat
       });
    }
  }
  return history;
}

function getOrCreateFolder(parentFolder, folderName) {
  var folders = parentFolder.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  } else {
    return parentFolder.createFolder(folderName);
  }
}

function cleanStr_(val) {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

var TARGET_SPREADSHEET_ID = "1OJh1FUnvLeIPGls4QIlture5f7GbAM0IieO8J5q9LuQ";

function getSpreadsheet_(data) {
  var id = (data && (data.spreadsheetId || data.spreadsheet_id)) || TARGET_SPREADSHEET_ID;
  if (id) {
    try {
      return SpreadsheetApp.openById(id);
    } catch(err) {
      console.warn("Could not open spreadsheet by ID " + id + ": " + err);
    }
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

/**
 * 🌟 ฟังก์ชันบันทึกและซิงค์ข้อมูลลงแผ่นงาน WP16_งานค้าง (14 คอลัมน์ ตรงตามหัวตารางมาตรฐาน)
 */
function syncWp16Sheet(ss, items, clearAll) {
  try {
    if (!ss) ss = getSpreadsheet_();
    var sheet = ss.getSheetByName("WP16_งานค้าง");
    if (!sheet) {
      sheet = ss.insertSheet("WP16_งานค้าง");
    }

    var expectedHeaders = [
      "เลขเฉพาะ", "ปีการศึกษา", "ภาคเรียน", "รหัสวิชา", "ชื่อวิชา", "ครูผู้สอน", 
      "ชั้น/ห้อง", "เลขประจำตัว", "ชื่อ-นามสกุล", "คะแนนเดิม", "ผลการเรียนเดิม", 
      "งานค้าง", "หมายเหตุ", "วันที่บันทึก"
    ];

    // ตรวจสอบและตั้งค่าหัวตารางแถว 1 ให้ตรงกับ 14 หัวตารางมาตรฐานเสมอ
    sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
    sheet.getRange(1, 1, 1, expectedHeaders.length).setFontWeight("bold").setBackground("#e0f2fe");

    var today = new Date();
    var dateStr = Utilities.formatDate(today, "Asia/Bangkok", "yyyy-MM-dd HH:mm:ss");

    var processedRows = (items || []).map(function(it) {
      var sp = cleanStr_(it.special_id || it.specialId || ((it.subject_code || it.subjCode || '') + (it.student_id || it.stuId || '')));
      var yr = cleanStr_(it.academic_year || it.year || '2569');
      var sem = cleanStr_(it.semester || it.term || '1');
      if (it.year_term && (!it.academic_year || it.academic_year === '')) {
        var parts = String(it.year_term).split('/');
        yr = parts[0] || yr;
        sem = parts[1] || sem;
      }
      return [
        sp,                                                                        // 1. เลขเฉพาะ
        yr,                                                                        // 2. ปีการศึกษา
        sem,                                                                       // 3. ภาคเรียน
        cleanStr_(it.subject_code || it.subjCode),                                 // 4. รหัสวิชา
        cleanStr_(it.subject_name || it.subjName),                                 // 5. ชื่อวิชา
        cleanStr_(it.teacher_name || it.teacherName),                             // 6. ครูผู้สอน
        cleanStr_(it.class_level || it.classLevel),                               // 7. ชั้น/ห้อง
        cleanStr_(it.student_id || it.stuId),                                     // 8. เลขประจำตัว
        cleanStr_(it.student_name || it.stuName),                                 // 9. ชื่อ-นามสกุล
        (it.old_score !== undefined && it.old_score !== null) ? String(it.old_score) : '', // 10. คะแนนเดิม
        cleanStr_(it.old_grade || it.oldGrade || it.grade || 'มส'),                 // 11. ผลการเรียนเดิม
        (it.pending_task !== undefined && it.pending_task !== null) ? String(it.pending_task) : String(it.pendingTask || it.task || ''), // 12. งานค้าง
        cleanStr_(it.remark),                                                      // 13. หมายเหตุ
        cleanStr_(it.updated_at) || dateStr                                       // 14. วันที่บันทึก
      ];
    }).filter(function(r) { return r[0] !== ''; });

    // 🌟 โหมดคลีนทั้งชีต (ล้างแถวเก่าที่เลื่อนทิ้ง แล้วใส่แถวที่ตรงคอลัมน์ลงไปใหม่ทั้งหมด)
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
        status: "success",
        success: true,
        count: processedRows.length,
        message: "ล้างและบันทึกข้อมูลคลีนลงใน WP16_งานค้าง เรียบร้อยแล้ว (" + processedRows.length + " รายการ ตรงตาม 14 หัวตาราง)"
      };
    }

    // โหมดซิงค์แบบ Incremental (Update / Insert ใน batch เดียว)
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
      status: "success",
      success: true,
      count: processedRows.length,
      updatedCount: updatedCount,
      insertedCount: newRows.length,
      message: "บันทึกลงแผ่นงาน WP16_งานค้าง เรียบร้อยแล้ว (อัปเดต " + updatedCount + " รายการ, เพิ่มใหม่ " + newRows.length + " รายการ)"
    };
  } catch (err) {
    return { status: "error", success: false, message: String(err) };
  }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000); // รอสูงสุด 30 วินาทีเพื่อป้องกัน Race Condition
  
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = getSpreadsheet_(data);
    
    // 🌟 0. คำสั่งลบแถวทดสอบ (clean-test-rows)
    if (data.action === "clean-test-rows") {
      var sheet = ss.getSheetByName("WP16_งานค้าง");
      var deleted = 0;
      if (sheet) {
        var lastRow = sheet.getLastRow();
        if (lastRow > 1) {
          var vals = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
          for (var r = vals.length - 1; r >= 0; r--) {
            var val0 = String(vals[r][0] || "").trim();
            if (val0.indexOf("TEST") === 0) {
              sheet.deleteRow(r + 2);
              deleted++;
            }
          }
        }
      }
      SpreadsheetApp.flush();
      return ContentService.createTextOutput(JSON.stringify({ status: "success", deleted: deleted, message: "ลบแถวทดสอบเรียบร้อยแล้ว " + deleted + " แถว" })).setMimeType(ContentService.MimeType.JSON);
    }

    // 🌟 1. ตรวจจับคำสั่งซิงค์ WP16_งานค้าง
    if (data.action === "sync-wp16-sheet" || data.action === "clean-sync-wp16" || data.action === "wp16" || (data.items && !data.pairs)) {
      var clearAll = (data.action === "clean-sync-wp16") || !!data.clearAll;
      var syncResult = syncWp16Sheet(ss, data.items || [], clearAll);
      return ContentService.createTextOutput(JSON.stringify(syncResult)).setMimeType(ContentService.MimeType.JSON);
    }
    
    // 🌟 2. คำสั่งเดิม: บันทึกการส่งเกรด SGS & NextSchool (data.pairs)
    if (!data.pairs) {
      return ContentService.createTextOutput(JSON.stringify({
        "status": "error",
        "message": "ไม่พบข้อมูล pairs หรือ items สำหรับบันทึก"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 🌟 2.1 ซิงค์นักเรียนที่ติด 0, ร, มส, มผ ลงใน WP16_งานค้าง อัตโนมัติทันที
    var failingItems = data.failing_students || data.failingStudents || [];
    if (!failingItems || failingItems.length === 0) {
      for (var pIdx = 0; pIdx < data.pairs.length; pIdx++) {
        if (data.pairs[pIdx].failing_students && data.pairs[pIdx].failing_students.length > 0) {
          failingItems = failingItems.concat(data.pairs[pIdx].failing_students);
        }
      }
    }
    if (failingItems && failingItems.length > 0) {
      try {
        syncWp16Sheet(ss, failingItems, false);
      } catch (errSync) {
        console.warn("Auto-sync failing students error: " + errSync);
      }
    }

    var year = data.academic_year || "2566";
    var sem = data.semester || "1";
    var roundTypeStr = data.round_type === "final" ? "ปลายภาค" : "กลางภาค";
    
    // ค้นหาหรือสร้างโฟลเดอร์ราก (Root Folder)
    var rootFolderId = "1U2m3mnYaJvq4e4e3iGR5QOPrZoDUNPYj";
    var rootFolder;
    try {
      rootFolder = DriveApp.getFolderById(rootFolderId);
    } catch(e) {
      var roots = DriveApp.getFoldersByName("SGS_NextSchool_Reports");
      if(roots.hasNext()) {
        rootFolder = roots.next();
      } else {
        rootFolder = DriveApp.createFolder("SGS_NextSchool_Reports");
      }
    }
    
    // สร้างลำดับชั้นโฟลเดอร์: ปี > เทอม > รอบ
    var yearFolder = getOrCreateFolder(rootFolder, "ปีการศึกษา " + year);
    var semFolder = getOrCreateFolder(yearFolder, "ภาคเรียนที่ " + sem);
    var roundFolder = getOrCreateFolder(semFolder, roundTypeStr);
    
    // ดึง Sheet สำหรับเก็บประวัติ
    var sheet = ss.getSheetByName("History");
    if (!sheet) {
      sheet = ss.getSheets()[0];
      if (sheet.getName() === "Settings" || sheet.getName() === "Teachers" || sheet.getName() === "View_ClassTeacher" || sheet.getName() === "WP16_งานค้าง") {
         sheet = ss.insertSheet("History", 0);
      } else {
         sheet.setName("History");
      }
    }
    
    // ถ้า Sheet ยังว่างเปล่า ให้สร้างหัวตาราง (Headers) 30 คอลัมน์
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "วัน-เวลาที่บันทึก", "ปีการศึกษา", "ภาคเรียน", "รอบประเมิน", 
        "กลุ่มสาระ", "ชื่อครู", "รหัสวิชา", "ชั้น", "สถานะ", "จำนวนจุดผิด (แดง)", "จำนวนจุดสังเกต (เหลือง)",
        "จำนวนนักเรียน", 
        "เกรด 4", "เกรด 3.5", "เกรด 3", "เกรด 2.5", "เกรด 2", "เกรด 1.5", "เกรด 1", "เกรด 0", "ร", "มส", 
        "คุณลักษณะ 3", "คุณลักษณะ 2", "คุณลักษณะ 1", "คุณลักษณะ 0", 
        "อ่านคิดฯ 3", "อ่านคิดฯ 2", "อ่านคิดฯ 1", "อ่านคิดฯ 0",
        "รายละเอียดจุดผิด", "รายละเอียดจุดสังเกต"
      ]);
      sheet.getRange("A1:AF1").setFontWeight("bold").setBackground("#f3f4f6");
    }
    
    // วนลูปรายวิชาที่ส่งมา
    for (var i = 0; i < data.pairs.length; i++) {
      var pair = data.pairs[i];
      var groupName = pair.subject_group || "อื่นๆ";
      var teacherName = pair.teacher_name || "ไม่ระบุชื่อครู";
      
      var classSuffix = pair.class_level ? "_" + pair.class_level.replace(/\//g, "-").replace(/\s+/g, "") : "";
      
      var groupFolder = getOrCreateFolder(roundFolder, groupName);
      var teacherFolder = getOrCreateFolder(groupFolder, teacherName);
      
      if (pair.sgs_pdf_b64) {
         var sgsName = pair.subject_code + classSuffix + "_SGS_ตรวจแล้ว.pdf";
         var existingSgs = teacherFolder.getFilesByName(sgsName);
         while (existingSgs.hasNext()) {
            existingSgs.next().setTrashed(true);
         }
         var sgsBlob = Utilities.newBlob(Utilities.base64Decode(pair.sgs_pdf_b64), 'application/pdf', sgsName);
         teacherFolder.createFile(sgsBlob);
      }
      
      if (pair.nextschool_pdf_b64) {
         var nsOrigName = pair.nextschool_filename || "";
         var nsExt = ".pdf";
         var nsMime = "application/pdf";
         
         if (nsOrigName.toLowerCase().indexOf(".xlsx") > -1) {
            nsExt = ".xlsx";
            nsMime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
         } else if (nsOrigName.toLowerCase().indexOf(".xls") > -1) {
            nsExt = ".xls";
            nsMime = "application/vnd.ms-excel";
         }
         
         var nsName = pair.subject_code + classSuffix + "_NextSchool_ตรวจแล้ว" + nsExt;
         var existingNs = teacherFolder.getFilesByName(nsName);
         while (existingNs.hasNext()) {
            existingNs.next().setTrashed(true);
         }
         var nsBlob = Utilities.newBlob(Utilities.base64Decode(pair.nextschool_pdf_b64), nsMime, nsName);
         teacherFolder.createFile(nsBlob);
      }
      
      var errorCount = pair.results.errors ? pair.results.errors.length : 0;
      var warningCount = pair.results.warnings ? pair.results.warnings.length : 0;
      var status = (errorCount > 0) ? "❌ ต้องแก้ไข" : (warningCount > 0 ? "⚠️ มีจุดสังเกต" : "✅ สมบูรณ์ 100%");
      
      var stats = pair.stats || {};
      var formatStats = function(obj) {
         if (!obj) return "-";
         var keys = Object.keys(obj).sort(function(a,b) {
            var numA = parseFloat(a); var numB = parseFloat(b);
            if (!isNaN(numA) && !isNaN(numB)) return numB - numA;
            return a.localeCompare(b);
         });
         var parts = [];
         for (var k=0; k<keys.length; k++) {
            parts.push(keys[k] + "=" + obj[keys[k]]);
         }
         return parts.join(", ");
      };
      
      var formatIssues = function(issues) {
         if (!issues || issues.length === 0) return "-";
         var parts = [];
         for (var k=0; k < issues.length; k++) {
            var issue = issues[k];
            var txt = (issue.student_id && issue.student_id !== "-" ? ("[" + issue.student_id + "] " + (issue.name || "") + ": ") : "") + issue.message;
            parts.push(txt);
         }
         return parts.join("\n");
      };
      
      var errorsStr = formatIssues(pair.results.errors);
      var warningsStr = formatIssues(pair.results.warnings);
      
      var attrsStr = formatStats(stats.attributes);
      var readStr = formatStats(stats.reading);
      var totalStudents = stats.total_students || 0;
      
      var g = stats.grades || {};
      var g4 = g["4"] || g["4.0"] || g["4.00"] || 0;
      var g35 = g["3.5"] || g["3.50"] || 0;
      var g3 = g["3"] || g["3.0"] || g["3.00"] || 0;
      var g25 = g["2.5"] || g["2.50"] || 0;
      var g2 = g["2"] || g["2.0"] || g["2.00"] || 0;
      var g15 = g["1.5"] || g["1.50"] || 0;
      var g1 = g["1"] || g["1.0"] || g["1.00"] || 0;
      var g0 = g["0"] || g["0.0"] || g["0.00"] || 0;
      var gr = g["ร"] || 0;
      var gms = g["มส"] || 0;

      var attrs = stats.attributes || {};
      var a3 = attrs["3"] || attrs["3.0"] || 0;
      var a2 = attrs["2"] || attrs["2.0"] || 0;
      var a1 = attrs["1"] || attrs["1.0"] || 0;
      var a0 = attrs["0"] || attrs["0.0"] || 0;

      var reads = stats.reading || {};
      var r3 = reads["3"] || reads["3.0"] || 0;
      var r2 = reads["2"] || reads["2.0"] || 0;
      var r1 = reads["1"] || reads["1.0"] || 0;
      var r0 = reads["0"] || reads["0.0"] || 0;

      sheet.appendRow([
        new Date(),
        year,
        sem,
        roundTypeStr,
        groupName,
        teacherName,
        pair.subject_code,
        pair.class_level || "",
        status,
        errorCount,
        warningCount,
        totalStudents,
        g4, g35, g3, g25, g2, g15, g1, g0, gr, gms,
        a3, a2, a1, a0,
        r3, r2, r1, r0,
        errorsStr,
        warningsStr
      ]);
    }
    
    return ContentService.createTextOutput(JSON.stringify({"status": "success"})).setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({"status": "error", "message": String(err)})).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function testDrivePermission() {
  DriveApp.getFiles();
}