import re

file_path = 'C:/Users/peera/Desktop/AntigravityProject/AssessmentHub/SgsNextschool/backend/doc_generator.py'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r'    subj_lines = \[\]\s+for s in subjects:\s+c = s\["code"\]\s+n = s\["name"\]\s+l_digit, room_no = parse_level_room\(s\["level"\]\)\s+line = f"  รหัสวิชา \{c\}   ชื่อรายวิชา \{n\}   ระดับชั้นมัธยมศึกษาปีที่ \{l_digit\}   ห้อง \{room_no\}"\s+subj_lines\.append\(line\)'

replacement = """
    # Group subjects by code, name, and level digit
    grouped_subjects = {}
    for s in subjects:
        c = s["code"]
        n = s["name"]
        l_digit, room_no = parse_level_room(s["level"])
        key = (c, n, l_digit)
        if key not in grouped_subjects:
            grouped_subjects[key] = []
        if room_no and room_no not in grouped_subjects[key]:
            grouped_subjects[key].append(room_no)
            
    subj_lines = []
    for i, (key, rooms) in enumerate(grouped_subjects.items()):
        c, n, l_digit = key
        
        # Try to parse rooms to integers for sorting and ranging
        int_rooms = []
        str_rooms = []
        for r in rooms:
            try:
                int_rooms.append(int(r))
            except:
                str_rooms.append(r)
                
        int_rooms.sort()
        
        # Combine into ranges (e.g. 1-11)
        ranges = []
        if int_rooms:
            start = int_rooms[0]
            end = int_rooms[0]
            for r in int_rooms[1:]:
                if r == end + 1:
                    end = r
                else:
                    if start == end:
                        ranges.append(str(start))
                    elif end == start + 1:
                        ranges.append(f"{start}, {end}")
                    else:
                        ranges.append(f"{start}-{end}")
                    start = r
                    end = r
            if start == end:
                ranges.append(str(start))
            elif end == start + 1:
                ranges.append(f"{start}, {end}")
            else:
                ranges.append(f"{start}-{end}")
                
        all_rooms_str = ", ".join(ranges + str_rooms)
        
        line = f"  {i+1}.   รหัสวิชา {c}    ชื่อรายวิชา {n}    ระดับชั้นมัธยมศึกษาปีที่ {l_digit}    ห้อง {all_rooms_str}"
        subj_lines.append(line)
"""

if "grouped_subjects =" not in content:
    content = re.sub(pattern, replacement.strip('\n'), content)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Patched successfully")
else:
    print("Already patched")
 
