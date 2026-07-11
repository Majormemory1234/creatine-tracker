export const STORAGE_VERSION = 1;

export function localDateKey(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function createEntry(grams, note = "", at = new Date()) {
  const amount = Number(grams);
  const date = at instanceof Date ? at : new Date(at);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 100) {
    throw new RangeError("Dose must be between 0 and 100 grams.");
  }
  if (Number.isNaN(date.getTime())) throw new TypeError("Entry date is invalid.");
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `${date.getTime()}-${Math.random().toString(16).slice(2)}`,
    grams: Math.round(amount * 10) / 10,
    note: String(note).trim().slice(0, 80),
    timestamp: date.toISOString(),
  };
}

export function sanitizeEntries(value) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const grams = Number(entry?.grams);
    const date = new Date(entry?.timestamp);
    if (!entry || !Number.isFinite(grams) || grams <= 0 || grams > 100 || Number.isNaN(date.getTime())) return [];
    return [{
      id: String(entry.id || `${date.getTime()}-${Math.random().toString(16).slice(2)}`),
      grams: Math.round(grams * 10) / 10,
      note: String(entry.note || "").trim().slice(0, 80),
      timestamp: date.toISOString(),
    }];
  }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

export function totalForDate(entries, date = new Date()) {
  const key = localDateKey(date);
  return entries.reduce((sum, entry) => sum + (localDateKey(entry.timestamp) === key ? Number(entry.grams) : 0), 0);
}

export function daysWindow(entries, count = 7, endDate = new Date()) {
  const result = [];
  const end = new Date(endDate);
  end.setHours(12, 0, 0, 0);
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const date = new Date(end);
    date.setDate(end.getDate() - offset);
    result.push({ date, key: localDateKey(date), total: totalForDate(entries, date) });
  }
  return result;
}

export function currentStreak(entries, endDate = new Date()) {
  const active = new Set(entries.map((entry) => localDateKey(entry.timestamp)).filter(Boolean));
  const cursor = new Date(endDate);
  cursor.setHours(12, 0, 0, 0);
  if (!active.has(localDateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (active.has(localDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function groupByDate(entries) {
  return sanitizeEntries(entries).reduce((groups, entry) => {
    const key = localDateKey(entry.timestamp);
    if (!groups[key]) groups[key] = [];
    groups[key].push(entry);
    return groups;
  }, {});
}
