import re

path = r'C:\Users\peera\Desktop\AntigravityProject\MoreSor\web\app\page.js'
with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

replacement = '''                <p className="text-indigo-600 font-medium">เวอร์ชันปัจจุบัน: v1.2.7</p>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-6 text-sm text-slate-600">
              <div>
                <h4 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span> v1.2.7 (Latest Update)
                </h4>
                <ul className="list-disc pl-6 mt-2 space-y-2">
                  <li><strong>ปรับปรุงระบบ Masterdata:</strong> รองรับการดึงข้อมูลวิชาเลือก (เช่น ม.1) และจับคู่ชื่อวิชาแทนรหัสวิชาได้</li>
                  <li><strong>แก้ปัญหา Encoding:</strong> แก้ไขตัวอักษรภาษาต่างดาวในหน้าเว็บและอัปเดต Patch Notes</li>
                  <li><strong>อัปเดต Regex:</strong> ปรับให้ระบบอ่านรหัสวิชาจาก PDF ได้แม่นยำขึ้น</li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-slate-300"></span> v1.2.6
                </h4>
                <ul className="list-disc pl-6 mt-2 space-y-2 text-slate-500">
                  <li>เปลี่ยนสีแถบกลางภาคเป็นสีส้มในแดชบอร์ด</li>
                  <li>อัปเดตสถิติรวมให้นับครูที่ส่งครบถ้วน 100% เท่านั้น</li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-slate-300"></span> v1.2.5
                </h4>
                <ul className="list-disc pl-6 mt-2 space-y-2 text-slate-500">
                  <li>แก้บัคแดชบอร์ดแสดง 0% จาก Google Sheet</li>
                  <li>แก้ไขระบบการดาวน์โหลดเอกสารให้สมบูรณ์</li>
                </ul>
              </div>
            </div>'''

start_marker = '<p className="text-indigo-600 font-medium">'
end_marker = '</button>'

start_idx = text.find(start_marker, text.find('Patch Notes</h3>'))
if start_idx != -1:
    end_idx = text.find(end_marker, start_idx)
    if end_idx != -1:
        new_text = text[:start_idx] + replacement + '\n            ' + text[end_idx:]
        with open(path, 'w', encoding='utf-8') as f:
            f.write(new_text)
        print('Successfully replaced Patch Notes')
    else:
        print('End marker not found')
else:
    print('Start marker not found')
