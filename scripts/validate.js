#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.join(__dirname, "..");

function readJson(rel) {
  const p = path.join(root, rel);
  const raw = fs.readFileSync(p, "utf8");
  try {
    return JSON.parse(raw);
  } catch (e) {
    throw new Error(`${rel}: invalid JSON (${e.message})`);
  }
}

function isoDate(v) {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

function mustExist(rel) {
  if (!fs.existsSync(path.join(root, rel))) throw new Error(`missing ${rel}`);
}

for (const doc of ["README.md", "ADMIN.md", "PUBLISH.md", "PULL.md", "CHANGELOG.md", "PRIVACY.md"]) {
  mustExist(doc);
}

const version = fs.readFileSync(path.join(root, "VERSION"), "utf8").trim();
const manifest = readJson("manifest.json");
if (manifest.manifest_version !== 3) throw new Error("must be MV3");
if (manifest.version !== version) throw new Error("VERSION lockstep");
if (manifest.background?.type !== "module") throw new Error("service worker must be ES module");
if ((manifest.permissions || []).includes("notifications")) {
  throw new Error("notifications must be optional until user enables alerts");
}
if (!(manifest.optional_permissions || []).includes("notifications")) {
  throw new Error("optional_permissions.notifications required");
}
const blob = JSON.stringify(manifest).toLowerCase();
if (blob.includes("kite.zerodha") || (manifest.host_permissions || []).join().toLowerCase().includes("kite")) {
  throw new Error("no Kite hosts");
}

const cfg = readJson("data/config.json");
if (!String(cfg.remoteBase || "").includes("adeotale27/Market_Events")) {
  throw new Error("remoteBase");
}

const holidays = readJson("data/holidays.json");
for (const h of holidays.holidays) {
  if (!isoDate(h.date) || !h.name) throw new Error("holiday row");
}

const econ = readJson("data/econ-events.json");
const names = econ.events.map((e) => String(e.name || "")).join(" | ");
for (const needle of ["RBI", "FOMC", "CPI", "GDP", "Budget", "Non-Farm"]) {
  if (!names.includes(needle)) throw new Error(`econ missing ${needle}`);
}

for (const idx of ["NIFTY", "SENSEX", "BANKNIFTY"]) {
  const doc = readJson(`data/index-impact/${idx}.json`);
  if (doc.index !== idx || !Array.isArray(doc.events)) throw new Error(idx);
  if (doc.updated && !isoDate(doc.updated)) throw new Error(`${idx} updated`);
  if (JSON.stringify(doc).includes("EXAMPLE")) throw new Error(`${idx} placeholder data`);
}

const hw = readJson("data/heavyweights.json");
for (const idx of ["NIFTY", "SENSEX", "BANKNIFTY"]) {
  if (!hw[idx]?.length) throw new Error(`heavyweights ${idx}`);
  for (const r of hw[idx]) {
    if (!r.yahoo || !r.name) throw new Error("heavyweight row");
  }
}

for (const file of ["background.js", "popup.js", "lib/time.js", "lib/signals.js"]) {
  const src = fs.readFileSync(path.join(root, file), "utf8");
  if (/kite\.zerodha|api\.kite/i.test(src)) throw new Error(`${file} kite`);
}

const t = spawnSync("node", [path.join(root, "scripts/test-signals.mjs")], {
  encoding: "utf8",
});
if (t.status !== 0) throw new Error(t.stderr || t.stdout || "signal tests");

console.log(`ok: Market Pulse ${version} compact MV3`);
