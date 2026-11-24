"use strict";

const STORAGE_KEY = "gjak-school-planner-tasks-v1";
const THEME_STORAGE_KEY = "gjak-school-planner-theme-v1";
const taskList = document.getElementById("task-list");
const taskForm = document.getElementById("task-form");
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
  document.querySelector('meta[name="theme-color"]').setAttribute("content", isDark ? "#0a0d0b" : "#f1f3eb");
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
  const visible = tasks.filter((task) => {
    if (activeFilter === "today") return !task.completed && task.dueDate === today;
    if (activeFilter === "upcoming") return !task.completed && task.dueDate && task.dueDate > today;
    if (activeFilter === "completed") return task.completed;
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
    title.textContent = activeFilter === "completed" ? "Zatím žádné hotové úkoly" : activeFilter === "today" ? "Na dnešek nemáš žádný úkol" : activeFilter === "upcoming" ? "Žádné nadcházející úkoly" : "Tvůj seznam je zatím prázdný";
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

document.querySelectorAll(".nav-link").forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    document.querySelectorAll(".nav-link").forEach((navButton) => navButton.classList.toggle("is-active", navButton === button));
    renderTasks();
  });
});

document.getElementById("sort-select").addEventListener("change", renderTasks);
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
