import re

file_path = r'C:\Users\peera\Desktop\AntigravityProject\AssessmentHub\SgsNextschool\frontend\src\Dashboard.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace WP25 button
wp25_old = r"\{t\.overall_status_midterm\.includes\('สมบูรณ์'\) && \(\s*<button \s*onClick=\{\(\) => downloadSavedDoc\('wp25', t\.teacher_name, \{ subject_group: t\.subject_group, mock_subjects: teacherData\.filter\(\(td: any\) => td\.teacher_name === t\.teacher_name\) \}\)\} \s*className=\"px-2 py-0\.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 text-\[11px\] rounded-md font-medium transition shadow-2xs flex items-center gap-1 cursor-pointer\"\s*title=\"ดาวน์โหลด วผ\.25 \(บันทึกข้อความรายงานคะแนนกลางภาค\)\"\s*>\s*📄 วผ\.25 \(กลางภาค\)\s*</button>\s*\)\}"

wp25_new = """<button 
                                  onClick={() => t.overall_status_midterm.includes('สมบูรณ์') && downloadSavedDoc('wp25', t.teacher_name, { subject_group: t.subject_group, mock_subjects: teacherData.filter((td: any) => td.teacher_name === t.teacher_name) })} 
                                  disabled={!t.overall_status_midterm.includes('สมบูรณ์')}
                                  className={`px-2 py-0.5 text-[11px] rounded-md font-medium transition shadow-2xs flex items-center gap-1 ${t.overall_status_midterm.includes('สมบูรณ์') ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 cursor-pointer' : 'bg-slate-50 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60 grayscale'}`}
                                  title={t.overall_status_midterm.includes('สมบูรณ์') ? "ดาวน์โหลด วผ.25 (บันทึกข้อความรายงานคะแนนกลางภาค)" : "ต้องส่งคะแนนกลางภาคให้ครบก่อนจึงจะดาวน์โหลดได้"}
                                >
                                  📄 วผ.25 (กลางภาค)
                                </button>"""

content = re.sub(wp25_old, wp25_new, content)

# Replace WP16 button
wp16_old = r"\{t\.overall_status_final\.includes\('สมบูรณ์'\) && \(\s*<button \s*onClick=\{\(\) => downloadSavedDoc\('wp16', t\.teacher_name, \{ mock_subjects: teacherData\.filter\(\(td: any\) => td\.teacher_name === t\.teacher_name\) \}\)\} \s*className=\"px-2 py-0\.5 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-300 text-\[11px\] rounded-md font-medium transition shadow-2xs flex items-center gap-1 cursor-pointer\"\s*title=\"ดาวน์โหลด วผ\.16 \(รายงาน 0 ร มผ\)\"\s*>\s*📄 วผ\.16 \(ปลายภาค\)\s*</button>\s*\)\}"

wp16_new = """<button 
                                  onClick={() => t.overall_status_final.includes('สมบูรณ์') && downloadSavedDoc('wp16', t.teacher_name, { mock_subjects: teacherData.filter((td: any) => td.teacher_name === t.teacher_name) })} 
                                  disabled={!t.overall_status_final.includes('สมบูรณ์')}
                                  className={`px-2 py-0.5 text-[11px] rounded-md font-medium transition shadow-2xs flex items-center gap-1 ${t.overall_status_final.includes('สมบูรณ์') ? 'bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-300 cursor-pointer' : 'bg-slate-50 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60 grayscale'}`}
                                  title={t.overall_status_final.includes('สมบูรณ์') ? "ดาวน์โหลด วผ.16 (รายงาน 0 ร มผ)" : "ต้องส่งคะแนนปลายภาคให้ครบก่อนจึงจะดาวน์โหลดได้"}
                                >
                                  📄 วผ.16 (ปลายภาค)
                                </button>"""

content = re.sub(wp16_old, wp16_new, content)

# Replace WP17 button
wp17_old = r"\{t\.overall_status_final\.includes\('สมบูรณ์'\) && \(\s*<button \s*onClick=\{\(\) => downloadSavedDoc\('wp17', t\.teacher_name, \{ mock_subjects: teacherData\.filter\(\(td: any\) => td\.teacher_name === t\.teacher_name\) \}\)\} \s*className=\"px-2 py-0\.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-300 text-\[11px\] rounded-md font-medium transition shadow-2xs flex items-center gap-1 cursor-pointer\"\s*title=\"ดาวน์โหลด วผ\.17 \(รายงานการจัดกิจกรรม\)\"\s*>\s*📄 วผ\.17 \(ปลายภาค\)\s*</button>\s*\)\}"

wp17_new = """<button 
                                  onClick={() => t.overall_status_final.includes('สมบูรณ์') && downloadSavedDoc('wp17', t.teacher_name, { mock_subjects: teacherData.filter((td: any) => td.teacher_name === t.teacher_name) })} 
                                  disabled={!t.overall_status_final.includes('สมบูรณ์')}
                                  className={`px-2 py-0.5 text-[11px] rounded-md font-medium transition shadow-2xs flex items-center gap-1 ${t.overall_status_final.includes('สมบูรณ์') ? 'bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-300 cursor-pointer' : 'bg-slate-50 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60 grayscale'}`}
                                  title={t.overall_status_final.includes('สมบูรณ์') ? "ดาวน์โหลด วผ.17 (รายงานการจัดกิจกรรม)" : "ต้องส่งคะแนนปลายภาคให้ครบก่อนจึงจะดาวน์โหลดได้"}
                                >
                                  📄 วผ.17 (ปลายภาค)
                                </button>"""

content = re.sub(wp17_old, wp17_new, content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Dashboard buttons patched to gray out instead of hide.")
