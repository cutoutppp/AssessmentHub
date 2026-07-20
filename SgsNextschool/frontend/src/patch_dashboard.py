import re

with open('C:/Users/peera/Desktop/AntigravityProject/AssessmentHub/SgsNextschool/frontend/src/Dashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(
    r"downloadSavedDoc\('wp25', t\.teacher_name, \{ subject_group: t\.subject_group \}\)",
    r"downloadSavedDoc('wp25', t.teacher_name, { subject_group: t.subject_group, mock_subjects: teacherData.filter((td: any) => td.teacher_name === t.teacher_name) })",
    content
)
content = re.sub(
    r"downloadSavedDoc\('wp16', t\.teacher_name\)",
    r"downloadSavedDoc('wp16', t.teacher_name, { mock_subjects: teacherData.filter((td: any) => td.teacher_name === t.teacher_name) })",
    content
)
content = re.sub(
    r"downloadSavedDoc\('wp17', t\.teacher_name\)",
    r"downloadSavedDoc('wp17', t.teacher_name, { mock_subjects: teacherData.filter((td: any) => td.teacher_name === t.teacher_name) })",
    content
)

with open('C:/Users/peera/Desktop/AntigravityProject/AssessmentHub/SgsNextschool/frontend/src/Dashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
