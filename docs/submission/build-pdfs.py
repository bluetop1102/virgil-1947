#!/usr/bin/env python3
"""Build the two NAN 2026 submission PDFs from their Markdown sources.

Draft mode is intentionally impossible to mistake for a submission artifact: every
page is watermarked and unresolved fields are expanded into visible hold notices.
Final mode refuses to run until the human-provided video URL and both P0 gate
results are supplied.
"""

from __future__ import annotations

import argparse
import hashlib
import html
import json
import os
import platform
import re
import subprocess
import tempfile
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qs, urlencode, urlparse
from urllib.request import Request, urlopen

import pdfplumber
import reportlab
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    HRFlowable,
    Image,
    KeepTogether,
    LongTable,
    PageBreak,
    Paragraph,
    Preformatted,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[2]
SUBMISSION = ROOT / "docs" / "submission"
OUT_DIR = ROOT / "output" / "pdf"
PAGE_W, PAGE_H = A4

INK = colors.HexColor("#201C19")
MUTED = colors.HexColor("#6E655C")
BURGUNDY = colors.HexColor("#6F2334")
GOLD = colors.HexColor("#B08A44")
PAPER = colors.HexColor("#F7F1E5")
PAPER_ALT = colors.HexColor("#EEE4D2")
LINE = colors.HexColor("#CDBD9E")
LINK = colors.HexColor("#275E72")
ALERT = colors.HexColor("#9B2438")

FONT_DIR = Path.home() / "Library" / "Fonts"
FONT_REGULAR = FONT_DIR / "GmarketSansTTFMedium.ttf"
FONT_BOLD = FONT_DIR / "GmarketSansTTFBold.ttf"
FONT_LIGHT = FONT_DIR / "GmarketSansTTFLight.ttf"

PLACEHOLDER_COUNTS = {
    "game-guide.md": {
        "{{YOUTUBE_URL}}": 2,
        "{{EVIDENCE_CONTRACT_STATUS}}": 0,
        "{{AUDIO_ATTRIBUTION_STATUS}}": 0,
    },
    "ai-tech.md": {
        "{{YOUTUBE_URL}}": 0,
        "{{EVIDENCE_CONTRACT_STATUS}}": 1,
        "{{AUDIO_ATTRIBUTION_STATUS}}": 1,
    },
}
FINAL_MANIFEST = OUT_DIR / "HOTEL-VIRGIL-PDF-MANIFEST.json"
PLAY_URL = "https://bluetop1102.github.io/virgil-1947/"
SOURCE_URL = "https://github.com/bluetop1102/virgil-1947"
CREDITS_URL = "https://github.com/bluetop1102/virgil-1947/blob/main/docs/credits.md"
CC_BY_URL = "https://creativecommons.org/licenses/by/4.0/"
OPENAI_TERMS_URL = "https://openai.com/policies/row-terms-of-use/"
AUDIO_CATALOG = (
    (
        "radio-1-night-on-the-docks-sax.mp3",
        "Night on the Docks - Sax",
        "https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100137",
    ),
    (
        "radio-2-dark-times.mp3",
        "Dark Times",
        "https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100747",
    ),
    (
        "radio-3-vanishing.mp3",
        "Vanishing",
        "https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1600050",
    ),
    (
        "bed-unease-long-note-one.mp3",
        "Long note One",
        "https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100418",
    ),
    (
        "bed-urge-impending-boom.mp3",
        "Impending Boom",
        "https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100198",
    ),
)
AUDIO_FILENAMES = tuple(item[0] for item in AUDIO_CATALOG)
AUDIO_TITLES = tuple(item[1] for item in AUDIO_CATALOG)
AUDIO_SOURCE_URLS = tuple(item[2] for item in AUDIO_CATALOG)


def register_fonts() -> None:
    required = (FONT_REGULAR, FONT_BOLD, FONT_LIGHT)
    missing = [str(path) for path in required if not path.exists()]
    if missing:
        raise SystemExit(f"Korean PDF font missing: {', '.join(missing)}")
    pdfmetrics.registerFont(TTFont("Virgil", str(FONT_REGULAR)))
    pdfmetrics.registerFont(TTFont("Virgil-Bold", str(FONT_BOLD)))
    pdfmetrics.registerFont(TTFont("Virgil-Light", str(FONT_LIGHT)))
    pdfmetrics.registerFontFamily(
        "Virgil", normal="Virgil", bold="Virgil-Bold", italic="Virgil-Light", boldItalic="Virgil-Bold"
    )


