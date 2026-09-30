from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
import io
import base64
from urllib.parse import quote
import pdfplumber
from parser import parse_sgs_pdf, parse_nextschool_excel
from validator import validate_scores
from doc_generator import generate_wp16, generate_wp17, generate_wp25, generate_wp25_group
from work_db import get_works_for_teacher, add_work, get_rooms_for_subject, get_rooms_for_group
from score_db import load_scores_from_json
from wp16_db import save_pending_tasks, get_pending_tasks_for_subject, get_all_pending_tasks

app = FastAPI(title="SGS vs NextSchool Score Checker")

# Allow CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "Backend is running"}

@app.post("/api/compare")
async def compare_pdfs(
    files: list[UploadFile] = File(...),
    round_type: str = Form("final"),
    master_scores: str = Form(None)
):
    if master_scores:
        load_scores_from_json(master_scores)
        
    if len(files) < 2:
        raise HTTPException(status_code=400, detail="กรุณาอัปโหลดไฟล์ PDF อย่างน้อย 2 ไฟล์")
        
    for f in files:
        if not (f.filename.lower().endswith('.pdf') or f.filename.lower().endswith('.xlsx')):
            raise HTTPException(status_code=400, detail="ไฟล์ทั้งหมดต้องเป็นนามสกุล .pdf หรือ .xlsx เท่านั้น")
    
    sgs_files = []
    ns_files = []
    unmatched_files = []
    
    for f in files:
        content = await f.read()
        
        if f.filename.lower().endswith('.xlsx'):
            ns_data = parse_nextschool_excel(content, f.filename)
            if ns_data and len(ns_data.get("students", {})) > 0:
                ns_files.append({"filename": f.filename, "content": content, "data": ns_data})
            else:
                unmatched_files.append(f.filename)
        else:
            # Try parsing as SGS
            sgs_data = parse_sgs_pdf(content)
            if sgs_data and len(sgs_data.get("students", {})) > 0:
                sgs_files.append({"filename": f.filename, "content": content, "data": sgs_data})
            else:
                unmatched_files.append(f.filename)

    possible_pairs = []
    
    for s_idx, sgs in enumerate(sgs_files):
        sgs_students = set(sgs["data"]["students"].keys())
        sgs_subject = sgs["data"].get("subject_code", "")
        
        for n_idx, ns in enumerate(ns_files):
            ns_students = set(ns["data"]["students"].keys())
            ns_subject = ns["data"].get("subject_code", "")
            
            intersection = len(sgs_students & ns_students)
            if intersection == 0:
                continue
                
            score = intersection
            
            # Tie-breaker: If subject codes match, prioritize this pair heavily!
            if sgs_subject and ns_subject:
                # E.g. ส33205 == ส33205
                if sgs_subject == ns_subject:
                    score += 1000
                # E.g. ส33205 and 33205 (partial exact match ignoring prefix)
                elif sgs_subject[-5:] == ns_subject[-5:]:
                    score += 500
                    
            possible_pairs.append((score, s_idx, n_idx))
            
    # Sort possible pairs by score descending to assign best matches first
    possible_pairs.sort(key=lambda x: x[0], reverse=True)
    
    pairs = []
    used_sgs = set()
    used_ns = set()
    
    for score, s_idx, n_idx in possible_pairs:
        if s_idx in used_sgs or n_idx in used_ns:
            continue
        pairs.append((sgs_files[s_idx], ns_files[n_idx]))
        used_sgs.add(s_idx)
        used_ns.add(n_idx)
            
    for i, sgs in enumerate(sgs_files):
        if i not in used_sgs:
            unmatched_files.append(sgs["filename"])
            
    for i, ns in enumerate(ns_files):
        if i not in used_ns:
            unmatched_files.append(ns["filename"])
            
    if not pairs:
        if len(sgs_files) == 0 and len(ns_files) == 0:
            raise HTTPException(status_code=400, detail="ไม่สามารถอ่านข้อมูลคะแนนจากไฟล์ที่อัปโหลดได้เลย โปรดตรวจสอบว่าเป็นไฟล์ ปพ.5 ของ SGS (PDF) หรือ Excel ของ NextSchool (.xlsx) ที่ถูกต้อง")
        elif len(sgs_files) == 0:
            raise HTTPException(status_code=400, detail="ไม่พบไฟล์คะแนนจากระบบ SGS (PDF) โปรดตรวจสอบว่าได้เลือกไฟล์ ปพ.5 ของ SGS เข้ามาด้วยหรือไม่")
        elif len(ns_files) == 0:
            raise HTTPException(status_code=400, detail="ไม่พบไฟล์คะแนนจากระบบ NextSchool (.xlsx) โปรดตรวจสอบว่าได้เลือกไฟล์ Excel ของ NextSchool เข้ามาด้วยหรือไม่")
        else:
            raise HTTPException(status_code=400, detail="ไม่สามารถจับคู่ไฟล์ได้: ตรวจพบไฟล์ทั้งสองระบบ แต่ไม่มีรายชื่อนักเรียนหรือรหัสวิชาตรงกัน โปรดตรวจสอบว่าเลือกไฟล์ของวิชาและห้องเดียวกันหรือไม่")

    try:
        def render_annotated_pdf(file_content, highlights):
            import fitz
            pages_to_render = {}
            for h in highlights:
                p = h["page"]
                if p not in pages_to_render:
                    pages_to_render[p] = []
                pages_to_render[p].append(h)
                
            result_images = []
            doc = fitz.open(stream=file_content, filetype="pdf")
            for page_num in range(len(doc)):
                page = doc[page_num]
                page_highlights = pages_to_render.get(page_num, [])
                
                # Sort highlights so yellow is drawn first, then red on top
                page_highlights.sort(key=lambda h: 1 if h["color"] == "red" else 0)
                
                for h in page_highlights:
                    bbox = h["bbox"]
                    rect = fitz.Rect(bbox["x0"], bbox["top"], bbox["x1"], bbox["bottom"])
                    if h["color"] == "red":
                        color = (1, 0, 0)
                        fill_color = (1, 0.8, 0.8)
                    elif h["color"] == "green":
                        color = (0, 0.8, 0)
                        fill_color = (0.8, 1, 0.8)
                    else:
                        color = (1, 0.7, 0)
                        fill_color = (1, 0.95, 0.7)
                    page.draw_rect(rect, color=color, width=2, fill=fill_color, fill_opacity=0.4)
                    
                pix = page.get_pixmap(dpi=150)
                base64_img = base64.b64encode(pix.tobytes("png")).decode('utf-8')
                result_images.append(f"data:image/png;base64,{base64_img}")
                
            # ส่งกลับไฟล์ต้นฉบับแทนไฟล์ที่ผ่านการวาดกล่องทับ เพื่อป้องกันปัญหาไฟล์เสีย
            doc.close()
            doc_base64 = base64.b64encode(file_content).decode('utf-8')
            return result_images, doc_base64

        pair_results = []
        for sgs, ns in pairs:
            results = validate_scores(sgs["data"], ns["data"], round_type=round_type)
            
            sgs_images, sgs_pdf_b64 = render_annotated_pdf(sgs["content"], results.get("sgs_highlights", []))
            
            next_images = []
            nextschool_pdf_b64 = base64.b64encode(ns["content"]).decode('utf-8') if ns.get("content") else ""
            results["nextschool_data"] = ns["data"]
            
            results["sgs_images"] = sgs_images
            results["nextschool_images"] = next_images
            results["sgs_pdf_b64"] = sgs_pdf_b64
            results["nextschool_pdf_b64"] = nextschool_pdf_b64
            
            if ns["data"].get("is_excel"):
                results["highlights"] = {
                    "nextschool": results.get("nextschool_highlights", [])
                }
            
            results.pop("sgs_highlights", None)
            results.pop("nextschool_highlights", None)
            
            subject_code = sgs["data"].get("subject_code", "Unknown")
            subject_name = sgs["data"].get("subject_name", "")
            class_level = sgs["data"].get("class_level", "")
            
            pair_results.append({
                "sgs_filename": sgs["filename"],
                "nextschool_filename": ns["filename"],
                "subject_code": subject_code,
                "subject_name": subject_name,
                "class_level": class_level,
                "raw_data": {
                    "sgs_students": sgs["data"]["students"],
                    "nextschool_students": ns["data"]["students"],
                    "nextschool_mapping": ns["data"].get("mapping", {})
                },
                "results": results
            })
            
        return {
            "status": "success",
            "data": {
                "pairs": pair_results,
                "unmatched": unmatched_files
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/export/wp16")
async def export_wp16(request: Request):
    try:
        data = await request.json()
        pair_results = data.get("pairs", [])
        doc_bytes = generate_wp16(pair_results)
        if not doc_bytes:
            raise HTTPException(status_code=404, detail="Template not found")
            
        return Response(
            content=doc_bytes,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": f"attachment; filename=WP16.docx"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/export/wp17")
async def export_wp17(request: Request):
    try:
        data = await request.json()
        pair_results = data.get("pairs", [])
        doc_bytes = generate_wp17(pair_results)
        if not doc_bytes:
            raise HTTPException(status_code=404, detail="Template not found")
            
        return Response(
            content=doc_bytes,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": f"attachment; filename=WP17.docx"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/works")
async def api_get_works(teacher_name: str = None):
    works = get_works_for_teacher(teacher_name)
    return {"status": "success", "data": works}

@app.get("/api/clear_db")
async def clear_db():
    import work_db
    work_db._save_db({})
    return {"status": "cleared"}

@app.post("/api/test_extract")
async def test_extract(request: Request):
    data = await request.json()
    from parser import extract_class_level, extract_subject_code, extract_subject_name
    text = data.get("text", "")
    return {
        "class_level": extract_class_level(text),
        "subject_code": extract_subject_code(text),
        "subject_name": extract_subject_name(text)
    }

@app.post("/api/queue_save")
async def api_queue_save(request: Request):
    try:
        data = await request.json()
        webhook_url = data.get("webhookUrl")
        payload = data.get("payload")
        if not webhook_url:
            return {"status": "error", "message": "No webhookUrl provided"}
        import requests
        resp = requests.post(webhook_url, json=payload, headers={"Content-Type": "text/plain;charset=utf-8"}, timeout=60)
        try:
            return resp.json()
        except Exception:
            return {"status": "success", "raw": resp.text}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/api/save_work")
async def api_save_work(request: Request):
    try:
        data = await request.json()
        pairs = data.get("pairs")
        if not pairs:
            single = data.get("pair")
            pairs = [single] if single else []
        if not pairs:
            return {"status": "error", "message": "No pair data"}

        academic_year = str(data.get("academic_year") or "2569")
        semester = str(data.get("semester") or "1")
        webhook_url = data.get("webhookUrl") or data.get("webhook_url")
        explicit_failing = data.get("failing_students") or []

        total_failing = 0
        for pair_data in pairs:
            if not pair_data:
                continue
            sgs_info = pair_data.get("sgs") or {}
            teacher_info = pair_data.get("teacher_info") or {}
            teacher_name = data.get("teacher_name") or pair_data.get("teacher_name") or teacher_info.get("teacher_name") or sgs_info.get("teacher_name", "Unknown Teacher")
            subject_code = pair_data.get("subject_code") or teacher_info.get("subject_code") or sgs_info.get("subject_code", "Unknown Subject")
            class_level = pair_data.get("class_level") or teacher_info.get("class_level") or sgs_info.get("grade_level", "Unknown Class")
            subject_name = pair_data.get("subject_name") or teacher_info.get("subject_name") or sgs_info.get("subject_name", "")

            # Save to work_db
            add_work(teacher_name, subject_code, class_level, pair_data)

            # Auto-extract failing students (0, ร, มส, มผ) or manual additions to WP16_งานค้าง
            failing_list = list(explicit_failing)
            seen_ids = {str(s.get("student_id")).strip() for s in failing_list if s.get("student_id")}

            raw = pair_data.get("raw_data") or {}
            sgs_students = raw.get("sgs_students") or {}

            if isinstance(sgs_students, list):
                sgs_iter = [(s.get("student_id", ""), s) for s in sgs_students]
            elif isinstance(sgs_students, dict):
                sgs_iter = list(sgs_students.items())
            else:
                sgs_iter = []

            for sid, s in sgs_iter:
                sid = str(sid or s.get("student_id", "")).strip()
                if not sid or sid in seen_ids:
                    continue
                grade = str(s.get("grade", "")).strip()
                if grade.endswith(".0"):
                    grade = grade[:-2]
                is_man = bool(s.get("is_manual", False))
                if grade in ["0", "ร", "มส", "มผ"] or is_man:
                    seen_ids.add(sid)
                    s_name = s.get("name", "")
                    if not s_name:
                        s_name = (s.get("prefix", "") + s.get("firstname", "") + " " + s.get("lastname", "")).strip()

                    default_task = "สอบแก้ตัว" if grade == "0" else ("มส. (ขาดเรียนเกิน 20%)" if grade == "มส" else "")
                    default_remark = "[เพิ่มเอง]" if is_man else ("[มส. ประกาศทางการ]" if grade == "มส" else "")

                    failing_list.append({
                        "student_id": sid,
                        "student_name": s_name,
                        "class_level": class_level,
                        "old_score": str(s.get("total", "") or s.get("score", "") or s.get("raw_score", "")),
                        "old_grade": grade,
                        "pending_task": s.get("pending_task") or default_task,
                        "remark": s.get("remark") or default_remark,
                        "academic_year": academic_year,
                        "semester": semester,
                        "is_manual": is_man
                    })

            if failing_list:
                total_failing += len(failing_list)
                save_pending_tasks(teacher_name, subject_code, subject_name, failing_list, academic_year, semester, webhook_url=webhook_url)

        return {"status": "success", "failing_count": total_failing}
    except Exception as e:
        return {"status": "error", "message": str(e)}

def _get_fallback_demo_rooms(name):
    return [{
        "teacher_name": name or "ครูผู้สอนทดสอบ",
        "subject_code": "ว30101",
        "subject_name": "วิทยาศาสตร์กายภาพ",
        "class_level": "ม.4/1",
        "raw_data": {
            "sgs_students": {
                "1": {"student_id": "10001", "prefix": "นาย", "firstname": "ทดสอบ", "lastname": "ระบบดาวน์โหลด", "grade": "4.0", "attributes": "3", "reading": "3"},
                "2": {"student_id": "10002", "prefix": "นางสาว", "firstname": "ตัวอย่าง", "lastname": "ทดสอบเอกสาร", "grade": "3.5", "attributes": "3", "reading": "3"}
            }
        }
    }]

@app.post("/api/export/wp16/saved")
async def api_export_wp16_saved(request: Request):
    try:
        data = await request.json()
        teacher_name = data.get("teacher_name", "")
        subject_code = data.get("subject_code", "")
        subject_name = data.get("subject_name", "")
        academic_year = str(data.get("academic_year", "2569"))
        semester = str(data.get("semester", "1"))
        students = data.get("students", [])
        webhook_url = data.get("webhookUrl") or data.get("webhook_url")

        if not students:
            rooms = get_rooms_for_subject(teacher_name, subject_code)
            doc_bytes = generate_wp16(pair_results=rooms, subject_code=subject_code, subject_name=subject_name, teacher_name=teacher_name, term=semester, year=academic_year)
        else:
            save_pending_tasks(teacher_name, subject_code, subject_name, students, academic_year, semester, webhook_url=webhook_url)
            doc_bytes = generate_wp16(subject_code=subject_code, subject_name=subject_name, teacher_name=teacher_name, students=students, term=semester, year=academic_year)

        if not doc_bytes:
            raise HTTPException(status_code=404, detail="Template not found")

        filename = f"WP16_{subject_code}_{teacher_name}.docx" if subject_code else f"WP16_{teacher_name}.docx"
        encoded_fn = quote(filename)
        return Response(
            content=doc_bytes,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": f"attachment; filename*=UTF-8''{encoded_fn}"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/export/wp16/zip")
async def api_export_wp16_zip(teacher_name: str, academic_year: str = "2568", semester: str = "2"):
    try:
        import zipfile
        rooms = get_rooms_for_subject(teacher_name, None)
        if not rooms:
            raise HTTPException(status_code=404, detail="No rooms found for this teacher")

        subjects = {}
        for r in rooms:
            scode = r.get("subject_code")
            t_info = r.get("teacher_info") or {}
            sname = t_info.get("subject_name", "")
            if scode not in subjects:
                subjects[scode] = {"name": sname, "rooms": []}
            subjects[scode]["rooms"].append(r)

        zip_buffer = io.BytesIO()
        count_docs = 0

        with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
            for scode, sinfo in subjects.items():
                existing_tasks = get_pending_tasks_for_subject(scode, teacher_name)
                failing = []
                seen = set()
                for r in sinfo["rooms"]:
                    c_level = (r.get("teacher_info") or {}).get("class_level", "")
                    raw = r.get("raw_data") or {}
                    sgs_students = raw.get("sgs_students") or {}
                    sgs_iter = [(s.get("student_id", ""), s) for s in sgs_students] if isinstance(sgs_students, list) else (sgs_students.items() if isinstance(sgs_students, dict) else [])
                    for sid, s in sgs_iter:
                        sid = str(sid or s.get("student_id", "")).strip()
                        if not sid or sid in seen:
                            continue
                        grade = str(s.get("grade", "")).strip()
                        if grade.endswith(".0"):
                            grade = grade[:-2]
                        if grade in ["0", "ร", "มส", "มผ"]:
                            seen.add(sid)
                            old_t = existing_tasks.get(sid, {})
                            s_name = s.get("name", "")
                            if not s_name:
                                s_name = (s.get("prefix", "") + s.get("firstname", "") + " " + s.get("lastname", "")).strip()
                            failing.append({
                                "student_id": sid,
                                "student_name": s_name,
                                "class_level": c_level,
                                "old_score": str(s.get("total", "") or s.get("score", "")),
                                "old_grade": grade,
                                "pending_task": old_t.get("pending_task", ""),
                                "remark": old_t.get("remark", "")
                            })
                if failing:
                    doc_bytes = generate_wp16(subject_code=scode, subject_name=sinfo["name"], teacher_name=teacher_name, students=failing, term=semester, year=academic_year)
                    if doc_bytes:
                        count_docs += 1
                        doc_filename = f"WP16_{scode}_{teacher_name}.docx"
                        zip_file.writestr(doc_filename, doc_bytes)

        if count_docs == 0:
            raise HTTPException(status_code=404, detail="ไม่มีนักเรียนติด 0, ร, มส ในวิชาใดๆ ของครูท่านนี้")

        zip_buffer.seek(0)
        filename = f"WP16_รวมทุกวิชา_{teacher_name}.zip"
        encoded_fn = quote(filename)
        return Response(
            content=zip_buffer.read(),
            media_type="application/zip",
            headers={"Content-Disposition": f"attachment; filename*=UTF-8''{encoded_fn}"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/export/wp17/saved")
async def api_export_wp17_saved(request: Request):
    try:
        data = await request.json()
        teacher_name = data.get("teacher_name")
        subject_code = data.get("subject_code", None)

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
            
        doc_bytes = generate_wp17(rooms)
        if not doc_bytes:
            raise HTTPException(status_code=404, detail="Template not found")
            
        filename = f"WP17_{subject_code}.docx" if subject_code else f"WP17_{teacher_name}.docx"
        encoded_fn = quote(filename)
        return Response(
            content=doc_bytes,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": f"attachment; filename*=UTF-8''{encoded_fn}"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/export/wp25")
async def export_wp25(request: Request):
    try:
        data = await request.json()
        pair_results = data.get("pairs", [])
        doc_bytes = generate_wp25(pair_results)
        if not doc_bytes:
            raise HTTPException(status_code=404, detail="Template not found")
            
        return Response(
            content=doc_bytes,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": f"attachment; filename=WP25.docx"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/export/wp25/saved")
async def api_export_wp25_saved(request: Request):
    try:
        data = await request.json()
        teacher_name = data.get("teacher_name")
        subject_group = data.get("subject_group")
        subject_code = data.get("subject_code", None)

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
            
        doc_bytes = generate_wp25(rooms, explicit_teacher_name=teacher_name, explicit_subject_group=subject_group)
        if not doc_bytes:
            raise HTTPException(status_code=404, detail="Template not found")
            
        filename = f"WP25_{subject_code}.docx" if subject_code else f"WP25_{teacher_name}.docx"
        encoded_fn = quote(filename)
        return Response(
            content=doc_bytes,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": f"attachment; filename*=UTF-8''{encoded_fn}"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/export/wp25_group/saved")
async def api_export_wp25_group_saved(request: Request):
    try:
        data = await request.json()
        group_name = data.get("group_name") or data.get("teacher_name")
        head_name = data.get("head_name", "")
        teachers = data.get("teachers", [])
        
        rooms = get_rooms_for_group(group_name, teachers)
        if not rooms:
            rooms = _get_fallback_demo_rooms(group_name)
            
        doc_bytes = generate_wp25_group(rooms, group_name, head_name, teachers)
        if not doc_bytes:
            raise HTTPException(status_code=404, detail="Template not found")
            
        filename = f"รายงานส่งคะแนนเก็บ_กลุ่มสาระ_{group_name}.docx"
        encoded_fn = quote(filename)
        return Response(
            content=doc_bytes,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": f"attachment; filename*=UTF-8''{encoded_fn}"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────────────────
#  WP16 Pending Tasks (งานค้าง) – สำหรับนักเรียนที่ได้ 0/ร/มส/มผ
# ─────────────────────────────────────────────────────────

@app.get("/api/wp16/students")
async def api_get_wp16_students(subject_code: str, teacher_name: str = ""):
    """ดึงรายชื่อนักเรียนที่ได้เกรด 0/ร/มส/มผ พร้อมงานค้างที่บันทึกไว้"""
    try:
        rooms = get_rooms_for_subject(teacher_name, subject_code)
        existing_tasks = get_pending_tasks_for_subject(subject_code, teacher_name)

        subject_name = ""
        students = []
        seen_sids = set()

        for r in rooms:
            t_info = r.get("teacher_info") or {}
            if not subject_name:
                subject_name = t_info.get("subject_name", "")

            raw = r.get("raw_data") or {}
            sgs_students = raw.get("sgs_students") or {}
            sgs_iter = (
                [(s.get("student_id", ""), s) for s in sgs_students]
                if isinstance(sgs_students, list)
                else (sgs_students.items() if isinstance(sgs_students, dict) else [])
            )

            for sid, s in sgs_iter:
                sid = str(sid or s.get("student_id", "")).strip()
                if not sid or sid in seen_sids:
                    continue
                grade = str(s.get("grade", "")).strip()
                if grade.endswith(".0"):
                    grade = grade[:-2]
                if grade in ["0", "ร", "มส", "มผ"]:
                    seen_sids.add(sid)
                    old_task = existing_tasks.get(sid, {})
                    s_name = s.get("name", "")
                    if not s_name:
                        s_name = (
                            s.get("prefix", "") + s.get("firstname", "") + " " + s.get("lastname", "")
                        ).strip()
                    students.append({
                        "student_id": sid,
                        "student_name": s_name,
                        "class_level": t_info.get("class_level", ""),
                        "old_score": str(s.get("total", "") or s.get("score", "") or ""),
                        "old_grade": grade,
                        "pending_task": old_task.get("pending_task", ""),
                        "remark": old_task.get("remark", ""),
                        "is_manual": old_task.get("is_manual", False),
                    })

        # เพิ่มนักเรียนที่มีงานค้างบันทึกไว้แล้วแต่ไม่อยู่ใน room data
        for sid, t_item in existing_tasks.items():
            if sid not in seen_sids:
                seen_sids.add(sid)
                students.append({
                    "student_id": sid,
                    "student_name": t_item.get("student_name", ""),
                    "class_level": t_item.get("class_level", ""),
                    "old_score": str(t_item.get("old_score", "")),
                    "old_grade": str(t_item.get("old_grade", "0")),
                    "pending_task": t_item.get("pending_task", ""),
                    "remark": t_item.get("remark", ""),
                    "is_manual": t_item.get("is_manual", True),
                })

        # ดึง recent tasks ที่เคยใช้บ่อย
        all_db_tasks = get_all_pending_tasks()
        recent_set = set()
        for item in all_db_tasks:
            t = (item.get("pending_task") or "").strip()
            if t and t != "สอบแก้ตัว":
                if item.get("teacher_name") == teacher_name or item.get("subject_code") == subject_code:
                    recent_set.add(t)

        return {
            "status": "success",
            "teacher_name": teacher_name,
            "subject_code": subject_code,
            "subject_name": subject_name,
            "total": len(students),
            "students": students,
            "recent_tasks": list(recent_set),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/wp16/save")
async def api_save_wp16_tasks(request: Request):
    """บันทึกงานค้างของนักเรียน"""
    try:
        data = await request.json()
        teacher_name = data.get("teacher_name", "")
        subject_code = data.get("subject_code", "")
        subject_name = data.get("subject_name", "")
        academic_year = str(data.get("academic_year", "2569"))
        semester = str(data.get("semester", "1"))
        students = data.get("students", [])
        webhook_url = data.get("webhookUrl") or data.get("webhook_url")

        save_pending_tasks(teacher_name, subject_code, subject_name, students, academic_year, semester, webhook_url=webhook_url)
        return {"status": "success", "count": len(students)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
