/* global chrome */
const INDEXES = ["NIFTY", "SENSEX", "BANKNIFTY"];
const LABELS = { NIFTY: "NIFTY", SENSEX: "SENSEX", BANKNIFTY: "BNF" };
let i = 0;

function fmt(n) {
  if (n == null || !Number.isFinite(Number(n))) return "—";
  return Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function paint(pack) {
  const idx = INDEXES[i % 3];
  const s = pack?.spots?.[idx] || {};
  document.getElementById("name").textContent = LABELS[idx];
  const px = document.getElementById("px");
  const chg = document.getElementById("chg");
  px.textContent = fmt(s.last);
  const up = s.pct > 0;
  const down = s.pct < 0;
  px.className = `px ${up ? "up" : down ? "down" : ""}`;
  chg.className = up ? "up" : down ? "down" : "";
  chg.textContent = s.pct == null ? "—" : `${s.pct >= 0 ? "+" : ""}${s.pct.toFixed(2)}%`;
}

function tick() {
  chrome.storage.local.get(["radar"], (s) => {
    paint(s.radar || {});
    i += 1;
  });
}

tick();
setInterval(tick, 2800);
chrome.runtime.sendMessage({ type: "ensure" });
