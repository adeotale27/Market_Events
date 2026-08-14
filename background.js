/* global chrome */
import {
  todayIST,
  daysBetween,
  istParts,
  isCashSessionIST,
  sessionLabel,
  nextTradingAlarmUtc,
} from "./lib/time.js";
import { pickIndexRisk, rankIntel, riskLevel, computeUrgent } from "./lib/signals.js";

const NSE_HOME = "https://www.nseindia.com/";
const NSE_PAGE = "https://www.nseindia.com/reports/fii-dii";
const NSE_API = "https://www.nseindia.com/api/fiidiiTradeReact";
const INDEXES = ["NIFTY", "SENSEX", "BANKNIFTY"];
const IMPACT_TYPES = ["Quarterly Results", "Board Meeting"];
const YAHOO = {
  NIFTY: "^NSEI",
  SENSEX: "^BSESN",
  BANKNIFTY: "^NSEBANK",
  VIX: "^INDIAVIX",
};
const SPOTS_STALE_MS = 5 * 60 * 1000;
const FII_STALE_MS = 3 * 60 * 60 * 1000;

function storageGet(keys) {
  return new Promise((resolve) => chrome.storage.local.get(keys, resolve));
}

function storageSet(obj) {
  return new Promise((resolve) => chrome.storage.local.set(obj, resolve));
}

async function loadBundled(path) {
  const r = await fetch(chrome.runtime.getURL(path));
  if (!r.ok) throw new Error(`${path} ${r.status}`);
  return r.json();
}

async function loadRemote(base, rel) {
  if (!base) return null;
  const url = `${base.replace(/\/$/, "")}/${rel.replace(/^\//, "")}`;
  try {
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) return null;
    return r.json();
  } catch {
    return null;
  }
}

async function resolveJson(kind, bundledPath, remoteRel) {
  const s = await storageGet(["adminFiles", "config"]);
  const admin = s.adminFiles || {};
  if (admin[kind]) return { doc: admin[kind], source: "admin-upload" };
  let cfg = s.config;
  if (!cfg) {
    try {
      cfg = await loadBundled("data/config.json");
    } catch {
      cfg = {};
    }
  }
  const remote = await loadRemote(cfg.remoteBase, remoteRel);
  if (remote) return { doc: remote, source: "github" };
  return { doc: await loadBundled(bundledPath), source: "bundled" };
}

