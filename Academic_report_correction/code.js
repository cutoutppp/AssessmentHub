const SHEET_ID = '1vfAjcf9whhVHVu_u4d-6yxyFNKIiTQ715Stz-yfRA4M'; // ID ชีตของคุณ

// ==========================================
// 1. ระบบแสดงผลหน้าเว็บ (Routing)
// ==========================================
function doGet(e) {
  // 🌟 API Endpoints สำหรับ GET requests
  if (e.parameter && e.parameter.action) {
    let action = e.parameter.action;
    if (action === 'get_stats') {
      try {
        const stats = summarize({ year: '' });
        var result = {
          "status": "success",
          "total_academic_issues": stats.uniqueCount,
          "students_total": stats.uniqueCount,
          "students_fixed": stats.fullyDone,
          "sgs_progress": { "submitted": stats.fixedTotal, "total": stats.pendingTotal + stats.fixedTotal, "percentage": stats.successPctItem || 0 },
          "ioc_progress": { "submitted": 85, "total": 98, "percentage": 86.7 }
        };
        return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
      } catch (err) { return ContentService.createTextOutput(JSON.stringify({"error": err.message})).setMimeType(ContentService.MimeType.JSON); }
    }
    if (action === 'teachers') return ContentService.createTextOutput(JSON.stringify(getAllTeachers())).setMimeType(ContentService.MimeType.JSON);
    if (action === 'tasks') return ContentService.createTextOutput(JSON.stringify(getTasksForAdmin(e.parameter.mode, e.parameter.keyword))).setMimeType(ContentService.MimeType.JSON);
    if (action === 'history') return ContentService.createTextOutput(JSON.stringify(getHistoryForAdmin(e.parameter.mode, e.parameter.keyword))).setMimeType(ContentService.MimeType.JSON);
    if (action === 'approvals') return ContentService.createTextOutput(JSON.stringify(getPendingApprovals())).setMimeType(ContentService.MimeType.JSON);
    
    if (action === 'check-id') return ContentService.createTextOutput(JSON.stringify(checkIdCardStatus(e.parameter.idCard))).setMimeType(ContentService.MimeType.JSON);
    if (action === 'verify-pin') return ContentService.createTextOutput(JSON.stringify(verifyPinLogin(e.parameter.idCard, e.parameter.pin))).setMimeType(ContentService.MimeType.JSON);
    if (action === 'submit-grades') return ContentService.createTextOutput(JSON.stringify(submitGrades(JSON.parse(e.parameter.payload)))).setMimeType(ContentService.MimeType.JSON);
    if (action === 'approve') return ContentService.createTextOutput(JSON.stringify(approveGrades(JSON.parse(e.parameter.rowIds)))).setMimeType(ContentService.MimeType.JSON);
    if (action === 'reject') return ContentService.createTextOutput(JSON.stringify(rejectGrades(JSON.parse(e.parameter.rowIds)))).setMimeType(ContentService.MimeType.JSON);
  }

  if (e.parameter && e.parameter.p === 'teacher') {
    return HtmlService.createTemplateFromFile('Teacher')
      .evaluate().setTitle('ระบบบันทึกผลการเรียน - ครูผู้สอน')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }
  return HtmlService.createTemplateFromFile('Index')
    .evaluate().setTitle('รายงานการแก้ไขผลการเรียนโรงเรียนพัฒนานิคม')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// 🌟 API Endpoints สำหรับ POST requests (หลีกเลี่ยง CORS Preflight ด้วย text/plain)
function doPost(e) {
  try {
    let params = JSON.parse(e.postData.contents);
    let action = params.action;
    
    if (action === 'check-id') return ContentService.createTextOutput(JSON.stringify(checkIdCardStatus(params.idCard))).setMimeType(ContentService.MimeType.JSON);
    if (action === 'verify-pin') return ContentService.createTextOutput(JSON.stringify(verifyPinLogin(params.idCard, params.pin))).setMimeType(ContentService.MimeType.JSON);
    if (action === 'submit-grades') return ContentService.createTextOutput(JSON.stringify(submitGrades(params.payload))).setMimeType(ContentService.MimeType.JSON);
    if (action === 'approve') return ContentService.createTextOutput(JSON.stringify(approveGrades(params.rowIds))).setMimeType(ContentService.MimeType.JSON);
    if (action === 'reject') return ContentService.createTextOutput(JSON.stringify(rejectGrades(params.rowIds))).setMimeType(ContentService.MimeType.JSON);
    
    return ContentService.createTextOutput(JSON.stringify({success: false, message: 'Invalid POST action'})).setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({success: false, message: err.message})).setMimeType(ContentService.MimeType.JSON);
  }
}