def styles_for(compact: bool) -> dict[str, ParagraphStyle]:
    base = getSampleStyleSheet()
    body_size = 8.9 if compact else 9.15
    leading = 12.65 if compact else 13.6
    table_size = 7.2 if compact else 7.55
    return {
        "body": ParagraphStyle(
            "BodyVirgil",
            parent=base["BodyText"],
            fontName="Virgil",
            fontSize=body_size,
            leading=leading,
            textColor=INK,
            spaceAfter=5.2 if compact else 6.5,
            wordWrap="CJK",
            splitLongWords=True,
            allowWidows=0,
            allowOrphans=0,
        ),
        "h1": ParagraphStyle(
            "H1Virgil",
            parent=base["Title"],
            fontName="Virgil-Bold",
            fontSize=21 if compact else 23,
            leading=27 if compact else 30,
            textColor=BURGUNDY,
            alignment=TA_LEFT,
            spaceAfter=8,
            keepWithNext=True,
            wordWrap="CJK",
        ),
        "h2": ParagraphStyle(
            "H2Virgil",
            parent=base["Heading2"],
            fontName="Virgil-Bold",
            fontSize=14.6 if compact else 16,
            leading=18.7 if compact else 21,
            textColor=BURGUNDY,
            spaceBefore=4,
            spaceAfter=6,
            keepWithNext=True,
            wordWrap="CJK",
        ),
        "h3": ParagraphStyle(
            "H3Virgil",
            parent=base["Heading3"],
            fontName="Virgil-Bold",
            fontSize=10.8 if compact else 11.4,
            leading=14.7 if compact else 15.5,
            textColor=INK,
            spaceBefore=3,
            spaceAfter=4,
            keepWithNext=True,
            wordWrap="CJK",
        ),
        "quote": ParagraphStyle(
            "QuoteVirgil",
            parent=base["BodyText"],
            fontName="Virgil-Bold",
            fontSize=9.0 if compact else 10.2,
            leading=13.3 if compact else 15.2,
            textColor=BURGUNDY,
            leftIndent=10,
            rightIndent=6,
            borderColor=GOLD,
            borderWidth=0,
            borderPadding=(5, 7, 5, 9),
            backColor=PAPER_ALT,
            spaceBefore=3,
            spaceAfter=8,
            wordWrap="CJK",
        ),
        "code": ParagraphStyle(
            "CodeVirgil",
            parent=base["Code"],
            fontName="Virgil",
            fontSize=6.9 if compact else 7.15,
            leading=9.3 if compact else 9.8,
            textColor=colors.HexColor("#EDE3CF"),
            backColor=colors.HexColor("#25211E"),
            borderPadding=7,
            spaceBefore=3,
            spaceAfter=7,
        ),
        "table": ParagraphStyle(
            "TableVirgil",
            parent=base["BodyText"],
            fontName="Virgil",
            fontSize=table_size,
            leading=table_size * 1.42,
            textColor=INK,
            wordWrap="CJK",
            splitLongWords=True,
        ),
        "table_header": ParagraphStyle(
            "TableHeaderVirgil",
            parent=base["BodyText"],
            fontName="Virgil-Bold",
            fontSize=table_size,
            leading=table_size * 1.42,
            textColor=colors.white,
            wordWrap="CJK",
            splitLongWords=True,
        ),
        "caption": ParagraphStyle(
            "CaptionVirgil",
            parent=base["BodyText"],
            fontName="Virgil-Light",
            fontSize=6.8 if compact else 7.3,
            leading=9.2 if compact else 10,
            textColor=MUTED,
            alignment=TA_CENTER,
            spaceAfter=6,
            wordWrap="CJK",
        ),
        "bullet": ParagraphStyle(
            "BulletVirgil",
            parent=base["BodyText"],
            fontName="Virgil",
            fontSize=body_size,
            leading=leading,
            textColor=INK,
            leftIndent=2,
            firstLineIndent=0,
            wordWrap="CJK",
            splitLongWords=True,
        ),
    }


TOKEN_RE = re.compile(
    r"(\[[^\]]+\]\(https?://[^)]+\)|<https?://[^>]+>|`[^`]+`|\*\*[^*]+\*\*)"
)


def inline_markup(text: str, *, code_color: str = "#5A3941") -> str:
    """Escape arbitrary Markdown text while preserving the small supported inline set."""

    out: list[str] = []
    cursor = 0
    for match in TOKEN_RE.finditer(text):
        out.append(html.escape(text[cursor : match.start()]))
        token = match.group(0)
        md_link = re.fullmatch(r"\[([^\]]+)\]\((https?://[^)]+)\)", token)
        angle_link = re.fullmatch(r"<(https?://[^>]+)>", token)
        if md_link:
            label, url = md_link.groups()
            out.append(f'<link href="{html.escape(url, quote=True)}" color="{LINK.hexval()}">{html.escape(label)}</link>')
        elif angle_link:
            url = angle_link.group(1)
            label = url.replace("https://", "")
            out.append(f'<link href="{html.escape(url, quote=True)}" color="{LINK.hexval()}">{html.escape(label)}</link>')
        elif token.startswith("`"):
            out.append(f'<font name="Virgil-Light" color="{code_color}">{html.escape(token[1:-1])}</font>')
        else:
            out.append(f"<b>{html.escape(token[2:-2])}</b>")
        cursor = match.end()
    out.append(html.escape(text[cursor:]))
    return "".join(out).replace("  ", " ")


def table_widths(rows: list[list[str]], available: float) -> list[float]:
    cols = len(rows[0])
    maxima = [1.0] * cols
    for row in rows:
        for index, cell in enumerate(row):
            plain = re.sub(r"[`*<>\[\]()]", "", cell)
            maxima[index] = max(maxima[index], min(34.0, 2.0 + len(plain)))
    if cols == 2:
        maxima[0] = min(maxima[0], 14)
        maxima[1] = max(maxima[1], maxima[0] * 1.8)
    floor = 0.12 if cols <= 4 else 0.09
    raw = [max(floor, value / sum(maxima)) for value in maxima]
    total = sum(raw)
    return [available * value / total for value in raw]


def make_table(raw_rows: list[list[str]], styles: dict[str, ParagraphStyle], available: float) -> LongTable:
    cols = max(len(row) for row in raw_rows)
    rows = [row + [""] * (cols - len(row)) for row in raw_rows]
    cells = [
        [
            Paragraph(
                inline_markup(cell.strip(), code_color="#FFFFFF" if row_index == 0 else "#5A3941"),
                styles["table_header"] if row_index == 0 else styles["table"],
            )
            for cell in row
        ]
        for row_index, row in enumerate(rows)
    ]
    table = LongTable(cells, colWidths=table_widths(rows, available), repeatRows=1, hAlign="LEFT")
    commands = [
        ("BACKGROUND", (0, 0), (-1, 0), BURGUNDY),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Virgil-Bold"),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("GRID", (0, 0), (-1, -1), 0.35, LINE),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 3.5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3.5),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#FBF7EF"), PAPER_ALT]),
    ]
    table.setStyle(TableStyle(commands))
    table.spaceAfter = 7
    return table


