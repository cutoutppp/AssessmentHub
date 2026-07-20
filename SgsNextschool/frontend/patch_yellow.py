import re

file_path = r'C:\Users\peera\Desktop\AntigravityProject\AssessmentHub\SgsNextschool\frontend\src\Dashboard.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the teacher row start to add isMidtermReady and isFinalReady
row_start_old = r"\{/\* Teacher Main Row \*/\}\s*<tr \s*className=\{`group transition-colors cursor-pointer border-b border-slate-100/80 \$\{isExpanded \? 'bg-blue-50/40' : 'hover:bg-slate-50/80'\}`\}\s*onClick=\{\(\) => toggleTeacher\(t\.teacher_name\)\}\s*>"

row_start_new = """{/* Pre-calculate readiness (allowing yellow warnings) */}
                        {(() => {
                          const isMidtermReady = t.overall_status_midterm.includes('สมบูรณ์') || t.overall_status_midterm.includes('สังเกต');
                          const isFinalReady = t.overall_status_final.includes('สมบูรณ์') || t.overall_status_final.includes('สังเกต');
                          return (
                            <React.Fragment>
                              {/* Teacher Main Row */}
                              <tr 
                                className={`group transition-colors cursor-pointer border-b border-slate-100/80 ${isExpanded ? 'bg-blue-50/40' : 'hover:bg-slate-50/80'}`}
                                onClick={() => toggleTeacher(t.teacher_name)}
                              >"""

content = re.sub(row_start_old, row_start_new, content)

# Now, we need to replace all t.overall_status_midterm.includes('สมบูรณ์') with isMidtermReady inside the buttons area
# But wait, it's easier to just replace the conditions directly if we don't want to mess with JSX wrapping.

# Actually, let's just replace the exact button HTML. I'll read it again to be precise.
