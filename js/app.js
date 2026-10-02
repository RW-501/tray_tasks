import { store } from "./store.js";
import { initCalendarPopup } from "./calendar-popup.js";
import { initDeleteManager, requestDelete } from "./delete-manager.js";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const state = {
  selectedDate: new Date(),
  filter: "all",
  search: ""
};

const ITEM_CONFIG = {
  note: {
    collection: "notes",
    singular: "Note",
    titleLabel: "Title",
    titlePlaceholder: "Capture an idea...",
    showDetails: true,
    detailsLabel: "Note",
    detailsPlaceholder: "Write the full note here...",
    showDate: false,
    showFrequency: false,
    showQuantity: false,
    checkable: false
  },
  habit: {
    collection: "habits",
    singular: "Habit",
    titleLabel: "Habit",
    titlePlaceholder: "Drink water, work out, read...",
    showDetails: true,
    detailsLabel: "Notes",
    detailsPlaceholder: "Optional habit notes...",
    showDate: false,
    showFrequency: true,
    showQuantity: false,
    checkable: true
  },
  goal: {
    collection: "goals",
    singular: "Goal",
    titleLabel: "Goal",
    titlePlaceholder: "What do you want to accomplish?",
    showDetails: true,
    detailsLabel: "Details",
    detailsPlaceholder: "Add milestones, context, or next steps...",
    showDate: true,
    showFrequency: false,
    showQuantity: false,
    checkable: true
  },
  shopping: {
    collection: "shopping",
    singular: "Shopping Item",
    titleLabel: "Item",
    titlePlaceholder: "What do you need to buy?",
    showDetails: true,
    detailsLabel: "Store / notes",
    detailsPlaceholder: "Brand, store, size, link, or notes...",
    showDate: false,
    showFrequency: false,
    showQuantity: true,
    checkable: true
  }
};

const pad = (value) => String(value).padStart(2, "0");
const iso = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const selectedISO = () => iso(state.selectedDate);
const dateFromISO = (value) => new Date(`${value}T12:00:00`);
const uid = () => crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;

function esc(value = "") {
  return String(value).replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  })[character]);
}

function setText(selector, value) {
  const element = $(selector);
  if (element) element.textContent = value;
}

function setValue(selector, value) {
  const element = $(selector);
  if (element) element.value = value ?? "";
}

function toast(message) {
  const element = $("#toast");
  if (!element) {
    console.info(message);
    return;
  }
  element.textContent = message;
  element.classList.add("show");
  window.setTimeout(() => element.classList.remove("show"), 1800);
}

function startOfWeek(date) {
  const result = new Date(date);
  result.setHours(12, 0, 0, 0);
  result.setDate(result.getDate() - ((result.getDay() + 6) % 7));
  return result;
}