def image_block(source: Path, alt: str, rel_path: str, styles: dict[str, ParagraphStyle], available: float):
    image_path = (source.parent / rel_path).resolve()
    if not image_path.exists():
        raise SystemExit(f"Image not found: {image_path}")
    img = Image(str(image_path))
    ratio = min(available / img.imageWidth, (58 * mm) / img.imageHeight)
    img.drawWidth = img.imageWidth * ratio
    img.drawHeight = img.imageHeight * ratio
    img.hAlign = "CENTER"
    frame = Table([[img]], colWidths=[img.drawWidth + 4], hAlign="CENTER")
    frame.setStyle(
        TableStyle(
            [
                ("BOX", (0, 0), (-1, -1), 0.8, GOLD),
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#171411")),
                ("LEFTPADDING", (0, 0), (-1, -1), 2),
                ("RIGHTPADDING", (0, 0), (-1, -1), 2),
                ("TOPPADDING", (0, 0), (-1, -1), 2),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
            ]
        )
    )
    return KeepTogether([frame, Spacer(1, 3), Paragraph(inline_markup(alt), styles["caption"])])


def code_block(lines: list[str], style: ParagraphStyle, available: float) -> Table:
    code = Preformatted("\n".join(lines), style, maxLineLength=94)
    block = Table([[code]], colWidths=[available], hAlign="LEFT")
    block.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#25211E")),
                ("BOX", (0, 0), (-1, -1), 0.5, GOLD),
                ("LEFTPADDING", (0, 0), (-1, -1), 7),
                ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    block.spaceBefore = 3
    block.spaceAfter = 7
    return block


def list_block(items: list[str], ordered: bool, styles: dict[str, ParagraphStyle], available: float) -> Table:
    rows = []
    for index, item in enumerate(items, 1):
        label = f"{index}" if ordered else "·"
        rows.append(
            [
                Paragraph(f"<b>{label}</b>", styles["bullet"]),
                Paragraph(inline_markup(item), styles["bullet"]),
            ]
        )
    block = Table(rows, colWidths=[12, available - 12], hAlign="LEFT")
    block.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 3),
                ("TOPPADDING", (0, 0), (-1, -1), 1.5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2.2),
            ]
        )
    )
    block.spaceAfter = 5
    return block


def parse_markdown(source: Path, compact: bool) -> list:
    text = source.read_text(encoding="utf-8")
    styles = styles_for(compact)
    available = PAGE_W - 28 * mm
    lines = text.splitlines()
    story: list = []
    paragraph: list[str] = []
    index = 0

    def flush_paragraph() -> None:
        if paragraph:
            story.append(Paragraph(inline_markup(" ".join(part.strip() for part in paragraph)), styles["body"]))
            paragraph.clear()

    while index < len(lines):
        line = lines[index]
        stripped = line.strip()

        if stripped == "<!-- pagebreak -->":
            flush_paragraph()
            story.append(PageBreak())
            index += 1
            continue

        if stripped.startswith("```"):
            flush_paragraph()
            code_lines: list[str] = []
            index += 1
            while index < len(lines) and not lines[index].strip().startswith("```"):
                code_lines.append(lines[index])
                index += 1
            story.append(code_block(code_lines, styles["code"], available))
            index += 1
            continue

        image_match = re.fullmatch(r"!\[([^\]]*)\]\(([^)]+)\)", stripped)
        if image_match:
            flush_paragraph()
            story.append(image_block(source, image_match.group(1), image_match.group(2), styles, available))
            index += 1
            continue

        heading = re.match(r"^(#{1,3})\s+(.+)$", stripped)
        if heading:
            flush_paragraph()
            level = len(heading.group(1))
            if level == 2:
                story.append(HRFlowable(width="100%", thickness=0.7, color=GOLD, spaceBefore=1, spaceAfter=5))
            story.append(Paragraph(inline_markup(heading.group(2)), styles[f"h{level}"]))
            index += 1
            continue

        if stripped.startswith(">"):
            flush_paragraph()
            quote_lines: list[str] = []
            while index < len(lines) and lines[index].strip().startswith(">"):
                quote_lines.append(lines[index].strip()[1:].strip())
                index += 1
            story.append(Paragraph(inline_markup(" ".join(quote_lines)), styles["quote"]))
            continue

        if stripped.startswith("|"):
            flush_paragraph()
            rows: list[list[str]] = []
            while index < len(lines) and lines[index].strip().startswith("|"):
                row = [cell.strip() for cell in lines[index].strip().strip("|").split("|")]
                if not all(re.fullmatch(r":?-{3,}:?", cell) for cell in row):
                    rows.append(row)
                index += 1
            if rows:
                story.append(make_table(rows, styles, available))
            continue

        list_match = re.match(r"^([-*]|\d+\.)\s+(.+)$", stripped)
        if list_match:
            flush_paragraph()
            ordered = list_match.group(1)[0].isdigit()
            items: list[str] = []
            while index < len(lines):
                candidate = lines[index].strip()
                current = re.match(r"^([-*]|\d+\.)\s+(.+)$", candidate)
                if not current:
                    break
                item_text = current.group(2)
                index += 1
                while index < len(lines) and lines[index].startswith("  ") and lines[index].strip():
                    item_text += " " + lines[index].strip()
                    index += 1
                items.append(item_text)
            story.append(list_block(items, ordered, styles, available))
            continue

        if stripped in {"---", "***"}:
            flush_paragraph()
            story.append(HRFlowable(width="100%", thickness=0.7, color=LINE, spaceBefore=4, spaceAfter=7))
            index += 1
            continue

        if not stripped:
            flush_paragraph()
            index += 1
            continue

        paragraph.append(stripped)
        index += 1

    flush_paragraph()
    return story


