#!/usr/bin/env python3
"""Merge the professional knowledge base and published articles into one
document for upload to a Delphi Digital Mind.

Usage: python3 professional-knowledge/delphi/build_delphi_kb.py
Writes David_Clinton_Knowledge_Base.md and .docx next to this script.
"""
import re
from pathlib import Path

import yaml
from docx import Document
from docx.shared import Pt

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
KB = ROOT / "professional-knowledge" / "openai-upload-ready"
BLOG = ROOT / "content" / "blog"
SITE = "https://www.daveclintonn.cc"
OUT = HERE / "David_Clinton_Knowledge_Base"

# Sentences that are bookkeeping for the evidence system, not knowledge.
META = re.compile(
    r"(confirmed (firsthand )?by David Clinton|awaiting a source|evidence questions|"
    r"until supporting|attached\.|source audit|must (not|never) be disclosed|"
    r"Client names are under NDA|Git (history|author)|sole or dominant|dominant Git|Source-audited|"
    r"This list contains technologies|are claimed\.|Describe this work by|testimonials|"
    r"may be cited as shared|only technical details may be disclosed|Versions explicitly confirmed)",
    re.I,
)


def load(path):
    text = path.read_text()
    m = re.match(r"^---\n(.*?)\n---\n?(.*)$", text, re.S)
    if not m:
        return {}, text.strip()
    return yaml.safe_load(m.group(1)) or {}, m.group(2).strip()


def clean_body(body, demote=2):
    # Drop "Remaining evidence" style sections and meta sentences.
    body = re.split(r"\n## (Remaining evidence|Evidence standard|Authorship evidence)\b", body)[0]
    # Join hard-wrapped continuation lines in bullet lists.
    body = re.sub(r"\n[ \t]+(?=\S)", " ", body)
    if demote:
        body = re.sub(r"^(#+) ", lambda m: "#" * min(len(m.group(1)) + demote, 4) + " ", body, flags=re.M)
    out = []
    for para in re.split(r"\n\s*\n", body):
        flat = " ".join(l.strip() for l in para.splitlines()) if not para.lstrip().startswith(("-", "|", "#")) else para
        sentences = re.split(r"(?<=[.!?])\s+", flat) if not flat.lstrip().startswith(("-", "|", "#")) else [flat]
        if flat.lstrip().startswith("-"):
            sentences = [l for l in flat.splitlines() if not META.search(l)]
            if sentences:
                out.append("\n".join(sentences))
            continue
        kept = [s for s in sentences if not META.search(s)]
        if kept:
            out.append(" ".join(kept))
    return "\n\n".join(out).strip()


def names(items):
    return ", ".join(i["name"] if isinstance(i, dict) else str(i) for i in items or [])


def date_range(fm):
    start = str(fm.get("start_date") or "")[:7]
    end = str(fm.get("end_date") or "")[:7] or "present"
    return f"{start} to {end}" if start else ""


def claims(fm):
    lines = []
    for c in fm.get("claims") or fm.get("accomplishments") or []:
        if META.search(c["claim"]):
            continue
        line = f"- {c['claim']}"
        if c.get("source_url"):
            line += f" ({c['source_url']})"
        lines.append(line)
    if fm.get("claim"):
        line = f"- {re.split(r';\s*no traffic', fm['claim'])[0].rstrip('.')}."
        if fm.get("source_url"):
            line += f" ({fm['source_url']})"
        lines.append(line)
    return "\n".join(lines)


def kb(prefix):
    return sorted(KB.glob(f"{prefix}*.md"))


