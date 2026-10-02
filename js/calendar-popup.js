import {
  requestDelete
} from "./delete-manager.js";

// =========================================================
// CALENDAR POPUP
// =========================================================

let storeReference = null;

let visibleDate = new Date();

let selectedDate = new Date();

let calendarModal = null;

let eventModal = null;


/* =========================================================
   DATE UTILITIES
========================================================= */

function toISO(date) {

  const year = date.getFullYear();

  const month =
    String(date.getMonth() + 1).padStart(2, "0");

  const day =
    String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;

}


function parseLocalDate(value) {

  const [year, month, day] =
    value.split("-").map(Number);

  return new Date(
    year,
    month - 1,
    day
  );

}


function formatMonth(date) {

  return new Intl.DateTimeFormat(
    "en-US",
    {
      month: "long",
      year: "numeric"
    }
  ).format(date);

}


function formatFullDate(date) {

  return new Intl.DateTimeFormat(
    "en-US",
    {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric"
    }
  ).format(date);

}


function formatTime(time) {

  if (!time) {
    return "All day";
  }

  const [hour, minute] =
    time.split(":").map(Number);

  const date = new Date();

  date.setHours(
    hour,
    minute,
    0,
    0
  );

  return new Intl.DateTimeFormat(
    "en-US",
    {
      hour: "numeric",
      minute: "2-digit"
    }
  ).format(date);

}


/* =========================================================
   GET DAY DATA
========================================================= */

function getItemsForDate(date) {

  const iso = toISO(date);

  const tasks =
    (storeReference.data.tasks || [])
      .filter(
        task =>
          task.date === iso
      )
      .map(task => ({
        ...task,
        itemType: "task"
      }));


  const events =
    (storeReference.data.events || [])
      .filter(
        event =>
          event.date === iso
      )
      .map(event => ({
        ...event,
        itemType: "event"
      }));


  return [
    ...events,
    ...tasks
  ].sort((a, b) => {

    const timeA =
      a.startTime ||
      a.time ||
      "23:59";

    const timeB =
      b.startTime ||
      b.time ||
      "23:59";

    return timeA.localeCompare(timeB);

  });

}


/* =========================================================
   RENDER MONTH
========================================================= */

export function renderCalendar() {

  const grid =
    document.getElementById(
      "calendarGrid"
    );

  const monthTitle =
    document.getElementById(
      "calendarMonthTitle"
    );

  if (!grid) {
    return;
  }


  monthTitle.textContent =
    formatMonth(visibleDate);


  grid.innerHTML = "";


  const year =
    visibleDate.getFullYear();

  const month =
    visibleDate.getMonth();


  const firstOfMonth =
    new Date(
      year,
      month,
      1
    );


  const startDate =
    new Date(
      year,
      month,
      1 - firstOfMonth.getDay()
    );


  const todayISO =
    toISO(new Date());

  const selectedISO =
    toISO(selectedDate);


  for (
    let index = 0;
    index < 42;
    index++
  ) {

    const date =
      new Date(startDate);

    date.setDate(
      startDate.getDate() + index
    );


    const iso =
      toISO(date);


    const items =
      getItemsForDate(date);


    const cell =
      document.createElement("button");


    cell.type = "button";

    cell.className =
      "calendar-day-cell";


    if (
      date.getMonth() !== month
    ) {

      cell.classList.add(
        "other-month"
      );

    }


    if (
      iso === todayISO
    ) {

      cell.classList.add(
        "today"
      );

    }


    if (
      iso === selectedISO
    ) {

      cell.classList.add(
        "selected"
      );

    }


    const previewItems =
      items.slice(0, 3);


    cell.innerHTML = `

      <span class="calendar-day-number">
        ${date.getDate()}
      </span>

      <div class="calendar-cell-items">

        ${previewItems
          .map(item => {

            const doneClass =
              item.completed
                ? "task-done"
                : "";

            const icon =
              item.itemType === "event"
                ? "•"
                : "✓";

            return `

              <div
                class="
                  calendar-cell-item
                  ${doneClass}
                "
              >

                ${icon}
                ${escapeHTML(
                  item.title
                )}

              </div>

            `;

          })
          .join("")}

        ${
          items.length > 3
            ? `
              <div
                class="calendar-more-count"
              >
                +${items.length - 3} more
              </div>
            `
            : ""
        }

      </div>

    `;


    cell.addEventListener(
      "click",
      () => {

        selectedDate =
          new Date(date);


        if (
          selectedDate.getMonth() !==
          visibleDate.getMonth()
        ) {

          visibleDate =
            new Date(
              selectedDate.getFullYear(),
              selectedDate.getMonth(),
              1
            );

        }


        renderCalendar();

        renderSelectedDay();

      }
    );


    grid.appendChild(cell);

  }


  renderSelectedDay();

}


