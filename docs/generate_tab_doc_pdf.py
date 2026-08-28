"""Generate PDF from TAB_SCREENS_AND_FUNCTIONALITY.md"""
from pathlib import Path
from fpdf import FPDF

MD_PATH = Path(__file__).parent / "TAB_SCREENS_AND_FUNCTIONALITY.md"
PDF_PATH = Path(__file__).parent / "TAB_SCREENS_AND_FUNCTIONALITY.pdf"


def clean(text: str) -> str:
    replacements = {
        "\u2014": "-",
        "\u2013": "-",
        "\u2018": "'",
        "\u2019": "'",
        "\u201c": '"',
        "\u201d": '"',
        "\u2192": "->",
        "\u2502": "|",
        "\u251c": "+",
        "\u2514": "+",
        "\u2500": "-",
        "\ud83d\udc4b": "",
    }
    for old, new in replacements.items():
        text = text.replace(old, new)
    return text.encode("latin-1", "replace").decode("latin-1")


def main() -> None:
    text = MD_PATH.read_text(encoding="utf-8")
    pdf = FPDF()
    pdf.set_margins(15, 15, 15)
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()
    pdf.set_font("Helvetica", size=11)
    page_width = pdf.w - pdf.l_margin - pdf.r_margin

    in_code = False
    for line in text.splitlines():
        raw = line.rstrip()
        if raw.startswith("```"):
            in_code = not in_code
            continue
        if in_code:
            pdf.set_font("Courier", size=8)
            for chunk_start in range(0, max(len(raw), 1), 90):
                chunk = raw[chunk_start : chunk_start + 90] or " "
                pdf.multi_cell(page_width, 4, clean(chunk))
            pdf.set_font("Helvetica", size=11)
            continue
        if not raw:
            pdf.ln(4)
            continue
        if raw.startswith("# "):
            pdf.set_font("Helvetica", "B", 18)
            pdf.multi_cell(page_width, 10, clean(raw[2:]))
            pdf.set_font("Helvetica", size=11)
            pdf.ln(2)
        elif raw.startswith("## "):
            pdf.set_font("Helvetica", "B", 14)
            pdf.multi_cell(page_width, 8, clean(raw[3:]))
            pdf.set_font("Helvetica", size=11)
            pdf.ln(2)
        elif raw.startswith("### "):
            pdf.set_font("Helvetica", "B", 12)
            pdf.multi_cell(page_width, 7, clean(raw[4:]))
            pdf.set_font("Helvetica", size=11)
            pdf.ln(1)
        elif raw.startswith("|"):
            pdf.set_font("Courier", size=9)
            pdf.multi_cell(page_width, 5, clean(raw))
            pdf.set_font("Helvetica", size=11)
        elif raw.startswith("- ") or raw.startswith("* "):
            pdf.multi_cell(page_width, 6, clean("  - " + raw[2:]))
        else:
            pdf.multi_cell(page_width, 6, clean(raw))

    pdf.output(str(PDF_PATH))
    print(f"Created: {PDF_PATH} ({PDF_PATH.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
