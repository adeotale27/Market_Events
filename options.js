/* global chrome */

function status(id, ok, text) {
  const el = document.getElementById(id);
  if (!el) return;
  el.className = ok ? "ok" : "err";
  el.textContent = text;
}

function readJsonFile(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      try {
        resolve(JSON.parse(String(r.result || "")));
      } catch {
        reject(new Error("Not valid JSON. Save as UTF-8 .json with no trailing commas."));
      }
    };
    r.onerror = () => reject(new Error("Could not read file"));
    r.readAsText(file);
  });
}

async function isUnlocked() {
  try {
    const r = await chrome.runtime.sendMessage({ type: "admin-status" });
    return r?.unlocked === true;
  } catch {
    return false;
  }
}

async function gate() {
  const ok = await isUnlocked();
  document.getElementById("login").classList.toggle("hidden", ok);
  document.getElementById("desk").classList.toggle("hidden", !ok);
}

async function requireDesk() {
  if (await isUnlocked()) return true;
  status("loginSt", false, "Sign in first");
  await gate();
  return false;
}

function isoDate(v) {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

function validateHolidays(d) {
  if (!Array.isArray(d?.holidays)) return 'Need { "holidays": [ { "date": "YYYY-MM-DD", "name": "…" } ] }';
  for (let i = 0; i < d.holidays.length; i++) {
    const h = d.holidays[i];
    if (!isoDate(h?.date)) return `holidays[${i}].date must be YYYY-MM-DD`;
    if (!h?.name) return `holidays[${i}].name required`;
  }
  return "";
}

function validateEcon(d) {
  if (!Array.isArray(d?.events)) return 'Need { "events": [ { "date", "name", "impact" } ] }';
  const impacts = new Set(["critical", "high", "medium", "low"]);
  for (let i = 0; i < d.events.length; i++) {
    const e = d.events[i];
    if (!isoDate(e?.date)) return `events[${i}].date must be YYYY-MM-DD`;
    if (!e?.name) return `events[${i}].name required`;
    if (e.impact && !impacts.has(String(e.impact).toLowerCase())) {
      return `events[${i}].impact must be critical|high|medium|low`;
    }
  }
  return "";
}

function validateIndex(d, idx) {
  if (!Array.isArray(d?.events)) return `Need { "index": "${idx}", "events": [ … ] }`;
  if (d.index && d.index !== idx) return `File index "${d.index}" does not match ${idx}`;
  if (d.updated && !isoDate(d.updated)) return "updated must be YYYY-MM-DD";
  for (let i = 0; i < d.events.length; i++) {
    const e = d.events[i];
    if (!e?.name) return `events[${i}].name required`;
    if (!isoDate(e?.date)) return `events[${i}].date must be YYYY-MM-DD`;
  }
  return "";
}

async function putAdmin(kind, doc) {
  const s = await chrome.storage.local.get(["adminFiles"]);
  const adminFiles = s.adminFiles || {};
  adminFiles[kind] = { ...doc, updated: doc.updated || new Date().toISOString().slice(0, 10) };
  adminFiles[`${kind}At`] = Date.now();
  await chrome.storage.local.set({ adminFiles });
}

function bindFile(inputId, kind, statusId, validate) {
  document.getElementById(inputId).addEventListener("change", async (ev) => {
    const file = ev.target.files?.[0];
    if (!file) return;
    if (!(await requireDesk())) return;
    try {
      const doc = await readJsonFile(file);
      const err = validate(doc);
      if (err) throw new Error(err);
      await putAdmin(kind, doc);
      status(statusId, true, `Stored ${file.name} in this browser. Push the same file to GitHub for everyone.`);
      chrome.runtime.sendMessage({ type: "refresh" });
    } catch (e) {
      status(statusId, false, String(e.message || e));
    }
  });
}

document.getElementById("loginBtn").addEventListener("click", async () => {
  const pin = document.getElementById("pin").value;
  const r = await chrome.runtime.sendMessage({ type: "unlock-admin", pin });
  if (r?.ok) {
    status("loginSt", true, "Desk unlocked");
    await gate();
  } else {
    status("loginSt", false, "Wrong password");
  }
});

document.getElementById("pin").addEventListener("keydown", (e) => {
  if (e.key === "Enter") document.getElementById("loginBtn").click();
});

document.getElementById("logout").addEventListener("click", async () => {
  await chrome.runtime.sendMessage({ type: "lock-admin" });
  document.getElementById("pin").value = "";
  await gate();
});

bindFile("file-holidays", "holidays", "st-holidays", validateHolidays);
bindFile("file-econ", "econ", "st-econ", validateEcon);
for (const idx of ["NIFTY", "SENSEX", "BANKNIFTY"]) {
  bindFile(`file-${idx}`, `impact-${idx}`, `st-${idx}`, (d) => validateIndex(d, idx));
}

chrome.storage.local.get(["config", "radar"], (s) => {
  document.getElementById("remoteBase").value =
    s.config?.remoteBase || "https://raw.githubusercontent.com/adeotale27/Market_Events/main";
  const src = s.radar?.sources;
  if (src) {
    const impact = src.impact
      ? Object.entries(src.impact).map(([k, v]) => `${k}=${v}`).join(" ")
      : "";
    document.getElementById("sources").textContent =
      `Last load: holiday ${src.holidays || "—"} · econ ${src.econ || "—"} · ${impact}`;
  }
});

document.getElementById("saveRemote").onclick = async () => {
  if (!(await requireDesk())) return;
  const remoteBase = document.getElementById("remoteBase").value.trim();
  if (!/^https:\/\/raw\.githubusercontent\.com\//.test(remoteBase)) {
    status("st-remote", false, "Must be an https://raw.githubusercontent.com/ URL");
    return;
  }
  await chrome.storage.local.set({ config: { remoteBase } });
  status("st-remote", true, "Saved");
  chrome.runtime.sendMessage({ type: "refresh" });
};

document.getElementById("clearAdmin").onclick = async () => {
  if (!(await requireDesk())) return;
  await chrome.storage.local.remove("adminFiles");
  status("st-clear", true, "Cleared local uploads");
  chrome.runtime.sendMessage({ type: "refresh" });
};

document.getElementById("refresh").onclick = () => {
  chrome.runtime.sendMessage({ type: "refresh" }, () => status("st-clear", true, "Refresh sent"));
};

gate();
