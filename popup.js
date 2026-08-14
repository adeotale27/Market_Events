/* global chrome */
function todayIST() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
}

function nextHoliday(list) {
  const t = todayIST();
  return (list || [])
    .filter((h) => h.date >= t)
    .sort((a, b) => a.date.localeCompare(b.date))[0] || null;
}

function upcomingResults(events) {
  const t = todayIST();
  return (events || [])
    .filter((e) => e.date >= t)
    .sort((a, b) => {
      const d = String(a.date).localeCompare(String(b.date));
      if (d) return d;
      return Number(b.weightage || 0) - Number(a.weightage || 0);
    })
    .slice(0, 12);
}

function fmtEvent(e) {
  const w = e.weightage != null ? ` · ${e.weightage}%` : "";
  const idx = e.index ? `${e.index} ` : "";
  const name = e.name || e.symbol || "—";
  const purpose = e.purpose ? ` · ${e.purpose}` : "";
  return `${e.date} ${idx}${name}${w}${purpose}`;
}

function render(pack) {
  if (pack?.error) {
    document.getElementById("holiday").textContent = pack.error;
  }
  const h = nextHoliday(pack?.holidays);
  document.getElementById("holiday").textContent = pack?.holidayError
    ? pack.holidayError
    : h
      ? `${h.date} · ${h.name}`
      : "No upcoming holiday in bundle";

  const f = pack?.fii;
  document.getElementById("fii").textContent = pack?.fiiError
    ? pack.fiiError
    : f
      ? `${f.date || "—"} · FII ${f.fiiNet ?? "—"} · DII ${f.diiNet ?? "—"}`
      : "No pull yet — click Refresh during market hours";

  const v = pack?.vix?.last;
  document.getElementById("vix").textContent = pack?.vixError
    ? pack.vixError
    : v != null
      ? Number(v).toFixed(2)
      : "No pull yet";

  const ev = upcomingResults(pack?.results?.events);
  document.getElementById("results").textContent = pack?.resultsError
    ? pack.resultsError
    : ev.length
      ? ev.map(fmtEvent).join("\n")
      : "No upcoming rows in data/results.json";
}

chrome.storage.local.get("radar", (s) => render(s.radar || {}));
document.getElementById("refresh").onclick = () => {
  chrome.runtime.sendMessage({ type: "refresh" }, (pack) => render(pack || {}));
};