def draw_page(canvas, doc, *, short_title: str, draft: bool) -> None:
    canvas.saveState()
    canvas.setFillColor(PAPER)
    canvas.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    canvas.setStrokeColor(GOLD)
    canvas.setLineWidth(0.65)
    canvas.line(14 * mm, PAGE_H - 11.5 * mm, PAGE_W - 14 * mm, PAGE_H - 11.5 * mm)
    canvas.setFont("Virgil-Bold", 6.4)
    canvas.setFillColor(MUTED)
    canvas.drawString(14 * mm, PAGE_H - 9 * mm, short_title)
    canvas.setFont("Virgil", 6.2)
    canvas.drawRightString(PAGE_W - 14 * mm, 8.5 * mm, f"NAN 2026 · p. {doc.page}")
    if draft:
        canvas.saveState()
        canvas.setFillColor(ALERT)
        canvas.setFillAlpha(0.085)
        canvas.translate(PAGE_W / 2, PAGE_H / 2)
        canvas.rotate(34)
        canvas.setFont("Virgil-Bold", 32)
        canvas.drawCentredString(0, 0, "DRAFT · 제출 금지")
        canvas.restoreState()
    canvas.restoreState()


def validate_video_url(value: str) -> None:
    parsed = urlparse(value)
    host = parsed.netloc.lower().split(":")[0]
    if parsed.scheme != "https" or host not in {"youtube.com", "www.youtube.com", "youtu.be"}:
        raise SystemExit("--video-url must be an https://youtube.com or https://youtu.be URL")
    if host == "youtu.be":
        video_id = parsed.path.strip("/").split("/")[0]
    elif parsed.path == "/watch":
        video_id = parse_qs(parsed.query).get("v", [""])[0]
    elif parsed.path.startswith(("/shorts/", "/embed/")):
        video_id = parsed.path.strip("/").split("/")[1]
    else:
        video_id = ""
    if not re.fullmatch(r"[A-Za-z0-9_-]{11}", video_id):
        raise SystemExit("--video-url must identify a concrete YouTube video")


def validate_video_reachability(value: str) -> None:
    endpoint = "https://www.youtube.com/oembed?" + urlencode({"format": "json", "url": value})
    request = Request(endpoint, headers={"User-Agent": "HOTEL-VIRGIL-submission-check/1.0"})
    try:
        with urlopen(request, timeout=12) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as exc:
        raise SystemExit(f"YouTube oEmbed could not verify --video-url: {exc}") from exc
    if payload.get("provider_name") != "YouTube" or not payload.get("title"):
        raise SystemExit("YouTube oEmbed response does not identify a public or unlisted video")


def validate_resolved_status(label: str, value: str) -> None:
    if not value.startswith("해소 —") or len(value) < 20:
        raise SystemExit(f"Final {label} status must start with '해소 —' and include verification evidence")
    if any(term.lower() in value.lower() for term in ("대기", "미해소", "draft", "fail", "false")):
        raise SystemExit(f"Final {label} status is not resolved: {value}")
    if "PASS" not in value:
        raise SystemExit(f"Final {label} status must include a fresh PASS result")
    if label == "evidence" and not re.search(r"\b[0-9a-f]{7,40}\b", value):
        raise SystemExit("Final evidence status must include the verified commit SHA")
    if label == "audio":
        required = (
            "ffprobe",
            "설정 화면 육안 PASS",
            "지목 침대 런타임 청감 PASS",
            "true peak",
            "dBTP",
        )
        if not all(term in value for term in required):
            raise SystemExit(
                "Final audio status must include ffprobe, human-visible settings credit, "
                "deduction-bed runtime listening, and true-peak verification"
            )
        peak_values = audio_status_peaks(value)
        if len(peak_values) != len(AUDIO_CATALOG) or any(number > 0.0 for number in peak_values):
            raise SystemExit(
                f"Final audio status must include {len(AUDIO_CATALOG)} measured true-peak values "
                "at or below 0 dBTP"
            )


def audio_status_peaks(value: str) -> list[float]:
    match = re.search(r"true peak\s+(.+?)\s*dBTP", value, flags=re.IGNORECASE)
    if match is None:
        return []
    return [float(number) for number in re.findall(r"[-+]?\d+(?:\.\d+)?", match.group(1))]


def validate_claimed_audio_metrics(value: str, metrics: dict[str, dict[str, float]]) -> None:
    claimed = audio_status_peaks(value)
    missing = [name for name in AUDIO_FILENAMES if name not in metrics]
    extras = sorted(set(metrics) - set(AUDIO_FILENAMES))
    if missing or extras:
        raise SystemExit(f"Fresh audio metrics do not match the catalog; missing={missing}, extras={extras}")
    measured = [metrics[name]["true_peak_dbfs"] for name in AUDIO_FILENAMES]
    if len(claimed) != len(AUDIO_CATALOG):
        raise SystemExit(
            f"Final audio status and ffmpeg must each yield {len(AUDIO_CATALOG)} true-peak values"
        )
    mismatches = [
        f"{name}: claimed {claim:+.1f}, measured {actual:+.1f} dBTP"
        for name, claim, actual in zip(AUDIO_FILENAMES, claimed, measured, strict=True)
        if abs(claim - actual) > 0.05
    ]
    if mismatches:
        raise SystemExit("Final audio status disagrees with fresh ffmpeg: " + "; ".join(mismatches))


def run_checked(command: list[str], label: str, timeout: int = 600) -> str:
    result = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=timeout, check=False)
    output = (result.stdout + "\n" + result.stderr).strip()
    if result.returncode != 0:
        tail = "\n".join(output.splitlines()[-20:])
        raise SystemExit(f"Final {label} verification failed (exit {result.returncode}):\n{tail}")
    return output


