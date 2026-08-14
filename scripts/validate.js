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

const manifest = readJson("manifest.json");
if (manifest.manifest_version !== 3) {
  throw new Error("manifest.json must be Manifest V3");
}
if (!manifest.background?.service_worker) {
  throw new Error("manifest.json missing service_worker");
}
const hostPerms = JSON.stringify(manifest.host_permissions || []).toLowerCase();
if (hostPerms.includes("kite")) {
  throw new Error("manifest host_permissions must not include Kite");
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

const results = readJson("data/results.json");
if (!Array.isArray(results.events) || results.events.length < 1) {
  throw new Error("data/results.json needs events[]");
}
for (const e of results.events) {
  if (!isoDate(e.date) || !(e.name || e.symbol)) {
    throw new Error(`bad results row: ${JSON.stringify(e)}`);
  }
}

for (const file of ["background.js", "popup.js"]) {
  const src = fs.readFileSync(path.join(root, file), "utf8");
  if (/kite\.zerodha|api\.kite/i.test(src)) {
    throw new Error(`${file} must not call Kite`);
  }
  const r = spawnSync("node", ["--check", path.join(root, file)], { encoding: "utf8" });
  if (r.status !== 0) {
    throw new Error(`${file} syntax: ${r.stderr || r.stdout}`);
  }
}

console.log("ok: MV3 manifest, holidays, results.json, JS syntax");
