/* global chrome */
import { eventImpactLabel, relLabel, riskEmptyMessage } from "./lib/signals.js";
import { istClock } from "./lib/time.js";

const INDEXES = ["NIFTY", "SENSEX", "BANKNIFTY"];
const LABELS = { NIFTY: "NIFTY", SENSEX: "SENSEX", BANKNIFTY: "BNF" };
const GH = "https://github.com/adeotale27/Market_Events/issues/new";
const VERSION = "1.4.0";

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
function sparkSvg(values, up) {
  const pts = (values || []).filter((x) => Number.isFinite(Number(x)));
  if (pts.length < 2) return "";
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const span = max - min || 1;
  const d = pts
    .map((v, i) => {
      const x = (i / (pts.length - 1)) * 100;
      const y = 16 - ((v - min) / span) * 14 - 1;
      return `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const color = up ? "#16a34a" : "#e11d48";
  return `<svg viewBox="0 0 100 16" preserveAspectRatio="none"><path d="${d}" fill="none" stroke="${color}" stroke-width="1.6"/></svg>`;
}

function render(pack, index, showAll) {
  document.getElementById("ver").textContent = `v${VERSION}`;
  document.getElementById("ver2").textContent = `v${VERSION}`;
  const sess = pack?.session?.label || "CLOSED";
  const pill = document.getElementById("sess");
  pill.textContent = `● ${sess}`;
  pill.className = `pill ${sess}`;

  document.getElementById("indexes").innerHTML = INDEXES.map((idx) => {
    const s = pack?.spots?.[idx] || {};
    const on = idx === index ? "on" : "";
    const up = (s.pct || 0) >= 0;
    return `<button type="button" class="idx ${on}" data-idx="${idx}">
      <b>${LABELS[idx]}</b>
      <div class="px ${cls(s.pct)}">${fmtPx(s.last)}</div>
      <div class="chg ${cls(s.pct)}">${fmtPct(s.pct) || (s.error || "—")}</div>
      ${sparkSvg(s.spark, up)}
    </button>`;
  }).join("");

  const f = pack?.fii;
  const fiiEl = document.getElementById("fii");
  if (f) {
    fiiEl.innerHTML = `<div><div class="k">FII / DII</div>
      FII <span class="${cls(f.fiiNet)}">${fmtCr(f.fiiNet)}</span>
      · DII <span class="${cls(f.diiNet)}">${fmtCr(f.diiNet)}</span>
      ${f.date ? ` · ${escapeHtml(f.date)}` : ""}
      ${f.stale || pack?.fiiError ? `<span class="stale"> · last good</span>` : ""}</div>`;
  } else {
    fiiEl.innerHTML = `<div><div class="k">FII / DII</div>${escapeHtml(pack?.fiiError || "Open nseindia.com once, then Refresh")}</div>`;
  }

  const vix = pack?.spots?.VIX || {};
  const vixEl = document.getElementById("vix");
  if (vix.last != null) {
    const pctW = Math.max(6, Math.min(100, (Number(vix.last) / 28) * 100));
    vixEl.innerHTML = `<div>
        <div class="k">INDIA VIX</div>
        <div class="px">${Number(vix.last).toFixed(2)}</div>
        <div class="meter"><i style="width:${pctW}%"></i></div>
      </div>
      <div class="${cls(vix.pct)}">${fmtPct(vix.pct)}</div>`;
  } else {
    vixEl.innerHTML = `<div class="k">INDIA VIX</div><div>—</div>`;
  }

  const hours = sess === "LIVE" ? "Regular session 09:15 – 15:40 IST" : "Regular session 09:15 – 15:40 IST";
  const title = sess === "LIVE" ? "Market open" : sess === "PRE-MARKET" ? "Pre-market" : sess === "HOLIDAY" ? "Holiday" : "Market closed";
  document.getElementById("sessionCard").innerHTML =
    `<div><div class="k">SESSION</div><b class="session-title">${escapeHtml(title)}</b><div class="hint">${hours}</div></div>`;

  const h = (pack?.holidays || [])[0];
  const hol = document.getElementById("holiday");
  hol.classList.toggle("alert", !!(h && h.daysAway <= 1));
    hol.innerHTML = h
    ? `<div><div class="k">NEXT HOLIDAY</div><b>${escapeHtml(h.name)}</b> · ${escapeHtml(relLabel(h.daysAway))} · ${escapeHtml(h.date)}</div>`
    : `<div><div class="k">NEXT HOLIDAY</div>No upcoming holiday in the NSE list</div>`;

  const intel = pack?.intelByIndex?.[index] || [];
  document.getElementById("intel").innerHTML = `<div><div class="k">WHAT’S MOVING · ${escapeHtml(index)}</div>
    ${intel.map((s) => `<div class="${s.tone || ""}">${escapeHtml(s.text)}</div>`).join("")}</div>`;

  const ev = (pack?.econ || [])[0];
  const next = document.getElementById("next");
  const evHot = !!(ev && ev.daysAway <= 1 && (ev.impact === "critical" || ev.impact === "high"));
  next.classList.toggle("alert", evHot);
  if (!ev) {
    next.innerHTML = `<div><div class="k">NEXT EVENT</div>No upcoming macro event</div>`;
  } else {
    const hi = eventImpactLabel(ev.impact);
    next.innerHTML = `<div><a href="#" id="viewAll">View all</a>
      <div class="k">NEXT EVENT</div>
      <b>${escapeHtml(ev.name)}</b> · ${escapeHtml(relLabel(ev.daysAway))} ${hi ? `· ${hi}` : ""}</div>`;
  }

  const risk = pack?.risk?.[index];
  const weekRisk = risk && risk.days_remaining != null && risk.days_remaining <= 7 ? risk : null;
  const riskEl = document.getElementById("risk");
  riskEl.classList.toggle("alert", !!(weekRisk && weekRisk.days_remaining <= 1));
  const empty = riskEmptyMessage(index, {
    today: pack?.today,
    events: pack?.impact?.[index]?.events || [],
    updated: pack?.impactMeta?.[index]?.updated,
  });
  if (weekRisk) {
    const kind = weekRisk.event_type === "Quarterly Results" ? "Results" : "Board";
    const wt = weekRisk.weightage != null ? ` · ${weekRisk.weightage}% wt` : "";
    riskEl.innerHTML = `<div><div class="k">${escapeHtml(index)} RISK</div>
      <b>${escapeHtml(weekRisk.name)}</b> · ${kind} ${escapeHtml(relLabel(weekRisk.days_remaining))}${wt}
      ${weekRisk.level ? ` · ${weekRisk.level}` : ""}</div>`;
  } else {
    riskEl.innerHTML = `<div><div class="k">${escapeHtml(index)} RISK</div>${escapeHtml(empty)}</div>`;
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
  document.getElementById("meta").textContent = `🕒 ${age} IST`;

  document.body.classList.toggle("urgent", !!pack?.urgent?.on);
  document.getElementById("banner").textContent = pack?.urgent?.on
    ? (pack.urgent.reasons || []).join(" · ")
    : "";
}

function load() {
  chrome.storage.local.get(
    ["radar", "activeIndex", "consentSeen", "alertsEnabled", "showAllEvents", "uiTab", "briefing"],
    (s) => {
      const index = INDEXES.includes(s.activeIndex) ? s.activeIndex : "NIFTY";
      render(s.radar || {}, index, !!s.showAllEvents);
      document.getElementById("consent").classList.toggle("hidden", !!s.consentSeen);
      document.getElementById("alertToggle").checked = !!s.alertsEnabled;
      const tab = s.uiTab === "more" ? "more" : "board";
      document.getElementById("settings").classList.toggle("hidden", tab !== "more");
      document.querySelectorAll("nav.tabs button").forEach((b) => {
        b.classList.toggle("on", b.dataset.tab === tab);
      });
      if (!window.__mpChime && s.briefing?.urgent && Date.now() - (s.briefing.at || 0) < 90 * 1000) {
        window.__mpChime = true;
        new Audio(chrome.runtime.getURL("sounds/alert.wav")).play().catch(() => {});
      }
    },
  );
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
    chrome.storage.local.set({ showAllEvents: !s.showAllEvents }, () => load());
  });
});
document.getElementById("refresh").onclick = () => {
  chrome.runtime.sendMessage({ type: "refresh" }, () => load());
};
document.getElementById("closeSheet").onclick = () => {
  chrome.storage.local.set({ uiTab: "board" }, () => load());
};
document.querySelector("nav.tabs").addEventListener("click", (e) => {
  const tab = e.target?.dataset?.tab;
  if (!tab) return;
  chrome.storage.local.set({ uiTab: tab }, () => load());
});
document.getElementById("adminOpen").onclick = () => {
  chrome.runtime.openOptionsPage();
};
document.getElementById("dockBtn").onclick = () => {
  chrome.windows.getCurrent((w) => {
    if (chrome.sidePanel?.open) chrome.sidePanel.open({ windowId: w.id });
  });
};
document.getElementById("miniBtn").onclick = () => {
  chrome.runtime.sendMessage({ type: "open-mini" });
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
