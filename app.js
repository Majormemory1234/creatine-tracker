import {
  STORAGE_VERSION,
  createEntry,
  currentStreak,
  daysWindow,
  groupByDate,
  localDateKey,
  sanitizeEntries,
  totalForDate,
} from "./tracker-core.mjs";

const DATA_KEY = "creatinectl:data:v1";
const THEME_KEY = "creatinectl:theme";
const SESSION_KEY = "creatinectl:authenticated";
const THEMES = new Set(["tokyo", "catppuccin", "gruvbox"]);

const $ = (selector) => document.querySelector(selector);
const loginView = $("#login-view");
const app = $("#app");
const loginForm = $("#login-form");
const entryForm = $("#entry-form");
const historyList = $("#history-list");
const emptyState = $("#empty-state");
const saveMessage = $("#save-message");
const goalDialog = $("#goal-dialog");
const securityDialog = $("#security-dialog");
const resetDialog = $("#reset-dialog");

let state = loadState();
let messageTimer;

function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(DATA_KEY));
    const goal = Number(parsed?.goal);
    return {
      version: STORAGE_VERSION,
      goal: Number.isFinite(goal) && goal > 0 && goal <= 100 ? goal : 5,
      entries: sanitizeEntries(parsed?.entries),
    };
  } catch {
    return { version: STORAGE_VERSION, goal: 5, entries: [] };
  }
}

function persist() {
  localStorage.setItem(DATA_KEY, JSON.stringify(state));
}

function setAuthenticated(isAuthenticated) {
  loginView.hidden = isAuthenticated;
  app.hidden = !isAuthenticated;
  if (isAuthenticated) {
    sessionStorage.setItem(SESSION_KEY, "true");
    render();
    requestAnimationFrame(() => $("#grams").focus());
  } else {
    sessionStorage.removeItem(SESSION_KEY);
    loginForm.reset();
    $("#login-error").textContent = "";
    requestAnimationFrame(() => $("#username").focus());
  }
}

function formatAmount(amount) {
  return Number(amount).toFixed(1);
}

function announce(message, type = "success") {
  clearTimeout(messageTimer);
  saveMessage.textContent = message;
  saveMessage.style.color = type === "error" ? "var(--red)" : "var(--green)";
  messageTimer = setTimeout(() => { saveMessage.textContent = ""; }, 3500);
}

function render() {
  const now = new Date();
  const todayTotal = totalForDate(state.entries, now);
  const percentage = Math.min(100, Math.round((todayTotal / state.goal) * 100));
  const week = daysWindow(state.entries, 7, now);

  $("#today-label").textContent = new Intl.DateTimeFormat(undefined, {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  }).format(now);
  $("#today-total").textContent = formatAmount(todayTotal);
  $("#goal-value").textContent = formatAmount(state.goal);
  $("#goal-percent").textContent = `${percentage}%`;
  $("#goal-ring").style.setProperty("--progress", `${percentage * 3.6}deg`);
  $("#streak-value").textContent = String(currentStreak(state.entries, now));

  if (state.entries.length) {
    const last = state.entries[0];
    $("#last-dose").textContent = new Intl.DateTimeFormat(undefined, {
      hour: "2-digit", minute: "2-digit", month: "short", day: "numeric",
    }).format(new Date(last.timestamp));
  } else {
    $("#last-dose").textContent = "—";
  }

  renderChart(week);
  renderHistory();
}

function renderChart(week) {
  const chart = $("#week-chart");
  chart.replaceChildren();
  const max = Math.max(state.goal, ...week.map((day) => day.total), 1);
  const todayKey = localDateKey();
  const weekTotal = week.reduce((sum, day) => sum + day.total, 0);
  $("#week-total").textContent = `${formatAmount(weekTotal)} g total`;

  for (const day of week) {
    const item = document.createElement("div");
    item.className = `chart-day${day.key === todayKey ? " today" : ""}`;

    const wrap = document.createElement("div");
    wrap.className = "bar-wrap";
    const value = document.createElement("span");
    value.className = "bar-value";
    value.textContent = day.total ? `${formatAmount(day.total)}g` : "";
    const bar = document.createElement("div");
    bar.className = "bar";
    bar.style.height = `${Math.max(day.total ? 8 : 2, (day.total / max) * 100)}%`;
    bar.title = `${day.key}: ${formatAmount(day.total)} grams`;
    wrap.append(bar, value);

    const label = document.createElement("span");
    label.className = "chart-label";
    label.textContent = new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(day.date);
    item.append(wrap, label);
    chart.append(item);
  }
}

