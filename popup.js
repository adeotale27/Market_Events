/* global chrome */
import { eventImpactLabel, relLabel } from "./lib/signals.js";
import { istClock } from "./lib/time.js";

const INDEXES = ["NIFTY", "SENSEX", "BANKNIFTY"];
const GH = "https://github.com/adeotale27/Market_Events/issues/new";

function fmtPx(n) {
  if (n == null || !Number.isFinite(Number(n))) return "—";
  return Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function fmtPct(n) {
  if (n == null || !Number.isFinite(Number(n))) return "";
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

function fmtCr(n) {
  if (n == null || !Number.isFinite(Number(n))) return "—";
  return `${n > 0 ? "+" : ""}${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function cls(n) {
  if (n == null || !Number.isFinite(Number(n)) || n === 0) return "";
  return n > 0 ? "up" : "down";
}

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function render(pack, index, showAll) {
  const sess = pack?.session?.label || "CLOSED";
  const pill = document.getElementById("sess");
  pill.textContent = sess;
  pill.className = `pill ${sess}`;

  const vix = pack?.spots?.VIX || {};
  document.getElementById("vix").innerHTML = vix.last != null
    ? `India VIX <span class="${cls(vix.pct)}">${Number(vix.last).toFixed(2)} ${fmtPct(vix.pct)}</span>`
    : "";

  document.getElementById("indexes").innerHTML = INDEXES.map((idx) => {
    const s = pack?.spots?.[idx] || {};
    const on = idx === index ? "on" : "";
    const arrow = s.pct > 0 ? "▲" : s.pct < 0 ? "▼" : "·";
    return `<button type="button" class="idx ${on}" data-idx="${idx}">
      <b>${idx === "BANKNIFTY" ? "BNF" : idx}</b>
      <div class="px ${cls(s.pct)}">${fmtPx(s.last)}</div>
      <div class="${cls(s.pct)}">${arrow} ${fmtPct(s.pct) || (s.error || "—")}</div>
    </button>`;
  }).join("");

  const intel = pack?.intelByIndex?.[index] || [];
  document.getElementById("intel").innerHTML = `<div class="k">WHAT’S MOVING</div>${
    intel.map((s) => `<div class="${s.tone || ""}">${escapeHtml(s.text)}</div>`).join("")
  }`;

  const f = pack?.fii;
  const fiiEl = document.getElementById("fii");
  if (f) {
    fiiEl.innerHTML = `FII <span class="${cls(f.fiiNet)}">${fmtCr(f.fiiNet)}</span>
      · DII <span class="${cls(f.diiNet)}">${fmtCr(f.diiNet)}</span>
      ${f.stale || pack?.fiiError ? `<span class="stale"> · last good</span>` : ""}`;
  } else {
    fiiEl.textContent = pack?.fiiError || "FII/DII — Refresh after opening nseindia.com once";
  }

  const ev = (pack?.econ || [])[0];
  const next = document.getElementById("next");
  if (!ev) {
    next.innerHTML = `<div class="k">NEXT EVENT</div>No upcoming macro event in calendar`;
  } else {
    const hi = eventImpactLabel(ev.impact);
    next.innerHTML = `<a href="#" id="viewAll">View all</a>
      <div class="k">NEXT EVENT</div>
      ${escapeHtml(ev.name)} · ${escapeHtml(relLabel(ev.daysAway))} ${hi ? `· ${hi}` : ""}`;
  }

  const risk = pack?.risk?.[index];
  const riskEl = document.getElementById("risk");
  if (!risk) {
    riskEl.innerHTML = `<div class="k">${escapeHtml(index)} RISK</div>No constituent results/board meetings in calendar`;
  } else {
    const kind = risk.event_type === "Quarterly Results" ? "Results" : "Board";
    const wt = risk.weightage != null ? ` · ${risk.weightage}% wt` : "";
    riskEl.innerHTML = `<div class="k">${escapeHtml(index)} RISK</div>
      ${escapeHtml(risk.name)} · ${kind} ${escapeHtml(relLabel(risk.days_remaining))}${wt}
      ${risk.level ? ` · ${risk.level}` : ""}`;
  }

  const all = document.getElementById("allEvents");
  if (showAll) {
    all.classList.remove("hidden");
    all.innerHTML = (pack?.econ || []).slice(0, 6).map((e) =>
      `${escapeHtml(relLabel(e.daysAway))} · ${escapeHtml(e.name)}`).join("<br/>");
  } else {
    all.classList.add("hidden");
    all.innerHTML = "";
  }

  const age = pack?.at ? istClock(pack.at) : "—";
  const stale = pack?.at && Date.now() - pack.at > 8 * 60 * 1000;
  document.getElementById("meta").textContent =
    `${age} IST · Yahoo quotes · ${stale ? "stale · tap ↻" : "fresh"}`;
}

function load() {
  chrome.storage.local.get(["radar", "activeIndex", "consentSeen", "alertsEnabled", "showAllEvents"], (s) => {
    const index = INDEXES.includes(s.activeIndex) ? s.activeIndex : "NIFTY";
    render(s.radar || {}, index, !!s.showAllEvents);
    document.getElementById("consent").classList.toggle("hidden", !!s.consentSeen);
    document.getElementById("alertToggle").checked = !!s.alertsEnabled;
  });
}

document.getElementById("indexes").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-idx]");
  if (!btn) return;
  chrome.storage.local.set({ activeIndex: btn.dataset.idx }, () => load());
});

document.getElementById("next").addEventListener("click", (e) => {
  if (e.target.id !== "viewAll") return;
  e.preventDefault();
  chrome.storage.local.get(["showAllEvents"], (s) => {
    const next = !s.showAllEvents;
    chrome.storage.local.set({ showAllEvents: next }, () => load());
  });
});

document.getElementById("refresh").onclick = () => {
  chrome.runtime.sendMessage({ type: "refresh" }, () => load());
};
document.getElementById("settingsBtn").onclick = () => {
  document.getElementById("settings").classList.remove("hidden");
};
document.getElementById("closeSheet").onclick = () => {
  document.getElementById("settings").classList.add("hidden");
};
document.getElementById("enableAlerts").onclick = () => {
  chrome.runtime.sendMessage({ type: "enable-alerts" }, () => load());
};
document.getElementById("notNow").onclick = () => {
  chrome.runtime.sendMessage({ type: "dismiss-consent" }, () => load());
};
document.getElementById("alertToggle").onchange = (e) => {
  chrome.runtime.sendMessage({ type: e.target.checked ? "enable-alerts" : "disable-alerts" }, () => load());
};

document.getElementById("suggest").href = `${GH}?title=${encodeURIComponent("Feature suggestion")}`;
document.getElementById("badData").href = `${GH}?title=${encodeURIComponent("Incorrect data")}`;
document.getElementById("problem").href = `${GH}?title=${encodeURIComponent("Problem")}`;

load();
chrome.runtime.sendMessage({ type: "ensure" }, () => load());
