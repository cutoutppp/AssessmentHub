(function (root, factory) {
  let configMod, coursesMod;
  if (typeof module !== 'undefined' && module.exports) {
    configMod = require('./config.js');
    coursesMod = require('./courses.js');
  } else {
    configMod = root.WP29;
    coursesMod = root.WP29;
  }
  const api = factory(configMod, coursesMod);
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.WP29 = root.WP29 || {};
    Object.assign(root.WP29, api);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (configMod, coursesMod) {
  const { RATIO, RATIO_TOLERANCE, DEFAULT_TERM, DEFAULT_YEAR } = configMod;
  const {
    cleanIndicatorText,
    parseIndicator,
    indicatorShortLabel,
    unitsInRange,
    unitHasOwnIndicators,
    getCourseExamTotal,
    thaiDigitsToArabic,
  } = coursesMod;

  function round2(n) {
    return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
  }

  function formatNumber(n) {
    const num = Number(n);
    if (!Number.isFinite(num)) return '0';
    const rounded = round2(num);
    if (Number.isInteger(rounded)) return String(rounded);
    return rounded.toFixed(2).replace(/\.?0+$/, '');
  }

  /**
   * Parse an item range string like "1-5, 8,10–12" or Thai digits "๑–๓, ๕".
   * Returns sorted unique array of positive integers, or { error: string }.
   * Empty / whitespace-only string returns [].
   */
  function parseItemRange(str) {
    if (str == null) return [];
    const normalized = thaiDigitsToArabic(String(str)).trim();
    if (!normalized) return [];

    const parts = normalized.split(',');
    const set = new Set();

    for (const rawPart of parts) {
      const part = rawPart.trim();
      if (!part) {
        return { error: `อ่าน '${String(str).trim()}' ไม่ได้ (มีเครื่องหมายจุลภาคเกินหรือว่าง)` };
      }
      // Single positive integer
      if (/^\d+$/.test(part)) {
        const n = Number(part);
        if (n < 1) {
          return { error: `อ่าน '${part}' ไม่ได้ (เลขข้อต้องเริ่มจาก 1)` };
        }
        set.add(n);
        continue;
      }
      // Range a-b or a–b
      const m = part.match(/^(\d+)\s*[-–]\s*(\d+)$/);
      if (m) {
        const start = Number(m[1]);
        const end = Number(m[2]);
        if (start < 1 || end < 1) {
          return { error: `อ่าน '${part}' ไม่ได้ (เลขข้อต้องเริ่มจาก 1)` };
        }
        if (start > end) {
          return { error: `ช่วง '${part}' กลับด้าน (${start} มากกว่า ${end})` };
        }
        if (end - start > 500) {
          return { error: `ช่วง '${part}' กว้างเกินไป` };
        }
        for (let k = start; k <= end; k++) {
          set.add(k);
        }
        continue;
      }
      return { error: `อ่าน '${part}' ไม่ได้` };
    }

    return Array.from(set).sort((a, b) => a - b);
  }

  /**
   * Format an array of positive integers into compact range string, e.g. [1,2,3,5] -> "1–3, 5".
   */
  function formatItemRange(nums) {
    if (!Array.isArray(nums) || nums.length === 0) return '';
    const sorted = Array.from(new Set(nums.map(Number).filter(n => Number.isInteger(n) && n >= 1))).sort((a, b) => a - b);
    if (sorted.length === 0) return '';

    const groups = [];
    let start = sorted[0];
    let prev = sorted[0];

    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] === prev + 1) {
        prev = sorted[i];
      } else {
        groups.push(start === prev ? `${start}` : `${start}–${prev}`);
        start = sorted[i];
        prev = sorted[i];
      }
    }
    groups.push(start === prev ? `${start}` : `${start}–${prev}`);
    return groups.join(', ');
  }

  function createEmptyRow(defaults = {}) {
    return {
      unit_no: defaults.unit_no || '',
      unit_name: defaults.unit_name || '',
      indicator: defaults.indicator || '',
      indicator_custom: Boolean(defaults.indicator_custom),
      bloom: defaults.bloom != null ? Number(defaults.bloom) : 1,
      obj_items: defaults.obj_items || '',
      subj_items: defaults.subj_items || '',
    };
  }

  function createDefaultDraft(course, examType = 'MID') {
    return {
      v: 1,
      course_code: course ? course.course_code : '',
      exam_type: String(examType || 'MID').toUpperCase() === 'FINAL' ? 'FINAL' : 'MID',
      term: DEFAULT_TERM,
      year: DEFAULT_YEAR,
      learning_area: course ? (course.learning_area || '') : '',
      teacher_name: '',
      objective: { count: 20, points_each: 1 },
      subjective: { count: 2, points: [3, 3] },
      standard_text: '',
      indicator_text: '',
      rows: [createEmptyRow()],
      updated_at: new Date().toISOString(),
    };
  }

  function buildSubjectiveSplits(subjTarget) {
    const splits = [];
    const t = round2(subjTarget);
    if (t <= 0) return splits;

    const addIfValid = (arr) => {
      if (arr.some(x => x <= 0)) return;
      const sum = round2(arr.reduce((a, b) => a + b, 0));
      if (Math.abs(sum - t) > 1e-6) return;
      const key = arr.join(',');
      if (!splits.some(s => s.join(',') === key)) splits.push(arr);
    };

    // 2 items equal or stepped by 0.5 / 1
    const half = round2(t / 2);
    if (Number.isInteger(half * 2)) {
      addIfValid([half, half]);
    } else {
      const low2 = Math.floor(t) / 2;
      const a2 = Math.floor(half * 2) / 2;
      const b2 = round2(t - a2);
      if (a2 > 0 && b2 > 0) addIfValid([a2, b2]);
      if (low2 > 0 && round2(t - low2) > 0) addIfValid([low2, round2(t - low2)]);
    }
    if (t >= 3) {
      const a = Math.floor(t / 3);
      if (a >= 1 && round2(t - a) > a) addIfValid([a, round2(t - a)]);
    }

    // 3 items equal or stepped
    const third = round2(t / 3);
    if (Math.abs(third * 2 - Math.round(third * 2)) < 1e-6) {
      addIfValid([third, third, third]);
    }
    if (t >= 3) {
      const mid3 = round2(t / 3);
      if (Number.isInteger(mid3 * 2)) {
        const s1 = round2(mid3 - 0.5);
        const s3 = round2(mid3 + 0.5);
        if (s1 > 0) addIfValid([s1, mid3, s3]);
      }
    }

    // 1 item fallback
    addIfValid([t]);
    return splits;
  }

  /**
   * Generate ready-to-use 70:30 presets for any exam full score (e.g. 10, 15, 20, 30).
   */
  function suggestRatioPresets(targetTotal, ratio = RATIO) {
    const total = Number(targetTotal);
    if (!Number.isFinite(total) || total <= 0) return [];

    const objTarget = round2((total * ratio.objective) / 100);
    const subjTarget = round2(total - objTarget);

    const objOptions = [];
    for (const each of [0.5, 1, 0.25, 0.75]) {
      const count = round2(objTarget / each);
      if (Number.isInteger(count) && count >= 4 && count <= 60) {
        objOptions.push({ count, points_each: each });
      }
    }
    // Prefer item counts around 10..35
    objOptions.sort((a, b) => {
      const scoreA = (a.count >= 10 && a.count <= 35 ? 0 : 100) + Math.abs(a.count - 20);
      const scoreB = (b.count >= 10 && b.count <= 35 ? 0 : 100) + Math.abs(b.count - 20);
      return scoreA - scoreB;
    });

    const subjSplits = buildSubjectiveSplits(subjTarget);
    const presets = [];

    if (objOptions.length > 0 && subjSplits.length > 0) {
      const primaryObj = objOptions[0];
      for (const pts of subjSplits.slice(0, 3)) {
        presets.push({
          objTarget,
          subjTarget,
          objective: { ...primaryObj },
          subjective: { count: pts.length, points: pts },
        });
      }
      if (objOptions.length > 1) {
        presets.push({
          objTarget,
          subjTarget,
          objective: { ...objOptions[1] },
          subjective: { count: subjSplits[0].length, points: subjSplits[0] },
        });
      }
    }

    return presets.slice(0, 4);
  }

  function calcRowMetrics(row, draft) {
    const objCount = Math.max(0, Number(draft?.objective?.count) || 0);
    const objEach = Number(draft?.objective?.points_each) || 0;
    const subjCount = Math.max(0, Number(draft?.subjective?.count) || 0);
    const subjPoints = Array.isArray(draft?.subjective?.points) ? draft.subjective.points : [];

    const objParsed = parseItemRange(row?.obj_items);
    const subjParsed = parseItemRange(row?.subj_items);

    const objNums = Array.isArray(objParsed) ? objParsed : [];
    const subjNums = Array.isArray(subjParsed) ? subjParsed : [];

    const objScore = round2(objNums.length * objEach);
    let subjScore = 0;
    for (const q of subjNums) {
      const idx = q - (objCount + 1);
      if (idx >= 0 && idx < subjCount) {
        const pt = Number(subjPoints[idx]);
        if (Number.isFinite(pt) && pt > 0) subjScore += pt;
      }
    }
    subjScore = round2(subjScore);

    return {
      objNums,
      subjNums,
      objError: Array.isArray(objParsed) ? null : objParsed.error,
      subjError: Array.isArray(subjParsed) ? null : subjParsed.error,
      objCount: objNums.length,
      subjCount: subjNums.length,
      totalCount: objNums.length + subjNums.length,
      objScore,
      subjScore,
      totalScore: round2(objScore + subjScore),
    };
  }

  function calcDraftSummary(draft) {
    const objCount = Math.max(0, Math.floor(Number(draft?.objective?.count) || 0));
    const objEach = Number(draft?.objective?.points_each) || 0;
    const objTotal = round2(objCount * (objEach > 0 ? objEach : 0));

    const subjCount = Math.max(0, Math.floor(Number(draft?.subjective?.count) || 0));
    const rawPts = Array.isArray(draft?.subjective?.points) ? draft.subjective.points : [];
    let subjTotal = 0;
    for (let i = 0; i < subjCount; i++) {
      const pt = Number(rawPts[i]);
      if (Number.isFinite(pt) && pt > 0) subjTotal += pt;
    }
    subjTotal = round2(subjTotal);

    const grandTotal = round2(objTotal + subjTotal);
    const objPct = grandTotal > 0 ? round2((objTotal / grandTotal) * 100) : 0;
    const subjPct = grandTotal > 0 ? round2((subjTotal / grandTotal) * 100) : 0;

    // Missing & duplicate tracking
    const rows = Array.isArray(draft?.rows) ? draft.rows : [];
    const objUsed = new Set();
    const subjUsed = new Set();
    for (const row of rows) {
      const o = parseItemRange(row?.obj_items);
      if (Array.isArray(o)) {
        for (const q of o) {
          if (q >= 1 && q <= objCount) objUsed.add(q);
        }
      }
      const s = parseItemRange(row?.subj_items);
      if (Array.isArray(s)) {
        for (const q of s) {
          if (q >= objCount + 1 && q <= objCount + subjCount) subjUsed.add(q);
        }
      }
    }

    const missingObj = [];
    for (let q = 1; q <= objCount; q++) {
      if (!objUsed.has(q)) missingObj.push(q);
    }
    const missingSubj = [];
    for (let q = objCount + 1; q <= objCount + subjCount; q++) {
      if (!subjUsed.has(q)) missingSubj.push(q);
    }

    return {
      objCount,
      objEach,
      objTotal,
      objPct,
      subjCount,
      subjTotal,
      subjPct,
      grandTotal,
      totalItems: objCount + subjCount,
      missingObj,
      missingSubj,
    };
  }

  /**
   * Validate draft against course metadata and spec rules.
   * Returns array of { level: 'error'|'warn', code, msg, rowIndex? }.
   */
  function validate(draft, course) {
    const issues = [];
    if (!draft) return issues;

    const objCount = Math.floor(Number(draft.objective?.count) || 0);
    const objEach = Number(draft.objective?.points_each) || 0;
    const subjCount = Math.floor(Number(draft.subjective?.count) || 0);
    const subjPoints = Array.isArray(draft.subjective?.points) ? draft.subjective.points : [];
    const rows = Array.isArray(draft.rows) ? draft.rows : [];

    // 1. Subjective points check
    if (subjCount > 0) {
      const invalidLen = subjPoints.length !== subjCount;
      const invalidVal = subjPoints.slice(0, subjCount).some(p => {
        const n = Number(p);
        return !Number.isFinite(n) || n <= 0;
      });
      if (invalidLen || invalidVal) {
        issues.push({
          level: 'error',
          code: 'SUBJ_POINTS',
          msg: `คะแนนอัตนัยรายข้อไม่ครบหรือมีค่า ≤ 0 (ต้องระบุครบ ${subjCount} ข้อ)`,
        });
      }
    } else if (subjCount < 0 || (subjCount === 0 && subjPoints.length > 0)) {
      issues.push({
        level: 'error',
        code: 'SUBJ_POINTS',
        msg: 'จำนวนข้อและคะแนนอัตนัยไม่สอดคล้องกัน',
      });
    }

    const objSeen = new Map(); // q -> [rowNum1, rowNum2...]
    const subjSeen = new Map();

    // 2. Per-row checks
    rows.forEach((row, idx) => {
      const rowNum = idx + 1;
      const objRes = parseItemRange(row?.obj_items);
      const subjRes = parseItemRange(row?.subj_items);

      if (!Array.isArray(objRes)) {
        issues.push({
          level: 'error',
          code: 'RANGE_SYNTAX',
          msg: `แถวที่ ${rowNum} ช่องปรนัย: ${objRes.error}`,
          rowIndex: idx,
        });
      } else {
        const out = [];
        for (const q of objRes) {
          if (q < 1 || q > objCount) {
            out.push(q);
          } else {
            if (!objSeen.has(q)) objSeen.set(q, []);
            objSeen.get(q).push(rowNum);
          }
        }
        if (out.length > 0) {
          issues.push({
            level: 'error',
            code: 'OBJ_OUT',
            msg: `แถวที่ ${rowNum}: ปรนัยมี ${objCount} ข้อ แต่ใส่ข้อ ${formatItemRange(out)}`,
            rowIndex: idx,
          });
        }
      }

      if (!Array.isArray(subjRes)) {
        issues.push({
          level: 'error',
          code: 'RANGE_SYNTAX',
          msg: `แถวที่ ${rowNum} ช่องอัตนัย: ${subjRes.error}`,
          rowIndex: idx,
        });
      } else {
        const out = [];
        const minSubj = objCount + 1;
        const maxSubj = objCount + subjCount;
        for (const q of subjRes) {
          if (subjCount <= 0 || q < minSubj || q > maxSubj) {
            out.push(q);
          } else {
            if (!subjSeen.has(q)) subjSeen.set(q, []);
            subjSeen.get(q).push(rowNum);
          }
        }
        if (out.length > 0) {
          const rangeText = subjCount > 0 ? `อัตนัยใช้เลขข้อ ${minSubj}–${maxSubj}` : 'อัตนัยมี 0 ข้อ';
          issues.push({
            level: 'error',
            code: 'SUBJ_OUT',
            msg: `แถวที่ ${rowNum}: ${rangeText} แต่ใส่ข้อ ${formatItemRange(out)}`,
            rowIndex: idx,
          });
        }
      }

      // Row completeness
      const missingFields = [];
      if (!String(row?.unit_no || '').trim() && !String(row?.unit_name || '').trim()) {
        missingFields.push('หน่วยการเรียนรู้');
      }
      if (!String(row?.indicator || '').trim()) {
        missingFields.push('ตัวชี้วัด/ผลการเรียนรู้');
      }
      const bloom = Number(row?.bloom);
      if (!Number.isInteger(bloom) || bloom < 1 || bloom > 6) {
        missingFields.push('ระดับ Bloom (1–6)');
      }
      const hasObj = Array.isArray(objRes) ? objRes.length > 0 : Boolean(String(row?.obj_items || '').trim());
      const hasSubj = Array.isArray(subjRes) ? subjRes.length > 0 : Boolean(String(row?.subj_items || '').trim());
      if (!hasObj && !hasSubj) {
        missingFields.push('เลขข้อสอบ (ปรนัยหรืออัตนัย)');
      }
      if (missingFields.length > 0) {
        issues.push({
          level: 'error',
          code: 'ROW_INCOMPLETE',
          msg: `แถวที่ ${rowNum}: ยังไม่ได้ระบุ ${missingFields.join(', ')}`,
          rowIndex: idx,
        });
      }
    });

    // 3. Duplicates across rows
    for (const [q, rowNums] of objSeen.entries()) {
      if (rowNums.length > 1) {
        issues.push({
          level: 'error',
          code: 'OBJ_DUP',
          msg: `ปรนัยข้อ ${q} อยู่ ${rowNums.length} แถว (แถว ${rowNums.join(', ')})`,
          rowIndex: rowNums[0] - 1,
        });
      }
    }
    for (const [q, rowNums] of subjSeen.entries()) {
      if (rowNums.length > 1) {
        issues.push({
          level: 'error',
          code: 'SUBJ_DUP',
          msg: `อัตนัยข้อ ${q} อยู่ ${rowNums.length} แถว (แถว ${rowNums.join(', ')})`,
          rowIndex: rowNums[0] - 1,
        });
      }
    }

    // 4. Missing items
    const missingObj = [];
    for (let q = 1; q <= objCount; q++) {
      if (!objSeen.has(q)) missingObj.push(q);
    }
    if (missingObj.length > 0) {
      issues.push({
        level: 'error',
        code: 'OBJ_MISSING',
        msg: `ปรนัยข้อ ${formatItemRange(missingObj)} ยังไม่ได้ใส่ในตาราง`,
      });
    }

    const missingSubj = [];
    for (let q = objCount + 1; q <= objCount + subjCount; q++) {
      if (!subjSeen.has(q)) missingSubj.push(q);
    }
    if (missingSubj.length > 0) {
      issues.push({
        level: 'error',
        code: 'SUBJ_MISSING',
        msg: `อัตนัยข้อ ${formatItemRange(missingSubj)} ยังไม่ได้ใส่ในตาราง`,
      });
    }

    // 5. Course total & ratio checks
    const summary = calcDraftSummary(draft);
    const courseTotal = getCourseExamTotal(course, draft.exam_type);
    if (courseTotal == null) {
      issues.push({
        level: 'warn',
        code: 'NO_COURSE_TOTAL',
        msg: 'รายวิชาไม่มีค่าคะแนนสอบเต็มในข้อมูล — ตรวจคะแนนรวมไม่ได้',
      });
    } else if (Math.abs(summary.grandTotal - courseTotal) > 1e-6) {
      const examLabel = String(draft.exam_type).toUpperCase() === 'FINAL' ? 'ปลายภาค' : 'กลางภาค';
      issues.push({
        level: 'error',
        code: 'TOTAL_VS_COURSE',
        msg: `คะแนนรวม ${formatNumber(summary.grandTotal)} แต่คะแนนสอบ${examLabel}วิชานี้ = ${formatNumber(courseTotal)}`,
      });
    }

    if (summary.grandTotal > 0 && Math.abs(summary.objPct - RATIO.objective) > RATIO_TOLERANCE) {
      issues.push({
        level: 'warn',
        code: 'RATIO',
        msg: `ปรนัยร้อยละ ${formatNumber(summary.objPct)} / อัตนัย ${formatNumber(summary.subjPct)} (เกณฑ์ ${RATIO.objective} : ${RATIO.subjective})`,
      });
    }

    // 6. Unused unit-bound indicators in exam range
    if (course) {
      const units = unitsInRange(course, draft.exam_type);
      const boundUnits = units.filter(unitHasOwnIndicators);
      if (boundUnits.length > 0) {
        const usedIndicators = new Set();
        const usedCodes = new Set();
        for (const r of rows) {
          const cleaned = cleanIndicatorText(r?.indicator);
          if (!cleaned) continue;
          usedIndicators.add(cleaned);
          const p = parseIndicator(cleaned);
          if (p.code) usedCodes.add(p.code);
        }
        const unused = [];
        for (const u of boundUnits) {
          for (const rawInd of u.indicators) {
            const cleaned = cleanIndicatorText(rawInd);
            if (!cleaned) continue;
            const p = parseIndicator(cleaned);
            const isUsed = usedIndicators.has(cleaned) || (p.code && usedCodes.has(p.code));
            if (!isUsed) {
              unused.push(indicatorShortLabel(cleaned));
            }
          }
        }
        const uniqueUnused = Array.from(new Set(unused));
        if (uniqueUnused.length > 0) {
          issues.push({
            level: 'warn',
            code: 'INDICATOR_UNUSED',
            msg: `ตัวชี้วัดของหน่วยในช่วงสอบยังไม่มีข้อสอบ: ${uniqueUnused.join(', ')}`,
          });
        }
      }
    }

    return issues;
  }

  return {
    round2,
    formatNumber,
    parseItemRange,
    formatItemRange,
    createEmptyRow,
    createDefaultDraft,
    suggestRatioPresets,
    calcRowMetrics,
    calcDraftSummary,
    validate,
  };
});
