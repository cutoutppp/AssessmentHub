const fs = require('fs');

const path = 'C:\\Users\\peera\\Desktop\\AntigravityProject\\AssessmentHub\\SgsNextschool\\frontend\\src\\App.tsx';
let content = fs.readFileSync(path, 'utf8');

const regex = /const \[teacherData, setTeacherData\] = useState<any\[\]>\(\[\]\)/;
const replacement = `function App() {
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
  const [teacherData, setTeacherData] = useState<any[]>([])`;

content = content.replace(regex, replacement);

fs.writeFileSync(path, content, 'utf8');