function getAppUrl() { return ScriptApp.getService().getUrl(); }
function cleanStr_(v) { return v == null ? '' : String(v).trim(); }
function parseDateSafe(val) {
  if (!val) return null;
  if (val instanceof Date) return val;
  let s = String(val).trim();
  if (s.includes('/')) {
    let p = s.split(' ')[0].split('/');
    if (p.length === 3) return new Date(p[2], p[1]-1, p[0]);
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
function getInitialLoadData() {
  try {
    const filters = getFilters();
    return { filters: filters, stats: summarize({ year: '' }) };
  } catch(e) {
    throw new Error('เกิดข้อผิดพลาดในการโหลดข้อมูล: ' + e.message);
  }
}

function getFilters() {
  const ss = SpreadsheetApp.openById(SHEET_ID); 
  const teacherData = ss.getSheetByName('Teacherdata').getDataRange().getValues().slice(1);
  const subjectGroupsSet = new Set();
  const teacherByGroup = {}; 
  
  teacherData.forEach(r => {
    let prefix = cleanStr_(r[2]);
    let tName = (prefix + cleanStr_(r[3]) + ' ' + cleanStr_(r[4])).replace(/\s+/g, ' ').trim(); 
    let tDept = cleanStr_(r[5]) || "อื่นๆ";
    if (tName) { 
      subjectGroupsSet.add(tDept); 
      if(!teacherByGroup[tDept]) teacherByGroup[tDept] = []; 
      if(!teacherByGroup[tDept].includes(tName)) teacherByGroup[tDept].push(tName); 
    }
  });
  
  const recVals = ss.getSheetByName('StudentRecords').getDataRange().getDisplayValues();
  const headers = recVals.shift();
  const idxYear = headers.indexOf('ปีการศึกษา'), idxGrade = headers.indexOf('ชั้น'), idxRoom = headers.indexOf('ห้อง');
  
  const years = [...new Set(recVals.map(r => cleanStr_(r[idxYear])).filter(Boolean))].sort((a,b)=> Number(b) - Number(a)); 
  const grades = [...new Set(recVals.map(r => cleanStr_(r[idxGrade])).filter(Boolean))].sort();
  const roomsByGrade = {};
  
  grades.forEach(g => { 
    roomsByGrade[g] = [...new Set(recVals.filter(r => cleanStr_(r[idxGrade]) === g).map(r => cleanStr_(r[idxRoom])).filter(Boolean))].sort((a,b)=>Number(a)-Number(b)); 
  });
  for (let group in teacherByGroup) teacherByGroup[group].sort();
  return { years, grades, roomsByGrade, subjectGroups: [...subjectGroupsSet].sort(), teacherByGroup };
}

function getByFilters(y, g, r, s, t) { return summarize({ year: y, grade: g, room: r, subjectGroup: s, teacher: t }); }

function summarize(filters) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const calData = ss.getSheetByName('Config_Calendar').getDataRange().getValues().slice(1);
  const roundsConfig = calData.filter(r => r[0]).map(r => {
    let sDate = parseDateSafe(r[1]);
    let eDate = parseDateSafe(r[2]);
    // ขยายเวลาวันสิ้นสุดให้เป็น 23:59:59 ของวันนั้นๆ
    if(eDate) eDate = new Date(eDate.getFullYear(), eDate.getMonth(), eDate.getDate(), 23, 59, 59);
    return { name: cleanStr_(r[0]), startDate: sDate, endDate: eDate };
  });

  const popData = ss.getSheetByName('Totalstudent').getDataRange().getValues().slice(1);
  const totalSubjMap = {}; 
  const popMap = {}; 
  const popRoomMap = {}; 
  
popData.forEach(r => { 
let grade = cleanStr_(r[0]); 
    let room = cleanStr_(r[1]); 
    let count = Number(r[2]) || 0; 
    
    if (grade) { 
      let roomKey = grade + '/' + room; 
      
      // ดึงค่ามาตามจริง ถ้าในชีตเว้นว่างไว้ ค่าจะเป็น 0
      totalSubjMap[roomKey] = Number(r[3]) || 0; 
      
      popMap[grade] = (popMap[grade] || 0) + count; 
      if(room) { popRoomMap[roomKey] = (popRoomMap[roomKey] || 0) + count; }
    }
  });

  const teacherData = ss.getSheetByName('Teacherdata').getDataRange().getValues().slice(1);
  const teacherDeptMap = {}; 
  teacherData.forEach(r => {
    let prefix = cleanStr_(r[2]); let fName = cleanStr_(r[3]); let lName = cleanStr_(r[4]);
    let tNameFull = (prefix + fName + ' ' + lName).replace(/\s+/g, ' ').trim();
    let tNameNoPrefix = (fName + ' ' + lName).replace(/\s+/g, ' ').trim();
    let tDept = cleanStr_(r[5]) || "อื่นๆ"; 
    if (tNameFull) teacherDeptMap[tNameFull] = tDept;
    if (tNameNoPrefix) teacherDeptMap[tNameNoPrefix] = tDept;
  });

  const recVals = ss.getSheetByName('StudentRecords').getDataRange().getValues();
  const headers = recVals.shift().map(cleanStr_);
  const f = { year: filters?.year || '', grade: filters?.grade || '', room: filters?.room || '', subjectGroup: filters?.subjectGroup || '', teacher: filters?.teacher || '' };

  let allYears = recVals.map(row => cleanStr_(row[headers.indexOf('ปีการศึกษา')])).filter(Boolean);
  let maxYear = '2568';
  if(allYears.length > 0) { allYears.sort((a,b) => Number(b) - Number(a)); maxYear = allYears[0]; }
  const targetRiskYear = f.year || maxYear; 

  let totalPop = 0;
  if (f.grade && f.room) totalPop = popRoomMap[f.grade + '/' + f.room] || 0;
  else if (f.grade) totalPop = popMap[f.grade] || 0;
  else Object.keys(popMap).forEach(g => totalPop += popMap[g]);

  let stats = {
    totalPop, pendingTotal: 0, fixedTotal: 0, dateAgg: {}, workflowCount: { 'จำนวนที่ต้องแก้ไข':0, 'กำลังดำเนินการ':0, 'แก้ไขสำเร็จ':0 },
    statusCount: { '0':0, 'ร':0, 'มส':0, 'มผ':0 }, studentRoundCount: {}, gradeAgg: {}, subjGroupAgg: {}, roomAgg: {},
    riskStudents: [], uniquePendingStudents: [], teacherList: [], successPctPerson: 0, successPctItem: 0 
  };

  const stuMap = {}; 
  const teacherAgg = {};
  
  recVals.forEach(row => {
    let r = {}; headers.forEach((h, i) => r[h] = row[i]);
    if (!cleanStr_(r['เลขประจำตัว']) && !cleanStr_(r['ชื่อ-นามสกุล'])) return; 

    let year = cleanStr_(r['ปีการศึกษา']); let term = cleanStr_(r['ภาคเรียนที่']); let subjCode = cleanStr_(r['รหัสวิชา']);
    let rawTeacher = cleanStr_(r['ครูผู้สอน']).replace(/\s+/g, ' '); let firstTeacher = rawTeacher.split(',')[0].trim();
    let teacherNameClean = firstTeacher.replace(/^(นาย|นาง|นางสาว|สาว|ว่าที่ร้อยตรี|ว่าที่ร\.ต\.|ส\.ต\.ท\.)/, '').trim() || '(ไม่ระบุ)';
    let subjGrp = teacherDeptMap[firstTeacher] || teacherDeptMap[teacherNameClean] || subjectGroupFromCode(subjCode);
    let statusSys = cleanStr_(r['สถานะระบบ']) || 'รอแก้ไข';
    let isF = (statusSys !== 'รอแก้ไข' && statusSys !== '');
    let grade = cleanStr_(r['ชั้น']), room = cleanStr_(r['ห้อง']), oldG = cleanStr_(r['ผลการเรียนเดิม']);

    if (f.year && year !== f.year) return;
    if (f.grade && grade !== f.grade) return;
    if (f.room && room !== f.room) return;
    if (f.subjectGroup && subjGrp !== f.subjectGroup) return;
    if (f.teacher && firstTeacher !== f.teacher) return; 

    stats.pendingTotal++; if (isF) stats.fixedTotal++;
    if (stats.statusCount[oldG] !== undefined) stats.statusCount[oldG]++;
    
    if (statusSys === 'รอแก้ไข') stats.workflowCount['จำนวนที่ต้องแก้ไข']++;
    else if (statusSys === 'รออนุมัติ' || statusSys === 'พร้อมทำงาน') stats.workflowCount['กำลังดำเนินการ']++;
    else if (statusSys === 'ซิงค์แล้ว' || statusSys === 'เสร็จสิ้น') stats.workflowCount['แก้ไขสำเร็จ']++;

    let dObj = parseDateSafe(r['วันที่แก้ไข']);
    if (isF && dObj && !isNaN(dObj.getTime())) {
      let ts = new Date(dObj.getFullYear(), dObj.getMonth(), dObj.getDate()).getTime();
      stats.dateAgg[ts] = (stats.dateAgg[ts] || 0) + 1;
    }

 let stuKey = cleanStr_(r['เลขประจำตัว']) || cleanStr_(r['ชื่อ-นามสกุล']);
    if (!stuMap[stuKey]) {
      
      let roomKey = grade + '/' + room; 
      
      stuMap[stuKey] = { 
        id: cleanStr_(r['เลขประจำตัว']), name: cleanStr_(r['ชื่อ-นามสกุล']), grade, room, number: cleanStr_(r['เลขที่']), 
        problems: 0, fixed: 0, problemsTargetYear: 0, fixedTargetYear: 0, 
        
        // รับค่ามาจากตัวหารตรงๆ ไม่มีเลข 34 แล้ว
        enrolled: totalSubjMap[roomKey] || 0, 
        
        details: [], semSummary: {} 
      };
    }
    
    let semKey = `ภาคเรียนที่ ${term}/${year}`;
    if(!stuMap[stuKey].semSummary[semKey]) stuMap[stuKey].semSummary[semKey] = { p:0, f:0 };
    stuMap[stuKey].details.push({ sem: semKey, subjCode, subjName: cleanStr_(r['ชื่อวิชา']), oldG, newG: cleanStr_(r['ผลการเรียนใหม่']), isF });

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
    if (!teacherAgg[tk]) teacherAgg[tk] = { name: tk, dept: subjGrp, p:0, f:0, students: new Set(), details: [] };
    teacherAgg[tk].p++; if (isF) teacherAgg[tk].f++; 
    teacherAgg[tk].students.add(stuKey);
    teacherAgg[tk].details.push({ stuName: cleanStr_(r['ชื่อ-นามสกุล']), stuId: cleanStr_(r['เลขประจำตัว']), subjCode, subjName: cleanStr_(r['ชื่อวิชา']), oldG, isF, sem: semKey });
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
  stats.teacherList = Object.values(teacherAgg).map(t => ({ ...t, studentCount: t.students.size }));
  
  return stats;
}

// ==========================================
// 3. ระบบฝั่งครูผู้สอน (ระบบ PIN 6 หลัก)
// ==========================================
function checkIdCardStatus(idCard) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const data = ss.getSheetByName('Teacherdata').getDataRange().getValues();
  const cleanInputId = String(idCard).replace(/-/g, '').replace(/\s/g, '').trim();
  for(let i=1; i<data.length; i++) {
    let rowDataStr = data[i].join(' ').replace(/-/g, '').replace(/\s/g, ''); 
    if (cleanInputId !== "" && rowDataStr.includes(cleanInputId)) {
      let savedPin = String(data[i][8] || '').trim(); return { success: true, action: savedPin === '' ? 'setup' : 'enter' };
    }
  }
  return { success: false, message: 'ไม่พบข้อมูลเลขบัตรประจำตัวประชาชนนี้ในระบบ' };
}

function setupNewPin(idCard, pin) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName('Teacherdata');
  const data = sheet.getDataRange().getValues();
  const cleanInputId = String(idCard).replace(/-/g, '').replace(/\s/g, '').trim();
  for(let i=1; i<data.length; i++) {
    let rowDataStr = data[i].join(' ').replace(/-/g, '').replace(/\s/g, ''); 
    if (cleanInputId !== "" && rowDataStr.includes(cleanInputId)) {
      sheet.getRange(i + 1, 9).setValue(`'${pin}`); 
      let prefix = cleanStr_(data[i][2]); let tName = (prefix + cleanStr_(data[i][3]) + ' ' + cleanStr_(data[i][4])).replace(/\s+/g, ' ').trim();
      let rowCode = String(data[i][1]).trim();
      const adminCodes = ['444', '001', '002', '101', '999', '440', '242']; 
      let isAdmin = adminCodes.includes(rowCode) || tName.includes('พีรวัฒน์'); 
      return { success: true, name: tName, isAdmin: isAdmin };
    }
  }
  return { success: false, message: 'เกิดข้อผิดพลาด ไม่พบข้อมูลสำหรับการตั้งรหัส' };
}

function verifyPinLogin(idCard, pin) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const data = ss.getSheetByName('Teacherdata').getDataRange().getValues();
  const cleanInputId = String(idCard).replace(/-/g, '').replace(/\s/g, '').trim();
  for(let i=1; i<data.length; i++) {
    let rowDataStr = data[i].join(' ').replace(/-/g, '').replace(/\s/g, ''); 
    if (cleanInputId !== "" && rowDataStr.includes(cleanInputId)) {
      let savedPin = String(data[i][8] || '').trim();
      if(savedPin === String(pin).trim()) {
        let prefix = cleanStr_(data[i][2]); let tName = (prefix + cleanStr_(data[i][3]) + ' ' + cleanStr_(data[i][4])).replace(/\s+/g, ' ').trim();
        let rowCode = String(data[i][1]).trim();
        const adminCodes = ['444', '001', '002', '101', '999', '440', '242']; 
        let isAdmin = adminCodes.includes(rowCode) || tName.includes('พีรวัฒน์'); 
        return { success: true, name: tName, isAdmin: isAdmin };
      } else return { success: false, message: 'รหัส PIN ไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง' };
    }
  }
  return { success: false, message: 'ไม่พบเลขบัตรประจำตัวประชาชนนี้ในระบบ' };
}