function formatTime(value) {
  if (!value) return "";
  let [hours, minutes] = value.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${hours}:${pad(minutes)} ${period}`;
}

function mins(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  return `${hours % 12 || 12}:${pad(minutes)} ${hours >= 12 ? "PM" : "AM"}`;
}

function tasksForDate() {
  return (store.data.tasks || []).filter((task) => task.date === selectedISO());
}

function filteredTasks() {
  return tasksForDate()
    .filter((task) => {
      const priority = String(task.priority || "").toLowerCase();
      const matchesFilter =
        state.filter === "all" ||
        (state.filter === "completed" ? Boolean(task.completed) : priority === state.filter);
      const haystack = `${task.title || ""} ${task.category || ""} ${task.notes || ""}`.toLowerCase();
      const matchesSearch = !state.search || haystack.includes(state.search);
      return matchesFilter && matchesSearch;
    })
    .sort((a, b) => {
      const completed = Number(Boolean(a.completed)) - Number(Boolean(b.completed));
      if (completed) return completed;
      return (a.startTime || "99:99").localeCompare(b.startTime || "99:99");
    });
}

function render() {
  renderHeader();
  renderWeek();
  renderTasks();
  renderTimeline();
  renderSide();
  renderUniversalLists();
}

function renderHeader() {
  const date = state.selectedDate;
  setText("#pageTitle", date.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" }));
  setText("#focusDate", date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }));
  setText("#syncText", store.mode === "firebase" ? "Firebase connected" : "Local demo mode");
  $("#syncDot")?.classList.toggle("online", store.mode === "firebase");
}

function renderWeek() {
  const container = $("#weekStrip");
  if (!container) return;

  const start = startOfWeek(state.selectedDate);
  container.innerHTML = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const dateISO = iso(date);
    const tasks = (store.data.tasks || []).filter((task) => task.date === dateISO);
    const done = tasks.filter((task) => task.completed).length;
    const percent = tasks.length ? (done / tasks.length) * 100 : 0;

    return `
      <button class="day-card ${dateISO === selectedISO() ? "selected" : ""}" data-date="${dateISO}" type="button">
        <strong>${date.toLocaleDateString(undefined, { weekday: "short" }).toUpperCase()}</strong>
        <span>${date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
        <span>${done}/${tasks.length} done</span>
        <div class="day-progress"><i style="width:${percent}%"></i></div>
      </button>
    `;
  }).join("");

  $$(".day-card").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedDate = dateFromISO(button.dataset.date);
      render();
    });
  });
}

function renderTasks() {
  const container = $("#taskList");
  if (!container) return;

  const all = tasksForDate();
  const list = filteredTasks();

  setText("#countAll", all.length);
  setText("#countHigh", all.filter((task) => task.priority === "High").length);
  setText("#countMedium", all.filter((task) => task.priority === "Medium").length);
  setText("#countLow", all.filter((task) => task.priority === "Low").length);
  setText("#countDone", all.filter((task) => task.completed).length);

  container.innerHTML = list.map((task) => {
    const priority = String(task.priority || "Medium");
    return `
      <div class="task-row" data-id="${task.id}">
        <input class="task-check" type="checkbox" ${task.completed ? "checked" : ""} aria-label="Complete ${esc(task.title)}">
        <span class="task-title ${task.completed ? "done" : ""}" title="${esc(task.title)}">${esc(task.title)}</span>
        <span class="badge-soft priority-${priority.toLowerCase()}">${esc(priority)}</span>
        <span class="badge-soft category">${esc(task.category || "Personal")}</span>
        <button class="task-menu" type="button" aria-label="Edit ${esc(task.title)}"><i class="bi bi-three-dots-vertical"></i></button>
      </div>
    `;
  }).join("");

  $("#emptyTasks")?.classList.toggle("d-none", list.length > 0);

  $$(".task-row").forEach((row) => {
    const task = (store.data.tasks || []).find((item) => item.id === row.dataset.id);
    if (!task) return;

    row.querySelector(".task-check")?.addEventListener("change", async (event) => {
      const previous = Boolean(task.completed);
      task.completed = event.target.checked;
      task.updatedAt = Date.now();
      try {
        await store.upsert("tasks", task);
        render();
        toast(task.completed ? "Task completed" : "Task reopened");
      } catch (error) {
        console.error("Unable to update task:", error);
        task.completed = previous;
        event.target.checked = previous;
        toast("Unable to update task");
      }
    });

    row.querySelector(".task-menu")?.addEventListener("click", (event) => {
      event.stopPropagation();
      openTaskModal(task);
    });
  });
}

function renderTimeline() {
  const timeline = $("#timeline");
  if (!timeline) return;

  const tasks = tasksForDate()
    .filter((task) => task.startTime && !task.completed)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  if (!tasks.length) {
    timeline.innerHTML = `<div class="empty-state"><i class="bi bi-calendar2-check"></i><p>No scheduled tasks for this day.</p></div>`;
    return;
  }

  timeline.innerHTML = tasks.map((task) => `
    <button class="time-block timeline-task" type="button" data-task-id="${task.id}">
      <div class="time-label">${formatTime(task.startTime)}</div>
      <div class="event ${String(task.priority || "Medium").toLowerCase()}">
        <strong>${esc(task.title)}</strong><br>
        <small>${task.estimatedMinutes || 30} min · ${esc(task.category || "Task")}</small>
      </div>
    </button>
  `).join("");

  $$(".timeline-task").forEach((button) => {
    button.addEventListener("click", () => {
      const task = (store.data.tasks || []).find((item) => item.id === button.dataset.taskId);
      if (task) openTaskModal(task);
    });
  });
}

function renderSide() {
  const weekStart = startOfWeek(state.selectedDate);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const tasks = (store.data.tasks || []).filter((task) => {
    if (!task.date) return false;
    const date = dateFromISO(task.date);
    return date >= weekStart && date < weekEnd;
  });

  const done = tasks.filter((task) => task.completed).length;
  const percent = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  setText("#progressPercent", `${percent}%`);
  if ($("#progressBar")) $("#progressBar").style.width = `${percent}%`;
  setText("#doneStat", done);
  setText("#openStat", tasks.length - done);
  setText("#highStat", tasks.filter((task) => task.priority === "High" && !task.completed).length);
}

function itemSubtitle(type, item) {
  if (type === "goal" && item.targetDate) return `Target ${item.targetDate}`;
  if (type === "habit" && item.frequency) return item.frequency;
  if (type === "shopping" && item.quantity) return `Qty ${item.quantity}`;
  if (type === "note" && item.details) return item.details;
  if (item.details) return item.details;
  return "";
}

function renderUniversalList(type, selector) {
  const config = ITEM_CONFIG[type];
  const container = $(selector);
  if (!config || !container) return;

  const items = store.data[config.collection] || [];

  if (!items.length) {
    container.innerHTML = `<div class="empty-state compact-empty"><p>No ${config.singular.toLowerCase()}s yet.</p></div>`;
    return;
  }

  container.innerHTML = items.map((item) => {
    const subtitle = itemSubtitle(type, item);
    return `
      <div class="simple-item universal-item ${item.completed ? "is-complete" : ""}" data-item-type="${type}" data-item-id="${item.id}">
        ${config.checkable ? `<input class="simple-check" type="checkbox" ${item.completed ? "checked" : ""} aria-label="Complete ${esc(item.title)}">` : `<i class="bi bi-${type === "note" ? "sticky" : "circle"}"></i>`}
        <button class="universal-item-main" type="button" aria-label="Edit ${esc(item.title)}">
          <span class="universal-item-title ${item.completed ? "text-decoration-line-through opacity-50" : ""}">${esc(item.title)}</span>
          ${subtitle ? `<small class="muted universal-item-subtitle">${esc(subtitle)}</small>` : ""}
        </button>
        <button class="mini-edit universal-item-edit" type="button" aria-label="Edit ${esc(item.title)}"><i class="bi bi-pencil"></i></button>
      </div>
    `;
  }).join("");

  container.querySelectorAll(".universal-item").forEach((row) => {
    const item = items.find((entry) => entry.id === row.dataset.itemId);
    if (!item) return;

    row.querySelector(".simple-check")?.addEventListener("change", async (event) => {
      const previous = Boolean(item.completed);
      item.completed = event.target.checked;
      item.updatedAt = Date.now();
      try {
        await store.upsert(config.collection, item);
        renderUniversalLists();
      } catch (error) {
        console.error(`Unable to update ${type}:`, error);
        item.completed = previous;
        event.target.checked = previous;
        toast(`Unable to update ${config.singular.toLowerCase()}`);
      }
    });

    const edit = () => openItemModal(type, item);
    row.querySelector(".universal-item-main")?.addEventListener("click", edit);
    row.querySelector(".universal-item-edit")?.addEventListener("click", edit);
  });
}

function renderUniversalLists() {
  renderUniversalList("goal", "#goalList");
  renderUniversalList("habit", "#habitList");
  renderUniversalList("note", "#notesList");
  renderUniversalList("shopping", "#shoppingList");
}

function resetTaskForm(date = selectedISO()) {
  $("#taskForm")?.reset();
  setValue("#taskId", "");
  setValue("#taskDate", date);
  setValue("#taskDuration", 30);
  setValue("#taskPriority", "Medium");
  setValue("#taskCategory", "Personal");
  setText("#taskModalLabel", "Add Task");
  setText("#taskError", "");
  $("#deleteTaskBtn")?.classList.add("d-none");
  if ($("#saveTaskBtn")) $("#saveTaskBtn").innerHTML = `<i class="bi bi-plus-lg"></i> Add Task`;
}

function openTaskModal(task = null, date = selectedISO()) {
  const modalElement = $("#taskModal");
  if (!modalElement) {
    console.error('Task modal "#taskModal" was not found.');
    return;
  }

  if (!task) {
    resetTaskForm(date);
  } else {
    setValue("#taskId", task.id);
    setValue("#taskTitle", task.title || "");
    setValue("#taskDate", task.date || date);
    setValue("#taskTime", task.startTime || "");
    setValue("#taskDuration", task.estimatedMinutes || 30);
    setValue("#taskPriority", task.priority || "Medium");
    setValue("#taskCategory", task.category || "Personal");
    setValue("#taskNotes", task.notes || "");
    setText("#taskModalLabel", "Edit Task");
    setText("#taskError", "");
    $("#deleteTaskBtn")?.classList.remove("d-none");
    if ($("#saveTaskBtn")) $("#saveTaskBtn").innerHTML = `<i class="bi bi-check2"></i> Update Task`;
  }

  bootstrap.Modal.getOrCreateInstance(modalElement).show();
  modalElement.addEventListener("shown.bs.modal", () => $("#taskTitle")?.focus(), { once: true });
}

async function saveTask(event) {
  event.preventDefault();
  const errorElement = $("#taskError");
  if (errorElement) errorElement.textContent = "";

  const title = $("#taskTitle")?.value.trim();
  const date = $("#taskDate")?.value;
  if (!title || !date) {
    if (errorElement) errorElement.textContent = "Task title and date are required.";
    return;
  }

  const existingId = $("#taskId")?.value || "";
  const existing = existingId ? (store.data.tasks || []).find((task) => task.id === existingId) : null;
  if (existingId && !existing) {
    if (errorElement) errorElement.textContent = "Unable to find this task. Refresh and try again.";
    return;
  }

  const now = Date.now();
  const item = {
    ...existing,
    id: existingId || uid(),
    title,
    date,
    startTime: $("#taskTime")?.value || "",
    estimatedMinutes: Number($("#taskDuration")?.value) || 30,
    priority: $("#taskPriority")?.value || "Medium",
    category: $("#taskCategory")?.value || "Personal",
    notes: $("#taskNotes")?.value.trim() || "",
    completed: existing?.completed || false,
    createdAt: existing?.createdAt || now,
    updatedAt: now
  };

  const saveButton = $("#saveTaskBtn");
  const oldHTML = saveButton?.innerHTML;
  if (saveButton) {
    saveButton.disabled = true;
    saveButton.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> Saving...`;
  }

  try {
    await store.upsert("tasks", item);
    bootstrap.Modal.getInstance($("#taskModal"))?.hide();
    if (item.date === selectedISO()) render();
    else render();
    toast(existing ? "Task updated" : "Task added");
  } catch (error) {
    console.error("Unable to save task:", error);
    if (errorElement) errorElement.textContent = error?.code === "permission-denied" ? "Firebase denied permission to save this task." : "Unable to save task. Please try again.";
  } finally {
    if (saveButton) {
      saveButton.disabled = false;
      saveButton.innerHTML = oldHTML || `<i class="bi bi-check2"></i> Save Task`;
    }
  }
}

