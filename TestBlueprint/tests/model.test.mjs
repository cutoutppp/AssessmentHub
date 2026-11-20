import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const model = require('../js/model.js');

const coursesJsPath = path.resolve(process.cwd(), '../assessment-plan/data/courses_2_2569.js');
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(coursesJsPath, 'utf8'), sandbox);
const COURSES = sandbox.window.COURSES_2_2569;

function loadFixture(name) {
  return JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'tests/fixtures', name), 'utf8'));
}

test('parseItemRange parses normal, en-dash, spaces, Thai digits, and rejects invalid ranges', () => {
  assert.deepEqual(model.parseItemRange('1-5, 8,10–12'), [1, 2, 3, 4, 5, 8, 10, 11, 12]);
  assert.deepEqual(model.parseItemRange(' ๑ – ๓ , ๕ '), [1, 2, 3, 5]);
  assert.deepEqual(model.parseItemRange(''), []);
  assert.deepEqual(model.parseItemRange('   '), []);

  // Reversed range -> error
  const rev = model.parseItemRange('5-1');
  assert.ok(rev && typeof rev.error === 'string');

  // Malformed -> error
  for (const bad of ['1-', '-3', '1,,2', '1,', 'abc', '0-3', '1-2-3']) {
    const res = model.parseItemRange(bad);
    assert.ok(res && typeof res.error === 'string', `Expected error for ${bad}`);
  }
});

test('formatItemRange compacts contiguous runs and singletons', () => {
  assert.equal(model.formatItemRange([1, 2, 3, 5]), '1–3, 5');
  assert.equal(model.formatItemRange([7]), '7');
  assert.equal(model.formatItemRange([1, 2, 3, 4]), '1–4');
  assert.equal(model.formatItemRange([5, 1, 3, 2, 3]), '1–3, 5');
  assert.equal(model.formatItemRange([]), '');
});

test('validate passes cleanly on all 3 realistic fixtures', () => {
  for (const fname of ['math_k21101_mid.json', 'social_s31204_mid.json', 'elective_k20208_mid.json']) {
    const draft = loadFixture(fname);
    const course = COURSES[draft.course_code];
    const issues = model.validate(draft, course);
    assert.deepEqual(issues, [], `Expected 0 issues for ${fname}, got: ${JSON.stringify(issues)}`);
  }
});

