"use strict";

const STORAGE_KEY = "gjak-school-planner-tasks-v1";
const SCHEDULE_STORAGE_KEY = "gjak-school-planner-schedule-v1";
const THEME_STORAGE_KEY = "gjak-school-planner-theme-v1";
const taskList = document.getElementById("task-list");
const taskForm = document.getElementById("task-form");
const scheduleForm = document.getElementById("schedule-form");
const taskTitleInput = document.getElementById("task-title");
const toast = document.getElementById("toast");
const themeToggle = document.getElementById("theme-toggle");

const filterLabels = {
  all: "Všechny úkoly",
  today: "Na dnes",
  upcoming: "Nadcházející",
  completed: "Hotové"
};
let activeFilter = "all";
let tasks = loadTasks();
let schedule = loadSchedule();
let weekOffset = 0;
let toastTimeout;

function getSavedTheme() {
  try {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    return savedTheme === "light" ? "light" : "dark";
  } catch (error) {
    showToast("Nastavení vzhledu se nepodařilo načíst. Zkontroluj úložiště prohlížeče.");
    console.error("Načtení vzhledu selhalo:", error);
    return "dark";
  }
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const isDark = theme === "dark";
  const label = isDark ? "Světlý režim" : "Tmavý režim";
  themeToggle.setAttribute("aria-label", `Přepnout na ${isDark ? "světlý" : "tmavý"} režim`);
  themeToggle.setAttribute("aria-pressed", String(isDark));
  document.getElementById("theme-label").textContent = label;
  document.getElementById("theme-icon").textContent = isDark ? "☼" : "◐";
  document.querySelector('meta[name="theme-color"]').setAttribute("content", isDark ? "#0a1014" : "#e7ecee");
}

applyTheme(getSavedTheme());

themeToggle.addEventListener("click", () => {
  const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  applyTheme(nextTheme);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  } catch (error) {
    showToast("Vzhled se změnil, ale nepodařilo se ho uložit do prohlížeče.");
    console.error("Uložení vzhledu selhalo:", error);
  }
});

function localDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function loadTasks() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === null) return [];
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) throw new TypeError("Uložená data nemají očekávaný formát.");
    return parsed.filter((task) =>
      task &&
      typeof task.id === "string" &&
      typeof task.title === "string" &&
      typeof task.completed === "boolean"
    );
  } catch (error) {
    showToast("Uložené úkoly se nepodařilo načíst. Zkontroluj nastavení úložiště prohlížeče.");
    console.error("Načtení školních úkolů selhalo:", error);
    return [];
  }
}

function isValidScheduleEntry(entry) {
  return entry &&
    typeof entry.id === "string" &&
    Number.isInteger(entry.weekday) && entry.weekday >= 1 && entry.weekday <= 7 &&
    typeof entry.start === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(entry.start) &&
    typeof entry.end === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(entry.end) &&
    entry.end > entry.start &&
    typeof entry.subject === "string" && entry.subject.trim().length > 0 &&
    (entry.room === undefined || typeof entry.room === "string");
}

function loadSchedule() {
  try {
    const saved = localStorage.getItem(SCHEDULE_STORAGE_KEY);
    if (saved === null) return [];
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) throw new TypeError("Uložený rozvrh nemá očekávaný formát.");
    const validEntries = parsed.filter(isValidScheduleEntry);
    if (validEntries.length !== parsed.length) {
      const error = new TypeError("Rozvrh obsahuje neplatné položky.");
      showToast("Některé položky rozvrhu jsou poškozené a nebyly načteny.");
      console.error("Část rozvrhu se nepodařilo načíst:", error);
    }
    return validEntries;
  } catch (error) {
    showToast("Uložený rozvrh se nepodařilo načíst. Zkontroluj úložiště prohlížeče.");
    console.error("Načtení rozvrhu selhalo:", error);
    return [];
  }
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    return true;
  } catch (error) {
    showToast("Změna se nepodařila uložit do tohoto prohlížeče. Zkontroluj dostupné úložiště.");
    console.error("Uložení školních úkolů selhalo:", error);
    return false;
  }
}

function saveSchedule() {
  try {
    localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(schedule));
    return true;
  } catch (error) {
    showToast("Rozvrh se nepodařilo uložit. Zkontroluj dostupné úložiště prohlížeče.");
    console.error("Uložení rozvrhu selhalo:", error);
    return false;
  }
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(toastTimeout);
  toastTimeout = window.setTimeout(() => toast.classList.remove("is-visible"), 5000);
}

