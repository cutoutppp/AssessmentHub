import { useState, useRef, useEffect } from 'react'
import NextSchoolExcelViewer from './NextSchoolExcelViewer'
import Swal from 'sweetalert2'
import Dashboard from './Dashboard'
import AssistantChatbot from './AssistantChatbot'

const StudentErrorRow = ({ studentId, errors }: { studentId: string, errors: any[] }) => {
  const [expanded, setExpanded] = useState(true);
  const studentName = errors[0]?.name || '';
  const isOfficialMs = errors.some((e: any) => e.type === "Official MS Violation" || e.message?.includes("มส. ทางการ") || e.message?.includes("เวลาเรียนไม่ถึง 80%"));
  const isUnauthorizedMs = errors.some((e: any) => e.type === "Unauthorized MS Error" || e.message?.includes("ไม่อยู่ในประกาศรายชื่อ มส.") || e.message?.includes("แอบให้ มส"));

  return (
    <>
      <tr className="hover:bg-red-50/80 transition cursor-pointer border-b border-red-100" onClick={() => setExpanded(!expanded)}>
        <td className="px-4 py-3">
          <div className="font-bold text-slate-800 font-mono text-sm">{studentId}</div>
          {studentName && <div className="text-xs text-slate-600 font-medium">{studentName}</div>}
        </td>
        <td className="px-4 py-3 text-slate-600 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-red-700 text-sm">พบ {errors.length} จุดขัดแย้ง</span>
            {isOfficialMs && (
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-red-100 text-red-800 border border-red-200">
                มส. ทางการ
              </span>
            )}
            {isUnauthorizedMs && (
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                มส. นอกประกาศ
              </span>
            )}
          </div>
          <span className="text-slate-400 text-xs font-semibold">{expanded ? '▲ ย่อ' : '▼ ดูรายละเอียด'}</span>
        </td>
      </tr>
      {expanded && errors.map((err, idx) => {
        const itemIsOfficialMs = err.type === "Official MS Violation" || err.message?.includes("มส. ทางการ") || err.message?.includes("เวลาเรียนไม่ถึง 80%");
        const itemIsUnauthorizedMs = err.type === "Unauthorized MS Error" || err.message?.includes("ไม่อยู่ในประกาศรายชื่อ มส.");

        return (
          <tr key={`${studentId}-${idx}`} className="bg-red-50/40 border-b border-red-100/60">
            <td className="px-4 py-2 border-l-4 border-red-500"></td>
            <td className="px-4 py-2.5 text-sm text-slate-700 space-y-1">
              <div className="font-medium text-red-800">• {err.message}</div>
              {itemIsOfficialMs && (
                <div className="text-xs text-red-700 bg-white/90 p-2 rounded-lg border border-red-200 font-medium shadow-xs">
                  👉 <b>วิธีแก้ไข:</b> นักเรียนมีชื่อติด มส. ทางการ (เวลาเรียนไม่ถึง 80%) ห้ามมีคะแนนสอบปลายภาคและห้ามได้เกรดอื่น กรุณาแก้ใน SGS ให้เกรดเป็น <b>'มส'</b> และลบคะแนนสอบปลายภาคออก
                </div>
              )}
              {itemIsUnauthorizedMs && (
                <div className="text-xs text-amber-800 bg-white/90 p-2 rounded-lg border border-amber-200 font-medium shadow-xs">
                  👉 <b>วิธีแก้ไข:</b> นักเรียนไม่ได้อยู่ในประกาศรายชื่อ มส. ทางการ หากไม่ได้ผ่านมติวิชาการ ห้ามตัดสิทธิ์ มส. เองทีหลัง ให้ประเมินและให้เกรดตามปกติ
                </div>
              )}
              {!itemIsOfficialMs && !itemIsUnauthorizedMs && (
                <div className="text-xs text-slate-600 bg-white/90 p-2 rounded-lg border border-slate-200 font-medium shadow-xs">
                  👉 <b>วิธีแก้ไข:</b> ตรวจสอบช่องคะแนนใน SGS และ NextSchool ให้ตรงกัน แล้วนำไฟล์มาตรวจใหม่อีกครั้ง
                </div>
              )}
            </td>
          </tr>
        );
      })}
    </>
  );
};

