import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';

export interface Wp16ModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacherName: string;
  initialSubjectCode?: string;
  availableSubjects?: { subject_code: string; subject_name: string }[];
  academicYear?: string;
  semester?: string;
  backendUrl?: string;
  webAppUrl?: string;
  onDownload?: (extraData: any) => Promise<void> | void;
}

const QUICK_TAGS = [
  { label: '📝 ขาดสอบปลายภาค', text: 'ขาดสอบปลายภาค (ติดต่อสอบแก้ตัวข้อเขียน)', short: '📝 ปลายภาค' },
  { label: '📝 ขาดสอบกลางภาค', text: 'ขาดสอบกลางภาค (ติดต่อสอบแก้ตัวข้อเขียน)', short: '📝 กลางภาค' },
  { label: '⏳ มส: เวลาเรียนไม่ครบ 80%', text: 'เวลาเรียนไม่ครบ 80% (ทำชดเชยเวลาเรียน)', short: '⏳ มส 80%' },
];

const cleanClassLevel = (val: any) => {
  if (!val) return '';
  const s = val
    .toString()
    .replace(/^(ม\.\s*)+/, '')
    .replace(/^(ม\s*)+/, '')
    .replace(/เดิม\s*\//, '/')
    .replace(/\s+/g, '')
    .trim();
  return s ? `ม.${s}` : '';
};

export default function Wp16Modal({
  isOpen,
  onClose,
  teacherName,
  initialSubjectCode,
  availableSubjects = [],
  academicYear = '2569',
  semester = '1',
  backendUrl = 'http://127.0.0.1:8000',
  webAppUrl,
  onDownload,
}: Wp16ModalProps) {
  const [selectedSubject, setSelectedSubject] = useState<string>(initialSubjectCode || '');
  const [subjectName, setSubjectName] = useState<string>('');
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<boolean>(false);
  const [savingDoc, setSavingDoc] = useState<boolean>(false);
  const [zipping, setZipping] = useState<boolean>(false);
  const [bulkTaskInput, setBulkTaskInput] = useState<string>('');
  const [taskHistory, setTaskHistory] = useState<string[]>([]);
  const [appendMode, setAppendMode] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'unassigned' | 'assigned'>('all');
  const [subjectCounts, setSubjectCounts] = useState<Record<string, number>>({});

  // States for manual add student
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newStudentId, setNewStudentId] = useState<string>('');
  const [newName, setNewName] = useState<string>('');
  const [newClassLevel, setNewClassLevel] = useState<string>('');
  const [newOldGrade, setNewOldGrade] = useState<string>('0');
  const [newOldScore, setNewOldScore] = useState<string>('');
  const [newTask, setNewTask] = useState<string>('');

  useEffect(() => {
    try {
      const raw = localStorage.getItem('wp16_task_history');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setTaskHistory(parsed);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const addToHistory = (text: string) => {
    if (!text || !text.trim() || text === 'สอบแก้ตัว') return;
    const t = text.trim();
    setTaskHistory((prev) => {
      const next = [t, ...prev.filter((x) => x !== t)].slice(0, 15);
      try {
        localStorage.setItem('wp16_task_history', JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  };

  const removeFromHistory = (text: string) => {
    setTaskHistory((prev) => {
      const next = prev.filter((x) => x !== text);
      try {
        localStorage.setItem('wp16_task_history', JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  };

  useEffect(() => {
    if (initialSubjectCode) {
      setSelectedSubject(initialSubjectCode);
    } else if (availableSubjects.length > 0) {
      setSelectedSubject(availableSubjects[0].subject_code);
    }
  }, [initialSubjectCode, availableSubjects]);

  useEffect(() => {
    if (!isOpen || !selectedSubject) return;
    let active = true;
    setLoading(true);
    const foundSubj = availableSubjects.find((s) => s.subject_code === selectedSubject);
    if (foundSubj) setSubjectName(foundSubj.subject_name);

    (async () => {
      try {
        const res = await fetch(
          `${backendUrl}/api/wp16/students?teacher_name=${encodeURIComponent(teacherName)}&subject_code=${encodeURIComponent(selectedSubject)}`
        );
        if (!res.ok) throw new Error('Failed to load students');
        const data = await res.json();
        if (active) {
          setStudents(
            (data.students || []).map((s: any) => ({
              ...s,
              class_level: cleanClassLevel(s.class_level),
            }))
          );
          if (data.subject_name) setSubjectName(data.subject_name);
          setSelectedStudentIds(new Set());
          if (data.subject_counts) setSubjectCounts(data.subject_counts);
          if (data.recent_tasks && Array.isArray(data.recent_tasks)) {
            setTaskHistory((prev) => {
              const merged = Array.from(new Set([...data.recent_tasks, ...prev]));
              try {
                localStorage.setItem('wp16_task_history', JSON.stringify(merged.slice(0, 15)));
              } catch (e) {
                console.error(e);
              }
              return merged.slice(0, 15);
            });
          }
        }
      } catch (e) {
        console.error(e);
        if (active) {
          setStudents([]);
          setSelectedStudentIds(new Set());
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [isOpen, teacherName, selectedSubject, backendUrl, availableSubjects]);

  if (!isOpen) return null;

  const toggleSelectAll = () => {
    if (selectedStudentIds.size === students.length) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(new Set(students.map((s) => s.student_id)));
    }
  };

  const toggleSelectStudent = (id: string) => {
    const next = new Set(selectedStudentIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedStudentIds(next);
  };

  const updateStudentTask = (studentId: string, val: string) => {
    setStudents((prev) =>
      prev.map((s) => (s.student_id === studentId ? { ...s, pending_task: val } : s))
    );
  };

  const handleBlurTask = (val: string) => {
    val
      .split('\n')
      .map((x) => x.trim())
      .filter(Boolean)
      .forEach((x) => addToHistory(x));
  };

  const quickSetTask = (studentId: string, text: string) => {
    const t = text.trim();
    if (!t) return;
    setStudents((prev) =>
      prev.map((s) => {
        if (s.student_id === studentId) {
          const current = (s.pending_task || '').trim();
          if (!appendMode || !current || current === 'สอบแก้ตัว') {
            return { ...s, pending_task: t };
          }
          const lines = current.split('\n').map((x) => x.trim()).filter(Boolean);
          if (lines.includes(t)) return s;
          return { ...s, pending_task: `${current}\n${t}` };
        }
        return s;
      })
    );
    addToHistory(t);
  };

  const applyBulkTask = async (taskText: string) => {
    const t = taskText.trim();
    if (!t) return;
    let targetIds = new Set(selectedStudentIds);
    if (targetIds.size === 0) {
      const confirm = await Swal.fire({
        icon: 'question',
        title: 'ใส่ข้อความให้นักเรียนทุกคน?',
        html: `คุณยังไม่ได้ติ๊กเลือกนักเรียน<br/>ต้องการใส่ข้อความ <b>"${t}"</b><br/>ให้กับนักเรียนทั้งหมด <b>${students.length} คน</b> หรือไม่?`,
        showCancelButton: true,
        confirmButtonText: 'ใส่ทุกคน',
        cancelButtonText: 'ยกเลิก',
        confirmButtonColor: '#3b82f6',
        cancelButtonColor: '#94a3b8',
      });
      if (!confirm.isConfirmed) return;
      targetIds = new Set(students.map((s) => s.student_id));
      setSelectedStudentIds(targetIds);
    }

    setStudents((prev) =>
      prev.map((s) => {
        if (targetIds.has(s.student_id)) {
          const current = (s.pending_task || '').trim();
          if (!appendMode || !current || current === 'สอบแก้ตัว') {
            return { ...s, pending_task: t };
          }
          const lines = current.split('\n').map((x) => x.trim()).filter(Boolean);
          if (lines.includes(t)) return s;
          return { ...s, pending_task: `${current}\n${t}` };
        }
        return s;
      })
    );
    addToHistory(t);
  };

  const handleAddBulkInput = async () => {
    const t = bulkTaskInput.trim();
    if (t) {
      await applyBulkTask(t);
      setBulkTaskInput('');
    }
  };

  const clearSelectedTasks = () => {
    if (selectedStudentIds.size === 0) {
      Swal.fire({
        icon: 'info',
        title: 'กรุณาเลือกนักเรียน',
        text: 'ติ๊กเลือกนักเรียนที่ต้องการล้างงานค้าง',
        confirmButtonColor: '#3b82f6',
      });
      return;
    }
    setStudents((prev) =>
      prev.map((s) => (selectedStudentIds.has(s.student_id) ? { ...s, pending_task: '' } : s))
    );
  };

  const clearSingleTask = (studentId: string) => {
    setStudents((prev) =>
      prev.map((s) => (s.student_id === studentId ? { ...s, pending_task: '' } : s))
    );
  };

  const copyTaskToSelected = (taskText: string, studentName: string) => {
    if (selectedStudentIds.size === 0) {
      Swal.fire({
        icon: 'info',
        title: 'ยังไม่ได้ติ๊กเลือกนักเรียนปลายทาง',
        text: 'กรุณาติ๊กถูกที่ช่องสี่เหลี่ยมด้านหน้านักเรียนที่คุณต้องการจะเอางานนี้ไปใส่ให้ก่อน',
        confirmButtonColor: '#3b82f6',
      });
      return;
    }
    const t = (taskText || '').trim();
    if (!t || t === 'สอบแก้ตัว') {
      Swal.fire({
        icon: 'warning',
        title: 'ไม่มีข้อความงาน',
        text: 'นักเรียนคนนี้ยังไม่มีข้อความงานค้างที่จะคัดลอก',
        confirmButtonColor: '#3b82f6',
      });
      return;
    }
    const count = selectedStudentIds.size;
    setStudents((prev) =>
      prev.map((s) => {
        if (selectedStudentIds.has(s.student_id)) {
          const current = (s.pending_task || '').trim();
          if (!appendMode || !current || current === 'สอบแก้ตัว') {
            return { ...s, pending_task: t };
          }
          const lines = current.split('\n').map((x) => x.trim()).filter(Boolean);
          if (lines.includes(t)) return s;
          return { ...s, pending_task: `${current}\n${t}` };
        }
        return s;
      })
    );

    Swal.fire({
      icon: 'success',
      title: 'คัดลอกงานสำเร็จ',
      text: `คัดลอกงานของ ${studentName} ไปใส่ให้นักเรียนที่ติ๊กเลือกจำนวน ${count} คนแล้ว`,
      timer: 1800,
      showConfirmButton: false,
      toast: true,
      position: 'top-end',
    });
  };

  const handleOpenAddModal = () => {
    const defaultClass = students.length > 0 ? students[0].class_level : '';
    setNewStudentId('');
    setNewName('');
    setNewClassLevel(defaultClass);
    setNewOldScore('');
    setNewOldGrade('0');
    setNewTask('');
    setShowAddModal(true);
  };

  const handleSaveNewStudent = async () => {
    const sId = newStudentId.trim();
    const sName = newName.trim();
    if (!sId) {
      Swal.fire('ข้อผิดพลาด', 'กรุณาระบุเลขประจำตัวนักเรียน', 'warning');
      return;
    }
    if (!sName) {
      Swal.fire('ข้อผิดพลาด', 'กรุณาระบุชื่อ - นามสกุลนักเรียน', 'warning');
      return;
    }
    if (students.some((s) => s.student_id === sId)) {
      Swal.fire('แจ้งเตือน', `เลขประจำตัว ${sId} มีอยู่ในรายการแล้ว`, 'warning');
      return;
    }
    const newStudent = {
      student_id: sId,
      student_name: sName,
      class_level: cleanClassLevel(newClassLevel),
      old_score: newOldScore.trim(),
      old_grade: newOldGrade.trim() || '0',
      pending_task: newTask.trim(),
      remark: '[เพิ่มเอง]',
      is_manual: true,
    };

    try {
      await fetch(`${backendUrl}/api/wp16/student`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacher_name: teacherName,
          subject_code: selectedSubject,
          subject_name: subjectName,
          academic_year: academicYear || '2569',
          semester: semester || '1',
          student: newStudent,
          webhookUrl: webAppUrl,
        }),
      });
    } catch (err) {
      console.error('Failed to save manual student to backend:', err);
    }

    if (webAppUrl) {
      try {
        fetch(webAppUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'sync-wp16-sheet',
            spreadsheetId: '1OJh1FUnvLeIPGls4QIlture5f7GbAM0IieO8J5q9LuQ',
            sheetName: 'WP16_งานค้าง',
            items: [
              {
                special_id: `${selectedSubject}${sId}`,
                specialId: `${selectedSubject}${sId}`,
                academic_year: academicYear || '2569',
                year: academicYear || '2569',
                semester: semester || '1',
                term: semester || '1',
                year_term: `${academicYear || '2569'}/${semester || '1'}`,
                termStr: `${academicYear || '2569'}/${semester || '1'}`,
                subject_code: selectedSubject,
                subjCode: selectedSubject,
                subject_name: subjectName,
                subjName: subjectName,
                teacher_name: teacherName,
                teacherName: teacherName,
                class_level: newStudent.class_level,
                classLevel: newStudent.class_level,
                student_id: sId,
                stuId: sId,
                student_name: sName,
                stuName: sName,
                old_score: newStudent.old_score,
                oldScore: newStudent.old_score,
                old_grade: newStudent.old_grade,
                oldGrade: newStudent.old_grade,
                pending_task: newStudent.pending_task,
                pendingTask: newStudent.pending_task,
                remark: '[เพิ่มเอง]',
                updated_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
              },
            ],
          }),
        }).catch((err) => console.warn('GAS manual student sync error:', err));
      } catch (e) {
        console.warn(e);
      }
    }

    setStudents((prev) => [...prev, newStudent]);
    setShowAddModal(false);
    Swal.fire({
      icon: 'success',
      title: 'เพิ่มนักเรียนสำเร็จ',
      text: `เพิ่ม ${sName} เข้าสู่รายการ วผ.16 แล้ว`,
      timer: 1500,
      showConfirmButton: false,
      toast: true,
      position: 'top-end',
    });
  };

  const handleDeleteStudent = async (studentId: string, studentName: string) => {
    const confirm = await Swal.fire({
      icon: 'warning',
      title: 'ลบนักเรียนคนนี้?',
      html: `คุณต้องการลบ <b>${studentName}</b> (รหัส ${studentId})<br/>ออกจากรายการ วผ.16 ของวิชานี้ใช่หรือไม่?`,
      showCancelButton: true,
      confirmButtonText: 'ยืนยันลบ',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#94a3b8',
    });
    if (confirm.isConfirmed) {
      try {
        await fetch(
          `${backendUrl}/api/wp16/student?subject_code=${encodeURIComponent(
            selectedSubject
          )}&student_id=${encodeURIComponent(studentId)}`,
          { method: 'DELETE' }
        );
      } catch (e) {
        console.error('Failed to delete on server', e);
      }
      setStudents((prev) => prev.filter((s) => s.student_id !== studentId));
      setSelectedStudentIds((prev) => {
        const next = new Set(prev);
        next.delete(studentId);
        return next;
      });
      Swal.fire({
        icon: 'success',
        title: 'ลบเรียบร้อย',
        timer: 1200,
        showConfirmButton: false,
        toast: true,
        position: 'top-end',
      });
    }
  };

  const handleSaveAndDownload = async () => {
    try {
      setSavingDoc(true);
      const cleanedStudents = students.map((s) => {
        if (s.pending_task) {
          s.pending_task
            .split('\n')
            .map((x: string) => x.trim())
            .filter(Boolean)
            .forEach((x: string) => addToHistory(x));
        }
        return { ...s, class_level: cleanClassLevel(s.class_level) };
      });

      const payload = {
        teacher_name: teacherName,
        subject_code: selectedSubject,
        subject_name: subjectName,
        academic_year: academicYear || '2569',
        semester: semester || '1',
        students: cleanedStudents,
        webhookUrl: webAppUrl,
      };

      // Direct sync to Google Sheet if webAppUrl is provided
      if (webAppUrl && cleanedStudents.length > 0) {
        try {
          const gasItems = cleanedStudents.map((s) => ({
            special_id: `${selectedSubject}${s.student_id}`,
            specialId: `${selectedSubject}${s.student_id}`,
            academic_year: academicYear || '2569',
            year: academicYear || '2569',
            semester: semester || '1',
            term: semester || '1',
            year_term: `${academicYear || '2569'}/${semester || '1'}`,
            termStr: `${academicYear || '2569'}/${semester || '1'}`,
            subject_code: selectedSubject,
            subjCode: selectedSubject,
            subject_name: subjectName,
            subjName: subjectName,
            teacher_name: teacherName,
            teacherName: teacherName,
            class_level: s.class_level,
            classLevel: s.class_level,
            student_id: s.student_id,
            stuId: s.student_id,
            student_name: s.student_name,
            stuName: s.student_name,
            old_score: s.old_score,
            oldScore: s.old_score,
            old_grade: s.old_grade,
            oldGrade: s.old_grade,
            pending_task: s.pending_task,
            pendingTask: s.pending_task,
            remark: s.remark,
            updated_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
          }));
          fetch(webAppUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
              action: 'sync-wp16-sheet',
              spreadsheetId: '1OJh1FUnvLeIPGls4QIlture5f7GbAM0IieO8J5q9LuQ',
              sheetName: 'WP16_งานค้าง',
              items: gasItems,
            }),
          }).catch((err) => console.warn('Wp16Modal direct sync error:', err));
        } catch (e) {
          console.warn('Wp16Modal sync error:', e);
        }
      }

      const res = await fetch(`${backendUrl}/api/export/wp16/saved`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`เกิดข้อผิดพลาด (${res.status}): ${errText}`);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `WP16_${selectedSubject}_${teacherName}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      Swal.fire({
        icon: 'success',
        title: 'บันทึกและดาวน์โหลดสำเร็จ',
        html: `
          <div class="text-left text-sm space-y-2">
            <p>✅ ดาวน์โหลดเอกสาร วผ.16 วิชา <b>${selectedSubject}</b> เรียบร้อยแล้ว</p>
            <p class="text-xs text-indigo-700 bg-indigo-50 p-2.5 rounded-lg border border-indigo-200">
              📊 บันทึกข้อมูลงานค้างลงแผ่นงาน <a href="https://docs.google.com/spreadsheets/d/1OJh1FUnvLeIPGls4QIlture5f7GbAM0IieO8J5q9LuQ/edit?gid=1367227681#gid=1367227681" target="_blank" class="underline font-bold text-blue-600">WP16_งานค้าง</a> บน Google Sheet เรียบร้อยแล้ว
            </p>
          </div>
        `,
        confirmButtonColor: '#3b82f6',
      });
    } catch (err: any) {
      console.error(err);
      Swal.fire('ข้อผิดพลาด', err.message || 'ไม่สามารถดาวน์โหลดเอกสาร วผ.16 ได้', 'error');
    } finally {
      setSavingDoc(false);
    }
  };

  const handleDownloadZipAll = async () => {
    try {
      setZipping(true);
      Swal.fire({
        title: 'กำลังจัดทำ ZIP ทุกวิชา...',
        html: 'กรุณารอสักครู่ ระบบกำลังสร้างเอกสาร วผ.16 ครบทุกวิชา',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      const url = `${backendUrl}/api/export/wp16/zip?teacher_name=${encodeURIComponent(
        teacherName
      )}&academic_year=${encodeURIComponent(academicYear || '2568')}&semester=${encodeURIComponent(
        semester || '2'
      )}`;
      const res = await fetch(url);
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`เกิดข้อผิดพลาด (${res.status}): ${errText}`);
      }

      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `WP16_รวมทุกวิชา_${teacherName}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);

      Swal.fire({
        icon: 'success',
        title: 'ดาวน์โหลด ZIP สำเร็จ',
        text: 'ดาวน์โหลดเอกสาร วผ.16 ครบทุกรายวิชาเรียบร้อยแล้ว',
        confirmButtonColor: '#3b82f6',
      });
    } catch (err: any) {
      console.error(err);
      Swal.fire('ข้อผิดพลาด', err.message || 'ไม่สามารถดาวน์โหลด ZIP ได้', 'error');
    } finally {
      setZipping(false);
    }
  };

  const totalFailing = students.length;
  const assignedCount = students.filter(
    (e) => !!(e.pending_task && e.pending_task.trim() && e.pending_task !== 'สอบแก้ตัว')
  ).length;
  const completionPercent = totalFailing > 0 ? Math.round((assignedCount / totalFailing) * 100) : 0;

  const filteredStudents = students.filter((e) => {
    const isAssigned = !!(e.pending_task && e.pending_task.trim() && e.pending_task !== 'สอบแก้ตัว');
    if (filterStatus === 'unassigned' && isAssigned) return false;
    if (filterStatus === 'assigned' && !isAssigned) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase().trim();
      const nameMatch = (e.student_name || '').toLowerCase().includes(q);
      const idMatch = (e.student_id || '').toLowerCase().includes(q);
      const classMatch = cleanClassLevel(e.class_level).toLowerCase().includes(q);
      const taskMatch = (e.pending_task || '').toLowerCase().includes(q);
      if (!nameMatch && !idMatch && !classMatch && !taskMatch) return false;
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 px-5 py-3.5 sm:px-6 text-white flex items-center justify-between shadow-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-xl shadow-inner border border-white/10">
              📄
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg tracking-tight">
                  แบบรายงาน 0, ร, มส (วผ.16)
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[11px] font-bold">
                  ภาคเรียนที่ {semester}/{academicYear}
                </span>
              </div>
              <p className="text-xs text-slate-300 font-light flex items-center gap-1 mt-0.5">
                <span>ครูผู้สอน:</span>
                <span className="font-semibold text-white">{teacherName}</span>
                <span className="text-slate-400">•</span>
                <span className="text-amber-300 font-medium">
                  เด็กมีผล 0, ร, มส ในระบบ: {totalFailing} คน
                </span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {availableSubjects.length > 0 && (
              <button
                type="button"
                onClick={handleDownloadZipAll}
                disabled={zipping}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50 active:scale-95 border border-amber-400/30"
                title="ดาวน์โหลดไฟล์ Word วผ.16 รวมทุกวิชาที่ครูสอนเป็นไฟล์ ZIP"
              >
                {zipping ? (
                  <>
                    <span className="inline-block animate-spin">⏳</span>
                    <span>กำลังสร้าง ZIP...</span>
                  </>
                ) : (
                  <span>📦 ดาวน์โหลดรวมทุกวิชา (.zip)</span>
                )}
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer text-sm font-bold"
              title="ปิดหน้าต่าง"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Subjects Tab Bar */}
        {availableSubjects.length > 1 && (
          <div className="bg-slate-100 border-b border-slate-200 px-4 pt-2 flex gap-1.5 overflow-x-auto shrink-0 no-scrollbar">
            {availableSubjects.map((subj) => {
              const isActive = subj.subject_code === selectedSubject;
              const count = subjectCounts[subj.subject_code];
              return (
                <button
                  key={subj.subject_code}
                  type="button"
                  onClick={() => setSelectedSubject(subj.subject_code)}
                  className={`px-3.5 py-2 text-xs font-bold rounded-t-xl transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
                    isActive
                      ? 'bg-white text-slate-800 border-t-2 border-x border-slate-200 shadow-xs ring-1 ring-slate-900/5'
                      : 'bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <span
                    className={`font-mono px-1.5 py-0.5 rounded text-[11px] ${
                      isActive
                        ? 'bg-rose-50 text-rose-700 font-black'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {subj.subject_code}
                  </span>
                  <span className="font-normal text-xs text-slate-600 truncate max-w-[130px]">
                    {subj.subject_name}
                  </span>
                  {count !== undefined && (
                    <span
                      className={`px-1.5 py-0.5 text-[10px] rounded-full font-black ${
                        count > 0
                          ? isActive
                            ? 'bg-rose-500 text-white'
                            : 'bg-rose-100 text-rose-700 border border-rose-200'
                          : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      {count > 0 ? count : '✓ 0'}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Bulk Toolbar */}
        <div className="bg-slate-50/90 border-b border-slate-200 p-3 shrink-0 space-y-2">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1 flex items-center">
              <span className="absolute left-3 text-slate-400 text-xs pointer-events-none">💬</span>
              <input
                type="text"
                value={bulkTaskInput}
                onChange={(e) => setBulkTaskInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddBulkInput();
                }}
                placeholder="พิมพ์ใส่งานเป็นกลุ่มพร้อมกัน (หรือคลิกพิมพ์ที่แถวนักเรียนด้านล่างได้ทันที)..."
                className="w-full pl-8 pr-28 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition placeholder:text-slate-400 font-medium shadow-2xs"
              />
              <button
                type="button"
                onClick={handleAddBulkInput}
                disabled={!bulkTaskInput.trim()}
                className="absolute right-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-2xs disabled:opacity-40 cursor-pointer active:scale-95 flex items-center gap-1"
                title={
                  selectedStudentIds.size > 0
                    ? `ใส่ให้นักเรียนที่ติ๊กเลือก (${selectedStudentIds.size} คน)`
                    : 'ใส่ให้นักเรียนทุกคน'
                }
              >
                <span>
                  ➕{' '}
                  {selectedStudentIds.size > 0
                    ? `ใส่ให้ที่ติ๊ก (${selectedStudentIds.size})`
                    : 'ใส่ให้นักเรียน'}
                </span>
              </button>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 justify-between sm:justify-start">
              <div className="inline-flex rounded-xl p-0.5 bg-slate-200/80 border border-slate-300/60 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setAppendMode(true)}
                  className={`px-2.5 py-1 text-xs rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    appendMode
                      ? 'bg-white text-blue-700 shadow-2xs ring-1 ring-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="ใส่งานเพิ่มต่อท้ายงานเดิม (รองรับหลายงาน ไม่ลบงานเก่า)"
                >
                  <span>➕ ต่องานเดิม</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAppendMode(false)}
                  className={`px-2.5 py-1 text-xs rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    !appendMode
                      ? 'bg-white text-amber-700 shadow-2xs ring-1 ring-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="แทนที่ข้อความงานเดิมทั้งหมด"
                >
                  <span>🔄 แทนที่</span>
                </button>
              </div>

              <button
                type="button"
                onClick={clearSelectedTasks}
                disabled={selectedStudentIds.size === 0}
                className="px-2.5 py-1 text-xs rounded-xl font-semibold text-rose-600 bg-white hover:bg-rose-50 border border-rose-200 transition cursor-pointer flex items-center gap-1 shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                title="ล้างข้อความงานค้างของนักเรียนที่ติ๊กเลือกทั้งหมด"
              >
                <span>🗑️ ล้างที่ติ๊ก</span>
              </button>

              <div
                className="text-xs font-semibold px-2.5 py-1 bg-slate-200/60 text-slate-700 rounded-xl border border-slate-300/50 flex items-center gap-1"
                title="ติ๊กเลือกนักเรียนเมื่อต้องการใส่งานพร้อมกันหลายคน"
              >
                <span>ติ๊กเลือก</span>
                <span
                  className={`font-bold ${
                    selectedStudentIds.size > 0 ? 'text-blue-700' : 'text-slate-500'
                  }`}
                >
                  {selectedStudentIds.size}
                </span>
                /{students.length} คน
              </div>
            </div>
          </div>

          {/* Quick Tags & History */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-0.5">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs no-scrollbar flex-1">
              <span className="text-[10px] font-black text-slate-500 uppercase shrink-0 tracking-wider bg-slate-200/60 px-1.5 py-0.5 rounded">
                ด่วนกลุ่ม:
              </span>
              {QUICK_TAGS.map((tag, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => applyBulkTask(tag.text)}
                  className="whitespace-nowrap px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-medium transition shadow-2xs cursor-pointer flex items-center gap-1 active:scale-95 shrink-0"
                  title={
                    selectedStudentIds.size > 0
                      ? `ใส่ข้อความนี้ให้นักเรียนที่ติ๊กเลือก (${selectedStudentIds.size} คน)`
                      : 'ใส่ให้นักเรียนทุกคน'
                  }
                >
                  {tag.label}
                </button>
              ))}

              {taskHistory.length > 0 && <div className="h-4 w-px bg-slate-300 mx-1 shrink-0" />}

              {taskHistory.map((task, idx) => (
                <span
                  key={idx}
                  onClick={() => applyBulkTask(task)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-lg text-xs font-medium transition cursor-pointer shadow-2xs group active:scale-95 whitespace-nowrap shrink-0"
                  title={`คลิกเพื่อใส่ข้อความ: "${task}"`}
                >
                  <span className="text-[10px]">🕒</span>
                  <span className="max-w-[140px] truncate">{task}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFromHistory(task);
                    }}
                    className="text-blue-300 hover:text-rose-500 text-[10px] ml-0.5 opacity-60 group-hover:opacity-100 transition cursor-pointer"
                    title="ลบออกจากประวัติ"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>

            {totalFailing > 0 && (
              <div className="shrink-0 flex items-center">
                {assignedCount === totalFailing ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-300 font-bold flex items-center gap-1 text-[11px]">
                    <span>✅</span> สั่งงานครบแล้ว 100% ({assignedCount}/{totalFailing})
                  </span>
                ) : assignedCount > 0 ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-300 font-semibold flex items-center gap-1 text-[11px]">
                    <span>⏳</span> ระบุแล้ว {assignedCount}/{totalFailing} ({completionPercent}%)
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200 font-normal flex items-center gap-1 text-[11px]">
                    <span>⚠️</span> ยังไม่ระบุงาน (0/{totalFailing})
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 text-xs">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleSelectAll}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition cursor-pointer"
                title="เลือก/ยกเลิกทุกคน สำหรับทำรายการกลุ่ม"
              >
                {selectedStudentIds.size === students.length
                  ? 'ยกเลิกการเลือก'
                  : 'เลือกทั้งหมด (สำหรับกลุ่ม)'}
              </button>

              {totalFailing > 0 && (
                <div className="inline-flex rounded-lg p-0.5 bg-slate-100 border border-slate-200 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setFilterStatus('all')}
                    className={`px-2 py-0.5 rounded-md font-medium transition cursor-pointer ${
                      filterStatus === 'all'
                        ? 'bg-white text-slate-800 font-bold shadow-2xs'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    ทั้งหมด ({totalFailing})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterStatus('unassigned')}
                    className={`px-2 py-0.5 rounded-md font-medium transition cursor-pointer flex items-center gap-1 ${
                      filterStatus === 'unassigned'
                        ? 'bg-amber-500 text-white font-bold shadow-2xs'
                        : 'text-amber-700 hover:bg-amber-50'
                    }`}
                  >
                    <span>⚠️ ยังไม่ระบุ</span> ({totalFailing - assignedCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterStatus('assigned')}
                    className={`px-2 py-0.5 rounded-md font-medium transition cursor-pointer flex items-center gap-1 ${
                      filterStatus === 'assigned'
                        ? 'bg-emerald-600 text-white font-bold shadow-2xs'
                        : 'text-emerald-700 hover:bg-emerald-50'
                    }`}
                  >
                    <span>✅ ระบุแล้ว</span> ({assignedCount})
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={handleOpenAddModal}
                className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl transition shadow-2xs cursor-pointer flex items-center gap-1.5 active:scale-95 text-xs shrink-0"
                title="เพิ่มนักเรียนกรณีตกหล่น หรือมีกรณีพิเศษ"
              >
                <span>➕ เพิ่มนักเรียน</span>
              </button>

              {students.length > 5 && (
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ค้นหาชื่อ, รหัส, ห้อง..."
                    className="px-2.5 py-1.5 pl-6 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:border-blue-500 focus:bg-white outline-none w-44 transition"
                  />
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-[11px]">
                    🔍
                  </span>
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {!loading && students.length > 0 && (
            <div className="mb-2.5 px-3 py-1.5 bg-blue-50/70 border border-blue-200/60 rounded-xl text-xs text-blue-900 flex items-center justify-between gap-2 shadow-2xs">
              <div className="flex items-center gap-1.5 font-medium">
                <span className="text-sm">💡</span>
                <span>
                  <b>พิมพ์ได้ทันที:</b> เอาเมาส์คลิกพิมพ์ที่ช่องงานของนักเรียน หรือกดปุ่มด่วน (
                  <span className="text-blue-700 font-bold">📝 ปลายภาค</span> /{' '}
                  <span className="text-blue-700 font-bold">กลางภาค</span> /{' '}
                  <span className="text-purple-700 font-bold">มส</span>) ในแถวได้เลย{' '}
                  <u>โดยไม่ต้องติ๊กช่องข้างหน้า</u>
                </span>
              </div>
              {selectedStudentIds.size > 0 && (
                <span className="text-[11px] font-bold text-blue-600 bg-white px-2 py-0.5 rounded-lg border border-blue-200 shrink-0">
                  ติ๊กกลุ่มไว้ {selectedStudentIds.size} คน
                </span>
              )}
            </div>
          )}

          {loading ? (
            <div className="py-16 text-center text-slate-400">
              <div className="animate-spin text-3xl mb-2">⏳</div>
              <p className="text-sm font-medium">
                กำลังโหลดรายชื่อนักเรียนที่มีผลการเรียน 0, ร, มส ในวิชา {selectedSubject}...
              </p>
            </div>
          ) : students.length === 0 ? (
            <div className="py-16 text-center text-emerald-600 bg-emerald-50/50 rounded-2xl border border-emerald-100">
              <div className="text-4xl mb-2">🎉</div>
              <h4 className="font-bold text-base text-emerald-800">
                ไม่มีนักเรียนติด 0, ร, มส ในวิชา {selectedSubject}
              </h4>
              <p className="text-xs text-emerald-600 mt-1">
                นักเรียนทุกคนได้ผลการเรียนผ่านเกณฑ์ทั้งหมด
              </p>
              <button
                type="button"
                onClick={handleOpenAddModal}
                className="mt-4 px-4 py-2 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 rounded-xl text-xs font-bold transition shadow-xs inline-flex items-center gap-1.5 cursor-pointer active:scale-95 mx-auto"
              >
                <span>➕ เพิ่มนักเรียนกรณีพิเศษ (ถ้ามี)</span>
              </button>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="py-12 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-xs">ไม่พบนักเรียนตามเงื่อนไขการค้นหาหรือตัวกรอง</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setFilterStatus('all');
                }}
                className="mt-2 text-xs text-blue-600 hover:underline font-bold"
              >
                ล้างตัวกรองทั้งหมด
              </button>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-2 py-2.5 text-center w-12" title="ติ๊กเฉพาะเมื่อต้องการใส่งานพร้อมกันหลายคน">
                      <div className="flex flex-col items-center">
                        <input
                          type="checkbox"
                          checked={selectedStudentIds.size === students.length && students.length > 0}
                          onChange={toggleSelectAll}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          title="เลือก/ยกเลิกทุกคน (สำหรับใส่งานกลุ่ม)"
                        />
                        <span className="text-[9px] text-slate-400 font-normal mt-0.5 whitespace-nowrap">
                          กลุ่ม
                        </span>
                      </div>
                    </th>
                    <th className="px-3 py-2.5 text-center w-16">ชั้น</th>
                    <th className="px-3 py-2.5 w-20">รหัส</th>
                    <th className="px-3 py-2.5 min-w-[140px]">ชื่อ-สกุล</th>
                    <th className="px-3 py-2.5 text-center w-14">คะแนน</th>
                    <th className="px-3 py-2.5 text-center w-14">ผลเดิม</th>
                    <th className="px-4 py-2.5">
                      งานที่ไม่ส่ง / ภาระงานที่มอบหมาย (คลิกพิมพ์ได้เลย หรือกดปุ่มด่วนประจำแถว)
                    </th>
                    <th className="px-2 py-2.5 text-center w-12">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredStudents.map((stu) => {
                    const isChecked = selectedStudentIds.has(stu.student_id);
                    const taskLines = (stu.pending_task || '').split('\n').filter(Boolean).length;
                    const cLevel = cleanClassLevel(stu.class_level);
                    return (
                      <tr
                        key={stu.student_id}
                        className={`hover:bg-blue-50/20 transition-colors ${
                          isChecked ? 'bg-blue-50/40' : ''
                        }`}
                      >
                        <td className="px-2 py-2.5 text-center">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelectStudent(stu.student_id)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            title="ติ๊กเฉพาะเมื่อต้องการใส่งานพร้อมกันหลายคน"
                          />
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono text-xs font-semibold">
                            {cLevel || '-'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 font-mono text-xs text-slate-600">
                          {stu.student_id}
                        </td>
                        <td className="px-3 py-2.5 font-medium text-slate-800 text-xs md:text-sm">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span>{stu.student_name}</span>
                            {stu.is_manual && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200 shrink-0">
                                เพิ่มเอง
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-center font-mono font-bold text-slate-700 text-xs">
                          {stu.old_score || '-'}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-black shadow-2xs ${
                              stu.old_grade === '0'
                                ? 'bg-rose-100 text-rose-700 border border-rose-200'
                                : stu.old_grade === 'ร'
                                ? 'bg-amber-100 text-amber-700 border border-amber-200'
                                : stu.old_grade === 'มส'
                                ? 'bg-purple-100 text-purple-700 border border-purple-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {stu.old_grade}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <div className="space-y-1.5">
                            <div className="relative group/task">
                              <textarea
                                rows={Math.min(4, Math.max(1, (stu.pending_task || '').split('\n').length))}
                                value={stu.pending_task || ''}
                                onChange={(e) => updateStudentTask(stu.student_id, e.target.value)}
                                onBlur={(e) => handleBlurTask(e.target.value)}
                                placeholder="คลิกพิมพ์งานค้างได้เลย (Enter เพื่อเพิ่มหลายงาน)..."
                                className="w-full px-3 py-1.5 pr-8 text-xs rounded-xl border border-slate-300 hover:border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition placeholder:text-slate-400 font-medium resize-y leading-relaxed min-h-[36px] bg-white shadow-2xs"
                              />
                              {stu.pending_task && (
                                <button
                                  type="button"
                                  onClick={() => clearSingleTask(stu.student_id)}
                                  className="absolute right-2 top-2 w-5 h-5 rounded hover:bg-rose-100 text-slate-400 hover:text-rose-600 flex items-center justify-center text-[10px] transition cursor-pointer"
                                  title="ล้างงานของนักเรียนคนนี้"
                                >
                                  ✕
                                </button>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-1 text-[10px]">
                              <span className="text-[10px] text-slate-400 font-semibold mr-0.5">
                                ด่วน:
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  quickSetTask(
                                    stu.student_id,
                                    'ขาดสอบปลายภาค (ติดต่อสอบแก้ตัวข้อเขียน)'
                                  )
                                }
                                className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 text-slate-600 border border-slate-200 transition cursor-pointer font-medium active:scale-95"
                                title="ใส่: ขาดสอบปลายภาค (ไม่ต้องติ๊กข้างหน้า)"
                              >
                                📝 ปลายภาค
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  quickSetTask(
                                    stu.student_id,
                                    'ขาดสอบกลางภาค (ติดต่อสอบแก้ตัวข้อเขียน)'
                                  )
                                }
                                className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 text-slate-600 border border-slate-200 transition cursor-pointer font-medium active:scale-95"
                                title="ใส่: ขาดสอบกลางภาค (ไม่ต้องติ๊กข้างหน้า)"
                              >
                                📝 กลางภาค
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  quickSetTask(
                                    stu.student_id,
                                    'เวลาเรียนไม่ครบ 80% (ทำชดเชยเวลาเรียน)'
                                  )
                                }
                                className="px-2 py-0.5 rounded-lg bg-purple-50 hover:bg-purple-100 hover:text-purple-800 text-purple-700 border border-purple-200 transition cursor-pointer font-medium active:scale-95"
                                title="ใส่: มส เวลาเรียนไม่ครบ 80% (ไม่ต้องติ๊กข้างหน้า)"
                              >
                                ⏳ มส 80%
                              </button>

                              {taskLines > 1 && (
                                <span className="px-1.5 py-0.5 bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-bold rounded shadow-2xs pointer-events-none">
                                  {taskLines} งาน
                                </span>
                              )}

                              {stu.pending_task && selectedStudentIds.size > 0 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    copyTaskToSelected(stu.pending_task, stu.student_name)
                                  }
                                  className="ml-auto px-2 py-0.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition cursor-pointer font-bold flex items-center gap-1 active:scale-95"
                                  title={`คัดลอกงานของ ${stu.student_name} ไปใส่ให้นักเรียนที่ติ๊กเลือก (${selectedStudentIds.size} คน)`}
                                >
                                  📋 ก๊อปปี้ไปคนที่ติ๊ก ({selectedStudentIds.size})
                                </button>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-2 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteStudent(stu.student_id, stu.student_name)}
                            className="w-7 h-7 mx-auto rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition cursor-pointer text-xs"
                            title={`ลบ ${stu.student_name} ออกจากรายการ วผ.16`}
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 font-medium flex items-center gap-2">
            <span>
              วิชา: <b className="text-slate-800">{selectedSubject} {subjectName}</b>
            </span>
            <span>•</span>
            <span>
              นักเรียนทั้งหมด: <b className="text-slate-800">{totalFailing} คน</b>
            </span>
            <span>•</span>
            <span>
              ระบุงานแล้ว: <b className="text-emerald-700">{assignedCount} คน</b>
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/70 rounded-xl transition cursor-pointer"
            >
              ปิด
            </button>
            <button
              type="button"
              onClick={handleSaveAndDownload}
              disabled={savingDoc || loading || students.length === 0}
              className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs sm:text-sm font-bold transition shadow-md hover:shadow-lg disabled:opacity-40 cursor-pointer flex items-center gap-1.5 active:scale-95"
            >
              {savingDoc ? (
                <>
                  <span className="inline-block animate-spin">⏳</span>
                  <span>กำลังบันทึกและสร้างเอกสาร...</span>
                </>
              ) : (
                <span>💾 บันทึก & ดาวน์โหลด วผ.16 (.docx)</span>
              )}
            </button>
          </div>
        </div>

        {/* Modal เพิ่มนักเรียนกรณีพิเศษ/ตกหล่น */}
        {showAddModal && (
          <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3.5 flex items-center justify-between text-white">
                <div className="flex items-center gap-2">
                  <span className="text-base">➕</span>
                  <h3 className="font-bold text-sm">เพิ่มนักเรียนใน วผ.16 (กรณีพิเศษ / ตกหล่น)</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="text-white/70 hover:text-white text-base font-bold transition cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="p-5 space-y-3.5 text-xs text-slate-700">
                <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-2.5 text-blue-900 text-[11px] leading-relaxed">
                  💡 <b>บัฟเฟอร์กันตกหล่น:</b> หากมีนักเรียนที่ผลการเรียนใน SGS ยังไม่สะท้อน หรือมีกรณีพิเศษ คุณครูสามารถเพิ่มชื่อเข้าเอกสาร วผ.16 วิชา <b>{selectedSubject}</b> ได้ทันที
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      เลขประจำตัว <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newStudentId}
                      onChange={(e) => setNewStudentId(e.target.value)}
                      placeholder="เช่น 18248"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none font-mono font-medium"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">ระดับชั้น / ห้อง</label>
                    <input
                      type="text"
                      value={newClassLevel}
                      onChange={(e) => setNewClassLevel(e.target.value)}
                      placeholder="เช่น ม.4/1"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    ชื่อ - นามสกุล <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="เช่น เด็กชายสมคิด รักเรียน"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      ผลการเรียนเดิม <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={newOldGrade}
                      onChange={(e) => setNewOldGrade(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none font-bold bg-white"
                    >
                      <option value="0">0 (ศูนย์)</option>
                      <option value="ร">ร (รอการตัดสิน)</option>
                      <option value="มส">มส (หมดสิทธิ์สอบ)</option>
                      <option value="มผ">มผ (ไม่ผ่าน)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">คะแนนเดิม</label>
                    <input
                      type="text"
                      value={newOldScore}
                      onChange={(e) => setNewOldScore(e.target.value)}
                      placeholder="เช่น 45 หรือ ขาดสอบ"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">งานค้าง / ภาระงานที่มอบหมาย</label>
                  <textarea
                    rows={2}
                    value={newTask}
                    onChange={(e) => setNewTask(e.target.value)}
                    placeholder="ระบุงานค้าง หรือคลิกเลือกปุ่มด่วนด้านล่าง..."
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none font-medium resize-none leading-relaxed"
                  />
                  <div className="flex flex-wrap gap-1 mt-1">
                    <button
                      type="button"
                      onClick={() => setNewTask('ขาดสอบปลายภาค (ติดต่อสอบแก้ตัวข้อเขียน)')}
                      className="px-2 py-0.5 rounded bg-slate-100 hover:bg-blue-50 text-slate-600 border border-slate-200 text-[10px] font-medium cursor-pointer"
                    >
                      📝 ปลายภาค
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewTask('ขาดสอบกลางภาค (ติดต่อสอบแก้ตัวข้อเขียน)')}
                      className="px-2 py-0.5 rounded bg-slate-100 hover:bg-blue-50 text-slate-600 border border-slate-200 text-[10px] font-medium cursor-pointer"
                    >
                      📝 กลางภาค
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewTask('เวลาเรียนไม่ครบ 80% (ทำชดเชยเวลาเรียน)')}
                      className="px-2 py-0.5 rounded bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-[10px] font-medium cursor-pointer"
                    >
                      ⏳ มส 80%
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/70 rounded-xl transition cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleSaveNewStudent}
                  className="px-5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-md active:scale-95 cursor-pointer"
                >
                  บันทึกเพิ่มนักเรียน
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
