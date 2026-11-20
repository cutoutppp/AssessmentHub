(function () {
  const WP29 = window.WP29;
  const RAW_COURSES = window.COURSES_2_2569 || {};
  const SYNC_SNAPSHOT = window.ASSESSMENT_PLAN_SYNC || {};
  const TEACHER_MAP = window.TEACHER_CODE_MAP || {};
  const TEACHERS_BY_AREA = window.SCHOOL_TEACHERS_BY_AREA || {};
  const SGS_STORAGE_KEY = 'sgs_confirmations_2_2569_v1';

  function loadSgsCache() {
    try {
      const raw = window.localStorage ? window.localStorage.getItem(SGS_STORAGE_KEY) : null;
      if (raw) return JSON.parse(raw) || {};
    } catch (_) {
      // Ignore
    }
    return {};
  }

  function buildMergedCourses() {
    const localEdits = loadSgsCache();
    const combined = { ...SYNC_SNAPSHOT };
    for (const [code, ov] of Object.entries(localEdits)) {
      combined[code] = combined[code] ? { ...combined[code], ...ov } : ov;
    }
    return WP29.mergeAssessmentPlanOverrides(RAW_COURSES, combined);
  }

  const COURSES = buildMergedCourses();
  const LAST_KEY = 'wp29:__last__';

  function storageKey(courseCode, examType) {
    return `wp29:${courseCode}:${examType}`;
  }

  function safeGetItem(key) {
    try {
      return window.localStorage ? window.localStorage.getItem(key) : null;
    } catch (_) {
      return null;
    }
  }

  function safeSetItem(key, value) {
    try {
      if (window.localStorage) {
        window.localStorage.setItem(key, value);
        return true;
      }
    } catch (_) {
      // Ignore storage errors
    }
    return false;
  }

  function safeRemoveItem(key) {
    try {
      if (window.localStorage) window.localStorage.removeItem(key);
    } catch (_) {
      // Ignore
    }
  }

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Application state
  let currentCourse = null;
  let currentDraft = null;
  let teacherManuallyEdited = false;
  let validateTimer = null;
  let pendingDownload = false;

  // DOM refs
  const els = {
    openAssessmentPlanLink: document.getElementById('openAssessmentPlanLink'),
    firebaseSyncBadge: document.getElementById('firebaseSyncBadge'),
    filterAreaSelect: document.getElementById('filterAreaSelect'),
    filterTeacherSelect: document.getElementById('filterTeacherSelect'),
    filterCourseSelect: document.getElementById('filterCourseSelect'),
    filteredCourseCountBadge: document.getElementById('filteredCourseCountBadge'),
    resetFiltersBtn: document.getElementById('resetFiltersBtn'),
    courseSearchInput: document.getElementById('courseSearchInput'),
    clearCourseSearchBtn: document.getElementById('clearCourseSearchBtn'),
    courseDropdown: document.getElementById('courseDropdown'),
    courseCountHint: document.getElementById('courseCountHint'),
    examMidBtn: document.getElementById('examMidBtn'),
    examFinalBtn: document.getElementById('examFinalBtn'),
    teacherNameInput: document.getElementById('teacherNameInput'),
    teacherSuggestions: document.getElementById('teacherSuggestions'),
    selectedCourseBox: document.getElementById('selectedCourseBox'),
    noCourseNotice: document.getElementById('noCourseNotice'),
    metaCourseTitle: document.getElementById('metaCourseTitle'),
    metaGradeScore: document.getElementById('metaGradeScore'),
    metaPlanExtra: document.getElementById('metaPlanExtra'),
    learningAreaInput: document.getElementById('learningAreaInput'),
    termInput: document.getElementById('termInput'),
    yearInput: document.getElementById('yearInput'),
    courseTeachersBar: document.getElementById('courseTeachersBar'),
    courseTeacherChips: document.getElementById('courseTeacherChips'),
    cutoffWarningBanner: document.getElementById('cutoffWarningBanner'),
    courseStructureMeta: document.getElementById('courseStructureMeta'),
    courseStructureUnits: document.getElementById('courseStructureUnits'),
    populateFromStructureBtn: document.getElementById('populateFromStructureBtn'),
    coursePlanDeepLink: document.getElementById('coursePlanDeepLink'),
    standardTextInput: document.getElementById('standardTextInput'),
    indicatorTextInput: document.getElementById('indicatorTextInput'),
    objCountInput: document.getElementById('objCountInput'),
    objEachInput: document.getElementById('objEachInput'),
    objSummaryBadge: document.getElementById('objSummaryBadge'),
    ratioGuideBox: document.getElementById('ratioGuideBox'),
    subjCountInput: document.getElementById('subjCountInput'),
    subjPointsContainer: document.getElementById('subjPointsContainer'),
    subjSummaryBadge: document.getElementById('subjSummaryBadge'),
    liveSummaryBar: document.getElementById('liveSummaryBar'),
    addRowBtn: document.getElementById('addRowBtn'),
    missingItemsBar: document.getElementById('missingItemsBar'),
    rowsContainer: document.getElementById('rowsContainer'),
    tableFooterTotals: document.getElementById('tableFooterTotals'),
    validatorBadge: document.getElementById('validatorBadge'),
    validatorList: document.getElementById('validatorList'),
    saveStatusBadge: document.getElementById('saveStatusBadge'),
    clearDraftBtn: document.getElementById('clearDraftBtn'),
    downloadDocxBtn: document.getElementById('downloadDocxBtn'),
    confirmModal: document.getElementById('confirmModal'),
    confirmModalMsg: document.getElementById('confirmModalMsg'),
    confirmCancelBtn: document.getElementById('confirmCancelBtn'),
    confirmProceedBtn: document.getElementById('confirmProceedBtn'),
  };

  function findTeacherCode(name) {
    const clean = String(name || '').trim();
    if (!clean) return null;
    for (const [code, info] of Object.entries(TEACHER_MAP)) {
      if (info && info.name === clean) return code;
    }
    return null;
  }

  function findTeacherArea(name) {
    const clean = String(name || '').trim();
    if (!clean) return '';
    for (const info of Object.values(TEACHER_MAP)) {
      if (info && info.name === clean && info.dept) return info.dept;
    }
    for (const [area, list] of Object.entries(TEACHERS_BY_AREA)) {
      if (Array.isArray(list) && list.includes(clean)) return area;
    }
    for (const c of Object.values(COURSES)) {
      if (WP29.validCourseTeachers(c).includes(clean)) return c.learning_area || '';
    }
    return '';
  }

  function buildAssessmentPlanHref(course, teacherName) {
    const base = '../assessment-plan/index.html';
    if (course && course.course_code) {
      return `${base}?code=${encodeURIComponent(course.course_code)}`;
    }
    if (teacherName) {
      const code = findTeacherCode(teacherName);
      if (code) return `${base}?teachcode=${encodeURIComponent(code)}`;
      return `${base}?teacher=${encodeURIComponent(teacherName)}`;
    }
    return base;
  }

  function updateAssessmentPlanLinks() {
    const teacher = els.filterTeacherSelect.value || (currentDraft ? currentDraft.teacher_name : '');
    const href = buildAssessmentPlanHref(currentCourse, teacher);
    if (els.openAssessmentPlanLink) els.openAssessmentPlanLink.href = href;
    if (els.coursePlanDeepLink) els.coursePlanDeepLink.href = href;
  }

  function populateAreaDropdown() {
    const areas = new Set();
    for (const c of Object.values(COURSES)) {
      if (c && c.is_scheduled_term2 && c.learning_area) areas.add(c.learning_area);
    }
    const sorted = Array.from(areas).sort((a, b) => a.localeCompare(b, 'th'));
    els.filterAreaSelect.innerHTML =
      '<option value="">-- ทุกกลุ่มสาระการเรียนรู้ --</option>' +
      sorted.map(a => `<option value="${escapeHtml(a)}">${escapeHtml(a)}</option>`).join('');
  }

  function populateTeacherDropdown(selectedArea) {
    const prevVal = els.filterTeacherSelect.value;
    const teacherSet = new Set();

    if (selectedArea) {
      for (const info of Object.values(TEACHER_MAP)) {
        if (info && info.dept === selectedArea && info.name) teacherSet.add(info.name);
      }
      if (Array.isArray(TEACHERS_BY_AREA[selectedArea])) {
        for (const t of TEACHERS_BY_AREA[selectedArea]) teacherSet.add(t);
      }
      for (const c of Object.values(COURSES)) {
        if (c && c.learning_area === selectedArea) {
          for (const t of WP29.validCourseTeachers(c)) teacherSet.add(t);
        }
      }
    } else {
      for (const info of Object.values(TEACHER_MAP)) {
        if (info && info.name) teacherSet.add(info.name);
      }
      for (const list of Object.values(TEACHERS_BY_AREA)) {
        if (Array.isArray(list)) list.forEach(t => teacherSet.add(t));
      }
      for (const c of Object.values(COURSES)) {
        for (const t of WP29.validCourseTeachers(c)) teacherSet.add(t);
      }
    }

    const sorted = Array.from(teacherSet).filter(Boolean).sort((a, b) => a.localeCompare(b, 'th'));
    els.filterTeacherSelect.innerHTML =
      '<option value="">-- ครูผู้สอนทุกคน --</option>' +
      sorted.map(name => {
        const code = findTeacherCode(name);
        const label = code ? `[${code}] ${name}` : name;
        return `<option value="${escapeHtml(name)}">${escapeHtml(label)}</option>`;
      }).join('');

    if (prevVal && teacherSet.has(prevVal)) {
      els.filterTeacherSelect.value = prevVal;
    }
  }

  function updateFilteredCourseDropdown() {
    const area = els.filterAreaSelect.value;
    const teacher = els.filterTeacherSelect.value;
    const list = WP29.filterCourses(COURSES, {
      learningArea: area,
      teacherName: teacher,
      onlyTerm2: true,
    }).sort((a, b) => String(a.course_code || '').localeCompare(String(b.course_code || ''), 'th'));

    els.filteredCourseCountBadge.textContent = `${list.length} วิชา`;
    const curCode = currentCourse ? currentCourse.course_code : '';

    els.filterCourseSelect.innerHTML =
      `<option value="">-- เลือกรายวิชา (${list.length} วิชา) --</option>` +
      list.map(c => {
        const selected = c.course_code === curCode ? 'selected' : '';
        const mid = WP29.getCourseExamTotal(c, 'MID');
        const fin = WP29.getCourseExamTotal(c, 'FINAL');
        const scorePart = (mid != null || fin != null)
          ? ` · กลาง ${mid != null ? WP29.formatNumber(mid) : '-'} / ปลาย ${fin != null ? WP29.formatNumber(fin) : '-'}`
          : '';
        return `<option value="${escapeHtml(c.course_code)}" ${selected}>${escapeHtml(c.course_code)} — ${escapeHtml(c.course_name)} (${escapeHtml(c.grade_level || '-')}${escapeHtml(scorePart)})</option>`;
      }).join('');

    updateAssessmentPlanLinks();
    return list;
  }

  function populateTeacherSuggestions(course) {
    const names = new Set();
    for (const t of WP29.validCourseTeachers(course)) names.add(t);
    for (const entry of Object.values(TEACHER_MAP)) {
      if (entry && entry.name) names.add(String(entry.name).trim());
    }
    els.teacherSuggestions.innerHTML = Array.from(names)
      .map(n => `<option value="${escapeHtml(n)}">`)
      .join('');
  }

  function saveDraft() {
    if (!currentDraft || !currentDraft.course_code) return;
    currentDraft.updated_at = new Date().toISOString();
    const ok = safeSetItem(
      storageKey(currentDraft.course_code, currentDraft.exam_type),
      JSON.stringify(currentDraft)
    );
    safeSetItem(
      LAST_KEY,
      JSON.stringify({
        course_code: currentDraft.course_code,
        exam_type: currentDraft.exam_type,
      })
    );
    els.saveStatusBadge.textContent = ok
      ? `บันทึกอัตโนมัติ ${new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
      : 'โหมดไม่บันทึกถาวร (localStorage ปิดอยู่)';
  }

  function buildStructureRows(course, examType) {
    if (!course) return [WP29.createEmptyRow()];
    const units = WP29.unitsInRange(course, examType);
    if (units.length === 0) return [WP29.createEmptyRow()];

    const newRows = [];
    for (const u of units) {
      const resolved = WP29.resolveUnitIndicators(course, u);
      if (resolved.indicators.length > 0) {
        for (const ind of resolved.indicators) {
          newRows.push(WP29.createEmptyRow({
            unit_no: u.unit_no,
            unit_name: u.unit_name,
            indicator: ind,
            bloom: 2,
          }));
        }
      } else {
        newRows.push(WP29.createEmptyRow({
          unit_no: u.unit_no,
          unit_name: u.unit_name,
          indicator: '',
          bloom: 2,
        }));
      }
    }
    return newRows.length > 0 ? newRows : [WP29.createEmptyRow()];
  }

  function loadDraft(course, examType) {
    if (!course) return WP29.createDefaultDraft(null, examType);
    const raw = safeGetItem(storageKey(course.course_code, examType));
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && Array.isArray(parsed.rows)) {
          return normalizeDraftShape(parsed, course, examType);
        }
      } catch (_) {
        // Fallback to default
      }
    }
    const fresh = WP29.createDefaultDraft(course, examType);
    const targetTotal = WP29.getCourseExamTotal(course, examType);
    const presets = targetTotal ? WP29.suggestRatioPresets(targetTotal) : [];
    if (presets.length > 0) {
      fresh.objective = { ...presets[0].objective };
      fresh.subjective = { count: presets[0].subjective.count, points: [...presets[0].subjective.points] };
    }
    fresh.rows = buildStructureRows(course, examType);
    return fresh;
  }

  function normalizeDraftShape(raw, course, examType) {
    const base = WP29.createDefaultDraft(course, examType || raw.exam_type || 'MID');
    const subjCount = Math.max(0, Math.floor(Number(raw.subjective?.count ?? base.subjective.count) || 0));
    const rawPts = Array.isArray(raw.subjective?.points) ? raw.subjective.points : [];
    const points = [];
    for (let i = 0; i < subjCount; i++) {
      const val = Number(rawPts[i]);
      points.push(Number.isFinite(val) && val > 0 ? val : 3);
    }

    return {
      ...base,
      ...raw,
      v: 1,
      course_code: course ? course.course_code : (raw.course_code || ''),
      exam_type: String(examType || raw.exam_type || 'MID').toUpperCase() === 'FINAL' ? 'FINAL' : 'MID',
      learning_area: raw.learning_area ?? base.learning_area,
      objective: {
        count: Math.max(0, Math.floor(Number(raw.objective?.count ?? base.objective.count) || 0)),
        points_each: Number(raw.objective?.points_each ?? base.objective.points_each) || 0,
      },
      subjective: {
        count: subjCount,
        points,
      },
      rows: Array.isArray(raw.rows) && raw.rows.length > 0
        ? raw.rows.map(r => WP29.createEmptyRow(r))
        : [WP29.createEmptyRow()],
    };
  }

  function renderCourseDropdown(query) {
    const results = WP29.filterCourses(COURSES, {
      query,
      learningArea: els.filterAreaSelect.value,
      teacherName: els.filterTeacherSelect.value,
      onlyTerm2: true,
    });
    if (results.length === 0) {
      els.courseDropdown.innerHTML = '<div class="px-3.5 py-3 text-xs text-slate-500">ไม่พบรายวิชาที่ตรงกับตัวกรองในภาคเรียนที่ 2</div>';
      els.courseDropdown.classList.remove('hidden');
      return;
    }
    const maxItems = 60;
    els.courseDropdown.innerHTML = results
      .slice(0, maxItems)
      .map(c => {
        const hasUnitInd = WP29.courseHasUnitIndicators(c);
        const teachers = WP29.validCourseTeachers(c);
        const teacherLabel = teachers.length > 0 ? ` · ครู: ${teachers.join(', ')}` : '';
        return `
          <button type="button" data-code="${escapeHtml(c.course_code)}"
            class="w-full text-left px-3.5 py-2.5 hover:bg-blue-50 transition-colors flex items-center justify-between gap-2">
            <div class="min-w-0">
              <div class="text-sm font-bold text-slate-900 truncate">
                ${escapeHtml(c.course_code)} — ${escapeHtml(c.course_name)}
              </div>
              <div class="text-xs text-slate-500 truncate">
                ${escapeHtml(c.learning_area || '')} · ${escapeHtml(c.grade_level || '')} · กลางภาค ${c.mid_exam ?? '-'} / ปลายภาค ${c.fin_exam ?? '-'}${escapeHtml(teacherLabel)}
              </div>
            </div>
            <span class="shrink-0 text-[11px] px-2 py-0.5 rounded-full ${hasUnitInd ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}">
              ${hasUnitInd ? 'ผูกหน่วยแล้ว' : 'รวมทั้งวิชา'}
            </span>
          </button>`;
      })
      .join('');
    els.courseDropdown.classList.remove('hidden');
  }

  function selectCourse(course, examTypeOverride, teacherOverride) {
    currentCourse = course;
    const examType = examTypeOverride || (currentDraft ? currentDraft.exam_type : 'MID');
    currentDraft = loadDraft(course, examType);
    teacherManuallyEdited = Boolean(String(currentDraft.teacher_name || '').trim());

    // Link teacher name from filter or from course's confirmed_by / assessment-plan teachers when blank
    const preferredTeacher = teacherOverride || els.filterTeacherSelect.value;
    if (preferredTeacher && !String(currentDraft.teacher_name || '').trim()) {
      currentDraft.teacher_name = preferredTeacher;
    } else if (course && !String(currentDraft.teacher_name || '').trim()) {
      const confirmedBy = !WP29.isPlaceholderTeacher(course.confirmed_by) ? String(course.confirmed_by).trim() : '';
      const courseTeachers = WP29.validCourseTeachers(course);
      if (confirmedBy) {
        currentDraft.teacher_name = confirmedBy;
      } else if (courseTeachers.length > 0) {
        currentDraft.teacher_name = courseTeachers[0];
      }
    }

    if (course) {
      els.courseSearchInput.value = `${course.course_code} ${course.course_name}`;
      els.clearCourseSearchBtn.classList.remove('hidden');
      if (els.filterCourseSelect.querySelector(`option[value="${CSS.escape(course.course_code)}"]`)) {
        els.filterCourseSelect.value = course.course_code;
      }
    }
    els.courseDropdown.classList.add('hidden');
    populateTeacherSuggestions(course);
    updateAssessmentPlanLinks();
    renderAll();
    saveDraft();
  }

  function renderCourseStructurePreview() {
    if (!currentCourse) return;
    const units = WP29.unitsInRange(currentCourse, currentDraft.exam_type);
    const allUnits = Array.isArray(currentCourse.units) ? currentCourse.units : [];
    const cutoff = currentCourse.midterm_cutoff;
    const examLabel = currentDraft.exam_type === 'FINAL' ? 'ปลายภาค' : 'กลางภาค';

    els.courseStructureMeta.textContent =
      `ทั้งหมด ${allUnits.length} หน่วย · ช่วง${examLabel}: ${units.length} หน่วย` +
      (cutoff ? ` (ตัดกลางภาคที่หน่วย ${cutoff})` : '');

    if (units.length === 0) {
      els.courseStructureUnits.innerHTML =
        '<div class="col-span-full text-slate-500">ไม่พบหน่วยการเรียนรู้ในช่วงสอบนี้</div>';
      return;
    }

    els.courseStructureUnits.innerHTML = units.map(u => {
      const resolved = WP29.resolveUnitIndicators(currentCourse, u);
      const labels = resolved.indicators.map(ind => WP29.indicatorShortLabel(ind)).join(', ');
      let indInfo = 'ยังไม่มีตัวชี้วัดผูกกับหน่วย';
      if (resolved.source === 'unit') {
        indInfo = `ตัวชี้วัดที่ผูก: ${labels}`;
      } else if (resolved.source === 'plan_nos') {
        indInfo = `ผูกจากแผนวัดผล: ${labels}`;
      } else if (resolved.source === 'suggested') {
        indInfo = `แนะนำตามหน่วย: ${labels}`;
      }
      return `
        <div class="rounded-lg border border-slate-200 bg-slate-50/70 p-2 space-y-0.5">
          <div class="font-bold text-slate-900 truncate">หน่วยที่ ${escapeHtml(u.unit_no)}: ${escapeHtml(u.unit_name || '-')}</div>
          <div class="text-[11px] text-slate-600">
            ${u.hours ?? '-'} ชม. · คะแนนเก็บ ${u.score_total ?? '-'} (K ${u.score_k ?? '-'} / P ${u.score_p ?? '-'} / A ${u.score_a ?? '-'})
          </div>
          <div class="text-[11px] font-medium ${resolved.source === 'unit' || resolved.source === 'plan_nos' ? 'text-emerald-700' : 'text-blue-700'} truncate" title="${escapeHtml(indInfo)}">
            ${escapeHtml(indInfo)}
          </div>
        </div>`;
    }).join('');
  }

  function renderHeaderAndCourseMeta() {
    const isFinal = currentDraft.exam_type === 'FINAL';
    const midTotal = currentCourse ? WP29.getCourseExamTotal(currentCourse, 'MID') : null;
    const finTotal = currentCourse ? WP29.getCourseExamTotal(currentCourse, 'FINAL') : null;
    const fmtNum = WP29.formatNumber;

    const midBtnScore = midTotal != null ? ` (${fmtNum(midTotal)})` : '';
    const finBtnScore = finTotal != null ? ` (${fmtNum(finTotal)})` : '';
    els.examMidBtn.textContent = `${isFinal ? '☐' : '☑'} กลางภาค${midBtnScore}`;
    els.examFinalBtn.textContent = `${isFinal ? '☑' : '☐'} ปลายภาค${finBtnScore}`;
    els.examMidBtn.className = `py-1.5 px-2 rounded-lg text-sm font-semibold transition-colors ${
      !isFinal ? 'bg-white text-blue-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
    }`;
    els.examFinalBtn.className = `py-1.5 px-2 rounded-lg text-sm font-semibold transition-colors ${
      isFinal ? 'bg-white text-blue-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
    }`;

    els.teacherNameInput.value = currentDraft.teacher_name || '';
    els.learningAreaInput.value = currentDraft.learning_area || '';
    els.termInput.value = currentDraft.term || WP29.DEFAULT_TERM;
    els.yearInput.value = currentDraft.year || WP29.DEFAULT_YEAR;
    els.standardTextInput.value = currentDraft.standard_text || '';
    els.indicatorTextInput.value = currentDraft.indicator_text || '';

    if (currentCourse) {
      els.selectedCourseBox.classList.remove('hidden');
      els.noCourseNotice.classList.add('hidden');
      els.metaCourseTitle.textContent = `${currentCourse.course_code} ${currentCourse.course_name}`;
      const examDur = isFinal ? currentCourse.fin_exam_duration : currentCourse.mid_exam_duration;
      const midText = midTotal != null ? `${fmtNum(midTotal)} คะแนน` : 'ไม่ระบุ';
      const finText = finTotal != null ? `${fmtNum(finTotal)} คะแนน` : 'ไม่ระบุ';
      els.metaGradeScore.textContent =
        `${currentCourse.grade_level || '-'} · กลางภาค ${midText} / ปลายภาค ${finText}` +
        (examDur ? ` · เวลาสอบ ${examDur} นาที` : '');

      // Plan status, classrooms & term scores from Firebase / assessment-plan
      const extraBadges = [];
      if (midTotal != null) {
        const midDurText = currentCourse.mid_exam_duration ? ` (${currentCourse.mid_exam_duration} นาที)` : '';
        extraBadges.push(
          `<span class="px-2.5 py-0.5 rounded-full font-bold ${
            !isFinal ? 'bg-blue-700 text-white' : 'bg-white border border-blue-200 text-blue-900'
          }">สอบกลางภาค: ${fmtNum(midTotal)} คะแนน${escapeHtml(midDurText)}</span>`
        );
      }
      if (finTotal != null) {
        const finDurText = currentCourse.fin_exam_duration ? ` (${currentCourse.fin_exam_duration} นาที)` : '';
        extraBadges.push(
          `<span class="px-2.5 py-0.5 rounded-full font-bold ${
            isFinal ? 'bg-blue-700 text-white' : 'bg-white border border-blue-200 text-blue-900'
          }">สอบปลายภาค: ${fmtNum(finTotal)} คะแนน${escapeHtml(finDurText)}</span>`
        );
      }
      if (currentCourse.confirmed_status) {
        const isConfirmed = currentCourse.confirmed_status === 'ยืนยัน';
        extraBadges.push(
          `<span class="px-2 py-0.5 rounded-full font-semibold ${
            isConfirmed ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
          }">แผนวัดผล: ${isConfirmed ? '✓ ยืนยันแล้ว' : escapeHtml(currentCourse.confirmed_status)}${
            currentCourse.confirmed_by ? ` (${escapeHtml(currentCourse.confirmed_by)})` : ''
          }</span>`
        );
      }
      if (currentCourse.classrooms) {
        extraBadges.push(
          `<span class="px-2 py-0.5 rounded-full bg-white border border-blue-200 text-slate-700 font-medium">ห้องสอน: ${escapeHtml(currentCourse.classrooms)}</span>`
        );
      }
      if (currentCourse.pre_sum != null && currentCourse.post_sum != null && currentCourse.grand_total != null) {
        extraBadges.push(
          `<span class="px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600">คะแนนเก็บ: ก่อนกลางภาค ${currentCourse.pre_sum} + หลังกลางภาค ${currentCourse.post_sum} (รวมทั้งเทอม ${currentCourse.grand_total})</span>`
        );
      }
      if (extraBadges.length > 0) {
        els.metaPlanExtra.innerHTML = extraBadges.join('');
        els.metaPlanExtra.classList.remove('hidden');
      } else {
        els.metaPlanExtra.innerHTML = '';
        els.metaPlanExtra.classList.add('hidden');
      }

      const courseTeachers = WP29.validCourseTeachers(currentCourse);
      if (courseTeachers.length > 0) {
        els.courseTeachersBar.classList.remove('hidden');
        els.courseTeacherChips.innerHTML = courseTeachers.map(t => {
          const active = currentDraft.teacher_name === t;
          return `<button type="button" data-pick-teacher="${escapeHtml(t)}"
            class="px-2.5 py-0.5 rounded-full border text-xs font-medium transition-colors ${
              active
                ? 'bg-blue-700 text-white border-blue-700'
                : 'bg-white text-slate-700 border-blue-200 hover:bg-blue-100'
            }">${escapeHtml(t)}</button>`;
        }).join('');
      } else {
        els.courseTeachersBar.classList.add('hidden');
        els.courseTeacherChips.innerHTML = '';
      }

      const units = WP29.unitsInRange(currentCourse, currentDraft.exam_type);
      els.cutoffWarningBanner.classList.toggle('hidden', !units.missingCutoff);
      renderCourseStructurePreview();
    } else {
      els.selectedCourseBox.classList.add('hidden');
      els.noCourseNotice.classList.remove('hidden');
    }
    updateAssessmentPlanLinks();
  }

  let currentPresets = [];

  function formatPresetLabel(p, idx) {
    const fmt = WP29.formatNumber;
    const pts = p.subjective.points;
    const allEq = pts.every(x => Math.abs(x - pts[0]) < 1e-6);
    const subjText = allEq
      ? `ข้อละ ${fmt(pts[0])}`
      : pts.map(fmt).join(', ');
    const tag = idx === 0 ? ' (แนะนำ)' : '';
    return `ปรนัย ${p.objective.count} ข้อ × ${fmt(p.objective.points_each)} · อัตนัย ${p.subjective.count} ข้อ (${subjText})${tag}`;
  }

  function renderRatioGuide() {
    if (!els.ratioGuideBox) return;
    const courseTotal = WP29.getCourseExamTotal(currentCourse, currentDraft.exam_type);
    const targetTotal = courseTotal || 15;
    currentPresets = WP29.suggestRatioPresets(targetTotal);

    const objTarget = WP29.formatNumber((targetTotal * WP29.RATIO.objective) / 100);
    const subjTarget = WP29.formatNumber((targetTotal * WP29.RATIO.subjective) / 100);

    const heading = courseTotal
      ? `ไกด์แบ่งสัดส่วน ${WP29.RATIO.objective} : ${WP29.RATIO.subjective} สำหรับวิชานี้ (เต็ม ${WP29.formatNumber(courseTotal)} คะแนน → ปรนัย ${objTarget} + อัตนัย ${subjTarget} คะแนน)`
      : `ไกด์แบ่งสัดส่วน ${WP29.RATIO.objective} : ${WP29.RATIO.subjective} (ตัวอย่างเต็ม 15 คะแนน → ปรนัย 10.5 + อัตนัย 4.5 คะแนน)`;

    const curObjCount = Number(currentDraft.objective.count);
    const curObjEach = Number(currentDraft.objective.points_each);
    const curPts = (currentDraft.subjective.points || []).join(',');

    els.ratioGuideBox.innerHTML = `
      <div class="text-xs font-bold text-emerald-900">💡 ${escapeHtml(heading)} — คลิกเลือกเพื่อเติมอัตโนมัติ:</div>
      <div class="flex flex-wrap gap-1.5">
        ${currentPresets
          .map((p, idx) => {
            const isActive =
              curObjCount === p.objective.count &&
              Math.abs(curObjEach - p.objective.points_each) < 1e-6 &&
              curPts === p.subjective.points.join(',');
            return `
              <button type="button" data-preset-idx="${idx}"
                class="px-2.5 py-1 rounded-lg border text-xs font-semibold transition-colors ${
                  isActive
                    ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                    : 'bg-white text-emerald-900 border-emerald-300 hover:bg-emerald-100'
                }">
                ${escapeHtml(formatPresetLabel(p, idx))}
              </button>`;
          })
          .join('')}
      </div>
    `;
  }

  function renderTestFormatInputs() {
    els.objCountInput.value = currentDraft.objective.count;
    els.objEachInput.value = currentDraft.objective.points_each;
    els.subjCountInput.value = currentDraft.subjective.count;
    renderSubjPointsInputs();
    renderRatioGuide();
    updateSummaries();
  }

  function renderSubjPointsInputs() {
    const objCount = Math.max(0, Math.floor(Number(currentDraft.objective.count) || 0));
    const subjCount = Math.max(0, Math.floor(Number(currentDraft.subjective.count) || 0));
    if (subjCount === 0) {
      els.subjPointsContainer.innerHTML = '<span class="text-xs text-slate-400 py-1.5">ไม่มีข้ออัตนัย</span>';
      return;
    }
    const pts = currentDraft.subjective.points;
    els.subjPointsContainer.innerHTML = Array.from({ length: subjCount }, (_, i) => {
      const qNum = objCount + i + 1;
      const val = pts[i] != null ? pts[i] : '';
      return `
        <label class="inline-flex items-center gap-1 bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs">
          <span class="text-slate-500 font-semibold">ข้อ ${qNum}:</span>
          <input type="number" min="0.25" step="0.25" data-subj-idx="${i}" value="${escapeHtml(val)}"
            class="w-14 text-center font-semibold text-slate-800 focus:outline-none">
        </label>`;
    }).join('');
  }

  function updateSummaries() {
    const s = WP29.calcDraftSummary(currentDraft);
    const fmt = WP29.formatNumber;

    els.objSummaryBadge.textContent = `${fmt(s.objTotal)} คะแนน (${fmt(s.objPct)}%)`;
    els.subjSummaryBadge.textContent = `${fmt(s.subjTotal)} คะแนน (${fmt(s.subjPct)}%)`;

    const courseTotal = WP29.getCourseExamTotal(currentCourse, currentDraft.exam_type);
    const totalMatch = courseTotal == null || Math.abs(s.grandTotal - courseTotal) <= 1e-6;
    const ratioMatch = s.grandTotal > 0 && Math.abs(s.objPct - WP29.RATIO.objective) <= WP29.RATIO_TOLERANCE;

    const totalChip = courseTotal != null
      ? `<span class="px-2.5 py-1 rounded-full text-xs font-bold ${totalMatch ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}">
           รวม ${fmt(s.grandTotal)} / ${fmt(courseTotal)} คะแนน ${totalMatch ? '✓' : '✗'}
         </span>`
      : `<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-700">
           รวม ${fmt(s.grandTotal)} คะแนน
         </span>`;

    const ratioChip = `<span class="px-2.5 py-1 rounded-full text-xs font-bold ${ratioMatch ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">
      สัดส่วน ${fmt(s.objPct)} : ${fmt(s.subjPct)} (เกณฑ์ ${WP29.RATIO.objective} : ${WP29.RATIO.subjective})
    </span>`;

    els.liveSummaryBar.innerHTML = `
      <div class="flex flex-wrap items-center gap-3 text-xs sm:text-sm">
        <span><strong>รวมข้อสอบ:</strong> ${s.totalItems} ข้อ (ปรนัย ${s.objCount} + อัตนัย ${s.subjCount})</span>
        <span><strong>คะแนนรวม:</strong> ${fmt(s.grandTotal)} คะแนน</span>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        ${totalChip}
        ${ratioChip}
      </div>
    `;

    // Missing items bar
    const missingParts = [];
    if (s.missingObj.length > 0) missingParts.push(`ปรนัย ${WP29.formatItemRange(s.missingObj)}`);
    if (s.missingSubj.length > 0) missingParts.push(`อัตนัย ${WP29.formatItemRange(s.missingSubj)}`);
    if (missingParts.length > 0) {
      els.missingItemsBar.className = 'rounded-xl px-3.5 py-2 text-xs sm:text-sm font-medium border bg-amber-50 border-amber-200 text-amber-900';
      els.missingItemsBar.textContent = `ยังไม่ได้ใส่: ${missingParts.join(' · ')}`;
    } else if (s.totalItems > 0) {
      els.missingItemsBar.className = 'rounded-xl px-3.5 py-2 text-xs sm:text-sm font-medium border bg-emerald-50 border-emerald-200 text-emerald-800';
      els.missingItemsBar.textContent = '✓ ใส่เลขข้อสอบครบทุกข้อแล้ว';
    } else {
      els.missingItemsBar.className = 'rounded-xl px-3.5 py-2 text-xs sm:text-sm font-medium border bg-slate-50 border-slate-200 text-slate-600';
      els.missingItemsBar.textContent = 'กำหนดจำนวนข้อปรนัย/อัตนัยด้านบน แล้วกรอกเลขข้อในตาราง';
    }

    // Table footer totals
    let assignedCount = 0;
    let assignedScore = 0;
    for (const row of currentDraft.rows) {
      const m = WP29.calcRowMetrics(row, currentDraft);
      assignedCount += m.totalCount;
      assignedScore += m.totalScore;
    }
    els.tableFooterTotals.innerHTML = `
      <span>รวมในตาราง: ${assignedCount} ข้อ</span>
      <span>รวมคะแนนในตาราง: ${fmt(assignedScore)} คะแนน</span>
    `;
    renderRatioGuide();
  }

  function formatIndicatorOptionLabel(indText, idx) {
    const parsed = WP29.parseIndicator(indText);
    const prefix = parsed.code
      ? `${parsed.code}${parsed.type ? ` (${parsed.type})` : ''}`
      : WP29.indicatorShortLabel(indText, idx + 1);
    const body = parsed.text || indText;
    const full = parsed.code ? `${prefix}: ${body}` : `${prefix} — ${body}`;
    return full.length > 110 ? full.slice(0, 107) + '...' : full;
  }

  function renderRows() {
    const units = currentCourse ? WP29.unitsInRange(currentCourse, currentDraft.exam_type) : [];
    const totalRows = currentDraft.rows.length;

    els.rowsContainer.innerHTML = currentDraft.rows.map((row, idx) => {
      const matchedUnit = units.find(u => u.unit_no === row.unit_no) || null;
      const unitOptions = [...units];
      if (row.unit_no && !matchedUnit) {
        unitOptions.unshift({ unit_no: row.unit_no, unit_name: row.unit_name || `หน่วยที่ ${row.unit_no}` });
      }

      const unitSelectHtml = `
        <option value="">-- เลือกหน่วย --</option>
        ${unitOptions.map(u => {
          const selected = u.unit_no === row.unit_no ? 'selected' : '';
          return `<option value="${escapeHtml(u.unit_no)}" ${selected}>หน่วยที่ ${escapeHtml(u.unit_no)}: ${escapeHtml(u.unit_name)}</option>`;
        }).join('')}
      `;

      const indicators = currentCourse ? WP29.indicatorsForUnit(currentCourse, matchedUnit) : [];
      const cleanedRowInd = WP29.cleanIndicatorText(row.indicator);
      const inList = cleanedRowInd && indicators.includes(cleanedRowInd);
      const isCustom = row.indicator_custom || (cleanedRowInd && !inList);

      const indSelectHtml = `
        <option value="">-- เลือกตัวชี้วัด/ผลการเรียนรู้ --</option>
        ${indicators.map((ind, i) => {
          const selected = !isCustom && ind === cleanedRowInd ? 'selected' : '';
          return `<option value="${escapeHtml(ind)}" ${selected}>${escapeHtml(formatIndicatorOptionLabel(ind, i))}</option>`;
        }).join('')}
        <option value="__CUSTOM__" ${isCustom ? 'selected' : ''}>✎ พิมพ์เอง...</option>
      `;

      const bloomOptionsHtml = Object.entries(WP29.BLOOM_LEVELS).map(([lvl, name]) => {
        const selected = Number(row.bloom) === Number(lvl) ? 'selected' : '';
        return `<option value="${lvl}" ${selected}>ระดับ ${lvl}: ${escapeHtml(name)}</option>`;
      }).join('');

      const metrics = WP29.calcRowMetrics(row, currentDraft);

      return `
        <div data-row-index="${idx}" class="border border-slate-200 rounded-xl p-3 bg-slate-50/50 grid grid-cols-1 lg:grid-cols-12 gap-2.5 items-start">
          <div class="lg:col-span-2">
            <label class="block lg:hidden text-[11px] font-semibold text-slate-500 mb-0.5">แถวที่ ${idx + 1} · หน่วยการเรียนรู้</label>
            <select data-field="unit" class="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs sm:text-sm">
              ${unitSelectHtml}
            </select>
          </div>

          <div class="lg:col-span-3 space-y-1.5">
            <label class="block lg:hidden text-[11px] font-semibold text-slate-500">ตัวชี้วัด / ผลการเรียนรู้</label>
            <select data-field="indicator_select" class="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs sm:text-sm">
              ${indSelectHtml}
            </select>
            <input type="text" data-field="indicator_custom_text" value="${escapeHtml(row.indicator || '')}"
              placeholder="พิมพ์ตัวชี้วัดหรือผลการเรียนรู้..."
              class="${isCustom ? '' : 'hidden'} w-full px-2.5 py-1.5 bg-white border border-blue-300 rounded-lg text-xs sm:text-sm">
          </div>

          <div class="lg:col-span-2">
            <label class="block lg:hidden text-[11px] font-semibold text-slate-500 mb-0.5">ระดับ Bloom</label>
            <select data-field="bloom" class="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs sm:text-sm">
              ${bloomOptionsHtml}
            </select>
          </div>

          <div class="grid grid-cols-2 lg:contents gap-2">
            <div class="lg:col-span-2">
              <label class="block lg:hidden text-[11px] font-semibold text-slate-500 mb-0.5">ปรนัย (ข้อที่)</label>
              <input type="text" data-field="obj_items" value="${escapeHtml(row.obj_items || '')}"
                placeholder="เช่น 1-5, 8"
                class="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs sm:text-sm">
            </div>
            <div class="lg:col-span-1">
              <label class="block lg:hidden text-[11px] font-semibold text-slate-500 mb-0.5">อัตนัย (ข้อที่)</label>
              <input type="text" data-field="subj_items" value="${escapeHtml(row.subj_items || '')}"
                placeholder="เช่น 21"
                class="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs sm:text-sm">
            </div>
          </div>

          <div class="lg:col-span-2 flex items-center justify-between lg:justify-end gap-2 pt-1 lg:pt-0">
            <div data-field="row_metrics" class="text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg px-2.5 py-1">
              ${metrics.totalCount} ข้อ · ${WP29.formatNumber(metrics.totalScore)} คะแนน
            </div>
            <div class="flex items-center gap-1 shrink-0">
              <button type="button" data-action="up" ${idx === 0 ? 'disabled' : ''} title="ย้ายขึ้น"
                class="px-2 py-1 rounded-lg border border-slate-200 bg-white text-xs hover:bg-slate-100 disabled:opacity-40">↑</button>
              <button type="button" data-action="down" ${idx === totalRows - 1 ? 'disabled' : ''} title="ย้ายลง"
                class="px-2 py-1 rounded-lg border border-slate-200 bg-white text-xs hover:bg-slate-100 disabled:opacity-40">↓</button>
              <button type="button" data-action="delete" title="ลบแถว"
                class="px-2 py-1 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-xs hover:bg-rose-100">✕</button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  function updateSingleRowMetricsDom(rowEl, idx) {
    const metricsEl = rowEl.querySelector('[data-field="row_metrics"]');
    if (!metricsEl) return;
    const m = WP29.calcRowMetrics(currentDraft.rows[idx], currentDraft);
    metricsEl.textContent = `${m.totalCount} ข้อ · ${WP29.formatNumber(m.totalScore)} คะแนน`;
  }

  function renderValidation() {
    const issues = WP29.validate(currentDraft, currentCourse);
    const errors = issues.filter(i => i.level === 'error');
    const warns = issues.filter(i => i.level === 'warn');

    if (errors.length === 0 && warns.length === 0) {
      els.validatorBadge.className = 'text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800';
      els.validatorBadge.textContent = '✓ ผ่านทุกเกณฑ์';
      els.validatorList.innerHTML = '<div class="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3.5 py-2.5">ข้อมูลครบถ้วน ถูกต้องตามเกณฑ์พร้อมดาวน์โหลด วผ.29</div>';
      return issues;
    }

    if (errors.length > 0) {
      els.validatorBadge.className = 'text-xs font-bold px-2.5 py-1 rounded-full bg-rose-100 text-rose-800';
      els.validatorBadge.textContent = `ต้องแก้ไข ${errors.length} จุด` + (warns.length ? ` · เตือน ${warns.length}` : '');
    } else {
      els.validatorBadge.className = 'text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800';
      els.validatorBadge.textContent = `คำเตือน ${warns.length} จุด`;
    }

    els.validatorList.innerHTML = issues.map(issue => {
      const isErr = issue.level === 'error';
      const clickable = issue.rowIndex != null;
      return `
        <button type="button" ${clickable ? `data-jump-row="${issue.rowIndex}"` : ''}
          class="w-full text-left rounded-xl px-3.5 py-2 text-xs sm:text-sm border flex items-start gap-2 transition-colors ${
            isErr
              ? 'bg-rose-50 border-rose-200 text-rose-900 hover:bg-rose-100/70'
              : 'bg-amber-50 border-amber-200 text-amber-900 hover:bg-amber-100/70'
          } ${clickable ? 'cursor-pointer' : 'cursor-default'}">
          <span class="font-bold shrink-0">${isErr ? '✕' : '⚠'}</span>
          <span class="flex-1">${escapeHtml(issue.msg)}</span>
          ${clickable ? '<span class="text-xs underline shrink-0">ไปที่แถว</span>' : ''}
        </button>`;
    }).join('');

    return issues;
  }

  function scheduleValidation() {
    clearTimeout(validateTimer);
    validateTimer = setTimeout(() => {
      renderValidation();
    }, 300);
  }

  function renderAll() {
    renderHeaderAndCourseMeta();
    renderTestFormatInputs();
    renderRows();
    renderValidation();
  }

  // ---- Event Listeners ----

  els.filterAreaSelect.addEventListener('change', () => {
    populateTeacherDropdown(els.filterAreaSelect.value);
    updateFilteredCourseDropdown();
  });

  els.filterTeacherSelect.addEventListener('change', () => {
    const teacherName = els.filterTeacherSelect.value;
    if (teacherName) {
      const area = findTeacherArea(teacherName);
      if (area && !els.filterAreaSelect.value) {
        els.filterAreaSelect.value = area;
        populateTeacherDropdown(area);
        els.filterTeacherSelect.value = teacherName;
      }
      if (currentDraft) {
        currentDraft.teacher_name = teacherName;
        els.teacherNameInput.value = teacherName;
        saveDraft();
      }
    }
    const matching = updateFilteredCourseDropdown();
    if (teacherName && matching.length === 1) {
      selectCourse(matching[0], null, teacherName);
    }
    updateAssessmentPlanLinks();
  });

  els.filterCourseSelect.addEventListener('change', () => {
    const code = els.filterCourseSelect.value;
    if (code && COURSES[code]) {
      selectCourse(COURSES[code]);
    }
  });

  els.resetFiltersBtn.addEventListener('click', () => {
    els.filterAreaSelect.value = '';
    populateTeacherDropdown('');
    els.filterTeacherSelect.value = '';
    els.courseSearchInput.value = '';
    els.clearCourseSearchBtn.classList.add('hidden');
    updateFilteredCourseDropdown();
  });

  els.courseTeacherChips.addEventListener('click', e => {
    const btn = e.target.closest('button[data-pick-teacher]');
    if (!btn) return;
    currentDraft.teacher_name = btn.dataset.pickTeacher;
    renderHeaderAndCourseMeta();
    saveDraft();
  });

  els.populateFromStructureBtn.addEventListener('click', () => {
    if (!currentCourse) return;
    const hasContent = currentDraft.rows.some(
      r => r.obj_items || r.subj_items
    );
    if (hasContent && !window.confirm('ต้องการดึงหน่วยและตัวชี้วัดในช่วงสอบมาสร้างแถวใหม่ (เลขข้อที่กรอกไว้จะถูกล้าง) หรือไม่?')) {
      return;
    }
    currentDraft.rows = buildStructureRows(currentCourse, currentDraft.exam_type);
    renderRows();
    updateSummaries();
    saveDraft();
    renderValidation();
  });

  els.courseSearchInput.addEventListener('focus', () => {
    const val = currentCourse && els.courseSearchInput.value === `${currentCourse.course_code} ${currentCourse.course_name}`
      ? ''
      : els.courseSearchInput.value;
    renderCourseDropdown(val);
  });

  els.courseSearchInput.addEventListener('input', () => {
    const q = els.courseSearchInput.value;
    els.clearCourseSearchBtn.classList.toggle('hidden', !q);
    renderCourseDropdown(q);
  });

  els.clearCourseSearchBtn.addEventListener('click', () => {
    els.courseSearchInput.value = '';
    els.clearCourseSearchBtn.classList.add('hidden');
    renderCourseDropdown('');
    els.courseSearchInput.focus();
  });

  els.courseDropdown.addEventListener('click', e => {
    const btn = e.target.closest('button[data-code]');
    if (!btn) return;
    const course = COURSES[btn.dataset.code];
    if (course) selectCourse(course);
  });

  document.addEventListener('click', e => {
    if (!els.courseSearchInput.contains(e.target) && !els.courseDropdown.contains(e.target) && !els.clearCourseSearchBtn.contains(e.target)) {
      els.courseDropdown.classList.add('hidden');
    }
  });

  [els.examMidBtn, els.examFinalBtn].forEach(btn => {
    btn.addEventListener('click', () => {
      const nextExam = btn.dataset.exam;
      if (currentDraft.exam_type === nextExam) return;
      if (currentCourse) {
        selectCourse(currentCourse, nextExam);
      } else {
        currentDraft.exam_type = nextExam;
        renderAll();
      }
    });
  });

  els.teacherNameInput.addEventListener('input', () => {
    teacherManuallyEdited = true;
    currentDraft.teacher_name = els.teacherNameInput.value;
    updateAssessmentPlanLinks();
    saveDraft();
  });
  els.learningAreaInput.addEventListener('input', () => {
    currentDraft.learning_area = els.learningAreaInput.value;
    saveDraft();
  });
  els.termInput.addEventListener('input', () => {
    currentDraft.term = els.termInput.value;
    saveDraft();
  });
  els.yearInput.addEventListener('input', () => {
    currentDraft.year = els.yearInput.value;
    saveDraft();
  });
  els.standardTextInput.addEventListener('input', () => {
    currentDraft.standard_text = els.standardTextInput.value;
    saveDraft();
  });
  els.indicatorTextInput.addEventListener('input', () => {
    currentDraft.indicator_text = els.indicatorTextInput.value;
    saveDraft();
  });

  els.objCountInput.addEventListener('input', () => {
    currentDraft.objective.count = Math.max(0, Math.floor(Number(els.objCountInput.value) || 0));
    renderSubjPointsInputs();
    updateSummaries();
    Array.from(els.rowsContainer.children).forEach((el, idx) => updateSingleRowMetricsDom(el, idx));
    saveDraft();
    scheduleValidation();
  });

  els.objEachInput.addEventListener('input', () => {
    currentDraft.objective.points_each = Number(els.objEachInput.value) || 0;
    updateSummaries();
    Array.from(els.rowsContainer.children).forEach((el, idx) => updateSingleRowMetricsDom(el, idx));
    saveDraft();
    scheduleValidation();
  });

  els.subjCountInput.addEventListener('input', () => {
    const newCount = Math.min(30, Math.max(0, Math.floor(Number(els.subjCountInput.value) || 0)));
    const oldPts = currentDraft.subjective.points || [];
    const nextPts = [];
    for (let i = 0; i < newCount; i++) {
      nextPts.push(i < oldPts.length ? oldPts[i] : 3);
    }
    currentDraft.subjective.count = newCount;
    currentDraft.subjective.points = nextPts;
    renderSubjPointsInputs();
    updateSummaries();
    Array.from(els.rowsContainer.children).forEach((el, idx) => updateSingleRowMetricsDom(el, idx));
    saveDraft();
    scheduleValidation();
  });

  els.subjPointsContainer.addEventListener('input', e => {
    const inp = e.target.closest('input[data-subj-idx]');
    if (!inp) return;
    const idx = Number(inp.dataset.subjIdx);
    currentDraft.subjective.points[idx] = Number(inp.value) || 0;
    updateSummaries();
    Array.from(els.rowsContainer.children).forEach((el, rIdx) => updateSingleRowMetricsDom(el, rIdx));
    saveDraft();
    scheduleValidation();
  });

  els.addRowBtn.addEventListener('click', () => {
    const last = currentDraft.rows[currentDraft.rows.length - 1];
    currentDraft.rows.push(WP29.createEmptyRow(last ? { unit_no: last.unit_no, unit_name: last.unit_name, bloom: last.bloom } : {}));
    renderRows();
    updateSummaries();
    saveDraft();
    scheduleValidation();
  });

  els.rowsContainer.addEventListener('change', e => {
    const rowEl = e.target.closest('[data-row-index]');
    if (!rowEl) return;
    const idx = Number(rowEl.dataset.rowIndex);
    const row = currentDraft.rows[idx];
    const field = e.target.dataset.field;

    if (field === 'unit') {
      const unitNo = e.target.value;
      const units = currentCourse ? WP29.unitsInRange(currentCourse, currentDraft.exam_type) : [];
      const u = units.find(x => x.unit_no === unitNo);
      row.unit_no = unitNo;
      row.unit_name = u ? u.unit_name : '';
      renderRows();
    } else if (field === 'indicator_select') {
      const val = e.target.value;
      if (val === '__CUSTOM__') {
        row.indicator_custom = true;
        if (!row.indicator) row.indicator = '';
      } else {
        row.indicator_custom = false;
        row.indicator = val;
      }
      renderRows();
      if (val === '__CUSTOM__') {
        const customInput = els.rowsContainer.querySelector(`[data-row-index="${idx}"] [data-field="indicator_custom_text"]`);
        if (customInput) customInput.focus();
      }
    } else if (field === 'bloom') {
      row.bloom = Number(e.target.value);
    }

    updateSummaries();
    saveDraft();
    scheduleValidation();
  });

  els.rowsContainer.addEventListener('input', e => {
    const rowEl = e.target.closest('[data-row-index]');
    if (!rowEl) return;
    const idx = Number(rowEl.dataset.rowIndex);
    const row = currentDraft.rows[idx];
    const field = e.target.dataset.field;

    if (field === 'indicator_custom_text') {
      row.indicator = e.target.value;
      row.indicator_custom = true;
    } else if (field === 'obj_items') {
      row.obj_items = e.target.value;
    } else if (field === 'subj_items') {
      row.subj_items = e.target.value;
    }

    updateSingleRowMetricsDom(rowEl, idx);
    updateSummaries();
    saveDraft();
    scheduleValidation();
  });

  els.rowsContainer.addEventListener('click', e => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const rowEl = btn.closest('[data-row-index]');
    if (!rowEl) return;
    const idx = Number(rowEl.dataset.rowIndex);
    const action = btn.dataset.action;

    if (action === 'up' && idx > 0) {
      const tmp = currentDraft.rows[idx - 1];
      currentDraft.rows[idx - 1] = currentDraft.rows[idx];
      currentDraft.rows[idx] = tmp;
    } else if (action === 'down' && idx < currentDraft.rows.length - 1) {
      const tmp = currentDraft.rows[idx + 1];
      currentDraft.rows[idx + 1] = currentDraft.rows[idx];
      currentDraft.rows[idx] = tmp;
    } else if (action === 'delete') {
      if (currentDraft.rows.length === 1) {
        currentDraft.rows[0] = WP29.createEmptyRow();
      } else {
        currentDraft.rows.splice(idx, 1);
      }
    }

    renderRows();
    updateSummaries();
    saveDraft();
    scheduleValidation();
  });

  els.validatorList.addEventListener('click', e => {
    const btn = e.target.closest('button[data-jump-row]');
    if (!btn) return;
    const rowEl = els.rowsContainer.querySelector(`[data-row-index="${btn.dataset.jumpRow}"]`);
    if (!rowEl) return;
    rowEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    rowEl.classList.remove('row-highlight');
    void rowEl.offsetWidth;
    rowEl.classList.add('row-highlight');
  });

  els.ratioGuideBox.addEventListener('click', e => {
    const btn = e.target.closest('button[data-preset-idx]');
    if (!btn) return;
    const p = currentPresets[Number(btn.dataset.presetIdx)];
    if (!p) return;
    currentDraft.objective = { ...p.objective };
    currentDraft.subjective = { count: p.subjective.count, points: [...p.subjective.points] };
    renderTestFormatInputs();
    Array.from(els.rowsContainer.children).forEach((el, idx) => updateSingleRowMetricsDom(el, idx));
    saveDraft();
    renderValidation();
  });

  els.clearDraftBtn.addEventListener('click', () => {
    if (!window.confirm('ต้องการล้างข้อมูลในฟอร์มปัจจุบันทั้งหมดหรือไม่?')) return;
    if (currentCourse) {
      safeRemoveItem(storageKey(currentCourse.course_code, currentDraft.exam_type));
      currentDraft = WP29.createDefaultDraft(currentCourse, currentDraft.exam_type);
      const targetTotal = WP29.getCourseExamTotal(currentCourse, currentDraft.exam_type);
      const presets = targetTotal ? WP29.suggestRatioPresets(targetTotal) : [];
      if (presets.length > 0) {
        currentDraft.objective = { ...presets[0].objective };
        currentDraft.subjective = { count: presets[0].subjective.count, points: [...presets[0].subjective.points] };
      }
      currentDraft.rows = buildStructureRows(currentCourse, currentDraft.exam_type);
      const selectedTeacher = els.filterTeacherSelect.value || WP29.validCourseTeachers(currentCourse)[0] || '';
      if (selectedTeacher) currentDraft.teacher_name = selectedTeacher;
    } else {
      currentDraft = WP29.createDefaultDraft(null, currentDraft.exam_type);
    }
    renderAll();
    saveDraft();
  });

  async function executeDocxDownload() {
    try {
      els.downloadDocxBtn.disabled = true;
      els.downloadDocxBtn.textContent = 'กำลังสร้างไฟล์...';
      await WP29.downloadWp29Docx(currentDraft, currentCourse);
    } catch (err) {
      alert(`ไม่สามารถสร้างไฟล์ .docx ได้: ${err.message}`);
    } finally {
      els.downloadDocxBtn.disabled = false;
      els.downloadDocxBtn.textContent = 'ดาวน์โหลด วผ.29 (.docx)';
    }
  }

  els.downloadDocxBtn.addEventListener('click', () => {
    const issues = renderValidation();
    const errors = issues.filter(i => i.level === 'error');
    if (errors.length > 0) {
      els.confirmModalMsg.textContent = `ยังมี ${errors.length} จุดต้องแก้ ดาวน์โหลดต่อหรือไม่?`;
      els.confirmModal.classList.remove('hidden');
      pendingDownload = true;
    } else {
      executeDocxDownload();
    }
  });

  els.confirmCancelBtn.addEventListener('click', () => {
    pendingDownload = false;
    els.confirmModal.classList.add('hidden');
  });

  els.confirmProceedBtn.addEventListener('click', () => {
    els.confirmModal.classList.add('hidden');
    if (pendingDownload) {
      pendingDownload = false;
      executeDocxDownload();
    }
  });

  // ---- Init ----
  function resolveInitialSelection() {
    const params = new URLSearchParams(window.location.search);
    const paramCode = params.get('code') || params.get('course');
    const paramExam = params.get('exam') || 'MID';
    const paramTeacher =
      params.get('teachcode') ||
      params.get('teaccode') ||
      params.get('teacher_code') ||
      params.get('teacherCode') ||
      params.get('t') ||
      params.get('teacher');

    if (paramTeacher) {
      const resolved = WP29.resolveTeacher(paramTeacher, TEACHER_MAP);
      const tName = resolved ? resolved.name : paramTeacher;
      const tArea = (resolved && resolved.dept) || findTeacherArea(tName);
      if (tArea) {
        els.filterAreaSelect.value = tArea;
        populateTeacherDropdown(tArea);
      }
      if (els.filterTeacherSelect.querySelector(`option[value="${CSS.escape(tName)}"]`)) {
        els.filterTeacherSelect.value = tName;
      }
      const teacherCourses = updateFilteredCourseDropdown();
      if (paramCode && COURSES[paramCode]) {
        selectCourse(COURSES[paramCode], paramExam, tName);
        return;
      }
      if (teacherCourses.length === 1) {
        selectCourse(teacherCourses[0], paramExam, tName);
        return;
      }
      currentDraft = WP29.createDefaultDraft(null, paramExam);
      currentDraft.teacher_name = tName;
      renderAll();
      return;
    }

    updateFilteredCourseDropdown();

    if (paramCode && COURSES[paramCode]) {
      selectCourse(COURSES[paramCode], paramExam);
      return;
    }

    const lastRaw = safeGetItem(LAST_KEY);
    if (lastRaw) {
      try {
        const last = JSON.parse(lastRaw);
        if (last && last.course_code && COURSES[last.course_code]) {
          selectCourse(COURSES[last.course_code], last.exam_type || 'MID');
          return;
        }
      } catch (_) {
        // Ignore
      }
    }

    currentDraft = WP29.createDefaultDraft(null, 'MID');
    renderAll();
  }

  function init() {
    const term2Count = WP29.searchCourses(COURSES, '', { onlyTerm2: true }).length;
    els.courseCountHint.textContent = `ภาคเรียนที่ 2: ${term2Count} รายวิชา`;

    const syncCount = Object.keys(SYNC_SNAPSHOT).length;
    if (els.firebaseSyncBadge && syncCount > 0) {
      els.firebaseSyncBadge.textContent = `✓ แผนวัดผลครบ ${syncCount} วิชา (พร้อมใช้ทันที)`;
    }

    populateAreaDropdown();
    populateTeacherDropdown('');
    populateTeacherSuggestions(null);
    resolveInitialSelection();
  }

  init();
})();
