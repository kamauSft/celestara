#!/usr/bin/env python3
"""Generate the CVM business-case Word document for Neo + Nyumba Zetu."""

from __future__ import annotations

from pathlib import Path

from docx import Document
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Inches, Pt, RGBColor

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "CVM-Agentic-AI-Neo-Nyumba-Zetu.docx"
SCREENSHOT = ROOT / "demo-cvm.png"
INK = RGBColor(0x12, 0x20, 0x2C)
MUTED = RGBColor(0x4D, 0x62, 0x70)
NEO = RGBColor(0xC4, 0x5C, 0x1E)
NY = RGBColor(0x1C, 0x6A, 0x96)
GO = RGBColor(0x1C, 0x7A, 0x4C)


def shade(cell, hex_color: str) -> None:
    tc = cell._tePr if hasattr(cell, "_tePr") else cell._tc
    tcPr = tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:fill"), hex_color)
    shd.set(qn("w:val"), "clear")
    tcPr.append(shd)


def set_run(run, *, size=11, bold=False, color=INK, italic=False, name="Calibri"):
    run.font.name = name
    run._element.rPr.rFonts.set(qn("w:eastAsia"), name)
    run.font.size = Pt(size)
    run.bold = bold
    run.italic = italic
    run.font.color.rgb = color


def p(doc, text, *, size=11, bold=False, color=INK, space_after=8, space_before=0, italic=False, align=None):
    para = doc.add_paragraph()
    para.paragraph_format.space_after = Pt(space_after)
    para.paragraph_format.space_before = Pt(space_before)
    para.paragraph_format.line_spacing = 1.15
    if align:
        para.alignment = align
    run = para.add_run(text)
    set_run(run, size=size, bold=bold, color=color, italic=italic)
    return para


def heading(doc, text, level=1):
    h = doc.add_heading(text, level=level)
    for run in h.runs:
        run.font.color.rgb = INK
        run.font.name = "Calibri"
    return h


def add_table(doc, headers, rows, col_widths=None, header_fill="1C3D56"):
    table = doc.add_table(rows=1 + len(rows), cols=len(headers))
    table.style = "Table Grid"
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    hdr = table.rows[0].cells
    for i, h in enumerate(headers):
        hdr[i].text = ""
        para = hdr[i].paragraphs[0]
        run = para.add_run(h)
        set_run(run, size=10, bold=True, color=RGBColor(255, 255, 255))
        shade(hdr[i], header_fill)
    for r_i, row in enumerate(rows):
        for c_i, val in enumerate(row):
            cell = table.rows[r_i + 1].cells[c_i]
            cell.text = ""
            para = cell.paragraphs[0]
            run = para.add_run(str(val))
            set_run(run, size=10, color=INK)
            if r_i % 2 == 1:
                shade(cell, "F4F7F9")
    if col_widths:
        for row in table.rows:
            for i, w in enumerate(col_widths):
                row.cells[i].width = Cm(w)
    doc.add_paragraph()
    return table


