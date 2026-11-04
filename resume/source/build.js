// Builds resumes as PDF, the only output format. Needs Google Chrome.
//
//   node build.js                                 build every file in content/
//   node build.js content/fal-site-reliability.js  build one
//
// Each content file sets `output`, named Company_Role, and the PDF goes in resume/.
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const CHROME = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const RESUME_DIR = path.join(__dirname, "..");
const CONTENT_DIR = path.join(__dirname, "content");

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

// Content may use [text](url) links and `code`.
const inline = (s) =>
  esc(s)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/`([^`]+)`/g, "<code>$1</code>");

// Contact items keep their visible text (what an ATS reads) and get a link target.
const linkFor = (item) => {
  if (item.includes("@")) return "mailto:" + item;
  if (item.startsWith("+")) return "tel:" + item.replace(/\s/g, "");
  if (/^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(item)) return "https://" + item;
  return null;
};

const list = (items) => `<ul>${items.map((b) => `<li>${inline(b)}</li>`).join("")}</ul>`;

const jobs = (items) =>
  items
    .map((j) => `<div class="job"><p class="role">${esc(j.role)}, ${esc(j.company)}</p>
<p class="meta">${esc(j.place)} &nbsp;|&nbsp; ${esc(j.dates)}</p>
${list(j.bullets)}</div>`)
    .join("");

const sections = {
  summary: (c) =>
    `<h2>Summary</h2>${[].concat(c.summary).map((p) => `<p>${inline(p)}</p>`).join("")}`,
  skills: (c) =>
    `<h2>Skills</h2>${c.skills.map(([l, s]) => `<p class="skill"><b>${esc(l)}:</b> ${inline(s)}</p>`).join("")}`,
  experience: (c) => `<h2>${esc(c.experienceTitle || "Experience")}</h2>${jobs(c.experience)}`,
  moreExperience: (c) => `<h2>${esc(c.moreExperienceTitle)}</h2>${jobs(c.moreExperience)}`,
  projects: (c) =>
    `<h2>${esc(c.projectsTitle || "Selected Projects")}</h2>${c.projects
      .map((p) => {
        const stack = p.stack ? ` <i class="stack">&nbsp;|&nbsp; ${inline(p.stack)}</i>` : "";
        const text = p.text ? `<p>${inline(p.text)}</p>` : "";
        const bullets = p.bullets ? list(p.bullets) : "";
        return `<div class="job"><p class="role">${esc(p.title)}${stack}</p>${text}${bullets}</div>`;
      })
      .join("")}`,
  writing: (c) => `<h2>${esc(c.writingTitle || "Writing")}</h2>${list(c.writing)}`,
  education: (c) => `<h2>Education</h2>${c.education.map((e) => `<p>${inline(e)}</p>`).join("")}`,
  certifications: (c) =>
    `<h2>Certifications</h2>${c.certifications.map((e) => `<p>${inline(e)}</p>`).join("")}`,
  referees: (c) => `<h2>Referees</h2><p>${inline(c.referees)}</p>`,
};

const DEFAULT_ORDER = ["summary", "skills", "experience", "projects", "education", "certifications", "referees"];

const toHtml = (c) => `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>${esc(c.name)} - Resume</title>
<style>
@page { size: A4; margin: 12mm 15mm; }
body { font-family: Calibri, Carlito, Arial, sans-serif; font-size: 10pt; line-height: 1.25; color: #111; margin: 0; }
h1 { font-size: 17pt; text-align: center; margin: 0 0 1pt; }
.headline { text-align: center; font-size: 11pt; margin: 0 0 1pt; }
.contact { text-align: center; font-size: 9.5pt; margin: 0; }
.contact:last-of-type { margin-bottom: 4pt; }
a { color: #1F4E79; text-decoration: none; }
code { font-family: Menlo, Consolas, monospace; font-size: 8.5pt; }
h2 { font-size: 11.5pt; text-transform: uppercase; border-bottom: 0.75pt solid #444; padding-bottom: 1pt; margin: 8pt 0 3pt; break-after: avoid; }
p { margin: 0 0 3pt; }
.job { break-inside: avoid-page; }
.role { font-weight: bold; margin: 6pt 0 0; }
.stack { font-weight: normal; }
.meta { font-style: italic; margin: 0 0 2pt; }
ul { margin: 0 0 2pt; padding-left: 14pt; }
li { margin: 0 0 2pt; }
.skill { margin: 0 0 1.5pt; }
</style></head><body>
<h1>${esc(c.name)}</h1>
<p class="headline">${esc(c.headline)}</p>
${c.contact
  .map((line) => `<p class="contact">${line
    .map((i) => (linkFor(i) ? `<a href="${linkFor(i)}">${esc(i)}</a>` : esc(i)))
    .join(" &nbsp;|&nbsp; ")}</p>`)
  .join("\n")}
${(c.order || DEFAULT_ORDER).map((name) => sections[name](c)).join("\n")}
</body></html>`;

const build = (file) => {
  const c = require(path.resolve(file));
  if (!/^[A-Za-z0-9]+(_[A-Za-z0-9]+)+\.pdf$/.test(c.output || "")) {
    throw new Error(`${file}: output must be named Company_Role.pdf, got "${c.output}"`);
  }
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "resume-"));
  const page = path.join(tmp, "resume.html");
  const pdf = path.join(RESUME_DIR, c.output);
  try {
    fs.writeFileSync(page, toHtml(c));
    execFileSync(CHROME, [
      "--headless=new",
      "--disable-gpu",
      "--no-pdf-header-footer",
      `--user-data-dir=${path.join(tmp, "profile")}`,
      `--print-to-pdf=${pdf}`,
      "file://" + page,
    ], { stdio: "ignore", timeout: 60000 });
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  console.log("written", pdf);
};

const args = process.argv.slice(2);
const files = args.length
  ? args
  : fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith(".js")).map((f) => path.join(CONTENT_DIR, f));
files.forEach(build);