/* =========================================================
   SELECTED DAY
========================================================= */

function renderSelectedDay() {

  const title =
    document.getElementById(
      "calendarSelectedDate"
    );

  const summary =
    document.getElementById(
      "calendarSelectedSummary"
    );

  const container =
    document.getElementById(
      "calendarDayItems"
    );


  if (!container) {
    return;
  }


  const items =
    getItemsForDate(
      selectedDate
    );


  title.textContent =
    formatFullDate(
      selectedDate
    );


  const tasks =
    items.filter(
      item =>
        item.itemType === "task"
    );


  const events =
    items.filter(
      item =>
        item.itemType === "event"
    );


  summary.textContent =
    `${tasks.length} task${
      tasks.length === 1 ? "" : "s"
    } • ${events.length} event${
      events.length === 1 ? "" : "s"
    }`;


  /* PROGRESS */

  const completed =
    tasks.filter(
      task => task.completed
    ).length;


  const percent =
    tasks.length
      ? Math.round(
          completed /
          tasks.length *
          100
        )
      : 0;


  document.getElementById(
    "calendarDayPercent"
  ).textContent =
    `${percent}%`;


  document.getElementById(
    "calendarDayProgressBar"
  ).style.width =
    `${percent}%`;


  /* EMPTY */

  if (!items.length) {

    container.innerHTML = `

      <div
        class="calendar-day-empty"
      >

        <i class="bi bi-calendar2-plus"></i>

        <div>
          Nothing scheduled.
        </div>

        <small>
          Add an event or task for this day.
        </small>

      </div>

    `;

    return;

  }


  container.innerHTML =
    items
      .map(item => {

        const isTask =
          item.itemType === "task";


        const time =
          isTask
            ? formatTime(item.time)
            : (
                item.allDay
                  ? "All day"
                  : `${formatTime(
                      item.startTime
                    )}${
                      item.endTime
                        ? ` – ${formatTime(
                            item.endTime
                          )}`
                        : ""
                    }`
              );


        return `

<div
  class="
    calendar-day-item
    ${item.completed ? "done" : ""}
    ${!isTask ? "calendar-editable-event" : ""}
  "
  data-item-id="${item.id}"
  data-item-type="${item.itemType}"
>

            <div
              class="calendar-day-item-icon"
            >

              <i
                class="
                  bi
                  ${
                    isTask
                      ? "bi-check2-square"
                      : "bi-calendar-event"
                  }
                "
              ></i>

            </div>


            <div
              class="calendar-day-item-content"
            >

              <p
                class="calendar-day-item-title"
              >
                ${escapeHTML(
                  item.title
                )}
              </p>

              <div
                class="calendar-day-item-meta"
              >

                ${time}

                •

                ${
                  item.category ||
                  (
                    isTask
                      ? "Task"
                      : "Event"
                  )
                }

              </div>

            </div>


            <span
              class="
                badge
                rounded-pill
                text-bg-dark
              "
            >

              ${
                isTask
                  ? "Task"
                  : "Event"
              }

            </span>

          </div>

        `;

      })
      .join("");

      container
  .querySelectorAll(
    ".calendar-editable-event"
  )
  .forEach(element => {

    element.addEventListener(
      "click",
      () => {

        const id =
          element.dataset.itemId;


        const event =
          storeReference.data.events.find(
            item =>
              item.id === id
          );


        if (event) {

          openExistingEvent(event);

        }

      }
    );

  });

}


