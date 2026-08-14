/** IST helpers — no Chrome APIs. */

export function todayIST(d = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(d);
}

export function daysBetween(fromISO, toISO) {
  const a = new Date(`${fromISO}T00:00:00+05:30`);
  const b = new Date(`${toISO}T00:00:00+05:30`);
  return Math.round((b - a) / 86400000);
}

export function istParts(d = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour12: false,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(d);
  const g = (t) => parts.find((p) => p.type === t)?.value;
  const weekday = g("weekday");
  return {
    weekday,
    year: Number(g("year")),
    month: Number(g("month")),
    day: Number(g("day")),
    hour: Number(g("hour")),
    minute: Number(g("minute")),
    minutes: Number(g("hour")) * 60 + Number(g("minute")),
    iso: `${g("year")}-${g("month")}-${g("day")}`,
    weekend: weekday === "Sat" || weekday === "Sun",
  };
}

export function istClock(ms = Date.now()) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ms));
}

/** Cash session 09:15–15:40 IST (current NSE F&O close). */
export function isCashSessionIST(d = new Date()) {
  const p = istParts(d);
  if (p.weekend) return false;
  return p.minutes >= 9 * 60 + 15 && p.minutes <= 15 * 60 + 40;
}

export function sessionLabel(d, holidayToday) {
  const p = istParts(d);
  if (holidayToday) return "HOLIDAY";
  if (p.weekend) return "CLOSED";
  if (p.minutes >= 9 * 60 + 15 && p.minutes <= 15 * 60 + 40) return "LIVE";
  if (p.minutes >= 9 * 60 && p.minutes < 9 * 60 + 15) return "PRE-MARKET";
  if (p.minutes >= 8 * 60 && p.minutes < 9 * 60) return "PRE-MARKET";
  return "CLOSED";
}

/** IST wall-clock → UTC ms. IST = UTC+05:30, no DST. */
export function istWallToUtcMs(year, month, day, hour, minute) {
  return Date.UTC(year, month - 1, day, hour, minute) - 5.5 * 3600 * 1000;
}

export function addDaysISO(iso, n) {
  const [y, m, d] = iso.split("-").map(Number);
  const utc = Date.UTC(y, m - 1, d) + n * 86400000;
  const dt = new Date(utc);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export function weekdayISO(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 Sun
}

export function isTradingDay(iso, holidayDates) {
  const dow = weekdayISO(iso);
  if (dow === 0 || dow === 6) return false;
  return !holidayDates.has(iso);
}

export function nextTradingAlarmUtc(hour, minute, holidayDates, from = new Date()) {
  const p = istParts(from);
  let iso = p.iso;
  let startToday = true;
  for (let i = 0; i < 12; i += 1) {
    if (isTradingDay(iso, holidayDates)) {
      const [y, m, d] = iso.split("-").map(Number);
      const when = istWallToUtcMs(y, m, d, hour, minute);
      if (!startToday || when > from.getTime() + 15000) return when;
    }
    iso = addDaysISO(iso, 1);
    startToday = false;
  }
  return null;
}
