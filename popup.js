/* global chrome */
const INDEXES = ["NIFTY", "SENSEX", "BANKNIFTY"];

function fmtPx(n) {
  if (n == null || !Number.isFinite(Number(n))) return "—";
  return Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function fmtCr(n) {
  if (n == null || !Number.isFinite(Number(n))) return "—";
  const sign = n > 0 ? "+" : "";
  return sign + Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function netClass(n) {
  if (n == null || !Number.isFinite(Number(n)) || n === 0) return "";
  return n > 0 ? "up" : "down";
}

function relLabel(daysAway) {
  if (daysAway === 0) return "TODAY";
  if (daysAway === 1) return "TOMORROW";
  return `in ${daysAway}d`;
}

function setTone(el, tone) {
  el.classList.remove("red", "amber", "blue");
  if (tone) el.classList.add(tone);
}

function istClock(ms) {
  if (!ms) return "";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "short",
  }).format(new Date(ms));
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function render(pack, index) {
  const spots = pack?.spots || {};
  document.getElementById("spots").innerHTML = INDEXES.map((idx) => {
    const s = spots[idx] || {};
    const cls = s.chg > 0 ? "up" : s.chg < 0 ? "down" : "";
    const sign = s.pct == null ? "" : `${s.pct >= 0 ? "+" : ""}${Number(s.pct).toFixed(2)}%`;
    return `<div class="spot"><b>${idx}</b><div class="${cls}">${fmtPx(s.last)}</div><div class="${cls}">${sign || escapeHtml(s.error || "")}</div></div>`;
  }).join("");
  const session = spots.session === "open" ? "Cash session (live Yahoo ~1m)" : "Outside 09:15–15:30 IST — last/previous close";
  document.getElementById("sessionHint").textContent = session;

  document.getElementById("indexChips").innerHTML = INDEXES.map(
    (idx) => `<button type="button" data-idx="${idx}" class="${idx === index ? "on" : ""}">${idx}</button>`,
  ).join("");

  const holidays = pack?.holidays || [];
  const h = holidays[0];
  const holEl = document.getElementById("holiday");
  const holTile = document.getElementById("tile-holiday");
  if (!h) {
    holEl.textContent = "No upcoming holiday in JSON";
    setTone(holTile, "");
  } else {
    const next = holidays[1]
      ? `<div class="sub">then ${escapeHtml(relLabel(holidays[1].daysAway))} · ${escapeHtml(holidays[1].name)}</div>`
      : "";
    holEl.innerHTML = `<div class="lead">${escapeHtml(relLabel(h.daysAway))} · ${escapeHtml(h.name)}</div><div class="sub">${escapeHtml(h.date)}</div>${next}`;
    setTone(holTile, h.status === "today" || h.status === "tomorrow" ? "red" : h.status === "this-week" ? "amber" : "");
  }

  const f = pack?.fii;
  const fiiTile = document.getElementById("tile-fii");
  const combo = f && f.fiiNet != null && f.diiNet != null ? f.fiiNet + f.diiNet : null;
  if (!f && pack?.fiiError) {
    document.getElementById("fii").textContent = pack.fiiError;
    setTone(fiiTile, "amber");
  } else if (!f) {
    document.getElementById("fii").textContent = "No pull yet — Refresh (open nseindia.com once if NSE blocks)";
    setTone(fiiTile, "");
  } else {
    const note = pack?.fiiError ? `<div class="sub">${escapeHtml(pack.fiiError)}</div>` : "";
    document.getElementById("fii").innerHTML = `
      <div class="fii-grid">
        <div><span>FII</span><b class="${netClass(f.fiiNet)}">${fmtCr(f.fiiNet)}</b></div>
        <div><span>DII</span><b class="${netClass(f.diiNet)}">${fmtCr(f.diiNet)}</b></div>
        <div><span>Net inst.</span><b class="${netClass(combo)}">${fmtCr(combo)}</b></div>
      </div>
      <div class="sub">${escapeHtml(f.date || "—")}${f.stale ? " · last good" : ""}</div>${note}`;
    setTone(fiiTile, f.fiiNet != null && f.fiiNet < 0 ? "red" : f.fiiNet > 0 ? "blue" : "");
  }

  const ev = pack?.econ || [];
  const econTile = document.getElementById("tile-econ");
  document.getElementById("econ").innerHTML = ev.length
    ? ev.slice(0, 8).map((e) => {
      const urgent = e.daysAway <= 1 ? "urgent" : e.daysAway <= 3 ? "soon" : "";
      const ctry = e.country ? ` · ${e.country}` : "";
      return `<div class="row ${urgent}">${escapeHtml(relLabel(e.daysAway))} · ${escapeHtml(e.name)}${escapeHtml(ctry)}</div>`;
    }).join("")
    : "No upcoming macro events in data/econ-events.json";
  const near = ev[0];
  setTone(econTile, !near ? "" : near.daysAway <= 1 ? "red" : near.daysAway <= 3 ? "amber" : "");

  document.getElementById("impactIdx").textContent = index;
  const impactEv = (pack?.impact?.[index]?.events || []).slice(0, 8);
  const impactTile = document.getElementById("tile-impact");
  document.getElementById("impact").innerHTML = impactEv.length
    ? impactEv.map((e) => {
      const w = e.weightage != null ? ` · ${e.weightage}% wt` : "";
      const d = e.days_remaining != null ? relLabel(e.days_remaining) : (e.date || "");
      const rowTone = e.days_remaining != null && e.days_remaining <= 7
        ? "urgent"
        : e.days_remaining != null && e.days_remaining <= 14
          ? "soon"
          : "";
      return `<div class="row ${rowTone}">${escapeHtml(d)} · ${escapeHtml(e.event_type || "Event")} · ${escapeHtml(e.name || e.symbol || "")}${escapeHtml(w)}</div>`;
    }).join("")
    : `No ${index} impact rows. Admin: Options → upload ${index}.json (or commit on GitHub).`;
  const thisWeek = impactEv.some((e) => e.days_remaining != null && e.days_remaining <= 7);
  const nextWeek = impactEv.some((e) => e.days_remaining > 7 && e.days_remaining <= 14);
  setTone(impactTile, thisWeek ? "red" : nextWeek ? "blue" : "");

  const src = pack?.sources || {};
  const impactSrc = src.impact?.[index] || "—";
  document.getElementById("meta").textContent =
    `Updated ${istClock(pack?.at)} IST · holiday ${src.holidays || "—"} · econ ${src.econ || "—"} · ${index} ${impactSrc}`;
}

function load() {
  chrome.storage.local.get(["radar", "activeIndex"], (s) => {
    const index = INDEXES.includes(s.activeIndex) ? s.activeIndex : "NIFTY";
    render(s.radar || {}, index);
  });
}

document.getElementById("indexChips").addEventListener("click", (e) => {
  const idx = e.target?.dataset?.idx;
  if (!idx) return;
  chrome.storage.local.set({ activeIndex: idx }, () => load());
});

load();
chrome.runtime.sendMessage({ type: "ensure" }, () => load());
document.getElementById("refresh").onclick = () => {
  chrome.runtime.sendMessage({ type: "refresh" }, () => load());
};
