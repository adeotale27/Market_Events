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
  if (!fs.existsSync(path.join(root, rel))) {
    throw new Error(`missing ${rel}`);
  }
}

for (const doc of ["README.md", "ADMIN.md", "PUBLISH.md", "PULL.md", "CHANGELOG.md"]) {
  mustExist(doc);
}

const version = fs.readFileSync(path.join(root, "VERSION"), "utf8").trim();
const manifest = readJson("manifest.json");
if (manifest.manifest_version !== 3) {
  throw new Error("manifest.json must be Manifest V3");
}
if (manifest.version !== version) {
  throw new Error(`VERSION ${version} != manifest.version ${manifest.version}`);
}
if (!manifest.background?.service_worker) {
  throw new Error("manifest.json missing service_worker");
}
if (!manifest.options_ui?.page) {
  throw new Error("manifest.json missing options_ui");
}
const hostPerms = JSON.stringify(manifest.host_permissions || []).toLowerCase();
if (hostPerms.includes("kite")) {
  throw new Error("manifest host_permissions must not include Kite");
}

const cfg = readJson("data/config.json");
if (!String(cfg.remoteBase || "").includes("adeotale27/Market_Events")) {
  throw new Error("data/config.json remoteBase must point at Market_Events");
}

const holidays = readJson("data/holidays.json");
if (!Array.isArray(holidays.holidays) || holidays.holidays.length < 1) {
  throw new Error("data/holidays.json needs holidays[]");
}
for (const h of holidays.holidays) {
  if (!isoDate(h.date) || !h.name) {
    throw new Error(`bad holiday row: ${JSON.stringify(h)}`);
  }
}

const econ = readJson("data/econ-events.json");
if (!Array.isArray(econ.events) || econ.events.length < 1) {
  throw new Error("data/econ-events.json needs events[]");
}
const names = econ.events.map((e) => String(e.name || "")).join(" | ");
for (const needle of ["RBI", "FOMC", "CPI", "GDP", "Budget", "Non-Farm"]) {
  if (!names.includes(needle)) {
    throw new Error(`econ-events.json missing ${needle}`);
  }
}

for (const idx of ["NIFTY", "SENSEX", "BANKNIFTY"]) {
  const doc = readJson(`data/index-impact/${idx}.json`);
  if (doc.index !== idx) {
    throw new Error(`data/index-impact/${idx}.json index field`);
  }
  if (!Array.isArray(doc.events)) {
    throw new Error(`data/index-impact/${idx}.json needs events[]`);
  }
}

if (fs.existsSync(path.join(root, "data/results.json"))) {
  throw new Error("data/results.json is leftover; impact lives in data/index-impact/");
}

for (const file of ["background.js", "popup.js", "options.js"]) {
  const src = fs.readFileSync(path.join(root, file), "utf8");
  if (/kite\.zerodha|api\.kite/i.test(src)) {
    throw new Error(`${file} must not call Kite`);
  }
  const r = spawnSync("node", ["--check", path.join(root, file)], { encoding: "utf8" });
  if (r.status !== 0) {
    throw new Error(`${file} syntax: ${r.stderr || r.stdout}`);
  }
}

console.log(`ok: Market Events ${version} MV3, holidays, econ, impact, no Kite`);
