import re

file_path = 'C:/Users/peera/Desktop/AntigravityProject/AssessmentHub/SgsNextschool/backend/doc_generator.py'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the line format in subj_lines
old_line_format = r'line = f"  \{i\+1\}\.   รหัสวิชา \{c\}    ชื่อรายวิชา \{n\}    ระดับชั้นมัธยมศึกษาปีที่ \{l_digit\}    ห้อง \{all_rooms_str\}"'
new_line_format = 'line = f"รหัสวิชา {c}  ชื่อรายวิชา {n}  ระดับชั้นมัธยมศึกษาปีที่ {l_digit}  ห้อง {all_rooms_str}"'

content = re.sub(old_line_format, new_line_format, content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Line format patched successfully")
