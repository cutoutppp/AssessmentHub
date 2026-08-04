"use client";

import { useState, useRef, useEffect, Suspense } from 'react';
import { UploadCloud, CheckCircle2, AlertTriangle, XCircle, FileSpreadsheet, Loader2, User } from 'lucide-react';
import Link from 'next/link';

const GAS_URL = 'https://script.google.com/macros/s/AKfycbwEwZ_8ZKA7K9qeeUX1b00ddGWNtOM1Hd2wcoqGfOsPaKlu4pl9oDSczsW4ckZsoEHz/exec';

function DashboardContent() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: upload, 2: preview
  const [submissionMode, setSubmissionMode] = useState(2); // 1: round 1, 2: round 2
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null); // { current: 1, total: 3, filename: '' }
  
  const [metaData, setMetaData] = useState(null); // courseCode, classRoom, etc.
  const [masterData, setMasterData] = useState(null); // totalHours, teacherName, courseName
  const [students, setStudents] = useState([]);
  
  // Mock Login State
  const [teachersList, setTeachersList] = useState([]);
  const [loggedInTeacher, setLoggedInTeacher] = useState('');
  const [isInitializing, setIsInitializing] = useState(true);
  const [overviewHref, setOverviewHref] = useState('/overview');
  const [dashboardHref, setDashboardHref] = useState('/dashboard');
  const [dashboardData, setDashboardData] = useState(null);
  const [teacherCourses, setTeacherCourses] = useState([]);
  const [teacherReport, setTeacherReport] = useState(null); // To view submitted students
  const [loadingReport, setLoadingReport] = useState(false);
  
  // Timeframe State
  const [timeframeState, setTimeframeState] = useState({ phase: 1, message: 'กำลังโหลดข้อมูลเวลา...' });
  
  // Update Status State
  const [editingStudent, setEditingStudent] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  
  // Confirm Modal State
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', isZero: false, count: 0 });
  
  // Alert Modal State
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '', type: 'error' }); // type: 'error' | 'success' | 'warning'
  
  const showAlert = (message, type = 'error', title = null) => {
    let defaultTitle = 'แจ้งเตือน';
    if (!title) {
      if (type === 'error') defaultTitle = 'เกิดข้อผิดพลาด';
      if (type === 'success') defaultTitle = 'สำเร็จ';
      if (type === 'warning') defaultTitle = 'ข้อควรระวัง';
    }
    setAlertModal({ isOpen: true, title: title || defaultTitle, message, type });
  };
  
  const fileInputRef = useRef(null);

  const fetchDashboardData = async () => {
    try {
      const [dashRes, configRes] = await Promise.all([
        fetch(`${GAS_URL}?action=getDashboardData`),
        fetch(`${GAS_URL}?action=getConfig`)
      ]);
      
      const json = await dashRes.json();
      const configJson = await configRes.json();
      
      if (configJson.success) {
        const now = new Date();
        let p1Date, p2Date;
        configJson.config.forEach(c => {
           if (c.Key === 'Phase1_Deadline') p1Date = new Date(c.Value);
           if (c.Key === 'Phase2_Deadline') p2Date = new Date(c.Value);
           if (c.Key === 'Submission_Mode') setSubmissionMode(parseInt(c.Value) || 2);
        });
        
        if (p1Date && now <= p1Date) {
           setTimeframeState({ phase: 1, message: `เปิดรับรายงานผล มส. ถึงวันที่ ${p1Date.toLocaleDateString('th-TH')}` });
        } else if (p1Date && p2Date && now <= p2Date) {
           setTimeframeState({ phase: 2, message: `ปิดรับรายงานผล มส. แล้ว - ขณะนี้อยู่ในช่วงยื่นคำร้อง (ถึงวันที่ ${p2Date.toLocaleDateString('th-TH')})` });
        } else {
           setTimeframeState({ phase: 3, message: 'ปิดระบบการรายงานผลและยื่นคำร้องแก้ มส. เรียบร้อยแล้ว' });
        }
      }

      if (json.success && json.courses) {
        setDashboardData(json);
        const urlParams = new URLSearchParams(window.location.search);
        const teacherId = urlParams.get('id');
        if (teacherId) {
          const teacherCourse = json.courses.find(c => String(c['รหัสครู']) === String(teacherId));
          if (teacherCourse) {
            const fullName = `${teacherCourse['คำนำหน้า']}${teacherCourse['ชื่อ']} ${teacherCourse['นามสกุล']}`;
            setLoggedInTeacher(fullName);
          } else {
             showAlert('ไม่พบข้อมูลรายวิชาของคุณครูในระบบ ม.ส. (หรือยังไม่มีข้อมูลจากวิชาการ)', 'error', 'ไม่พบข้อมูล');
          }
        } else {
          showAlert('กรุณาเข้าสู่ระบบผ่านหน้า TeacherHub', 'error', 'ไม่ได้รับอนุญาต');
        }
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setIsInitializing(false);
    }
  };

  // Fetch teachers and config
  useEffect(() => {
    fetchDashboardData();
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const id = urlParams.get('id');
      if (id) {
        setOverviewHref(`/overview?id=${id}`);
        setDashboardHref(`/dashboard?id=${id}`);
      }
    }
  }, []);

  // Compute courses for the selected teacher
  useEffect(() => {
    if (loggedInTeacher && dashboardData) {
      const courses = dashboardData.courses.filter(c => `${c['คำนำหน้า']}${c['ชื่อ']} ${c['นามสกุล']}` === loggedInTeacher);
      
      const processedCourses = courses.map(course => {
        const roomStr = String(course['ชั้น']) + '/' + String(course['กลุ่ม-ห้อง']);
        const courseCode = course['รหัสวิชา'];
        
        // Use same robust log-finding logic as Dashboard
        const log = dashboardData.statuses.find(s => {
          const isShifted = s['ครูผู้สอน'] === 'ส่งแล้ว';
          let sLevel = isShifted ? String(s['ชื่อวิชา'] || '') : String(s['ชั้น'] || '');
          let sRoom = isShifted ? String(s['ชั้น'] || '') : String(s['กลุ่ม-ห้อง'] || '');
          let sStatus = isShifted ? String(s['ครูผู้สอน'] || '') : String(s['สถานะการส่ง'] || '');
          
          sLevel = sLevel.replace(/^ม\./, '').trim();
          const courseLevel = String(course['ชั้น']).replace(/^ม\./, '').trim();
          
          return s['รหัสวิชา'] === courseCode && 
                 sLevel === courseLevel && 
                 sRoom.trim() === String(course['กลุ่ม-ห้อง']).trim() &&
                 sStatus === 'ส่งแล้ว';
        });
        
        return {
          courseCode,
          courseName: course['วิชา'],
          room: roomStr,
          classRoom: `${course['ชั้น']}/${course['กลุ่ม-ห้อง']}`,
          status: log ? 'ส่งแล้ว' : 'ยังไม่ส่ง'
        };
      });
      
      setTeacherCourses(processedCourses);
      setTeacherReport(null); // Reset report when changing teacher
    } else {
      setTeacherCourses([]);
      setTeacherReport(null);
    }
  }, [loggedInTeacher, dashboardData]);

  const fetchStudentReport = async (courseCode, classRoom) => {
    setLoadingReport(true);
    setTeacherReport(null);
    try {
      const res = await fetch(GAS_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'getTeacherReport', teacherName: loggedInTeacher })
      });
      const json = await res.json();
      if (json.success) {
        // Filter the report for this specific course and room
        const courseReport = json.data.filter(s => {
           // Normalize classroom matching
           const sRoom = String(s['ชั้น'] || '').replace(/^ม\./, '').trim();
           const matchRoom = classRoom.replace(/^ม\./, '').trim();
           return s['รหัสวิชา'] === courseCode && sRoom === matchRoom;
        });
        setTeacherReport(courseReport);
      } else {
        showAlert('เกิดข้อผิดพลาดในการดึงรายงาน: ' + json.error, 'error');
      }
    } catch (err) {
      console.error(err);
      showAlert('ไม่สามารถดึงข้อมูลนักเรียนได้', 'error');
    } finally {
      setLoadingReport(false);
    }
  };

  const handleFilesSelection = (filesList) => {
    if (!filesList || filesList.length === 0) return;
    const files = Array.from(filesList).filter(f => f.type === 'application/pdf');
    if (files.length === 0) {
      showAlert('กรุณาอัปโหลดเฉพาะไฟล์ PDF เท่านั้น', 'warning');
      return;
    }

    if (submissionMode === 1) {
      processMultipleFilesDrive(files);
    } else {
      // โหมด 2 รับแค่ไฟล์แรกไฟล์เดียว เพราะต้องตรวจสอบ มส. ทีละวิชา
      processSingleFileMS(files[0]);
    }
  };

  const handleFileUpload = (e) => {
    handleFilesSelection(e.target.files);
    // เคลียร์ค่า input ให้สามารถเลือกไฟล์เดิมซ้ำได้
    if (e.target) e.target.value = null;
  };

  const processMultipleFilesDrive = async (files) => {
    setLoading(true);
    let successCount = 0;
    let errors = [];

    for (let i = 0; i < files.length; i++) {
      const currentFile = files[i];
      setUploadProgress({ current: i + 1, total: files.length, filename: currentFile.name });
      
      try {
        const formData = new FormData();
        formData.append('file', currentFile);

        // 1. Parse PDF
        const uploadRes = await fetch('http://localhost:8000/api/moresor/upload-pdf', {
          method: 'POST',
          body: formData
        });
        const uploadData = await uploadRes.json();
        if (!uploadData.success) throw new Error(uploadData.error || 'Parsing failed');

        // Check for ✘ pattern
        if (uploadData.students && uploadData.students.length > 0 && uploadData.students.every(s => s.status === '✘')) {
          throw new Error('ตรวจพบการขาดเรียนทุกคน (ยังไม่ได้เช็คชื่อ)');
        }

        // 2. Fetch Masterdata
        const mdRes = await fetch('http://localhost:8000/api/moresor/masterdata', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            courseCode: uploadData.courseCode,
            classRoom: uploadData.classRoom
          })
        });
        const mdData = await mdRes.json();
        if (!mdData.success) throw new Error(mdData.error || 'ไม่พบข้อมูลใน Masterdata');
        
        const mData = mdData.data;
        if (mData.teacherName && mData.teacherName !== loggedInTeacher) {
          throw new Error(`ไฟล์นี้เป็นวิชาของครู "${mData.teacherName}" ไม่ใช่วิชาของคุณ`);
        }

        // 3. Upload to Drive
        const toBase64 = f => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(f);
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.onerror = error => reject(error);
        });
        const base64Str = await toBase64(currentFile);
        
        const driveRes = await fetch('http://localhost:8000/api/moresor/upload-pdf-drive', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fileBase64: base64Str,
                fileName: currentFile.name,
                courseCode: uploadData.courseCode,
                classRoom: uploadData.classRoom,
                teacherName: mData.teacherName,
                subjectGroup: mData.subjectGroup || "อื่นๆ"
            })
        });
        const driveData = await driveRes.json();
        if (!driveData.success) throw new Error(driveData.error || 'อัปโหลดลง Drive ไม่สำเร็จ');
        
        successCount++;
      } catch (err) {
        errors.push(`${currentFile.name}: ${err.message}`);
      }
    }

    setLoading(false);
    setUploadProgress(null);

    if (errors.length > 0) {
      if (successCount === 0) {
        showAlert(`อัปโหลดล้มเหลวทั้งหมด\n${errors.join('\n')}`, 'error');
      } else {
        showAlert(`อัปโหลดสำเร็จ ${successCount}/${files.length} ไฟล์\n\nข้อผิดพลาด:\n${errors.join('\n')}`, 'warning');
      }
    } else {
      showAlert(`อัปโหลดไฟล์สำเร็จ ${successCount} ไฟล์ เรียบร้อยแล้ว!`, 'success');
    }
    fetchDashboardData();
  };

  const processSingleFileMS = async (selectedFile) => {
    setFile(selectedFile);
    setLoading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      // 1. Parse PDF using the external Render backend
      const uploadRes = await fetch('http://localhost:8000/api/moresor/upload-pdf', {
        method: 'POST',
        body: formData
      });
      const uploadData = await uploadRes.json();
      
      if (!uploadData.success) {
        showAlert('Error parsing PDF: ' + uploadData.error, 'error');
        setLoading(false);
        return;
      }

      setMetaData({
        courseCode: uploadData.courseCode,
        classRoom: uploadData.classRoom
      });

      } else {
        const errorData = await mdRes.json().catch(() => ({}));
        showAlert('เกิดข้อผิดพลาดในการดึงข้อมูล: ' + (errorData.error || 'โปรดลองใหม่อีกครั้ง'), 'error');
        setLoading(false);
        return;
      }
      const processed = uploadData.students.map(s => {
        let percentage = 0;
        let remark = '';
        let isMs = false;
        let msLevel = 0;

        if (totalHours > 0) {
          // ตรรกะ: ประมาณการว่าคาบที่เหลือในเทอม เด็กจะมาเรียนครบทุกคาบ
          // ดังนั้นคาบที่หายไปจริงๆ จะมีแค่คาบที่ "ขาด" ไปแล้วในปัจจุบันเท่านั้น
          // คิดเปอร์เซ็นต์สูงสุดที่เป็นไปได้ = ((เวลาเรียนเต็ม - จำนวนที่ขาด) / เวลาเรียนเต็ม) * 100
          percentage = ((totalHours - s.absent) / totalHours) * 100;
          
          if (percentage < 60) {
            remark = 'มส. (ไม่ถึง 60% เรียนซ้ำ)';
            isMs = true;
            msLevel = 2;
          } else if (percentage < 80) {
            remark = 'มส. (ขาดเรียนเกิน 20%)';
            isMs = true;
            msLevel = 1;
          }
        }

        return {
          ...s,
          percentage: percentage.toFixed(2),
          remark: remark,
          selected: isMs, // Auto-select if MS
          msLevel: msLevel
        };
      });

      setStudents(processed);
      setStep(2);
    } catch (err) {
      console.error(err);
      showAlert('An error occurred during processing.', 'error');
    }
    
    setLoading(false);
  };

  
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesSelection(e.dataTransfer.files);
    }
  };

  const handleRemarkChange = (index, value) => {
    const updated = [...students];
    updated[index].remark = value;
    // Auto select if teacher types "มส."
    if (value.includes('มส.') && !updated[index].selected) {
        updated[index].selected = true;
    }
    setStudents(updated);
  };

  const toggleSelect = (index) => {
    const updated = [...students];
    updated[index].selected = !updated[index].selected;
    setStudents(updated);
  };

  const handleExportClick = () => {
    const selectedStudents = students.filter(s => s.selected);
    if (selectedStudents.length === 0) {
      setConfirmModal({
        isOpen: true,
        title: 'ยืนยันไม่มีนักเรียนติด มส.',
        message: 'คุณแน่ใจหรือไม่ที่จะยืนยันว่า "ไม่มีนักเรียนติด มส." ในรายวิชานี้? (ส่งข้อมูลผ่านทุกคน)',
        isZero: true,
        count: 0
      });
    } else {
      setConfirmModal({
        isOpen: true,
        title: 'ยืนยันการส่งข้อมูล มส.',
        message: `คุณต้องการยืนยันและอัปเดตข้อมูลนักเรียนติด มส. จำนวน ${selectedStudents.length} คน ลงในระบบส่วนกลางใช่หรือไม่?`,
        isZero: false,
        count: selectedStudents.length
      });
    }
  };

  const executeExport = async () => {
    setConfirmModal({ ...confirmModal, isOpen: false });
    const selectedStudents = students.filter(s => s.selected);
    setLoading(true);
    
    // Prepare 14 columns payload
    const payload = selectedStudents.map((s, index) => ({
      'ที่': index + 1, // Auto re-numbering
      'รหัสประจำตัว': s.studentId,
      'ชื่อ - นามสกุล (ใส่คำนำหน้าเต็ม)': s.fullName,
      'ชั้น': s.classRoom,
      'เลขที่': s.no, // Original class number
      'รหัสวิชา': s.courseCode,
      'ชื่อวิชา': masterData?.courseName || '',
      'เวลาเรียนเต็ม': masterData?.totalHours || '',
      'ขาด': s.absent,
      'ลา': s.leave,
      'รวมเวลามาเรียน': s.totalAttended,
      'คิดเป็นร้อยละที่มาเรียน': s.percentage,
      'ครูผู้สอน': masterData?.teacherName || '',
      'หมายเหตุ': s.remark,
      'อนุญาตให้เข้าสอบ': false
    }));

    try {
      const res = await fetch(GAS_URL, {
        method: 'POST',
        body: JSON.stringify({ 
          action: 'submitReport',
          data: payload,
          courseCode: metaData.courseCode,
          classRoom: metaData.classRoom,
          teacherName: masterData?.teacherName || ''
        })
      });
      
      const resData = await res.json();
      if (resData.success) {
        showAlert('บันทึกข้อมูลเรียบร้อยแล้ว! (เชื่อมต่อกับ AssimentHub พร้อมใช้งาน)', 'success');
        setStep(1);
        setFile(null);
        setStudents([]);
        fetchDashboardData();
      } else {
        showAlert('Error saving data: ' + resData.error, 'error');
      }
    } catch (err) {
      showAlert('Export failed', 'error');
    }
    setLoading(false);
  };

  const submitStatusUpdate = async (studentId, courseCode, classRoom, allowExam, remark = null) => {
    setUpdatingStatus(true);
    try {
      const res = await fetch(GAS_URL, {
        method: 'POST',
        body: JSON.stringify({
          action: 'updateStudentStatus',
          courseCode,
          classRoom,
          studentId,
          allowExam,
          remark
        })
      });
      const data = await res.json();
      if (data.success) {
        // Update local state
        setTeacherReport(prev => prev.map(s => {
          if (s['รหัสประจำตัว'] === studentId) {
            const updated = { ...s, 'อนุญาตให้เข้าสอบ': allowExam };
            if (remark) {
              updated['หมายเหตุ'] = remark;
            }
            return updated;
          }
          return s;
        }));
        setEditingStudent(null);
      } else {
        showAlert('เกิดข้อผิดพลาด: ' + data.error, 'error');
      }
    } catch (err) {
      showAlert('ไม่สามารถอัปเดตสถานะได้', 'error');
    }
    setUpdatingStatus(false);
  };


  return (
    <div className="min-h-screen bg-white text-slate-800 font-sans p-6 md:p-10 selection:bg-blue-200">
      <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* Header - Matching TeacherHub */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent tracking-tight">
                MoreSor
              </h1>
              <button 
                onClick={() => setShowPatchNotes(true)}
                className="px-2.5 py-1 text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full hover:shadow-lg hover:scale-105 transition-all cursor-pointer shadow-md"
              >
                v1.1.0
              </button>
            </div>
            <p className="text-slate-600 mt-1 font-medium text-lg">
              ระบบจัดการข้อมูล มส.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link 
              href={overviewHref}
              className="bg-blue-50 hover:bg-blue-100 text-blue-700 px-5 py-2.5 rounded-xl font-semibold shadow-sm border border-blue-200 transition-all duration-200 flex items-center gap-2"
            >
              🏫 สำหรับครูที่ปรึกษา/วิชาการ
            </Link>
            <Link 
              href={dashboardHref}
              className="bg-white hover:bg-slate-50 text-slate-700 px-5 py-2.5 rounded-xl font-semibold shadow-sm border border-slate-200 transition-all duration-200 flex items-center gap-2"
            >
              📊 สถานะการส่ง (ครูผู้สอน)
            </Link>
            {step === 2 && (
               <button 
                  onClick={() => setStep(1)}
                  className="bg-white hover:bg-slate-50 text-slate-700 px-5 py-2.5 rounded-xl font-semibold shadow-sm border border-slate-200 transition-all duration-200"
               >
                 อัปโหลดไฟล์ใหม่
               </button>
            )}
          </div>
        </div>

        {/* Timeframe Banner */}
        <div className="p-4 rounded-xl border-l-4 flex items-center gap-4 shadow-sm bg-red-50 border-red-500 text-red-800">
          <div className="animate-pulse bg-red-100 p-2 rounded-full">
            {timeframeState.phase === 3 ? (
              <XCircle className="w-6 h-6 text-red-600" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-red-600" />
            )}
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-red-600 uppercase tracking-wider mb-0.5">
              {timeframeState.phase === 1 ? 'แจ้งเตือน: กำหนดการส่งรายงานผล มส.' : 
               timeframeState.phase === 2 ? 'แจ้งเตือน: กำหนดการแก้ไขและอนุญาตให้เข้าสอบ' : 
               'แจ้งเตือน: หมดเขตการดำเนินการ'}
            </span>
            <span className="font-semibold text-red-800 text-lg">{timeframeState.message}</span>
          </div>
        </div>

        {/* Step 0: Auto Login */}
        {!loggedInTeacher && (
          <div className="bg-white rounded-2xl p-12 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-slate-200 flex flex-col items-center text-center max-w-2xl mx-auto">
            <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center mb-6">
              <User className="w-10 h-10 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">กำลังตรวจสอบสิทธิ์...</h2>
            <p className="text-slate-500 mb-8">ระบบกำลังเข้าสู่ระบบผ่าน TeacherHub</p>
            
            {isInitializing && (
              <div className="flex items-center gap-3 text-slate-500">
                <Loader2 className="w-5 h-5 animate-spin" />
                กำลังเชื่อมต่อ...
              </div>
            )}
          </div>
        )}

        {/* Step 1: Upload */}
        {loggedInTeacher && step === 1 && (
          <div className="bg-white rounded-2xl p-12 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-slate-200 text-center">
            <div className="mb-8 pb-8 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3 text-left">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                  <User className="w-6 h-6 text-slate-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">ผู้ใช้งานปัจจุบัน</p>
                  <p className="text-lg font-bold text-slate-800">{loggedInTeacher}</p>
                </div>
              </div>
            </div>

            {timeframeState.phase === 1 ? (
              <div 
                onDragOver={handleDragOver}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`max-w-xl mx-auto border-4 border-dashed rounded-3xl p-16 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 relative overflow-hidden group 
                  ${isDragActive ? 'border-blue-500 bg-blue-50 scale-105' : ''}
                  ${submissionMode === 1 && !isDragActive
                    ? 'border-purple-200 bg-purple-50 hover:bg-purple-100 hover:border-purple-400 hover:shadow-[0_0_30px_rgba(168,85,247,0.2)]' 
                    : !isDragActive ? 'border-blue-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-400' : ''}`}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="application/pdf"
                  multiple={submissionMode === 1}
                  onChange={handleFileUpload}
                  disabled={loading}
                />
                {loading ? (
                  <div className="flex flex-col items-center">
                    <div className={`w-16 h-16 border-4 border-slate-200 rounded-full animate-spin mb-6 ${submissionMode === 1 ? 'border-t-purple-600' : 'border-t-blue-600'}`}></div>
                    {uploadProgress ? (
                      <>
                        <h3 className={`text-xl font-bold animate-pulse ${submissionMode === 1 ? 'text-purple-800' : 'text-slate-800'}`}>
                          กำลังอัปโหลดไฟล์ {uploadProgress.current}/{uploadProgress.total}
                        </h3>
                        <p className="text-slate-500 mt-2 font-medium truncate max-w-[200px]">{uploadProgress.filename}</p>
                        <div className="w-full bg-slate-200 rounded-full h-2.5 mt-4">
                          <div className={`h-2.5 rounded-full transition-all duration-300 ${submissionMode === 1 ? 'bg-purple-600' : 'bg-blue-600'}`} style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}></div>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center">
                        <div className="relative">
                          <div className="absolute inset-0 bg-blue-200 rounded-full blur-xl animate-pulse"></div>
                          <Loader2 className="w-14 h-14 text-blue-600 animate-spin relative z-10" />
                        </div>
                        <p className="text-lg font-medium text-blue-900 mt-6 animate-pulse">กำลังสกัดข้อมูลจาก PDF และดึง Masterdata...</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center w-full pointer-events-none">
                    <div className={`p-5 rounded-full mb-6 transition-all duration-300 
                      ${isDragActive ? 'scale-125 bg-blue-600' : ''}
                      ${!isDragActive && submissionMode === 1 ? 'bg-purple-100 group-hover:bg-purple-600 group-hover:scale-110' : ''}
                      ${!isDragActive && submissionMode !== 1 ? 'bg-blue-100 group-hover:bg-blue-600 group-hover:scale-110' : ''}`}>
                      <UploadCloud className={`w-10 h-10 transition-colors 
                        ${isDragActive ? 'text-white' : ''}
                        ${!isDragActive && submissionMode === 1 ? 'text-purple-600 group-hover:text-white' : ''}
                        ${!isDragActive && submissionMode !== 1 ? 'text-blue-600 group-hover:text-white' : ''}`} />
                    </div>
                    <h3 className={`text-2xl font-bold mb-3 
                      ${isDragActive ? 'text-blue-600' : ''}
                      ${!isDragActive && submissionMode === 1 ? 'text-purple-900' : ''}
                      ${!isDragActive && submissionMode !== 1 ? 'text-slate-800' : ''}`}>
                      {isDragActive 
                        ? 'วางไฟล์เพื่ออัปโหลด' 
                        : (submissionMode === 1 ? 'ลากไฟล์มาวาง หรือคลิกเพื่ออัปโหลดหลายไฟล์' : 'ลากไฟล์มาวาง หรือคลิกเพื่ออัปโหลด')}
                    </h3>
                    <p className={`${submissionMode === 1 ? 'text-purple-600/70' : 'text-slate-500'} font-medium`}>
                      {submissionMode === 1 ? 'อัปโหลดได้หลายไฟล์พร้อมกัน (เฉพาะ PDF)' : 'รองรับเฉพาะไฟล์ PDF จากระบบฐานข้อมูล'}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="max-w-xl mx-auto border-2 border-dashed border-slate-200 rounded-2xl p-16 flex flex-col items-center opacity-50 bg-slate-50">
                <div className="bg-slate-200 p-5 rounded-full mb-6">
                  <XCircle className="w-10 h-10 text-slate-500" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-3">หมดเวลาอัปโหลดไฟล์ ปพ.5 แล้ว</h3>
                <p className="text-slate-500 font-medium">{timeframeState.message}</p>
              </div>
            )}

            {/* Course List Section */}
            {teacherCourses.length > 0 && (
              <div className="mt-12 text-left animate-in fade-in slide-in-from-bottom-4">
                <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <FileSpreadsheet className="w-6 h-6 text-blue-600" />
                  รายวิชาที่สอนทั้งหมด
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {teacherCourses.map((c, idx) => (
                    <div key={idx} className="bg-slate-50 rounded-xl p-5 border border-slate-200 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between mb-2">
                          <span className="text-sm font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">{c.courseCode}</span>
                          {c.status === 'ส่งแล้ว' ? (
                            <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-1 rounded-full">
                              <CheckCircle2 className="w-3 h-3" /> ส่งแล้ว
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-100 px-2 py-1 rounded-full">
                              <AlertTriangle className="w-3 h-3" /> ยังไม่ส่ง
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-slate-800 truncate" title={c.courseName}>{c.courseName}</h4>
                        <p className="text-slate-500 text-sm mt-1">ห้อง {c.room}</p>
                      </div>
                      
                      {c.status === 'ส่งแล้ว' && (
                        <button 
                          onClick={() => fetchStudentReport(c.courseCode, c.classRoom)}
                          disabled={loadingReport}
                          className="mt-4 w-full bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-blue-700 text-sm font-medium py-2 rounded-lg transition-colors flex justify-center items-center gap-2 disabled:opacity-50"
                        >
                          {loadingReport ? <Loader2 className="w-4 h-4 animate-spin" /> : 'ดูรายชื่อนักเรียน'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Student Report Modal */}
        {teacherReport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">รายชื่อนักเรียนที่รายงานผล</h3>
                  <p className="text-slate-500 text-sm mt-1">
                    รหัสวิชา: {teacherReport[0]?.['รหัสวิชา']} | ชั้น: {teacherReport[0]?.['ชั้น']}
                  </p>
                </div>
                <button 
                  onClick={() => setTeacherReport(null)}
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500 hover:text-slate-800"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto">
                {teacherReport.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-400 mb-4" />
                    <p className="text-lg font-medium">ส่งผลสำเร็จ แต่ไม่มีนักเรียนติด มส. ในรายวิชานี้</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-3">เลขที่</th>
                          <th className="px-4 py-3">รหัสประจำตัว</th>
                          <th className="px-4 py-3 w-full">ชื่อ-นามสกุล</th>
                          <th className="px-4 py-3 text-right">ร้อยละที่มาเรียน</th>
                          <th className="px-4 py-3">หมายเหตุ</th>
                          <th className="px-4 py-3 text-center">จัดการ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {teacherReport.map((student, idx) => {
                          const percentage = parseFloat(student['คิดเป็นร้อยละที่มาเรียน'] || 0);
                          const rawRemark = student['หมายเหตุ'] || '';
                          // We check if 'อนุญาตให้เข้าสอบ' is checked (could be boolean true or string 'TRUE')
                          const isAllowed = student['อนุญาตให้เข้าสอบ'] === true || student['อนุญาตให้เข้าสอบ'] === 'TRUE';
                          
                          const isEligible = percentage >= 60 || rawRemark.includes('ไม่ส่งงาน');
                          const canEdit = timeframeState.phase <= 2 && (isEligible || isAllowed);
                          
                          const handleToggle = () => {
                            const newStatus = !isAllowed;
                            submitStatusUpdate(student['รหัสประจำตัว'], student['รหัสวิชา'], student['ชั้น'], newStatus);
                          };

                          return (
                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-4 py-3 text-slate-500 text-center">{student['เลขที่']}</td>
                              <td className="px-4 py-3 text-slate-600">{student['รหัสประจำตัว']}</td>
                              <td className="px-4 py-3 font-medium text-slate-800">{student['ชื่อ - นามสกุล (ใส่คำนำหน้าเต็ม)']}</td>
                              <td className="px-4 py-3 text-right text-slate-600">{student['คิดเป็นร้อยละที่มาเรียน']}%</td>
                              <td className="px-4 py-3 font-medium">
                                <span className={isAllowed ? 'text-emerald-600 bg-emerald-50 px-2 py-1 rounded' : 'text-rose-600 bg-rose-50 px-2 py-1 rounded'}>
                                  {rawRemark}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                {canEdit ? (
                                  <div className="flex items-center justify-center gap-2">
                                    <span className={`text-xs font-semibold ${isAllowed ? 'text-emerald-600' : 'text-slate-400'}`}>
                                      {isAllowed ? 'อนุญาตแล้ว' : 'สิทธิ์สอบ'}
                                    </span>
                                    <button
                                      onClick={handleToggle}
                                      disabled={updatingStatus}
                                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                        isAllowed ? 'bg-emerald-500' : 'bg-slate-300 hover:bg-slate-400'
                                      } disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1`}
                                    >
                                      <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                          isAllowed ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                      />
                                    </button>
                                  </div>
                                ) : (
                                  rawRemark.includes('ไม่ถึง 60%') && timeframeState.phase <= 2 ? (
                                    rawRemark.includes('(ลงทะเบียนแล้ว)') ? (
                                      <span className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full text-xs font-bold border border-emerald-200">
                                        ลงทะเบียนแล้ว
                                      </span>
                                    ) : (
                                      <button
                                        onClick={() => submitStatusUpdate(student['รหัสประจำตัว'], student['รหัสวิชา'], student['ชั้น'], isAllowed, rawRemark + ' (ลงทะเบียนแล้ว)')}
                                        disabled={updatingStatus}
                                        className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold px-3 py-1.5 rounded-lg border border-blue-200 transition-colors"
                                      >
                                        ลงทะเบียนแก้
                                      </button>
                                    )
                                  ) : (
                                    <span className="text-slate-300 text-xs">-</span>
                                  )
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Preview & Select */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            
            {/* Meta Info */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 hover:shadow-lg transition-all duration-300">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">รหัสวิชา / ชั้น</p>
                <p className="text-xl font-extrabold text-slate-800">{metaData?.courseCode} - {metaData?.classRoom}</p>
              </div>
              <div className="bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 hover:shadow-lg transition-all duration-300">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">ชื่อวิชา</p>
                <p className="text-xl font-extrabold text-slate-800 truncate">{masterData?.courseName || '-'}</p>
              </div>
              <div className="bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 hover:shadow-lg transition-all duration-300">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">เวลาเรียนเต็ม</p>
                <p className="text-xl font-extrabold text-slate-800">{masterData?.totalHours ? `${masterData.totalHours} คาบ (${masterData.credits} นก.)` : '-'}</p>
              </div>
              <div className="bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 hover:shadow-lg transition-all duration-300">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">ครูผู้สอน</p>
                <p className="text-xl font-extrabold text-slate-800 truncate">{masterData?.teacherName || '-'}</p>
              </div>
            </div>

              <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden mb-24">
                <div className="p-6 md:p-8 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center bg-slate-50/50 gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">รายชื่อนักเรียน</h2>
                    <p className="text-sm text-slate-500 mt-1">ระบบวิเคราะห์ข้อมูล มส. เบื้องต้นให้แล้ว สามารถตรวจสอบและแก้ไขหมายเหตุได้</p>
                  </div>
                </div>
                
                {students.length === 0 ? (
                <div className="p-16 flex flex-col items-center justify-center text-center bg-rose-50/30">
                  <div className="w-24 h-24 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mb-6">
                    <XCircle className="w-12 h-12" />
                  </div>
                  <h3 className="text-2xl font-bold text-rose-800 mb-2">ไม่พบข้อมูลรายชื่อนักเรียนในไฟล์นี้</h3>
                  <p className="text-slate-500">กรุณาตรวจสอบว่าอัปโหลดไฟล์ PDF ถูกต้องหรือไม่</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-100 text-xs text-slate-500 uppercase tracking-wider">
                        <th className="p-5 w-16 text-center font-bold">เลือก</th>
                        <th className="p-5 w-20 font-bold">เลขที่</th>
                        <th className="p-5 font-bold">รหัสประจำตัว</th>
                        <th className="p-5 font-bold">ชื่อ - นามสกุล</th>
                        <th className="p-5 text-center font-bold">เวลาเต็ม</th>
                        <th className="p-5 text-center font-bold">ขาด</th>
                        <th className="p-5 text-center font-bold">ลา</th>
                        <th className="p-5 text-center font-bold">มาเรียน</th>
                        <th className="p-5 text-center font-bold">% มาเรียน</th>
                        <th className="p-5 w-1/3 font-bold">หมายเหตุ (แก้ไขได้)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                    {students.map((s, idx) => {
                      
                      let rowStyle = "hover:bg-slate-50/80 transition-colors ";
                      if (s.msLevel === 1) rowStyle += "bg-orange-50/30 hover:bg-orange-50/60";
                      if (s.msLevel === 2) rowStyle += "bg-rose-50/30 hover:bg-rose-50/60";

                      return (
                        <tr key={idx} className={rowStyle}>
                          <td className="p-5 text-center">
                            <input 
                              type="checkbox" 
                              checked={s.selected}
                              onChange={() => toggleSelect(idx)}
                              className="w-5 h-5 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer shadow-sm transition-all"
                            />
                          </td>
                          <td className="p-5 font-bold text-slate-500 text-center">{s.no}</td>
                          <td className="p-5 text-slate-600 font-mono text-sm">{s.studentId}</td>
                          <td className="p-5 font-semibold text-slate-800">{s.fullName}</td>
                          <td className="p-5 text-center text-slate-500 font-bold">{masterData?.totalHours || 0}</td>
                          <td className="p-5 text-center text-rose-500 font-bold">{s.absent}</td>
                          <td className="p-5 text-center text-orange-500 font-bold">{s.leave}</td>
                          <td className="p-5 text-center text-emerald-600 font-bold">{s.totalAttended}</td>
                          <td className="p-5 text-center">
                            <span className={`px-3 py-1.5 rounded-full text-xs font-bold border ${
                              s.msLevel === 2 ? 'bg-rose-100/80 text-rose-700 border-rose-200' : 
                              s.msLevel === 1 ? 'bg-orange-100/80 text-orange-700 border-orange-200' : 
                              'bg-emerald-100/80 text-emerald-700 border-emerald-200'
                            }`}>
                              {s.percentage}%
                            </span>
                          </td>
                          <td className="p-4 pr-6">
                            <div className="flex items-center gap-3">
                              {s.msLevel > 0 && <AlertTriangle className={`w-5 h-5 ${s.msLevel === 2 ? 'text-rose-500 animate-pulse' : 'text-orange-500'}`} />}
                              <input 
                                type="text"
                                value={s.remark}
                                onChange={(e) => handleRemarkChange(idx, e.target.value)}
                                placeholder="พิมพ์หมายเหตุเพิ่มเติม เช่น มส. (ไม่ส่งงาน)"
                                className={`w-full px-4 py-2.5 rounded-xl border text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:outline-none transition-all ${
                                  s.msLevel === 2 ? 'border-rose-200 bg-rose-50 focus:border-rose-400 focus:ring-rose-500/10' :
                                  s.msLevel === 1 ? 'border-orange-200 bg-orange-50 focus:border-orange-400 focus:ring-orange-500/10' :
                                  'border-slate-200 bg-slate-50 focus:border-blue-500'
                                }`}
                              />
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              )}
            </div>

            {/* Floating Action Bar */}
            <div className="fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-md border-t border-slate-200 p-4 shadow-[0_-10px_40px_rgb(0,0,0,0.05)] z-50 flex justify-center md:justify-end items-center gap-4 animate-in slide-in-from-bottom-8">
              <button
                onClick={() => {
                  setStep(1);
                  setFile(null);
                  setStudents([]);
                }}
                className="px-6 py-3 rounded-2xl font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                ย้อนกลับ
              </button>
              
              {students.length > 0 ? (
                <button 
                  onClick={handleExportClick}
                  disabled={loading}
                  className="group bg-gradient-to-br from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white px-8 py-3 rounded-2xl font-semibold shadow-lg shadow-blue-200 hover:shadow-blue-300 hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2 disabled:opacity-50 disabled:hover:translate-y-0"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileSpreadsheet className="w-5 h-5 group-hover:scale-110 transition-transform" />}
                  ยืนยันและอัปเดตระบบส่วนกลาง
                </button>
              ) : (
                <button 
                  onClick={handleExportClick}
                  disabled={loading}
                  className="group bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white px-8 py-3 rounded-2xl font-semibold shadow-lg shadow-emerald-200 hover:shadow-emerald-300 hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2 disabled:opacity-50 disabled:hover:translate-y-0"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5 group-hover:scale-110 transition-transform" />}
                  ส่งข้อมูล (นักเรียนผ่านทุกคน)
                </button>
              )}
            </div>

          </div>
        )}
      </div>


      {/* Patch Notes Modal */}
      {showPatchNotes && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl relative border border-slate-100 max-h-[80vh] flex flex-col">
            <button 
              onClick={() => setShowPatchNotes(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
            >
              <XCircle className="w-6 h-6" />
            </button>
            
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-indigo-600">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-800">Patch Notes</h3>
                <p className="text-indigo-600 font-medium">???????????????: v1.1.0</p>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-6 text-sm text-slate-600">
              <div>
                <h4 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span> v1.1.0 (Latest Update)
                </h4>
                <ul className="list-disc pl-6 mt-2 space-y-2">
                  <li><strong>????????? Drag & Drop:</strong> ????????????? ??.5 ??????????????????????????</li>
                  <li><strong>??????? 1 (Multiple Upload):</strong> ???????????????? ???????????????????????? 1 ???????????????????????????????????????????? Drive ?????</li>
                  <li><strong>?????? UI ?????????????:</strong> ????????????????????????????????????????????? (Progress Bar)</li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-slate-300"></span> v1.0.0 (Initial Release)
                </h4>
                <ul className="list-disc pl-6 mt-2 space-y-2 text-slate-500">
                  <li>??????????????????????????????????????? (??? 1 ?????? 2)</li>
                  <li>?????????????????????????????? (?????????? 100% ?????????????????????)</li>
                  <li>????????????? PDF ?????????????????????????????????????????????????????? 80%</li>
                </ul>
              </div>
            </div>
            
            <button
              onClick={() => setShowPatchNotes(false)}
              className="mt-6 w-full px-6 py-3.5 rounded-2xl font-bold text-white bg-slate-800 hover:bg-slate-700 transition-colors shadow-lg hover:-translate-y-0.5"
            >
              ???????
            </button>
          </div>
        </div>
      )}

      {/* Custom Confirm Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-300">
            <div className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-6 ${confirmModal.isZero ? 'bg-emerald-100 text-emerald-500' : 'bg-blue-100 text-blue-600'}`}>
              {confirmModal.isZero ? <CheckCircle2 className="w-8 h-8" /> : <AlertTriangle className="w-8 h-8" />}
            </div>
            
            <h3 className="text-2xl font-bold text-slate-800 text-center mb-3">
              {confirmModal.title}
            </h3>
            
            <p className="text-slate-600 text-center mb-8 text-lg">
              {confirmModal.message}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                className="w-full px-6 py-3.5 rounded-2xl font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={executeExport}
                className={`w-full px-6 py-3.5 rounded-2xl font-semibold text-white transition-all shadow-lg hover:-translate-y-0.5 ${
                  confirmModal.isZero 
                    ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-emerald-200 hover:shadow-emerald-300' 
                    : 'bg-gradient-to-br from-blue-600 to-indigo-700 shadow-blue-200 hover:shadow-blue-300'
                }`}
              >
                ยืนยันการส่งข้อมูล
              </button>
            </div>
          </div>
        </div>
      )}
    {/* Custom Alert Modal */}
      {alertModal.isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-300 relative border border-slate-100">
            <div className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-5 shadow-inner ${
              alertModal.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 
              alertModal.type === 'error' ? 'bg-rose-100 text-rose-600' : 
              'bg-amber-100 text-amber-600'
            }`}>
              {alertModal.type === 'success' && <CheckCircle2 className="w-8 h-8 animate-in zoom-in duration-500" />}
              {alertModal.type === 'error' && <XCircle className="w-8 h-8 animate-in zoom-in duration-500" />}
              {alertModal.type === 'warning' && <AlertTriangle className="w-8 h-8 animate-in zoom-in duration-500" />}
            </div>
            
            <h3 className={`text-2xl font-bold text-center mb-2 ${
              alertModal.type === 'success' ? 'text-emerald-700' : 
              alertModal.type === 'error' ? 'text-rose-700' : 
              'text-amber-700'
            }`}>
              {alertModal.title}
            </h3>
            
            <p className="text-slate-600 text-center mb-8 font-medium leading-relaxed">
              {alertModal.message}
            </p>
            
            <button
              onClick={() => setAlertModal({ ...alertModal, isOpen: false })}
              className={`w-full px-6 py-3.5 rounded-2xl font-bold text-white transition-all shadow-lg hover:-translate-y-0.5 active:translate-y-0 ${
                alertModal.type === 'success' ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-emerald-200/50 hover:shadow-emerald-300/50' : 
                alertModal.type === 'error' ? 'bg-gradient-to-br from-rose-500 to-rose-600 shadow-rose-200/50 hover:shadow-rose-300/50' : 
                'bg-gradient-to-br from-amber-500 to-amber-600 shadow-amber-200/50 hover:shadow-amber-300/50'
              }`}
            >
              ตกลง
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

export default function Home() {
  return <DashboardContent />;
}