function updateDateHeading() {
  const now = new Date();
  const dateText = new Intl.DateTimeFormat("cs-CZ", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(now);
  document.getElementById("today-label").textContent = dateText.toLocaleUpperCase("cs-CZ");
  const hour = now.getHours();
  const greeting = hour < 11 ? "Dobré ráno, ať ti to dnes jde." : hour < 18 ? "Měj ve škole přehled." : "Hezký večer, naplánuj si zítřek.";
  document.getElementById("greeting").textContent = greeting;
}

function getVisibleTasks() {
  const today = localDateKey(new Date());
  const search = document.getElementById("task-search").value.trim().toLocaleLowerCase("cs-CZ");
  const subjectFilter = document.getElementById("subject-filter").value;
  const priorityFilter = document.getElementById("priority-filter").value;
  const visible = tasks.filter((task) => {
    if (activeFilter === "today" && (task.completed || task.dueDate !== today)) return false;
    if (activeFilter === "upcoming" && (task.completed || !task.dueDate || task.dueDate <= today)) return false;
    if (activeFilter === "completed" && !task.completed) return false;
    if (search && !`${task.title} ${task.subject || ""}`.toLocaleLowerCase("cs-CZ").includes(search)) return false;
    if (subjectFilter && task.subject !== subjectFilter) return false;
    if (priorityFilter && (task.priority || "normal") !== priorityFilter) return false;
    return true;
  });

  if (document.getElementById("sort-select").value === "created") {
    visible.sort((a, b) => b.createdAt - a.createdAt);
  } else {
    visible.sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return b.createdAt - a.createdAt;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate) || b.createdAt - a.createdAt;
    });
  }
  return visible;
}

function getWeekDates() {
  const today = new Date();
  const mondayOffset = (today.getDay() + 6) % 7;
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - mondayOffset + weekOffset * 7);
  return Array.from({ length: 7 }, (_, index) =>
    new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + index)
  );
}

function renderReminder() {
  const today = localDateKey(new Date());
  const overdue = tasks.filter((task) => !task.completed && task.dueDate && task.dueDate < today).length;
  const dueToday = tasks.filter((task) => !task.completed && task.dueDate === today).length;
  const banner = document.getElementById("reminder-banner");
  const message = document.getElementById("reminder-text");
  if (overdue === 0 && dueToday === 0) {
    banner.hidden = true;
    return;
  }
  const parts = [];
  if (overdue) parts.push(`${overdue} ${overdue === 1 ? "úkol je po termínu" : "úkoly jsou po termínu"}`);
  if (dueToday) parts.push(`${dueToday} ${dueToday === 1 ? "úkol má termín dnes" : "úkoly mají termín dnes"}`);
  message.textContent = `${parts.join(" a ")}. Nezapomeň je zkontrolovat.`;
  banner.hidden = false;
}

function renderWeek() {
  const dates = getWeekDates();
  const dateFormatter = new Intl.DateTimeFormat("cs-CZ", { day: "numeric", month: "short" });
  const weekdayFormatter = new Intl.DateTimeFormat("cs-CZ", { weekday: "long" });
  document.getElementById("week-range").textContent =
    `${dateFormatter.format(dates[0])} – ${dateFormatter.format(dates[6])} ${dates[6].getFullYear()}`;

  const grid = document.getElementById("week-grid");
  grid.replaceChildren();
  dates.forEach((date) => {
    const dateKey = localDateKey(date);
    const weekday = date.getDay() || 7;
    const dayTasks = tasks.filter((task) => task.dueDate === dateKey);
    const pendingCount = dayTasks.filter((task) => !task.completed).length;
    const daySchedule = schedule
      .filter((entry) => entry.weekday === weekday)
      .sort((a, b) => a.start.localeCompare(b.start));
    const commitmentCount = pendingCount + daySchedule.length;
    const day = document.createElement("article");
    day.className = `week-day${dateKey === localDateKey(new Date()) ? " is-today" : ""}`;

    const heading = document.createElement("div");
    heading.className = "week-day-heading";
    const dayName = document.createElement("h3");
    dayName.textContent = weekdayFormatter.format(date);
    const dayDate = document.createElement("span");
    dayDate.textContent = dateFormatter.format(date);
    heading.append(dayName, dayDate);

    const load = document.createElement("p");
    load.className = `day-load${commitmentCount >= 7 ? " is-heavy" : commitmentCount >= 4 ? " is-medium" : commitmentCount > 0 ? " is-light" : ""}`;
    const loadLabel = commitmentCount >= 7 ? "Nabitý den" : commitmentCount >= 4 ? "Střední zátěž" : commitmentCount > 0 ? "Volnější den" : "Klidný den";
    load.textContent = `${loadLabel} · ${pendingCount} úkolů, ${daySchedule.length} hodin`;
    day.append(heading, load);

    if (daySchedule.length) {
      const lessonHeading = document.createElement("p");
      lessonHeading.className = "week-group-label";
      lessonHeading.textContent = "ROZVRH";
      day.append(lessonHeading);
      daySchedule.forEach((entry) => {
        const lesson = document.createElement("div");
        lesson.className = "week-lesson";
        const time = document.createElement("span");
        time.className = "week-item-time";
        time.textContent = `${entry.start}–${entry.end}`;
        const subject = document.createElement("strong");
        subject.textContent = entry.subject;
        const room = document.createElement("span");
        room.className = "week-item-detail";
        room.textContent = entry.room || "";
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "schedule-delete";
        remove.textContent = "×";
        remove.setAttribute("aria-label", `Odebrat ${entry.subject} z rozvrhu`);
        remove.addEventListener("click", () => deleteScheduleEntry(entry.id));
        lesson.append(time, subject);
        if (entry.room) lesson.append(room);
        lesson.append(remove);
        day.append(lesson);
      });
    }

    if (dayTasks.length) {
      const taskHeading = document.createElement("p");
      taskHeading.className = "week-group-label";
      taskHeading.textContent = "ÚKOLY";
      day.append(taskHeading);
      dayTasks.forEach((task) => {
        const taskItem = document.createElement("p");
        taskItem.className = `week-task${task.completed ? " is-completed" : ""}`;
        taskItem.textContent = task.title;
        day.append(taskItem);
      });
    }

    if (!daySchedule.length && !dayTasks.length) {
      const empty = document.createElement("p");
      empty.className = "week-day-empty";
      empty.textContent = "Zatím nic naplánováno";
      day.append(empty);
    }
    grid.append(day);
  });
}