ELEVATOR_3_STATE_JS = """
import { fresh, pump, walk, FLAGS } from './tools/interrogation-harness.mjs'

const subtitle = ctx => ctx.events
  .filter(event => event.type === 'subtitle')
  .at(-1)?.payload?.text || ''
const actEnters = ctx => ctx.events.filter(event => event.type === 'act:enter').length

const before = await fresh()
const beforeEnters = actEnters(before)
before.bus.emit('player:interact', { targetId: 'lobby/elevator' })
if (
  !subtitle(before).includes('프런트 쪽 일이 먼저다') ||
  before.state.act !== 1 ||
  actEnters(before) !== beforeEnters
) {
  throw new Error('pre-interrogation gate state mismatch')
}

const interrupted = await fresh({ flags: FLAGS })
interrupted.m.start('deitch')
pump(interrupted.m)
interrupted.m.choose('TRUTH')
pump(interrupted.m)
interrupted.m._leave()
const interruptedEnters = actEnters(interrupted)
interrupted.bus.emit('player:interact', { targetId: 'lobby/elevator' })
if (
  !subtitle(interrupted).includes('다이치의 진술이 아직 남았다') ||
  interrupted.state.act !== 1 ||
  actEnters(interrupted) !== interruptedEnters
) {
  throw new Error('interrupted gate state mismatch')
}

const completed = await fresh({ flags: FLAGS })
completed.m.start('deitch')
pump(completed.m)
walk(completed, 'TRUTH')
if (!completed.state.npc('deitch').ended) {
  throw new Error('completion precondition failed')
}
const enterBefore = completed.events.filter(event => event.type === 'act:enter').length
completed.bus.emit('player:interact', { targetId: 'lobby/elevator' })
const enterAfter = actEnters(completed)
if (completed.state.act !== 2 || enterAfter !== enterBefore + 1) {
  throw new Error('completed gate did not enter act 2 exactly once')
}
completed.bus.emit('player:interact', { targetId: 'lobby/elevator' })
if (completed.state.act !== 2 || actEnters(completed) !== enterAfter) {
  throw new Error('completed gate re-entered act 2')
}
console.log('PASS elevator 3-state regression')
""".strip()


ALLOWED_UNTRACKED_PREFIXES = ("output/", "tmp/", "dist/", "shots/")


def validate_repository_snapshot(expected_head: str | None = None) -> str:
    tracked_changes = run_checked(
        ["git", "status", "--porcelain", "--untracked-files=no"],
        "tracked-worktree",
        timeout=30,
    )
    if tracked_changes:
        raise SystemExit("Final PDF build requires a clean tracked worktree; commit the frozen source first")

    untracked_raw = run_checked(
        ["git", "ls-files", "--others", "--exclude-standard", "-z"],
        "untracked-worktree",
        timeout=30,
    )
    unexpected_untracked = [
        path
        for path in untracked_raw.split("\0")
        if path and not path.startswith(ALLOWED_UNTRACKED_PREFIXES)
    ]
    if unexpected_untracked:
        raise SystemExit(
            "Final PDF build found untracked source/provenance paths: " + ", ".join(unexpected_untracked)
        )

    head = run_checked(["git", "rev-parse", "HEAD"], "git-head", timeout=30)
    if expected_head is not None and head != expected_head:
        raise SystemExit(f"Final repository HEAD changed during PDF build: {expected_head} -> {head}")
    return head


def tracked_submission_inputs() -> list[Path]:
    inputs = [
        SUBMISSION / "build-pdfs.py",
        SUBMISSION / "pdf-requirements.txt",
        SUBMISSION / "game-guide.md",
        SUBMISSION / "ai-tech.md",
        ROOT / "assets" / "title-bg.jpg",
        *(ROOT / "assets" / name for name in AUDIO_FILENAMES),
        ROOT / "src" / "ui" / "settings.js",
        ROOT / "docs" / "credits.md",
        ROOT / "package.json",
        ROOT / "package-lock.json",
    ]
    for source in (SUBMISSION / "game-guide.md", SUBMISSION / "ai-tech.md"):
        for relative in re.findall(r"!\[[^\]]*\]\(([^)]+)\)", source.read_text(encoding="utf-8")):
            inputs.append((source.parent / relative).resolve())
    return sorted(set(inputs))


def validate_final_repository(evidence_status: str) -> tuple[list[Path], str]:
    validated_head = validate_repository_snapshot()

    inputs = tracked_submission_inputs()
    missing_files = [str(path) for path in inputs if not path.is_file()]
    if missing_files:
        raise SystemExit("Final PDF inputs are missing: " + ", ".join(missing_files))
    relative_inputs = [str(path.relative_to(ROOT)) for path in inputs]
    tracked_raw = run_checked(
        ["git", "ls-files", "-z", "--", *relative_inputs], "tracked-pdf-inputs", timeout=30
    )
    tracked = {path for path in tracked_raw.split("\0") if path}
    unversioned_inputs = sorted(set(relative_inputs) - tracked)
    if unversioned_inputs:
        raise SystemExit("Final PDF inputs are not versioned: " + ", ".join(unversioned_inputs))

    sha_match = re.search(r"\b[0-9a-f]{7,40}\b", evidence_status)
    if sha_match is None:
        raise SystemExit("Final evidence status does not contain a commit SHA")
    sha = sha_match.group(0)
    run_checked(["git", "cat-file", "-e", f"{sha}^{{commit}}"], "evidence-commit", timeout=30)
    run_checked(["git", "merge-base", "--is-ancestor", sha, "HEAD"], "evidence-ancestry", timeout=30)
    run_checked(
        ["node", "--input-type=module", "--eval", ELEVATOR_3_STATE_JS],
        "elevator-3-state",
    )
    run_checked(["node", "tools/test-interrogation.mjs"], "interrogation-108")
    run_checked(["node", "tools/test-interrogation.mjs", "--burn"], "interrogation-burn")
    run_checked(["node", "tools/playthrough.mjs", "--fast", "--act", "1"], "act-1-playthrough")
    return inputs, validated_head


def deduction_bed_reachability_gaps(notebook: str, cues: str, music: str) -> list[str]:
    compact = lambda source: re.sub(r"\s+", " ", source)
    notebook, cues, music = map(compact, (notebook, cues, music))
    contract = {
        "board ui:open emitter": "this.engine.bus.emit('ui:open', { ui: 'deduction' })" in notebook,
        "ui:open urge-bed listener": (
            "bus.on('ui:open', (p) => { if (p?.ui === 'deduction') bedStart(a, 'urge') })" in cues
        ),
        "bed-urge asset mapping": (
            "import.meta.glob('../../assets/bed-*.mp3'" in music
            and "p.includes(`bed-${kind}-`)" in music
            and "urge:" in music
        ),
    }
    return [label for label, present in contract.items() if not present]


