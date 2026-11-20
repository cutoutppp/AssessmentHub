import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const coursesMod = require('../js/courses.js');

const coursesJsPath = path.resolve(process.cwd(), '../assessment-plan/data/courses_2_2569.js');
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(coursesJsPath, 'utf8'), sandbox);
const COURSES = sandbox.window.COURSES_2_2569;

test('cleanIndicatorText joins spaced Thai letters without merging normal words', () => {
  assert.equal(
    coursesMod.cleanIndicatorText('เข้าใจจำนวนตรรกยะ แ ล ะ ค วามสัมพันธ์ของจำนวน'),
    'เข้าใจจำนวนตรรกยะ และความสัมพันธ์ของจำนวน'
  );
  assert.equal(
    coursesMod.cleanIndicatorText('วิเคราะห์ปัจจัยที่มี ผ ล ก ร ะทบต่อการตั้งครรภ์'),
    'วิเคราะห์ปัจจัยที่มี ผลกระทบต่อการตั้งครรภ์'
  );
  assert.equal(
    coursesMod.cleanIndicatorText('สร้างสรรค์งาน ด น ต รีแตกต่างกัน'),
    'สร้างสรรค์งาน ดนตรีแตกต่างกัน'
  );
  // Normal sentences with intentional spaces must NOT be merged
  assert.equal(
    coursesMod.cleanIndicatorText('เข้าใจจำนวนจริง และ ใช้สมบัติ   ในการแก้ปัญหา ต่าง ๆ ได้'),
    'เข้าใจจำนวนจริง และ ใช้สมบัติ ในการแก้ปัญหา ต่าง ๆ ได้'
  );
  // Single space between two single letters (< 2 spaces) must NOT be merged
  assert.equal(
    coursesMod.cleanIndicatorText('ตัวเลือก ก ข ในข้อสอบ'),
    'ตัวเลือก ก ข ในข้อสอบ'
  );
});

test('parseIndicator parses basic and elective indicators', () => {
  const basic = coursesMod.parseIndicator('ค 1.1 ม.1/1 (ปลายทาง): เข้าใจจำนวนตรรกยะ แ ล ะ ค วามสัมพันธ์');
  assert.deepEqual(basic, {
    code: 'ค 1.1 ม.1/1',
    type: 'ปลายทาง',
    text: 'เข้าใจจำนวนตรรกยะ และความสัมพันธ์',
  });

  const midWay = coursesMod.parseIndicator('ค 1.1 ม.1/2 (ระหว่างทาง): สมบัติเลขยกกำลัง');
  assert.equal(midWay.code, 'ค 1.1 ม.1/2');
  assert.equal(midWay.type, 'ระหว่างทาง');

  const elec = coursesMod.parseIndicator('1. เปรียบเทียบทศนิยมและเศษส่วนได้');
  assert.deepEqual(elec, {
    code: null,
    type: null,
    text: '1. เปรียบเทียบทศนิยมและเศษส่วนได้',
  });
  assert.equal(coursesMod.indicatorShortLabel('1. เปรียบเทียบทศนิยมและเศษส่วนได้'), 'ผลการเรียนรู้ข้อ 1');
  assert.equal(coursesMod.indicatorShortLabel('อธิบายหลักการ', 3), 'ผลการเรียนรู้ข้อ 3');
});

test('unitsInRange handles MID, FINAL, and missing cutoff', () => {
  const k21101 = COURSES['ค21101'];
  const midUnits = coursesMod.unitsInRange(k21101, 'MID');
  const finUnits = coursesMod.unitsInRange(k21101, 'FINAL');
  assert.deepEqual(midUnits.map(u => u.unit_no), ['1', '2']);
  assert.equal(midUnits.missingCutoff, false);
  assert.deepEqual(finUnits.map(u => u.unit_no), ['3', '4', '5']);
  assert.equal(finUnits.missingCutoff, false);

  const noCutoffCourse = {
    course_code: 'ท99999',
    midterm_cutoff: null,
    units: [
      { unit_no: '1', unit_name: 'หน่วย 1' },
      { unit_no: '2', unit_name: 'หน่วย 2' },
    ],
  };
  const allUnits = coursesMod.unitsInRange(noCutoffCourse, 'MID');
  assert.equal(allUnits.length, 2);
  assert.equal(allUnits.missingCutoff, true);
});