function parseNum(v) {
  const n = Number(String(v ?? "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

async function nseJson(url) {
  await fetch(NSE_HOME);
  await fetch(NSE_PAGE, { headers: { Referer: NSE_HOME } });
  const r = await fetch(url, {
    headers: { Accept: "application/json", Referer: NSE_PAGE },
  });
  if (!r.ok) throw new Error(`NSE ${r.status}`);
  return r.json();
}

async function pullFii() {
  const raw = await nseJson(NSE_API);
  const rows = Array.isArray(raw) ? raw : raw?.data || [];
  let fiiNet = null;
  let diiNet = null;
  let date = null;
  for (const row of rows) {
    const cat = String(row.category || row.CAT || "").toUpperCase();
    const net = parseNum(row.netValue || row.net || row.NET);
    date = date || row.date || row.tradedDate;
    if (cat.includes("FII") || cat.includes("FPI")) fiiNet = net;
    if (cat.includes("DII")) diiNet = net;
  }
  return { fiiNet, diiNet, date, at: Date.now() };
}

async function pullYahoo(symbol) {
  const urls = [
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1m&range=1d`,
    `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1m&range=1d`,
  ];
  let lastErr = "Yahoo failed";
  for (const url of urls) {
    try {
      const r = await fetch(url, { headers: { Accept: "application/json" } });
      if (!r.ok) {
        lastErr = `Yahoo ${r.status}`;
        continue;
      }
      const j = await r.json();
      const meta = j?.chart?.result?.[0]?.meta || {};
      const last = meta.regularMarketPrice ?? meta.previousClose;
      const prev = meta.chartPreviousClose ?? meta.previousClose;
      const chg = last != null && prev ? last - prev : null;
      const pct = chg != null && prev ? (chg / prev) * 100 : null;
      const closes = (j?.chart?.result?.[0]?.indicators?.quote?.[0]?.close || [])
        .filter((x) => x != null)
        .slice(-24);
      return {
        last,
        prev,
        chg,
        pct,
        high: meta.regularMarketDayHigh ?? null,
        low: meta.regularMarketDayLow ?? null,
        spark: closes,
        symbol,
        at: Date.now(),
      };
    } catch (e) {
      lastErr = String(e.message || e);
    }
  }
  throw new Error(lastErr);
}

async function pullSpots() {
  const out = {};
  await Promise.all(
    Object.entries(YAHOO).map(async ([idx, sym]) => {
      try {
        out[idx] = await pullYahoo(sym);
      } catch (e) {
        out[idx] = { error: String(e.message || e) };
      }
    }),
  );
  out.at = Date.now();
  out.session = isCashSessionIST() ? "open" : "closed";
  return out;
}

async function pullMovers() {
  let hw = { NIFTY: [], SENSEX: [], BANKNIFTY: [] };
  try {
    hw = await loadBundled("data/heavyweights.json");
  } catch {
    /* ignore */
  }
  const byIndex = {};
  await Promise.all(
    INDEXES.map(async (idx) => {
      const rows = hw[idx] || [];
      const quotes = await Promise.all(
        rows.map(async (row) => {
          try {
            const q = await pullYahoo(row.yahoo);
            return { ...row, ...q };
          } catch {
            return { ...row, error: true };
          }
        }),
      );
      byIndex[idx] = quotes
        .filter((q) => q.pct != null)
        .sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct));
    }),
  );
  return byIndex;
}

function normalizeImpact(doc, index) {
  const events = (doc?.events || [])
    .map((e) => {
      const date = e.date || e.event_date || "";
      const days_remaining = date ? daysBetween(todayIST(), date) : null;
      return {
        name: e.name || e.symbol || "",
        symbol: e.symbol || "",
        date,
        event_type: e.event_type || e.type || "Event",
        weightage: e.weightage != null ? Number(e.weightage) : null,
        days_remaining,
      };
    })
    .filter((e) => e.days_remaining == null || e.days_remaining >= 0)
    .filter((e) => IMPACT_TYPES.includes(e.event_type));
  return { index, events };
}

function holidayStatus(daysAway) {
  if (daysAway === 0) return "today";
  if (daysAway === 1) return "tomorrow";
  if (daysAway <= 6) return "this-week";
  return "upcoming";
}

function holidayDateSet(holidays) {
  return new Set((holidays || []).map((h) => h.date));
}

function sanitizePartner(doc) {
  if (!doc || doc.enabled !== true) return null;
  const url = String(doc.url || "").trim();
  if (!/^https:\/\//i.test(url)) return null;
  if (/javascript:|data:/i.test(url)) return null;
  const title = String(doc.title || "").trim().slice(0, 80);
  if (!title) return null;
  return {
    label: String(doc.label || "Partner").trim().slice(0, 24) || "Partner",
    title,
    blurb: String(doc.blurb || "").trim().slice(0, 140),
    url,
  };
}

function decoratePack(pack) {
  const holidayToday = (pack.holidays || []).some((h) => h.daysAway === 0);
  pack.session = {
    label: sessionLabel(new Date(), holidayToday),
    clock: istParts().hour.toString().padStart(2, "0") + ":" + String(istParts().minute).padStart(2, "0"),
    holidayToday,
  };
  pack.risk = {};
  pack.intelByIndex = {};
  for (const idx of INDEXES) {
    const abs = Math.abs(pack.spots?.[idx]?.pct || 0);
    const best = pickIndexRisk(pack.impact?.[idx]?.events, abs);
    pack.risk[idx] = best ? { ...best, level: riskLevel(best) } : null;
    pack.intelByIndex[idx] = rankIntel(pack, idx);
  }
  pack.urgent = computeUrgent(pack);
  return pack;
}

async function refreshAll() {
  const today = todayIST();
  const holPack = await resolveJson("holidays", "data/holidays.json", "data/holidays.json");
  const econPack = await resolveJson("econ", "data/econ-events.json", "data/econ-events.json");
  const partnerPack = await resolveJson("partner", "data/partner.json", "data/partner.json");
  const impact = {};
  const impactSource = {};
  const impactMeta = {};
  for (const idx of INDEXES) {
    const p = await resolveJson(
      `impact-${idx}`,
      `data/index-impact/${idx}.json`,
      `data/index-impact/${idx}.json`,
    );
    impact[idx] = normalizeImpact(p.doc, idx);
    const adminAt = (await storageGet(["adminFiles"])).adminFiles?.[`impact-${idx}At`];
    const updated =
      p.doc.updated ||
      (typeof adminAt === "number"
        ? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date(adminAt))
        : null);
    impactSource[idx] = p.source;
    impactMeta[idx] = { updated, source: p.source };

  }

  const holidays = (Array.isArray(holPack.doc?.holidays) ? holPack.doc.holidays : [])
    .filter((h) => h.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((h) => {
      const daysAway = daysBetween(today, h.date);
      return { ...h, daysAway, status: holidayStatus(daysAway) };
    });

  const econ = (econPack.doc.events || [])
    .filter((e) => e.date >= today)
    .sort((a, b) => {
      const rank = { critical: 0, high: 1, medium: 2, low: 3 };
      const d = a.date.localeCompare(b.date);
      if (d) return d;
      return (rank[a.impact] ?? 9) - (rank[b.impact] ?? 9);
    })
    .map((e) => ({ ...e, daysAway: daysBetween(today, e.date) }));

  const pack = {
    today,
    holidays,
    econ,
    impact,
    sources: {
      holidays: holPack.source,
      econ: econPack.source,
      impact: impactSource,
      quotes: "yahoo",
    },
    impactMeta,
    partner: sanitizePartner(partnerPack.doc),
    at: Date.now(),
  };
  const prev = (await storageGet(["radar"])).radar || {};
  try {
    pack.fii = await pullFii();
  } catch (e) {
    if (prev.fii && (prev.fii.fiiNet != null || prev.fii.diiNet != null)) {
      pack.fii = { ...prev.fii, stale: true };
      pack.fiiError = String(e.message || e);
    } else {
      pack.fiiError = String(e.message || e);
    }
  }
  try {
    pack.spots = await pullSpots();
  } catch (e) {
    pack.spotsError = String(e.message || e);
    if (prev.spots) pack.spots = prev.spots;
  }
  try {
    pack.movers = await pullMovers();
  } catch {
    pack.movers = prev.movers || {};
  }
  decoratePack(pack);
  await storageSet({ radar: pack });
  await updateBadge(pack.spots);
  return pack;
}

async function updateBadge(spots) {
  const n = spots?.NIFTY;
  if (n?.pct == null || !Number.isFinite(Number(n.pct))) {
    await chrome.action.setBadgeText({ text: "" });
    return;
  }
  const text = `${n.pct >= 0 ? "+" : ""}${Number(n.pct).toFixed(1)}`.slice(0, 4);
  await chrome.action.setBadgeText({ text });
  await chrome.action.setBadgeBackgroundColor({
    color: n.pct >= 0 ? "#059669" : "#e11d48",
  });
}

async function ensureFresh() {
  const radar = (await storageGet(["radar"])).radar;
  if (!radar) return refreshAll();
  const age = Date.now() - (radar.at || 0);
  const fiiAge = Date.now() - (radar.fii?.at || 0);
  const fiiBad = !radar.fii || fiiAge > FII_STALE_MS;
  if (age > SPOTS_STALE_MS || fiiBad) return refreshAll();
  if (isCashSessionIST()) {
    try {
      radar.spots = await pullSpots();
      radar.at = Date.now();
      decoratePack(radar);
      await storageSet({ radar });
      await updateBadge(radar.spots);
    } catch {
      /* keep last */
    }
  }
  return radar;
}

async function holidayDates() {
  try {
    const holPack = await resolveJson("holidays", "data/holidays.json", "data/holidays.json");
    return holidayDateSet(holPack.doc?.holidays || []);
  } catch {
    return new Set();
  }
}

async function scheduleBriefs() {
  const dates = await holidayDates();
  const pre = nextTradingAlarmUtc(9, 15, dates);
  const close = nextTradingAlarmUtc(15, 40, dates);
  await chrome.alarms.clear("brief-premarket");
  await chrome.alarms.clear("brief-close");
  if (pre) chrome.alarms.create("brief-premarket", { when: pre });
  if (close) chrome.alarms.create("brief-close", { when: close });
}

async function armAlarms() {
  chrome.alarms.create("spots", { periodInMinutes: 1 });
  chrome.alarms.create("fii-daily", { periodInMinutes: 180 });
  await scheduleBriefs();
}

async function hasNotifyPermission() {
  return chrome.permissions.contains({ permissions: ["notifications"] });
}

async function notify(id, title, message) {
  const s = await storageGet(["alertsEnabled", "lastBrief"]);
  if (!s.alertsEnabled) return;
  if (!(await hasNotifyPermission())) return;
  const last = s.lastBrief || {};
  if (last[id] === todayIST()) return;
  await chrome.notifications.create(id, {
    type: "basic",
    iconUrl: "icons/icon128.png",
    title,
    message: message || "Open Market Pulse",
    priority: 1,
  });
  last[id] = todayIST();
  await storageSet({ lastBrief: last });
}

async function openPulseWindow() {
  try {
    await chrome.action.openPopup();
    return;
  } catch {
    /* fall through */
  }
  await chrome.windows.create({
    url: chrome.runtime.getURL("popup.html"),
    type: "popup",
    width: 400,
    height: 560,
    focused: true,
  });
}

async function playAlert() {
  try {
    const has = await chrome.offscreen.hasDocument();
    if (!has) {
      await chrome.offscreen.createDocument({
        url: "offscreen.html",
        reasons: ["AUDIO_PLAYBACK"],
        justification: "Play the Market Pulse briefing chime",
      });
    }
    await chrome.runtime.sendMessage({ type: "play-alert" });
  } catch {
    /* popup window can still chime */
  }
}

async function onBrief(kind) {
  const dates = await holidayDates();
  if (!isTradingDaySafe(dates)) {
    await scheduleBriefs();
    return;
  }
  const pack = await refreshAll().catch(() => null);
  const urgent = pack?.urgent?.on;
  const reason = pack?.urgent?.reasons?.[0] || pack?.intelByIndex?.NIFTY?.[0]?.text || "Today’s board is ready";
  await storageSet({
    briefing: { kind, urgent: !!urgent, reasons: pack?.urgent?.reasons || [], at: Date.now() },
  });
  const s = await storageGet(["alertsEnabled"]);
  if (kind === "premarket") {
    await notify("brief-premarket", "Market Pulse · 09:15 · Today’s board", reason);
  } else {
    await notify("brief-close", "Market Pulse · 15:40 · Close briefing", reason);
  }
  if (s.alertsEnabled && urgent) {
    await playAlert();
    await openPulseWindow();
  }
  await scheduleBriefs();
}

function isTradingDaySafe(dates) {
  const iso = todayIST();
  const p = istParts();
  if (p.weekend) return false;
  return !dates.has(iso);
}

chrome.runtime.onInstalled.addListener(() => {
  armAlarms().catch(() => {});
  refreshAll().catch(() => {});
  if (chrome.sidePanel?.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch(() => {});
  }
});
chrome.runtime.onStartup.addListener(() => {
  armAlarms().catch(() => {});
  refreshAll().catch(() => {});
});

chrome.alarms.onAlarm.addListener((a) => {
  if (a.name === "fii-daily") {
    refreshAll().catch(() => {});
    return;
  }
  if (a.name === "spots") {
    if (isCashSessionIST()) {
      pullSpots()
        .then(async (spots) => {
          const s = await storageGet(["radar"]);
          const radar = s.radar || {};
          radar.spots = spots;
          decoratePack(radar);
          await storageSet({ radar });
          await updateBadge(spots);
        })
        .catch(() => {});
    }
    return;
  }
  if (a.name === "brief-premarket") {
    onBrief("premarket").catch(() => {});
    return;
  }
  if (a.name === "brief-close") {
    onBrief("close").catch(() => {});
  }
});

let notifyBound = false;
function bindNotifyClick() {
  if (notifyBound || !chrome.notifications?.onClicked) return;
  notifyBound = true;
  chrome.notifications.onClicked.addListener((id) => {
    chrome.notifications.clear(id);
    openPulseWindow().catch(() => {});
  });
}
bindNotifyClick();

chrome.runtime.onMessage.addListener((msg, _s, send) => {
  if (msg?.type === "refresh") {
    refreshAll().then(send).catch((e) => send({ error: String(e) }));
    return true;
  }
  if (msg?.type === "ensure") {
    ensureFresh().then(send).catch((e) => send({ error: String(e) }));
    return true;
  }
  if (msg?.type === "enable-alerts") {
    chrome.permissions
      .request({ permissions: ["notifications"] })
      .then(async (ok) => {
        if (ok) {
          await storageSet({ alertsEnabled: true, consentSeen: true });
          bindNotifyClick();
          await scheduleBriefs();
        } else {
          await storageSet({ alertsEnabled: false, consentSeen: true });
        }
        send({ ok, alertsEnabled: !!ok });
      })
      .catch((e) => send({ ok: false, error: String(e) }));
    return true;
  }
  if (msg?.type === "disable-alerts") {
    storageSet({ alertsEnabled: false, consentSeen: true }).then(() => send({ ok: true }));
    return true;
  }
  if (msg?.type === "dismiss-consent") {
    storageSet({ consentSeen: true, alertsEnabled: false }).then(() => send({ ok: true }));
    return true;
  }
  if (msg?.type === "play-alert") return false;
  if (msg?.type === "unlock-admin") {
    loadBundled("data/config.json")
      .then(async (cfg) => {
        const pin = String(cfg.adminPin || "pulse");
        const ok = String(msg.pin || "") === pin;
        if (ok) await storageSet({ adminUnlocked: true });
        send({ ok });
      })
      .catch((e) => send({ ok: false, error: String(e) }));
    return true;
  }
  if (msg?.type === "lock-admin") {
    storageSet({ adminUnlocked: false }).then(() => send({ ok: true }));
    return true;
  }
  if (msg?.type === "admin-status") {
    storageGet(["adminUnlocked"]).then((s) => send({ unlocked: !!s.adminUnlocked }));
    return true;
  }
  if (msg?.type === "open-mini") {
    chrome.windows
      .create({
        url: chrome.runtime.getURL("mini.html"),
        type: "popup",
        width: 348,
        height: 92,
        focused: true,
      })
      .then(() => send({ ok: true }))
      .catch((e) => send({ ok: false, error: String(e) }));
    return true;
  }
  return false;
});