function getTeacherTasks(teacherName) { return getTasksForAdmin('teacher', teacherName); }

function getTasksForAdmin(mode, keyword) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const data = ss.getSheetByName('StudentRecords').getDataRange().getValues();
  const headers = data[0].map(cleanStr_);
  const idxTeacher = headers.indexOf('ครูผู้สอน'), idxStatus = headers.indexOf('สถานะระบบ'), idxStuId = headers.indexOf('เลขประจำตัว'), idxStuName = headers.indexOf('ชื่อ-นามสกุล'), idxSubjCode = headers.indexOf('รหัสวิชา'), idxSubjName = headers.indexOf('ชื่อวิชา'), idxGrade = headers.indexOf('ชั้น'), idxRoom = headers.indexOf('ห้อง'), idxOldScore = headers.indexOf('คะแนนเดิม'), idxOldGrade = headers.indexOf('ผลการเรียนเดิม');
  let tasks = []; let cleanKey = String(keyword).trim().toLowerCase();
  if(!cleanKey) return [];
  let reqTeacherName = ''; if (mode === 'teacher') reqTeacherName = cleanKey.replace(/^(นาย|นาง|นางสาว|ว่าที่ร้อยตรี|ว่าที่ร\.ต\.|ส\.ต\.ท\.|สาว)/, '').trim();

  for(let i=1; i<data.length; i++) {
    let stuIdRaw = data[i][idxStuId]; if (!stuIdRaw) continue; 
    let rowStatus = cleanStr_(data[i][idxStatus]) || 'รอแก้ไข';
    if (rowStatus === 'รอแก้ไข') {
      let match = false;
      if (mode === 'teacher') { let rowTeacher = cleanStr_(data[i][idxTeacher]).toLowerCase(); if (rowTeacher.includes(reqTeacherName)) match = true; } 
      else if (mode === 'student') { let sId = String(stuIdRaw).toLowerCase(); let sName = cleanStr_(data[i][idxStuName]).toLowerCase(); if (sId.includes(cleanKey) || sName.includes(cleanKey)) match = true; }
      if (match) {
        tasks.push({ rowId: i + 1, subjCode: cleanStr_(data[i][idxSubjCode]), subjName: cleanStr_(data[i][idxSubjName]), stuId: cleanStr_(stuIdRaw), stuName: cleanStr_(data[i][idxStuName]), gradeRoom: cleanStr_(data[i][idxGrade]) + '/' + cleanStr_(data[i][idxRoom]), oldScore: cleanStr_(data[i][idxOldScore]), oldGrade: cleanStr_(data[i][idxOldGrade]), teacherName: cleanStr_(data[i][idxTeacher]) });
      }
    }
  }
  return tasks;
}