def experience_section():
    parts = ["# Work Experience"]
    companies = {}
    for f in kb("experience--"):
        _, company, kind = f.stem.split("--")
        companies.setdefault(company, {})[kind] = load(f)
    order = sorted(companies, key=lambda c: str(companies[c]["overview"][0].get("start_date")), reverse=True)
    for c in order:
        rec = companies[c]
        fm, body = rec["overview"]
        parts.append(f"## {fm.get('company_name', c)}: {fm.get('role', '')}")
        meta = [x for x in [date_range(fm), fm.get("location")] if x]
        if meta:
            parts.append(f"Dates and location: {' | '.join(meta)}")
        parts.append(clean_body(body))
        if "responsibilities" in rec:
            parts.append("### What I did\n\n" + clean_body(rec["responsibilities"][1]))
        if "accomplishments" in rec:
            acc = claims(rec["accomplishments"][0])
            extra = clean_body(rec["accomplishments"][1])
            parts.append("### Outcomes\n\n" + "\n\n".join(x for x in [acc, extra] if x))
        if "technologies" in rec:
            tfm, tbody = rec["technologies"]
            text = f"Technologies I used at {fm.get('company_name', c)}: {names(tfm.get('technologies'))}."
            extra = clean_body(tbody)
            parts.append("### Technologies\n\n" + text + ("\n\n" + extra if extra else ""))
    return parts


def projects_section():
    parts = ["# Projects"]
    projects = {}
    for f in kb("projects--"):
        _, slug, kind = f.stem.split("--")
        projects.setdefault(slug, {})[kind] = load(f)
    for slug in sorted(projects):
        rec = projects[slug]
        fm, body = rec.get("overview", ({}, ""))
        parts.append(f"## {fm.get('name', slug.replace('-', ' ').title())}")
        for key, label in [("problem", "Problem"), ("context", "Context")]:
            if fm.get(key) and not META.search(str(fm[key])):
                parts.append(f"{label}: {' '.join(str(fm[key]).split())}")
        if fm.get("skills"):
            parts.append(f"Skills: {names(fm['skills'])}.")
        if fm.get("technologies"):
            parts.append(f"Technologies: {names(fm['technologies'])}.")
        if body:
            parts.append(clean_body(body))
        if "evidence" in rec:
            ev = claims(rec["evidence"][0])
            if ev:
                parts.append("### What I built and shipped\n\n" + ev)
    return parts


def skills_section():
    parts = ["# Skills"]
    for f in kb("skills--"):
        fm, body = load(f)
        parts.append(f"## {fm.get('name', f.stem)}\n\n{clean_body(body)}")
    return parts


def evidence_section():
    parts = ["# Additional Verified Facts"]
    for f in kb("evidence--"):
        fm, _ = load(f)
        if "source-audit" in f.stem:  # internal repo inventories, covered elsewhere
            continue
        parts.append(f"## {fm.get('title', f.stem)}\n\n{claims(fm)}")
    return parts


def strip_mdx(text):
    text = re.sub(r"^import .*$", "", text, flags=re.M)
    text = re.sub(r"export const metadata = \{.*?\n\}\n", "", text, flags=re.S)
    text = re.sub(r"<(\w+)[^>]*/>", "", text, flags=re.S)  # self-closing components
    text = re.sub(r"<Image\b.*?/>", "", text, flags=re.S)
    text = re.sub(r"</?[A-Za-z][^>]*>", "", text)  # remaining tags, keep inner text
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def articles_section():
    parts = ["# My Published Articles\n\nThese are my own articles, in my own voice. They show how I think and write."]
    posts = []
    for f in BLOG.glob("*.mdx"):
        raw = f.read_text()
        if re.search(r"draft:\s*true", raw):
            continue
        title = re.search(r'title:\s*"(.*?)"', raw).group(1)
        date = re.search(r'date:\s*"(.*?)"', raw).group(1)
        desc = re.search(r'description:\s*"(.*?)"', raw)
        posts.append((date, title, desc.group(1) if desc else "", f.stem, strip_mdx(raw)))
    for date, title, desc, slug, body in sorted(posts, reverse=True):
        chunks = re.split(r"(```.*?```)", body, flags=re.S)
        body = "".join(c if c.startswith("```") else re.sub(r"^(#+) ", lambda m: "#" * min(len(m.group(1)) + 1, 4) + " ", c, flags=re.M) for c in chunks)
        parts.append(f"## {title}\n\nPublished {date} at {SITE}/blog/{slug}\n\n{desc}\n\n{body}")
    return parts