def settings_credit_gaps(settings: str) -> list[str]:
    match = re.search(r"const\s+CREDIT\s*=\s*\[(.*?)\]\s*", settings, flags=re.DOTALL)
    if match is None:
        return ["visible CREDIT array"]
    credit = match.group(1)
    literal_requirements = (*AUDIO_TITLES, "Kevin MacLeod", "incompetech.com", "Creative Commons")
    gaps = [term for term in literal_requirements if term not in credit]
    semantic_requirements = {
        "CC BY 4.0 license URL": any(
            uri in credit for uri in (CC_BY_URL, CC_BY_URL.removeprefix("https://"))
        ),
        "changes indicated": any(term in credit for term in ("조정", "변경", "가공")),
        "no added performance": "연주" in credit and any(term in credit for term in ("더하지", "더하거나")),
        "no excerpting": any(term in credit for term in ("자르지", "절단 없음", "잘라 붙이지")),
    }
    gaps.extend(label for label, present in semantic_requirements.items() if not present)
    return gaps


def validate_audio_files_and_credit() -> dict[str, dict[str, float]]:
    audio_paths = [ROOT / "assets" / name for name in AUDIO_FILENAMES]
    missing_paths = [path.name for path in audio_paths if not path.is_file()]
    actual_paths = sorted([*(ROOT / "assets").glob("radio-*.mp3"), *(ROOT / "assets").glob("bed-*.mp3")])
    unexpected_paths = sorted(path.name for path in actual_paths if path.name not in AUDIO_FILENAMES)
    if missing_paths or unexpected_paths:
        raise SystemExit(
            f"Final audio inventory does not match the five-track catalog; "
            f"missing={missing_paths}, unexpected={unexpected_paths}"
        )
    metrics: dict[str, dict[str, float]] = {}
    for audio_path in audio_paths:
        raw = run_checked(
            [
                "ffprobe",
                "-v",
                "error",
                "-show_entries",
                "stream=codec_type",
                "-of",
                "json",
                str(audio_path),
            ],
            f"audio-streams:{audio_path.name}",
            timeout=30,
        )
        streams = [stream.get("codec_type") for stream in json.loads(raw).get("streams", [])]
        if streams != ["audio"]:
            raise SystemExit(f"Final audio must contain exactly one audio stream: {audio_path.name} -> {streams}")
        loudness = run_checked(
            [
                "ffmpeg",
                "-hide_banner",
                "-nostats",
                "-i",
                str(audio_path),
                "-filter_complex",
                "ebur128=peak=true",
                "-f",
                "null",
                "-",
            ],
            f"audio-loudness:{audio_path.name}",
            timeout=120,
        )
        integrated_matches = re.findall(r"I:\s*([-+]?\d+(?:\.\d+)?) LUFS", loudness)
        peak_matches = re.findall(r"Peak:\s*([-+]?\d+(?:\.\d+)?) dBFS", loudness)
        if not integrated_matches or not peak_matches:
            raise SystemExit(f"Could not parse EBU R128 summary for {audio_path.name}")
        integrated = float(integrated_matches[-1])
        true_peak = float(peak_matches[-1])
        if true_peak > 0.0:
            raise SystemExit(f"Final audio true peak exceeds 0 dBFS: {audio_path.name} -> {true_peak:+.1f}")
        metrics[audio_path.name] = {"integrated_lufs": integrated, "true_peak_dbfs": true_peak}

    settings = (ROOT / "src" / "ui" / "settings.js").read_text(encoding="utf-8")
    missing = settings_credit_gaps(settings)
    if missing:
        raise SystemExit("Final settings credit is incomplete: " + ", ".join(missing))

    credits = (ROOT / "docs" / "credits.md").read_text(encoding="utf-8")
    credits_required = (
        *AUDIO_FILENAMES,
        *AUDIO_TITLES,
        *AUDIO_SOURCE_URLS,
        "Kevin MacLeod",
        CC_BY_URL,
        "22.05",
        "48",
        "32",
        "64",
        "LUFS",
        "dBTP",
    )
    missing = [term for term in credits_required if term not in credits]
    if missing:
        raise SystemExit("Final credits ledger is incomplete: " + ", ".join(missing))

    # The shipped one-act slice cannot reach the act-3 board through normal progression,
    # but the real board-opening implementation and the QA route share one event.  Check
    # all three links instead of accepting a dead, conveniently named emitter: the board
    # must emit ui:open{deduction}, cues must start the urge bed from that event, and the
    # music module must map urge to the bundled bed-urge asset.  Final status separately
    # requires a human QA listen because static source checks cannot prove audibility.
    missing_links = deduction_bed_reachability_gaps(
        (ROOT / "src" / "ui" / "notebook.js").read_text(encoding="utf-8"),
        (ROOT / "src" / "audio" / "cues.js").read_text(encoding="utf-8"),
        (ROOT / "src" / "audio" / "music.js").read_text(encoding="utf-8"),
    )
    if missing_links:
        raise SystemExit(
            "Final deduction-bed reachability contract is incomplete: " + ", ".join(missing_links)
        )
    return metrics


def substituted_source(source: Path, replacements: dict[str, str], temp_dir: Path) -> Path:
    text = source.read_text(encoding="utf-8")
    expected = PLACEHOLDER_COUNTS.get(source.name)
    if expected is None:
        raise SystemExit(f"No placeholder contract registered for {source.name}")
    mismatches = [
        f"{token}: expected {count}, found {text.count(token)}"
        for token, count in expected.items()
        if text.count(token) != count
    ]
    if mismatches:
        raise SystemExit(f"Placeholder contract failed for {source.name}: {'; '.join(mismatches)}")
    for key, value in replacements.items():
        text = text.replace(key, value)
    leftovers = sorted(set(re.findall(r"\{\{[^}]+\}\}", text)))
    if leftovers:
        raise SystemExit(f"Unresolved fields in {source.name}: {', '.join(leftovers)}")
    temp_dir.mkdir(parents=True, exist_ok=True)
    target = temp_dir / source.name
    target.write_text(text, encoding="utf-8")
    return target