test('validate triggers and clears every error/warn code in section 4', () => {
  const baseCourse = COURSES['ค21101'];
  const baseDraft = loadFixture('math_k21101_mid.json');

  const hasCode = (draft, course, code) =>
    model.validate(draft, course).some(i => i.code === code);

  // RANGE_SYNTAX
  {
    const d = structuredClone(baseDraft);
    d.rows[0].obj_items = '1-';
    assert.equal(hasCode(d, baseCourse, 'RANGE_SYNTAX'), true);
    assert.equal(hasCode(baseDraft, baseCourse, 'RANGE_SYNTAX'), false);
  }

  // OBJ_MISSING
  {
    const d = structuredClone(baseDraft);
    d.rows[0].obj_items = '1-10';
    assert.equal(hasCode(d, baseCourse, 'OBJ_MISSING'), true);
    assert.equal(hasCode(baseDraft, baseCourse, 'OBJ_MISSING'), false);
  }

  // OBJ_DUP
  {
    const d = structuredClone(baseDraft);
    d.rows[1].obj_items = '11-21';
    assert.equal(hasCode(d, baseCourse, 'OBJ_DUP'), true);
    assert.equal(hasCode(baseDraft, baseCourse, 'OBJ_DUP'), false);
  }

  // OBJ_OUT
  {
    const d = structuredClone(baseDraft);
    d.rows[1].obj_items = '12-22';
    assert.equal(hasCode(d, baseCourse, 'OBJ_OUT'), true);
    assert.equal(hasCode(baseDraft, baseCourse, 'OBJ_OUT'), false);
  }

  // SUBJ_MISSING
  {
    const d = structuredClone(baseDraft);
    d.rows[1].subj_items = '';
    assert.equal(hasCode(d, baseCourse, 'SUBJ_MISSING'), true);
    assert.equal(hasCode(baseDraft, baseCourse, 'SUBJ_MISSING'), false);
  }

  // SUBJ_DUP
  {
    const d = structuredClone(baseDraft);
    d.rows[1].subj_items = '22, 23';
    assert.equal(hasCode(d, baseCourse, 'SUBJ_DUP'), true);
    assert.equal(hasCode(baseDraft, baseCourse, 'SUBJ_DUP'), false);
  }

  // SUBJ_OUT
  {
    const d = structuredClone(baseDraft);
    d.rows[1].subj_items = '23, 24';
    assert.equal(hasCode(d, baseCourse, 'SUBJ_OUT'), true);
    assert.equal(hasCode(baseDraft, baseCourse, 'SUBJ_OUT'), false);
  }

  // SUBJ_POINTS
  {
    const d = structuredClone(baseDraft);
    d.subjective.points = [2, 0];
    assert.equal(hasCode(d, baseCourse, 'SUBJ_POINTS'), true);
    const d2 = structuredClone(baseDraft);
    d2.subjective.points = [2];
    assert.equal(hasCode(d2, baseCourse, 'SUBJ_POINTS'), true);
    assert.equal(hasCode(baseDraft, baseCourse, 'SUBJ_POINTS'), false);
  }

  // TOTAL_VS_COURSE
  {
    const d = structuredClone(baseDraft);
    d.objective.count = 20;
    assert.equal(hasCode(d, baseCourse, 'TOTAL_VS_COURSE'), true);
    assert.equal(hasCode(baseDraft, baseCourse, 'TOTAL_VS_COURSE'), false);
  }

  // RATIO
  {
    const d = structuredClone(baseDraft);
    // Keep total = 15 (9 obj + 6 subj -> 60:40)
    d.objective = { count: 9, points_each: 1 };
    d.subjective = { count: 2, points: [3, 3] };
    d.rows[0].obj_items = '1-5';
    d.rows[0].subj_items = '10';
    d.rows[1].obj_items = '6-9';
    d.rows[1].subj_items = '11';
    assert.equal(hasCode(d, baseCourse, 'RATIO'), true);
    assert.equal(hasCode(baseDraft, baseCourse, 'RATIO'), false);
  }

  // ROW_INCOMPLETE
  {
    const d = structuredClone(baseDraft);
    d.rows.push(model.createEmptyRow());
    assert.equal(hasCode(d, baseCourse, 'ROW_INCOMPLETE'), true);
    assert.equal(hasCode(baseDraft, baseCourse, 'ROW_INCOMPLETE'), false);
  }

  // INDICATOR_UNUSED (triggered when unit-bound indicator in range has no row)
  {
    const d = structuredClone(baseDraft);
    d.rows[1].indicator = 'ตัวชี้วัดพิมพ์เอง';
    assert.equal(hasCode(d, baseCourse, 'INDICATOR_UNUSED'), true);
    assert.equal(hasCode(baseDraft, baseCourse, 'INDICATOR_UNUSED'), false);
  }

  // NO_COURSE_TOTAL
  {
    const courseNoTotal = { ...baseCourse, mid_exam: null };
    assert.equal(hasCode(baseDraft, courseNoTotal, 'NO_COURSE_TOTAL'), true);
    assert.equal(hasCode(baseDraft, baseCourse, 'NO_COURSE_TOTAL'), false);
  }
});

test('suggestRatioPresets generates exact 70:30 combinations for 10, 15, and 20 point exams', () => {
  for (const total of [10, 15, 20, 30]) {
    const presets = model.suggestRatioPresets(total);
    assert.ok(presets.length >= 2, `Expected >= 2 presets for ${total}`);
    for (const p of presets) {
      const objSum = model.round2(p.objective.count * p.objective.points_each);
      const subjSum = model.round2(p.subjective.points.reduce((a, b) => a + b, 0));
      assert.equal(model.round2(objSum + subjSum), total);
      assert.equal(model.round2((objSum / total) * 100), 70);
      assert.equal(model.round2((subjSum / total) * 100), 30);
    }
  }
});