function formatDueDate(dateValue) {
  if (!dateValue) return "";
  const due = new Date(`${dateValue}T00:00:00`);
  const today = localDateKey(new Date());
  const diff = Math.round((due.getTime() - new Date(`${today}T00:00:00`).getTime()) / 86400000);
  if (diff === 0) return "Dnes";
  if (diff === 1) return "Zítra";
  return new Intl.DateTimeFormat("cs-CZ", { day: "numeric", month: "short" }).format(due);
}

function createTaskElement(task) {
  const item = document.createElement("article");
  item.className = `task-item${task.completed ? " is-completed" : ""}`;

  const checkbox = document.createElement("button");
  checkbox.type = "button";
  checkbox.className = "task-check";
  checkbox.setAttribute("aria-label", task.completed ? `Označit úkol ${task.title} jako nedokončený` : `Označit úkol ${task.title} jako hotový`);
  checkbox.setAttribute("aria-pressed", String(task.completed));
  checkbox.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m3.5 8 3 3 6-6"/></svg>';
  checkbox.addEventListener("click", () => toggleTask(task.id));

  const copy = document.createElement("div");
  copy.className = "task-copy";
  const title = document.createElement("p");
  title.className = "task-title";
  title.textContent = task.title;
  copy.append(title);

  const meta = document.createElement("div");
  meta.className = "task-meta";
  if (task.subject) {
    const subject = document.createElement("span");
    subject.className = "subject-tag";
    subject.textContent = task.subject;
    meta.append(subject);
  }
  if (task.dueDate) {
    const due = document.createElement("span");
    due.className = "task-due";
    due.textContent = formatDueDate(task.dueDate);
    const today = localDateKey(new Date());
    if (!task.completed && task.dueDate < today) due.classList.add("is-overdue");
    else if (!task.completed && task.dueDate === today) due.classList.add("is-today");
    meta.append(due);
  }

  const priorityNames = { low: "Nízká", normal: "Běžná", high: "Vysoká" };
  if (task.priority && task.priority !== "normal") {
    const priority = document.createElement("span");
    priority.className = "priority-tag";
    const dot = document.createElement("i");
    dot.className = `priority-dot ${task.priority}-dot`;
    dot.setAttribute("aria-hidden", "true");
    priority.append(dot, document.createTextNode(priorityNames[task.priority] || "Běžná"));
    meta.append(priority);
  }
  copy.append(meta);

  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "delete-button";
  remove.textContent = "×";
  remove.setAttribute("aria-label", `Smazat úkol ${task.title}`);
  remove.addEventListener("click", () => deleteTask(task.id));

  item.append(checkbox, copy, remove);
  return item;
}