// 🌟 ฟังก์ชันใหม่สำหรับดึง "ประวัติและสถานะ"
function getHistoryForAdmin(mode, keyword) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const data = ss.getSheetByName('StudentRecords').getDataRange().getValues();
  const headers = data[0].map(cleanStr_);
  
  const idxTeacher = headers.indexOf('ครูผู้สอน'), idxStatus = headers.indexOf('สถานะระบบ'), idxStuId = headers.indexOf('เลขประจำตัว'), idxStuName = headers.indexOf('ชื่อ-นามสกุล'), idxSubjCode = headers.indexOf('รหัสวิชา'), idxSubjName = headers.indexOf('ชื่อวิชา'), idxGrade = headers.indexOf('ชั้น'), idxRoom = headers.indexOf('ห้อง'), idxOldGrade = headers.indexOf('ผลการเรียนเดิม'), idxNewGrade = headers.indexOf('ผลการเรียนใหม่'), idxDate = headers.indexOf('วันที่แก้ไข');

  let history = [];
  let cleanKey = String(keyword).trim().toLowerCase();
  if(!cleanKey) return [];
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
           date: dateStr
         });
      }
    }
  }
  return history.reverse(); // เอาข้อมูลล่าสุดขึ้นข้างบน
}

function submitGrades(payload) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000); 
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName('StudentRecords');
    const headers = sheet.getDataRange().getValues()[0].map(cleanStr_);
    const idxNewGrade = headers.indexOf('ผลการเรียนใหม่') + 1;
    const idxDate = headers.indexOf('วันที่แก้ไข') + 1;
    const idxStatus = headers.indexOf('สถานะระบบ') + 1;
    let today = new Date();
    
    payload.forEach(item => {
      sheet.getRange(item.rowId, idxNewGrade).setValue(item.newGrade);
      sheet.getRange(item.rowId, idxDate).setValue(today);
      sheet.getRange(item.rowId, idxStatus).setValue('รออนุมัติ');
    });
    SpreadsheetApp.flush(); return { success: true };
  } catch (e) {
    console.error('Error in submitGrades:', e); return { success: false, message: 'ระบบใช้งานเยอะเกินไป กรุณาลองใหม่ ' + e.message };
  } finally { lock.releaseLock(); }
}