def build_one(
    source: Path,
    output: Path,
    *,
    compact: bool,
    draft: bool,
    replacements: dict[str, str],
    temp_dir: Path,
) -> None:
    prepared = substituted_source(source, replacements, temp_dir)
    # Preserve source-relative image paths for the temporary copy.
    for frame_dir in ("frames",):
        link = prepared.parent / frame_dir
        if not link.exists():
            try:
                os.symlink(source.parent / frame_dir, link, target_is_directory=True)
            except FileExistsError:
                pass
    output.parent.mkdir(parents=True, exist_ok=True)
    short_title = "HOTEL VIRGIL · AI 활용 기술" if compact else "HOTEL VIRGIL · 게임 소개"
    doc = SimpleDocTemplate(
        str(output),
        pagesize=A4,
        rightMargin=14 * mm,
        leftMargin=14 * mm,
        topMargin=16 * mm,
        bottomMargin=14 * mm,
        title=short_title,
        author="HOTEL VIRGIL — 1947",
        subject="NAN 2026 사전 과제 제출 문서" + (" (DRAFT)" if draft else ""),
        creator="HOTEL VIRGIL submission PDF builder",
    )
    story = parse_markdown(prepared, compact=compact)
    page_drawer = lambda canvas, current_doc: draw_page(canvas, current_doc, short_title=short_title, draft=draft)
    doc.build(story, onFirstPage=page_drawer, onLaterPages=page_drawer)