function renderTasks() {
  const visibleTasks = getVisibleTasks();
  taskList.replaceChildren();

  if (visibleTasks.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    const icon = document.createElement("span");
    icon.className = "empty-illustration";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = activeFilter === "completed" ? "✓" : "✎";
    const title = document.createElement("strong");
    const hasSearch = document.getElementById("task-search").value || document.getElementById("subject-filter").value || document.getElementById("priority-filter").value;
    title.textContent = hasSearch ? "Žádné úkoly neodpovídají výběru" : activeFilter === "completed" ? "Zatím žádné hotové úkoly" : activeFilter === "today" ? "Na dnešek nemáš žádný úkol" : activeFilter === "upcoming" ? "Žádné nadcházející úkoly" : "Tvůj seznam je zatím prázdný";
    const description = document.createElement("p");
    description.textContent = activeFilter === "all" ? "Přidej si první úkol a měj své studium pod kontrolou." : "Až se objeví nové úkoly, najdeš je právě tady.";
    empty.append(icon, title, description);
    taskList.append(empty);
  } else {
    visibleTasks.forEach((task) => taskList.append(createTaskElement(task)));
  }

  const completedCount = tasks.filter((task) => task.completed).length;
  const todayCount = tasks.filter((task) => !task.completed && task.dueDate === localDateKey(new Date())).length;
  document.getElementById("all-count").textContent = tasks.length;
  document.getElementById("today-count").textContent = todayCount;
  document.getElementById("summary-total").textContent = tasks.length;
  document.getElementById("summary-pending").textContent = tasks.length - completedCount;
  document.getElementById("summary-completed").textContent = completedCount;
  document.getElementById("visible-count").textContent = visibleTasks.length;
  document.getElementById("list-title").childNodes[0].textContent = filterLabels[activeFilter] + " ";
  document.getElementById("breadcrumb-current").textContent = filterLabels[activeFilter];
  renderWeek();
  renderReminder();
}

function toggleTask(id) {
  tasks = tasks.map((task) => task.id === id ? { ...task, completed: !task.completed } : task);
  saveTasks();
  renderTasks();
}

function deleteTask(id) {
  tasks = tasks.filter((task) => task.id !== id);
  saveTasks();
  renderTasks();
}

function deleteScheduleEntry(id) {
  schedule = schedule.filter((entry) => entry.id !== id);
  saveSchedule();
  renderTasks();
}

function isValidBackupTask(task) {
  if (!task || typeof task.id !== "string" || typeof task.title !== "string" ||
      task.title.trim().length === 0 || task.title.length > 120 || typeof task.completed !== "boolean") {
    return false;
  }
  if (task.subject !== undefined && (typeof task.subject !== "string" || task.subject.length > 60)) return false;
  if (task.dueDate !== undefined && task.dueDate !== "") {
    if (typeof task.dueDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(task.dueDate)) return false;
    const date = new Date(`${task.dueDate}T00:00:00`);
    if (Number.isNaN(date.getTime()) || localDateKey(date) !== task.dueDate) return false;
  }
  if (task.priority !== undefined && !["low", "normal", "high"].includes(task.priority)) return false;
  return task.createdAt === undefined || (typeof task.createdAt === "number" && Number.isFinite(task.createdAt));
}

function parseBackup(data) {
  if (!data || data.format !== "gjak-planner-backup" || data.version !== 1 ||
      !Array.isArray(data.tasks) || !Array.isArray(data.schedule)) {
    throw new TypeError("Soubor není platná záloha školního plánovače.");
  }
  if (!data.tasks.every(isValidBackupTask) || !data.schedule.every(isValidScheduleEntry)) {
    throw new TypeError("Záloha obsahuje poškozený nebo neplatný úkol či hodinu.");
  }
  return {
    tasks: data.tasks.map((task) => ({
      id: task.id,
      title: task.title.trim(),
      subject: task.subject || "",
      dueDate: task.dueDate || "",
      priority: task.priority || "normal",
      completed: task.completed,
      createdAt: task.createdAt || 0
    })),
    schedule: data.schedule.map((entry) => ({
      id: entry.id,
      weekday: entry.weekday,
      start: entry.start,
      end: entry.end,
      subject: entry.subject.trim(),
      room: entry.room || ""
    }))
  };
}

