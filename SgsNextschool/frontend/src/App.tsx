import { useState, useRef, useEffect } from 'react'
import NextSchoolExcelViewer from './NextSchoolExcelViewer'
import Swal from 'sweetalert2'
import Dashboard from './Dashboard'

const StudentErrorRow = ({ studentId, errors }: { studentId: string, errors: any[] }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <>
      <tr className="hover:bg-red-50 transition cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <td className="px-4 py-3 font-bold text-slate-800">{studentId}</td>
        <td className="px-4 py-3 text-slate-600 flex items-center justify-between">
          <span className="font-medium text-red-700">พบ {errors.length} จุดขัดแย้ง</span>
          <span className="text-slate-400 text-xs font-semibold">{expanded ? '▲ ปิด' : '▼ ดูเพิ่ม'}</span>
        </td>
      </tr>
      {expanded && errors.map((err, idx) => (
        <tr key={`${studentId}-${idx}`} className="bg-red-50/40">
          <td className="px-4 py-2 border-l-4 border-red-400"></td>
          <td className="px-4 py-2 text-sm text-slate-700">
            • {err.message}
          </td>
        </tr>
      ))}
    </>
  );
};

const StudentWarningRow = ({ studentId, warnings }: { studentId: string, warnings: any[] }) => {
  const [expanded, setExpanded] = useState(false);
  const isMissingWork = warnings.some(warn => warn.message.includes('ขาด') || warn.message.includes('ยังไม่ได้กรอก') || warn.message.includes('0'));
  
  return (
    <>
      <tr className="hover:bg-amber-50 transition cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <td className="px-4 py-3 font-bold text-slate-800">{studentId}</td>
        <td className="px-4 py-3">
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${isMissingWork ? 'bg-orange-100 text-orange-700' : 'bg-amber-100 text-amber-700'}`}>
            {isMissingWork ? 'ค้างส่งงาน' : 'จุดสังเกต'}
          </span>
        </td>
        <td className="px-4 py-3 text-slate-600 flex items-center justify-between">
          <span className="font-medium text-amber-700">พบ {warnings.length} รายการ</span>
          <span className="text-slate-400 text-xs font-semibold">{expanded ? '▲ ปิด' : '▼ ดูเพิ่ม'}</span>
        </td>
      </tr>
      {expanded && warnings.map((warn, idx) => {
        const isMissingRow = warn.message.includes('ขาด') || warn.message.includes('ยังไม่ได้กรอก') || warn.message.includes('0');
        return (
          <tr key={`${studentId}-${idx}`} className={`${isMissingRow ? 'bg-orange-50/40' : 'bg-amber-50/40'}`}>
            <td className={`px-4 py-2 border-l-4 ${isMissingRow ? 'border-orange-400' : 'border-amber-400'}`}></td>
            <td colSpan={2} className="px-4 py-2 text-sm text-slate-700">
              • {warn.message}
            </td>
          </tr>
        );
      })}
    </>
  );
};

const isLocal = window.location.hostname === 'localhost' || 
                window.location.hostname === '127.0.0.1' || 
                window.location.hostname.startsWith('192.168.') || 
                window.location.hostname.startsWith('10.') || 
                window.location.hostname.startsWith('172.');

const BACKEND_URL = isLocal 
  ? `http://${window.location.hostname || 'localhost'}:8000` 
  : 'https://teacherhub-api-zqhv.onrender.com';

function App() {
  const [files, setFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [results, setResults] = useState<any>(null)
  
  const searchParams = new URLSearchParams(window.location.search)
  const defaultView = searchParams.get('view') === 'dashboard' ? 'dashboard' : 'validator'
  const [viewMode, setViewMode] = useState<'validator' | 'dashboard'>(defaultView)
  const [currentUser, setCurrentUser] = useState<string>('')
  const [savedWorksDb, setSavedWorksDb] = useState<any>({})
  const [submissions, setSubmissions] = useState<any[]>([])
  const [errorMsg, setErrorMsg] = useState("")
  const [isDragging, setIsDragging] = useState(false)
  const [selectedPairIndex, setSelectedPairIndex] = useState(0)
  const [roundType, setRoundType] = useState<string>("")
  const [academicYear, setAcademicYear] = useState("2566")
  const [semester, setSemester] = useState("1")
  const [webAppUrl, setWebAppUrl] = useState("https://script.google.com/macros/s/AKfycbxzpP9b_eBJUU5KaNX1CbMOLHygMsrUdO7earro-bQIs8lMS9H6YM6Z6mlamm3jJd1fDQ/exec")
  const [teacherData, setTeacherData] = useState<any[]>([])
  const [masterScores, setMasterScores] = useState<any[]>([])
  const [dbConnected, setDbConnected] = useState(false)
  const [savedPairs, setSavedPairs] = useState<Record<number, boolean>>({})
  const [showPatchNotes, setShowPatchNotes] = useState(false)

  const fetchDbData = async () => {
    if (!webAppUrl) return;
    try {
      const res = await fetch(webAppUrl);
      const data = await res.json();
      if (data.status === "success") {
         setAcademicYear(data.settings.year);
         setSemester(data.settings.semester);
         setTeacherData(data.teachers || []);
         setSubmissions(data.submissions || []);
         setMasterScores(data.scores || []);
         setDbConnected(true);
      } else {
         setDbConnected(false);
      }
    } catch (err) {
      console.error(err);
      setDbConnected(false);
    }
  };

  useEffect(() => {
    fetchDbData();
  }, [webAppUrl]);

  const fetchSavedWorks = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/works`);
      const data = await res.json();
      if (data.status === 'success') {
         setSavedWorksDb(data.data);
      }
    } catch (err) {
      console.error('Error fetching works', err);
    }
  };

  useEffect(() => {
    fetchSavedWorks();
  }, []);

  const getTeacherInfo = (code: string, classLevel: string) => {
    const normalizeClass = (c: string) => {
      let s = (c || "").toString().replace(/ห้อง/g, '/');
      return s.replace(/[^0-9/]/g, '').trim();
    };
    const normalizeCode = (c: string) => (c || "").toString().replace(/\s+/g, '').trim();
    
    const normInput = normalizeClass(classLevel);
    const normCode = normalizeCode(code);

    let found = teacherData.find(t => {
      if (normalizeCode(t.subject_code) !== normCode) return false;
      const nClass = normalizeClass(t.class_level);
      if (nClass === normInput) return true;
      
      const raw = (t.class_level || "").toString().replace(/\s+/g, '');
      const rawWithSpace = (t.class_level || "").toString();
      
      if (rawWithSpace.includes(classLevel)) return true;
      if (rawWithSpace.includes(normInput)) return true;
      
      const parts = normInput.split('/');
      if (parts.length === 2) {
        if (raw.includes(`${parts[0]}/${parts[1]}`)) return true;
        if (raw.includes(`${parts[0]}ห้อง${parts[1]}`)) return true;
      }
      return false;
    });

    if (found) return found;
    
    // Fallback: match subject_code only
    found = teacherData.find(t => normalizeCode(t.subject_code) === normCode);
    if (found) {
      return { ...found, _is_fallback: true };
    }
    
    return {
      teacher_name: "ไม่พบในฐานข้อมูล",
      subject_group: "อื่นๆ"
    };
  };



  
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFiles = Array.from(e.dataTransfer.files).filter(f => 
      f.name.toLowerCase().endsWith('.pdf') || f.name.toLowerCase().endsWith('.xlsx')
    )
    handleFilesAdded(droppedFiles)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files).filter(f => 
        f.name.toLowerCase().endsWith('.pdf') || f.name.toLowerCase().endsWith('.xlsx')
      )
      handleFilesAdded(selectedFiles)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleFilesAdded = (newFiles: File[]) => {
    setFiles(prev => [...prev, ...newFiles])
    setErrorMsg("")
  }

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleCompare = async () => {
    if (files.length < 2) {
      setErrorMsg("กรุณาอัปโหลดไฟล์ให้ครบอย่างน้อย 2 ไฟล์ (SGS และ NextSchool)")
      return
    }
    
    if (!roundType) {
      setErrorMsg("กรุณาเลือกประเภทการสอบ (กลางภาค หรือ ปลายภาค) ก่อนเริ่มตรวจสอบ")
      return
    }
    
    if (!masterScores || masterScores.length === 0) {
      setErrorMsg("ไม่พบข้อมูลโครงสร้างคะแนน (กรุณารีเฟรชหน้าเว็บ หรือ ตรวจสอบว่าแผ่นงานชื่อ Scores มีข้อมูล)")
      return
    }

    setLoading(true)
    setErrorMsg("")
    setResults(null)
    setSelectedPairIndex(0)
    setSavedPairs({})

    const formData = new FormData()
    for (const f of files) {
      formData.append("files", f)
    }
    formData.append("round_type", roundType)
    formData.append("master_scores", JSON.stringify(masterScores))

    try {
      const response = await fetch(`${BACKEND_URL}/api/compare`, {
        method: "POST",
        body: formData,
      })

      const data = await response.json()
      if (!response.ok) {
        setErrorMsg(data.detail || "An error occurred during comparison")
      } else {
        if (data.data && data.data.pairs) {
          data.data.pairs = data.data.pairs.map((pair: any) => ({
            ...pair,
            teacher_info: getTeacherInfo(pair.subject_code, pair.class_level)
          }));
        }
        setResults(data.data)
      }
    } catch (err) {
      setErrorMsg("Failed to connect to the backend server. Is it running?")
    } finally {
      setLoading(false)
    }
  }

  const exportToGoogleSheets = async () => {
    if (isSaving || loading) return;
    try {
      if (!results || !results.pairs || !results.pairs[selectedPairIndex]) {
        console.warn("Export aborted: No active pair found");
        return;
      }
      
      const activePair = results.pairs[selectedPairIndex];
      const hasErrors = activePair.results.errors && activePair.results.errors.length > 0;
      
      if (hasErrors) {
        await Swal.fire({
          icon: 'error',
          title: 'ไม่อนุญาตให้บันทึกข้อมูล',
          text: 'เนื่องจากพบข้อมูลขัดแย้ง หรือคะแนนไม่ตรงกัน (การ์ดสีแดง) กรุณาแก้ไขข้อมูลให้ถูกต้อง 100% ก่อนส่งเข้าฐานข้อมูล',
          confirmButtonColor: '#3085d6',
        });
        return;
      }

      const hasMissing = activePair.results.missing_students && activePair.results.missing_students.length > 0;
      if (hasMissing) {
        const res = await Swal.fire({
          icon: 'warning',
          title: 'พบข้อมูลรายชื่อตกหล่น',
          text: 'มีนักเรียนที่รายชื่อไม่ตรงกันระหว่างระบบ (การ์ดสีส้ม) คุณต้องการส่งข้อมูลเข้าฐานข้อมูลใช่หรือไม่?',
          showCancelButton: true,
          confirmButtonColor: '#d33',
          cancelButtonColor: '#3085d6',
          confirmButtonText: 'ยืนยันบันทึก',
          cancelButtonText: 'ยกเลิก'
        });
        if (!res.isConfirmed) return;
      }

      let currentWebhookUrl = webAppUrl;
      if (!currentWebhookUrl) {
        const { value: url } = await Swal.fire({
          title: 'ตั้งค่าการเชื่อมต่อ',
          input: 'url',
          inputLabel: 'กรุณาใส่ Web App URL ของ Google Apps Script ที่ได้จากการ Deploy:',
          inputPlaceholder: 'https://script.google.com/macros/s/.../exec',
          showCancelButton: true,
        });
        if (!url) return;
        currentWebhookUrl = url;
        setWebAppUrl(url);
      }
      const webhookUrl = currentWebhookUrl;

    const p = activePair;
    const subjectCode = p.subject_code || "Unknown";
    const classLevel = p.class_level || "";
    const tInfo = getTeacherInfo(subjectCode, classLevel);
    
    // คำนวณสถิติ
    const sgsStudentsObj = p.raw_data?.sgs_students || {};
    const sgsStudents = Object.values(sgsStudentsObj);
    const totalStudents = sgsStudents.length;
    let gradeCounts: Record<string, number> = {};
    let attrCounts: Record<string, number> = {};
    let readCounts: Record<string, number> = {};
    
    const getMode = (scores: string[]) => {
      const valid = scores.map(s => String(s || "").trim()).filter(s => ["3", "2", "1", "0"].includes(s));
      if (valid.length === 0) return null;
      const counts: Record<string, number> = {};
      let maxCount = 0;
      let mode = valid[0];
      valid.forEach(s => {
         counts[s] = (counts[s] || 0) + 1;
         if (counts[s] > maxCount) {
            maxCount = counts[s];
            mode = s;
         }
      });
      return mode;
    };

    sgsStudents.forEach((student: any) => {
       const grade = String(student.grade || "").trim();
       if (grade) gradeCounts[grade] = (gradeCounts[grade] || 0) + 1;
       
       const charMode = getMode(student.char_scores || []);
       if (charMode) attrCounts[charMode] = (attrCounts[charMode] || 0) + 1;
       
       const readMode = getMode(student.comp_scores || []);
       if (readMode) readCounts[readMode] = (readCounts[readMode] || 0) + 1;
    });

    const stats = {
       total_students: totalStudents,
       grades: roundType === "midterm" ? {} : gradeCounts,
       attributes: roundType === "midterm" ? {} : attrCounts,
       reading: roundType === "midterm" ? {} : readCounts
    };
    
    const payloadPairs = [{
      subject_code: subjectCode,
      subject_name: p.subject_name || tInfo.subject_name || "",
      subject_group: tInfo.subject_group,
      teacher_name: tInfo.teacher_name,
      class_level: classLevel,
      sgs_filename: p.sgs_filename,
      nextschool_filename: p.nextschool_filename,
      sgs_pdf_b64: p.results?.sgs_pdf_b64,
      nextschool_pdf_b64: p.results?.nextschool_pdf_b64,
      results: p.results, // Contains errors, warnings, grading stats
      stats: stats
    }];

    const payload = {
      round_type: roundType,
      academic_year: academicYear,
      semester: semester,
      pairs: payloadPairs
    };

      try {
        setIsSaving(true);
        await fetch(webhookUrl, {
          method: "POST",
          body: JSON.stringify(payload),
          mode: "no-cors",
          headers: {
            "Content-Type": "application/json"
          }
        });
        await Swal.fire({
          icon: 'success',
          title: 'บันทึกสำเร็จ!',
          text: 'ส่งข้อมูลเข้า Google Sheets และบันทึกไฟล์ลง Drive สำเร็จ! (ระบบใช้เวลาทำงานเบื้องหลังประมาณ 1-2 นาที กรุณาตรวจสอบโฟลเดอร์ใน Drive)',
          timer: 3000,
          showConfirmButton: false
        });
        setSavedPairs(prev => ({...prev, [selectedPairIndex]: true}));

        // Save to Local DB
        try {
           await fetch(`${BACKEND_URL}/api/save_work`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ pairs: payloadPairs })
           });
           await fetchSavedWorks();
        } catch(e) {
           console.error('Failed to save to local DB', e);
        }

        await fetchDbData(); // Re-fetch dashboard data after saving
      } catch (err) {
        Swal.fire('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการส่งข้อมูล: ' + String(err), 'error');
      } finally {
        setIsSaving(false);
      }
    } catch (globalErr) {
      Swal.fire('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในระบบ (Frontend): ' + String(globalErr), 'error');
      console.error(globalErr);
      setIsSaving(false);
    }
  }

  const downloadSavedDoc = async (type: 'wp16' | 'wp17' | 'wp25' | 'wp25_group', teacherName: string, extraData?: any) => {
    try {
      setLoading(true);
      const bodyPayload = type === 'wp25_group' 
        ? { group_name: teacherName, head_name: extraData?.head_name, teachers: extraData?.teachers || (Array.isArray(extraData) ? extraData : []) } 
        : { teacher_name: teacherName, subject_group: extraData?.subject_group, mock_subjects: extraData?.mock_subjects };

      const response = await fetch(`${BACKEND_URL}/api/export/${type}/saved`, {
        method: "POST",
        body: JSON.stringify(bodyPayload),
        headers: {
          "Content-Type": "application/json"
        }
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `Server error ${response.status}`);
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type.toUpperCase()}_${teacherName}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error(err);
      Swal.fire("ข้อผิดพลาดในการดาวน์โหลด", err.message || "ไม่สามารถดาวน์โหลดเอกสารได้", "error");
    } finally {
      setLoading(false);
    }
  };

  const downloadDoc = async (type: 'wp16' | 'wp17' | 'wp25', customPairs?: any[]) => {
    if (!results || !results.pairs) return;
    try {
      setLoading(true);
      const payload = customPairs ? { ...results, pairs: customPairs } : results;
      
      const response = await fetch(`${BACKEND_URL}/api/export/${type}`, {
        method: "POST",
        body: JSON.stringify(payload),
        headers: {
          "Content-Type": "application/json"
        }
      });
      
      if (!response.ok) throw new Error("Export failed");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      const filenameSuffix = customPairs && customPairs.length === 1 ? `_${customPairs[0].subject_code}` : "";
      a.download = `${type.toUpperCase()}${filenameSuffix}.docx`;
      
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(`❌ เกิดข้อผิดพลาดในการสร้างเอกสาร: ${err}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-8 font-sans pb-20">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="text-center space-y-4 relative mt-8 mb-8">
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight flex items-center justify-center gap-2">
            <span>ระบบตรวจสอบคะแนน SGS & NextSchool</span> 
            <button 
              onClick={() => setShowPatchNotes(true)}
              className="text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1 rounded-full transition shadow-sm cursor-pointer flex items-center gap-1.5 align-middle"
              title="คลิกเพื่อดูบันทึกการอัปเดตระบบ (Patch Notes)"
            >
              <span>v1.2.4</span>
            </button>
          </h1>
          <p className="text-slate-500 text-lg">อัปโหลดไฟล์ PDF (SGS) และไฟล์ Excel (NextSchool) พร้อมกันหลายไฟล์</p>
        </header>

        {/* View Mode Toggle */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex bg-slate-200/50 p-1 rounded-xl">
            <button 
              onClick={() => setViewMode('dashboard')}
              className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${viewMode === 'dashboard' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
            >
              📊 แดชบอร์ดติดตามการส่งเกรด
            </button>
            <button 
              onClick={() => setViewMode('validator')}
              className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${viewMode === 'validator' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
            >
              📄 อัปโหลด & ตรวจสอบคะแนน
            </button>
          </div>
        </div>

        {viewMode === 'dashboard' && (
          <Dashboard 
            teacherData={teacherData}
            submissions={submissions}
            academicYear={academicYear}
            semester={semester}
            roundType={roundType}
            downloadSavedDoc={downloadSavedDoc}
          />
        )}

        {viewMode === 'validator' && (
          <>
        {/* Upload Section - Unlimited Dropzone */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
          <div 
            className={`relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-xl transition-colors cursor-pointer
              ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100'}
            `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="flex flex-col items-center justify-center pt-5 pb-6 pointer-events-none">
              <svg className={`w-12 h-12 mb-4 ${isDragging ? 'text-blue-500' : 'text-slate-400'}`} aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
              </svg>
              <p className="mb-2 text-lg text-slate-600">
                <span className="font-semibold text-blue-600">คลิกที่นี่</span> หรือลากไฟล์หลายๆ ไฟล์มาวางพร้อมกัน
              </p>
              <p className="text-sm text-slate-500">รองรับไฟล์ PDF (SGS) และไฟล์ Excel (.xlsx) ของ NextSchool</p>
            </div>
            <input 
              type="file" 
              className="hidden" 
              accept=".pdf,.xlsx" 
              multiple 
              ref={fileInputRef}
              onChange={handleFileInput} 
            />
          </div>

          {/* Selected Files List */}
          {files.length > 0 && (
            <div className="mt-6 space-y-3">
              <h3 className="font-semibold text-slate-700">ไฟล์ที่เลือกแล้ว ({files.length} ไฟล์):</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {files.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <div className="flex items-center space-x-3 truncate">
                      <span className="text-emerald-500">📄</span>
                      <span className="text-sm font-medium text-emerald-800 truncate" title={file.name}>{file.name}</span>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                      className="text-emerald-600 hover:text-red-500 transition-colors p-1 ml-2 flex-shrink-0"
                      title="ลบไฟล์"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Bar */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mt-8 animate-fade-in-up">
          
          <div className="flex items-center space-x-4 bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200">

            <label className="font-semibold text-slate-700">ปีการศึกษา:</label>
            <input 
              type="text" 
              value={academicYear} 
              onChange={(e) => setAcademicYear(e.target.value)} 
              disabled={dbConnected}
              className={`w-20 border border-slate-300 rounded px-2 py-1 text-center font-medium focus:outline-none focus:border-blue-500 ${dbConnected ? 'bg-slate-100 cursor-not-allowed' : ''}`} 
            />
            <label className="font-semibold text-slate-700 ml-2">ภาคเรียน:</label>
            <select 
              value={semester} 
              onChange={(e) => setSemester(e.target.value)} 
              disabled={dbConnected}
              className={`border border-slate-300 rounded px-2 py-1 font-medium focus:outline-none focus:border-blue-500 ${dbConnected ? 'bg-slate-100 cursor-not-allowed' : ''}`}
            >
              <option value="1">1</option>
              <option value="2">2</option>
            </select>
          </div>

          <div className="flex items-center space-x-3 bg-slate-100 p-1 rounded-xl shadow-inner border border-slate-200">
            <button
              onClick={() => setRoundType("midterm")}
              className={`px-5 py-2 rounded-lg font-bold transition-all duration-200 ${
                roundType === "midterm"
                  ? "bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
              }`}
            >
              ⭕ กลางภาค
            </button>
            <button
              onClick={() => setRoundType("final")}
              className={`px-5 py-2 rounded-lg font-bold transition-all duration-200 ${
                roundType === "final"
                  ? "bg-white text-rose-600 shadow-sm ring-1 ring-slate-200"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
              }`}
            >
              🔴 ปลายภาค
            </button>
          </div>

          <button 
            onClick={handleCompare}
            disabled={loading || files.length < 2}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white text-lg font-medium rounded-xl shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {loading && (
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            <span>{loading ? 'กำลังประมวลผลจับคู่และตรวจสอบ...' : 'เริ่มตรวจสอบข้อมูล'}</span>
          </button>
        </div>

        {/* Error Message */}
        {errorMsg && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-200 text-center animate-fade-in-up">
            {errorMsg}
          </div>
        )}

        {/* Results Dashboard */}
        {results && (
          <div className="space-y-8 animate-fade-in-up">
            
            {/* Pairs Navigation */}
            {results.pairs && results.pairs.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-2 flex flex-wrap gap-2">
                {results.pairs.map((pair: any, idx: number) => {
                  const errorCount = pair.results.errors?.length || 0;
                  const warningCount = pair.results.warnings?.length || 0;
                  const totalIssues = errorCount + warningCount;
                  
                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedPairIndex(idx)}
                      className={`flex items-center space-x-2 px-4 py-3 rounded-xl font-medium transition-colors ${
                        selectedPairIndex === idx 
                          ? 'bg-blue-600 text-white shadow-md' 
                          : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <span>วิชา {pair.subject_code}</span>
                      {totalIssues > 0 ? (
                        <span className={`px-2 py-0.5 rounded-full text-xs ${selectedPairIndex === idx ? 'bg-white text-red-600' : 'bg-red-100 text-red-600'}`}>
                          พบ {totalIssues} จุด
                        </span>
                      ) : (
                        <span className={`px-2 py-0.5 rounded-full text-xs ${selectedPairIndex === idx ? 'bg-white text-emerald-600' : 'bg-emerald-100 text-emerald-600'}`}>
                          ผ่าน
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Active Pair Content */}
            {results.pairs && results.pairs.length > 0 && results.pairs[selectedPairIndex] && (
              <div className="space-y-6">

                {/* Teacher Info Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 font-bold text-xl shrink-0">
                      {results.pairs[selectedPairIndex].subject_code.substring(0, 1)}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-800">วิชา {results.pairs[selectedPairIndex].subject_code}</h3>
                      {results.pairs[selectedPairIndex].teacher_info && results.pairs[selectedPairIndex].teacher_info.teacher_name !== "ไม่พบในฐานข้อมูล" && (
                        <p className="text-slate-500 mt-1">
                          สอนโดย: {results.pairs[selectedPairIndex].teacher_info.teacher_name} (ชั้น {results.pairs[selectedPairIndex].teacher_info.class_level || results.pairs[selectedPairIndex].class_level})
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                {/* Precheck Status for Active Pair */}
                {(() => {
                  const activePair = results.pairs[selectedPairIndex];
                  const res = activePair.results;
                  return (
                    <div className={`p-6 rounded-2xl border ${res.precheck_passed ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
                        <div className="flex items-center space-x-3">
                          <div className={`text-2xl ${res.precheck_passed ? 'text-emerald-500' : 'text-red-500'}`}>
                            {res.precheck_passed ? '✅' : '❌'}
                          </div>
                          <div>
                            <h3 className={`text-lg font-bold ${res.precheck_passed ? 'text-emerald-800' : 'text-red-800'}`}>
                              สถานะรหัสวิชา: {res.precheck_message}
                            </h3>
                            <p className="text-slate-600 mt-1">SGS: {res.sgs_subject_code || '-'} | NextSchool: {res.nextschool_subject_code || '-'}</p>
                          </div>
                        </div>
                        <div className="text-sm bg-white/60 px-4 py-2 rounded-lg text-slate-700 border border-slate-200 shadow-sm">
                          <div><span className="font-semibold">ไฟล์ SGS:</span> {activePair.sgs_filename}</div>
                          <div><span className="font-semibold">ไฟล์ NextSchool:</span> {activePair.nextschool_filename}</div>
                        </div>
                      </div>
                    </div>
                  )
                })()}

                {/* Student Status/Error Cards */}
                {(() => {
                  const activePair = results.pairs[selectedPairIndex];
                  const res = activePair.results;
                  
                  if (!res.precheck_passed) return null;
                  
                  const hasErrors = res.errors && res.errors.length > 0;
                  const hasWarnings = res.warnings && res.warnings.length > 0;
                  const missingStudents = res.missing_students || [];
                  const atRiskStudents = res.at_risk_students || [];
                  const hasMissing = missingStudents.length > 0;
                  const hasAtRisk = atRiskStudents.length > 0;
                  
                  if (!hasErrors && !hasWarnings && !hasMissing && !hasAtRisk) {
                    return (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center shadow-sm">
                        <div className="text-4xl mb-3">🌟</div>
                        <h3 className="text-xl font-bold text-emerald-800">ข้อมูลสมบูรณ์ 100%</h3>
                        <p className="text-emerald-600 mt-2">ไม่มีข้อมูลขัดแย้ง และนักเรียนทุกคนส่งงานครบถ้วน</p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-6">
                      <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
                        <h3 className="text-xl font-bold text-slate-800">สรุปข้อมูลตรวจสอบนักเรียน</h3>
                        <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-sm font-semibold">
                          พบปัญหา {((res.errors?.length || 0) + (res.warnings?.length || 0) + missingStudents.length + atRiskStudents.length)} รายการ
                        </span>
                      </div>

                      {hasMissing && (
                        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 shadow-sm">
                          <h4 className="font-bold text-rose-700 text-lg flex items-center space-x-2 mb-4">
                            <span>🚫 นักเรียนตกหล่น (รายชื่อไม่ตรงกัน)</span>
                            <span className="bg-rose-200 text-rose-800 px-2 py-0.5 rounded-full text-sm">{missingStudents.length} รายการ</span>
                          </h4>
                          <div className="bg-white rounded-xl shadow-sm border border-rose-200 overflow-hidden">
                            <table className="w-full text-left text-sm">
                              <thead className="bg-rose-50 border-b border-rose-200">
                                <tr>
                                  <th className="px-4 py-3 font-semibold text-rose-800 w-32">รหัสประจำตัว</th>
                                  <th className="px-4 py-3 font-semibold text-rose-800 w-48 text-center">ตกหล่นในระบบ</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-rose-100">
                                {missingStudents.map((ms: any, idx: number) => (
                                  <tr key={idx} className="hover:bg-rose-50/50 transition-colors">
                                    <td className="px-4 py-3 font-mono font-medium text-slate-700">{ms.id}</td>
                                    <td className="px-4 py-3 text-center">
                                      <span className="bg-rose-100 text-rose-700 px-3 py-1 rounded-full text-xs font-bold border border-rose-200 shadow-sm">
                                        {ms.missing_in}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {hasAtRisk && (
                        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-6 shadow-sm">
                          <h4 className="font-bold text-orange-700 text-lg flex items-center space-x-2 mb-4">
                            <span>🚨 นักเรียนกลุ่มเสี่ยง (คะแนนไม่ผ่านเกณฑ์)</span>
                            <span className="bg-orange-200 text-orange-800 px-2 py-0.5 rounded-full text-sm">{atRiskStudents.length} รายการ</span>
                          </h4>
                          <div className="bg-white rounded-xl shadow-sm border border-orange-200 overflow-hidden">
                            <table className="w-full text-left text-sm">
                              <thead className="bg-orange-50 border-b border-orange-200">
                                <tr>
                                  <th className="px-4 py-3 font-semibold text-orange-800 w-32">รหัสประจำตัว</th>
                                  
                                  <th className="px-4 py-3 font-semibold text-orange-800 text-center">คะแนน/เกรด</th>
                                  <th className="px-4 py-3 font-semibold text-orange-800">สาเหตุ</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-orange-100">
                                {atRiskStudents.map((rs: any, idx: number) => (
                                  <tr key={idx} className="hover:bg-orange-50/50 transition-colors">
                                    <td className="px-4 py-3 font-mono font-medium text-slate-700">{rs.id}</td>
                                    <td className="px-4 py-3 text-slate-700 font-medium">{rs.name}</td>
                                    <td className="px-4 py-3 text-center">
                                      <div className="inline-flex items-center space-x-2">
                                        <span className="font-bold text-orange-600 text-base">{rs.score}</span>
                                        {rs.max_score && rs.max_score !== "-" && (
                                          <>
                                            <span className="text-slate-400">/</span>
                                            <span className="text-slate-500 font-medium">{rs.max_score}</span>
                                          </>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 text-orange-700 font-medium">{rs.reason || "คะแนนต่ำกว่าครึ่ง"}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Errors Table */}
                        <div className="space-y-2">
                          <h4 className="font-bold text-red-700 flex items-center space-x-2">
                            <span>🔴 ข้อมูลขัดแย้ง (ต้องแก้ไข)</span>
                            <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs">{res.errors?.length || 0} รายการ</span>
                          </h4>
                          <div className="bg-white rounded-xl shadow-sm border border-red-200 overflow-hidden">
                            <div className="overflow-x-auto max-h-[350px] overflow-y-auto custom-scrollbar">
                              {res.errors && res.errors.length > 0 ? (
                                <table className="w-full text-left text-sm relative">
                                  <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                                    <tr>
                                      <th className="px-4 py-3 font-semibold text-slate-700 w-24">รหัส</th>
                                      <th className="px-4 py-3 font-semibold text-slate-700">รายละเอียดปัญหา</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {Object.entries(
                                      (res.errors || []).reduce((acc: any, err: any) => {
                                        if (!acc[err.student_id]) acc[err.student_id] = [];
                                        acc[err.student_id].push(err);
                                        return acc;
                                      }, {})
                                    ).map(([studentId, errors]) => (
                                      <StudentErrorRow key={studentId} studentId={studentId} errors={errors as any[]} />
                                    ))}
                                  </tbody>
                                </table>
                              ) : (
                                <div className="p-8 text-center text-slate-500">ไม่พบข้อมูลขัดแย้ง 🌟</div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Warnings Table */}
                        <div className="space-y-2">
                          <h4 className="font-bold text-amber-600 flex items-center space-x-2">
                            <span>🟡 จุดสังเกต / ค้างส่งงาน</span>
                            <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-xs">{res.warnings?.length || 0} รายการ</span>
                          </h4>
                          <div className="bg-white rounded-xl shadow-sm border border-amber-200 overflow-hidden">
                            <div className="overflow-x-auto max-h-[350px] overflow-y-auto custom-scrollbar">
                              {res.warnings && res.warnings.length > 0 ? (
                                <table className="w-full text-left text-sm relative">
                                  <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                                    <tr>
                                      <th className="px-4 py-3 font-semibold text-slate-700 w-24">รหัส</th>
                                      <th className="px-4 py-3 font-semibold text-slate-700 w-24">ประเภท</th>
                                      <th className="px-4 py-3 font-semibold text-slate-700">รายละเอียดปัญหา</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {Object.entries(
                                      (res.warnings || []).reduce((acc: any, warn: any) => {
                                        if (!acc[warn.student_id]) acc[warn.student_id] = [];
                                        acc[warn.student_id].push(warn);
                                        return acc;
                                      }, {})
                                    ).map(([studentId, warnings]) => (
                                      <StudentWarningRow key={studentId} studentId={studentId} warnings={warnings as any[]} />
                                    ))}
                                  </tbody>
                                </table>
                              ) : (
                                <div className="p-8 text-center text-slate-500">ไม่มีจุดสังเกต 🌟</div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Document Image Viewers for Active Pair */}
                {(() => {
                  const activePair = results.pairs[selectedPairIndex];
                  const res = activePair.results;
                  
                  if (!res.precheck_passed || (!res.sgs_images?.length && !res.nextschool_images?.length)) {
                    return null;
                  }

                  return (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mt-8">
                      <div className="bg-slate-800 p-4">
                        <h3 className="text-white font-bold text-lg flex items-center">
                          <span className="mr-2">📄</span> ภาพเอกสารที่ตรวจพบจุดเตือน (วิชา {activePair.subject_code})
                        </h3>
                      </div>
                      <div className="p-6 grid grid-cols-1 xl:grid-cols-2 gap-8">
                        {/* SGS Images */}
                        <div className="space-y-4">
                          <h4 className="font-bold text-slate-700 text-center bg-slate-100 p-2 rounded-lg">เอกสาร SGS (ปพ.5)</h4>
                          <div className="space-y-4 max-h-[800px] overflow-y-auto border border-slate-200 rounded-lg p-2 bg-slate-50">
                            {res.sgs_images?.map((imgStr: string, idx: number) => (
                              <img key={idx} src={imgStr} alt={`SGS Page ${idx+1}`} className="w-full border border-slate-300 shadow-sm" />
                            ))}
                            {(!res.sgs_images || res.sgs_images.length === 0) && (
                              <p className="text-center text-slate-500 py-8">ไม่มีภาพเอกสาร</p>
                            )}
                          </div>
                        </div>
                        
                        {/* NextSchool Images or Excel Grid */}
                        <div className="space-y-4">
                          <h4 className="font-bold text-slate-700 text-center bg-slate-100 p-2 rounded-lg">เอกสาร NextSchool</h4>
                          <div className="max-h-[800px] overflow-auto border border-slate-200 rounded-lg bg-slate-50 relative">
                            {res.nextschool_data?.is_excel && res.nextschool_data.grid_data ? (
                              <NextSchoolExcelViewer 
                                gridData={res.nextschool_data.grid_data} 
                                highlights={res.highlights?.nextschool || []} 
                              />
                            ) : (
                              <div className="space-y-4 p-2">
                                {res.nextschool_images?.map((imgStr: string, idx: number) => (
                                  <img key={idx} src={imgStr} alt={`NextSchool Page ${idx+1}`} className="w-full border border-slate-300 shadow-sm" />
                                ))}
                                {(!res.nextschool_images || res.nextschool_images.length === 0) && (
                                  <p className="text-center text-slate-500 py-8">ไม่มีภาพเอกสาร</p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })()}

                {/* Bottom Action Buttons */}
                <div className="bg-slate-100 p-6 rounded-2xl flex flex-col items-center justify-center space-y-4 mt-8 border border-slate-200">
                  <h3 className="text-slate-700 font-bold mb-2">เมื่อตรวจสอบความถูกต้องเรียบร้อยแล้ว</h3>
                  <div className="flex flex-wrap justify-center gap-4">
                    <button 
                      onClick={exportToGoogleSheets}
                      disabled={savedPairs[selectedPairIndex]}
                      className={`px-8 py-3 font-bold rounded-xl shadow-md transition flex items-center space-x-2 ${savedPairs[selectedPairIndex] ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 text-white transform hover:scale-105'}`}
                    >
                      <span className="text-xl">✅</span>
                      <span>{savedPairs[selectedPairIndex] ? 'บันทึกแล้ว' : 'ยืนยันข้อมูลและบันทึก (วิชานี้)'}</span>
                    </button>
                  </div>
                </div>

              </div>
            )}

            {/* Unmatched Files Alert */}
            {results.unmatched && results.unmatched.length > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-2xl p-6 mt-8">
                <div className="flex items-start space-x-3">
                  <span className="text-2xl">⚠️</span>
                  <div>
                    <h3 className="text-lg font-bold text-orange-800">มีไฟล์ที่ไม่สามารถจับคู่ได้</h3>
                    <p className="text-orange-700 mt-1">ไฟล์เหล่านี้ไม่มีรายชื่อนักเรียนที่ตรงกับไฟล์ใดๆ เลยในระบบ หรืออ่านข้อมูลไม่ได้:</p>
                    <ul className="mt-3 space-y-1">
                      {results.unmatched.map((fname: string, idx: number) => (
                        <li key={idx} className="text-orange-900 flex items-center space-x-2">
                          <span className="w-1.5 h-1.5 bg-orange-500 rounded-full"></span>
                          <span>{fname}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}
        </>
        )}
      </div>

      {isSaving && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex flex-col justify-center items-center">
          <div className="bg-white p-10 rounded-3xl shadow-2xl flex flex-col items-center animate-fade-in-up">
            <div className="w-20 h-20 border-4 border-slate-100 border-t-emerald-500 rounded-full animate-spin mb-6"></div>
            <p className="text-2xl font-bold text-slate-800">กำลังบันทึกข้อมูล...</p>
            <p className="text-slate-500 mt-3 text-center max-w-sm leading-relaxed">
              กรุณารอสักครู่ ระบบกำลังอัปโหลดไฟล์ต้นฉบับลง Google Drive และบันทึกสถิติเข้าสู่ฐานข้อมูล
            </p>
          </div>
        </div>
      )}

      {/* Patch Notes Modal */}
      {showPatchNotes && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 md:p-8 shadow-2xl space-y-6 relative border border-slate-100 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">📋</span>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">บันทึกการอัปเดตระบบ (Patch Notes)</h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">เวอร์ชันปัจจุบัน: <span className="text-blue-600 font-bold">v1.2.4</span> (20 กรกฎาคม 2569)</p>
                </div>
              </div>
              <button 
                onClick={() => setShowPatchNotes(false)}
                className="text-slate-400 hover:text-slate-600 text-2xl font-bold p-1 rounded-lg hover:bg-slate-100 transition"
              >
                ✕
              </button>
            </div>

            
              <div className="space-y-6 text-sm text-slate-700">
                {/* Version 1.2.4 */}
                <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-blue-900 text-base">✨ เวอร์ชัน v1.2.4</span>
                      <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full font-semibold">ล่าสุด</span>
                    </div>
                    <ul className="space-y-1.5 text-blue-800/80 pl-4 list-disc text-sm">
                      <li><strong className="text-blue-900">จัดกลุ่มห้องใน วผ.25:</strong> ระบบจะจัดกลุ่มห้องที่สอนวิชาเดียวกันให้อัตโนมัติ (เช่น ห้อง 1-11) เพื่อให้ง่ายต่อการอ่าน</li>
                      <li><strong className="text-blue-900">ปรับปรุงระยะเว้นวรรค:</strong> ปรับระยะเว้นวรรคในรายวิชาให้สวยงามพอดีกับหน้ากระดาษและไม่ซ้อนกับเลขข้อ</li>
                      <li><strong className="text-blue-900">ปุ่มดาวน์โหลดเอกสารสรุป:</strong> ปรับโฉมปุ่มดาวน์โหลดบันทึกข้อความสรุปกลุ่มสาระฯ ให้โดดเด่นและชัดเจนขึ้น</li>
                      <li><strong className="text-blue-900">ล็อกการดาวน์โหลด:</strong> ระบบจะเปิดให้ดาวน์โหลดเอกสารรายบุคคลได้ เฉพาะเมื่อส่งคะแนนครบสมบูรณ์ 100% แล้วเท่านั้น</li>
                    </ul>
                  </div>

                {/* Version 1.2.3 */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 opacity-80">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-slate-800 text-base">📌 เวอร์ชัน v1.2.3</div>
                    </div>
                    <ul className="space-y-1.5 text-blue-800/80 pl-4 list-disc text-sm">
                      <li><strong className="text-blue-900">อัปเดตระบบฐานข้อมูล:</strong> รองรับการดึงข้อมูล "ชื่อวิชา" (Subject Name) โดยตรงจากฐานข้อมูล Google Sheets ผ่าน Google Apps Script ตัวใหม่</li>
                      <li><strong className="text-blue-900">เอกสารสมบูรณ์ 100%:</strong> เมื่อดาวน์โหลดเอกสาร (วผ.25, วผ.16, วผ.17) จะมีชื่อรายวิชาปรากฏครบถ้วน ไม่เว้นว่างอีกต่อไป</li>
                    </ul>
                  </div>

                {/* Version 1.2.2 */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 opacity-80">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-slate-800 text-base">📌 เวอร์ชัน v1.2.2</div>
                    </div>
                    <ul className="space-y-2.5 text-slate-700 pl-4 list-disc">
                      <li><strong className="text-blue-900">เพิ่มปุ่มล้างข้อมูล:</strong> ล้างฐานข้อมูลการส่งเกรดใน Dashboard สำหรับทดสอบระบบใหม่ได้ง่ายๆ</li>
                      <li><strong className="text-blue-900">ระบบทดสอบอัจฉริยะ:</strong> หากกดดาวน์โหลดเอกสารโดยที่ไม่มีข้อมูลส่งเกรด ระบบจะสร้างเอกสารจำลองจากวิชาที่ครูท่านนั้นสอนทั้งหมดให้เลย</li>
                      <li><strong className="text-blue-900">แก้บั๊กแจ้งเตือน:</strong> เพิ่มข้อความแจ้งเตือนสีแดงในหน้าระบบตรวจ หากระบบต้องเดาวิชาแทนเพราะหาข้อมูลในฐานข้อมูลไม่เจอ</li>
                      <li><strong className="text-blue-900">ปรับปรุงความแม่นยำ:</strong> ระบบจับคู่ชั้นเรียนฉลาดขึ้นมาก รองรับการเขียนแบบ "4 ห้อง 1" หรือ "ม.4/1" หรือแบบเป็นช่วงชั้นเรียน</li>
                    </ul>
                  </div>

                {/* Version 1.2.1 */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 opacity-80">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-slate-800 text-base">📌 เวอร์ชัน v1.2.1</div>
                  </div>
                  <ul className="space-y-2.5 text-slate-700 pl-4 list-disc">
                    <li>
                      <strong className="text-slate-900">📑 รายงาน วผ.25 กลุ่มสาระฯ (ปรับปรุงความถูกต้อง):</strong> ใช้ข้อมูลสถิติจริงในการคำนวณร้อยละ, ลบหน้ากระดาษเปล่าส่วนเกินในรายงาน, และปรับปรุงให้แสดงผลเฉพาะตารางของกลุ่มสาระฯ ที่เลือกเท่านั้น
                    </li>
                    <li>
                      <strong className="text-slate-900">👤 รายชื่อหัวหน้ากลุ่มสาระฯ:</strong> ลบเครื่องหมายวงเล็บและกรองข้อมูลรายชื่อในระบบ (Dropdown) ให้แสดงผลเฉพาะบุคคลในกลุ่มสาระนั้น ๆ อย่างแม่นยำ
                    </li>
                  </ul>
                </div>

              {/* Version 1.2.0 */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 opacity-80">
                <div className="font-bold text-slate-800 text-base">📌 เวอร์ชัน v1.2.0</div>
                <ul className="space-y-1.5 text-slate-600 pl-4 list-disc">
                  <li>
                    <strong className="text-slate-900">📄 เอกสาร วผ.25 (รายงานคะแนนกลางภาค):</strong> ระบบสร้างและดาวน์โหลดเอกสาร วผ.25 บันทึกข้อความรายงานคะแนนกลางภาคอัตโนมัติทั้งแบบรายบุคคลและภาพรวมกลุ่มสาระฯ
                  </li>
                  <li>
                    <strong className="text-slate-900">📁 จัดกลุ่มแดชบอร์ดตามกลุ่มสาระฯ (Group by Subject Group):</strong> จัดหมวดหมู่ครูตามกลุ่มสาระการเรียนรู้อย่างเป็นระเบียบ พร้อมระบบย่อ/ขยาย (Collapsible) <strong>หุบเป็นค่าเริ่มต้น</strong> เพื่อความสบายตาและดูง่าย
                  </li>
                  <li>
                    <strong className="text-slate-900">📄 ปุ่มโหลดบันทึกข้อความสรุปกลุ่มสาระฯ:</strong> เพิ่มปุ่มดาวน์โหลดเอกสารรายงานการส่งคะแนนเก็บภาพรวมกลุ่มสาระฯ บนแถบหัวข้อกลุ่มสาระการเรียนรู้
                  </li>
                  <li>
                    <strong className="text-slate-900">🎨 แถบดาวน์โหลดเอกสารครูแบบใหม่:</strong> จัดวางปุ่มดาวน์โหลดเอกสาร (<strong>📄 วผ.25</strong>, <strong>📄 วผ.16</strong>, <strong>📄 วผ.17</strong>) ไว้ใต้ชื่อครู พร้อมระบบปุ่มสีเทา (Disabled) เมื่อยังส่งไม่ครบ
                  </li>
                  <li>
                    <strong className="text-slate-900">🐛 แก้ไขบัคแดชบอร์ด:</strong> แก้ไขข้อผิดพลาดการดึงข้อมูลสถิติเกรดปลายภาค (`latestFin`) หน้าจอขาว
                  </li>
                </ul>
              </div>

              {/* Version 1.1.3 */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 opacity-80">
                <div className="font-bold text-slate-800 text-base">📌 เวอร์ชัน v1.1.3</div>
                <ul className="space-y-1.5 text-slate-600 pl-4 list-disc">
                  <li>เพิ่มแดชบอร์ดติดตามสถานะการส่งเกรดแยกกลางภาค/ปลายภาค</li>
                  <li>รองรับการส่งออกไฟล์ วผ.16 (รายงาน 0 ร มผ) และ วผ.17 (รายงานกิจกรรม)</li>
                </ul>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowPatchNotes(false)}
                className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl transition shadow-sm cursor-pointer"
              >
                เข้าใจแล้ว / ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default App
