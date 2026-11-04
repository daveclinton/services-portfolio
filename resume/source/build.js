const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle, LevelFormat, ExternalHyperlink,
} = require("docx");
const c = require("./content");

const OUT = process.argv[2];
const FONT = "Calibri";
const SIZE = 20; // half-points: 10.5pt

const run = (text, opts = {}) => new TextRun({ text, font: FONT, size: SIZE, ...opts });

// Contact items keep their visible text (what an ATS reads) and get a link target.
const linkFor = (item) => {
  if (item.includes("@")) return "mailto:" + item;
  if (item.startsWith("+")) return "tel:" + item.replace(/\s/g, "");
  if (/^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(item)) return "https://" + item;
  return null;
};

const contactRuns = (line) => {
  const out = [];
  line.forEach((item, i) => {
    if (i) out.push(run("  |  ", { size: 19 }));
    const href = linkFor(item);
    out.push(href
      ? new ExternalHyperlink({ link: href, children: [run(item, { size: 19, color: "1F4E79" })] })
      : run(item, { size: 19 }));
  });
  return out;
};

const heading = (text) =>
  new Paragraph({
    spacing: { before: 160, after: 60 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "444444", space: 2 } },
    children: [run(text.toUpperCase(), { bold: true, size: 23 })],
  });

const bullet = (text) =>
  new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    spacing: { after: 40 },
    children: [run(text)],
  });

const para = (children, spacing = { after: 60 }) => new Paragraph({ spacing, children });

const body = [];
body.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 20 },
  children: [run(c.name, { bold: true, size: 34 })] }));
body.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 20 },
  children: [run(c.headline, { size: 22 })] }));
c.contact.forEach((line, i) => body.push(new Paragraph({ alignment: AlignmentType.CENTER,
  spacing: { after: i === c.contact.length - 1 ? 80 : 0 }, children: contactRuns(line) })));

body.push(heading("Summary"));
body.push(para([run(c.summary)]));

body.push(heading("Skills"));
for (const [label, list] of c.skills)
  body.push(para([run(label + ": ", { bold: true }), run(list)], { after: 30 }));

body.push(heading("Experience"));
for (const job of c.experience) {
  body.push(new Paragraph({ spacing: { before: 120, after: 0 }, keepNext: true,
    children: [run(job.role, { bold: true }), run(", " + job.company, { bold: true })] }));
  body.push(new Paragraph({ spacing: { after: 40 }, keepNext: true,
    children: [run(`${job.place}  |  ${job.dates}`, { italics: true })] }));
  job.bullets.forEach((b) => body.push(bullet(b)));
}

body.push(heading("Selected Projects"));
for (const p of c.projects) {
  body.push(new Paragraph({ spacing: { before: 80, after: 0 }, keepNext: true,
    children: [run(p.title, { bold: true }), run("  |  " + p.stack, { italics: true })] }));
  body.push(para([run(p.text)]));
}

body.push(heading("Education"));
c.education.forEach((e) => body.push(para([run(e)])));
body.push(heading("Certifications"));
c.certifications.forEach((e) => body.push(para([run(e)])));
body.push(heading("Referees"));
body.push(para([run(c.referees)]));

const doc = new Document({
  creator: c.name,
  title: `${c.name} - Resume`,
  numbering: { config: [{ reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET,
    text: "•", alignment: AlignmentType.LEFT,
    style: { paragraph: { indent: { left: 360, hanging: 240 } } } }] }] },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, // A4
      margin: { top: 760, bottom: 760, left: 860, right: 860 } } },
    children: body,
  }],
});

// HTML for the PDF, from the same content.
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>${esc(c.name)} - Resume</title>
<style>
@page { size: A4; margin: 12mm 15mm; }
body { font-family: Calibri, Carlito, Arial, sans-serif; font-size: 10pt; line-height: 1.25; color: #111; margin: 0; }
h1 { font-size: 17pt; text-align: center; margin: 0 0 1pt; }
.headline { text-align: center; font-size: 11pt; margin: 0 0 1pt; }
.contact { text-align: center; font-size: 9.5pt; margin: 0; }
.contact:last-of-type { margin-bottom: 4pt; }
.contact a { color: #1F4E79; text-decoration: none; }
h2 { font-size: 11.5pt; text-transform: uppercase; border-bottom: 0.75pt solid #444; padding-bottom: 1pt; margin: 6pt 0 3pt; }
p { margin: 0 0 3pt; }
.job { break-inside: avoid-page; }
.role { font-weight: bold; margin: 6pt 0 0; }
.meta { font-style: italic; margin: 0 0 2pt; }
ul { margin: 0 0 2pt; padding-left: 14pt; }
li { margin: 0 0 2pt; }
.skill { margin: 0 0 1.5pt; }
</style></head><body>
<h1>${esc(c.name)}</h1>
<p class="headline">${esc(c.headline)}</p>
${c.contact.map((line) => `<p class="contact">${line.map((i) => linkFor(i) ? `<a href="${linkFor(i)}">${esc(i)}</a>` : esc(i)).join(" &nbsp;|&nbsp; ")}</p>`).join("")}
<h2>Summary</h2><p>${esc(c.summary)}</p>
<h2>Skills</h2>${c.skills.map(([l, s]) => `<p class="skill"><b>${esc(l)}:</b> ${esc(s)}</p>`).join("")}
<h2>Experience</h2>${c.experience.map((j) => `<p class="role">${esc(j.role)}, ${esc(j.company)}</p>
<p class="meta">${esc(j.place)} &nbsp;|&nbsp; ${esc(j.dates)}</p>
<ul>${j.bullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>`).join("")}
<h2>Selected Projects</h2>${c.projects.map((p) => `<p class="role">${esc(p.title)} <i style="font-weight:normal">&nbsp;|&nbsp; ${esc(p.stack)}</i></p><p>${esc(p.text)}</p>`).join("")}
<h2>Education</h2>${c.education.map((e) => `<p>${esc(e)}</p>`).join("")}
<h2>Certifications</h2>${c.certifications.map((e) => `<p>${esc(e)}</p>`).join("")}
<h2>Referees</h2><p>${esc(c.referees)}</p>
</body></html>`;

const base = path.join(OUT, "David_Clinton_Hellen_Resume");
fs.writeFileSync(base + ".html", html);
Packer.toBuffer(doc).then((buf) => { fs.writeFileSync(base + ".docx", buf); console.log("written", base); });
