import re

file_path = r'C:\Users\peera\Desktop\AntigravityProject\AssessmentHub\SgsNextschool\frontend\src\App.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update header button
header_old = r'<span>v1\.2\.2</span>\s*<span className="text-\[10px\] bg-blue-600 text-white px-1\.5 py-0\.5 rounded-full font-semibold">NEW</span>'
header_new = '<span>v1.2.4</span>'
content = re.sub(header_old, header_new, content)

# 2. Update current version text
version_old = r'เวอร์ชันปัจจุบัน: <span className="text-blue-600 font-bold">v1\.2\.3</span>'
version_new = 'เวอร์ชันปัจจุบัน: <span className="text-blue-600 font-bold">v1.2.4</span>'
content = re.sub(version_old, version_new, content)

# 3. Add v1.2.4 patch notes
v123_old = r'\{/\* Version 1\.2\.3 \*/\}\s*<div className="bg-blue-50/60 p-4 rounded-xl border border-blue-100 space-y-3">\s*<div className="flex items-center justify-between">\s*<span className="font-bold text-blue-900 text-base">✨ เวอร์ชัน v1\.2\.3</span>\s*<span className="text-xs bg-blue-600 text-white px-2 py-0\.5 rounded-full font-semibold">ล่าสุด</span>\s*</div>'

v124_new = """{/* Version 1.2.4 */}
                <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-blue-900 text-base">✨ เวอร์ชัน v1.2.4</span>
                      <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full font-semibold">ล่าสุด</span>
                    </div>
                    <ul className="space-y-1.5 text-blue-800/80 pl-4 list-disc text-sm">
                      <li><strong className="text-blue-900">จัดกลุ่มห้องใน วผ.25:</strong> ระบบจะจัดกลุ่มห้องที่สอนวิชาเดียวกันให้อัตโนมัติ (เช่น ห้อง 1-11) เพื่อให้ง่ายต่อการอ่าน</li>
                      <li><strong className="text-blue-900">ปรับปรุงระยะเว้นวรรค:</strong> ปรับระยะเว้นวรรคในรายวิชาให้สวยงามพอดีกับหน้ากระดาษและไม่ซ้อนกับเลขข้อ</li>
                      <li><strong className="text-blue-900">ปุ่มดาวน์โหลดเอกสารสรุป:</strong> ปรับโฉมปุ่มดาวน์โหลดบันทึกข้อความสรุปกลุ่มสาระฯ ให้โดดเด่นและชัดเจนขึ้น</li>
                      <li><strong className="text-blue-900">ล็อกการดาวน์โหลด:</strong> ระบบจะเปิดให้ดาวน์โหลดเอกสารรายบุคคลได้ เฉพาะเมื่อส่งคะแนนครบสมบูรณ์ 100% แล้วเท่านั้น</li>
                    </ul>
                  </div>

                {/* Version 1.2.3 */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 opacity-80">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-slate-800 text-base">📌 เวอร์ชัน v1.2.3</div>
                    </div>"""

content = re.sub(v123_old, v124_new, content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Patch notes updated successfully!")