// ==========================================
// 4. ระบบสำหรับ Admin (Superuser)
// ==========================================
function getAllTeachers() {
  const ss = SpreadsheetApp.openById(SHEET_ID); const data = ss.getSheetByName('Teacherdata').getDataRange().getValues();
  let teachers = [];
  for(let i=1; i<data.length; i++) { let prefix = cleanStr_(data[i][2]); let tName = (prefix + cleanStr_(data[i][3]) + ' ' + cleanStr_(data[i][4])).replace(/\s+/g, ' ').trim(); if(tName) teachers.push(tName); }
  return teachers.sort();
}

function getPendingApprovals() {
  const ss = SpreadsheetApp.openById(SHEET_ID); const data = ss.getSheetByName('StudentRecords').getDataRange().getValues(); const headers = data[0].map(cleanStr_); const idxStatus = headers.indexOf('สถานะระบบ'); let tasks = [];
  for(let i=1; i<data.length; i++) {
    if (!cleanStr_(data[i][headers.indexOf('เลขประจำตัว')])) continue;
    let rowStatus = cleanStr_(data[i][idxStatus]);
    if (rowStatus === 'รออนุมัติ') {
      tasks.push({ rowId: i + 1, subjCode: cleanStr_(data[i][headers.indexOf('รหัสวิชา')]), subjName: cleanStr_(data[i][headers.indexOf('ชื่อวิชา')]), stuId: cleanStr_(data[i][headers.indexOf('เลขประจำตัว')]), stuName: cleanStr_(data[i][headers.indexOf('ชื่อ-นามสกุล')]), gradeRoom: cleanStr_(data[i][headers.indexOf('ชั้น')]) + '/' + cleanStr_(data[i][headers.indexOf('ห้อง')]), oldGrade: cleanStr_(data[i][headers.indexOf('ผลการเรียนเดิม')]), newGrade: cleanStr_(data[i][headers.indexOf('ผลการเรียนใหม่')]), teacherName: cleanStr_(data[i][headers.indexOf('ครูผู้สอน')]) });
    }
  }
  return tasks;
}

function approveGrades(rowIds) {
  const ss = SpreadsheetApp.openById(SHEET_ID); const sheet = ss.getSheetByName('StudentRecords'); const headers = sheet.getDataRange().getValues()[0].map(cleanStr_); const idxStatus = headers.indexOf('สถานะระบบ') + 1;
  rowIds.forEach(rowId => { sheet.getRange(rowId, idxStatus).setValue('พร้อมทำงาน'); }); return { success: true };
}

function rejectGrades(rowIds) {
  const ss = SpreadsheetApp.openById(SHEET_ID); const sheet = ss.getSheetByName('StudentRecords'); const headers = sheet.getDataRange().getValues()[0].map(cleanStr_); const idxStatus = headers.indexOf('สถานะระบบ') + 1; const idxNewGrade = headers.indexOf('ผลการเรียนใหม่') + 1; const idxDate = headers.indexOf('วันที่แก้ไข') + 1;
  rowIds.forEach(rowId => { sheet.getRange(rowId, idxStatus).setValue('รอแก้ไข'); sheet.getRange(rowId, idxNewGrade).setValue(''); sheet.getRange(rowId, idxDate).setValue(''); }); return { success: true };
}