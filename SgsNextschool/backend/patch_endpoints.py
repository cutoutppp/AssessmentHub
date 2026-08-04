import re

file_path = 'C:/Users/peera/Desktop/AntigravityProject/AssessmentHub/SgsNextschool/backend/main.py'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

def inject_mock_subjects(endpoint_func_name, doc_gen_func, is_wp25=False):
    pattern = rf'(@app\.post\("/api/export/.*?/saved"\)\s+async def {endpoint_func_name}\(request: Request\):\s+try:\s+data = await request\.json\(\)\s+teacher_name = data\.get\("teacher_name"\)\s+(?:subject_group = data\.get\("subject_group"\)\s+)?subject_code = data\.get\("subject_code", None\))(.*?)(?=doc_bytes = {doc_gen_func})'
    
    # We replace the middle part (the room logic)
    
    mock_logic = """
        mock_subjects = data.get("mock_subjects", [])
        
        rooms = get_rooms_for_subject(teacher_name, subject_code)
        if not rooms and mock_subjects:
            rooms = []
            for s in mock_subjects:
                rooms.append({
                    "subject_code": s.get("subject_code"),
                    "teacher_info": {
                        "teacher_name": teacher_name,
                        "subject_name": s.get("subject_name", ""),
                        "class_level": s.get("class_level", ""),
                        "subject_group": data.get("subject_group", "")
                    },
                    "raw_data": {
                        "sgs_students": {
                           "1": {"student_id": "10001", "prefix": "นาย", "firstname": "ทดสอบ", "lastname": "ระบบดาวน์โหลด", "grade": "4.0", "attributes": "3", "reading": "3"},
                           "2": {"student_id": "10002", "prefix": "นางสาว", "firstname": "ตัวอย่าง", "lastname": "ทดสอบเอกสาร", "grade": "3.5", "attributes": "3", "reading": "3"}
                        }
                    }
                })
        elif not rooms:
            rooms = _get_fallback_demo_rooms(teacher_name)
            
        """
    def repl(m):
        return m.group(1) + "\n" + mock_logic
        
    return re.sub(pattern, repl, content, flags=re.DOTALL)

content = inject_mock_subjects('api_export_wp16_saved', 'generate_wp16')
content = inject_mock_subjects('api_export_wp17_saved', 'generate_wp17')
content = inject_mock_subjects('api_export_wp25_saved', 'generate_wp25')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
