import re

with open('C:/Users/peera/Desktop/AntigravityProject/AssessmentHub/SgsNextschool/frontend/src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace version in button
content = content.replace('<span>v1.2.1</span>', '<span>v1.2.2</span>')

# Replace version in current version text
content = content.replace('<span className="text-blue-600 font-bold">v1.2.1</span>', '<span className="text-blue-600 font-bold">v1.2.2</span>')

# Shift latest block to older block
new_notes = """
                <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-blue-900 text-base">✨ เวอร์ชัน v1.2.2</span>
                    <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full font-semibold">ล่าสุด</span>
                  </div>
                  <ul className="space-y-1.5 text-blue-800/80 pl-4 list-disc text-sm">
                    <li><strong className="text-blue-900">เพิ่มปุ่มล้างข้อมูล:</strong> ล้างฐานข้อมูลการส่งเกรดใน Dashboard สำหรับทดสอบระบบใหม่ได้ง่ายๆ</li>
                    <li><strong className="text-blue-900">ระบบทดสอบอัจฉริยะ:</strong> หากกดดาวน์โหลดเอกสารโดยที่ไม่มีข้อมูลส่งเกรด ระบบจะสร้างเอกสารจำลองจากวิชาที่ครูท่านนั้นสอนทั้งหมดให้เลย</li>
                    <li><strong className="text-blue-900">แก้บั๊กแจ้งเตือน:</strong> เพิ่มข้อความแจ้งเตือนสีแดงในหน้าระบบตรวจ หากระบบต้องเดาวิชาแทนเพราะหาข้อมูลในฐานข้อมูลไม่เจอ</li>
                    <li><strong className="text-blue-900">ปรับปรุงความแม่นยำ:</strong> ระบบจับคู่ชั้นเรียนฉลาดขึ้นมาก รองรับการเขียนแบบ "4 ห้อง 1" หรือ "ม.4/1" หรือแบบเป็นช่วงชั้นเรียน</li>
                  </ul>
                </div>

                {/* Version 1.2.1 */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 opacity-80">
                  <div className="font-bold text-slate-800 text-base">📌 เวอร์ชัน v1.2.1</div>
"""

content = re.sub(
    r'<div className="bg-blue-50/60 p-4 rounded-xl border border-blue-100 space-y-3">\s*<div className="flex items-center justify-between">\s*<span className="font-bold text-blue-900 text-base">✨ เวอร์ชัน v1.2.1</span>',
    new_notes.strip(),
    content
)

with open('C:/Users/peera/Desktop/AntigravityProject/AssessmentHub/SgsNextschool/frontend/src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
