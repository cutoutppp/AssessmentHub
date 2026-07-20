import re

file_path = 'C:/Users/peera/Desktop/AntigravityProject/AssessmentHub/SgsNextschool/frontend/src/App.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Update version and date in the header
content = content.replace('v1.2.2</span> (20 กรกฎาคม 2569)', 'v1.2.3</span> (20 กรกฎาคม 2569)')

# Prepare the new v1.2.3 block
v1_2_3_block = """
              <div className="space-y-6 text-sm text-slate-700">
                {/* Version 1.2.3 */}
                <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-blue-900 text-base">✨ เวอร์ชัน v1.2.3</span>
                      <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full font-semibold">ล่าสุด</span>
                    </div>
                    <ul className="space-y-1.5 text-blue-800/80 pl-4 list-disc text-sm">
                      <li><strong className="text-blue-900">อัปเดตระบบฐานข้อมูล:</strong> รองรับการดึงข้อมูล "ชื่อวิชา" (Subject Name) โดยตรงจากฐานข้อมูล Google Sheets ผ่าน Google Apps Script ตัวใหม่</li>
                      <li><strong className="text-blue-900">เอกสารสมบูรณ์ 100%:</strong> เมื่อดาวน์โหลดเอกสาร (วผ.25, วผ.16, วผ.17) จะมีชื่อรายวิชาปรากฏครบถ้วน ไม่เว้นว่างอีกต่อไป</li>
                    </ul>
                  </div>

                {/* Version 1.2.2 */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 opacity-80">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-slate-800 text-base">📌 เวอร์ชัน v1.2.2</div>
                    </div>
                    <ul className="space-y-2.5 text-slate-700 pl-4 list-disc">
"""

# Replace the start of the patch notes with the new block
# We replace up to the start of v1.2.2's inner content
content = re.sub(
    r'<div className="space-y-6 text-sm text-slate-700">\s*\{\/\* Version 1\.2\.1 \*\/\}\s*<div className="bg-blue-50/60 p-4 rounded-xl border border-blue-100 space-y-3">\s*<div className="flex items-center justify-between">\s*<span className="font-bold text-blue-900 text-base">✨ เวอร์ชัน v1\.2\.2<\/span>\s*<span className="text-xs bg-blue-600 text-white px-2 py-0\.5 rounded-full font-semibold">ล่าสุด<\/span>\s*<\/div>\s*<ul className="space-y-1\.5 text-blue-800/80 pl-4 list-disc text-sm">',
    v1_2_3_block + '                      <li><strong className="text-blue-900">เพิ่มปุ่มล้างข้อมูล:</strong>',
    content
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