def build(screenshot: Path | None = None) -> Path:
    doc = Document()
    section = doc.sections[0]
    section.top_margin = Cm(1.8)
    section.bottom_margin = Cm(1.8)
    section.left_margin = Cm(2.0)
    section.right_margin = Cm(2.0)

    footer = section.footer.paragraphs[0]
    footer.alignment = WD_ALIGN_PARAGRAPH.CENTER
    fr = footer.add_run(
        "Codzure Solutions  ·  Confidential working draft  ·  CVM framework  ·  Neo + Nyumba Zetu  ·  Source: codzure-solutions.vercel.app"
    )
    set_run(fr, size=8, color=MUTED)

    p(doc, "CODZURE SOLUTIONS  ·  KAREN, NAIROBI", size=10, bold=True, color=NY, space_after=4)
    p(doc, "Business case & CVM demo pack", size=12, color=MUTED, space_after=4)
    p(
        doc,
        "Agentic AI for Neo (NeoBuk) and Nyumba Zetu (Ask Nyumbani)",
        size=22,
        bold=True,
        space_after=6,
    )
    p(
        doc,
        "Customer · Value · Mechanism — a top 0.5% agent finishes a job the user already pays for with time, cash, or fear, then waits for a yes before anything important is saved.",
        size=12,
        italic=True,
        color=MUTED,
        space_after=10,
    )
    p(doc, "Product source of truth: https://codzure-solutions.vercel.app/", size=11, color=NY, space_after=4)
    p(doc, "Companion demo board: agent/demo.html  ·  Full narrative: agent/BUSINESS_CASE.md", size=10, color=MUTED)

    heading(doc, "1. Why this document exists", 1)
    p(
        doc,
        "This pack tells the team what we are building on the two live Codzure product concepts — NeoBuk and Ask Nyumbani — and forces every feature through a CVM (Customer–Value–Mechanism) gate. If we cannot name the customer, the value, and the mechanism on one screen, we are shipping a chat widget, not a top-0.5% agent.",
    )
    p(
        doc,
        "We do not win by wrapping a language model in a text box. That is what most product AI looks like. We win if Neo turns a spoken sale into a confirmed ledger row, and Nyumba Zetu turns a plain-language search into real listings plus a title walkthrough bound to that listing.",
    )

    heading(doc, "2. The CVM framework (non-negotiable)", 1)
    p(
        doc,
        "CVM here is Customer Value Management, expressed as three operating questions. Every tool, screen, and demo line must answer all three.",
    )
    add_table(
        doc,
        ["Pillar", "Question the team must answer", "Pass test"],
        [
            [
                "C — Customer",
                "Whose job is this, in their words, on their phone, in Kenya?",
                "We can name the person, the workaround they use today, and the fear or cost they already pay.",
            ],
            [
                "V — Value",
                "What finished job do they walk away with?",
                "A confirmed action or a grounded answer from their data — not a fluent paragraph.",
            ],
            [
                "M — Mechanism",
                "How does the agent do it without breaking trust?",
                "A named tool, a port, confirm-before-write on any save, and a way to say “I don’t know.”",
            ],
        ],
        col_widths=[4.2, 6.4, 6.4],
    )
    p(doc, "CVM cycle we run on both products", size=12, bold=True, space_before=4)
    add_table(
        doc,
        ["Stage", "What we do", "Neo example", "Nyumba Zetu example"],
        [
            ["1. Identify", "Who is the user on this product?", "Hardware/retail SME owner", "Land/home buyer or seller in Nairobi–Kiambu"],
            ["2. Understand", "Job, pain, current workaround", "Notebook + WhatsApp + memory", "Portals, brokers, Facebook; fraud fear"],
            ["3. Design value", "One flagship job", "Spoken sale → draft → confirm", "Sentence search + listing-bound title checklist"],
            ["4. Deliver", "Agent + tools on their data", "record_sale, outstanding, alerts", "search_listings, run_due_diligence"],
            ["5. Capture", "Trust + next use", "Owner taps Confirm; books stay theirs", "Buyer reaches next actions; never pays cash in a car park"],
            ["6. Measure", "Scorecard, not token counts", "Time to first confirmed sale", "Search precision; diligence completion on a real listing"],
        ],
        col_widths=[3.2, 4.4, 5.2, 5.2],
    )

    heading(doc, "3. The two products (from the Codzure website)", 1)
    p(
        doc,
        "Both products are published as concepts/case studies on the Codzure Solutions site. The agent layer is one brain pointed at two toolkits. Facts below are grounded in that site and must stay static in the agent (not fetched at runtime).",
    )
    add_table(
        doc,
        ["", "Neo · NeoBuk", "Nyumba Zetu · Ask Nyumbani"],
        [
            ["Site positioning", "Mobile-first SME workspace", "East African property and land discovery"],
            ["Who", "Owners who keep the shop in their head or a notebook", "Buyers and sellers in Nairobi, Kiambu, Westlands, Ruaka, Syokimau, Karen"],
            ["Website capabilities", "Sales tracking & reporting; expense management; inventory visibility; operational workflows", "Location-based search; title-checklist guidance; curated resale marketplace; native Android experience"],
            ["CVM Customer", "Time-poor owner leaking money on credit and dead stock", "Buyer who is afraid of being scammed; seller who needs a clean listing"],
            ["CVM Value", "The afternoon back + money caught", "Matches without 12 checkboxes + a purchase that feels safer"],
            ["CVM Mechanism", "Natural-language sale draft; insights from this shop; alerts as drafts", "Search that reads now; diligence bound to titleStatus; comps for sellers; confirm to publish"],
            ["If we miss CVM", "A chatbot that talks about bookkeeping", "A listings FAQ bot"],
        ],
        col_widths=[4.0, 6.5, 6.5],
        header_fill="1C3D56",
    )
    p(doc, "Studio facts the agent must not get wrong", size=12, bold=True)
    p(
        doc,
        "Codzure Solutions — Karen, Nairobi, Kenya. Android, iOS, websites, backends and admin portals for African businesses. Practicality first; mobile-first; one month free maintenance after launch. Contact on site: codzuresolutions@gmail.com · +254 715 227 409 (WhatsApp). Currency for both products: KES.",
    )

    heading(doc, "4. Demo screenshot — what we are working on", 1)
    p(
        doc,
        "The visual demo (agent/demo.html) puts both product phones on one board under the CVM bar. It is the object we show a real owner and a real buyer. If they do not say “wait — that’s actually useful,” the design has failed the V in CVM.",
    )

    shot = screenshot if screenshot and screenshot.exists() else None
    if shot:
        doc.add_picture(str(shot), width=Inches(6.6))
        cap = doc.paragraphs[-1]
        cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p(
            doc,
            "Figure 1. Dual-product CVM demo: Neo sale draft (left) and Nyumba search + title risk (right).",
            size=9,
            italic=True,
            color=MUTED,
            align=WD_ALIGN_PARAGRAPH.CENTER,
        )
    else:
        p(
            doc,
            "[Screenshot is generated from agent/demo.html and inserted here when captured. Open demo.html in a browser at 1440×900 to regenerate.]",
            italic=True,
            color=MUTED,
        )

    heading(doc, "5. Flagship journeys mapped to CVM", 1)
    p(doc, "Neo — 20 seconds versus a notebook", size=13, bold=True, color=NEO)
    add_table(
        doc,
        ["Step", "What happens", "CVM"],
        [
            ["1", "Owner: “sold 3 bags cement to Mary, 1,500”", "C — spoken job, not a form"],
            ["2", "Agent shows draft: Mary · 3 × cement · KES 1,500 · unpaid?", "V — structured sale they can trust"],
            ["3", "Owner taps Confirm. Ledger updates once.", "M — confirm-before-write"],
            ["4", "“Who has outstanding balances?” → named, aged debt from this shop", "V — money that would leak"],
            ["5", "Alert: cement at 4, reorder 12 — restock note is still a draft", "M — agent watches; owner approves"],
        ],
        header_fill="C45C1E",
    )
    p(doc, "Nyumba Zetu — search, then safety", size=13, bold=True, color=NY)
    add_table(
        doc,
        ["Step", "What happens", "CVM"],
        [
            ["1", "Buyer: “3-bedroom in Ruaka under 8M near a school”", "C — East African buyer, plain language"],
            ["2", "Real matches with price, nearby, title status", "V — not a recap of the query"],
            ["3", "“Walk me through the cheap plot.”", "C — fraud fear is the job"],
            ["4", "Checklist on that listing. Unverified/disputed = high risk. Never cash in a car park.", "V + M — guide, not a legal verdict"],
            ["5", "Seller path: draft listing + comps → confirm", "M — writes are drafts"],
        ],
        header_fill="1C6A96",
    )

    heading(doc, "6. What to build (capability order)", 1)
    p(doc, "Do not skip down this list because a slide looks busier. P0 must be true before we call it a product.", space_after=8)
    add_table(
        doc,
        ["Priority", "#", "Capability", "Done when (CVM pass)"],
        [
            ["P0", "1", "Neo: natural-language sale → draft → confirm", "Customer utterance becomes fields; Confirm writes once; Sheng/English mix works"],
            ["P0", "2", "Nyumba: sentence search", "Ruaka + 3-bed + under 8M + school returns real matches"],
            ["P0", "3", "Confirm / discard by draft id", "UI can commit without re-parsing"],
            ["P0", "4", "Golden evals + tool logs", "Frozen utterances; CI fails on parse/search regression"],
            ["P0", "5", "Standalone /agent on stubs", "Runs with no host app; isolation held"],
            ["P1", "6", "Due diligence bound to a listing", "Documents + red flags from titleStatus; disclaimer present"],
            ["P1", "7–8", "Neo performance + outstanding", "Answers from this shop’s books"],
            ["P1", "9", "Proactive alerts as drafts", "Low stock / overdue / thin margin — never auto-purchase"],
            ["P1", "10", "Seller listing + comps", "Price shows sample size; publish needs confirm"],
            ["P2", "11+", "WhatsApp, official search partnership, voice", "Only after P0 is boring"],
        ],
        header_fill="1C7A4C",
    )
    p(doc, "Never (CVM veto)", size=12, bold=True, color=RGBColor(0x9B, 0x23, 0x35))
    p(
        doc,
        "General ask-me-anything. Silent writes. Guaranteeing a title is clean. Two separate agents. Fine-tuning before we have confirmed actions. Inventing listings or balances when a port returns empty. Auto-chasing customers without confirmation.",
    )

    heading(doc, "7. Mechanism architecture (one engine, two products)", 1)
    p(
        doc,
        "User (app, later WhatsApp) → handleAgentMessage → loop (LLM tools or local operations brain) → getTools(“neo” | “nyumba”) → ports in contract.ts → stub adapters now / real adapters at merge → host backends we never edit.",
    )
    p(
        doc,
        "Isolation: everything lives in /agent. HTTP under /agent/*. Env AGENT_*. Merge is purely additive: registerAgent(...) plus swapping stubs. The meeting point with the other developer is one file: contract.ts (Sale, Listing, AgentRequest, AgentResponse, every Port).",
    )

    heading(doc, "8. Scorecard — how we know CVM is working", 1)
    add_table(
        doc,
        ["Metric", "Healthy (0.5%)", "Broken CVM (average)"],
        [
            ["Time to first confirmed Neo sale", "Under a minute including yes", "Five minutes of chat, nothing saved"],
            ["Draft confirmation rate", "Yes because the draft is right", "They retype it into the old form"],
            ["Search precision", "Area + price + beds", "Generic 3-bed “in Nairobi”"],
            ["Diligence completion", "Next actions on a specific listing", "Generic 800-word essay"],
            ["Empty results", "“I don’t have Karen under 2M”", "Invented properties"],
            ["Evals", "Run on every change", "“It felt better this afternoon”"],
            ["Degraded mode", "Flagship jobs work without an API key", "Demo cancelled"],
        ],
    )

    heading(doc, "9. Decision checklist", 1)
    for item in [
        "We are building an operator, not a mascot.",
        "Every feature must pass C (customer), V (finished job), M (named mechanism + confirm on writes).",
        "Two flagship tools + confirmation + evals before WhatsApp or extra tools.",
        "Due diligence is the Nyumba differentiator — guidance with a disclaimer, never a title guarantee.",
        "One contract file is the meeting point with the other developer.",
        "Any tool that writes without a draft is killed.",
        "We will not start a second agent stack for the second product.",
    ]:
        p(doc, "☐  " + item, space_after=4)

    heading(doc, "10. Immediate next actions", 1)
    for i, item in enumerate(
        [
            "Lock contract.ts with the host developer (Sale, Listing, request/response, ports).",
            "Freeze ~20 golden utterances per product, including Sheng mix and “who built this.”",
            "Build the two flagship tools on Kenyan stub data (the journeys in Figure 1).",
            "Ship confirmation protocol used by both products.",
            "Standalone runner + one-line INTEGRATION.md. Put demo.html in a real owner’s and a real buyer’s hands. Listen for “useful,” not “cool.”",
            "Only then: listing-bound diligence, Neo alerts, seller comps, WhatsApp as a channel adapter.",
        ],
        start=1,
    ):
        p(doc, f"{i}.  {item}", space_after=4)

    p(
        doc,
        "That sequence is the competitive, reasonable solution. Everything else is theatre.",
        bold=True,
        space_before=8,
    )

    heading(doc, "Appendix — Product facts (do not invent)", 1)
    p(
        doc,
        "Neo = NeoBuk. Nyumba Zetu = Ask Nyumbani. Markets: Nairobi, Kiambu, Westlands, Ruaka, Syokimau, Karen. Diligence is a guide, not a legal determination. Studio: https://codzure-solutions.vercel.app/",
    )

    doc.save(OUT)
    return OUT


if __name__ == "__main__":
    path = build(SCREENSHOT if SCREENSHOT.exists() else None)
    print(path)
