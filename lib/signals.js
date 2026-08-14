/** Rank intel + index-risk. Pure functions for tests. */

import { addDaysISO } from "./time.js";

const IMPACT_TYPES = ["Quarterly Results", "Board Meeting"];

export function eventImportance(type) {
  if (type === "Quarterly Results") return 1;
  if (type === "Board Meeting") return 0.65;
  return 0.35;
}

export function timeProximity(days) {
  if (days == null) return 0.2;
  if (days === 0) return 1.4;
  if (days === 1) return 1.2;
  if (days <= 3) return 1;
  if (days <= 7) return 0.75;
  if (days <= 14) return 0.45;
  return 0.2;
}

export function impactScore(ev, indexAbsPct = 0) {
  const w = Number(ev.weightage) || 0.5;
  const sens = indexAbsPct >= 0.8 ? 1.15 : 1;
  return w * eventImportance(ev.event_type) * timeProximity(ev.days_remaining) * sens;
}

export function pickIndexRisk(events, indexAbsPct = 0) {
  const rows = (events || []).filter((e) => IMPACT_TYPES.includes(e.event_type));
  if (!rows.length) return null;
  let best = null;
  let bestScore = -1;
  for (const e of rows) {
    const s = impactScore(e, indexAbsPct);
    if (s > bestScore) {
      bestScore = s;
      best = { ...e, score: s };
    }
  }
  return best;
}

export function riskLevel(ev) {
  if (!ev) return "";
  if (ev.days_remaining <= 1 && (ev.weightage || 0) >= 3) return "HIGH";
  if (ev.days_remaining <= 3 || (ev.weightage || 0) >= 5) return "HIGH";
  if (ev.days_remaining <= 7) return "WATCH";
  return "NOTE";
}

export function eventImpactLabel(impact) {
  const i = String(impact || "").toLowerCase();
  if (i === "critical" || i === "high") return "HIGH IMPACT";
  if (i === "medium") return "MEDIUM";
  return "";
}

export function relLabel(daysAway) {
  if (daysAway === 0) return "today";
  if (daysAway === 1) return "tomorrow";
  return `${daysAway}d`;
}

/** Admin files cover ~30 days from `updated`. */
export function riskEmptyMessage(index, { today, events = [], updated } = {}) {
  const week = events.filter((e) => e.days_remaining != null && e.days_remaining <= 7);
  const later = events
    .filter((e) => e.days_remaining != null && e.days_remaining > 7)
    .sort((a, b) => a.days_remaining - b.days_remaining);
  if (updated && today) {
    const until = addDaysISO(updated, 30);
    if (today > until) {
      return `No live ${index} calendar. Last admin file ${updated} (covers ~1 month, ended ${until}). Upload a new file.`;
    }
  }
  if (!events.length) {
    if (updated) {
      return `No ${index} constituent has results or a board meeting in this month’s file (updated ${updated}, covers ~30 days).`;
    }
    return `No ${index} constituent calendar yet. Admin upload covers about one month from the file date.`;
  }
  if (!week.length) {
    const nxt = later[0];
    if (nxt) {
      return `No ${index} constituent event in the next 7 days. Next in file: ${nxt.name} in ${relLabel(nxt.days_remaining)}.`;
    }
    return `No ${index} constituent event in the next 7 days.`;
  }
  return "";
}

/**
 * Rank 1–2 trader lines from quotes we actually have (Yahoo + FII + calendar).
 * Does not invent OI/PCR/straddle without a feed.
 */
