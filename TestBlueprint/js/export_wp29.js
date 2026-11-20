(function (root, factory) {
  let configMod, coursesMod, modelMod;
  if (typeof module !== 'undefined' && module.exports) {
    configMod = require('./config.js');
    coursesMod = require('./courses.js');
    modelMod = require('./model.js');
  } else {
    configMod = root.WP29;
    coursesMod = root.WP29;
    modelMod = root.WP29;
  }
  const api = factory(configMod, coursesMod, modelMod);
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.WP29 = root.WP29 || {};
    Object.assign(root.WP29, api);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (configMod, coursesMod, modelMod) {
  const { DEFAULT_TERM, DEFAULT_YEAR, formatBloom } = configMod;
  const { cleanIndicatorText, indicatorShortLabel } = coursesMod;
  const { formatNumber, formatItemRange, calcRowMetrics, calcDraftSummary } = modelMod;

  function escapeXml(str) {
    return String(str == null ? '' : str)
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  function formatSubjectiveEach(draft, subjCount) {
    if (subjCount <= 0) return '0';
    const pts = (Array.isArray(draft?.subjective?.points) ? draft.subjective.points : [])
      .slice(0, subjCount)
      .map(Number);
    if (pts.length === 0) return '';
    const first = pts[0];
    const allEqual = pts.every(p => Math.abs(p - first) < 1e-6);
    if (allEqual) return formatNumber(first);
    return pts.map(p => (Number.isFinite(p) ? formatNumber(p) : '0')).join(', ');
  }

  function summarizeIndicatorsFromRows(draft, course) {
    const rows = Array.isArray(draft?.rows) ? draft.rows : [];
    const courseInds = Array.isArray(course?.indicators) ? course.indicators.map(cleanIndicatorText) : [];
    const labels = [];
    const seen = new Set();

    rows.forEach((row, idx) => {
      const cleaned = cleanIndicatorText(row?.indicator);
      if (!cleaned) return;
      let fallbackNum = idx + 1;
      const courseIdx = courseInds.indexOf(cleaned);
      if (courseIdx >= 0) fallbackNum = courseIdx + 1;
      const label = indicatorShortLabel(cleaned, fallbackNum);
      if (label && !seen.has(label)) {
        seen.add(label);
        labels.push(label);
      }
    });

    return labels.join(', ');
  }

  function sameUnit(a, b) {
    if (!a || !b) return false;
    const ua = `${String(a.unit_no || '').trim()}::${String(a.unit_name || '').trim()}`;
    const ub = `${String(b.unit_no || '').trim()}::${String(b.unit_name || '').trim()}`;
    return ua !== '::' && ua === ub;
  }

  /**
   * Inject <w:vMerge w:val="restart"/> or <w:vMerge/> into the N-th <w:tc> of a <w:tr> string.
   */
  function applyCellVMerge(trXml, cellIndices, mergeMode) {
    if (!mergeMode) return trXml;
    const vMergeTag = mergeMode === 'restart' ? '<w:vMerge w:val="restart"/>' : '<w:vMerge/>';
    let currentIdx = -1;
    return trXml.replace(/<w:tc\b[\s\S]*?<\/w:tc>/g, tcXml => {
      currentIdx += 1;
      if (!cellIndices.includes(currentIdx)) return tcXml;
      // Insert vMerge right after <w:tcW .../> inside <w:tcPr>
      if (/<w:tcW\b[^>]*\/>/.test(tcXml)) {
        return tcXml.replace(/(<w:tcW\b[^>]*\/>)/, `$1${vMergeTag}`);
      }
      return tcXml.replace('<w:tcPr>', `<w:tcPr>${vMergeTag}`);
    });
  }

  /**
   * Build the filled word/document.xml string from wp29_template.docx XML.
   * Pure function — works identically in Browser and Node.js.
   */
  function buildDocumentXml(templateDocXml, draft, course) {
    const summary = calcDraftSummary(draft);
    const isFinal = String(draft?.exam_type || 'MID').toUpperCase() === 'FINAL';
    const rows = Array.isArray(draft?.rows) ? draft.rows : [];

    const blankDots = '\u00A0'.repeat(50);
    const indicatorSummary = summarizeIndicatorsFromRows(draft, course);
    const standardText = String(draft?.standard_text || '').trim() || blankDots;
    const indicatorText = String(draft?.indicator_text || '').trim() || indicatorSummary || blankDots;
    const teacherName = String(draft?.teacher_name || '').trim() || '\u00A0'.repeat(40);

    const globals = {
      learning_area: draft?.learning_area || course?.learning_area || '',
      course_code: course?.course_code || draft?.course_code || '',
      course_name: course?.course_name || '',
      grade_level: course?.grade_level || '',
      mid_box: isFinal ? '☐' : '☑',
      fin_box: isFinal ? '☑' : '☐',
      term: String(draft?.term || DEFAULT_TERM),
      year: String(draft?.year || DEFAULT_YEAR),
      teacher_name: teacherName,
      obj_count: String(summary.objCount),
      obj_each: formatNumber(summary.objEach),
      obj_total: formatNumber(summary.objTotal),
      obj_pct: formatNumber(summary.objPct),
      subj_count: String(summary.subjCount),
      subj_each: formatSubjectiveEach(draft, summary.subjCount),
      subj_total: formatNumber(summary.subjTotal),
      subj_pct: formatNumber(summary.subjPct),
      standard_text: standardText,
      indicator_text: indicatorText,
      total_count: String(summary.totalItems),
      total_score: formatNumber(summary.grandTotal),
    };

    // Locate template table row containing {{unit_no}}
    const rowMatch = templateDocXml.match(/<w:tr\b(?:(?!<w:tr\b)[\s\S])*?\{\{unit_no\}\}[\s\S]*?<\/w:tr>/);
    if (!rowMatch) {
      throw new Error('Template missing {{unit_no}} table row');
    }
    const templateRowXml = rowMatch[0];

    const effectiveRows = rows.length > 0 ? rows : [{}];
    const renderedRows = effectiveRows.map((row, i) => {
      const prevSame = i > 0 && sameUnit(row, effectiveRows[i - 1]);
      const nextSame = i + 1 < effectiveRows.length && sameUnit(row, effectiveRows[i + 1]);
      const mergeMode = prevSame ? 'continue' : nextSame ? 'restart' : null;

      const metrics = calcRowMetrics(row, draft);
      const rowValues = {
        unit_no: prevSame ? '' : String(row?.unit_no || '').trim(),
        unit_name: prevSame ? '' : String(row?.unit_name || '').trim(),
        row_indicator: cleanIndicatorText(row?.indicator || ''),
        row_bloom: formatBloom(row?.bloom),
        row_obj: metrics.objNums.length > 0 ? `ข้อที่ ${formatItemRange(metrics.objNums)}` : '',
        row_subj: metrics.subjNums.length > 0 ? `ข้อที่ ${formatItemRange(metrics.subjNums)}` : '',
        row_count: metrics.totalCount > 0 ? String(metrics.totalCount) : '',
        row_score: metrics.totalCount > 0 || metrics.totalScore > 0 ? formatNumber(metrics.totalScore) : '',
      };

      let trXml = applyCellVMerge(templateRowXml, [0, 1], mergeMode);
      for (const [key, val] of Object.entries(rowValues)) {
        if ((key === 'row_obj' || key === 'row_subj') && val.startsWith('ข้อที่ ')) {
          const rangePart = escapeXml(val.slice('ข้อที่ '.length));
          trXml = trXml.split(`{{${key}}}`).join(`ข้อที่</w:t><w:br/><w:t>${rangePart}`);
        } else {
          trXml = trXml.split(`{{${key}}}`).join(escapeXml(val));
        }
      }
      return trXml;
    });

    let outXml = templateDocXml.replace(templateRowXml, renderedRows.join(''));
    for (const [key, val] of Object.entries(globals)) {
      outXml = outXml.split(`{{${key}}}`).join(escapeXml(val));
    }

    return outXml;
  }

  function exportFilename(draft, course) {
    const code = String(course?.course_code || draft?.course_code || 'COURSE')
      .replace(/[\\/:*?"<>|\s]+/g, '_');
    const examLabel = String(draft?.exam_type || 'MID').toUpperCase() === 'FINAL' ? 'ปลายภาค' : 'กลางภาค';
    const term = String(draft?.term || DEFAULT_TERM).replace(/[\\/:*?"<>|\s]+/g, '');
    const year = String(draft?.year || DEFAULT_YEAR).replace(/[\\/:*?"<>|\s]+/g, '');
    return `วผ29_${code}_${examLabel}_${term}-${year}.docx`;
  }

  function base64ToUint8Array(b64) {
    if (typeof Buffer !== 'undefined' && typeof atob === 'undefined') {
      return new Uint8Array(Buffer.from(b64, 'base64'));
    }
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) {
      bytes[i] = bin.charCodeAt(i);
    }
    return bytes;
  }

  /**
   * Generate .docx Blob (browser) or Uint8Array (node) using JSZip.
   */
  async function generateWp29Docx(draft, course, options = {}) {
    const JSZipLib = options.JSZipLib || (typeof JSZip !== 'undefined' ? JSZip : null);
    if (!JSZipLib) {
      throw new Error('JSZip is required to generate .docx');
    }
    const b64 = options.templateBase64 || (typeof WP29_TEMPLATE_B64 !== 'undefined' ? WP29_TEMPLATE_B64 : null);
    if (!b64) {
      throw new Error('WP29_TEMPLATE_B64 is not loaded');
    }

    const zip = await JSZipLib.loadAsync(base64ToUint8Array(b64));
    const docFile = zip.file('word/document.xml');
    if (!docFile) {
      throw new Error('Invalid template: missing word/document.xml');
    }
    const templateXml = await docFile.async('string');
    const filledXml = buildDocumentXml(templateXml, draft, course);
    zip.file('word/document.xml', filledXml);

    const outputType = options.outputType || (typeof Blob !== 'undefined' ? 'blob' : 'uint8array');
    return zip.generateAsync({
      type: outputType,
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      compression: 'DEFLATE',
    });
  }

  async function downloadWp29Docx(draft, course, options = {}) {
    const blob = await generateWp29Docx(draft, course, options);
    const filename = exportFilename(draft, course);
    if (typeof saveAs !== 'undefined') {
      saveAs(blob, filename);
    } else if (typeof document !== 'undefined') {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    return filename;
  }

  return {
    escapeXml,
    formatSubjectiveEach,
    summarizeIndicatorsFromRows,
    buildDocumentXml,
    exportFilename,
    generateWp29Docx,
    downloadWp29Docx,
  };
});
