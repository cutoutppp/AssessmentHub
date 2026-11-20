"""
Build TestBlueprint/templates/wp29_template.docx from the original วผ29 docx.
Keeps only the วผ.29 "โครงสร้างของแบบทดสอบ" section (pages 3-4) with exact styling,
inserts single-run {{...}} placeholders, and leaves 1 template table row + 1 total row.
"""
import os
import re
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_DOCX = os.path.join(ROOT, "วผ29 โครงสร้างของแบบทดสอบ-3.docx")
OUT_DOCX = os.path.join(ROOT, "templates", "wp29_template.docx")

RPR_BOLD_32 = (
    '<w:rPr><w:rFonts w:ascii="TH SarabunPSK" w:hAnsi="TH SarabunPSK" '
    'w:cs="TH SarabunPSK" w:hint="cs"/><w:b/><w:bCs/>'
    '<w:sz w:val="32"/><w:szCs w:val="32"/><w:cs/></w:rPr>'
)
RPR_BOLD_32_DOT = (
    '<w:rPr><w:rFonts w:ascii="TH SarabunPSK" w:hAnsi="TH SarabunPSK" '
    'w:cs="TH SarabunPSK" w:hint="cs"/><w:b/><w:bCs/>'
    '<w:sz w:val="32"/><w:szCs w:val="32"/><w:u w:val="dotted"/><w:cs/></w:rPr>'
)
RPR_32 = (
    '<w:rPr><w:rFonts w:ascii="TH SarabunPSK" w:hAnsi="TH SarabunPSK" '
    'w:cs="TH SarabunPSK" w:hint="cs"/>'
    '<w:sz w:val="32"/><w:szCs w:val="32"/><w:cs/></w:rPr>'
)
RPR_32_DOT = (
    '<w:rPr><w:rFonts w:ascii="TH SarabunPSK" w:hAnsi="TH SarabunPSK" '
    'w:cs="TH SarabunPSK" w:hint="cs"/>'
    '<w:sz w:val="32"/><w:szCs w:val="32"/><w:u w:val="dotted"/><w:cs/></w:rPr>'
)


def run(rpr, text, space_preserve=False):
    attr = ' xml:space="preserve"' if space_preserve or text.startswith(" ") or text.endswith(" ") else ""
    return f"<w:r>{rpr}<w:t{attr}>{text}</w:t></w:r>"


