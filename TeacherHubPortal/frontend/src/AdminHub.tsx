import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AdminHub() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'sgs' | 'ioc'>('sgs');
  
  const backendBaseUrl = 'https://teacherhub-backend-324760995892.asia-southeast1.run.app';

  const [stats, setStats] = useState({
    total_teachers: 0,
    total_academic_issues: 0,
    sgs_progress: { submitted: 0, total: 0, percentage: 0 },
    ioc_progress: { submitted: 0, total: 0, percentage: 0 }
  });

  const [sgsData, setSgsData] = useState<any[]>([]);
  const [iocData, setIocData] = useState<any[]>([]);
  
  const [sgsSearch, setSgsSearch] = useState('');
  const [sgsFilter, setSgsFilter] = useState('');
  
  const [iocSearch, setIocSearch] = useState('');

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [navigate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${localStorage.getItem('sgs_token')}` };
      const [statsRes, sgsRes, iocRes] = await Promise.all([
        fetch(`${backendBaseUrl}/api/admin/stats`, { headers }),
        fetch(`${backendBaseUrl}/api/admin/detailed_sgs`, { headers }),
        fetch(`${backendBaseUrl}/api/admin/detailed_ioc`, { headers })
      ]);
      
      if(statsRes.status === 401 || sgsRes.status === 401 || iocRes.status === 401) {
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
      
    } catch (err) {
      console.error('Failed to fetch admin data', err);
    }
    setLoading(false);
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

      </div>
    </div>
  );
}
