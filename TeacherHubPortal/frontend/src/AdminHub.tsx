import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

export default function AdminHub() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'sgs' | 'ioc' | 'teachers'>('sgs');
  
  const backendBaseUrl = 'https://teacherhub-backend-324760995892.asia-southeast1.run.app';

  const [stats, setStats] = useState({
    total_teachers: 0,
    total_academic_issues: 0,
    sgs_progress: { submitted: 0, total: 0, percentage: 0 },
    ioc_progress: { submitted: 0, total: 0, percentage: 0 }
  });

  const [sgsData, setSgsData] = useState<any[]>([]);
  const [iocData, setIocData] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  
  const [sgsSearch, setSgsSearch] = useState('');
  const [sgsFilter, setSgsFilter] = useState('');
  
  const [iocSearch, setIocSearch] = useState('');
  const [teacherSearch, setTeacherSearch] = useState('');

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [navigate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${localStorage.getItem('sgs_token')}` };
      const [statsRes, sgsRes, iocRes, teachersRes] = await Promise.all([
        fetch(`${backendBaseUrl}/api/admin/stats`, { headers }),
        fetch(`${backendBaseUrl}/api/admin/detailed_sgs`, { headers }),
        fetch(`${backendBaseUrl}/api/admin/detailed_ioc`, { headers }),
        fetch(`${backendBaseUrl}/api/admin/teachers`, { headers })
      ]);
      
      if(statsRes.status === 401 || sgsRes.status === 401 || iocRes.status === 401 || teachersRes.status === 401) {
        localStorage.removeItem('sgs_token');
        localStorage.removeItem('sgs_user');
        navigate('/login');
        return;
      }
      
      if(statsRes.ok) setStats(await statsRes.json());
      // ยอดนักเรียนค้างแก้ผลการเรียนทั้งโรงเรียน ดึงจาก GAS (ไม่รอผล)
      fetch('https://script.google.com/macros/s/AKfycbx8fjFhCFgUpyrU05_xAon8yan5bOmHK-tardnunLyWJMOrGepFBtrjhCe3vw4cqq3ZFg/exec?action=get_stats')
        .then(r => r.json())
        .then(d => {
          if (d && d.status === 'success') {
            setStats((prev: any) => ({ ...prev, total_academic_issues: typeof d.academic_issues === 'number' ? d.academic_issues : (d.total_academic_issues || 712) }));
          }
        })
        .catch(err => console.error('Admin academic stats:', err));
      if(sgsRes.ok) setSgsData(await sgsRes.json());
      if(iocRes.ok) setIocData(await iocRes.json());
      if(teachersRes.ok) setTeachers(await teachersRes.json());
      
    } catch (err) {
      console.error('Failed to fetch admin data', err);
    }
    setLoading(false);
  };

  const handleResetPin = async (teacher: any) => {
    const confirm = await Swal.fire({
      title: 'ยืนยันการรีเซ็ต PIN?',
      html: `ต้องการรีเซ็ต PIN ของ <b>${teacher.name}</b> (รหัส ${teacher.teaccode}) หรือไม่?<br><span class="text-xs text-rose-500">ระบบจะสุ่มรหัส PIN ชั่วคราว 6 หลัก (มีอายุ 24 ชม.) ให้แทน</span>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#4f46e5',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'ยืนยันรีเซ็ต',
      cancelButtonText: 'ยกเลิก'
    });

    if (!confirm.isConfirmed) return;

    try {
      const res = await fetch(`${backendBaseUrl}/api/admin/teachers/${teacher.id}/reset_pin`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('sgs_token')}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        Swal.fire({
          icon: 'success',
          title: 'รีเซ็ต PIN สำเร็จ!',
          html: `
            <div style="text-align: left; background: #f8fafc; padding: 1rem; border-radius: 0.75rem; border: 1px solid #e2e8f0; margin-top: 0.75rem;">
              <p style="font-size: 0.875rem; color: #475569; margin-bottom: 0.25rem;">คุณครู: <b>${teacher.name}</b></p>
              <p style="font-size: 0.875rem; color: #475569; margin-bottom: 0.75rem;">เลขประจำตัวประชาชน: <b>${teacher.userid}</b></p>
              <div style="background: #eef2ff; border: 1px solid #c7d2fe; padding: 0.75rem; border-radius: 0.5rem; text-align: center;">
                <span style="font-size: 0.75rem; color: #6366f1; font-weight: 600; display: block; margin-bottom: 0.25rem;">รหัส PIN ชั่วคราว (ใช้ได้ 24 ชั่วโมง)</span>
                <span style="font-size: 1.875rem; font-family: monospace; font-weight: 800; color: #4338ca; letter-spacing: 0.1em; user-select: all;">${data.temp_pin}</span>
              </div>
              <p style="font-size: 0.75rem; color: #d97706; margin-top: 0.75rem; font-weight: 500;">⚠️ รหัสนี้จะแสดงเพียงครั้งเดียวเท่านั้น กรุณาคัดลอกและส่งต่อให้คุณครูทางช่องทางส่วนตัว</p>
            </div>
          `,
          confirmButtonColor: '#4f46e5',
          confirmButtonText: 'รับทราบและคัดลอกแล้ว'
        });
      } else {
        const errorMsg = typeof data.detail === 'string'
          ? data.detail
          : (Array.isArray(data.detail) ? data.detail.map((d: any) => d.msg).join(', ') : data.message || 'เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน');
        Swal.fire({
          icon: 'error',
          title: 'รีเซ็ตไม่สำเร็จ',
          text: errorMsg,
          confirmButtonColor: '#4f46e5'
        });
      }
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาดในการเชื่อมต่อ',
        text: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้: ' + (err?.message || 'Network error'),
        confirmButtonColor: '#4f46e5'
      });
    }
  };

  const filteredSgs = sgsData.filter(t => {
    const matchName = t.name.toLowerCase().includes(sgsSearch.toLowerCase()) || t.teaccode.includes(sgsSearch);
    const matchGroup = sgsFilter ? t.subjectgroup === sgsFilter : true;
    return matchName && matchGroup;
  });

  const filteredIoc = iocData.filter(p => {
    return p.subject_code.toLowerCase().includes(iocSearch.toLowerCase()) || 
           p.project_name.toLowerCase().includes(iocSearch.toLowerCase()) ||
           p.teacher_name.toLowerCase().includes(iocSearch.toLowerCase());
  });

  const filteredTeachers = teachers.filter(t => {
    const search = teacherSearch.toLowerCase();
    return (t.name && t.name.toLowerCase().includes(search)) ||
           (t.teaccode && String(t.teaccode).toLowerCase().includes(search)) ||
           (t.userid && String(t.userid).includes(search)) ||
           (t.subjectgroup && t.subjectgroup.toLowerCase().includes(search));
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-12">
      {/* Header */}
      <div className="bg-indigo-600 text-white pt-12 pb-24 px-6 rounded-b-[3rem] shadow-lg relative overflow-hidden">
        <div className="max-w-7xl mx-auto relative z-10 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-extrabold mb-2">Admin Dashboard</h1>
            <p className="text-indigo-100 text-lg">ระบบจัดการและติดตามการส่งงาน</p>
          </div>
          <button 
            onClick={() => navigate('/hub')}
            className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white px-6 py-2 rounded-xl transition-colors font-medium border border-white/30"
          >
            กลับสู่หน้าผู้ใช้งาน (Teacher Hub)
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 -mt-16 relative z-20">
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between">
            <div className="text-slate-500 font-medium mb-2">จำนวนบุคลากรทั้งหมด</div>
            <div className="text-3xl font-bold text-slate-800">{stats.total_teachers} <span className="text-lg font-normal text-slate-500">คน</span></div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between">
            <div className="text-slate-500 font-medium mb-2">แก้ผลการเรียนค้างระบบ</div>
            <div className="text-3xl font-bold text-red-500">{stats.total_academic_issues} <span className="text-lg font-normal text-slate-500">รายการ</span></div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between">
            <div className="text-slate-500 font-medium mb-2">SGS (ภาพรวม)</div>
            <div className="flex items-end gap-2">
              <div className="text-3xl font-bold text-emerald-600">{stats.sgs_progress.percentage}%</div>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 mt-3">
              <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${stats.sgs_progress.percentage}%` }}></div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between">
            <div className="text-slate-500 font-medium mb-2">IOC (ภาพรวม)</div>
            <div className="flex items-end gap-2">
              <div className="text-3xl font-bold text-blue-600">{stats.ioc_progress.percentage}%</div>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 mt-3">
              <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${stats.ioc_progress.percentage}%` }}></div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <button 
            onClick={() => setActiveTab('sgs')}
            className={`px-6 py-3 rounded-xl font-bold text-lg transition-all ${activeTab === 'sgs' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200' : 'bg-white text-slate-500 hover:bg-emerald-50'}`}
          >
            SgsNextschool
          </button>
          <button 
            onClick={() => setActiveTab('ioc')}
            className={`px-6 py-3 rounded-xl font-bold text-lg transition-all ${activeTab === 'ioc' ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'bg-white text-slate-500 hover:bg-blue-50'}`}
          >
            ioc
          </button>
          <button 
            onClick={() => setActiveTab('teachers')}
            className={`px-6 py-3 rounded-xl font-bold text-lg transition-all ${activeTab === 'teachers' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'bg-white text-slate-500 hover:bg-indigo-50'}`}
          >
            จัดการรหัสผ่านครู (PIN)
          </button>
        </div>

        {/* SGS Tab Content */}
        {activeTab === 'sgs' && (
          <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-100 animate-in fade-in slide-in-from-bottom-4 h-[800px]">
            <iframe 
              src="/AssessmentHub/SgsNextschool/index.html?view=dashboard" 
              width="100%" 
              height="100%" 
              className="border-0 rounded-2xl"
              title="SGS Dashboard"
            />
          </div>
        )}

        {/* IOC Tab Content */}
        {activeTab === 'ioc' && (
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex justify-between items-end mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">ติดตามความคืบหน้า IOC</h2>
                <p className="text-slate-500">ตรวจสอบสถานะการประเมินรายวิชา</p>
              </div>
              <div className="flex gap-3">
                <input 
                  type="text" 
                  placeholder="ค้นหาวิชา/รหัสวิชา/ครู..." 
                  className="px-4 py-2 border border-slate-200 rounded-xl outline-none focus:border-blue-500"
                  value={iocSearch}
                  onChange={e => setIocSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <th className="p-4 font-semibold">รหัสวิชา / ชื่อวิชา</th>
                    <th className="p-4 font-semibold">ประเภทการสอบ</th>
                    <th className="p-4 font-semibold">ครูผู้สอน</th>
                    <th className="p-4 font-semibold">สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredIoc.map((p, idx) => (
                    <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                      <td className="p-4">
                        <div className="font-medium text-slate-700">{p.subject_code}</div>
                        <div className="text-sm text-slate-500">{p.project_name}</div>
                      </td>
                      <td className="p-4">
                        <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                          {p.exam_type}
                        </span>
                      </td>
                      <td className="p-4 text-slate-600">{p.teacher_name}</td>
                      <td className="p-4">
                        {p.status === 'completed' ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span> ประเมินแล้ว
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span> รอตรวจสอบ
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredIoc.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-slate-500">ไม่พบข้อมูลรายวิชา</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Teachers Tab Content */}
        {activeTab === 'teachers' && (
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">จัดการข้อมูลและรหัสผ่านครู</h2>
                <p className="text-slate-500">รีเซ็ตรหัส PIN ชั่วคราว (มีอายุ 24 ชั่วโมง) ให้กับคุณครูในโรงเรียน</p>
              </div>
              <div className="w-full sm:w-auto">
                <input 
                  type="text" 
                  placeholder="ค้นหาชื่อ / รหัสครู / เลขบัตร..." 
                  className="w-full sm:w-80 px-4 py-2 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-sm"
                  value={teacherSearch}
                  onChange={e => setTeacherSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-sm">
                    <th className="p-4 font-semibold">รหัสครู</th>
                    <th className="p-4 font-semibold">ชื่อ - นามสกุล</th>
                    <th className="p-4 font-semibold">กลุ่มสาระการเรียนรู้</th>
                    <th className="p-4 font-semibold">เลขบัตรประชาชน</th>
                    <th className="p-4 font-semibold">ระดับสิทธิ์</th>
                    <th className="p-4 font-semibold text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {filteredTeachers.map((t) => (
                    <tr key={t.id || t.userid} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 font-medium text-slate-700">{t.teaccode || '-'}</td>
                      <td className="p-4 font-semibold text-slate-800">{t.name}</td>
                      <td className="p-4 text-slate-600">{t.subjectgroup || '-'}</td>
                      <td className="p-4 text-slate-500 font-mono">{t.userid ? `${String(t.userid).slice(0, 3)}xxxxx${String(t.userid).slice(-4)}` : '-'}</td>
                      <td className="p-4">
                        {t.is_admin ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700">
                            🛡️ แอดมิน
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                            คุณครู
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleResetPin(t)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 transition-colors shadow-sm active:scale-95"
                        >
                          🔑 รีเซ็ต PIN
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredTeachers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500">ไม่พบรายชื่อคุณครูที่ตรงกับการค้นหา</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