function deleteCurrentTask() {
  const id = $("#taskId")?.value;
  if (!id) return;
  const task = (store.data.tasks || []).find((item) => item.id === id);
  if (!task) return;

  const modalElement = $("#taskModal");
  const askForDelete = () => requestDelete({
    type: "tasks",
    id: task.id,
    title: task.title,
    afterDelete: () => {
      render();
      toast("Task deleted");
    }
  });

  if (modalElement?.classList.contains("show")) {
    modalElement.addEventListener("hidden.bs.modal", askForDelete, { once: true });
    bootstrap.Modal.getInstance(modalElement)?.hide();
  } else {
    askForDelete();
  }
}

function configureItemModal(type, item = null) {
  const config = ITEM_CONFIG[type];
  if (!config) return;

  $("#itemForm")?.reset();
  setValue("#itemType", type);
  setValue("#itemId", item?.id || "");
  setValue("#itemTitle", item?.title || "");
  setValue("#itemDetails", item?.details || item?.notes || "");
  setValue("#itemDate", item?.targetDate || "");
  setValue("#itemFrequency", item?.frequency || "Daily");
  setValue("#itemQuantity", item?.quantity || 1);
  setText("#itemError", "");

  setText("#itemModalEyebrow", type.toUpperCase());
  setText("#itemModalLabel", `${item ? "Edit" : "Add"} ${config.singular}`);
  setText("#itemTitleLabel", config.titleLabel);
  setText("#itemDetailsLabel", config.detailsLabel);
  $("#itemTitle")?.setAttribute("placeholder", config.titlePlaceholder);
  $("#itemDetails")?.setAttribute("placeholder", config.detailsPlaceholder);

  $("#itemDetailsGroup")?.classList.toggle("d-none", !config.showDetails);
  $("#itemDateGroup")?.classList.toggle("d-none", !config.showDate);
  $("#itemFrequencyGroup")?.classList.toggle("d-none", !config.showFrequency);
  $("#itemQuantityGroup")?.classList.toggle("d-none", !config.showQuantity);
  $("#deleteItemBtn")?.classList.toggle("d-none", !item);

  if ($("#saveItemBtn")) {
    $("#saveItemBtn").innerHTML = item
      ? `<i class="bi bi-check2"></i> Update ${config.singular}`
      : `<i class="bi bi-plus-lg"></i> Add ${config.singular}`;
  }
}