def normalized_text(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def whitespace_insensitive_text(value: str) -> str:
    return re.sub(r"\s+", "", value)


def inspect_pdf(
    path: Path,
    *,
    expected_pages: int,
    expected_title: str,
    draft: bool,
    video_url: str | None = None,
    evidence_status: str | None = None,
    audio_status: str | None = None,
    required_uris: dict[str, int] | None = None,
) -> dict[str, object]:
    if not path.exists() or path.stat().st_size < 10_000:
        raise SystemExit(f"PDF build is missing or implausibly small: {path}")

    with pdfplumber.open(path) as pdf:
        page_texts = [page.extract_text() or "" for page in pdf.pages]
        text = "\n".join(page_texts)
        links = [
            annotation["uri"]
            for page in pdf.pages
            for annotation in (page.annots or [])
            if annotation.get("uri")
        ]
        metadata = pdf.metadata or {}
        page_count = len(pdf.pages)
        page_sizes = [(float(page.width), float(page.height)) for page in pdf.pages]
        font_names = {char.get("fontname", "") for page in pdf.pages for char in page.chars}

    if page_count != expected_pages:
        raise SystemExit(f"Unexpected page count for {path.name}: {page_count}, expected {expected_pages}")
    if metadata.get("Title") != expected_title:
        raise SystemExit(f"Unexpected PDF title metadata for {path.name}: {metadata.get('Title')!r}")
    if metadata.get("Author") != "HOTEL VIRGIL — 1947":
        raise SystemExit(f"Unexpected PDF author metadata for {path.name}: {metadata.get('Author')!r}")
    if not all(abs(width - PAGE_W) < 0.1 and abs(height - PAGE_H) < 0.1 for width, height in page_sizes):
        raise SystemExit(f"Non-A4 page found in {path.name}: {page_sizes}")
    if not font_names or any("GmarketSans" not in name for name in font_names):
        raise SystemExit(f"Unexpected or missing document font in {path.name}: {sorted(font_names)}")
    if "\ufffd" in text or "{{" in text or "}}" in text:
        raise SystemExit(f"Broken glyph or unresolved field in {path.name}")

    for uri, minimum in (required_uris or {}).items():
        if links.count(uri) < minimum:
            raise SystemExit(f"Required clickable URI missing from {path.name}: {uri}")

    subject = str(metadata.get("Subject", ""))
    normalized = normalized_text(text)
    if draft:
        if subject != "NAN 2026 사전 과제 제출 문서 (DRAFT)":
            raise SystemExit(f"Unexpected draft subject metadata in {path.name}: {subject!r}")
    else:
        if subject != "NAN 2026 사전 과제 제출 문서":
            raise SystemExit(f"Unexpected final subject metadata in {path.name}: {subject!r}")
        forbidden = ("DRAFT", "제출 금지", "입력 대기", "확인 대기", "미해소")
        found = [term for term in forbidden if term in text or term in subject]
        if found:
            raise SystemExit(f"Final hold text remains in {path.name}: {', '.join(found)}")
        if video_url is not None and links.count(video_url) != 2:
            raise SystemExit(
                f"Final guide must contain exactly two clickable video links; found {links.count(video_url)}"
            )
        for label, status in (("evidence", evidence_status), ("audio", audio_status)):
            if status is not None and whitespace_insensitive_text(status) not in whitespace_insensitive_text(text):
                raise SystemExit(f"Final {label} status was not rendered into {path.name}")

    return {
        "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
        "bytes": path.stat().st_size,
        "pages": page_count,
        "link_annotations": len(links),
    }


def publish_pair(
    staged: list[Path],
    destinations: list[Path],
    *,
    final: bool,
    manifest: dict[str, object] | None,
    build_dir: Path,
) -> None:
    if final:
        occupied = [str(path) for path in [*destinations, FINAL_MANIFEST] if path.exists()]
        if occupied:
            raise SystemExit(
                "Refusing to overwrite a final artifact set. Archive the existing PDFs and manifest first: "
                + ", ".join(occupied)
            )

    manifest_stage = build_dir / FINAL_MANIFEST.name
    if final:
        if manifest is None:
            raise SystemExit("Internal error: final manifest is missing")
        manifest_stage.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    placed: list[Path] = []
    try:
        for source, destination in zip(staged, destinations, strict=True):
            os.replace(source, destination)
            placed.append(destination)
        if final:
            os.replace(manifest_stage, FINAL_MANIFEST)
    except Exception:
        if final:
            for path in placed:
                path.unlink(missing_ok=True)
        raise


def main() -> None:
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--draft", action="store_true")
    mode.add_argument("--final", action="store_true")
    parser.add_argument("--video-url")
    parser.add_argument("--evidence-status")
    parser.add_argument("--audio-status")
    args = parser.parse_args()

    register_fonts()
    final_inputs: list[Path] = []
    validated_head: str | None = None
    audio_metrics: dict[str, dict[str, float]] = {}
    if args.final:
        if not args.video_url or not args.evidence_status or not args.audio_status:
            raise SystemExit("Final mode requires --video-url, --evidence-status, and --audio-status")
        validate_video_url(args.video_url)
        for label, value in (("evidence", args.evidence_status), ("audio", args.audio_status)):
            validate_resolved_status(label, value)
        validate_video_reachability(args.video_url)
        final_inputs, validated_head = validate_final_repository(args.evidence_status)
        audio_metrics = validate_audio_files_and_credit()
        validate_claimed_audio_metrics(args.audio_status, audio_metrics)
        replacements = {
            "{{YOUTUBE_URL}}": f"<{args.video_url}>",
            "{{EVIDENCE_CONTRACT_STATUS}}": args.evidence_status,
            "{{AUDIO_ATTRIBUTION_STATUS}}": args.audio_status,
        }
        guide_name = "HOTEL-VIRGIL-게임소개.pdf"
        tech_name = "HOTEL-VIRGIL-AI활용기술.pdf"
    else:
        replacements = {
            "{{YOUTUBE_URL}}": "**영상 URL 입력 대기**",
            "{{EVIDENCE_CONTRACT_STATUS}}": "해소 — 42a3814 · 기본 108/0 · 소각 9/0 · 1막 완주 PASS",
            "{{AUDIO_ATTRIBUTION_STATUS}}": (
                "DRAFT — fe11510 출력·귀속·도달성 검증 PASS · 사람 청감·final Pages 확인 대기"
            ),
        }
        guide_name = "HOTEL-VIRGIL-게임소개-DRAFT.pdf"
        tech_name = "HOTEL-VIRGIL-AI활용기술-DRAFT.pdf"

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    destinations = [OUT_DIR / guide_name, OUT_DIR / tech_name]
    with tempfile.TemporaryDirectory(prefix=".pdf-build-", dir=OUT_DIR) as raw_build_dir:
        build_dir = Path(raw_build_dir)
        source_dir = build_dir / "sources"
        staged = [build_dir / guide_name, build_dir / tech_name]
        build_one(
            SUBMISSION / "game-guide.md",
            staged[0],
            compact=False,
            draft=args.draft,
            replacements=replacements,
            temp_dir=source_dir,
        )
        build_one(
            SUBMISSION / "ai-tech.md",
            staged[1],
            compact=True,
            draft=args.draft,
            replacements=replacements,
            temp_dir=source_dir,
        )

        guide_report = inspect_pdf(
            staged[0],
            expected_pages=4,
            expected_title="HOTEL VIRGIL · 게임 소개",
            draft=args.draft,
            video_url=args.video_url if args.final else None,
            required_uris={
                PLAY_URL: 3,
                SOURCE_URL: 2,
                **({args.video_url: 2} if args.final and args.video_url else {}),
            },
        )
        tech_report = inspect_pdf(
            staged[1],
            expected_pages=8,
            expected_title="HOTEL VIRGIL · AI 활용 기술",
            draft=args.draft,
            evidence_status=args.evidence_status if args.final else None,
            audio_status=args.audio_status if args.final else None,
            required_uris={
                PLAY_URL: 1,
                SOURCE_URL: 1,
                CREDITS_URL: 2,
                CC_BY_URL: 1,
                OPENAI_TERMS_URL: 1,
                **{url: 1 for url in AUDIO_SOURCE_URLS},
                "https://threejs.org/": 1,
                "https://rapier.rs/": 1,
                "https://vite.dev/": 1,
                "https://playwright.dev/": 1,
            },
        )
        manifest = None
        if args.final:
            if validated_head is None:
                raise SystemExit("Internal error: final repository snapshot is missing")
            validate_repository_snapshot(validated_head)
            manifest = {
                "schema": 1,
                "mode": "final",
                "required_pair": [guide_name, tech_name],
                "video_url": args.video_url,
                "evidence_status": args.evidence_status,
                "audio_status": args.audio_status,
                "git_head": validated_head,
                "inputs": {
                    str(source.relative_to(ROOT)): hashlib.sha256(source.read_bytes()).hexdigest()
                    for source in final_inputs
                },
                "build_fonts": {
                    source.name: hashlib.sha256(source.read_bytes()).hexdigest()
                    for source in (FONT_REGULAR, FONT_BOLD, FONT_LIGHT)
                },
                "build_runtime": {
                    "python": platform.python_version(),
                    "reportlab": reportlab.Version,
                    "pdfplumber": pdfplumber.__version__,
                },
                "audio_metrics": audio_metrics,
                "verification": {
                    "elevator_3_state": "PASS",
                    "interrogation": "PASS",
                    "interrogation_burn": "PASS",
                    "act_1_playthrough": "PASS",
                },
                "files": {guide_name: guide_report, tech_name: tech_report},
            }
            validate_repository_snapshot(validated_head)
        publish_pair(staged, destinations, final=args.final, manifest=manifest, build_dir=build_dir)

    for destination in destinations:
        print(destination)
    if args.final:
        print(FINAL_MANIFEST)


if __name__ == "__main__":
    main()