/* =========================================================
   EVENT FORM
========================================================= */
async function saveEvent(event) {

  event.preventDefault();

  const error =
    document.getElementById(
      "eventError"
    );

  error.textContent = "";


  /* =====================================================
     GET FORM VALUES
  ===================================================== */

  const title =
    document.getElementById(
      "eventTitle"
    ).value.trim();


  const date =
    document.getElementById(
      "eventDate"
    ).value;


  const startTime =
    document.getElementById(
      "eventStart"
    ).value;


  const endTime =
    document.getElementById(
      "eventEnd"
    ).value;


  const allDay =
    document.getElementById(
      "eventAllDay"
    ).checked;


  const category =
    document.getElementById(
      "eventCategory"
    ).value;


  const notes =
    document.getElementById(
      "eventNotes"
    ).value.trim();


  const existingId =
    document.getElementById(
      "eventId"
    ).value;


  /* =====================================================
     VALIDATION
  ===================================================== */

  if (!title || !date) {

    error.textContent =
      "Event title and date are required.";

    return;

  }


  /*
   * Only validate start/end times
   * when this is NOT an all-day event.
   */

  if (
    !allDay &&
    startTime &&
    endTime &&
    endTime <= startTime
  ) {

    error.textContent =
      "End time must be later than start time.";

    return;

  }


  /* =====================================================
     FIND EXISTING EVENT
  ===================================================== */

  const existingEvent =
    existingId
      ? storeReference.data.events.find(
          item =>
            item.id === existingId
        )
      : null;


  /*
   * If an ID exists but we cannot find
   * the event locally, stop instead of
   * accidentally creating a duplicate.
   */

  if (
    existingId &&
    !existingEvent
  ) {

    console.error(
      "Unable to find event:",
      existingId
    );

    error.textContent =
      "Unable to find this event. Refresh the page and try again.";

    return;

  }


  /* =====================================================
     BUILD EVENT
  ===================================================== */

  const now =
    new Date().toISOString();


  const item = {

    /*
     * Preserve existing fields.
     *
     * This becomes important later when
     * we add reminders and recurrence.
     */

    ...existingEvent,


    id:
      existingId ||
      crypto.randomUUID(),


    title,

    date,


    /*
     * All-day events should not retain
     * old start/end times.
     */

    startTime:
      allDay
        ? ""
        : startTime,


    endTime:
      allDay
        ? ""
        : endTime,


    allDay,

    category,

    notes,


    createdAt:
      existingEvent?.createdAt ||
      now,


    updatedAt:
      now

  };


  /* =====================================================
     SAVE TO FIRESTORE
  ===================================================== */

  try {

    /*
     * Disable save button while Firestore
     * is processing to prevent duplicate
     * submissions.
     */

    const saveButton =
      document.getElementById(
        "saveEventBtn"
      );


    const originalButtonHTML =
      saveButton?.innerHTML;


    if (saveButton) {

      saveButton.disabled = true;

      saveButton.innerHTML = `

        <span
          class="spinner-border spinner-border-sm me-1"
          aria-hidden="true"
        ></span>

        Saving...

      `;

    }


    await storeReference.upsert(
      "events",
      item
    );


    /* ===================================================
       UPDATE SELECTED CALENDAR DATE
    =================================================== */

    selectedDate =
      parseLocalDate(date);


    visibleDate =
      new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        1
      );


    /* ===================================================
       CLOSE EVENT MODAL
    =================================================== */

    eventModal.hide();


    /* ===================================================
       REFRESH CALENDAR
    =================================================== */

    renderCalendar();


    console.info(
      existingEvent
        ? `Event updated: ${item.id}`
        : `Event created: ${item.id}`
    );


    /* ===================================================
       RESTORE BUTTON
    =================================================== */

    if (saveButton) {

      saveButton.disabled = false;

      saveButton.innerHTML =
        originalButtonHTML;

    }


  } catch (saveError) {

    console.error(
      "Unable to save event:",
      saveError
    );


    error.textContent =
      saveError?.code ===
      "permission-denied"
        ? "Firebase denied permission to save this event."
        : "Unable to save event. Please try again.";


    /*
     * Restore save button if saving failed.
     */

    const saveButton =
      document.getElementById(
        "saveEventBtn"
      );


    if (saveButton) {

      saveButton.disabled = false;

      saveButton.innerHTML = `

        <i class="bi bi-check2"></i>

        ${
          existingEvent
            ? "Update Event"
            : "Save Event"
        }

      `;

    }

  }

}
/* =========================================================
   OPEN EVENT MODAL
========================================================= */

