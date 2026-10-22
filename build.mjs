// Prints index.html (its @media print styles) to the PDF behind "Download CV".
// Usage: node build.mjs   — set CHROME_PATH if Chrome is somewhere else.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

process.chdir(import.meta.dirname);
const PDF = "Nektarios_Zabouris_CV.pdf";
const PAGES = 2; // page 1: profile + experience, page 2 starts at Projects

const chrome = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
].find((p) => p && existsSync(p));
if (!chrome) throw new Error("Chrome not found; set CHROME_PATH.");

rmSync(PDF, { force: true });
const run = spawnSync(
  chrome,
  // Absolute path: Chrome on Windows resolves a relative one against its own install dir.
  ["--headless", "--disable-gpu", "--no-sandbox", "--no-pdf-header-footer", `--print-to-pdf=${resolve(PDF)}`, pathToFileURL("index.html").href],
  { encoding: "utf8", timeout: 60_000 }
);
if (!existsSync(PDF)) throw new Error(`PDF generation failed: ${run.stderr || run.error}`);

// Content that outgrows a page shows up as an extra page: fail instead of shipping it.
const pages = (readFileSync(PDF, "latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length;
if (pages !== PAGES) throw new Error(`${PDF} has ${pages} pages; the layout expects ${PAGES}.`);
console.log(`${PDF}: ${pages} pages`);