test('indicatorsForUnit prefers unit indicators and falls back to course indicators', () => {
  const k21101 = COURSES['ค21101'];
  const unit1 = k21101.units[0];
  const uInds = coursesMod.indicatorsForUnit(k21101, unit1);
  assert.equal(uInds.fromUnit, true);
  assert.equal(uInds.length, 1);
  assert.ok(!uInds[0].includes('แ ล ะ'));

  const s31204 = COURSES['ส31204'];
  const sInds = coursesMod.indicatorsForUnit(s31204, s31204.units[0]);
  assert.equal(sInds.fromUnit, false);
  assert.equal(sInds.length, 6);
});

test('assessment-plan linkage helpers resolve teachers, filter courses, and merge overrides', () => {
  const teacherMap = {
    '236': { code: '236', name: 'นางสาวรัศมี เฮงอรุณ', dept: 'คณิตศาสตร์' },
  };
  assert.equal(coursesMod.resolveTeacher('236', teacherMap).name, 'นางสาวรัศมี เฮงอรุณ');
  assert.equal(coursesMod.resolveTeacher('นางสาวรัศมี เฮงอรุณ', teacherMap).code, '236');

  const k20208 = COURSES['ค20208'];
  assert.deepEqual(coursesMod.validCourseTeachers(k20208), ['นางสาวรัศมี เฮงอรุณ']);
  assert.deepEqual(coursesMod.validCourseTeachers({ teachers: ['...................'] }), []);

  const byTeacher = coursesMod.filterCourses(COURSES, {
    teacherName: 'นางสาวรัศมี เฮงอรุณ',
    onlyTerm2: true,
  });
  assert.ok(byTeacher.some(c => c.course_code === 'ค20208'));

  const merged = coursesMod.mergeAssessmentPlanOverrides(
    { ค20208: k20208 },
    {
      ค20208: {
        teachers: ['ครูอัปเดต ทดสอบ'],
        midterm_cutoff: 2,
        mid_exam: 20,
        mid_exam_duration: 60,
        fin_exam_duration: 60,
        confirmed_status: 'ยืนยัน',
        confirmed_by: 'ครูอัปเดต ทดสอบ',
        pre_sum: 30,
        post_sum: 30,
        grand_total: 100,
      },
    }
  );
  assert.deepEqual(merged['ค20208'].teachers, ['ครูอัปเดต ทดสอบ']);
  assert.equal(merged['ค20208'].midterm_cutoff, 2);
  assert.equal(merged['ค20208'].mid_exam, 20);
  assert.equal(merged['ค20208'].mid_exam_duration, 60);
  assert.equal(merged['ค20208'].confirmed_status, 'ยืนยัน');
  assert.equal(merged['ค20208'].confirmed_by, 'ครูอัปเดต ทดสอบ');
  assert.equal(merged['ค20208'].grand_total, 100);
  // Original course object remains unmutated
  assert.equal(k20208.mid_exam, 15);
});

test('resolveUnitIndicators resolves bound unit indicators, plan outcome_nos, and suggested mapping', () => {
  // 1. Direct unit-bound indicators (ค21102)
  const k21102 = COURSES['ค21102'];
  const rDirect = coursesMod.resolveUnitIndicators(k21102, k21102.units[0]);
  assert.equal(rDirect.source, 'unit');
  assert.equal(rDirect.indicators.length, 1);
  assert.ok(rDirect.indicators[0].startsWith('ค 1.3 ม.1/1'));

  // 2. Assessment-plan outcome_nos override
  const k20208 = COURSES['ค20208'];
  const rPlan = coursesMod.resolveUnitIndicators(k20208, { ...k20208.units[0], outcome_nos: [1, 3] });
  assert.equal(rPlan.source, 'plan_nos');
  assert.equal(rPlan.indicators.length, 2);
  assert.ok(rPlan.indicators[0].startsWith('1.'));
  assert.ok(rPlan.indicators[1].startsWith('3.'));

  // 3. Suggested fallback mapping when unit.indicators is empty
  const rSuggested = coursesMod.resolveUnitIndicators(k20208, k20208.units[0], 0);
  assert.equal(rSuggested.source, 'suggested');
  assert.equal(rSuggested.indicators.length, 1);
  assert.ok(rSuggested.indicators[0].startsWith('1.'));
});
