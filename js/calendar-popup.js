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

let taskModal = null;


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


  return [
    ...tasks,
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
   HTML SAFETY
========================================================= */

function escapeHTML(value = "") {

  return String(value)
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
              item.itemType === "task"
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


  const tasks =
    items.filter(
      item =>
        item.itemType === "task"
    );


  summary.textContent =
    `${tasks.length} task${
      tasks.length === 1 ? "" : "s"
    } • ${tasks.length} task${
      tasks.length === 1 ? "" : "s"
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
          Add an task or task for this day.
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
    ${!isTask ? "calendar-editable-task" : ""}
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
                      : "bi-calendar-task"
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
    ".calendar-editable-task"
  )
  .forEach(element => {

    element.addEventListener(
      "click",
      () => {

        const id =
          element.dataset.itemId;


        const task =
          storeReference.data.tasks.find(
            item =>
              item.id === id
          );


        if (task) {

          openExistingEvent(task);

        }

      }
    );

  });

}


/* =========================================================
   EVENT FORM
========================================================= */
async function saveEvent(task) {

  task.prtaskDefault();

  const error =
    document.getElementById(
      "taskError"
    );

  error.textContent = "";


  /* =====================================================
     GET FORM VALUES
  ===================================================== */

  const title =
    document.getElementById(
      "taskTitle"
    ).value.trim();


  const date =
    document.getElementById(
      "taskDate"
    ).value;


  const startTime =
    document.getElementById(
      "taskStart"
    ).value;


  const endTime =
    document.getElementById(
      "taskEnd"
    ).value;


  const allDay =
    document.getElementById(
      "taskAllDay"
    ).checked;


  const category =
    document.getElementById(
      "taskCategory"
    ).value;


  const notes =
    document.getElementById(
      "taskNotes"
    ).value.trim();


  const existingId =
    document.getElementById(
      "taskId"
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
   * when this is NOT an all-day task.
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
      ? storeReference.data.tasks.find(
          item =>
            item.id === existingId
        )
      : null;


  /*
   * If an ID exists but we cannot find
   * the task locally, stop instead of
   * accidentally creating a duplicate.
   */

  if (
    existingId &&
    !existingEvent
  ) {

    console.error(
      "Unable to find task:",
      existingId
    );

    error.textContent =
      "Unable to find this task. Refresh the page and try again.";

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
     * All-day tasks should not retain
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
     * is processing to prtask duplicate
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
      "tasks",
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

    taskModal.hide();


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
      "Unable to save task:",
      saveError
    );


    error.textContent =
      saveError?.code ===
      "permission-denied"
        ? "Firebase denied permission to save this task."
        : "Unable to save task. Please try again.";


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
   UPDATE EVENT TIME FIELDS
========================================================= */

function updateEventTimeFields() {

  const allDayCheckbox =
    document.getElementById(
      "taskAllDay"
    );


  const timeFields =
    document.getElementById(
      "taskTimeFields"
    );


  const startInput =
    document.getElementById(
      "taskStart"
    );


  const endInput =
    document.getElementById(
      "taskEnd"
    );


  if (
    !allDayCheckbox ||
    !timeFields ||
    !startInput ||
    !endInput
  ) {

    return;

  }


  const isAllDay =
    allDayCheckbox.checked;


  /* SHOW / HIDE TIME SECTION */

  timeFields.classList.toggle(
    "d-none",
    isAllDay
  );


  /* ENABLE / DISABLE INPUTS */

  startInput.disabled =
    isAllDay;


  endInput.disabled =
    isAllDay;


  /*
   * Remove times when switching
   * an task to All Day.
   */

  if (isAllDay) {

    startInput.value = "";

    endInput.value = "";

  }

}


/* =========================================================
   OPEN NEW EVENT MODAL
========================================================= */

function opentaskModal() {

  const form =
    document.getElementById(
      "taskForm"
    );

  const taskId =
    document.getElementById(
      "taskId"
    );

  const taskDate =
    document.getElementById(
      "taskDate"
    );

  const taskError =
    document.getElementById(
      "taskError"
    );

  const modalLabel =
    document.getElementById(
      "taskModalLabel"
    );

  const saveButton =
    document.getElementById(
      "saveEventBtn"
    );

  const deleteButton =
    document.getElementById(
      "deleteEventBtn"
    );


  /* RESET FORM */

  form.reset();


  /* CLEAR EXISTING EVENT ID */

  taskId.value = "";


  /* USE CURRENTLY SELECTED CALENDAR DATE */

  taskDate.value =
    toISO(selectedDate);


  /* CLEAR OLD ERROR */

  taskError.textContent = "";


  /* SET CREATE MODE */

  modalLabel.textContent =
    "Add Event";


  saveButton.innerHTML = `
    <i
      class="bi bi-plus-lg"
      aria-hidden="true"
    ></i>

    Add Event
  `;


  /* HIDE DELETE FOR NEW EVENTS */

  deleteButton.classList.add(
    "d-none"
  );


  /* ENABLE SAVE BUTTON */

  saveButton.disabled = false;


  /* UPDATE ALL-DAY / TIME FIELD STATE */

  updateEventTimeFields();


  /* SHOW MODAL */

  taskModal.show();


  /* FOCUS TITLE AFTER MODAL OPENS */

  const modalElement =
    document.getElementById(
      "taskModal"
    );


  modalElement.addEventListener(
    "shown.bs.modal",
    () => {

      document.getElementById(
        "taskTitle"
      ).focus();

    },
    {
      once: true
    }
  );

}

/* =========================================================
   INITIALIZATION
========================================================= */

export function initCalendarPopup(store) {

  /* =====================================================
     STORE
  ===================================================== */

  storeReference = store;


  /*
   * Make sure tasks always exists.
   */

  if (
    !Array.isArray(
      storeReference.data.tasks
    )
  ) {

    storeReference.data.tasks = [];

  }


  /* =====================================================
     MODALS
  ===================================================== */

  const calendarModalElement =
    document.getElementById(
      "calendarModal"
    );


  const taskModalElement =
    document.getElementById(
      "taskModal"
    );


  if (
    !calendarModalElement ||
    !taskModalElement
  ) {

    console.error(
      "Calendar or task modal was not found."
    );

    return;

  }


  calendarModal =
    bootstrap.Modal.getOrCreateInstance(
      calendarModalElement
    );


  taskModal =
    bootstrap.Modal.getOrCreateInstance(
      taskModalElement
    );


  /* =====================================================
     ALL-DAY EVENT CONTROLS
  ===================================================== */

  const allDayCheckbox =
    document.getElementById(
      "taskAllDay"
    );


  if (allDayCheckbox) {

    allDayCheckbox.addEventListener(
      "change",
      updateEventTimeFields
    );

  }


  /* =====================================================
     FULL CALENDAR BUTTON
  ===================================================== */

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


  /* =====================================================
     SIDEBAR CALENDAR BUTTON
  ===================================================== */

  document
    .querySelectorAll(
      '[data-view="calendar"]'
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        task => {

          task.prtaskDefault();


          selectedDate =
            new Date();


          visibleDate =
            new Date();


          renderCalendar();


          calendarModal.show();

        }
      );

    });


  /* =====================================================
     PREVIOUS MONTH
  ===================================================== */

  const previousMonthButton =
    document.getElementById(
      "calendarPrevMonth"
    );


  if (previousMonthButton) {

    previousMonthButton.addEventListener(
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

  }


  /* =====================================================
     NEXT MONTH
  ===================================================== */

  const nextMonthButton =
    document.getElementById(
      "calendarNextMonth"
    );


  if (nextMonthButton) {

    nextMonthButton.addEventListener(
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

  }


  /* =====================================================
     TODAY
  ===================================================== */

  const todayButton =
    document.getElementById(
      "calendarTodayBtn"
    );


  if (todayButton) {

    todayButton.addEventListener(
      "click",
      () => {

        selectedDate =
          new Date();


        visibleDate =
          new Date();


        renderCalendar();

      }
    );

  }


  /* =====================================================
     ADD EVENT BUTTON
  ===================================================== */

  const addEventButton =
    document.getElementById(
      "addCalendarEventBtn"
    );


  if (addEventButton) {

    addEventButton.addEventListener(
      "click",
      opentaskModal
    );

  }


  /* =====================================================
     ADD EVENT FOR SELECTED DAY
  ===================================================== */

  const addForDayButton =
    document.getElementById(
      "calendarAddForDay"
    );


  if (addForDayButton) {

    addForDayButton.addEventListener(
      "click",
      opentaskModal
    );

  }


  /* =====================================================
     EVENT FORM SUBMISSION
  ===================================================== */

  const taskForm =
    document.getElementById(
      "taskForm"
    );


  if (taskForm) {

    taskForm.addEventListener(
      "submit",
      saveEvent
    );

  }


  /* =====================================================
     DELETE EVENT
  ===================================================== */

  const deleteEventButton =
    document.getElementById(
      "deleteEventBtn"
    );


  if (deleteEventButton) {

    deleteEventButton.addEventListener(
      "click",
      () => {

        const id =
          document.getElementById(
            "taskId"
          ).value;


        if (!id) {

          return;

        }


        const existingEvent =
          storeReference.data.tasks.find(
            item =>
              item.id === id
          );


        if (!existingEvent) {

          console.error(
            "Unable to find task:",
            id
          );

          return;

        }


        /*
         * Close edit modal before
         * showing delete confirmation.
         */

        taskModal.hide();


        requestDelete({

          type: "tasks",

          id:
            existingEvent.id,

          title:
            existingEvent.title,

          afterDelete: () => {

            renderCalendar();

          }

        });

      }
    );

  }


  /* =====================================================
     INITIAL TIME FIELD STATE
  ===================================================== */

  updateEventTimeFields();

}


/* =========================================================
   OPEN EXISTING EVENT
========================================================= */

function openExistingEvent(task) {

  if (!task) {

    console.error(
      "No task supplied to openExistingEvent()."
    );

    return;

  }


  const form =
    document.getElementById(
      "taskForm"
    );


  const taskId =
    document.getElementById(
      "taskId"
    );


  const taskTitle =
    document.getElementById(
      "taskTitle"
    );


  const taskDate =
    document.getElementById(
      "taskDate"
    );


  const taskStart =
    document.getElementById(
      "taskStart"
    );


  const taskEnd =
    document.getElementById(
      "taskEnd"
    );


  const taskCategory =
    document.getElementById(
      "taskCategory"
    );


  const taskNotes =
    document.getElementById(
      "taskNotes"
    );


  const taskAllDay =
    document.getElementById(
      "taskAllDay"
    );


  const modalLabel =
    document.getElementById(
      "taskModalLabel"
    );


  const saveButton =
    document.getElementById(
      "saveEventBtn"
    );


  const deleteButton =
    document.getElementById(
      "deleteEventBtn"
    );


  const error =
    document.getElementById(
      "taskError"
    );


  /* =====================================================
     RESET OLD FORM STATE
  ===================================================== */

  form.reset();


  error.textContent = "";


  /* =====================================================
     LOAD EVENT DATA
  ===================================================== */

  taskId.value =
    task.id;


  taskTitle.value =
    task.title || "";


  taskDate.value =
    task.date || "";


  taskStart.value =
    task.startTime || "";


  taskEnd.value =
    task.endTime || "";


  taskCategory.value =
    task.category || "Personal";


  taskNotes.value =
    task.notes || "";


  taskAllDay.checked =
    Boolean(
      task.allDay
    );


  /* =====================================================
     EDIT MODE
  ===================================================== */

  modalLabel.textContent =
    "Edit Event";


  saveButton.innerHTML = `
    <i
      class="bi bi-check2"
      aria-hidden="true"
    ></i>

    Update Event
  `;


  saveButton.disabled = false;


  /* =====================================================
     SHOW DELETE BUTTON
  ===================================================== */

  deleteButton.classList.remove(
    "d-none"
  );


  /* =====================================================
     UPDATE ALL-DAY / TIME FIELDS
  ===================================================== */

  updateEventTimeFields();


  /* =====================================================
     SHOW MODAL
  ===================================================== */

  taskModal.show();


  /* =====================================================
     FOCUS TITLE
  ===================================================== */

  const modalElement =
    document.getElementById(
      "taskModal"
    );


  modalElement.addEventListener(
    "shown.bs.modal",
    () => {

      taskTitle.focus();

      taskTitle.select();

    },
    {
      once: true
    }
  );

}





