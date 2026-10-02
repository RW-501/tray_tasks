import { requestDelete } from "./delete-manager.js";

let storeReference = null;
let visibleDate = new Date();
let selectedDate = new Date();
let calendarModal = null;
let eventModal = null;
let reopenCalendarAfterEvent = false;

function toISO(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseLocalDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatMonth(date) {
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(date);
}

function formatFullDate(date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

function formatTime(time) {
  if (!time) return "All day";
  const [hour, minute] = time.split(":").map(Number);
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(date);
}

function escapeHTML(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getItemsForDate(date) {
  const dateISO = toISO(date);

  const tasks = (storeReference?.data.tasks || [])
    .filter((task) => task.date === dateISO)
    .map((task) => ({ ...task, itemType: "task" }));

  const events = (storeReference?.data.events || [])
    .filter((event) => event.date === dateISO)
    .map((event) => ({ ...event, itemType: "event" }));

  return [...tasks, ...events].sort((a, b) => {
    const timeA = a.startTime || "23:59";
    const timeB = b.startTime || "23:59";
    if (a.allDay && !b.allDay) return -1;
    if (!a.allDay && b.allDay) return 1;
    return timeA.localeCompare(timeB);
  });
}

export function renderCalendar() {
  const grid = document.getElementById("calendarGrid");
  const monthTitle = document.getElementById("calendarMonthTitle");
  if (!grid || !monthTitle || !storeReference) return;

  monthTitle.textContent = formatMonth(visibleDate);
  grid.innerHTML = "";

  const year = visibleDate.getFullYear();
  const month = visibleDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startDate = new Date(year, month, 1 - firstOfMonth.getDay());
  const todayISO = toISO(new Date());
  const selectedISO = toISO(selectedDate);

  for (let index = 0; index < 42; index += 1) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    const dateISO = toISO(date);
    const items = getItemsForDate(date);

    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "calendar-day-cell";
    if (date.getMonth() !== month) cell.classList.add("other-month");
    if (dateISO === todayISO) cell.classList.add("today");
    if (dateISO === selectedISO) cell.classList.add("selected");

    const previewItems = items.slice(0, 3);
    cell.innerHTML = `
      <span class="calendar-day-number">${date.getDate()}</span>
      <div class="calendar-cell-items">
        ${previewItems.map((item) => `
          <div class="calendar-cell-item ${item.completed ? "task-done" : ""}">
            <span class="calendar-item-dot ${item.itemType}"></span>
            ${escapeHTML(item.title)}
          </div>
        `).join("")}
        ${items.length > 3 ? `<div class="calendar-more-count">+${items.length - 3} more</div>` : ""}
      </div>
    `;

    cell.addEventListener("click", () => {
      selectedDate = new Date(date);
      if (selectedDate.getMonth() !== visibleDate.getMonth()) {
        visibleDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
      }
      renderCalendar();
    });

    grid.appendChild(cell);
  }

  renderSelectedDay();
}

function renderSelectedDay() {
  const title = document.getElementById("calendarSelectedDate");
  const summary = document.getElementById("calendarSelectedSummary");
  const container = document.getElementById("calendarDayItems");
  const percentElement = document.getElementById("calendarDayPercent");
  const progressBar = document.getElementById("calendarDayProgressBar");
  if (!title || !summary || !container) return;

  const items = getItemsForDate(selectedDate);
  const tasks = items.filter((item) => item.itemType === "task");
  const events = items.filter((item) => item.itemType === "event");
  const completed = tasks.filter((task) => task.completed).length;
  const percent = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;

  title.textContent = formatFullDate(selectedDate);
  summary.textContent = `${tasks.length} task${tasks.length === 1 ? "" : "s"} • ${events.length} event${events.length === 1 ? "" : "s"}`;
  if (percentElement) percentElement.textContent = `${percent}%`;
  if (progressBar) progressBar.style.width = `${percent}%`;

  if (!items.length) {
    container.innerHTML = `
      <div class="calendar-day-empty">
        <i class="bi bi-calendar2-plus"></i>
        <div>Nothing scheduled.</div>
        <small>Add a task or event for this day.</small>
      </div>
    `;
    return;
  }

  container.innerHTML = items.map((item) => {
    const isTask = item.itemType === "task";
    const time = isTask
      ? (item.startTime ? formatTime(item.startTime) : "No time")
      : (item.allDay ? "All day" : `${formatTime(item.startTime)}${item.endTime ? ` – ${formatTime(item.endTime)}` : ""}`);

    return `
      <button
        type="button"
        class="calendar-day-item ${item.completed ? "done" : ""} calendar-editable-item"
        data-item-id="${item.id}"
        data-item-type="${item.itemType}"
      >
        <div class="calendar-day-item-icon">
          <i class="bi ${isTask ? "bi-check2-square" : "bi-calendar-event"}"></i>
        </div>
        <div class="calendar-day-item-content">
          <p class="calendar-day-item-title">${escapeHTML(item.title)}</p>
          <div class="calendar-day-item-meta">${escapeHTML(time)} • ${escapeHTML(item.category || (isTask ? "Task" : "Event"))}</div>
        </div>
        <span class="badge rounded-pill text-bg-dark">${isTask ? "Task" : "Event"}</span>
      </button>
    `;
  }).join("");

  container.querySelectorAll(".calendar-editable-item").forEach((element) => {
    element.addEventListener("click", () => {
      const id = element.dataset.itemId;
      if (element.dataset.itemType === "event") {
        const event = (storeReference.data.events || []).find((item) => item.id === id);
        if (event) openEventEditor(event);
      } else {
        closeCalendarThen(() => {
          window.dispatchEvent(new CustomEvent("calendar:edit-task", { detail: { id } }));
        });
      }
    });
  });
}

function updateEventTimeFields() {
  const checkbox = document.getElementById("eventAllDay");
  const timeFields = document.getElementById("eventTimeFields");
  const start = document.getElementById("eventStart");
  const end = document.getElementById("eventEnd");
  if (!checkbox || !timeFields || !start || !end) return;

  const isAllDay = checkbox.checked;
  timeFields.classList.toggle("d-none", isAllDay);
  start.disabled = isAllDay;
  end.disabled = isAllDay;
  if (isAllDay) {
    start.value = "";
    end.value = "";
  }
}

function resetEventForm() {
  document.getElementById("eventForm")?.reset();
  document.getElementById("eventId").value = "";
  document.getElementById("eventDate").value = toISO(selectedDate);
  document.getElementById("eventError").textContent = "";
  document.getElementById("eventModalLabel").textContent = "Add Event";
  document.getElementById("deleteEventBtn")?.classList.add("d-none");
  const saveButton = document.getElementById("saveEventBtn");
  if (saveButton) saveButton.innerHTML = `<i class="bi bi-plus-lg"></i> Add Event`;
  updateEventTimeFields();
}

function fillEventForm(event) {
  document.getElementById("eventId").value = event.id || "";
  document.getElementById("eventTitle").value = event.title || "";
  document.getElementById("eventDate").value = event.date || toISO(selectedDate);
  document.getElementById("eventStart").value = event.startTime || "";
  document.getElementById("eventEnd").value = event.endTime || "";
  document.getElementById("eventAllDay").checked = Boolean(event.allDay);
  document.getElementById("eventCategory").value = event.category || "Personal";
  document.getElementById("eventNotes").value = event.notes || "";
  document.getElementById("eventError").textContent = "";
  document.getElementById("eventModalLabel").textContent = "Edit Event";
  document.getElementById("deleteEventBtn")?.classList.remove("d-none");
  const saveButton = document.getElementById("saveEventBtn");
  if (saveButton) saveButton.innerHTML = `<i class="bi bi-check2"></i> Update Event`;
  updateEventTimeFields();
}

function calendarIsOpen() {
  return document.getElementById("calendarModal")?.classList.contains("show");
}

function closeCalendarThen(callback) {
  const element = document.getElementById("calendarModal");
  if (!element || !calendarIsOpen()) {
    callback();
    return;
  }
  element.addEventListener("hidden.bs.modal", callback, { once: true });
  calendarModal.hide();
}

function showEventModal() {
  if (!eventModal) return;
  reopenCalendarAfterEvent = calendarIsOpen();

  if (reopenCalendarAfterEvent) {
    closeCalendarThen(() => eventModal.show());
  } else {
    eventModal.show();
  }
}

function openNewEvent() {
  resetEventForm();
  showEventModal();
}

function openEventEditor(event) {
  if (!event) return;
  fillEventForm(event);
  showEventModal();
}

async function saveEvent(event) {
  event.preventDefault();

  const errorElement = document.getElementById("eventError");
  errorElement.textContent = "";

  const title = document.getElementById("eventTitle").value.trim();
  const date = document.getElementById("eventDate").value;
  const startTime = document.getElementById("eventStart").value;
  const endTime = document.getElementById("eventEnd").value;
  const allDay = document.getElementById("eventAllDay").checked;
  const category = document.getElementById("eventCategory").value;
  const notes = document.getElementById("eventNotes").value.trim();
  const existingId = document.getElementById("eventId").value;

  if (!title || !date) {
    errorElement.textContent = "Event title and date are required.";
    return;
  }

  if (!allDay && startTime && endTime && endTime <= startTime) {
    errorElement.textContent = "End time must be later than start time.";
    return;
  }

  const existing = existingId
    ? (storeReference.data.events || []).find((item) => item.id === existingId)
    : null;

  if (existingId && !existing) {
    errorElement.textContent = "Unable to find this event. Refresh and try again.";
    return;
  }

  const now = new Date().toISOString();
  const item = {
    ...existing,
    id: existingId || crypto.randomUUID(),
    title,
    date,
    startTime: allDay ? "" : startTime,
    endTime: allDay ? "" : endTime,
    allDay,
    category,
    notes,
    createdAt: existing?.createdAt || now,
    updatedAt: now
  };

  const saveButton = document.getElementById("saveEventBtn");
  const oldHTML = saveButton?.innerHTML;
  if (saveButton) {
    saveButton.disabled = true;
    saveButton.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> Saving...`;
  }

  try {
    await storeReference.upsert("events", item);
    selectedDate = parseLocalDate(date);
    visibleDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    renderCalendar();
    eventModal.hide();
  } catch (saveError) {
    console.error("Unable to save event:", saveError);
    errorElement.textContent = saveError?.code === "permission-denied"
      ? "Firebase denied permission to save this event."
      : "Unable to save event. Please try again.";
  } finally {
    if (saveButton) {
      saveButton.disabled = false;
      saveButton.innerHTML = oldHTML || `<i class="bi bi-check2"></i> Save Event`;
    }
  }
}

function deleteCurrentEvent() {
  const id = document.getElementById("eventId")?.value;
  if (!id) return;

  const event = (storeReference.data.events || []).find((item) => item.id === id);
  if (!event) return;

  reopenCalendarAfterEvent = false;

  const eventElement = document.getElementById("eventModal");
  const askForDelete = () => requestDelete({
    type: "events",
    id: event.id,
    title: event.title,
    afterDelete: () => {
      renderCalendar();
      calendarModal.show();
    }
  });

  if (eventElement?.classList.contains("show")) {
    eventElement.addEventListener("hidden.bs.modal", askForDelete, { once: true });
    eventModal.hide();
  } else {
    askForDelete();
  }
}

export function initCalendarPopup(store) {
  storeReference = store;
  if (!Array.isArray(storeReference.data.tasks)) storeReference.data.tasks = [];
  if (!Array.isArray(storeReference.data.events)) storeReference.data.events = [];

  const calendarElement = document.getElementById("calendarModal");
  const eventElement = document.getElementById("eventModal");
  if (!calendarElement || !eventElement) {
    console.error("Calendar modal or event modal was not found.");
    return;
  }

  calendarModal = bootstrap.Modal.getOrCreateInstance(calendarElement);
  eventModal = bootstrap.Modal.getOrCreateInstance(eventElement);

  document.getElementById("openCalendarBtn")?.addEventListener("click", () => {
    renderCalendar();
    calendarModal.show();
  });

  document.querySelectorAll('[data-view="calendar"]').forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      selectedDate = new Date();
      visibleDate = new Date();
      renderCalendar();
      calendarModal.show();
    });
  });

  document.getElementById("calendarPrevMonth")?.addEventListener("click", () => {
    visibleDate = new Date(visibleDate.getFullYear(), visibleDate.getMonth() - 1, 1);
    renderCalendar();
  });

  document.getElementById("calendarNextMonth")?.addEventListener("click", () => {
    visibleDate = new Date(visibleDate.getFullYear(), visibleDate.getMonth() + 1, 1);
    renderCalendar();
  });

  document.getElementById("calendarTodayBtn")?.addEventListener("click", () => {
    selectedDate = new Date();
    visibleDate = new Date();
    renderCalendar();
  });

  document.getElementById("addCalendarEventBtn")?.addEventListener("click", openNewEvent);
  document.getElementById("calendarAddEventForDay")?.addEventListener("click", openNewEvent);

  document.getElementById("calendarAddTaskForDay")?.addEventListener("click", () => {
    const date = toISO(selectedDate);
    closeCalendarThen(() => {
      window.dispatchEvent(new CustomEvent("calendar:add-task", { detail: { date } }));
    });
  });

  document.getElementById("eventAllDay")?.addEventListener("change", updateEventTimeFields);
  document.getElementById("eventForm")?.addEventListener("submit", saveEvent);
  document.getElementById("deleteEventBtn")?.addEventListener("click", deleteCurrentEvent);

  eventElement.addEventListener("hidden.bs.modal", () => {
    if (reopenCalendarAfterEvent) {
      reopenCalendarAfterEvent = false;
      renderCalendar();
      calendarModal.show();
    }
  });

  updateEventTimeFields();
}
