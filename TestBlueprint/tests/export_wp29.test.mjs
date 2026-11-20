import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import zlib from 'node:zlib';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const exporter = require('../js/export_wp29.js');

const coursesJsPath = path.resolve(process.cwd(), '../assessment-plan/data/courses_2_2569.js');
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(coursesJsPath, 'utf8'), sandbox);
const COURSES = sandbox.window.COURSES_2_2569;

/**
 * Minimal ZIP reader for extracting word/document.xml from templates/wp29_template.docx in Node without external npm deps.
 */
function readDocXmlFromDocx(docxPath) {
  const buf = fs.readFileSync(docxPath);
  const eocdOffset = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  assert.ok(eocdOffset >= 0, 'EOCD not found');
  const cdOffset = buf.readUInt32LE(eocdOffset + 16);
  const totalEntries = buf.readUInt16LE(eocdOffset + 10);
  let pos = cdOffset;
  for (let i = 0; i < totalEntries; i++) {
    assert.equal(buf.readUInt32LE(pos), 0x02014b50);
    const compMethod = buf.readUInt16LE(pos + 10);
    const compSize = buf.readUInt32LE(pos + 20);
    const nameLen = buf.readUInt16LE(pos + 28);
    const extraLen = buf.readUInt16LE(pos + 30);
    const commentLen = buf.readUInt16LE(pos + 32);
    const localHeaderOffset = buf.readUInt32LE(pos + 42);
    const name = buf.subarray(pos + 46, pos + 46 + nameLen).toString('utf8');
    if (name === 'word/document.xml') {
      const lNameLen = buf.readUInt16LE(localHeaderOffset + 26);
      const lExtraLen = buf.readUInt16LE(localHeaderOffset + 28);
      const dataStart = localHeaderOffset + 30 + lNameLen + lExtraLen;
      const raw = buf.subarray(dataStart, dataStart + compSize);
      return (compMethod === 8 ? zlib.inflateRawSync(raw) : raw).toString('utf8');
    }
    pos += 46 + nameLen + extraLen + commentLen;
  }
  throw new Error('word/document.xml not found');
}

const TEMPLATE_XML = readDocXmlFromDocx(path.resolve(process.cwd(), 'templates/wp29_template.docx'));

test('buildDocumentXml fills all placeholders cleanly with XML escaping and vMerge', () => {
  const electiveDraft = JSON.parse(
    fs.readFileSync(path.resolve(process.cwd(), 'tests/fixtures/elective_k20208_mid.json'), 'utf8')
  );
  // Inject XML special chars in teacher_name to verify escaping
  electiveDraft.teacher_name = 'ครูทดสอบ <A&B> "1"';
  const course = COURSES[electiveDraft.course_code];

  const outXml = exporter.buildDocumentXml(TEMPLATE_XML, electiveDraft, course);

  // No unreplaced placeholders
  assert.equal(outXml.includes('{{'), false, 'Should have no leftover {{ placeholders');
  assert.equal(outXml.includes('}}'), false, 'Should have no leftover }} placeholders');

  // XML escaping
  assert.ok(outXml.includes('ครูทดสอบ &lt;A&amp;B&gt; &quot;1&quot;'));

  // Checkboxes
  assert.ok(outXml.includes('☑'));
  assert.ok(outXml.includes('☐'));

  // Unequal subjective points formatting ("1, 1.5, 2")
  assert.ok(outXml.includes('1, 1.5, 2'));

  // Auto-summarized elective indicator labels
  assert.ok(outXml.includes('ผลการเรียนรู้ข้อ 1, ผลการเรียนรู้ข้อ 3, ผลการเรียนรู้ข้อ 2, ผลการเรียนรู้ข้อ 4'));

  // vMerge restart & continue for grouped unit rows
  const restarts = outXml.match(/<w:vMerge w:val="restart"\/>/g) || [];
  const continues = outXml.match(/<w:vMerge\/>/g) || [];
  // Table header has 4 restart + 4 continue, plus 2 units x 2 cols = 4 restart + 4 continue
  assert.ok(restarts.length >= 8, `Expected >=8 vMerge restarts, got ${restarts.length}`);
  assert.ok(continues.length >= 8, `Expected >=8 vMerge continues, got ${continues.length}`);
});

test('exportFilename follows วผ29_<code >_<exam>_<term>-<year>.docx format', () => {
  assert.equal(
    exporter.exportFilename({ course_code: 'ค21101', exam_type: 'MID', term: '2', year: '2569' }, COURSES['ค21101']),
    'วผ29_ค21101_กลางภาค_2-2569.docx'
  );
  assert.equal(
    exporter.exportFilename({ course_code: 'ค21101', exam_type: 'FINAL', term: '2', year: '2569' }, COURSES['ค21101']),
    'วผ29_ค21101_ปลายภาค_2-2569.docx'
  );
});
