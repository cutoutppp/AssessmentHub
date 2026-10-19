import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, BookOpen, ClipboardCheck, GraduationCap, AlertCircle, CheckCircle2, ChevronRight, BarChart3, Clock, FileText, Package } from 'lucide-react';

export default function TeacherHub() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const backendBaseUrl = 'https://teacherhub-backend-324760995892.asia-southeast1.run.app';

  const [stats, setStats] = useState({
    academic_issues: 0,
    sgs_submitted: 0,
    sgs_total: 0,
    ioc_status: 'กำลังโหลด...',
    ioc_my_projects_status: 'กำลังโหลด...',
    subject_breakdown: [] as any[],
    ioc_breakdown: [] as any[],
    sgs_breakdown: [] as any[],
    moresor_submitted: 0,
    moresor_total: 0,
    moresor_breakdown: [] as any[]
  });

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggleExpand = (key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    const token = localStorage.getItem('sgs_token');
    const userData = localStorage.getItem('sgs_user');
    
    if (!token || !userData) {
      navigate('/login');
      return;
    }
    
    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
    localStorage.setItem('teacher_code', parsedUser.teaccode); // Set for IOC system auto-login
    
    fetch(`${backendBaseUrl}/api/dashboard/stats/${parsedUser.userid}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('sgs_token')}` }
    })
      .then(res => {
        if (!res.ok) {
          if (res.status === 401) {
            localStorage.removeItem('sgs_token');
            localStorage.removeItem('sgs_user');
            localStorage.removeItem('teacher_code');
            navigate('/login');
          }
          throw new Error('Failed to fetch stats');
        }
        return res.json();
      })
      .then(data => setStats(prev => {
        const merged = { ...prev, ...data };
        // อย่าให้ค่า 0 จาก backend ทับยอดแก้ผลการเรียนที่ได้จาก GAS แล้ว
        if (prev.academic_issues > 0 && (!data.academic_issues || data.academic_issues === 0)) {
          merged.academic_issues = prev.academic_issues;
          merged.subject_breakdown = prev.subject_breakdown;
        }
        return merged;
      }))
      .catch(err => console.error('Failed to fetch stats:', err));

    // Fetch academic (0, ร, มผ) stats from GAS — cached 5 นาทีใน sessionStorage
    (() => {
      const cacheKey = 'acad_stats_' + (parsedUser.name || parsedUser.userid);
      let isFresh = false;
      try {
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          const p = JSON.parse(cached);
          if (p && typeof p.academic_issues === 'number') {
            setStats(prev => ({ ...prev, academic_issues: p.academic_issues, subject_breakdown: p.subject_breakdown || [] }));
            if (Date.now() - (p.ts || 0) < 5 * 60 * 1000) isFresh = true;
          }
        }
      } catch (err) {}
      if (isFresh) return;

      const isAdm = String(parsedUser.teaccode) === '444' || String(parsedUser.userid) === '444' || !!parsedUser.is_admin;
      const gUrl = 'https://script.google.com/macros/s/AKfycbx8fjFhCFgUpyrU05_xAon8yan5bOmHK-tardnunLyWJMOrGepFBtrjhCe3vw4cqq3ZFg/exec';
      if (!isAdm && parsedUser.name) {
        fetch(`${gUrl}?action=tasks&mode=teacher&keyword=${encodeURIComponent(parsedUser.name)}`)
          .then(r => r.json())
          .then(ts => {
            if (Array.isArray(ts)) {
              const uStus = new Set(ts.map((x: any) => x.stuId).filter(Boolean)).size;
              const sMap: Record<string, any> = {};
              ts.forEach((x: any) => {
                const s = [x.subjCode, x.subjName].filter(Boolean).join(' ') || 'ไม่ระบุวิชา';
                if (!sMap[s]) sMap[s] = { subject: s, total: 0, fixed: 0, pending: 0 };
                sMap[s].total++;
                sMap[s].pending++;
              });
              const bd = Object.values(sMap);
              try { sessionStorage.setItem(cacheKey, JSON.stringify({ academic_issues: uStus, subject_breakdown: bd, ts: Date.now() })); } catch (err) {}
              setStats(prev => ({ ...prev, academic_issues: uStus, subject_breakdown: bd }));
            }
          })
          .catch(err => console.error('Failed to fetch academic tasks:', err));
      } else {
        fetch(`${gUrl}?action=get_stats`)
          .then(r => r.json())
          .then(d => {
            if (d && d.status === 'success') {
              const cnt = typeof d.academic_issues === 'number' ? d.academic_issues : (d.total_academic_issues || d.students_total || 712);
              try { sessionStorage.setItem(cacheKey, JSON.stringify({ academic_issues: cnt, subject_breakdown: [], ts: Date.now() })); } catch (err) {}
              setStats(prev => ({ ...prev, academic_issues: cnt }));
            }
          })
          .catch(err => console.error('Failed to fetch academic get_stats:', err));
      }
    })();

    // Fetch MoreSor Stats
    fetch('https://script.google.com/macros/s/AKfycbwEwZ_8ZKA7K9qeeUX1b00ddGWNtOM1Hd2wcoqGfOsPaKlu4pl9oDSczsW4ckZsoEHz/exec?action=getDashboardData')
      .then(res => res.json())
      .then(json => {
        if (json.success && json.courses) {
           const teacherCourses = json.courses.filter((c: any) => String(c['รหัสครู']) === String(parsedUser.teaccode));
           let submitted = 0;
           const breakdown = teacherCourses.map((c: any) => {
             const log = json.statuses.find((s: any) => {
               const isShifted = s['ครูผู้สอน'] === 'ส่งแล้ว';
               let sLevel = isShifted ? String(s['ชื่อวิชา'] || '') : String(s['ชั้น'] || '');
               let sRoom = isShifted ? String(s['ชั้น'] || '') : String(s['กลุ่ม-ห้อง'] || '');
               let sStatus = isShifted ? String(s['ครูผู้สอน'] || '') : String(s['สถานะการส่ง'] || '');
               return s['รหัสวิชา'] === c['รหัสวิชา'] &&
                      sLevel.trim() === String(c['ชั้น']).trim() &&
                      sRoom.trim() === String(c['กลุ่ม-ห้อง']).trim() &&
                      sStatus === 'ส่งแล้ว';
             });
             if (log) submitted++;
             return {
               subject_code: c['รหัสวิชา'],
               subject_name: c['วิชา'],
               room: c['ชั้น'] + '/' + c['กลุ่ม-ห้อง'],
               status: log ? 'ส่งแล้ว' : 'ยังไม่ส่ง'
             };
           });
           setStats(prev => ({ ...prev, moresor_submitted: submitted, moresor_total: teacherCourses.length, moresor_breakdown: breakdown }));
        }
      })
      .catch(err => console.error('Failed to fetch MoreSor stats:', err));
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('sgs_token');
    localStorage.removeItem('sgs_user');
    localStorage.removeItem('teacher_code'); // Clear IOC session
    navigate('/login');
  };

  if (!user) return null;

  const sgsUrl = 'https://cutoutppp.github.io/AssessmentHub/SgsNextschool/index.html';
  // ไม่ส่ง PIN ใน URL — Teacher.html อ่านตัวตนจาก sgs_user ใน localStorage (origin เดียวกัน)
  const academicUrl = `https://cutoutppp.github.io/AssessmentHub/Academic_report_correction/Teacher.html?id=${user.userid}&name=${encodeURIComponent(user.name)}&admin=${user.is_admin ? '1' : '0'}`;
  const iocUrl = 'https://cutoutppp.github.io/AssessmentHub/ioc-system/index.html';
  const moresorUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? `http://localhost:3000/?id=${user.teaccode}` 
    : `https://cutoutppp.github.io/AssessmentHub/MoreSor/index.html?id=${user.teaccode}`;
  const isMeasurementStaff = String(user?.teaccode) === '444' || String(user?.userid) === '444' || !!user?.is_admin ||
    localStorage.getItem('teacher_code') === '444' || sessionStorage.getItem('teac_code') === '444';

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Premium Navbar */}
      <nav className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-200/60 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-tr from-indigo-600 to-blue-500 p-2.5 rounded-xl shadow-md">
                <GraduationCap className="h-7 w-7 text-white" />
              </div>
              <span className="font-extrabold text-2xl bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 tracking-tight">
                AssessmentHub
              </span>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="hidden md:flex flex-col items-end">
                <span className="text-sm font-bold text-slate-800">
                  ครู{user.name}
                </span>
                <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full mt-1">
                  รหัส: {user.teaccode} | กลุ่มสาระฯ: {user.subjectgroup}
                </span>
              </div>
              
              <div className="h-10 w-px bg-slate-200 hidden md:block"></div>
              
              {user.is_admin && (
                <button 
                  onClick={() => navigate('/admin')}
                  className="group flex items-center justify-center px-4 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-xl transition-all duration-300 shadow-sm"
                >
                  <span className="font-bold text-sm">ผู้ดูแลระบบ</span>
                </button>
              )}

              <button 
                onClick={handleLogout}
                className="group flex items-center justify-center p-2.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-300"
                title="ออกจากระบบ"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">ภาพรวมการปฏิบัติงาน</h1>
            <p className="text-slate-500 font-medium mt-1">อัปเดตข้อมูลล่าสุดเมื่อ: {new Date().toLocaleDateString('th-TH')}</p>
          </div>
          
          {/* IOC Evaluation Mini-Widget */}
          <div 
            onClick={() => window.open(iocUrl, '_blank')}
            className={`cursor-pointer px-4 py-2.5 rounded-2xl flex items-center gap-3 border transition-all ${
              stats.ioc_status === 'ไม่มีงานค้าง' 
                ? 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                : 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100 hover:border-amber-300 shadow-sm shadow-amber-100'
            }`}
          >
            <div className={`p-2 rounded-xl ${stats.ioc_status === 'ไม่มีงานค้าง' ? 'bg-slate-100 text-slate-500' : 'bg-amber-100 text-amber-600'}`}>
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">งานประเมิน IOC (เพื่อนครู)</p>
              <p className="text-sm font-semibold mt-0.5">{stats.ioc_status}</p>
            </div>
          </div>
        </div>

        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 items-start">
          
          {/* Card 1 */}
          <div 
            onClick={() => window.open(academicUrl, '_blank')}
            className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.15)] hover:border-red-200 transition-all duration-300 transform hover:-translate-y-1 cursor-pointer relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-50 rounded-bl-full -z-0 opacity-50 group-hover:scale-110 transition-transform duration-500"></div>
            <div className="flex justify-between items-start relative z-10">
              <div>
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">นร. ค้างแก้ผลการเรียน</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-4xl font-extrabold text-slate-900">{stats.academic_issues}</h3>
                  <span className="text-sm font-medium text-slate-500">คน</span>
                </div>
              </div>
              <div className="bg-red-100 p-3.5 rounded-2xl shadow-sm text-red-600">
                <AlertCircle className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-5 flex items-center text-sm font-medium text-red-600 bg-red-50/50 p-2 rounded-lg">
              <Clock className="w-4 h-4 mr-1.5" /> รอดำเนินการแก้ไข (0, ร, มผ)
            </div>
            
            {/* Subject Breakdown */}
            {stats.subject_breakdown && stats.subject_breakdown.length > 0 && (
              <div className="mt-4 border-t border-slate-100 pt-3 relative z-10">
                <button 
                  onClick={(e) => toggleExpand('academic', e)}
                  className="w-full text-xs font-semibold text-slate-500 hover:text-red-600 flex justify-center items-center py-1 transition-colors"
                >
                  {expanded.academic ? 'ซ่อนรายละเอียด ▲' : 'ดูรายละเอียดรายวิชา ▼'}
                </button>
                {expanded.academic && (
                  <div className="mt-3 space-y-2">
                    {stats.subject_breakdown.map((sb: any, idx: number) => (
                      <div key={idx} className="flex flex-col text-sm border-b border-slate-100 last:border-0 pb-2 mb-2 last:mb-0 last:pb-0">
                        <span className="text-slate-700 font-medium truncate mb-1" title={sb.subject}>{sb.subject}</span>
                        <div className="flex justify-between text-xs bg-slate-50 p-1.5 rounded-md">
                          <span className="text-slate-500">ปัญหา: <strong className="text-slate-700">{sb.total}</strong></span>
                          <span className="text-emerald-600">แก้ไขแล้ว: <strong className="text-emerald-700">{sb.fixed}</strong></span>
                          <span className="text-red-500">คงเหลือ: <strong className="text-red-600">{sb.pending}</strong></span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Card 2 */}
          <div 
            onClick={() => window.open(sgsUrl, '_blank')}
            className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.15)] hover:border-amber-200 transition-all duration-300 transform hover:-translate-y-1 cursor-pointer relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-bl-full -z-0 opacity-50 group-hover:scale-110 transition-transform duration-500"></div>
            <div className="flex justify-between items-start relative z-10">
              <div>
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">การส่งคะแนน</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-4xl font-extrabold text-slate-900">{stats.sgs_submitted}<span className="text-2xl text-slate-400">/{stats.sgs_total}</span></h3>
                  <span className="text-sm font-medium text-slate-500">วิชา</span>
                </div>
              </div>
              <div className="bg-amber-100 p-3.5 rounded-2xl shadow-sm text-amber-600">
                <BarChart3 className="h-6 w-6" />
              </div>
            </div>
            
            {/* Progress bar */}
            <div className="mt-5 relative z-10">
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div 
                  className="bg-amber-500 h-2 rounded-full transition-all duration-1000 ease-out" 
                  style={{ width: `${stats.sgs_total > 0 ? (stats.sgs_submitted / stats.sgs_total) * 100 : 0}%` }}
                ></div>
              </div>
              <p className="text-xs font-medium text-slate-500 mt-2 text-right">
                {stats.sgs_total === stats.sgs_submitted && stats.sgs_total > 0 ? '✅ สมบูรณ์ครบทุกห้อง' : `✅ สมบูรณ์ ${stats.sgs_submitted} / ${stats.sgs_total} ห้อง`}
              </p>
            </div>

            {/* Subject Breakdown for SGS */}
            {stats.sgs_breakdown && stats.sgs_breakdown.length > 0 && (
              <div className="mt-4 border-t border-slate-100 pt-3 relative z-10">
                <button 
                  onClick={(e) => toggleExpand('sgs', e)}
                  className="w-full text-xs font-semibold text-slate-500 hover:text-purple-600 flex justify-center items-center py-1 transition-colors"
                >
                  {expanded.sgs ? 'ซ่อนรายละเอียด ▲' : 'ดูรายละเอียดรายวิชา ▼'}
                </button>
                {expanded.sgs && (
                  <div className="mt-3 overflow-x-auto rounded-lg border border-slate-100">
                    <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 border-b border-slate-100">
                        <th className="py-2 px-2 font-medium">รหัสวิชา</th>
                        <th className="py-2 px-2 font-medium">ชั้น/ห้อง</th>
                        <th className="py-2 px-2 font-medium text-center">กลางภาค</th>
                        <th className="py-2 px-2 font-medium text-center">ปลายภาค</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {stats.sgs_breakdown.map((sb: any, idx: number) => {
                        const getBadge = (status: string) => {
                          const bg = status.includes('สมบูรณ์') ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                                     status.includes('สังเกต') ? 'bg-amber-100 text-amber-700 border-amber-200' :
                                     status.includes('แก้ไข') ? 'bg-rose-100 text-rose-700 border-rose-200' :
                                     'bg-slate-100 text-slate-500 border-slate-200';
                          return <span className={`inline-block px-1.5 py-0.5 rounded border text-[10px] font-semibold ${bg} truncate max-w-[70px] sm:max-w-[90px]`} title={status}>{status}</span>;
                        };
                        return (
                          <tr key={idx} className="hover:bg-slate-50 transition-colors">
                            <td className="py-2 px-2 font-mono text-slate-700" title={sb.subject_name}>{sb.subject_code}</td>
                            <td className="py-2 px-2 font-medium text-slate-600">{sb.class_room}</td>
                            <td className="py-2 px-2 text-center">{getBadge(sb.midterm_status)}</td>
                            <td className="py-2 px-2 text-center">{getBadge(sb.final_status)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                )}
              </div>
            )}
          </div>

          {/* Card 4: My Exam Status */}
          <div 
            onClick={() => window.open(iocUrl, '_blank')}
            className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.15)] hover:border-blue-200 transition-all duration-300 transform hover:-translate-y-1 cursor-pointer relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full -z-0 opacity-50 group-hover:scale-110 transition-transform duration-500"></div>
            <div className="flex justify-between items-start relative z-10">
              <div>
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">สถานะส่งข้อสอบ</p>
                {stats.ioc_my_projects_status && (
                  <h3 className="text-2xl font-bold text-slate-900 mt-2">{stats.ioc_my_projects_status}</h3>
                )}
              </div>
              <div className="bg-blue-100 p-3.5 rounded-2xl shadow-sm text-blue-600">
                <FileText className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-6 flex items-center text-sm font-medium text-blue-600 bg-blue-50/50 p-2 rounded-lg relative z-10">
              <FileText className="w-4 h-4 mr-1.5" /> วิชากลางภาค/ปลายภาค
            </div>
            
            {/* Subject Breakdown for Exam Projects */}
            {stats.ioc_breakdown && stats.ioc_breakdown.length > 0 && (
              <div className="mt-4 border-t border-slate-100 pt-3 relative z-10">
                <button 
                  onClick={(e) => toggleExpand('ioc', e)}
                  className="w-full text-xs font-semibold text-slate-500 hover:text-emerald-600 flex justify-center items-center py-1 transition-colors"
                >
                  {expanded.ioc ? 'ซ่อนรายละเอียด ▲' : 'ดูรายละเอียดรายวิชา ▼'}
                </button>
                {expanded.ioc && (
                  <div className="mt-3 space-y-2">
                    {stats.ioc_breakdown.map((sb: any, idx: number) => (
                      <div key={idx} className="flex flex-col text-sm border-b border-slate-100 last:border-0 pb-2 mb-2 last:mb-0 last:pb-0">
                        <span className="text-slate-700 font-medium truncate mb-1" title={sb.subject_name}>{sb.subject_code} {sb.subject_name}</span>
                        <div className="flex justify-between text-xs bg-slate-50 p-1.5 rounded-md gap-2">
                           {/* Badge for Midterm */}
                           <span className={`px-2 py-1 rounded-md flex-1 text-center font-semibold ${sb.midterm_status === 'ยังไม่สร้าง' ? 'bg-rose-100 text-rose-600' : sb.midterm_status === 'รอประเมิน' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>กลางภาค: {sb.midterm_status}</span>
                           {/* Badge for Final */}
                           <span className={`px-2 py-1 rounded-md flex-1 text-center font-semibold ${sb.final_status === 'ยังไม่สร้าง' ? 'bg-rose-100 text-rose-600' : sb.final_status === 'รอประเมิน' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>ปลายภาค: {sb.final_status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Card 4 - MoreSor */}
          <div 
            onClick={() => window.open(moresorUrl, '_blank')}
            className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.15)] hover:border-rose-200 transition-all duration-300 transform hover:-translate-y-1 cursor-pointer relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50 rounded-bl-full -z-0 opacity-50 group-hover:scale-110 transition-transform duration-500"></div>
            <div className="flex justify-between items-start relative z-10">
              <div>
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">ความคืบหน้าแจ้ง ม.ส.</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-4xl font-extrabold text-slate-900">{stats.moresor_submitted}</h3>
                  <span className="text-sm font-medium text-slate-500">/ {stats.moresor_total} วิชา</span>
                </div>
              </div>
              <div className="bg-rose-100 p-3.5 rounded-2xl shadow-sm text-rose-600">
                <AlertCircle className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-5 flex items-center text-sm font-medium text-rose-600 bg-rose-50/50 p-2 rounded-lg">
              <Clock className="w-4 h-4 mr-1.5" /> ตรวจสอบนักเรียนที่ไม่มีสิทธิ์สอบ
            </div>
            
            {/* Simple Progress Bar */}
            <div className="mt-4 pt-4 border-t border-slate-100 relative z-10">
              <div className="w-full bg-slate-100 rounded-full h-2.5 mb-2 overflow-hidden">
                <div className="bg-rose-500 h-2.5 rounded-full transition-all duration-1000 ease-out relative" style={{ width: `${stats.moresor_total > 0 ? (stats.moresor_submitted / stats.moresor_total) * 100 : 0}%` }}>
                   <div className="absolute inset-0 bg-white/20 w-full animate-[shimmer_2s_infinite]"></div>
                </div>
              </div>
              <p className="text-xs font-semibold text-slate-500 text-right">
                {stats.moresor_total > 0 ? Math.round((stats.moresor_submitted / stats.moresor_total) * 100) : 0}% ดำเนินการแล้ว
              </p>
            </div>

            {/* Subject Breakdown for MoreSor */}
            {stats.moresor_breakdown && stats.moresor_breakdown.length > 0 && (
              <div className="mt-4 border-t border-slate-100 pt-3 relative z-10">
                <button 
                  onClick={(e) => toggleExpand('moresor', e)}
                  className="w-full text-xs font-semibold text-slate-500 hover:text-rose-600 flex justify-center items-center py-1 transition-colors"
                >
                  {expanded.moresor ? 'ซ่อนรายละเอียด ▲' : 'ดูรายละเอียดรายวิชา ▼'}
                </button>
                {expanded.moresor && (
                  <div className="mt-3 space-y-2">
                    {stats.moresor_breakdown.map((sb: any, idx: number) => (
                      <div key={idx} className="flex flex-col text-sm border-b border-slate-100 last:border-0 pb-2 mb-2 last:mb-0 last:pb-0">
                        <span className="text-slate-700 font-medium truncate mb-1">{sb.subject_code} {sb.subject_name} ({sb.room})</span>
                        <div className="flex justify-between text-xs bg-slate-50 p-1.5 rounded-md gap-2">
                           <span className={`px-2 py-1 rounded-md flex-1 text-center font-semibold ${sb.status === 'ยังไม่ส่ง' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                             สถานะ: {sb.status}
                           </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">ระบบที่เกี่ยวข้อง</h2>
            <p className="text-xs text-slate-500 mt-0.5">เครื่องมือและระบบสนับสนุนงานวัดผลและประเมินผลการเรียนรู้</p>
          </div>
          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200/60">
            {isMeasurementStaff ? '8 ระบบพร้อมใช้งาน (สิทธิ์วัดผล)' : '5 ระบบพร้อมใช้งาน'}
          </span>
        </div>

        {/* App Links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 mb-10">
          <SystemCard color="blue" icon={ClipboardCheck} title="แก้ไขผลการเรียน" desc="บันทึกและแก้ไขผลการเรียน (0, ร, มผ) ของนักเรียนที่รับผิดชอบ" cta="เข้าสู่ระบบ" onClick={() => window.open(academicUrl, '_blank')} />
          <SystemCard color="purple" icon={BookOpen} title="ตรวจคะแนน SGS" desc="เปรียบเทียบคะแนนจาก ปพ.5 กับหน้าเว็บ NextSchool เพื่อหาข้อผิดพลาด" cta="เข้าสู่ระบบ" onClick={() => window.open(sgsUrl, '_blank')} />
          <SystemCard color="emerald" icon={CheckCircle2} title="ประเมิน IOC" desc="ประเมินความสอดคล้องของแบบทดสอบรายวิชาตามวัตถุประสงค์" cta="เข้าสู่ระบบ" onClick={() => window.open(iocUrl, '_blank')} />
          <SystemCard color="rose" icon={AlertCircle} title="แจ้ง ม.ส. (MoreSor)" desc="ตรวจสอบและรายงานรายชื่อนักเรียนที่ไม่มีสิทธิ์สอบ (ม.ส.)" cta="เข้าสู่ระบบ" onClick={() => window.open(moresorUrl, '_blank')} />
          <SystemCard color="amber" icon={FileText} badge="2569-1" title="ระบบใบปะหน้าข้อสอบ" desc="สร้างและพิมพ์ใบปะหน้าซองข้อสอบ พร้อมดาวน์โหลดไฟล์ Word (.doc)" cta="พิมพ์ใบปะหน้า" onClick={() => window.open('https://cutoutppp.github.io/AssessmentHub/exam-cover/index.html', '_blank')} />

          {isMeasurementStaff && (
            <>
              <SystemCard color="teal" accentBorder icon={Clock} badge="เฉพาะ 444 / วัดผล" title="มอนิเตอร์ 55 ห้องสอบ" desc="ผังมอนิเตอร์ 55 ห้องสด นาฬิกาคลื่นเวลา เรดาร์ และระบบแนะนำสายเดิน" cta="เปิดจอใหญ่" onClick={() => window.open('https://cutoutppp.github.io/AssessmentHub/exam-tracker/monitor.html', '_blank')} />
              <SystemCard color="indigo" accentBorder icon={ClipboardCheck} badge="ม.1 - ม.6" title="บันทึกรับ-ส่งข้อสอบ" desc="บันทึกรับ-ส่งข้อสอบทางการแยกชั้น ม.1 - ม.6 พร้อมพิมพ์รายงานทางการ" cta="บันทึกส่งข้อสอบ" onClick={() => window.open('https://cutoutppp.github.io/AssessmentHub/exam-tracker/record.html', '_blank')} />
              <SystemCard color="cyan" accentBorder icon={Package} badge="880 ซอง" title="ตรวจรับซอง (รอบ 0)" desc="โต๊ะตรวจรับซองข้อสอบเย็บชุดก่อนวันสอบ และติดตามกลุ่มสาระฯ" cta="ตรวจรับซอง" onClick={() => window.open('https://cutoutppp.github.io/AssessmentHub/exam-tracker/round0.html', '_blank')} />
            </>
          )}

          <ComingSoonCard icon={BookOpen} title="ปพ.6" desc="ระบบบันทึกและพิมพ์รายงานพัฒนาคุณภาพผู้เรียน" />
          <ComingSoonCard icon={ClipboardCheck} title="แผนวัดผล" desc="ระบบจัดทำแผนการวัดและประเมินผลการเรียนรู้รายวิชา" />
        </div>
      </main>
    </div>
  );
}

// สีต้องเขียนเป็น class เต็มเพื่อให้ Tailwind สแกนเจอ
const CARD_COLORS: Record<string, { border: string; accentBorder: string; iconBox: string; text: string; hoverText: string; badge: string }> = {
  blue:    { border: 'border-slate-200/80 hover:border-blue-500/40',    accentBorder: 'border-blue-200 hover:border-blue-500/60',       iconBox: 'bg-blue-50 text-blue-600 group-hover:bg-blue-600',          text: 'text-blue-600',    hoverText: 'group-hover:text-blue-600',    badge: 'bg-blue-50 text-blue-700 border-blue-200/80' },
  purple:  { border: 'border-slate-200/80 hover:border-purple-500/40',  accentBorder: 'border-purple-200 hover:border-purple-500/60',   iconBox: 'bg-purple-50 text-purple-600 group-hover:bg-purple-600',    text: 'text-purple-600',  hoverText: 'group-hover:text-purple-600',  badge: 'bg-purple-50 text-purple-700 border-purple-200/80' },
  emerald: { border: 'border-slate-200/80 hover:border-emerald-500/40', accentBorder: 'border-emerald-200 hover:border-emerald-500/60', iconBox: 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600', text: 'text-emerald-600', hoverText: 'group-hover:text-emerald-600', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200/80' },
  rose:    { border: 'border-slate-200/80 hover:border-rose-500/40',    accentBorder: 'border-rose-200 hover:border-rose-500/60',       iconBox: 'bg-rose-50 text-rose-600 group-hover:bg-rose-600',          text: 'text-rose-600',    hoverText: 'group-hover:text-rose-600',    badge: 'bg-rose-50 text-rose-700 border-rose-200/80' },
  amber:   { border: 'border-slate-200/80 hover:border-amber-500/40',   accentBorder: 'border-amber-200 hover:border-amber-500/60',     iconBox: 'bg-amber-50 text-amber-600 group-hover:bg-amber-600',       text: 'text-amber-600',   hoverText: 'group-hover:text-amber-600',   badge: 'bg-amber-50 text-amber-700 border-amber-200/80' },
  teal:    { border: 'border-slate-200/80 hover:border-teal-500/40',    accentBorder: 'border-teal-200 hover:border-teal-500/60',       iconBox: 'bg-teal-50 text-teal-600 group-hover:bg-teal-600',          text: 'text-teal-600',    hoverText: 'group-hover:text-teal-600',    badge: 'bg-teal-50 text-teal-700 border-teal-200/80' },
  indigo:  { border: 'border-slate-200/80 hover:border-indigo-500/40',  accentBorder: 'border-indigo-200 hover:border-indigo-500/60',   iconBox: 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600',    text: 'text-indigo-600',  hoverText: 'group-hover:text-indigo-600',  badge: 'bg-indigo-50 text-indigo-700 border-indigo-200/80' },
  cyan:    { border: 'border-slate-200/80 hover:border-cyan-500/40',    accentBorder: 'border-cyan-200 hover:border-cyan-500/60',       iconBox: 'bg-cyan-50 text-cyan-600 group-hover:bg-cyan-600',          text: 'text-cyan-600',    hoverText: 'group-hover:text-cyan-600',    badge: 'bg-cyan-50 text-cyan-700 border-cyan-200/80' },
};

function SystemCard({ color, icon: Icon, title, desc, cta, badge, accentBorder, onClick }: {
  color: string; icon: React.ElementType; title: string; desc: string; cta: string; badge?: string; accentBorder?: boolean; onClick: () => void;
}) {
  const c = CARD_COLORS[color];
  return (
    <div
      onClick={onClick}
      className={`group bg-white rounded-xl p-3.5 border ${accentBorder ? c.accentBorder : c.border} cursor-pointer shadow-xs hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 flex flex-col justify-between`}
    >
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className={`w-8 h-8 rounded-lg ${c.iconBox} flex items-center justify-center group-hover:text-white transition-colors`}>
            <Icon className="w-4 h-4" />
          </div>
          {badge
            ? <span className={`text-[10px] font-bold ${c.badge} px-2 py-0.5 rounded-md border`}>{badge}</span>
            : <ChevronRight className={`w-4 h-4 text-slate-300 ${c.hoverText} group-hover:translate-x-0.5 transition-all`} />}
        </div>
        <h3 className={`text-sm font-bold text-slate-900 ${c.hoverText} transition-colors`}>{title}</h3>
        <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">{desc}</p>
      </div>
      <div className={`mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold ${c.text}`}>
        <span>{cta}</span>
        <span>→</span>
      </div>
    </div>
  );
}

function ComingSoonCard({ icon: Icon, title, desc }: { icon: React.ElementType; title: string; desc: string }) {
  return (
    <div className="group bg-white rounded-xl p-3.5 border border-slate-200 border-dashed shadow-xs relative overflow-hidden opacity-60 cursor-not-allowed flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center">
            <Icon className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md border border-amber-200">กำลังพัฒนา</span>
        </div>
        <h3 className="text-sm font-bold text-slate-400">{title}</h3>
        <p className="text-xs text-slate-400 line-clamp-2 mt-1 leading-relaxed">{desc}</p>
      </div>
      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-400">
        <span>เร็วๆ นี้</span>
      </div>
    </div>
  );
}
