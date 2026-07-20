import React, { useState, useMemo } from 'react';
import Swal from 'sweetalert2';

interface DashboardProps {
  teacherData: any[];
  submissions: any[];
  academicYear: string;
  semester: string;
  roundType: string;
  downloadSavedDoc?: (type: 'wp16' | 'wp17' | 'wp25' | 'wp25_group', teacher_name: string, extraData?: any) => void;
}

export default function Dashboard({ teacherData, submissions, academicYear, semester, roundType, downloadSavedDoc }: DashboardProps) {
  const [filterGroup, setFilterGroup] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedTeachers, setExpandedTeachers] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'midterm'|'final'>('final');

  const handleDownloadGroupDoc = async (groupName: string, teacherNames: string[]) => {
    if (!downloadSavedDoc) return;

    // Filter valid teacher names (exclude placeholder strings like "ไม่พบในฐานข้อมูล" or "ไม่ระบุ")
    const validTeacherNames = teacherNames.filter(name => 
      name && 
      typeof name === 'string' &&
      !name.includes('ไม่พบ') && 
      !name.includes('ไม่ระบุ') &&
      name.trim() !== ''
    );

    const defaultHeads: Record<string, string> = {
      'ภาษาไทย': 'นางเรวดี กวางโตน',
      'คณิตศาสตร์': 'นายเสน่ห์ คำปัน',
      'วิทยาศาสตร์และเทคโนโลยี': 'นางทัศนี เทียนบุตร',
      'สังคมศึกษา ศาสนา และวัฒนธรรม': 'นายสมนึก สุวรรณบุตร',
      'สุขศึกษาและพลศึกษา': 'นายอนันต์ กวางโตน',
      'ภาษาต่างประเทศ': 'นางสาวจุฑาทิพย์ ทองกระจ่าง',
      'ศิลปะ': 'นางพัชรี นวลสุวรรณ์',
    };

    let defaultHeadName = defaultHeads[groupName] || '';
    if (!validTeacherNames.includes(defaultHeadName)) {
      defaultHeadName = validTeacherNames.length > 0 ? validTeacherNames[0] : '';
    }

    // Build Dropdown Options from valid teacher names in this Subject Group
    const inputOptions: Record<string, string> = {};
    validTeacherNames.forEach(name => {
      inputOptions[name] = name;
    });

    const { value: selectedHead } = await Swal.fire({
      title: `ดาวน์โหลดรายงานสรุป (${groupName})`,
      html: `
        <div class="text-left text-sm space-y-2 mb-2">
          <label class="block font-semibold text-slate-700">เลือกชื่อหัวหน้ากลุ่มสาระการเรียนรู้:</label>
          <p class="text-xs text-slate-500">เลือกรายชื่อครูในกลุ่มสาระฯ เพื่อลงชื่อในบันทึกข้อความ</p>
        </div>
      `,
      input: 'select',
      inputOptions: inputOptions,
      inputValue: defaultHeadName,
      showCancelButton: true,
      confirmButtonText: '📄 ดาวน์โหลดเอกสาร',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#059669',
      inputValidator: (value) => {
        if (!value) {
          return 'กรุณาเลือกชื่อหัวหน้ากลุ่มสาระการเรียนรู้';
        }
      }
    });

    if (selectedHead) {
      downloadSavedDoc('wp25_group', groupName, {
        teachers: validTeacherNames,
        head_name: selectedHead.trim()
      });
    }
  };

  // Filter submissions to match the current Year and Semester (ignore round to show both)
  const semesterSubmissions = useMemo(() => {
    return submissions.filter(s => 
      s.year === academicYear && 
      s.semester === semester
    );
  }, [submissions, academicYear, semester]);

  // Combine Teacher Data with Submissions
  const dashboardData = useMemo(() => {
    return teacherData.map(t => {
      // Midterm submissions
      const midSubs = semesterSubmissions.filter(s => 
        s.subject_code === t.subject_code && 
        s.class_level === t.class_level &&
        s.round === "กลางภาค"
      ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      const latestMid = midSubs.length > 0 ? midSubs[0] : null;

      // Final submissions
      const finSubs = semesterSubmissions.filter(s => 
        s.subject_code === t.subject_code && 
        s.class_level === t.class_level &&
        s.round === "ปลายภาค"
      ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      const latestFin = finSubs.length > 0 ? finSubs[0] : null;
      
      // Current round logic (for overall stats calculation)
      const currentSub = activeTab === 'final' ? latestFin : latestMid;

      return {
        ...t,
        status_midterm: latestMid ? latestMid.status : '❌ ยังไม่ส่ง',
        status_final: latestFin ? latestFin.status : '❌ ยังไม่ส่ง',
        
        // Use current round for these general stats
        status: currentSub ? currentSub.status : '❌ ยังไม่ส่ง',
        lastUpdated: currentSub ? new Date(currentSub.timestamp).toLocaleString('th-TH') : '-',
        total_students: currentSub ? currentSub.total_students : 0,
        grades_stat: currentSub ? currentSub.grades_stat : '',
        attributes_stat: currentSub ? currentSub.attributes_stat : '',
        reading_stat: currentSub ? currentSub.reading_stat : ''
      };
    });
  }, [teacherData, semesterSubmissions, activeTab]);

  // Derived stats
  const groups = Array.from(new Set(teacherData.map(t => t.subject_group || 'อื่นๆ')));
  
  const filteredData = dashboardData.filter(d => {
    const matchGroup = filterGroup === 'all' || d.subject_group === filterGroup;
    const matchSearch = d.teacher_name.includes(searchQuery) || d.subject_code.includes(searchQuery);
    return matchGroup && matchSearch;
  });

  const groupedByTeacher = useMemo(() => {
    const group: Record<string, any[]> = {};
    filteredData.forEach(d => {
      if (!group[d.teacher_name]) {
        group[d.teacher_name] = [];
      }
      group[d.teacher_name].push(d);
    });
    
    return Object.entries(group).map(([teacher_name, classes]) => {
      const mainGroup = classes[0].subject_group;
      // Evaluate Midterm
      const midSubmitted = classes.filter(c => c.status_midterm !== '❌ ยังไม่ส่ง').length;
      const midErrors = classes.some(c => c.status_midterm.includes('แก้ไข'));
      const midWarnings = classes.some(c => c.status_midterm.includes('สังเกต'));
      
      let midStatus = "";
      if (classes.length === 0) midStatus = "ไม่มีวิชาสอน";
      else if (midSubmitted === 0) midStatus = "❌ รอส่งทั้งหมด";
      else if (midSubmitted < classes.length) midStatus = `⏳ ส่งแล้ว ${midSubmitted}/${classes.length}`;
      else if (midErrors) midStatus = "⚠️ มีจุดต้องแก้ไข";
      else if (midWarnings) midStatus = "🟡 มีจุดสังเกต";
      else midStatus = "✅ ส่งครบสมบูรณ์";

      // Evaluate Final
      const finSubmitted = classes.filter(c => c.status_final !== '❌ ยังไม่ส่ง').length;
      const finErrors = classes.some(c => c.status_final.includes('แก้ไข'));
      const finWarnings = classes.some(c => c.status_final.includes('สังเกต'));
      
      let finStatus = "";
      if (classes.length === 0) finStatus = "ไม่มีวิชาสอน";
      else if (finSubmitted === 0) finStatus = "❌ รอส่งทั้งหมด";
      else if (finSubmitted < classes.length) finStatus = `⏳ ส่งแล้ว ${finSubmitted}/${classes.length}`;
      else if (finErrors) finStatus = "⚠️ มีจุดต้องแก้ไข";
      else if (finWarnings) finStatus = "🟡 มีจุดสังเกต";
      else finStatus = "✅ ส่งครบสมบูรณ์";

      return {
        teacher_name,
        subject_group: mainGroup,
        total_classes: classes.length,
        mid_submitted: midSubmitted,
        fin_submitted: finSubmitted,
        overall_status_midterm: midStatus,
        overall_status_final: finStatus,
        classes: classes
      };
    }).sort((a, b) => a.teacher_name.localeCompare(b.teacher_name, 'th-TH'));
  }, [filteredData]);

  // Group teachers by Subject Group
  const groupedBySubjectGroup = useMemo(() => {
    const groupMap: Record<string, typeof groupedByTeacher> = {};
    groupedByTeacher.forEach(t => {
      const gName = t.subject_group || 'กลุ่มสาระฯ อื่นๆ';
      if (!groupMap[gName]) groupMap[gName] = [];
      groupMap[gName].push(t);
    });

    return Object.entries(groupMap).map(([groupName, teachers]) => {
      const totalTeachers = teachers.length;
      const midCompleteTeachers = teachers.filter(t => t.overall_status_midterm.includes('สมบูรณ์')).length;
      const finCompleteTeachers = teachers.filter(t => t.overall_status_final.includes('สมบูรณ์')).length;
      return {
        groupName,
        teachers,
        totalTeachers,
        midCompleteTeachers,
        finCompleteTeachers
      };
    }).sort((a, b) => a.groupName.localeCompare(b.groupName, 'th-TH'));
  }, [groupedByTeacher]);

  const totalClasses = filteredData.length;
  
  const midSubmittedClasses = filteredData.filter(d => d.status_midterm !== '❌ ยังไม่ส่ง').length;
  const midCompleteClasses = filteredData.filter(d => d.status_midterm.includes('สมบูรณ์')).length;
  const midWarningClasses = filteredData.filter(d => d.status_midterm.includes('สังเกต')).length;
  const midMissingClasses = totalClasses - midSubmittedClasses;
  const midPercentComplete = totalClasses > 0 ? Math.round((midSubmittedClasses / totalClasses) * 100) : 0;

  const finSubmittedClasses = filteredData.filter(d => d.status_final !== '❌ ยังไม่ส่ง').length;
  const finCompleteClasses = filteredData.filter(d => d.status_final.includes('สมบูรณ์')).length;
  const finWarningClasses = filteredData.filter(d => d.status_final.includes('สังเกต')).length;
  const finMissingClasses = totalClasses - finSubmittedClasses;
  const finPercentComplete = totalClasses > 0 ? Math.round((finSubmittedClasses / totalClasses) * 100) : 0;

  const activePercentComplete = activeTab === 'midterm' ? midPercentComplete : finPercentComplete;
  const activeSubmittedClasses = activeTab === 'midterm' ? midSubmittedClasses : finSubmittedClasses;
  const activeCompleteClasses = activeTab === 'midterm' ? midCompleteClasses : finCompleteClasses;
  const activeWarningClasses = activeTab === 'midterm' ? midWarningClasses : finWarningClasses;
  const activeMissingClasses = activeTab === 'midterm' ? midMissingClasses : finMissingClasses;

  const toggleTeacher = (tName: string) => {
    setExpandedTeachers(prev => {
      const next = new Set(prev);
      if (next.has(tName)) next.delete(tName);
      else next.add(tName);
      return next;
    });
  };

  const toggleGroup = (gName: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(gName)) next.delete(gName);
      else next.add(gName);
      return next;
    });
  };

  const getStatusBadge = (statusStr: string) => {
    if (statusStr.includes('สมบูรณ์')) return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700">{statusStr}</span>;
    if (statusStr.includes('สังเกต')) return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">{statusStr}</span>;
    if (statusStr.includes('แก้ไข')) return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-rose-100 text-rose-700">{statusStr}</span>;
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-200 text-slate-600">{statusStr}</span>;
  };

  return (
    <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200 animate-fade-in-up">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">📊 แดชบอร์ดติดตามการส่งเกรด</h2>
          <p className="text-slate-500 mt-1">ปีการศึกษา {academicYear} ภาคเรียนที่ {semester}</p>
        </div>
        <div className="flex items-center space-x-3">
           <select 
             value={filterGroup} 
             onChange={e => setFilterGroup(e.target.value)}
             className="border border-slate-300 rounded-xl px-4 py-2 font-medium focus:outline-none focus:border-blue-500 bg-slate-50"
           >
             <option value="all">ทุกกลุ่มสาระฯ</option>
             {groups.map(g => <option key={g as string} value={g as string}>{g as string}</option>)}
           </select>
           <input 
             type="text" 
             placeholder="🔍 ค้นหาชื่อครู, รหัสวิชา..." 
             value={searchQuery}
             onChange={e => setSearchQuery(e.target.value)}
             className="border border-slate-300 rounded-xl px-4 py-2 focus:outline-none focus:border-blue-500 w-64"
           />
        </div>
      </div>

      <div className="flex items-center space-x-2 mb-4">
        <button 
          onClick={() => setActiveTab('midterm')} 
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${activeTab === 'midterm' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          สถิติการส่งเกรด: กลางภาค
        </button>
        <button 
          onClick={() => setActiveTab('final')} 
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${activeTab === 'final' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          สถิติการส่งเกรด: ปลายภาค
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 relative overflow-hidden transition-all duration-300">
          <div className="absolute right-0 top-0 bottom-0 w-1 bg-blue-400"></div>
          <div className="text-blue-600 font-semibold mb-1">ภาพรวมการส่ง</div>
          <div className="text-3xl font-bold text-blue-900">{activePercentComplete}%</div>
          <div className="text-sm text-blue-700 mt-1">{activeSubmittedClasses} จากทั้งหมด {totalClasses} รายวิชา</div>
        </div>
        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 transition-all duration-300">
          <div className="text-emerald-600 font-semibold mb-1">✅ สมบูรณ์</div>
          <div className="text-3xl font-bold text-emerald-900">{activeCompleteClasses} <span className="text-lg font-medium text-emerald-700">/ {totalClasses}</span></div>
          <div className="text-sm text-emerald-700 mt-1">รายวิชาที่พร้อมพิมพ์</div>
        </div>
        <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 transition-all duration-300">
          <div className="text-amber-600 font-semibold mb-1">🟡 มีจุดสังเกต</div>
          <div className="text-3xl font-bold text-amber-900">{activeWarningClasses} <span className="text-lg font-medium text-amber-700">/ {totalClasses}</span></div>
          <div className="text-sm text-amber-700 mt-1">รายวิชาที่มีเกรดขัดแย้ง</div>
        </div>
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 transition-all duration-300">
          <div className="text-slate-600 font-semibold mb-1">⏳ ยังไม่ส่ง</div>
          <div className="text-3xl font-bold text-slate-900">{activeMissingClasses} <span className="text-lg font-medium text-slate-500">/ {totalClasses}</span></div>
          <div className="text-sm text-slate-500 mt-1">รายวิชาที่รอการอัปโหลด</div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-2xs">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/90 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b border-slate-200/80">
              <th className="px-5 py-3.5 w-1/2">กลุ่มสาระการเรียนรู้ / ชื่อครูผู้สอน</th>
              <th className="px-4 py-3.5 hidden md:table-cell text-center">สังกัดกลุ่มสาระฯ</th>
              <th className="px-4 py-3.5 text-center">ภาพรวม (กลางภาค)</th>
              <th className="px-4 py-3.5 text-center">ภาพรวม (ปลายภาค)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {groupedBySubjectGroup.map((group, groupIdx) => {
              const isExpandedGroup = expandedGroups.has(group.groupName);
              return (
                <React.Fragment key={groupIdx}>
                  {/* Subject Group Section Header Row (Minimalist Pastel Style) */}
                  <tr 
                    className={`transition-colors cursor-pointer border-b border-slate-200/60 ${isExpandedGroup ? 'bg-slate-100/90' : 'bg-slate-50/70 hover:bg-slate-100/70'}`}
                    onClick={() => toggleGroup(group.groupName)}
                  >
                    <td colSpan={2} className="px-5 py-3 text-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className={`text-slate-400 text-xs font-bold transition-transform duration-200 ${isExpandedGroup ? 'rotate-90 text-blue-600' : ''}`}>▶</span>
                          <span className="text-slate-800 font-bold text-sm">{group.groupName}</span>
                          <span className="text-[11px] bg-slate-200/70 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                            ครู {group.totalTeachers} คน
                          </span>
                        </div>

                        {/* Subject Group Memo Download Button */}
                        {downloadSavedDoc && (
                          <div className="pl-6 sm:pl-0" onClick={e => e.stopPropagation()}>
                            <button 
                              onClick={() => handleDownloadGroupDoc(group.groupName, group.teachers.map(t => t.teacher_name))}
                              className="px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-md hover:shadow-lg transform hover:-translate-y-0.5 text-xs rounded-lg font-semibold transition-all duration-200 flex items-center gap-1.5 cursor-pointer"
                              title="ดาวน์โหลดบันทึกข้อความรายงานการส่งคะแนนเก็บ (สรุปภาพรวมกลุ่มสาระฯ)"
                            >
                              📥 ดาวน์โหลดบันทึกข้อความ
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/70">
                        ส่งครบแล้ว {group.midCompleteTeachers}/{group.totalTeachers} คน
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200/70">
                        ส่งครบแล้ว {group.finCompleteTeachers}/{group.totalTeachers} คน
                      </span>
                    </td>
                  </tr>

                  {/* Teachers inside this Subject Group */}
                  {isExpandedGroup && group.teachers.map((t, i) => {
                    const isExpanded = expandedTeachers.has(t.teacher_name);
                    return (
                      <React.Fragment key={`${groupIdx}-${i}`}>
                        {/* Teacher Main Row */}
                        <tr 
                          className={`group transition-colors cursor-pointer border-b border-slate-100/80 ${isExpanded ? 'bg-blue-50/40' : 'hover:bg-slate-50/80'}`}
                          onClick={() => toggleTeacher(t.teacher_name)}
                        >
                          <td className="px-5 py-3.5 text-slate-800 pl-8">
                            <div className="flex items-center gap-2">
                              <span className="text-slate-300 text-xs">{isExpanded ? '▼' : '▶'}</span>
                              <span className="text-sm font-semibold text-slate-800">{t.teacher_name}</span>
                            </div>
                            
                            {/* Document Download Buttons Sub-bar */}
                            {downloadSavedDoc && (
                              <div className="flex flex-wrap items-center gap-1.5 mt-1.5 pl-4" onClick={e => e.stopPropagation()}>
                                {/* WP25 (Midterm) */}
                                <button 
                                  onClick={() => (t.overall_status_midterm.includes('สมบูรณ์') || t.overall_status_midterm.includes('สังเกต')) && downloadSavedDoc('wp25', t.teacher_name, { subject_group: t.subject_group, mock_subjects: teacherData.filter((td: any) => td.teacher_name === t.teacher_name) })} 
                                  disabled={!(t.overall_status_midterm.includes('สมบูรณ์') || t.overall_status_midterm.includes('สังเกต'))}
                                  className={`px-2 py-0.5 text-[11px] rounded-md font-medium transition shadow-2xs flex items-center gap-1 ${t.overall_status_midterm.includes('สมบูรณ์') || t.overall_status_midterm.includes('สังเกต') ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 cursor-pointer' : 'bg-slate-50 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60 grayscale'}`}
                                  title={t.overall_status_midterm.includes('สมบูรณ์') || t.overall_status_midterm.includes('สังเกต') ? "ดาวน์โหลด วผ.25 (บันทึกข้อความรายงานคะแนนกลางภาค)" : "ต้องส่งคะแนนกลางภาคให้ครบก่อนจึงจะดาวน์โหลดได้"}
                                >
                                  📄 วผ.25 (กลางภาค)
                                </button>

                                {/* WP16 (Final) */}
                                <button 
                                  onClick={() => (t.overall_status_final.includes('สมบูรณ์') || t.overall_status_final.includes('สังเกต')) && downloadSavedDoc('wp16', t.teacher_name, { mock_subjects: teacherData.filter((td: any) => td.teacher_name === t.teacher_name) })} 
                                  disabled={!(t.overall_status_final.includes('สมบูรณ์') || t.overall_status_final.includes('สังเกต'))}
                                  className={`px-2 py-0.5 text-[11px] rounded-md font-medium transition shadow-2xs flex items-center gap-1 ${t.overall_status_final.includes('สมบูรณ์') || t.overall_status_final.includes('สังเกต') ? 'bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-300 cursor-pointer' : 'bg-slate-50 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60 grayscale'}`}
                                  title={t.overall_status_final.includes('สมบูรณ์') || t.overall_status_final.includes('สังเกต') ? "ดาวน์โหลด วผ.16 (รายงาน 0 ร มผ)" : "ต้องส่งคะแนนปลายภาคให้ครบก่อนจึงจะดาวน์โหลดได้"}
                                >
                                  📄 วผ.16 (ปลายภาค)
                                </button>

                                {/* WP17 (Final) */}
                                <button 
                                  onClick={() => (t.overall_status_final.includes('สมบูรณ์') || t.overall_status_final.includes('สังเกต')) && downloadSavedDoc('wp17', t.teacher_name, { mock_subjects: teacherData.filter((td: any) => td.teacher_name === t.teacher_name) })} 
                                  disabled={!(t.overall_status_final.includes('สมบูรณ์') || t.overall_status_final.includes('สังเกต'))}
                                  className={`px-2 py-0.5 text-[11px] rounded-md font-medium transition shadow-2xs flex items-center gap-1 ${t.overall_status_final.includes('สมบูรณ์') || t.overall_status_final.includes('สังเกต') ? 'bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-300 cursor-pointer' : 'bg-slate-50 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60 grayscale'}`}
                                  title={t.overall_status_final.includes('สมบูรณ์') || t.overall_status_final.includes('สังเกต') ? "ดาวน์โหลด วผ.17 (รายงานการจัดกิจกรรม)" : "ต้องส่งคะแนนปลายภาคให้ครบก่อนจึงจะดาวน์โหลดได้"}
                                >
                                  📄 วผ.17 (ปลายภาค)
                                </button>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-slate-500 text-xs hidden md:table-cell text-center">{t.subject_group}</td>
                          <td className="px-4 py-3.5 text-center">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border
                              ${t.overall_status_midterm.includes('สมบูรณ์') ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60' : 
                                t.overall_status_midterm.includes('แก้ไข') ? 'bg-rose-50 text-rose-700 border-rose-200/60' : 
                                t.overall_status_midterm.includes('สังเกต') ? 'bg-amber-50 text-amber-700 border-amber-200/60' : 
                                t.overall_status_midterm.includes('ส่งแล้ว') ? 'bg-blue-50 text-blue-700 border-blue-200/60' : 
                                'bg-slate-50 text-slate-500 border-slate-200/60'}`
                            }>
                              {t.overall_status_midterm}
                            </span>
                            <div className="text-[11px] text-slate-400 mt-0.5">{t.mid_submitted}/{t.total_classes} วิชา</div>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border
                              ${t.overall_status_final.includes('สมบูรณ์') ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60' : 
                                t.overall_status_final.includes('แก้ไข') ? 'bg-rose-50 text-rose-700 border-rose-200/60' : 
                                t.overall_status_final.includes('สังเกต') ? 'bg-amber-50 text-amber-700 border-amber-200/60' : 
                                t.overall_status_final.includes('ส่งแล้ว') ? 'bg-blue-50 text-blue-700 border-blue-200/60' : 
                                'bg-slate-50 text-slate-500 border-slate-200/60'}`
                            }>
                              {t.overall_status_final}
                            </span>
                            <div className="text-[11px] text-slate-400 mt-0.5">{t.fin_submitted}/{t.total_classes} วิชา</div>
                          </td>
                        </tr>
                  
                  {/* Expanded Classes Details */}
                  {isExpanded && (
                    <tr className="bg-slate-50/50">
                      <td colSpan={4} className="p-0 border-b border-slate-200">
                        <div className="pl-12 pr-4 py-4">
                          <table className="w-full text-left text-sm border-l-2 border-blue-200">
                            <thead>
                              <tr className="text-slate-500 bg-white shadow-sm border-y border-slate-200">
                                <th className="px-4 py-2 font-semibold border-r border-slate-100">รหัสวิชา</th>
                                <th className="px-4 py-2 font-semibold border-r border-slate-100">ชั้น/ห้อง</th>
                                <th className="px-4 py-2 font-semibold border-r border-slate-100 text-center">สถานะ (กลางภาค)</th>
                                <th className="px-4 py-2 font-semibold border-r border-slate-100 text-center">สถานะ (ปลายภาค)</th>
                                <th className="px-4 py-2 font-semibold text-center border-r border-slate-100">นร.</th>
                                <th className="px-4 py-2 font-semibold border-r border-slate-100 text-center">สถิติ (เกรด / คุณลักษณะ / อ่านคิดฯ)</th>
                                <th className="px-4 py-2 font-semibold">อัปเดตล่าสุด</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                              {t.classes.map((c, j) => (
                                <tr key={j} className="hover:bg-slate-50 transition-colors">
                                  <td className="px-4 py-2 font-mono text-slate-700 font-medium border-r border-slate-100">{c.subject_code}</td>
                                  <td className="px-4 py-2 text-slate-600 border-r border-slate-100">{c.class_level}</td>
                                  
                                  {/* Midterm Status */}
                                  <td className="px-4 py-2 border-r border-slate-100 text-center">
                                    {getStatusBadge(c.status_midterm)}
                                  </td>
                                  
                                  {/* Final Status */}
                                  <td className="px-4 py-2 border-r border-slate-100 text-center">
                                    {getStatusBadge(c.status_final)}
                                  </td>

                                  <td className="px-4 py-2 text-center font-medium text-slate-700 border-r border-slate-100">
                                    {c.total_students > 0 ? c.total_students : '-'}
                                  </td>
                                  <td className="px-4 py-2 text-slate-600 text-xs border-r border-slate-100">
                                    <div className="space-y-2 max-w-[400px]">
                                      {c.grades_stat && c.grades_stat !== "-" && (
                                        <div className="flex flex-wrap gap-1">
                                          <span className="font-semibold text-slate-500 w-12 text-right mr-1">เกรด:</span>
                                          {c.grades_stat.split(', ').map((g: string, i: number) => (
                                            <span key={`g-${i}`} className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100 shadow-sm">{g}</span>
                                          ))}
                                        </div>
                                      )}
                                      {c.attributes_stat && c.attributes_stat !== "-" && (
                                        <div className="flex flex-wrap gap-1">
                                          <span className="font-semibold text-slate-500 w-12 text-right mr-1">คุณฯ:</span>
                                          {c.attributes_stat.split(', ').map((a: string, i: number) => (
                                            <span key={`a-${i}`} className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-100 shadow-sm">{a}</span>
                                          ))}
                                        </div>
                                      )}
                                      {c.reading_stat && c.reading_stat !== "-" && (
                                        <div className="flex flex-wrap gap-1">
                                          <span className="font-semibold text-slate-500 w-12 text-right mr-1">อ่านคิดฯ:</span>
                                          {c.reading_stat.split(', ').map((r: string, i: number) => (
                                            <span key={`r-${i}`} className="bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded border border-purple-100 shadow-sm">{r}</span>
                                          ))}
                                        </div>
                                      )}
                                      {!c.grades_stat && !c.attributes_stat && !c.reading_stat && '-'}
                                    </div>
                                  </td>
                                  <td className="px-4 py-2 text-slate-500 text-xs">{c.lastUpdated}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                    </React.Fragment>
                  );
                })}
              </React.Fragment>
            );
          })}
            
            {groupedBySubjectGroup.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                  ไม่พบข้อมูลที่ตรงกับเงื่อนไข
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
