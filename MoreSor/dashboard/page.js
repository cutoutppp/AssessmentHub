"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Loader2, CheckCircle2, XCircle, Search, Clock, ChevronDown, ChevronRight, User, BookOpen } from 'lucide-react';
import Link from 'next/link';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('ทั้งหมด');
  const [selectedTeacher, setSelectedTeacher] = useState(null);

  // Timeframe State
  const [timeframeState, setTimeframeState] = useState({ phase: 1, message: 'กำลังโหลดข้อมูลเวลา...' });

  const [backHref, setBackHref] = useState('/');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const id = urlParams.get('id');
      if (id) {
        setBackHref(`/?id=${id}`);
      }
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const GAS_URL = 'https://script.google.com/macros/s/AKfycbwEwZ_8ZKA7K9qeeUX1b00ddGWNtOM1Hd2wcoqGfOsPaKlu4pl9oDSczsW4ckZsoEHz/exec';
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
          });
          
          if (p1Date && now <= p1Date) {
             setTimeframeState({ phase: 1, message: `เปิดรับรายงานผล มส. ถึงวันที่ ${p1Date.toLocaleDateString('th-TH')}` });
          } else if (p1Date && p2Date && now <= p2Date) {
             setTimeframeState({ phase: 2, message: `ปิดรับรายงานผล มส. แล้ว - ขณะนี้อยู่ในช่วงยื่นคำร้อง (ถึงวันที่ ${p2Date.toLocaleDateString('th-TH')})` });
          } else {
             setTimeframeState({ phase: 3, message: 'ปิดระบบการรายงานผลและยื่นคำร้องแก้ มส. เรียบร้อยแล้ว' });
          }
        }

        if (json.success) {
          setData(json);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Compute status by joining courses and statuses
  const processedData = useMemo(() => {
    if (!data) return [];
    
    return data.courses.map(course => {
      const roomStr = String(course['ชั้น']) + '/' + String(course['กลุ่ม-ห้อง']);
      const courseCode = course['รหัสวิชา'];
      
      // Find matching log in statuses
      const log = data.statuses.find(s => {
        // Detect if columns are shifted due to manual addition of "ชื่อวิชา" column in Google Sheets
        const isShifted = s['ครูผู้สอน'] === 'ส่งแล้ว';
        
        let sLevel = isShifted ? String(s['ชื่อวิชา'] || '') : String(s['ชั้น'] || '');
        let sRoom = isShifted ? String(s['ชั้น'] || '') : String(s['กลุ่ม-ห้อง'] || '');
        let sStatus = isShifted ? String(s['ครูผู้สอน'] || '') : String(s['สถานะการส่ง'] || '');
        
        // Normalize class level by removing "ม." to match both "5" and "ม.5"
        sLevel = sLevel.replace(/^ม\./, '').trim();
        const courseLevel = String(course['ชั้น']).replace(/^ม\./, '').trim();
        
        return s['รหัสวิชา'] === courseCode && 
               sLevel === courseLevel && 
               sRoom.trim() === String(course['กลุ่ม-ห้อง']).trim() &&
               sStatus === 'ส่งแล้ว';
      });

      // Get timestamp based on shift
      let timestamp = '-';
      let fileUrl = null;
      if (log) {
         const isShifted = log['ครูผู้สอน'] === 'ส่งแล้ว';
         const rawTime = isShifted ? log['สถานะการส่ง'] : log['เวลาที่ส่งล่าสุด'];
         if (rawTime) {
             const d = new Date(rawTime);
             if (!isNaN(d.getTime())) {
                 timestamp = d.toLocaleString('th-TH', { 
                     day: '2-digit', month: '2-digit', year: 'numeric', 
                     hour: '2-digit', minute: '2-digit' 
                 });
             } else {
                 timestamp = String(rawTime);
             }
         }
         // The GAS header for column 7
         fileUrl = log['ลิงก์ PDF'] || log['ไฟล์ PDF'] || log['ลิงค์ PDF'] || log[''] || null;
      }

      return {
        courseCode,
        courseName: course['วิชา'],
        room: roomStr,
        teacher: `${course['คำนำหน้า']}${course['ชื่อ']} ${course['นามสกุล']}`,
        subjectGroup: course['กลุ่มสาระ'] || 'ไม่ระบุกลุ่มสาระ',
        status: log ? 'ส่งแล้ว' : 'ยังไม่ส่ง',
        timestamp: timestamp,
        fileUrl: fileUrl
      };
    });
  }, [data]);

  // Extract groups and their stats
  const groupStats = useMemo(() => {
    if (!processedData || processedData.length === 0) return [];
    const groupsMap = {};
    processedData.forEach(row => {
      const sg = row.subjectGroup;
      if (!groupsMap[sg]) groupsMap[sg] = { total: 0, pending: 0 };
      groupsMap[sg].total += 1;
      if (row.status === 'ยังไม่ส่ง') {
        groupsMap[sg].pending += 1;
      }
    });
    
    const sortedGroupNames = Object.keys(groupsMap).sort();
    return sortedGroupNames.map(name => ({
      name,
      ...groupsMap[name]
    }));
  }, [processedData]);

  // Filtered and grouped data for Cards
  const displayData = useMemo(() => {
    let filtered = processedData;
    if (selectedGroup !== 'ทั้งหมด') {
      filtered = filtered.filter(d => d.subjectGroup === selectedGroup);
    }
    if (search) {
      filtered = filtered.filter(d => 
        d.teacher.includes(search) || 
        d.courseCode.toLowerCase().includes(search.toLowerCase()) ||
        d.room.includes(search)
      );
    }
    
    const teachersMap = {};
    filtered.forEach(row => {
      const t = row.teacher;
      if (!teachersMap[t]) teachersMap[t] = [];
      teachersMap[t].push(row);
    });
    
    return Object.keys(teachersMap).sort().map(teacherName => {
      const courses = teachersMap[teacherName];
      const submitted = courses.filter(c => c.status === 'ส่งแล้ว').length;
      return {
        name: teacherName,
        courses,
        total: courses.length,
        submitted,
        pending: courses.length - submitted,
        subjectGroup: courses[0].subjectGroup
      };
    });
  }, [processedData, selectedGroup, search]);

  const stats = {
    total: processedData.length,
    submitted: processedData.filter(d => d.status === 'ส่งแล้ว').length,
    pending: processedData.filter(d => d.status === 'ยังไม่ส่ง').length,
  };

  const percentage = stats.total > 0 ? Math.round((stats.submitted / stats.total) * 100) : 0;

  return (
    <div className="min-h-screen bg-white p-6 md:p-10 font-sans selection:bg-blue-200">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header - Matching TeacherHub */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Moresor Dashboard
            </h1>
            <p className="text-slate-500 mt-2 font-medium">
              ระบบประมวลผลและติดตามสถานะ มส. (SGS Integration)
            </p>
          </div>
          <div className="flex gap-3">
            <Link 
              href={backHref}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-sm transition-all duration-200 flex items-center gap-2"
            >
              เข้าสู่ระบบครูผู้สอน
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Timeframe Banner */}
        <div className={`p-4 rounded-xl border flex items-center gap-3 shadow-sm ${
          timeframeState.phase === 1 ? 'bg-blue-50 border-blue-200 text-blue-800' :
          timeframeState.phase === 2 ? 'bg-amber-50 border-amber-200 text-amber-800' :
          'bg-red-50 border-red-200 text-red-800'
        }`}>
          {timeframeState.phase === 1 && <CheckCircle2 className="w-5 h-5 text-blue-600" />}
          {timeframeState.phase === 2 && <AlertTriangle className="w-5 h-5 text-amber-600" />}
          {timeframeState.phase === 3 && <XCircle className="w-5 h-5 text-red-600" />}
          <span className="font-semibold">{timeframeState.message}</span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-200 rounded-full blur-xl animate-pulse"></div>
              <Loader2 className="w-14 h-14 text-blue-600 animate-spin relative z-10" />
            </div>
            <p className="text-lg font-medium text-slate-600 mt-6 animate-pulse">กำลังซิงค์ข้อมูลกับฐานข้อมูลกลาง...</p>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.15)] hover:border-blue-200 transition-all duration-300 transform hover:-translate-y-1 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full -z-0 opacity-50 group-hover:scale-110 transition-transform duration-500"></div>
                <div className="relative z-10">
                  <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">ภาพรวมการส่ง</p>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-slate-900">{percentage}<span className="text-2xl text-slate-400 font-medium">%</span></span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 mt-4 overflow-hidden">
                    <div className="bg-blue-500 h-full rounded-full" style={{ width: `${percentage}%` }}></div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.15)] hover:border-slate-300 transition-all duration-300 transform hover:-translate-y-1 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-bl-full -z-0 opacity-50 group-hover:scale-110 transition-transform duration-500"></div>
                <div className="relative z-10">
                  <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">วิชาทั้งหมด</p>
                  <p className="text-4xl font-bold text-slate-900 mt-2">{stats.total}</p>
                  <p className="text-slate-500 text-sm mt-1">วิชา (ตามตารางสอน)</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.15)] hover:border-emerald-200 transition-all duration-300 transform hover:-translate-y-1 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-full -z-0 opacity-50 group-hover:scale-110 transition-transform duration-500"></div>
                <div className="relative z-10">
                  <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> ส่งแล้ว
                  </p>
                  <p className="text-4xl font-bold text-slate-900 mt-2">{stats.submitted}</p>
                  <p className="text-emerald-600 text-sm mt-1">วิชาที่ยืนยันแล้ว</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.15)] hover:border-rose-200 transition-all duration-300 transform hover:-translate-y-1 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50 rounded-bl-full -z-0 opacity-50 group-hover:scale-110 transition-transform duration-500"></div>
                <div className="relative z-10">
                  <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-rose-500" /> ยังไม่ส่ง
                  </p>
                  <p className="text-4xl font-bold text-slate-900 mt-2">{stats.pending}</p>
                  <p className="text-rose-600 text-sm mt-1">วิชาที่รอการประมวลผล</p>
                </div>
              </div>
            </div>

            {/* Detail Section: Search and Tabs */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
              <div>
                <h2 className="text-xl font-bold text-slate-800">รายละเอียดสถานะรายวิชา</h2>
                <p className="text-slate-500 text-sm mt-1">แยกตามกลุ่มสาระการเรียนรู้ และครูผู้สอน</p>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                  <Search className="w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                </div>
                <input 
                  type="text" 
                  placeholder="ค้นหาชื่อครู, รหัสวิชา, ห้องเรียน..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm w-full md:w-80 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                />
              </div>
            </div>

            {/* Subject Group Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-4 hide-scrollbar">
              <button
                onClick={() => setSelectedGroup('ทั้งหมด')}
                className={`whitespace-nowrap px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${
                  selectedGroup === 'ทั้งหมด' 
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-200' 
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                ทั้งหมด
              </button>
              {groupStats.map(g => (
                <button
                  key={g.name}
                  onClick={() => setSelectedGroup(g.name)}
                  className={`whitespace-nowrap px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 flex items-center gap-2 ${
                    selectedGroup === g.name 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-200' 
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {g.name}
                  {g.pending > 0 && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] ${selectedGroup === g.name ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-600'}`}>
                      {g.pending}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Subject Group Summary */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-indigo-500" />
                  {selectedGroup === 'ทั้งหมด' ? 'ภาพรวมทุกกลุ่มสาระการเรียนรู้' : `กลุ่มสาระฯ ${selectedGroup}`}
                </h3>
                <p className="text-sm text-slate-500 mt-1">ข้อมูลสรุปความคืบหน้าของกลุ่มสาระที่เลือก</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 flex items-center gap-3">
                  <span className="text-slate-500 text-sm font-medium">รวม</span>
                  <span className="text-lg font-bold text-slate-800">
                    {selectedGroup === 'ทั้งหมด' 
                      ? groupStats.reduce((sum, g) => sum + g.total, 0)
                      : groupStats.find(g => g.name === selectedGroup)?.total || 0}
                  </span>
                </div>
                <div className="bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100 flex items-center gap-3">
                  <span className="text-emerald-600 text-sm font-medium">ส่งแล้ว</span>
                  <span className="text-lg font-bold text-emerald-700">
                    {selectedGroup === 'ทั้งหมด' 
                      ? groupStats.reduce((sum, g) => sum + (g.total - g.pending), 0)
                      : (groupStats.find(g => g.name === selectedGroup)?.total || 0) - (groupStats.find(g => g.name === selectedGroup)?.pending || 0)}
                  </span>
                </div>
                <div className="bg-rose-50 px-4 py-2 rounded-xl border border-rose-100 flex items-center gap-3">
                  <span className="text-rose-600 text-sm font-medium">รอส่ง</span>
                  <span className="text-lg font-bold text-rose-700">
                    {selectedGroup === 'ทั้งหมด' 
                      ? groupStats.reduce((sum, g) => sum + g.pending, 0)
                      : groupStats.find(g => g.name === selectedGroup)?.pending || 0}
                  </span>
                </div>
              </div>
            </div>

            {/* Teacher Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {displayData.map(teacher => {
                const progress = Math.round((teacher.submitted / teacher.total) * 100);
                const isComplete = teacher.pending === 0;
                
                return (
                  <div 
                    key={teacher.name}
                    onClick={() => setSelectedTeacher(teacher)}
                    className="bg-white rounded-2xl p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-slate-200 hover:shadow-xl hover:shadow-blue-900/5 hover:border-blue-300 transition-all duration-300 cursor-pointer group"
                  >
                    <div className="flex justify-between items-start mb-5">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-blue-50 group-hover:border-blue-100 group-hover:text-blue-600 transition-colors">
                          <User className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors line-clamp-1">{teacher.name}</h3>
                          <p className="text-xs font-medium text-slate-500 mt-0.5">{teacher.subjectGroup}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-slate-500">ความคืบหน้า</span>
                        <span className="text-slate-700">{teacher.submitted} / {teacher.total}</span>
                      </div>
                      
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-1000 ease-out ${isComplete ? 'bg-emerald-500' : 'bg-blue-500'}`}
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                      
                      <div className="pt-3 flex justify-between items-center border-t border-slate-50">
                        {isComplete ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md">
                            <CheckCircle2 className="w-3.5 h-3.5" /> ส่งครบแล้ว
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-md">
                            <Clock className="w-3.5 h-3.5" /> รอส่ง {teacher.pending} วิชา
                          </span>
                        )}
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-blue-600 transition-colors flex items-center gap-1">
                          รายละเอียด <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {displayData.length === 0 && (
              <div className="bg-white rounded-3xl border border-slate-200 p-16 flex flex-col items-center justify-center text-center shadow-sm">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                  <Search className="w-8 h-8 text-slate-300" />
                </div>
                <h3 className="text-lg font-bold text-slate-700">ไม่พบข้อมูลที่ค้นหา</h3>
                <p className="text-slate-500 mt-2">ลองเปลี่ยนคำค้นหา หรือเลือกกลุ่มสาระอื่น</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Teacher Detail Modal */}
      {selectedTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-500">
                  <User className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900">{selectedTeacher.name}</h2>
                  <p className="text-sm font-medium text-slate-500 mt-0.5">กลุ่มสาระฯ {selectedTeacher.subjectGroup} • สอนทั้งหมด {selectedTeacher.total} วิชา</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedTeacher(null)}
                className="p-2 hover:bg-slate-200/80 rounded-full transition-colors text-slate-400 hover:text-slate-600"
              >
                <XCircle className="w-7 h-7" />
              </button>
            </div>
            
            {/* Modal Body / Table */}
            <div className="overflow-y-auto p-6 bg-white">
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50/80 text-slate-600 border-b border-slate-200">
                      <th className="px-5 py-3.5 font-semibold">รหัสวิชา</th>
                      <th className="px-5 py-3.5 font-semibold">ชื่อวิชา</th>
                      <th className="px-5 py-3.5 font-semibold text-center">ห้อง</th>
                      <th className="px-5 py-3.5 font-semibold text-center">สถานะ</th>
                      <th className="px-5 py-3.5 font-semibold">เวลาอัปเดตล่าสุด</th>
                      <th className="px-5 py-3.5 font-semibold text-center">ไฟล์ ปพ.5</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedTeacher.courses.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-3.5 font-mono text-slate-700 font-bold">{row.courseCode}</td>
                        <td className="px-5 py-3.5 font-medium text-slate-600">{row.courseName}</td>
                        <td className="px-5 py-3.5 text-center font-bold text-slate-500">{row.room}</td>
                        <td className="px-5 py-3.5 text-center">
                          {row.status === 'ส่งแล้ว' ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200/50">
                              <CheckCircle2 className="w-3.5 h-3.5" /> ส่งแล้ว
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200/50">
                              <Clock className="w-3.5 h-3.5" /> ยังไม่ส่ง
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-xs font-medium text-slate-500">
                          {row.timestamp !== '-' ? (
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              {row.timestamp}
                            </div>
                          ) : <span className="text-slate-300">-</span>}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          {row.fileUrl && typeof row.fileUrl === 'string' && row.fileUrl.startsWith('http') ? (
                            <a href={row.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-[11px] font-bold transition-colors border border-blue-200/50">
                              <BookOpen className="w-3.5 h-3.5" /> เปิดดูไฟล์
                            </a>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/80 flex justify-end">
              <button 
                onClick={() => setSelectedTeacher(null)}
                className="px-6 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-xl transition-colors"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
