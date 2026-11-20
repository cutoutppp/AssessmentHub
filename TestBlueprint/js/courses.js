(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.WP29 = root.WP29 || {};
    Object.assign(root.WP29, api);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const PUA_THAI_MAP = {
    '\uF700': '\u0E10', '\uF701': '\u0E34', '\uF702': '\u0E35', '\uF703': '\u0E36',
    '\uF704': '\u0E37', '\uF705': '\u0E48', '\uF706': '\u0E49', '\uF707': '\u0E4A',
    '\uF708': '\u0E4B', '\uF709': '\u0E4C', '\uF70A': '\u0E48', '\uF70B': '\u0E49',
    '\uF70C': '\u0E4A', '\uF70D': '\u0E4B', '\uF70E': '\u0E4C', '\uF70F': '\u0E0D',
    '\uF710': '\u0E31', '\uF711': '\u0E4D', '\uF712': '\u0E47', '\uF713': '\u0E48',
    '\uF714': '\u0E49', '\uF715': '\u0E4A', '\uF716': '\u0E4B', '\uF717': '\u0E4C',
    '\uF718': '\u0E38', '\uF719': '\u0E39', '\uF71A': '\u0E3A',
  };

  // Single Thai base letter (consonants + standalone vowels, excluding ๆ and Thai digits) with optional combining marks
  const SINGLE_THAI = '[\\u0E01-\\u0E2E\\u0E30\\u0E32\\u0E33\\u0E40-\\u0E44][\\u0E31\\u0E34-\\u0E3A\\u0E47-\\u0E4E]*';
  const SPACED_LETTERS_RE = new RegExp(
    `(^|\\s)(${SINGLE_THAI}(?:\\s+${SINGLE_THAI}){2,})(?=\\s|$)(?:\\s+([\\u0E01-\\u0E2E\\u0E30-\\u0E3A\\u0E40-\\u0E4E]+))?`,
    'g'
  );

  const THAI_DIGITS = '๐๑๒๓๔๕๖๗๘๙';

  function thaiDigitsToArabic(str) {
    return String(str || '').replace(/[๐-๙]/g, ch => String(THAI_DIGITS.indexOf(ch)));
  }

  /**
   * Clean indicator text from PDF/Word extraction artifacts:
   * - Normalize PUA Thai glyphs & Sara Am (U+0E4D U+0E32 -> U+0E33)
   * - Remove spaces before Thai combining marks
   * - Join sequences of single Thai letters separated by >= 2 spaces (e.g. "แ ล ะ ค วาม" -> "และความ")
   *   without merging normal spaced words
   * - Collapse repeated horizontal whitespace
   */
  function cleanIndicatorText(s) {
    if (s == null) return '';
    let text = String(s)
      .replace(/[\uF700-\uF71A]/g, ch => PUA_THAI_MAP[ch] || '')
      .replace(/\u0E4D\u0E32/g, '\u0E33')
      .replace(/\s+([\u0E31\u0E34-\u0E3A\u0E47-\u0E4E])/g, '$1');

    // Repeat in case adjacent runs occur after collapsing
    let prev;
    do {
      prev = text;
      text = text.replace(SPACED_LETTERS_RE, (_, lead, letters, tail) => {
        const joined = letters.replace(/\s+/g, '') + (tail || '');
        return `${lead}${joined}`;
      });
    } while (text !== prev);

    return text.replace(/[ \t]+/g, ' ').trim();
  }

  const BASIC_INDICATOR_RE =
    /^([ทควสพศงต]\s*\d+\.\d+\s*(?:ม|ป)\s*\.?\s*\d+(?:\s*-\s*\d+)?\/\d+)\s*(?:\((ระหว่างทาง|ปลายทาง)\))?\s*:?\s*(.*)$/s;

  function normalizeIndicatorCode(rawCode) {
    return String(rawCode || '')
      .replace(/\s+/g, ' ')
      .replace(/([ทควสพศงต])\s*(\d)/, '$1 $2')
      .replace(/(\d)\s*(ม|ป)/, '$1 $2')
      .replace(/(ม|ป)\s*\.\s*/, '$1.')
      .replace(/\s*-\s*/g, '-')
      .replace(/\s*\/\s*/g, '/')
      .trim();
  }

  /**
   * Parse an indicator string into { code, type: 'ระหว่างทาง'|'ปลายทาง'|null, text }.
   * For elective / learning-outcome strings without a standard code, code is null.
   */
  function parseIndicator(s) {
    const cleaned = cleanIndicatorText(s);
    if (!cleaned) return { code: null, type: null, text: '' };
    const m = cleaned.match(BASIC_INDICATOR_RE);
    if (m) {
      return {
        code: normalizeIndicatorCode(m[1]),
        type: m[2] || null,
        text: (m[3] || '').trim(),
      };
    }
    return {
      code: null,
      type: null,
      text: cleaned,
    };
  }

  /**
   * Extract a short summary label for an indicator:
   * - Basic course: its code (e.g. "ค 1.1 ม.1/1")
   * - Elective course (code === null): "ผลการเรียนรู้ข้อ n"
   */
  function indicatorShortLabel(s, fallbackNum) {
    const parsed = parseIndicator(s);
    if (parsed.code) return parsed.code;
    const normalized = thaiDigitsToArabic(parsed.text);
    const m = normalized.match(/^(?:ผลการเรียนรู้\s*(?:ข้อ(?:ที่)?|ที่)?\s*|ข้อ(?:ที่)?\s*)(\d+)|^(\d+)\s*[\.\):]/);
    const num = m ? (m[1] || m[2]) : (fallbackNum != null ? String(fallbackNum) : '');
    return num ? `ผลการเรียนรู้ข้อ ${num}` : 'ผลการเรียนรู้';
  }

  function hasMidtermCutoff(course) {
    if (!course) return false;
    const cutoff = Number(course.midterm_cutoff);
    return Number.isFinite(cutoff) && cutoff > 0;
  }

  function getUnitNo(unit, index) {
    if (unit && unit.unit_no != null && String(unit.unit_no).trim() !== '') {
      return String(unit.unit_no).trim();
    }
    return String(index + 1);
  }

  /**
   * Filter units belonging to MID (1..midterm_cutoff) or FINAL (remaining units).
   * If midterm_cutoff is missing/empty, returns all units with missingCutoff = true.
   */
  function unitsInRange(course, examType) {
    if (!course || !Array.isArray(course.units)) {
      const empty = [];
      Object.defineProperty(empty, 'missingCutoff', { value: true, enumerable: false });
      return empty;
    }
    const normalized = Array.from(course.units, (u, idx) => ({
      ...u,
      unit_no: getUnitNo(u, idx),
    }));
    const cutoff = Number(course.midterm_cutoff);
    const validCutoff = course.midterm_cutoff !== '' && course.midterm_cutoff != null && Number.isFinite(cutoff) && cutoff > 0;

    if (!validCutoff) {
      Object.defineProperty(normalized, 'missingCutoff', { value: true, enumerable: false });
      return normalized;
    }

    const type = String(examType || 'MID').toUpperCase();
    const filtered = normalized.filter((u, idx) => {
      const num = Number(thaiDigitsToArabic(u.unit_no));
      const pos = Number.isFinite(num) && num > 0 ? num : idx + 1;
      return type === 'FINAL' ? pos > cutoff : pos <= cutoff;
    });
    Object.defineProperty(filtered, 'missingCutoff', { value: false, enumerable: false });
    return filtered;
  }

  function splitCourseOutcomes(rawList) {
    const out = [];
    const seen = new Set();
    for (const raw of rawList || []) {
      const cleaned = cleanIndicatorText(raw);
      if (!cleaned) continue;
      // If it starts with a standard basic code (e.g. ค 1.1 ม.1/1), keep as-is
      if (/^[ทควสพศงต]\s*\d+\.\d+/.test(cleaned)) {
        if (!seen.has(cleaned)) {
          seen.add(cleaned);
          out.push(cleaned);
        }
        continue;
      }
      // Split concatenated numbered outcomes like "1. ... 2. ..."
      const parts = cleaned.split(/\s+(?=(?:ผลการเรียนรู้\s*(?:ข้อ(?:ที่)?|ที่)?\s*\d+|(?:ข้อที่\s*)?\d{1,2}(?:\.\d{1,2})*\s*[\.\)]\s*[ก-๙A-Za-z]))/);
      for (const p of parts) {
        const t = p.trim();
        if (t && !seen.has(t)) {
          seen.add(t);
          out.push(t);
        }
      }
    }
    return out;
  }

  function getDefaultOutcomeMapping(numOutcomes, numUnits) {
    const map = Array.from({ length: Math.max(0, numUnits) }, () => []);
    if (numOutcomes <= 0 || numUnits <= 0) return map;
    for (let k = 0; k < numOutcomes; k++) {
      map[Math.min(numUnits - 1, Math.floor((k * numUnits) / numOutcomes))].push(k + 1);
    }
    map.forEach((nos, i) => {
      if (nos.length === 0) {
        nos.push(Math.min(numOutcomes, Math.floor((i * numOutcomes) / numUnits) + 1));
      }
    });
    return map;
  }

  /**
   * Resolve indicators bound to a specific unit:
   * 1. 'unit'      -> unit.indicators directly present on the unit
   * 2. 'plan_nos'  -> unit.outcome_nos saved by assessment-plan (วผ.19)
   * 3. 'suggested' -> balanced distribution of course.indicators (same rule as assessment-plan)
   * 4. 'none'      -> no indicators available
   */
  function resolveUnitIndicators(course, unit, unitIndex) {
    const unitInds = unit && Array.isArray(unit.indicators) ? unit.indicators : [];
    if (unitInds.length > 0) {
      const cleaned = [];
      const seen = new Set();
      for (const item of unitInds) {
        const c = cleanIndicatorText(item);
        if (c && !seen.has(c)) {
          seen.add(c);
          cleaned.push(c);
        }
      }
      if (cleaned.length > 0) return { indicators: cleaned, source: 'unit' };
    }

    const courseInds = splitCourseOutcomes(course && Array.isArray(course.indicators) ? course.indicators : []);
    if (courseInds.length === 0) return { indicators: [], source: 'none' };

    if (unit && Array.isArray(unit.outcome_nos) && unit.outcome_nos.length > 0) {
      const picked = [];
      for (const n of unit.outcome_nos) {
        const idx = Number(n) - 1;
        if (idx >= 0 && idx < courseInds.length && !picked.includes(courseInds[idx])) {
          picked.push(courseInds[idx]);
        }
      }
      if (picked.length > 0) return { indicators: picked, source: 'plan_nos' };
    }

    const totalUnits = course && Array.isArray(course.units) ? course.units.length : 0;
    let uIdx = typeof unitIndex === 'number' && unitIndex >= 0 ? unitIndex : -1;
    if (uIdx < 0 && unit && course && Array.isArray(course.units)) {
      uIdx = course.units.findIndex((u, i) => getUnitNo(u, i) === String(unit.unit_no || '').trim());
    }
    if (uIdx >= 0 && totalUnits > 0) {
      const nos = getDefaultOutcomeMapping(courseInds.length, totalUnits)[uIdx] || [];
      const suggested = nos
        .map(n => courseInds[n - 1])
        .filter(Boolean);
      if (suggested.length > 0) return { indicators: suggested, source: 'suggested' };
    }

    return { indicators: [], source: 'none' };
  }

  /**
   * Return cleaned, deduplicated indicators for a unit if unit.indicators is non-empty;
   * otherwise fall back to course-level course.indicators.
   */
  function indicatorsForUnit(course, unit) {
    const unitInds = unit && Array.isArray(unit.indicators) ? unit.indicators : [];
    const hasUnit = unitInds.length > 0;
    const out = hasUnit
      ? splitCourseOutcomes(unitInds)
      : splitCourseOutcomes(course && Array.isArray(course.indicators) ? course.indicators : []);
    Object.defineProperty(out, 'fromUnit', { value: hasUnit, enumerable: false });
    return out;
  }

  function unitHasOwnIndicators(unit) {
    return Boolean(unit && Array.isArray(unit.indicators) && unit.indicators.length > 0);
  }

  function courseHasUnitIndicators(course) {
    return Boolean(course && Array.isArray(course.units) && course.units.some(unitHasOwnIndicators));
  }

  function getCourseExamTotal(course, examType) {
    if (!course) return null;
    const val = String(examType || 'MID').toUpperCase() === 'FINAL' ? course.fin_exam : course.mid_exam;
    if (val === null || val === undefined || val === '') return null;
    const num = Number(val);
    return Number.isFinite(num) && num > 0 ? num : null;
  }

  function isPlaceholderTeacher(name) {
    const s = String(name || '').trim();
    return !s || /^\.+$/.test(s) || s === 'ไม่ระบุ' || s === '-';
  }

  function validCourseTeachers(course) {
    if (!course || !Array.isArray(course.teachers)) return [];
    return Array.from(course.teachers, t => String(t || '').trim()).filter(t => !isPlaceholderTeacher(t));
  }

  /**
   * Resolve a teacher code (e.g. "236") or name against TEACHER_CODE_MAP.
   * Returns { code, name, dept } or null if not found.
   */
  function resolveTeacher(input, teacherCodeMap) {
    const s = String(input || '').trim();
    if (!s) return null;
    const map = teacherCodeMap || {};
    if (map[s]) return map[s];
    const num = parseInt(s, 10);
    if (!Number.isNaN(num) && map[String(num)]) return map[String(num)];
    for (const info of Object.values(map)) {
      if (info && info.name === s) return info;
    }
    return { code: null, name: s, dept: null };
  }

  /**
   * Merge read-only overrides saved by assessment-plan (sgs_confirmations_2_2569_v1)
   * into a shallow-cloned courses map so teacher/unit/cutoff updates carry over.
   */
  function mergeAssessmentPlanOverrides(baseCourses, sgsConfirmations) {
    const out = {};
    const overrides = sgsConfirmations && typeof sgsConfirmations === 'object' ? sgsConfirmations : {};
    for (const [code, course] of Object.entries(baseCourses || {})) {
      const ov = overrides[code];
      if (!ov || typeof ov !== 'object') {
        out[code] = course;
        continue;
      }
      const cloned = { ...course };
      if (Array.isArray(ov.teachers) && ov.teachers.length > 0) {
        cloned.teachers = ov.teachers.slice();
      }
      if (Array.isArray(ov.units_snapshot) && ov.units_snapshot.length > 0) {
        cloned.units = ov.units_snapshot.map(u => ({ ...u }));
      }
      if (ov.midterm_cutoff !== undefined && ov.midterm_cutoff !== null && ov.midterm_cutoff !== '') {
        cloned.midterm_cutoff = ov.midterm_cutoff;
      }
      if (ov.mid_exam !== undefined && ov.mid_exam !== null && ov.mid_exam !== '') {
        cloned.mid_exam = ov.mid_exam;
      }
      if (ov.fin_exam !== undefined && ov.fin_exam !== null && ov.fin_exam !== '') {
        cloned.fin_exam = ov.fin_exam;
      }
      if (ov.mid_exam_duration !== undefined && ov.mid_exam_duration !== null && ov.mid_exam_duration !== '') {
        cloned.mid_exam_duration = Number(ov.mid_exam_duration) || null;
      }
      if (ov.fin_exam_duration !== undefined && ov.fin_exam_duration !== null && ov.fin_exam_duration !== '') {
        cloned.fin_exam_duration = Number(ov.fin_exam_duration) || null;
      }
      if (ov.classrooms) {
        cloned.classrooms = ov.classrooms;
      }
      if (ov.confirmed_status) cloned.confirmed_status = ov.confirmed_status;
      if (ov.confirmed_by) cloned.confirmed_by = ov.confirmed_by;
      if (ov.confirmed_at) cloned.confirmed_at = ov.confirmed_at;
      if (ov.pre_sum !== undefined && ov.pre_sum !== null) cloned.pre_sum = ov.pre_sum;
      if (ov.post_sum !== undefined && ov.post_sum !== null) cloned.post_sum = ov.post_sum;
      if (ov.grand_total !== undefined && ov.grand_total !== null) cloned.grand_total = ov.grand_total;
      out[code] = cloned;
    }
    return out;
  }

  /**
   * Filter courses by learningArea, teacherName, and free-text query.
   */
  function filterCourses(coursesMap, { query = '', learningArea = '', teacherName = '', onlyTerm2 = true } = {}) {
    const all = Object.values(coursesMap || {});
    const q = String(query || '').trim().toLowerCase();
    const area = String(learningArea || '').trim();
    const teacher = String(teacherName || '').trim();

    let list = all.filter(c => {
      if (onlyTerm2 && !c.is_scheduled_term2) return false;
      if (area && String(c.learning_area || '').trim() !== area) return false;
      if (teacher) {
        const teachers = validCourseTeachers(c);
        if (!teachers.includes(teacher)) return false;
      }
      if (q) {
        const matchCode = String(c.course_code || '').toLowerCase().includes(q);
        const matchName = String(c.course_name || '').toLowerCase().includes(q);
        const matchArea = String(c.learning_area || '').toLowerCase().includes(q);
        const matchTeacher = validCourseTeachers(c).some(t => t.toLowerCase().includes(q));
        if (!matchCode && !matchName && !matchArea && !matchTeacher) return false;
      }
      return true;
    });

    // If teacher filter was applied with onlyTerm2=true and yielded 0 matches, check all courses
    if (list.length === 0 && teacher && onlyTerm2 && !q) {
      list = all.filter(c => {
        if (area && String(c.learning_area || '').trim() !== area) return false;
        return validCourseTeachers(c).includes(teacher);
      });
    }

    return list;
  }

  function searchCourses(coursesMap, query, { onlyTerm2 = true } = {}) {
    return filterCourses(coursesMap, { query, onlyTerm2 });
  }

  return {
    cleanIndicatorText,
    parseIndicator,
    indicatorShortLabel,
    hasMidtermCutoff,
    unitsInRange,
    splitCourseOutcomes,
    getDefaultOutcomeMapping,
    resolveUnitIndicators,
    indicatorsForUnit,
    unitHasOwnIndicators,
    courseHasUnitIndicators,
    getCourseExamTotal,
    isPlaceholderTeacher,
    validCourseTeachers,
    resolveTeacher,
    mergeAssessmentPlanOverrides,
    filterCourses,
    searchCourses,
    thaiDigitsToArabic,
  };
});
