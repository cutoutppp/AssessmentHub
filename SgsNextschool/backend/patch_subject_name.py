import re

with open('main.py', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(
    r'\"subject_name\": s\.get\(\"subject_name\"\),',
    r'\"subject_name\": s.get("subject_name") or "(วิชาจำลองทดสอบ)",',
    content
)

with open('main.py', 'w', encoding='utf-8') as f:
    f.write(content)
