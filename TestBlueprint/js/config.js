(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.WP29 = root.WP29 || {};
    Object.assign(root.WP29, api);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const RATIO = Object.freeze({ objective: 70, subjective: 30 });
  const RATIO_TOLERANCE = 0;
  const DEFAULT_TERM = '2';
  const DEFAULT_YEAR = '2569';

  const BLOOM_LEVELS = Object.freeze({
    1: 'ความรู้-ความจำ',
    2: 'ความเข้าใจ',
    3: 'ประยุกต์ใช้',
    4: 'การวิเคราะห์',
    5: 'การประเมินค่า',
    6: 'ความคิดสร้างสรรค์',
  });

  /** Format Bloom level number (1-6) as "ระดับ n: ชื่อระดับ". */
  function formatBloom(level) {
    const n = Number(level);
    const name = BLOOM_LEVELS[n];
    return name ? `ระดับ ${n}: ${name}` : '';
  }

  return {
    RATIO,
    RATIO_TOLERANCE,
    DEFAULT_TERM,
    DEFAULT_YEAR,
    BLOOM_LEVELS,
    formatBloom,
  };
});