function openItemModal(type, item = null) {
  const modalElement = $("#itemModal");
  if (!modalElement || !ITEM_CONFIG[type]) return;
  configureItemModal(type, item);
  bootstrap.Modal.getOrCreateInstance(modalElement).show();
  modalElement.addEventListener("shown.bs.modal", () => $("#itemTitle")?.focus(), { once: true });
}

async function saveUniversalItem(event) {
  event.preventDefault();
  const type = $("#itemType")?.value;
  const config = ITEM_CONFIG[type];
  if (!config) return;

  const errorElement = $("#itemError");
  if (errorElement) errorElement.textContent = "";

  const title = $("#itemTitle")?.value.trim();
  if (!title) {
    if (errorElement) errorElement.textContent = `${config.singular} title is required.`;
    return;
  }

  const id = $("#itemId")?.value || "";
  const items = store.data[config.collection] || [];
  const existing = id ? items.find((item) => item.id === id) : null;
  if (id && !existing) {
    if (errorElement) errorElement.textContent = `Unable to find this ${config.singular.toLowerCase()}. Refresh and try again.`;
    return;
  }

  const now = Date.now();
  const item = {
    ...existing,
    id: id || uid(),
    title,
    details: $("#itemDetails")?.value.trim() || "",
    targetDate: config.showDate ? ($("#itemDate")?.value || "") : (existing?.targetDate || ""),
    frequency: config.showFrequency ? ($("#itemFrequency")?.value || "Daily") : (existing?.frequency || ""),
    quantity: config.showQuantity ? Math.max(1, Number($("#itemQuantity")?.value) || 1) : (existing?.quantity || null),
    completed: config.checkable ? Boolean(existing?.completed) : false,
    createdAt: existing?.createdAt || now,
    updatedAt: now
  };

  const saveButton = $("#saveItemBtn");
  const oldHTML = saveButton?.innerHTML;
  if (saveButton) {
    saveButton.disabled = true;
    saveButton.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> Saving...`;
  }

  try {
    await store.upsert(config.collection, item);
    bootstrap.Modal.getInstance($("#itemModal"))?.hide();
    renderUniversalLists();
    toast(existing ? `${config.singular} updated` : `${config.singular} added`);
  } catch (error) {
    console.error(`Unable to save ${type}:`, error);
    if (errorElement) errorElement.textContent = `Unable to save this ${config.singular.toLowerCase()}. Please try again.`;
  } finally {
    if (saveButton) {
      saveButton.disabled = false;
      saveButton.innerHTML = oldHTML || `<i class="bi bi-check2"></i> Save`;
    }
  }
}

function deleteUniversalItem() {
  const type = $("#itemType")?.value;
  const config = ITEM_CONFIG[type];
  const id = $("#itemId")?.value;
  if (!config || !id) return;

  const item = (store.data[config.collection] || []).find((entry) => entry.id === id);
  if (!item) return;

  const modalElement = $("#itemModal");
  const askForDelete = () => requestDelete({
    type: config.collection,
    id: item.id,
    title: item.title,
    afterDelete: () => {
      renderUniversalLists();
      toast(`${config.singular} deleted`);
    }
  });

  if (modalElement?.classList.contains("show")) {
    modalElement.addEventListener("hidden.bs.modal", askForDelete, { once: true });
    bootstrap.Modal.getInstance(modalElement)?.hide();
  } else {
    askForDelete();
  }
}

function buildPlan() {
  const result = $("#aiResult");
  if (!result) return;

  const rank = { High: 0, Medium: 1, Low: 2 };
  const tasks = tasksForDate()
    .filter((task) => !task.completed)
    .sort((a, b) => (rank[a.priority] ?? 99) - (rank[b.priority] ?? 99) || (a.startTime || "99:99").localeCompare(b.startTime || "99:99"));

  if (!tasks.length) {
    result.innerHTML = `<div class="ai-step">Everything for this day is complete.</div>`;
    return;
  }

  let cursor = 8 * 60 + 30;
  result.innerHTML = tasks.slice(0, 8).map((task) => {
    if (task.startTime) {
      const [hours, minutes] = task.startTime.split(":").map(Number);
      cursor = Math.max(cursor, hours * 60 + minutes);
    }
    const start = cursor;
    cursor += (Number(task.estimatedMinutes) || 30) + 10;
    return `<div class="ai-step"><strong>${mins(start)}</strong> — ${esc(task.title)} <span class="muted">(${esc(task.priority || "Medium")})</span></div>`;
  }).join("");
}

function bind() {
  $("#mobileMenu")?.addEventListener("click", () => $(".sidebar")?.classList.toggle("open"));

  $("#todayBtn")?.addEventListener("click", () => {
    state.selectedDate = new Date();
    render();
  });

  $("#prevDay")?.addEventListener("click", () => {
    const date = new Date(state.selectedDate);
    date.setDate(date.getDate() - 1);
    state.selectedDate = date;
    render();
  });

  $("#nextDay")?.addEventListener("click", () => {
    const date = new Date(state.selectedDate);
    date.setDate(date.getDate() + 1);
    state.selectedDate = date;
    render();
  });

  $("#globalSearch")?.addEventListener("input", (event) => {
    state.search = event.target.value.trim().toLowerCase();
    renderTasks();
  });

  $$(".filter").forEach((button) => {
    button.addEventListener("click", () => {
      $$(".filter").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      state.filter = button.dataset.filter;
      renderTasks();
    });
  });

  $$('[data-open-task]').forEach((button) => {
    button.addEventListener("click", () => openTaskModal(null, selectedISO()));
  });

  $$('[data-add]').forEach((button) => {
    button.addEventListener("click", () => openItemModal(button.dataset.add));
  });

  $("#quickNoteBtn")?.addEventListener("click", () => openItemModal("note"));
  $("#planDayBtn")?.addEventListener("click", buildPlan);
  $("#taskForm")?.addEventListener("submit", saveTask);
  $("#deleteTaskBtn")?.addEventListener("click", deleteCurrentTask);
  $("#itemForm")?.addEventListener("submit", saveUniversalItem);
  $("#deleteItemBtn")?.addEventListener("click", deleteUniversalItem);

  window.addEventListener("calendar:add-task", (event) => {
    const date = event.detail?.date || selectedISO();
    openTaskModal(null, date);
  });

  window.addEventListener("calendar:edit-task", (event) => {
    const task = (store.data.tasks || []).find((item) => item.id === event.detail?.id);
    if (task) openTaskModal(task, task.date);
  });
}

async function init() {
  try {
    await store.init();

    ["tasks", "events", "goals", "habits", "notes", "shopping"].forEach((collection) => {
      if (!Array.isArray(store.data[collection])) store.data[collection] = [];
    });

    initDeleteManager(store);
    initCalendarPopup(store);
    bind();
    resetTaskForm();
    render();
  } catch (error) {
    console.error("Unable to initialize application:", error);
    toast("The application could not be initialized. Check the console.");
  }
}

init();
