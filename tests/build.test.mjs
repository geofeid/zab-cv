// Unit tests for scripts/build.mjs (no Chrome, no sass needed).
// Run: npm test

import test from "node:test";
import assert from "node:assert/strict";
import {
  validateContent,
  visibleTextLength,
  renderExperienceItems,
  buildHtml,
  countPdfPages,
} from "../scripts/build.mjs";

const env = (entries) => new Map(Object.entries(entries));

// ---- Validate-Content ----

test("validation passes under limits", () => {
  const failures = validateContent(env({ NAME: "short" }), env({ DEFAULT_MAX: "90" }));
  assert.deepEqual(failures, []);
});

test("validation fails over the default limit", () => {
  const failures = validateContent(env({ NAME: "x".repeat(91) }), env({ DEFAULT_MAX: "90" }));
  assert.equal(failures.length, 1);
  assert.match(failures[0], /NAME is 91 chars; max is 90/);
});

test("numbered keys fall back to generic EXP_/CERT_ limits", () => {
  const limits = env({ DEFAULT_MAX: "90", EXP_DESC1: "10" });
  const failures = validateContent(env({ EXP3_DESC1: "x".repeat(11) }), limits);
  assert.equal(failures.length, 1);
  assert.match(failures[0], /EXP3_DESC1 is 11 chars; max is 10/);
});

test("numbered PROJ keys fall back to the generic PROJ_ limit", () => {
  const limits = env({ DEFAULT_MAX: "90", PROJ_DESC: "10" });
  assert.deepEqual(validateContent(env({ PROJ3_DESC: "x".repeat(10) }), limits), []);
  const failures = validateContent(env({ PROJ3_DESC: "x".repeat(11) }), limits);
  assert.equal(failures.length, 1);
  assert.match(failures[0], /PROJ3_DESC is 11 chars; max is 10/);
});

test("HTML tags are not counted", () => {
  assert.equal(visibleTextLength("<b>ab</b>c"), 3);
});

test("explicit key limit overrides generic and default", () => {
  const limits = env({ DEFAULT_MAX: "5", EXP1_DESC1: "20" });
  const failures = validateContent(env({ EXP1_DESC1: "x".repeat(15) }), limits);
  assert.deepEqual(failures, []);
});

// ---- Render-Experience ----

const experienceEnv = env({
  EXP1_COMPANY: "Oldest Co",
  EXP1_DATES: "2020",
  EXP1_ROLE: "Dev",
  EXP1_DESC1: "one",
  EXP1_DESC2: "two",
  EXP2_COMPANY: "Newer Co",
  EXP2_COMPANY_SHORT: "NewCo",
  EXP2_DATES: "2022",
  EXP2_ROLE: "Lead",
  EXP2_DESC1: "alpha",
});

test("experience items render newest number first", () => {
  const html = renderExperienceItems(experienceEnv);
  assert.ok(html.indexOf("Newer Co") < html.indexOf("Oldest Co"));
});

test("data-short attribute only when the key exists", () => {
  const html = renderExperienceItems(experienceEnv);
  assert.match(html, /data-short="NewCo"/);
  assert.equal((html.match(/data-short/g) || []).length, 1);
});

test("flatten joins numbered descriptions into one paragraph", () => {
  const html = renderExperienceItems(experienceEnv, { flattenDescriptions: true });
  assert.match(html, /<p class="para">one two<\/p>/);
});

test("single EXPn_DESC wins over numbered descriptions", () => {
  const values = new Map(experienceEnv);
  values.set("EXP1_DESC", "the single one");
  const html = renderExperienceItems(values);
  assert.match(html, /the single one/);
  assert.doesNotMatch(html, /<p class="para exp">one<\/p>/);
});

// ---- Build html ----

const template = `<html><head><link rel="stylesheet" href="css/main.css" /></head>
<body><main>
<h1 data-short="{{MISSING_SHORT}}">{{TITLE}}</h1>
<!-- EXPERIENCE_ITEMS_START -->old stuff<!-- EXPERIENCE_ITEMS_END -->
</main></body></html>`;

test("buildHtml substitutes, swaps stylesheet, regenerates experience", () => {
  const values = new Map(experienceEnv);
  values.set("TITLE", "Hello");
  const html = buildHtml(template, values, "css/print.css", { bodyClass: "print-page" });
  assert.match(html, /href="css\/print.css"/);
  assert.match(html, /<body class="print-page">/);
  assert.match(html, />Hello</);
  assert.doesNotMatch(html, /old stuff/);
  assert.match(html, /Newer Co/);
  assert.doesNotMatch(html, /data-short="\{\{/);
});

test("buildHtml throws on unresolved placeholders", () => {
  assert.throws(
    () => buildHtml("<html><body>{{NOPE}}</body></html>", env({}), "css/main.css"),
    /Unresolved placeholders: \{\{NOPE\}\}/
  );
});

// ---- PDF page count (the one-page A4 rule) ----

// Minimal PDF skeleton: a "/Type /Pages" tree root plus n "/Type /Page" objects.
const fakePdf = (pageCount) => {
  const kids = Array.from({ length: pageCount }, (_, i) => `${i + 3} 0 R`).join(" ");
  const pages = Array.from(
    { length: pageCount },
    (_, i) => `${i + 3} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] >>\nendobj`
  );
  return [
    "%PDF-1.4",
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj",
    `2 0 obj\n<< /Type /Pages /Kids [${kids}] /Count ${pageCount} >>\nendobj`,
    ...pages,
    "%%EOF",
  ].join("\n");
};

test("countPdfPages counts /Type /Page objects", () => {
  assert.equal(countPdfPages(fakePdf(1)), 1);
  assert.equal(countPdfPages(fakePdf(2)), 2);
});

test("countPdfPages does not count the /Type /Pages tree root", () => {
  assert.equal(countPdfPages("2 0 obj\n<< /Type /Pages /Kids [] /Count 0 >>\nendobj"), 0);
  assert.equal(countPdfPages("<</Type/Pages/Count 1>> <</Type/Page/Parent 2 0 R>>"), 1);
});

test("countPdfPages reads a Buffer as latin1", () => {
  const binary = Buffer.concat([Buffer.from([0xe2, 0xe3, 0xcf, 0xd3, 0x0a]), Buffer.from(fakePdf(2), "latin1")]);
  assert.equal(countPdfPages(binary), 2);
});