export function rankIntel(pack, index) {
  const signals = [];
  const spot = pack?.spots?.[index] || {};
  const vix = pack?.spots?.VIX || {};
  const movers = pack?.movers?.[index] || [];
  const fii = pack?.fii || {};
  const next = (pack?.econ || [])[0];
  const risk = pickIndexRisk(pack?.impact?.[index]?.events, Math.abs(spot.pct || 0));

  if (vix.pct != null && Math.abs(vix.pct) >= 4) {
    signals.push({
      score: 80 + Math.abs(vix.pct),
      tone: vix.pct > 0 ? "hot" : "cool",
      text: `VIX ${vix.pct > 0 ? "spike" : "crush"} ${vix.pct >= 0 ? "+" : ""}${vix.pct.toFixed(1)}%`,
    });
  }

  if (spot.pct != null && Math.abs(spot.pct) >= 0.9) {
    signals.push({
      score: 70 + Math.abs(spot.pct) * 8,
      tone: spot.pct < 0 ? "hot" : "up",
      text: `${index} ${spot.pct >= 0 ? "breakout" : "breakdown"} ${spot.pct >= 0 ? "+" : ""}${spot.pct.toFixed(2)}%`,
    });
  } else if (spot.pct != null && spot.high != null && spot.low != null && spot.last != null) {
    const span = spot.high - spot.low;
    if (span > 0) {
      const pos = (spot.last - spot.low) / span;
      if (pos >= 0.92) {
        signals.push({
          score: 55,
          tone: "up",
          text: `${index} holding day high`,
        });
      } else if (pos <= 0.08) {
        signals.push({
          score: 55,
          tone: "hot",
          text: `${index} near day low`,
        });
      }
    }
  }

  const top = movers.find((m) => m.pct != null && Math.abs(m.pct) >= 1.2);
  if (top) {
    signals.push({
      score: 60 + Math.abs(top.pct) * (top.weightage || 1),
      tone: top.pct >= 0 ? "up" : "hot",
      text: `${index} — ${top.name} ${top.pct >= 0 ? "+" : ""}${top.pct.toFixed(1)}% · ${top.weightage || "?"}wt`,
    });
  }

  if (fii.fiiNet != null && fii.fiiNet <= -1500) {
    signals.push({
      score: 50,
      tone: "hot",
      text: `FII cash ${fii.fiiNet.toFixed(0)} cr (selling)`,
    });
  } else if (fii.fiiNet != null && fii.fiiNet >= 1500) {
    signals.push({
      score: 42,
      tone: "up",
      text: `FII cash +${fii.fiiNet.toFixed(0)} cr`,
    });
  }

  if (next && next.daysAway <= 1 && (next.impact === "critical" || next.impact === "high")) {
    signals.push({
      score: 65,
      tone: "hot",
      text: `${next.name} ${relLabel(next.daysAway)}`,
    });
  }

  if (risk && risk.days_remaining <= 1) {
    signals.push({
      score: 48 + (risk.weightage || 0),
      tone: "hot",
      text: `${risk.name} ${risk.event_type === "Quarterly Results" ? "results" : "board"} ${relLabel(risk.days_remaining)}`,
    });
  }

  signals.sort((a, b) => b.score - a.score);
  const uniq = [];
  const seen = new Set();
  for (const s of signals) {
    if (seen.has(s.text)) continue;
    seen.add(s.text);
    uniq.push(s);
    if (uniq.length >= 2) break;
  }
  if (!uniq.length) {
    uniq.push({
      score: 0,
      tone: "mute",
      text: pack?.spots?.session === "open" ? `${index} quiet — no unusual print` : "Waiting for cash session",
    });
  }
  return uniq;
}

/** Holiday tomorrow / today, or high-impact event or constituent risk within 1 day. */
export function computeUrgent(pack) {
  const reasons = [];
  const h = (pack?.holidays || [])[0];
  if (h && h.daysAway === 0) reasons.push(`Holiday today · ${h.name}`);
  if (h && h.daysAway === 1) reasons.push(`Holiday tomorrow · ${h.name}`);
  const ev = (pack?.econ || [])[0];
  if (ev && ev.daysAway <= 1 && (ev.impact === "critical" || ev.impact === "high")) {
    reasons.push(`${ev.name} ${relLabel(ev.daysAway)}`);
  }
  for (const idx of ["NIFTY", "SENSEX", "BANKNIFTY"]) {
    const r = pack?.risk?.[idx];
    if (r && r.days_remaining <= 1) {
      reasons.push(`${idx} · ${r.name} ${relLabel(r.days_remaining)}`);
    }
  }
  return { on: reasons.length > 0, reasons };
}