function renderHistory() {
  historyList.replaceChildren();
  const groups = groupByDate(state.entries);
  const keys = Object.keys(groups).sort().reverse();
  emptyState.hidden = keys.length > 0;
  historyList.hidden = keys.length === 0;

  for (const key of keys) {
    const section = document.createElement("section");
    section.className = "history-group";
    const heading = document.createElement("div");
    heading.className = "history-date";
    const localNoon = new Date(`${key}T12:00:00`);
    heading.textContent = new Intl.DateTimeFormat(undefined, {
      weekday: "long", month: "short", day: "numeric", year: "numeric",
    }).format(localNoon);
    section.append(heading);

    for (const entry of groups[key]) {
      const row = document.createElement("div");
      row.className = "history-entry";
      row.dataset.id = entry.id;

      const time = document.createElement("time");
      time.className = "entry-time";
      time.dateTime = entry.timestamp;
      time.textContent = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(new Date(entry.timestamp));

      const dose = document.createElement("span");
      dose.className = "entry-dose";
      dose.textContent = `+ ${formatAmount(entry.grams)} g`;

      const note = document.createElement("span");
      note.className = "entry-note";
      note.textContent = entry.note || "creatine dose";
      note.title = entry.note || "creatine dose";

      const remove = document.createElement("button");
      remove.className = "delete-entry";
      remove.type = "button";
      remove.textContent = "×";
      remove.title = "Delete this entry";
      remove.setAttribute("aria-label", `Delete ${formatAmount(entry.grams)} gram entry`);
      remove.addEventListener("click", () => deleteEntry(entry.id));

      row.append(time, dose, note, remove);
      section.append(row);
    }
    historyList.append(section);
  }
}

function deleteEntry(id) {
  state.entries = state.entries.filter((entry) => entry.id !== id);
  persist();
  render();
  announce("entry removed");
}

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const username = $("#username").value;
  const password = $("#password").value;
  if (username === "test" && password === "test") {
    setAuthenticated(true);
  } else {
    $("#login-error").textContent = "authentication failed: invalid credentials";
    $("#password").value = "";
    $("#password").focus();
  }
});

$("#logout-button").addEventListener("click", () => setAuthenticated(false));

entryForm.addEventListener("submit", (event) => {
  event.preventDefault();
  try {
    const entry = createEntry($("#grams").value, $("#note").value, new Date());
    state.entries = sanitizeEntries([entry, ...state.entries]);
    persist();
    render();
    $("#note").value = "";
    $("#grams").select();
    announce(`committed ${formatAmount(entry.grams)} g at ${new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(new Date(entry.timestamp))}`);
  } catch (error) {
    announce(error.message, "error");
  }
});

document.querySelectorAll(".quick-dose").forEach((button) => {
  button.addEventListener("click", () => {
    $("#grams").value = button.dataset.dose;
    $("#grams").focus();
  });
});

$("#edit-goal-button").addEventListener("click", () => {
  $("#goal-input").value = state.goal;
  goalDialog.showModal();
  $("#goal-input").select();
});

$("#close-goal-button").addEventListener("click", () => goalDialog.close());
$("#cancel-goal-button").addEventListener("click", () => goalDialog.close());

$("#goal-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const goal = Number($("#goal-input").value);
  if (!Number.isFinite(goal) || goal <= 0 || goal > 100) return;
  state.goal = Math.round(goal * 10) / 10;
  persist();
  goalDialog.close();
  render();
  announce(`daily target set to ${formatAmount(state.goal)} g`);
});

$("#export-button").addEventListener("click", () => {
  const payload = JSON.stringify({ ...state, exportedAt: new Date().toISOString() }, null, 2);
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([payload], { type: "application/json" }));
  link.download = `creatinectl-backup-${localDateKey()}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  announce("backup exported");
});

$("#import-input").addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    const imported = sanitizeEntries(Array.isArray(parsed) ? parsed : parsed.entries);
    if (!imported.length && (Array.isArray(parsed) ? parsed.length : parsed.entries?.length)) {
      throw new Error("No valid entries found in this file.");
    }
    const byId = new Map([...state.entries, ...imported].map((entry) => [entry.id, entry]));
    state.entries = sanitizeEntries([...byId.values()]);
    if (!Array.isArray(parsed) && Number(parsed.goal) > 0 && Number(parsed.goal) <= 100) state.goal = Number(parsed.goal);
    persist();
    render();
    announce(`imported ${imported.length} entr${imported.length === 1 ? "y" : "ies"}`);
  } catch (error) {
    announce(`import failed: ${error.message}`, "error");
  } finally {
    event.target.value = "";
  }
});

$("#reset-button").addEventListener("click", () => resetDialog.showModal());
$("#confirm-reset-button").addEventListener("click", (event) => {
  event.preventDefault();
  state = { version: STORAGE_VERSION, goal: state.goal, entries: [] };
  persist();
  resetDialog.close();
  render();
  announce("all entries erased");
});

$("#security-info-button").addEventListener("click", () => securityDialog.showModal());

const storedTheme = localStorage.getItem(THEME_KEY);
const initialTheme = THEMES.has(storedTheme) ? storedTheme : "tokyo";
document.documentElement.dataset.theme = initialTheme;
$("#theme-select").value = initialTheme;
$("#theme-select").addEventListener("change", (event) => {
  const theme = THEMES.has(event.target.value) ? event.target.value : "tokyo";
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(THEME_KEY, theme);
});

setAuthenticated(sessionStorage.getItem(SESSION_KEY) === "true");