INTRO = f"""# David Clinton: Knowledge Base

This document is everything my Digital Mind should know about my work. It is written by me, about me. Where it says "I", that is David Clinton.

## Quick facts

- Name: David Clinton
- Role: Software Engineer (full-stack, platform, mobile, AI integration, DevRel)
- Based in: Mombasa, Kenya. I work remotely with international teams.
- Website: {SITE}
- Email: daveclintonn@icloud.com
- GitHub: https://github.com/daveclinton

## Things I have done that are not tied to one employer below

- The Mika AI agent I built runs in production, and I have handled real incidents with it.
- I have built an MCP (Model Context Protocol) server.
- I have carried on-call responsibility for production services.

## How I answer certain questions

- Client confidentiality: my Studio1HQ work is for clients under NDA. I never name those clients or their products. I describe the work by technical domain (video and media, web data and scraping, collaboration, AI cloud, cloud infrastructure).
- If someone asks about something not in this document, I say I'd need to check rather than guessing, and point them to my email.
- I do not claim tools, metrics or results that are not written here."""


def to_docx(md, path):
    doc = Document()
    doc.styles["Normal"].font.name = "Calibri"
    doc.styles["Normal"].font.size = Pt(11)
    # Render fenced code as plain monospace paragraphs, outside the block parser.
    chunks = re.split(r"(```.*?```)", md, flags=re.S)
    for chunk in chunks:
        if chunk.startswith("```"):
            code = "\n".join(chunk.splitlines()[1:-1])
            run = doc.add_paragraph().add_run(code)
            run.font.name = "Courier New"
            run.font.size = Pt(9)
            continue
        render_blocks(doc, chunk)
    doc.save(path)


def render_blocks(doc, md):
    for block in md.split("\n\n"):
        block = block.strip()
        if not block:
            continue
        lines = block.splitlines()
        if lines[0].startswith("|"):
            rows = [[c.strip() for c in l.strip("|").split("|")] for l in lines if not re.match(r"^\|\s*-", l)]
            t = doc.add_table(rows=len(rows), cols=len(rows[0]))
            t.style = "Table Grid"
            for i, row in enumerate(rows):
                for j, cell in enumerate(row[: len(rows[0])]):
                    t.cell(i, j).text = re.sub(r"\[(.*?)\]\((.*?)\)", r"\1 (\2)", cell).replace("**", "")
            continue
        for line in lines:
            m = re.match(r"^(#{1,4}) (.*)", line)
            text = re.sub(r"\[(.*?)\]\((.*?)\)", r"\1 (\2)", line).replace("**", "").replace("`", "")
            if m:
                doc.add_heading(re.sub(r"\[(.*?)\]\((.*?)\)", r"\1", m.group(2)), level=len(m.group(1)))
            elif re.match(r"^\s*[-*] ", line):
                doc.add_paragraph(re.sub(r"^\s*[-*] ", "", text), style="List Bullet")
            elif re.match(r"^\s*\d+\. ", line):
                doc.add_paragraph(re.sub(r"^\s*\d+\. ", "", text), style="List Number")
            elif line.startswith(">"):
                doc.add_paragraph(text.lstrip("> "), style="Quote")
            else:
                doc.add_paragraph(text)


def main():
    _, profile = load(KB / "person--profile.md")
    sections = [INTRO, "# Profile\n\n" + clean_body(profile, demote=0)]
    for fn in (experience_section, projects_section, skills_section, evidence_section, articles_section):
        sections.append("\n\n".join(p for p in fn() if p))
    md = "\n\n".join(sections) + "\n"
    # Paragraphs in the source are hard-wrapped; join wrapped prose lines.
    OUT.with_suffix(".md").write_text(md)
    to_docx(md, OUT.with_suffix(".docx"))
    print(f"{OUT}.md  {len(md.split())} words")
    print(f"{OUT}.docx")


if __name__ == "__main__":
    main()