function exportBackup() {
  try {
    const backup = {
      format: "gjak-planner-backup",
      version: 1,
      exportedAt: new Date().toISOString(),
      tasks,
      schedule
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `skolni-planovac-zaloha-${localDateKey(new Date())}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast("Záloha úkolů a rozvrhu byla stažena.");
  } catch (error) {
    console.error("Export zálohy selhal:", error);
    showToast("Zálohu se nepodařilo vytvořit.");
  }
}

function saveImportedBackup(backup) {
  try {
    const previousTasks = localStorage.getItem(STORAGE_KEY);
    const previousSchedule = localStorage.getItem(SCHEDULE_STORAGE_KEY);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(backup.tasks));
      localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(backup.schedule));
    } catch (error) {
      try {
        if (previousTasks === null) localStorage.removeItem(STORAGE_KEY);
        else localStorage.setItem(STORAGE_KEY, previousTasks);
        if (previousSchedule === null) localStorage.removeItem(SCHEDULE_STORAGE_KEY);
        else localStorage.setItem(SCHEDULE_STORAGE_KEY, previousSchedule);
      } catch (restoreError) {
        console.error("Obnovení původních dat po chybě importu selhalo:", restoreError);
      }
      throw error;
    }
    return true;
  } catch (error) {
    console.error("Uložení importované zálohy selhalo:", error);
    showToast("Zálohu se nepodařilo uložit. Zkontroluj dostupné úložiště.");
    return false;
  }
}

async function importBackup(file) {
  try {
    const backup = parseBackup(JSON.parse(await file.text()));
    const taskCountLabel = backup.tasks.length === 1 ? "úkol" : backup.tasks.length >= 2 && backup.tasks.length <= 4 ? "úkoly" : "úkolů";
    const lessonCountLabel = backup.schedule.length === 1 ? "hodinu" : backup.schedule.length >= 2 && backup.schedule.length <= 4 ? "hodiny" : "hodin";
    if (!window.confirm(`Obnovit ${backup.tasks.length} ${taskCountLabel} a ${backup.schedule.length} ${lessonCountLabel}? Stávající data se nahradí.`)) return;
    if (!saveImportedBackup(backup)) return;
    tasks = backup.tasks;
    schedule = backup.schedule;
    renderTasks();
    showToast("Záloha úkolů a rozvrhu byla obnovena.");
  } catch (error) {
    console.error("Import zálohy selhal:", error);
    showToast(error instanceof SyntaxError ? "Soubor neobsahuje platný JSON." : error.message || "Zálohu se nepodařilo načíst.");
  }
}

taskForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(taskForm);
  const title = String(formData.get("title") || "").trim();
  if (!title) {
    taskTitleInput.focus();
    return;
  }
  const task = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    title,
    subject: String(formData.get("subject") || ""),
    dueDate: String(formData.get("dueDate") || ""),
    priority: String(formData.get("priority") || "normal"),
    completed: false,
    createdAt: Date.now()
  };
  tasks.push(task);
  saveTasks();
  taskForm.reset();
  renderTasks();
  taskTitleInput.focus();
});

scheduleForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(scheduleForm);
  const start = String(formData.get("start") || "");
  const end = String(formData.get("end") || "");
  const subject = String(formData.get("subject") || "").trim();
  if (!subject || end <= start) {
    showToast("Zkontroluj předmět a čas hodiny. Konec musí být po začátku.");
    return;
  }
  schedule.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    weekday: Number(formData.get("weekday")),
    start,
    end,
    subject,
    room: String(formData.get("room") || "").trim()
  });
  saveSchedule();
  scheduleForm.reset();
  renderTasks();
});

document.querySelectorAll(".nav-link").forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    document.querySelectorAll(".nav-link").forEach((navButton) => navButton.classList.toggle("is-active", navButton === button));
    renderTasks();
  });
});

document.getElementById("sort-select").addEventListener("change", renderTasks);
document.getElementById("task-search").addEventListener("input", renderTasks);
document.getElementById("subject-filter").addEventListener("change", renderTasks);
document.getElementById("priority-filter").addEventListener("change", renderTasks);
document.getElementById("week-previous").addEventListener("click", () => {
  weekOffset -= 1;
  renderWeek();
});
document.getElementById("week-next").addEventListener("click", () => {
  weekOffset += 1;
  renderWeek();
});
document.getElementById("week-current").addEventListener("click", () => {
  weekOffset = 0;
  renderWeek();
});
document.getElementById("export-data").addEventListener("click", exportBackup);
const importFileInput = document.getElementById("import-data-file");
document.getElementById("import-data").addEventListener("click", () => importFileInput.click());
importFileInput.addEventListener("change", async (event) => {
  const input = event.currentTarget;
  const file = input.files && input.files[0];
  if (file) await importBackup(file);
  input.value = "";
});
updateDateHeading();
renderTasks();

if ("serviceWorker" in navigator && window.isSecureContext) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch((error) => {
      console.error("Registrace offline režimu selhala:", error);
      showToast("Offline režim se nepodařilo připravit. Aplikace zůstává dostupná online.");
    });
  });
}
