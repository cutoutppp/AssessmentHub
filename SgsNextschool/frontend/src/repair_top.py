import re

with open(r'C:\Users\peera\Desktop\AntigravityProject\AssessmentHub\SgsNextschool\frontend\src\App.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# find StudentWarningRow end
end_idx = 0
for i, line in enumerate(lines):
    if "  function App() {" in line:
        end_idx = i
        break

lines_to_keep_top = lines[:end_idx]
# But wait, StudentWarningRow is missing its closing tags because it was replaced!
# Let's fix the top manually:
fixed_top = """import { useState, useRef, useEffect } from 'react'
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

function App() {
  const [files, setFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [viewMode, setViewMode] = useState<'validator' | 'dashboard'>('validator')
  const [currentUser, setCurrentUser] = useState<string>('')
  const [savedWorksDb, setSavedWorksDb] = useState<any>({})
  const [submissions, setSubmissions] = useState<any[]>([])
  const [errorMsg, setErrorMsg] = useState("")
  const [isDragging, setIsDragging] = useState(false)
  const [selectedPairIndex, setSelectedPairIndex] = useState(0)
  const [roundType, setRoundType] = useState("final")
  const [academicYear, setAcademicYear] = useState("2566")
  const [semester, setSemester] = useState("1")
  const [webAppUrl, setWebAppUrl] = useState("https://script.google.com/macros/s/AKfycbxzpP9b_eBJUU5KaNX1CbMOLHygMsrUdO7earro-bQIs8lMS9H6YM6Z6mlamm3jJd1fDQ/exec")
  const [teacherData, setTeacherData] = useState<any[]>([])
  const [masterScores, setMasterScores] = useState<any[]>([])
  const [dbConnected, setDbConnected] = useState(false)
  const [savedPairs, setSavedPairs] = useState<Record<number, boolean>>({})

"""

# find where fetchDbData starts
fetch_idx = 0
for i, line in enumerate(lines):
    if "const fetchDbData = async () => {" in line:
        fetch_idx = i
        break

new_content = fixed_top + "".join(lines[fetch_idx:])

with open(r'C:\Users\peera\Desktop\AntigravityProject\AssessmentHub\SgsNextschool\frontend\src\App.tsx', 'w', encoding='utf-8') as f:
    f.write(new_content)
