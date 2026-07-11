import test from "node:test";
import assert from "node:assert/strict";
import {
  createEntry,
  currentStreak,
  daysWindow,
  groupByDate,
  localDateKey,
  sanitizeEntries,
  totalForDate,
} from "../tracker-core.mjs";

test("createEntry normalizes a valid dose and timestamp", () => {
  const entry = createEntry("5.04", " post-workout ", new Date(2026, 6, 11, 9, 30));
  assert.equal(entry.grams, 5);
  assert.equal(entry.note, "post-workout");
  assert.equal(localDateKey(entry.timestamp), "2026-07-11");
});

test("createEntry rejects impossible doses", () => {
  assert.throws(() => createEntry(0), RangeError);
  assert.throws(() => createEntry(101), RangeError);
});

test("daily totals use local calendar dates", () => {
  const entries = [
    createEntry(3, "", new Date(2026, 6, 11, 8)),
    createEntry(2.5, "", new Date(2026, 6, 11, 18)),
    createEntry(5, "", new Date(2026, 6, 10, 18)),
  ];
  assert.equal(totalForDate(entries, new Date(2026, 6, 11, 12)), 5.5);
});

test("streak includes today or starts from yesterday", () => {
  const end = new Date(2026, 6, 11, 12);
  const continuous = [11, 10, 9].map((day) => createEntry(5, "", new Date(2026, 6, day, 8)));
  assert.equal(currentStreak(continuous, end), 3);
  const missedToday = [10, 9].map((day) => createEntry(5, "", new Date(2026, 6, day, 8)));
  assert.equal(currentStreak(missedToday, end), 2);
});

test("seven-day window is ordered and totals each day", () => {
  const end = new Date(2026, 6, 11, 12);
  const entries = [createEntry(5, "", new Date(2026, 6, 11, 8))];
  const days = daysWindow(entries, 7, end);
  assert.equal(days.length, 7);
  assert.equal(days[0].key, "2026-07-05");
  assert.equal(days[6].total, 5);
});

test("import sanitation drops malformed records and groups valid ones", () => {
  const clean = sanitizeEntries([
    { id: "ok", grams: 5, timestamp: new Date(2026, 6, 11, 8).toISOString() },
    { id: "bad", grams: -2, timestamp: "not-a-date" },
  ]);
  assert.equal(clean.length, 1);
  assert.equal(Object.keys(groupByDate(clean))[0], "2026-07-11");
});
