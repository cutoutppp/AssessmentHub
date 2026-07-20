import re

with open('C:/Users/peera/Desktop/AntigravityProject/AssessmentHub/SgsNextschool/frontend/src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(
    r"\{ teacher_name: teacherName, subject_group: extraData\?\.subject_group \};",
    r"{ teacher_name: teacherName, subject_group: extraData?.subject_group, mock_subjects: extraData?.mock_subjects };",
    content
)

with open('C:/Users/peera/Desktop/AntigravityProject/AssessmentHub/SgsNextschool/frontend/src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
