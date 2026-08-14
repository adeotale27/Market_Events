import { pickIndexRisk, rankIntel, impactScore, riskEmptyMessage, computeUrgent } from "../lib/signals.js";
import { isCashSessionIST, sessionLabel, nextTradingAlarmUtc, isTradingDay } from "../lib/time.js";

const ev = {
  name: "Reliance",
  event_type: "Quarterly Results",
  weightage: 8.7,
  days_remaining: 1,
};
const board = {
  name: "SmallCo",
  event_type: "Board Meeting",
  weightage: 0.4,
  days_remaining: 0,
};
const best = pickIndexRisk([board, ev], 1.2);
if (best.name !== "Reliance") throw new Error(`expected Reliance, got ${best.name} score ${best.score} vs ${impactScore(board, 1.2)}`);

const intel = rankIntel(
  {
    spots: {
      NIFTY: { last: 24000, pct: -1.2, high: 24200, low: 23900 },
      VIX: { last: 14, pct: 6 },
      session: "open",
    },
    movers: { NIFTY: [{ name: "HDFC Bank", pct: 2.1, weightage: 13 }] },
    fii: { fiiNet: 200 },
    econ: [],
    impact: { NIFTY: { events: [] } },
  },
  "NIFTY",
);
if (intel.length < 1 || intel.length > 2) throw new Error("intel length");
if (!intel.some((s) => /VIX|NIFTY|HDFC/.test(s.text))) throw new Error("intel content");

const holidays = new Set(["2026-08-15"]);
if (isTradingDay("2026-08-15", holidays)) throw new Error("holiday should block");
if (isTradingDay("2026-08-16", new Set())) throw new Error("sunday");
if (!isTradingDay("2026-08-14", new Set())) throw new Error("friday should trade");

const when = nextTradingAlarmUtc(9, 0, new Set(), new Date("2026-08-14T01:00:00Z"));
if (!when || when <= Date.parse("2026-08-14T01:00:00Z")) throw new Error("alarm in future");

sessionLabel(new Date("2026-08-14T04:00:00Z"), false); // smoke
isCashSessionIST(new Date("2026-08-14T04:00:00Z"));

const emptyWeek = riskEmptyMessage("BANKNIFTY", {
  today: "2026-08-14",
  updated: "2026-08-14",
  events: [{ name: "HDFC Bank", days_remaining: 20, event_type: "Quarterly Results" }],
});
if (!/next 7 days/i.test(emptyWeek)) throw new Error("week empty copy");

const emptyMonth = riskEmptyMessage("NIFTY", {
  today: "2026-08-14",
  updated: "2026-08-14",
  events: [],
});
if (!/this month/i.test(emptyMonth)) throw new Error("month empty copy");

const expired = riskEmptyMessage("SENSEX", {
  today: "2026-09-20",
  updated: "2026-08-14",
  events: [],
});
if (!/ended/i.test(expired)) throw new Error("expired calendar copy");

const urg = computeUrgent({
  holidays: [{ name: "Ganesh Chaturthi", daysAway: 1 }],
  econ: [{ name: "GDP", daysAway: 1, impact: "high" }],
  risk: { NIFTY: null, SENSEX: null, BANKNIFTY: null },
});
if (!urg.on) throw new Error("urgent holiday tomorrow");
