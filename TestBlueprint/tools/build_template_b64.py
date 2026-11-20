"""
Convert TestBlueprint/templates/wp29_template.docx -> TestBlueprint/templates/wp29_template_b64.js
"""
import base64
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_DOCX = os.path.join(ROOT, "templates", "wp29_template.docx")
OUT_JS = os.path.join(ROOT, "templates", "wp29_template_b64.js")


def build_b64():
    with open(SRC_DOCX, "rb") as f:
        b64 = base64.b64encode(f.read()).decode("ascii")
    content = (
        "// Auto-generated from templates/wp29_template.docx by tools/build_template_b64.py\n"
        "(function (root) {\n"
        f"  var b64 = '{b64}';\n"
        "  if (typeof module !== 'undefined' && module.exports) {\n"
        "    module.exports = b64;\n"
        "  } else {\n"
        "    root.WP29_TEMPLATE_B64 = b64;\n"
        "  }\n"
        "})(typeof globalThis !== 'undefined' ? globalThis : this);\n"
    )
    with open(OUT_JS, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"Wrote {OUT_JS} ({len(b64)} base64 chars)")


if __name__ == "__main__":
    build_b64()