const StudentWarningRow = ({ studentId, warnings }: { studentId: string, warnings: any[] }) => {
  const [expanded, setExpanded] = useState(false);
  const studentName = warnings[0]?.name || '';
  const isMissingWork = warnings.some(warn => warn.message?.includes('ขาด') || warn.message?.includes('ยังไม่ได้กรอก') || warn.message?.includes('0'));
  
  return (
    <>
      <tr className="hover:bg-amber-50 transition cursor-pointer border-b border-amber-100" onClick={() => setExpanded(!expanded)}>
        <td className="px-4 py-3">
          <div className="font-bold text-slate-800 font-mono text-sm">{studentId}</div>
          {studentName && <div className="text-xs text-slate-600 font-medium">{studentName}</div>}
        </td>
        <td className="px-4 py-3">
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${isMissingWork ? 'bg-orange-100 text-orange-700' : 'bg-amber-100 text-amber-700'}`}>
            {isMissingWork ? 'ค้างส่งงาน' : 'จุดสังเกต'}
          </span>
        </td>
        <td className="px-4 py-3 text-slate-600 flex items-center justify-between">
          <span className="font-medium text-amber-700 text-sm">พบ {warnings.length} รายการ</span>
          <span className="text-slate-400 text-xs font-semibold">{expanded ? '▲ ย่อ' : '▼ ดูรายละเอียด'}</span>
        </td>
      </tr>
      {expanded && warnings.map((warn, idx) => {
        const isMissingRow = warn.message?.includes('ขาด') || warn.message?.includes('ยังไม่ได้กรอก') || warn.message?.includes('0');
        return (
          <tr key={`${studentId}-${idx}`} className={`${isMissingRow ? 'bg-orange-50/40' : 'bg-amber-50/40'} border-b border-amber-100/60`}>
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
      
      const tClasses = (t.class_level || "").toString().split(',').map(s => normalizeClass(s));
      if (tClasses.includes(normInput)) return true;
      
      const rawClasses = (t.class_level || "").toString().split(',').map(s => s.trim());
      if (rawClasses.includes(classLevel)) return true;

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
    if (files.length === 0) {
      Swal.fire({
        icon: 'info',
        title: 'ยังไม่ได้เลือกไฟล์',
        text: 'กรุณาอัปโหลดไฟล์คะแนนจาก SGS (PDF) และ NextSchool (Excel) อย่างน้อยระบบละ 1 ไฟล์',
        confirmButtonColor: '#3b82f6',
      });
      return;
    }

    if (files.length === 1) {
      const singleFile = files[0];
      const isPdf = singleFile.name.toLowerCase().endsWith('.pdf');
      const isXlsx = singleFile.name.toLowerCase().endsWith('.xlsx') || singleFile.name.toLowerCase().endsWith('.xls');
      const missingType = isPdf ? 'Excel (.xlsx) ของ NextSchool' : (isXlsx ? 'PDF ของ SGS' : 'ไฟล์คู่เทียบจากอีกระบบ');

      Swal.fire({
        icon: 'warning',
        title: 'ไฟล์ยังไม่ครบ 2 ระบบ',
        html: `
          <div class="text-left text-sm space-y-2">
            <p>ขณะนี้ท่านเพิ่งเลือกไฟล์เพียง <b>1 ไฟล์</b>:</p>
            <div class="p-2.5 bg-slate-100 rounded-lg text-slate-700 font-mono text-xs">📄 ${singleFile.name}</div>
            <p class="text-amber-800 font-semibold">⚠️ ขาดไฟล์คู่เทียบ: กรุณาเพิ่มไฟล์ <u>${missingType}</u> เพื่อนำมาตรวจเปรียบเทียบกัน</p>
          </div>
        `,
        confirmButtonColor: '#f59e0b',
      });
      return;
    }
    
    if (!roundType) {
      Swal.fire({
        icon: 'warning',
        title: 'กรุณาเลือกประเภทการสอบ',
        text: 'กรุณาคลิกเลือก "กลางภาค" หรือ "ปลายภาค" ที่แถบด้านบน ก่อนเริ่มตรวจสอบ',
        confirmButtonColor: '#f59e0b',
      });
      return;
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
        setErrorMsg(data.detail || "เกิดข้อผิดพลาดในการตรวจสอบข้อมูล")
      } else {
        if (data.data && data.data.pairs) {
          data.data.pairs = data.data.pairs.map((pair: any) => ({
            ...pair,
            teacher_info: getTeacherInfo(pair.subject_code, pair.class_level)
          }));
        }
        setResults(data.data)
      }
    } catch (err: any) {
      console.error(err);
      const isNetworkErr = err?.message?.includes('fetch') || err?.name === 'TypeError';
      const msg = isNetworkErr
        ? "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ Backend ได้ (กรุณาตรวจสอบว่าเปิดโปรแกรมรัน Backend ที่พอร์ต 8000 อยู่หรือไม่)"
        : ("เกิดข้อผิดพลาดในการประมวลผล: " + (err?.message || String(err)));
      setErrorMsg(msg);
      Swal.fire({
        icon: 'error',
        title: 'การเชื่อมต่อขัดข้อง',
        text: msg,
        confirmButtonColor: '#ef4444'
      });
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
        const errorList = activePair.results.errors || [];
        
        // Group by category for clear, actionable reporting
        const officialMsErrors = errorList.filter((e: any) => 
          e.type === "Official MS Violation" || e.message?.includes("มส. ทางการ") || e.message?.includes("เวลาเรียนไม่ถึง 80%")
        );
        const unauthorizedMsErrors = errorList.filter((e: any) => 
          e.type === "Unauthorized MS Error" || e.message?.includes("ไม่อยู่ในประกาศรายชื่อ มส.") || e.message?.includes("แอบให้ มส")
        );
        const mismatchErrors = errorList.filter((e: any) => 
          !officialMsErrors.includes(e) && !unauthorizedMsErrors.includes(e)
        );

        let html = `
          <div class="text-left text-sm space-y-3 max-h-[65vh] overflow-y-auto pr-1">
            <div class="p-3 bg-red-50 border-l-4 border-red-500 rounded text-red-900 text-xs">
              <span class="font-bold text-sm">⛔ พบข้อผิดพลาดทั้งหมด ${errorList.length} จุด</span>
              <p class="mt-0.5 text-slate-600">ระบบจำเป็นต้องระงับการบันทึกข้อมูลเข้า Google Sheets และ Drive ชั่วคราว เพื่อป้องกันข้อมูลเกรดหรือสถิติผิดพลาด</p>
            </div>
        `;

        if (officialMsErrors.length > 0) {
          html += `
            <div class="border border-red-200 bg-white rounded-lg p-3 shadow-xs">
              <div class="font-bold text-red-800 text-xs flex items-center justify-between pb-1.5 border-b border-red-100">
                <span>🚫 นักเรียนติด มส. ทางการ แต่ครูคีย์เกรดหรือคะแนนสอบ</span>
                <span class="bg-red-100 text-red-800 px-2 py-0.5 rounded-full text-[11px] font-bold">${officialMsErrors.length} รายการ</span>
              </div>
              <ul class="divide-y divide-red-50 mt-1 max-h-36 overflow-y-auto text-xs">
                ${officialMsErrors.map((e: any) => `
                  <li class="py-1.5">
                    <span class="font-bold text-slate-800 font-mono">${e.student_id}</span> 
                    <span class="text-slate-600 font-medium">${e.name || ''}</span>: 
                    <span class="text-red-700">${e.message}</span>
                  </li>
                `).join('')}
              </ul>
              <div class="mt-2 text-[11px] bg-red-50 p-2 rounded text-red-800 font-medium">
                👉 <b>วิธีแก้ไข:</b> เข้าโปรแกรม SGS เปลี่ยนผลการเรียนเป็น <b>'มส'</b> และลบคะแนนสอบปลายภาคออกให้เป็นช่องว่าง
              </div>
            </div>
          `;
        }

        if (unauthorizedMsErrors.length > 0) {
          html += `
            <div class="border border-amber-200 bg-white rounded-lg p-3 shadow-xs">
              <div class="font-bold text-amber-800 text-xs flex items-center justify-between pb-1.5 border-b border-amber-100">
                <span>⚠️ ติด 'มส' เองทีหลังโดยไม่ผ่านประกาศวิชาการ</span>
                <span class="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full text-[11px] font-bold">${unauthorizedMsErrors.length} รายการ</span>
              </div>
              <ul class="divide-y divide-amber-50 mt-1 max-h-36 overflow-y-auto text-xs">
                ${unauthorizedMsErrors.map((e: any) => `
                  <li class="py-1.5">
                    <span class="font-bold text-slate-800 font-mono">${e.student_id}</span> 
                    <span class="text-slate-600 font-medium">${e.name || ''}</span>: 
                    <span class="text-amber-700">${e.message}</span>
                  </li>
                `).join('')}
              </ul>
              <div class="mt-2 text-[11px] bg-amber-50 p-2 rounded text-amber-800 font-medium">
                👉 <b>วิธีแก้ไข:</b> นักเรียนคนนี้ไม่ได้อยู่ในประกาศ มส. ทางการ หากไม่ได้ผ่านมติงานวิชาการ ห้ามตัดสิทธิ์ มส. เอง ให้ใส่คะแนนและเกรดตามจริง
              </div>
            </div>
          `;
        }

        if (mismatchErrors.length > 0) {
          html += `
            <div class="border border-slate-200 bg-white rounded-lg p-3 shadow-xs">
              <div class="font-bold text-slate-800 text-xs flex items-center justify-between pb-1.5 border-b border-slate-100">
                <span>❌ คะแนนหรือข้อมูลไม่ตรงกันระหว่างสองระบบ</span>
                <span class="bg-slate-100 text-slate-800 px-2 py-0.5 rounded-full text-[11px] font-bold">${mismatchErrors.length} รายการ</span>
              </div>
              <ul class="divide-y divide-slate-100 mt-1 max-h-36 overflow-y-auto text-xs">
                ${mismatchErrors.map((e: any) => `
                  <li class="py-1.5">
                    <span class="font-bold text-slate-800 font-mono">${e.student_id}</span> 
                    <span class="text-slate-600 font-medium">${e.name || ''}</span>: 
                    <span class="text-slate-700">${e.message}</span>
                  </li>
                `).join('')}
              </ul>
              <div class="mt-2 text-[11px] bg-slate-100 p-2 rounded text-slate-700 font-medium">
                👉 <b>วิธีแก้ไข:</b> เทียบดูคะแนนที่ไฮไลท์กล่องสีแดงในเอกสารด้านล่าง แล้วปรับแก้คะแนนในระบบให้ตรงกัน
              </div>
            </div>
          `;
        }

        html += `
            <div class="p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 flex items-center space-x-2">
              <span class="text-base">💡</span>
              <span><b>ขั้นตอนต่อไป:</b> เมื่อแก้ไขใน SGS / NextSchool แล้ว บันทึกและนำไฟล์ใหม่มาตรวจอีกครั้ง</span>
            </div>
          </div>
        `;

        await Swal.fire({
          icon: 'error',
          title: 'ไม่อนุญาตให้บันทึกข้อมูล',
          html: html,
          confirmButtonColor: '#ef4444',
          confirmButtonText: 'เข้าใจแล้ว จะนำไปแก้ไขในระบบ',
          customClass: {
            popup: 'rounded-2xl max-w-xl',
          }
        });
        return;
      }

      const hasMissing = activePair.results.missing_students && activePair.results.missing_students.length > 0;
      if (hasMissing) {
        const missingList = activePair.results.missing_students;
        const res = await Swal.fire({
          icon: 'info',
          title: 'แจ้งเตือน: พบรายชื่อไม่ตรงกัน',
          html: `
            <div class="text-left text-sm space-y-2">
              <p>มีนักเรียนที่ปรากฏในระบบหนึ่งแต่ไม่มีในอีกระบบ <b>${missingList.length}</b> คน (แจ้งเตือนเพื่อทราบ):</p>
              <div class="max-h-40 overflow-y-auto bg-slate-50 p-2 rounded-lg border border-slate-200 text-xs divide-y divide-slate-100">
                ${missingList.map((m: any) => `
                  <div class="py-1.5 flex justify-between items-center">
                    <span class="font-mono font-bold text-slate-800">${m.id}</span>
                    <span class="text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-medium border border-amber-200">ตกหล่นใน ${m.missing_in}</span>
                  </div>
                `).join('')}
              </div>
              <p class="text-slate-600 text-xs mt-2">
                คะแนนในส่วนของนักเรียนคนอื่นๆ มีความถูกต้องสมบูรณ์ คุณต้องการยืนยันบันทึกข้อมูลเข้าฐานข้อมูลใช่หรือไม่?
              </p>
            </div>
          `,
          showCancelButton: true,
          confirmButtonColor: '#f59e0b',
          cancelButtonColor: '#94a3b8',
          confirmButtonText: 'ยืนยันบันทึกข้อมูล',
          cancelButtonText: 'ยกเลิกเพื่อตรวจสอบก่อน'
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
    
    // ดึงรายชื่อนักเรียนจากไฟล์ Excel ของ NextSchool มาจับคู่เพื่อแก้ชื่อเพี้ยนจาก PDF
    const nsStudentsObj = p.raw_data?.nextschool_students || {};
    const nsNameMap: Record<string, string> = {};
    if (Array.isArray(nsStudentsObj)) {
      nsStudentsObj.forEach((ns: any) => {
        const sid = String(ns?.student_id || ns?.id || "").trim();
        const sname = (ns?.name || ns?.student_name || "").trim();
        if (sid && sname && sname.toLowerCase() !== "nan" && sname !== "-") nsNameMap[sid] = sname;
      });
    } else if (typeof nsStudentsObj === 'object') {
      Object.entries(nsStudentsObj).forEach(([k, ns]: [string, any]) => {
        const sid = String(ns?.student_id || ns?.id || k || "").trim();
        const sname = (ns?.name || ns?.student_name || "").trim();
        if (sid && sname && sname.toLowerCase() !== "nan" && sname !== "-") nsNameMap[sid] = sname;
      });
    }

    const subjCode = tInfo.subject_code || subjectCode;
    const subjName = p.subject_name || tInfo.subject_name || "";
    const teachName = tInfo.teacher_name || "";
    const cLevel = tInfo.class_level || classLevel;
    const nowIso = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const failingStudents: any[] = [];
    sgsStudents.forEach((student: any) => {
      let g = String(student.grade || "").trim();
      if (g.endsWith(".0")) g = g.slice(0, -2);
      const isMan = Boolean(student.is_manual);
      if (["0", "ร", "มส", "มผ"].includes(g) || isMan) {
        const sid = String(student.student_id || student.id || "").trim();
        if (sid) {
          // ดึงชื่อภาษาไทยที่ถูกต้องจาก NextSchool ก่อนเสมอ หากไม่มีค่อยใช้ชื่อจาก SGS
          const cleanName = (nsNameMap[sid] && !isMan)
            ? nsNameMap[sid]
            : (student.name || `${student.prefix || ""}${student.firstname || ""} ${student.lastname || ""}`.trim());

          const defaultTask = g === "0" ? "สอบแก้ตัว" : (g === "มส" ? "มส. (ขาดเรียนเกิน 20%)" : "");
          const defaultRemark = isMan ? "[เพิ่มเอง]" : (g === "มส" ? "[มส. ประกาศทางการ]" : "");
          const oldScore = String(student.total ?? student.score ?? student.raw_score ?? "");

          failingStudents.push({
            special_id: `${subjCode}${sid}`,
            specialId: `${subjCode}${sid}`,
            academic_year: academicYear,
            year: academicYear,
            semester: semester,
            term: semester,
            subject_code: subjCode,
            subjCode: subjCode,
            subject_name: subjName,
            subjName: subjName,
            teacher_name: teachName,
            teacherName: teachName,
            class_level: cLevel,
            classLevel: cLevel,
            student_id: sid,
            stuId: sid,
            student_name: cleanName,
            stuName: cleanName,
            old_score: oldScore,
            oldScore: oldScore,
            old_grade: g,
            oldGrade: g,
            pending_task: student.pending_task || defaultTask,
            pendingTask: student.pending_task || defaultTask,
            remark: student.remark || defaultRemark,
            updated_at: nowIso,
            is_manual: isMan
          });
        }
      }
    });

    const payloadPairs = [{
      subject_code: subjCode,
      subject_name: subjName,
      subject_group: tInfo.subject_group,
      teacher_name: teachName,
      class_level: cLevel,
      sgs_filename: p.sgs_filename,
      nextschool_filename: p.nextschool_filename,
      sgs_pdf_b64: p.results?.sgs_pdf_b64,
      nextschool_pdf_b64: p.results?.nextschool_pdf_b64,
      results: p.results, // Contains errors, warnings, grading stats
      stats: stats,
      raw_data: p.raw_data,
      failing_students: failingStudents
    }];

    const payload = {
      round_type: roundType,
      academic_year: academicYear,
      semester: semester,
      spreadsheetId: "1OJh1FUnvLeIPGls4QIlture5f7GbAM0IieO8J5q9LuQ",
      failing_students: failingStudents,
      pairs: payloadPairs
    };

      try {
        setIsSaving(true);
        let backendSaved = false;
        let driveFolderUrl = "https://drive.google.com/drive/folders/1U2m3mnYaJvq4e4e3iGR5QOPrZoDUNPYj";
        try {
          const res = await fetch(`${BACKEND_URL}/api/queue_save`, {
            method: "POST",
            body: JSON.stringify({
              webhookUrl: webhookUrl,
              payload: payload
            }),
            headers: {
              "Content-Type": "application/json"
            }
          });
          if (res.ok) {
            backendSaved = true;
            try {
              const resJson = await res.json();
              if (resJson?.drive_folder_url) driveFolderUrl = resJson.drive_folder_url;
            } catch (_) {}
          }
        } catch (backendErr) {
          console.warn("Backend queue_save offline/failed, falling back to direct GAS Webhook:", backendErr);
        }

        // หาก Backend ไม่ได้เปิดทำงาน หรือตอบสนองช้า ให้ส่งข้อมูลตรงไปยัง Google Apps Script ทันที เพื่อบันทึกลงชีต History
        if (!backendSaved && webhookUrl) {
          try {
            const directRes = await fetch(webhookUrl, {
              method: "POST",
              headers: { "Content-Type": "text/plain;charset=utf-8" },
              body: JSON.stringify(payload)
            });
            const directJson = await directRes.json();
            if (directJson?.drive_folder_url) driveFolderUrl = directJson.drive_folder_url;
          } catch (_) {}
        }

        // Directly sync failing students to Google Sheets WP16_งานค้าง tab (14 columns)
        if (failingStudents.length > 0 && webhookUrl) {
          try {
            fetch(webhookUrl, {
              method: "POST",
              headers: { "Content-Type": "text/plain;charset=utf-8" },
              body: JSON.stringify({
                action: "sync-wp16-sheet",
                spreadsheetId: "1OJh1FUnvLeIPGls4QIlture5f7GbAM0IieO8J5q9LuQ",
                sheetName: "WP16_งานค้าง",
                items: failingStudents
              })
            }).catch(e => console.warn('Direct GAS WP16 sync error:', e));
          } catch (syncErr) {
            console.warn("Direct WP16 GAS sync error:", syncErr);
          }
        }

        await Swal.fire({
          icon: 'success',
          title: 'บันทึกสำเร็จ!',
          html: `
            <div class="text-left text-sm space-y-2">
              <p class="text-emerald-700 font-semibold">✅ บันทึกสถิติลง Google Sheet และอัปโหลดไฟล์ลง Google Drive เรียบร้อยแล้ว</p>
              
              <div class="p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 space-y-1">
                <div>📁 <b>โฟลเดอร์ใน Google Drive:</b> <a href="${driveFolderUrl}" target="_blank" class="underline font-bold text-blue-600">คลิกที่นี่เพื่อเปิดโฟลเดอร์เก็บไฟล์วิชานี้</a></div>
                <div class="text-[11px] text-slate-500">บันทึกไฟล์ PDF SGS และ Excel NextSchool แยกตามกลุ่มสาระและชื่อครูอัตโนมัติ</div>
              </div>

              ${failingStudents.length > 0 
                ? `<div class="text-xs text-indigo-800 bg-indigo-50 p-2.5 rounded-lg border border-indigo-200">
                    📋 <b>ซิงค์ข้อมูลงานค้าง:</b> บันทึกรายชื่อนักเรียนติด 0, ร, มส, มผ จำนวน <b>${failingStudents.length} คน</b> ลงในแผ่นงาน <a href="https://docs.google.com/spreadsheets/d/1OJh1FUnvLeIPGls4QIlture5f7GbAM0IieO8J5q9LuQ/edit?gid=1367227681#gid=1367227681" target="_blank" class="underline font-bold text-blue-600">WP16_งานค้าง</a> บน Google Sheet เรียบร้อยแล้ว
                   </div>` 
                : `<p class="text-slate-500 text-xs">วิชานี้ไม่มีนักเรียนที่ได้เกรด 0, ร, มส, มผ</p>`
              }
            </div>
          `,
          confirmButtonColor: '#10b981',
          confirmButtonText: 'ตกลง'
        });
        setSavedPairs(prev => ({...prev, [selectedPairIndex]: true}));

        // Save to Local DB
        try {
           await fetch(`${BACKEND_URL}/api/save_work`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                pairs: payloadPairs,
                academic_year: academicYear,
                semester: semester,
                teacher_name: tInfo.teacher_name,
                subject_code: tInfo.subject_code || subjectCode,
                subject_name: p.subject_name || tInfo.subject_name || "",
                failing_students: failingStudents,
                webhookUrl: webhookUrl
              })
           });
           await fetchSavedWorks();
        } catch(e) {
           console.error('Failed to save to local DB', e);
        }

        await fetchDbData(); // Re-fetch dashboard data after saving
      } catch (err: any) {
        console.error(err);
        const errMsg = String(err?.message || err);
        let friendlyReason = errMsg;
        let suggestion = "กรุณาลองใหม่อีกครั้ง หรือติดต่อผู้ดูแลระบบ";

        if (errMsg.includes('Failed to fetch') || errMsg.includes('NetworkError') || errMsg.includes('connection')) {
          friendlyReason = "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ Backend หรือปลายทางได้ (เน็ตเวิร์กขัดข้อง หรือ เซิร์ฟเวอร์ Backend ปิดอยู่)";
          suggestion = "กรุณาตรวจสอบว่าเซิร์ฟเวอร์ Backend (พอร์ต 8000) เปิดทำงานอยู่ และอินเทอร์เน็ตยังเชื่อมต่อได้ปกติ";
        } else if (errMsg.includes('timeout') || errMsg.includes('timed out')) {
          friendlyReason = "Google Apps Script หรือ Google Drive ใช้เวลาตอบสนองนานเกินไป (Timeout)";
          suggestion = "ข้อมูลอาจกำลังประมวลผลอยู่เบื้องหลังใน Google Drive กรุณารอสักครู่แล้วตรวจสอบที่ Google Drive หรือส่งใหม่อีกครั้ง";
        } else if (errMsg.includes('Script') || errMsg.includes('404') || errMsg.includes('403')) {
          friendlyReason = "URL ของ Google Apps Script Web App ไม่ถูกต้อง หรือไม่มีสิทธิ์เข้าถึง (Permission Denied)";
          suggestion = "กรุณาตรวจสอบการตั้งค่า Deploy Web App ให้สิทธิ์ 'Anyone' (ทุกคน) เข้าถึงได้";
        }

        Swal.fire({
          icon: 'error',
          title: 'การส่งข้อมูลขัดข้อง',
          html: `
            <div class="text-left text-sm space-y-2">
              <p class="text-rose-700 font-semibold">❌ สาเหตุ: ${friendlyReason}</p>
              <div class="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs text-slate-700">
                💡 <b>คำแนะนำ:</b> ${suggestion}
              </div>
            </div>
          `,
          confirmButtonColor: '#ef4444'
        });
      } finally {
        setIsSaving(false);
      }
    } catch (globalErr: any) {
      console.error(globalErr);
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาดในระบบ',
        text: 'เกิดข้อผิดพลาดภายในระบบ: ' + (globalErr?.message || String(globalErr)),
        confirmButtonColor: '#ef4444'
      });
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
              <span>v1.3.0</span>
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
            backendUrl={BACKEND_URL}
            webAppUrl={webAppUrl}
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
            disabled={loading}
            className={`px-8 py-3 text-white text-lg font-medium rounded-xl shadow-sm transition flex items-center space-x-2 ${
              loading 
                ? 'bg-slate-400 cursor-wait' 
                : files.length < 2 || !roundType
                ? 'bg-blue-600/80 hover:bg-blue-600 hover:shadow' 
                : 'bg-blue-600 hover:bg-blue-700 hover:scale-105'
            }`}
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

        {/* Dynamic Helper Hint Badges */}
        {files.length === 0 && (
          <div className="flex items-center justify-center mt-3 text-sm text-slate-500 space-x-1.5 animate-fade-in">
            <span>ℹ️</span>
            <span>กรุณาอัปโหลดไฟล์ PDF (SGS) และ Excel (NextSchool) เพื่อเริ่มการตรวจสอบ</span>
          </div>
        )}
        {files.length === 1 && (
          <div className="flex items-center justify-center mt-3 text-sm text-amber-800 bg-amber-50 py-2.5 px-4 rounded-xl border border-amber-200 space-x-2 animate-fade-in shadow-xs">
            <span>⚠️</span>
            <span><b>เลือกแล้ว 1 ไฟล์:</b> กรุณาเพิ่มไฟล์จากอีกระบบ (SGS หรือ NextSchool) ให้ครบเพื่อนำมาเปรียบเทียบกัน</span>
          </div>
        )}
        {files.length >= 2 && !roundType && (
          <div className="flex items-center justify-center mt-3 text-sm text-amber-800 bg-amber-50 py-2.5 px-4 rounded-xl border border-amber-200 space-x-2 animate-fade-in shadow-xs">
            <span>👆</span>
            <span><b>ขั้นตอนสุดท้าย:</b> กรุณาคลิกเลือกประเภทการสอบ <b>"กลางภาค"</b> หรือ <b>"ปลายภาค"</b> ด้านบน</span>
          </div>
        )}

        {/* Error Message */}
        {errorMsg && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-200 text-center animate-fade-in-up mt-3">
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
                      {errorCount > 0 ? (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${selectedPairIndex === idx ? 'bg-white text-red-600' : 'bg-red-100 text-red-600'}`}>
                          ผิด {errorCount} จุด
                        </span>
                      ) : warningCount > 0 ? (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${selectedPairIndex === idx ? 'bg-white text-amber-600' : 'bg-amber-100 text-amber-700'}`}>
                          เตือน {warningCount} จุด
                        </span>
                      ) : (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${selectedPairIndex === idx ? 'bg-white text-emerald-600' : 'bg-emerald-100 text-emerald-600'}`}>
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
                      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
                        <h3 className="text-xl font-bold text-slate-800">สรุปข้อมูลตรวจสอบนักเรียน</h3>
                        {hasErrors && (
                          <span className="bg-rose-100 text-rose-700 px-3 py-1 rounded-full text-sm font-semibold">
                            ข้อผิดพลาด {res.errors.length} รายการ
                          </span>
                        )}
                        {(hasWarnings || hasMissing || hasAtRisk) && (
                          <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-sm font-semibold">
                            ข้อสังเกต/แจ้งเตือน {((res.warnings?.length || 0) + atRiskStudents.length)} รายการ
                          </span>
                        )}
                      </div>

                      {hasMissing && (
                        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 shadow-sm">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                            <h4 className="font-bold text-amber-800 text-lg flex items-center space-x-2">
                              <span>⚠️ นักเรียนตกหล่น (รายชื่อไม่ตรงกัน — แจ้งเตือนเพื่อทราบ)</span>
                              <span className="bg-amber-200 text-amber-900 px-2.5 py-0.5 rounded-full text-sm font-semibold">{missingStudents.length} คน</span>
                            </h4>
                            <span className="text-xs text-amber-700 bg-amber-100/70 border border-amber-200 px-2.5 py-1 rounded-lg">
                              ℹ️ แจ้งเตือนเพื่อทราบ ไม่มีผลบล็อกการบันทึกข้อมูล
                            </span>
                          </div>
                          <div className="bg-white rounded-xl shadow-sm border border-amber-200 overflow-hidden">
                            <table className="w-full text-left text-sm">
                              <thead className="bg-amber-50/75 border-b border-amber-200">
                                <tr>
                                  <th className="px-4 py-3 font-semibold text-amber-900 w-32">รหัสประจำตัว</th>
                                  <th className="px-4 py-3 font-semibold text-amber-900 w-48 text-center">ตกหล่นในระบบ</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-amber-100">
                                {missingStudents.map((ms: any, idx: number) => (
                                  <tr key={idx} className="hover:bg-amber-50/40 transition-colors">
                                    <td className="px-4 py-3 font-mono font-medium text-slate-700">{ms.id}</td>
                                    <td className="px-4 py-3 text-center">
                                      <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-xs font-bold border border-amber-200 shadow-sm">
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

                {/* Bottom Action Buttons with Smart Status Reporting */}
                {(() => {
                  const activePair = results.pairs[selectedPairIndex];
                  const isSaved = !!savedPairs[selectedPairIndex];
                  const errorList = activePair?.results?.errors || [];
                  const missingList = activePair?.results?.missing_students || [];
                  const hasErrors = errorList.length > 0;
                  const hasMissing = missingList.length > 0;

                  return (
                    <div className={`p-6 rounded-2xl flex flex-col items-center justify-center space-y-4 mt-8 border transition-all ${
                      isSaved
                        ? 'bg-slate-50 border-slate-200'
                        : hasErrors
                        ? 'bg-rose-50 border-rose-200 shadow-sm'
                        : hasMissing
                        ? 'bg-amber-50 border-amber-200 shadow-sm'
                        : 'bg-emerald-50 border-emerald-200 shadow-sm'
                    }`}>
                      
                      {/* Status Header Badge & Explanations */}
                      <div className="text-center space-y-1.5 max-w-2xl">
                        {isSaved ? (
                          <div className="flex items-center justify-center space-x-2 text-slate-700 font-bold text-lg">
                            <span className="text-2xl">✅</span>
                            <span>บันทึกข้อมูลวิชานี้เข้าสู่ระบบเรียบร้อยแล้ว</span>
                          </div>
                        ) : hasErrors ? (
                          <>
                            <div className="flex items-center justify-center space-x-2 text-rose-700 font-bold text-lg">
                              <span className="text-2xl">⛔</span>
                              <span>ยังไม่สามารถบันทึกข้อมูลได้ (พบ {errorList.length} ข้อผิดพลาดที่ต้องแก้ไข)</span>
                            </div>
                            <p className="text-sm text-rose-600">
                              มีข้อมูลขัดแย้ง เช่น นักเรียนติด มส. ทางการแต่มีเกรด/คะแนน หรือคะแนนปลายภาคไม่ตรงกัน ระบบจึงบล็อกการบันทึกไว้ชั่วคราว
                            </p>
                            <p className="text-xs text-slate-500 font-medium">
                              👇 คลิกปุ่มสีแดงด้านล่างเพื่อเปิดดู <b>รายชื่อนักเรียน + รายละเอียดปัญหา + วิธีแก้ไข</b> ทั้งหมด
                            </p>
                          </>
                        ) : hasMissing ? (
                          <>
                            <div className="flex items-center justify-center space-x-2 text-amber-700 font-bold text-lg">
                              <span className="text-2xl">⚠️</span>
                              <span>พบรายชื่อนักเรียนตกหล่น {missingList.length} คน (สามารถบันทึกได้หากยืนยัน)</span>
                            </div>
                            <p className="text-xs text-amber-600">
                              คะแนนในส่วนที่มีข้อมูลตรงกันทั้งหมด แต่มีนักเรียนบางคนตกหล่นในระบบใดระบบหนึ่ง
                            </p>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center justify-center space-x-2 text-emerald-700 font-bold text-lg">
                              <span className="text-2xl">🎉</span>
                              <span>ตรวจสอบความถูกต้องผ่าน 100% (ข้อมูลตรงกันทุกจุด)</span>
                            </div>
                            <p className="text-xs text-emerald-600">
                              ข้อมูลคะแนนและผลการเรียนถูกต้องสมบูรณ์ พร้อมส่งเข้า Google Sheets และสำรองไฟล์ต้นฉบับลง Google Drive
                            </p>
                          </>
                        )}
                      </div>

                      {/* Main Action Button */}
                      <div className="flex flex-wrap justify-center gap-4 pt-1">
                        <button 
                          onClick={exportToGoogleSheets}
                          disabled={isSaved || isSaving}
                          className={`px-8 py-3.5 font-bold rounded-xl shadow-md transition-all flex items-center space-x-2 text-base ${
                            isSaved
                              ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                              : hasErrors
                              ? 'bg-rose-600 hover:bg-rose-700 text-white transform hover:scale-105 shadow-rose-200'
                              : hasMissing
                              ? 'bg-amber-600 hover:bg-amber-700 text-white transform hover:scale-105 shadow-amber-200'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white transform hover:scale-105 shadow-emerald-200'
                          }`}
                        >
                          <span className="text-xl">
                            {isSaved ? '📁' : hasErrors ? '🔍' : hasMissing ? '⚠️' : '💾'}
                          </span>
                          <span>
                            {isSaved 
                              ? 'บันทึกเรียบร้อยแล้ว' 
                              : hasErrors 
                              ? `คลิกดูข้อผิดพลาด (${errorList.length} จุด) และวิธีแก้ไข`
                              : hasMissing
                              ? 'ยืนยันข้อมูลและบันทึก (มีรายชื่อตกหล่น)'
                              : 'ยืนยันข้อมูลและบันทึก (วิชานี้)'
                            }
                          </span>
                        </button>
                      </div>

                    </div>
                  );
                })()}

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
                  <p className="text-xs text-slate-500 font-medium mt-0.5">เวอร์ชันปัจจุบัน: <span className="text-blue-600 font-bold">v1.3.0</span> (27 กันยายน 2569)</p>
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
                {/* Version 1.3.0 */}
                <div className="bg-indigo-50/70 p-4 rounded-xl border border-indigo-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-indigo-950 text-base">✨ เวอร์ชัน v1.3.0</span>
                    <span className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-full font-semibold">ล่าสุด</span>
                  </div>
                  <ul className="space-y-2 text-indigo-900/90 pl-4 list-disc text-sm">
                    <li>
                      <strong className="text-indigo-950">🤖 ระบบผู้ช่วยอัจฉริยะ (Assistant Chatbot):</strong> เพิ่มผู้ช่วยแนะนำการใช้งานระบบตลอด 24 ชม. ที่มุมขวาล่างหน้าจอ พร้อมตอบคำถามที่พบบ่อยอัตโนมัติ
                    </li>
                    <li>
                      <strong className="text-indigo-950">📘 คู่มือระบบเอกสาร วผ.16:</strong> แนะนำขั้นตอนการสร้างและดาวน์โหลดแบบบันทึกข้อความรายงานผลการเรียน 0, ร, มส, มผ (ปลายภาค) 7 สเต็ปง่าย ๆ ผ่านผู้ช่วย
                    </li>
                    <li>
                      <strong className="text-indigo-950">🔘 ทำไมปุ่มดาวน์โหลดเป็นสีเทา (Disabled):</strong> อธิบายเงื่อนไขระบบที่ล็อกปุ่มไว้จนกว่าครูจะส่งคะแนนครบทุกวิชา/ห้อง และสถานะผ่านสมบูรณ์ 100%
                    </li>
                    <li>
                      <strong className="text-indigo-950">🛑 แก้ปัญหากดปุ่มส่งข้อมูลไม่ได้:</strong> แนะนำวิธีตรวจสอบกรณีติดการ์ดสีแดง (คะแนนขัดแย้ง) ซึ่งระบบจะระงับการส่งเพื่อป้องกันข้อมูลในฐานข้อมูลผิดพลาด
                    </li>
                    <li>
                      <strong className="text-indigo-950">🔍 วิธีแก้ไขเมื่อหาข้อมูลไม่เจอ:</strong> เพิ่มคำแนะนำในการค้นหาชื่อครู, ตารางรายวิชา และตำแหน่งปุ่มดาวน์โหลดในแดชบอร์ด
                    </li>
                    <li>
                      <strong className="text-indigo-950">🔒 ปิดปุ่ม วผ.17 ชั่วคราว:</strong> ซ่อนปุ่มดาวน์โหลด วผ.17 (ปลายภาค) ชั่วคราวตามนโยบายปรับปรุงฟอร์มใหม่ของฝ่ายวัดผล
                    </li>
                  </ul>
                </div>

                {/* Version 1.2.4 */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 opacity-80">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 text-base">📌 เวอร์ชัน v1.2.4</span>
                    </div>
                    <ul className="space-y-1.5 text-slate-700 pl-4 list-disc text-sm">
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

      {/* ระบบผู้ช่วยแนะนำการใช้งาน (Chatbot & Guide) */}
      <AssistantChatbot 
        roundType={roundType}
        viewMode={viewMode}
        hasErrors={Boolean(results?.pairs?.some((p: any) => p.results?.errors && p.results.errors.length > 0))}
        hasResults={Boolean(results?.pairs && results.pairs.length > 0)}
      />

    </div>
  )
}

export default App