def build():
    os.makedirs(os.path.dirname(OUT_DOCX), exist_ok=True)
    with zipfile.ZipFile(SRC_DOCX, "r") as zin:
        doc_xml = zin.read("word/document.xml").decode("utf-8")
        rels_xml = zin.read("word/_rels/document.xml.rels").decode("utf-8")
        other_files = {
            name: zin.read(name)
            for name in zin.namelist()
            if name not in (
                "word/document.xml",
                "word/_rels/document.xml.rels",
                "word/media/image1.jpeg",
                "word/media/image2.png",
            )
        }

    # Remove unused image rels (rId6, rId7) from document.xml.rels
    rels_xml = re.sub(r'<Relationship[^>]*Id="rId[67]"[^>]*/>', "", rels_xml)

    # Slice body from emblem paragraph (paraId="64851E58") onwards
    body_start = doc_xml.index("<w:body>") + len("<w:body>")
    emblem_start = doc_xml.index('<w:p w14:paraId="64851E58"')
    tbl_start = doc_xml.index("<w:tbl>", emblem_start)
    tbl_end = doc_xml.index("</w:tbl>", tbl_start) + len("</w:tbl>")

    head = doc_xml[:body_start]
    pre_tbl = doc_xml[emblem_start:tbl_start]
    tbl_xml = doc_xml[tbl_start:tbl_end]
    post_tbl = doc_xml[tbl_end:]

    # Parse paragraphs in pre_tbl (P[36]..P[49])
    p_matches = list(re.finditer(r"<w:p\b.*?</w:p>", pre_tbl, re.S))
    assert len(p_matches) == 14, f"Expected 14 paragraphs, got {len(p_matches)}"

    def replace_p(idx, new_inner_runs):
        p_xml = p_matches[idx].group(0)
        ppr_m = re.search(r"<w:pPr>.*?</w:pPr>", p_xml, re.S)
        ppr = ppr_m.group(0) if ppr_m else ""
        return f"<w:p>{ppr}{new_inner_runs}</w:p>"

    # P[36] (idx 0): school emblem — untouched
    p36 = p_matches[0].group(0)

    # P[37] (idx 1): โครงสร้างของแบบทดสอบ กลุ่มสาระการเรียนรู้{{learning_area}}
    p37 = replace_p(
        1,
        run(RPR_BOLD_32, "โครงสร้างของแบบทดสอบ กลุ่มสาระการเรียนรู้", True)
        + run(RPR_BOLD_32_DOT, "{{learning_area}}"),
    )

    # P[38] (idx 2): รหัสวิชา {{course_code}} ชื่อวิชา {{course_name}} ระดับชั้น {{grade_level}}
    p38 = replace_p(
        2,
        run(RPR_BOLD_32, "รหัสวิชา ")
        + run(RPR_BOLD_32_DOT, " {{course_code}} ")
        + run(RPR_BOLD_32, "   ชื่อวิชา ")
        + run(RPR_BOLD_32_DOT, " {{course_name}} ")
        + run(RPR_BOLD_32, "   ระดับชั้น ")
        + run(RPR_BOLD_32_DOT, " {{grade_level}} "),
    )

    # P[39] (idx 3): ทำการสอบ {{mid_box}} กลางภาค   {{fin_box}} ปลายภาค ภาคเรียนที่ {{term}} ปีการศึกษา {{year}}
    p39 = replace_p(
        3,
        run(RPR_BOLD_32, "ทำการสอบ  ")
        + run(RPR_BOLD_32, "{{mid_box}}")
        + run(RPR_BOLD_32, "  กลางภาค   ")
        + run(RPR_BOLD_32, "{{fin_box}}")
        + run(RPR_BOLD_32, "  ปลายภาค   ภาคเรียนที่")
        + run(RPR_BOLD_32_DOT, " {{term}} ")
        + run(RPR_BOLD_32, "  ปีการศึกษา")
        + run(RPR_BOLD_32_DOT, " {{year}} "),
    )

    # P[40] (idx 4): ครูผู้สอน {{teacher_name}}
    p40 = replace_p(
        4,
        run(RPR_BOLD_32, "ครูผู้สอน   ")
        + run(RPR_BOLD_32_DOT, " {{teacher_name}} "),
    )

    # P[41] (idx 5): ***** separator — untouched
    p41 = p_matches[5].group(0)
    # P[42] (idx 6): 1. รูปแบบของแบบทดสอบ — untouched
    p42 = p_matches[6].group(0)

    # P[43] (idx 7): 1.1 เป็นแบบทดสอบแบบปรนัย 4 ตัวเลือก จำนวน {{obj_count}} ข้อ ข้อละ {{obj_each}} คะแนน รวม {{obj_total}} คะแนน คิดเป็นร้อยละ {{obj_pct}}
    p43 = replace_p(
        7,
        run(RPR_32, "เป็นแบบทดสอบแบบปรนัย 4 ตัวเลือก จำนวน")
        + run(RPR_32_DOT, " {{obj_count}} ")
        + run(RPR_32, "ข้อ ข้อละ")
        + run(RPR_32_DOT, " {{obj_each}} ")
        + run(RPR_32, "คะแนน รวม")
        + run(RPR_32_DOT, " {{obj_total}} ")
        + run(RPR_32, "คะแนน")
        + f"<w:r>{RPR_32}<w:br/></w:r>"
        + run(RPR_32, "คิดเป็นร้อยละ")
        + run(RPR_32_DOT, " {{obj_pct}} "),
    )

    # P[44] (idx 8): 1.2 เป็นแบบทดสอบแบบอัตนัย จำนวน {{subj_count}} ข้อ ข้อละ {{subj_each}} คะแนน รวม {{subj_total}} คะแนน
    p44 = replace_p(
        8,
        run(RPR_32, "เป็นแบบทดสอบแบบอัตนัย     จำนวน")
        + run(RPR_32_DOT, "  {{subj_count}}  ")
        + run(RPR_32, "ข้อ ข้อละ")
        + run(RPR_32_DOT, "  {{subj_each}}  ")
        + run(RPR_32, "คะแนน รวม")
        + run(RPR_32_DOT, "  {{subj_total}}  ")
        + run(RPR_32, "คะแนน "),
    )

    # P[45] (idx 9): 1.3 คิดเป็นร้อยละ {{subj_pct}} (red hint replaced with black percentage)
    p45 = replace_p(
        9,
        run(RPR_32, "คิดเป็นร้อยละ")
        + run(RPR_32_DOT, "  {{subj_pct}}  "),
    )

    # P[46] (idx 10): 2. การตรวจระดับพฤติกรรมการวัดรายข้อ — untouched
    p46 = p_matches[10].group(0)

    # P[47] (idx 11): มาตรฐานการเรียนรู้/ผลการเรียนรู้ {{standard_text}} (left-aligned as in original visual layout)
    p47 = (
        '<w:p><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/>'
        '<w:jc w:val="left"/>'
        '<w:rPr><w:rFonts w:ascii="TH SarabunPSK" w:hAnsi="TH SarabunPSK" w:cs="TH SarabunPSK"/>'
        '<w:b/><w:bCs/><w:sz w:val="32"/><w:szCs w:val="32"/></w:rPr></w:pPr>'
        + run(RPR_BOLD_32, "มาตรฐานการเรียนรู้/ผลการเรียนรู้   ")
        + run(RPR_32_DOT, "{{standard_text}}")
        + "</w:p>"
    )

    # P[48] (idx 12): ตัวชี้วัด {{indicator_text}}
    p48 = (
        '<w:p><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/>'
        '<w:ind w:left="1440"/><w:jc w:val="left"/>'
        '<w:rPr><w:rFonts w:ascii="TH SarabunPSK" w:hAnsi="TH SarabunPSK" w:cs="TH SarabunPSK"/>'
        '<w:b/><w:bCs/><w:sz w:val="32"/><w:szCs w:val="32"/></w:rPr></w:pPr>'
        + run(RPR_BOLD_32, "ตัวชี้วัด   ")
        + run(RPR_32_DOT, "{{indicator_text}}")
        + "</w:p>"
    )

    # P[49] (idx 13): blank spacer before table — untouched
    p49 = p_matches[13].group(0)

    new_pre_tbl = "".join([p36, p37, p38, p39, p40, p41, p42, p43, p44, p45, p46, p47, p48, p49])

    # Modify table: keep row 0 (header1), row 1 (header2), row 2 (template data row), row 6 (total row)
    tr_matches = list(re.finditer(r"<w:tr\b.*?</w:tr>", tbl_xml, re.S))
    assert len(tr_matches) == 7, f"Expected 7 table rows, got {len(tr_matches)}"

    tbl_prefix = tbl_xml[: tr_matches[0].start()]
    tbl_suffix = tbl_xml[tr_matches[-1].end() :]

    row0 = tr_matches[0].group(0)
    row1 = tr_matches[1].group(0)

    # Build template data row from row 2
    row2 = tr_matches[2].group(0)
    row2_tcs = list(re.finditer(r"<w:tc\b.*?</w:tc>", row2, re.S))
    assert len(row2_tcs) == 8, f"Expected 8 cells in row2, got {len(row2_tcs)}"

    cell_placeholders = [
        "{{unit_no}}",
        "{{unit_name}}",
        "{{row_indicator}}",
        "{{row_bloom}}",
        "{{row_obj}}",
        "{{row_subj}}",
        "{{row_count}}",
        "{{row_score}}",
    ]
    row2_rpr = [
        '<w:rPr><w:rFonts w:ascii="TH SarabunPSK" w:eastAsia="TH SarabunPSK" w:hAnsi="TH SarabunPSK" w:cs="TH SarabunPSK" w:hint="cs"/><w:b/><w:bCs/><w:sz w:val="26"/><w:szCs w:val="26"/></w:rPr>',
        '<w:rPr><w:rFonts w:ascii="TH SarabunPSK" w:eastAsia="Angsana New" w:hAnsi="TH SarabunPSK" w:cs="TH SarabunPSK" w:hint="cs"/><w:kern w:val="1"/><w:sz w:val="32"/><w:szCs w:val="32"/><w:cs/><w:lang w:eastAsia="th-TH"/></w:rPr>',
        '<w:rPr><w:rFonts w:ascii="TH SarabunPSK" w:hAnsi="TH SarabunPSK" w:cs="TH SarabunPSK" w:hint="cs"/><w:sz w:val="32"/><w:szCs w:val="32"/><w:cs/></w:rPr>',
        '<w:rPr><w:rFonts w:ascii="TH SarabunPSK" w:hAnsi="TH SarabunPSK" w:cs="TH SarabunPSK" w:hint="cs"/><w:cs/></w:rPr>',
        '<w:rPr><w:rFonts w:ascii="TH SarabunPSK" w:hAnsi="TH SarabunPSK" w:cs="TH SarabunPSK" w:hint="cs"/><w:cs/></w:rPr>',
        '<w:rPr><w:rFonts w:ascii="TH SarabunPSK" w:hAnsi="TH SarabunPSK" w:cs="TH SarabunPSK" w:hint="cs"/><w:cs/></w:rPr>',
        '<w:rPr><w:rFonts w:ascii="TH SarabunPSK" w:hAnsi="TH SarabunPSK" w:cs="TH SarabunPSK" w:hint="cs"/><w:cs/></w:rPr>',
        '<w:rPr><w:rFonts w:ascii="TH SarabunPSK" w:hAnsi="TH SarabunPSK" w:cs="TH SarabunPSK" w:hint="cs"/><w:cs/></w:rPr>',
    ]

    new_row2_cells = []
    for c_idx, tc_m in enumerate(row2_tcs):
        tc_xml = tc_m.group(0)
        tcpr_m = re.search(r"<w:tcPr>.*?</w:tcPr>", tc_xml, re.S)
        tcpr = tcpr_m.group(0) if tcpr_m else ""
        p_m = re.search(r"<w:p\b.*?</w:p>", tc_xml, re.S)
        p_xml = p_m.group(0)
        ppr_m = re.search(r"<w:pPr>.*?</w:pPr>", p_xml, re.S)
        ppr = ppr_m.group(0) if ppr_m else ""
        new_tc = f"<w:tc>{tcpr}<w:p>{ppr}{run(row2_rpr[c_idx], cell_placeholders[c_idx])}</w:p></w:tc>"
        new_row2_cells.append(new_tc)

    row2_trpr_m = re.search(r"<w:trPr>.*?</w:trPr>", row2, re.S)
    row2_trpr = row2_trpr_m.group(0) if row2_trpr_m else "<w:trPr/>"
    if "<w:cantSplit" not in row2_trpr:
        if row2_trpr == "<w:trPr/>":
            row2_trpr = "<w:trPr><w:cantSplit/></w:trPr>"
        else:
            row2_trpr = row2_trpr.replace("<w:trPr>", "<w:trPr><w:cantSplit/>", 1)
    new_row2 = f"<w:tr>{row2_trpr}{''.join(new_row2_cells)}</w:tr>"

    # Build total row from row 6
    row6 = tr_matches[6].group(0)
    row6_tcs = list(re.finditer(r"<w:tc\b.*?</w:tc>", row6, re.S))
    assert len(row6_tcs) == 3, f"Expected 3 cells in row6, got {len(row6_tcs)}"

    row6_trpr_m = re.search(r"<w:trPr>.*?</w:trPr>", row6, re.S)
    row6_trpr = row6_trpr_m.group(0) if row6_trpr_m else ""
    total_rpr = '<w:rPr><w:rFonts w:ascii="TH SarabunPSK" w:hAnsi="TH SarabunPSK" w:cs="TH SarabunPSK" w:hint="cs"/><w:b/><w:bCs/><w:sz w:val="26"/><w:szCs w:val="26"/><w:cs/></w:rPr>'

    def fill_total_cell(tc_xml, ph):
        tcpr_m = re.search(r"<w:tcPr>.*?</w:tcPr>", tc_xml, re.S)
        tcpr = tcpr_m.group(0) if tcpr_m else ""
        p_m = re.search(r"<w:p\b.*?</w:p>", tc_xml, re.S)
        ppr_m = re.search(r"<w:pPr>.*?</w:pPr>", p_m.group(0), re.S)
        ppr = ppr_m.group(0) if ppr_m else ""
        return f"<w:tc>{tcpr}<w:p>{ppr}{run(total_rpr, ph)}</w:p></w:tc>"

    new_row6 = (
        f"<w:tr>{row6_trpr}"
        f"{row6_tcs[0].group(0)}"
        f"{fill_total_cell(row6_tcs[1].group(0), '{{total_count}}')}"
        f"{fill_total_cell(row6_tcs[2].group(0), '{{total_score}}')}"
        f"</w:tr>"
    )

    new_tbl = f"{tbl_prefix}{row0}{row1}{new_row2}{new_row6}{tbl_suffix}"
    # Remove the extra blank spacer paragraphs right after the table so the lower section fits cleanly without touching the signature box
    post_tbl = re.sub(r'<w:p w14:paraId="29A9A302"[^>]*>.*?</w:p>', '', post_tbl, flags=re.S)
    post_tbl = re.sub(r'<w:p w14:paraId="3DB0F588"[^>]*>.*?</w:p>', '', post_tbl, flags=re.S)
    # Remove trailing empty whitespace-only paragraph before <w:sectPr to avoid blank trailing page
    post_tbl = re.sub(r'<w:p w14:paraId="57925384".*?</w:p>(?=<w:sectPr)', '', post_tbl, flags=re.S)
    new_doc_xml = f"{head}{new_pre_tbl}{new_tbl}{post_tbl}"

    with zipfile.ZipFile(OUT_DOCX, "w", zipfile.ZIP_DEFLATED) as zout:
        for name, data in other_files.items():
            zout.writestr(name, data)
        zout.writestr("word/_rels/document.xml.rels", rels_xml.encode("utf-8"))
        zout.writestr("word/document.xml", new_doc_xml.encode("utf-8"))

    print("Built:", OUT_DOCX)


if __name__ == "__main__":
    build()