function openEventModal() {

  document.getElementById(
    "eventForm"
  ).reset();


  document.getElementById(
    "eventId"
  ).value = "";


  document.getElementById(
    "eventDate"
  ).value =
    toISO(selectedDate);


  document.getElementById(
    "eventError"
  ).textContent = "";


  document.getElementById(
    "eventModalLabel"
  ).textContent =
    "Add Event";


  document.getElementById(
    "saveEventBtn"
  ).innerHTML = `

    <i class="bi bi-plus-lg"></i>
    Add Event

  `;


  document.getElementById(
    "deleteEventBtn"
  ).classList.add(
    "d-none"
  );


  eventModal.show();

}


/* =========================================================
   HTML SAFETY
========================================================= */

function escapeHTML(value = "") {

  return value
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );

}


/* =========================================================
   INITIALIZATION
========================================================= */

export function initCalendarPopup(store) {

  storeReference = store;
const openCalendarBtn =
  document.getElementById(
    "openCalendarBtn"
  );

if (openCalendarBtn) {

  openCalendarBtn.addEventListener(
    "click",
    () => {

      renderCalendar();

      calendarModal.show();

    }
  );

}

  if (
    !Array.isArray(
      storeReference.data.events
    )
  ) {

    storeReference.data.events = [];

  }


  calendarModal =
    new bootstrap.Modal(
      document.getElementById(
        "calendarModal"
      )
    );


  eventModal =
    new bootstrap.Modal(
      document.getElementById(
        "eventModal"
      )
    );


  /* SIDEBAR CALENDAR BUTTON */

  document
    .querySelectorAll(
      '[data-view="calendar"]'
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        event => {

          event.preventDefault();

          selectedDate =
            new Date();

          visibleDate =
            new Date();

          renderCalendar();

          calendarModal.show();

        }
      );

    });


  /* PREVIOUS MONTH */

  document.getElementById(
    "calendarPrevMonth"
  ).addEventListener(
    "click",
    () => {

      visibleDate =
        new Date(
          visibleDate.getFullYear(),
          visibleDate.getMonth() - 1,
          1
        );

      renderCalendar();

    }
  );


  /* NEXT MONTH */

  document.getElementById(
    "calendarNextMonth"
  ).addEventListener(
    "click",
    () => {

      visibleDate =
        new Date(
          visibleDate.getFullYear(),
          visibleDate.getMonth() + 1,
          1
        );

      renderCalendar();

    }
  );


  /* TODAY */

  document.getElementById(
    "calendarTodayBtn"
  ).addEventListener(
    "click",
    () => {

      selectedDate =
        new Date();

      visibleDate =
        new Date();

      renderCalendar();

    }
  );


  /* ADD EVENT */

  document.getElementById(
    "addCalendarEventBtn"
  ).addEventListener(
    "click",
    openEventModal
  );


  document.getElementById(
    "calendarAddForDay"
  ).addEventListener(
    "click",
    openEventModal
  );


  document.getElementById(
    "eventForm"
  ).addEventListener(
    "submit",
    saveEvent
  );


  document
  .getElementById(
    "deleteEventBtn"
  )
  .addEventListener(
    "click",
    () => {

      const id =
        document.getElementById(
          "eventId"
        ).value;


      if (!id) {
        return;
      }


      const event =
        storeReference.data.events.find(
          item =>
            item.id === id
        );


      if (!event) {
        return;
      }


      eventModal.hide();


      requestDelete({

        type: "events",

        id: event.id,

        title: event.title,

        afterDelete: () => {

          renderCalendar();

        }

      });

    }
  );
  
}

function openExistingEvent(event) {

  document.getElementById(
    "eventForm"
  ).reset();


  document.getElementById(
    "eventId"
  ).value =
    event.id;


  document.getElementById(
    "eventTitle"
  ).value =
    event.title || "";


  document.getElementById(
    "eventDate"
  ).value =
    event.date || "";


  document.getElementById(
    "eventStart"
  ).value =
    event.startTime || "";


  document.getElementById(
    "eventEnd"
  ).value =
    event.endTime || "";


  document.getElementById(
    "eventCategory"
  ).value =
    event.category || "Personal";


  document.getElementById(
    "eventNotes"
  ).value =
    event.notes || "";


  document.getElementById(
    "eventAllDay"
  ).checked =
    Boolean(event.allDay);


  document.getElementById(
    "eventModalLabel"
  ).textContent =
    "Edit Event";


  document.getElementById(
    "saveEventBtn"
  ).innerHTML = `

    <i class="bi bi-check2"></i>
    Update Event

  `;


  document.getElementById(
    "deleteEventBtn"
  ).classList.remove(
    "d-none"
  );


  eventModal.show();

}