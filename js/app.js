/* =========================================================
   IMPORTS
========================================================= */

import {
  store
} from "./store.js";

import {
  initCalendarPopup
} from "./calendar-popup.js";

import {
  initDeleteManager,
  requestDelete
} from "./delete-manager.js";


/* =========================================================
   DOM HELPERS
========================================================= */

const $ =
  selector =>
    document.querySelector(selector);


const $$ =
  selector =>
    [
      ...document.querySelectorAll(
        selector
      )
    ];


/* =========================================================
   APP STATE
========================================================= */

const state = {

  selectedDate:
    new Date(),

  filter:
    "all",

  search:
    ""

};


/* =========================================================
   GENERAL UTILITIES
========================================================= */

const pad =
  number =>
    String(number)
      .padStart(
        2,
        "0"
      );


function iso(date) {

  return [
    date.getFullYear(),
    pad(
      date.getMonth() + 1
    ),
    pad(
      date.getDate()
    )
  ].join("-");

}


function dateFromISO(value) {

  return new Date(
    `${value}T12:00:00`
  );

}


function uid() {

  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {

    return crypto.randomUUID();

  }


  return (
    `${Date.now()}-${Math.random()
      .toString(16)
      .slice(2)}`
  );

}


/* =========================================================
   HTML SAFETY
========================================================= */

function esc(value = "") {

  return String(value)
    .replace(
      /[&<>'"]/g,
      character => ({

        "&":
          "&amp;",

        "<":
          "&lt;",

        ">":
          "&gt;",

        "'":
          "&#39;",

        '"':
          "&quot;"

      })[character]
    );

}


/* =========================================================
   TOAST
========================================================= */

function toast(message) {

  const element =
    $("#toast");


  if (!element) {

    console.info(message);

    return;

  }


  element.textContent =
    message;


  element.classList.add(
    "show"
  );


  setTimeout(
    () => {

      element.classList.remove(
        "show"
      );

    },
    1800
  );

}


/* =========================================================
   DATE HELPERS
========================================================= */

function selectedISO() {

  return iso(
    state.selectedDate
  );

}


function startOfWeek(date) {

  const result =
    new Date(date);


  result.setHours(
    12,
    0,
    0,
    0
  );


  /*
   * Monday = first day of week.
   */

  result.setDate(
    result.getDate() -
    (
      (
        result.getDay() + 6
      ) % 7
    )
  );


  return result;

}


/* =========================================================
   TIME FORMATTING
========================================================= */

function formatTime(value) {

  if (!value) {

    return "";

  }


  let [
    hours,
    minutes
  ] =
    value
      .split(":")
      .map(Number);


  const period =
    hours >= 12
      ? "PM"
      : "AM";


  hours =
    hours % 12 || 12;


  return (
    `${hours}:${pad(minutes)} ${period}`
  );

}


function mins(totalMinutes) {

  const hours =
    Math.floor(
      totalMinutes / 60
    ) % 24;


  const minutes =
    totalMinutes % 60;


  return (
    `${hours % 12 || 12}:` +
    `${pad(minutes)} ` +
    `${hours >= 12 ? "PM" : "AM"}`
  );

}


/* =========================================================
   TASK DATA
========================================================= */

function tasksForDate() {

  return (
    store.data.tasks || []
  ).filter(
    task =>
      task.date ===
      selectedISO()
  );

}


/* =========================================================
   FILTER TASKS
========================================================= */

function filteredTasks() {

  return tasksForDate()

    .filter(task => {

      /* PRIORITY / COMPLETED FILTER */

      let matchesFilter =
        state.filter === "all";


      if (
        state.filter ===
        "completed"
      ) {

        matchesFilter =
          Boolean(
            task.completed
          );

      } else if (
        state.filter !== "all"
      ) {

        matchesFilter =
          String(
            task.priority || ""
          )
            .toLowerCase() ===
          state.filter;

      }


      /* SEARCH */

      const searchableText =
        `
          ${task.title || ""}
          ${task.category || ""}
          ${task.notes || ""}
        `
          .toLowerCase();


      const matchesSearch =
        !state.search ||
        searchableText.includes(
          state.search
        );


      return (
        matchesFilter &&
        matchesSearch
      );

    })

    .sort(
      (a, b) => {

        /* OPEN TASKS FIRST */

        const completedSort =
          Number(
            Boolean(a.completed)
          ) -
          Number(
            Boolean(b.completed)
          );


        if (completedSort) {

          return completedSort;

        }


        /* THEN BY START TIME */

        return (
          a.startTime ||
          "99:99"
        ).localeCompare(
          b.startTime ||
          "99:99"
        );

      }
    );

}


/* =========================================================
   MAIN RENDER
========================================================= */

function render() {

  renderHeader();

  renderWeek();

  renderTasks();

  renderTimeline();

  renderSide();

  renderSimpleLists();

}


/* =========================================================
   HEADER
========================================================= */

function renderHeader() {

  const date =
    state.selectedDate;


  const pageTitle =
    $("#pageTitle");


  const focusDate =
    $("#focusDate");


  const syncText =
    $("#syncText");


  const syncDot =
    $("#syncDot");


  if (pageTitle) {

    pageTitle.textContent =
      date.toLocaleDateString(
        undefined,
        {
          weekday:
            "long",

          month:
            "short",

          day:
            "numeric"
        }
      );

  }


  if (focusDate) {

    focusDate.textContent =
      date.toLocaleDateString(
        undefined,
        {
          weekday:
            "long",

          month:
            "long",

          day:
            "numeric"
        }
      );

  }


  if (syncText) {

    syncText.textContent =
      store.mode === "firebase"
        ? "Firebase connected"
        : "Local demo mode";

  }


  if (syncDot) {

    syncDot.classList.toggle(
      "online",
      store.mode === "firebase"
    );

  }

}


/* =========================================================
   WEEK STRIP
========================================================= */

function renderWeek() {

  const weekStrip =
    $("#weekStrip");


  if (!weekStrip) {

    return;

  }


  const start =
    startOfWeek(
      state.selectedDate
    );


  weekStrip.innerHTML =
    Array.from(
      {
        length: 7
      },
      (_, index) => {

        const date =
          new Date(start);


        date.setDate(
          start.getDate() +
          index
        );


        const dateISO =
          iso(date);


        const tasks =
          (
            store.data.tasks ||
            []
          ).filter(
            task =>
              task.date ===
              dateISO
          );


        const completed =
          tasks.filter(
            task =>
              task.completed
          ).length;


        const percentage =
          tasks.length
            ? (
                completed /
                tasks.length
              ) * 100
            : 0;


        return `

          <button
            class="
              day-card
              ${
                dateISO ===
                selectedISO()
                  ? "selected"
                  : ""
              }
            "
            data-date="${dateISO}"
            type="button"
          >

            <strong>
              ${
                date
                  .toLocaleDateString(
                    undefined,
                    {
                      weekday:
                        "short"
                    }
                  )
                  .toUpperCase()
              }
            </strong>

            <span>
              ${
                date.toLocaleDateString(
                  undefined,
                  {
                    month:
                      "short",

                    day:
                      "numeric"
                  }
                )
              }
            </span>

            <span>
              ${completed}/${tasks.length}
              done
            </span>

            <div class="day-progress">

              <i
                style="
                  width:
                  ${percentage}%
                "
              ></i>

            </div>

          </button>

        `;

      }
    ).join("");


  $$(".day-card")
    .forEach(button => {

      button.onclick =
        () => {

          state.selectedDate =
            dateFromISO(
              button.dataset.date
            );


          render();

        };

    });

}


/* =========================================================
   TASK LIST
========================================================= */

function renderTasks() {

  const taskList =
    $("#taskList");


  if (!taskList) {

    return;

  }


  const all =
    tasksForDate();


  const list =
    filteredTasks();


  /* =====================================================
     COUNTS
  ===================================================== */

  setText(
    "#countAll",
    all.length
  );


  setText(
    "#countHigh",
    all.filter(
      task =>
        task.priority === "High"
    ).length
  );


  setText(
    "#countMedium",
    all.filter(
      task =>
        task.priority === "Medium"
    ).length
  );


  setText(
    "#countLow",
    all.filter(
      task =>
        task.priority === "Low"
    ).length
  );


  setText(
    "#countDone",
    all.filter(
      task =>
        task.completed
    ).length
  );


  /* =====================================================
     TASK HTML
  ===================================================== */

  taskList.innerHTML =
    list
      .map(task => {

        const priority =
          String(
            task.priority ||
            "Medium"
          );


        const category =
          task.category ||
          "Personal";


        return `

          <div
            class="task-row"
            data-id="${task.id}"
          >

            <input
              class="task-check"
              type="checkbox"

              ${
                task.completed
                  ? "checked"
                  : ""
              }

              aria-label="
                Complete
                ${esc(task.title)}
              "
            >


            <span
              class="
                task-title
                ${
                  task.completed
                    ? "done"
                    : ""
                }
              "
              title="${esc(task.title)}"
            >
              ${esc(task.title)}
            </span>


            <span
              class="
                badge-soft
                priority-${
                  priority.toLowerCase()
                }
              "
            >
              ${esc(priority)}
            </span>


            <span
              class="
                badge-soft
                category
              "
            >
              ${esc(category)}
            </span>


            <button
              class="task-menu"
              type="button"
              aria-label="
                Edit
                ${esc(task.title)}
              "
            >

              <i
                class="
                  bi
                  bi-three-dots-vertical
                "
                aria-hidden="true"
              ></i>

            </button>

          </div>

        `;

      })
      .join("");


  /* =====================================================
     EMPTY STATE
  ===================================================== */

  const emptyTasks =
    $("#emptyTasks");


  if (emptyTasks) {

    emptyTasks.classList.toggle(
      "d-none",
      list.length > 0
    );

  }


  /* =====================================================
     TASK EVENTS
  ===================================================== */

  $$(".task-row")
    .forEach(row => {

      const task =
        store.data.tasks.find(
          item =>
            item.id ===
            row.dataset.id
        );


      if (!task) {

        return;

      }


      /* COMPLETE */

      const checkbox =
        row.querySelector(
          ".task-check"
        );


      if (checkbox) {

        checkbox.onchange =
          async task => {

            const previousValue =
              task.completed;


            task.completed =
              task.target.checked;


            task.updatedAt =
              Date.now();


            try {

              await store.upsert(
                "tasks",
                task
              );


              render();


              toast(
                task.completed
                  ? "Task completed"
                  : "Task reopened"
              );


            } catch (error) {

              console.error(
                "Unable to update task:",
                error
              );


              task.completed =
                previousValue;


              task.target.checked =
                previousValue;


              toast(
                "Unable to update task"
              );

            }

          };

      }


      /* EDIT */

      const menuButton =
        row.querySelector(
          ".task-menu"
        );


      if (menuButton) {

        menuButton.onclick =
          task => {

            task.stopPropagation();

            openEdit(task);

          };

      }


      /*
       * Double-clicking a task also
       * opens the editor.
       */

      row.ondblclick =
        task => {

          if (
            task.target.matches(
              "input, button, i"
            )
          ) {

            return;

          }


          openEdit(task);

        };

    });

}


/* =========================================================
   TIMELINE
========================================================= */

function renderTimeline() {

  const timeline =
    $("#timeline");


  /*
   * The dashboard may not contain
   * a timeline on every layout.
   */

  if (!timeline) {

    return;

  }


  const tasks =
    tasksForDate()

      .filter(
        task =>
          task.startTime &&
          !task.completed
      )

      .sort(
        (a, b) =>
          a.startTime.localeCompare(
            b.startTime
          )
      );


  /* =====================================================
     EMPTY
  ===================================================== */

  if (!tasks.length) {

    timeline.innerHTML = `

      <div class="empty-state">

        <i
          class="
            bi
            bi-calendar2-check
          "
          aria-hidden="true"
        ></i>

        <p>
          No scheduled tasks
          for this day.
        </p>

      </div>

    `;


    return;

  }


  /* =====================================================
     TASKS
  ===================================================== */

  timeline.innerHTML =
    tasks
      .map(task => {

        const priority =
          String(
            task.priority ||
            "Medium"
          ).toLowerCase();


        const duration =
          task.estimatedMinutes ||
          30;


        const category =
          task.category ||
          "Task";


        return `

          <div class="time-block">

            <div class="time-label">

              ${formatTime(
                task.startTime
              )}

            </div>


            <button
              type="button"
              class="
                task
                ${priority}
                timeline-task
              "
              data-task-id="${task.id}"
            >

              <strong>
                ${esc(
                  task.title ||
                  "Untitled Task"
                )}
              </strong>

              <br>

              <small>

                ${duration} min

                ·

                ${esc(category)}

              </small>

            </button>

          </div>

        `;

      })
      .join("");


  /* EDIT FROM TIMELINE */

  $$(".timeline-task")
    .forEach(element => {

      element.onclick =
        () => {

          const task =
            store.data.tasks.find(
              item =>
                item.id ===
                element.dataset.taskId
            );


          if (task) {

            openEdit(task);

          }

        };

    });

}


/* =========================================================
   WEEKLY SIDE PANEL
========================================================= */

function renderSide() {

  const weekStart =
    startOfWeek(
      state.selectedDate
    );


  const weekEnd =
    new Date(
      weekStart
    );


  weekEnd.setDate(
    weekEnd.getDate() + 7
  );


  const weeklyTasks =
    (
      store.data.tasks ||
      []
    ).filter(task => {

      if (!task.date) {

        return false;

      }


      const date =
        dateFromISO(
          task.date
        );


      return (
        date >= weekStart &&
        date < weekEnd
      );

    });


  const completed =
    weeklyTasks.filter(
      task =>
        task.completed
    ).length;


  const percentage =
    weeklyTasks.length
      ? Math.round(
          (
            completed /
            weeklyTasks.length
          ) * 100
        )
      : 0;


  setText(
    "#progressPercent",
    `${percentage}%`
  );


  const progressBar =
    $("#progressBar");


  if (progressBar) {

    progressBar.style.width =
      `${percentage}%`;

  }


  setText(
    "#doneStat",
    completed
  );


  setText(
    "#openStat",
    weeklyTasks.length -
    completed
  );


  setText(
    "#highStat",
    weeklyTasks.filter(
      task =>
        task.priority ===
          "High" &&
        !task.completed
    ).length
  );

}


/* =========================================================
   SIMPLE LISTS
========================================================= */

function simple(
  type,
  target
) {

  const container =
    $(target);


  if (!container) {

    return;

  }


  const items =
    store.data[type] ||
    [];


  container.innerHTML =
    items
      .map(item => `

        <label class="simple-item">

          <input
            type="checkbox"
            data-type="${type}"
            data-id="${item.id}"

            ${
              item.completed
                ? "checked"
                : ""
            }
          >

          <span
            class="
              ${
                item.completed
                  ? "text-decoration-line-through opacity-50"
                  : ""
              }
            "
          >
            ${esc(item.title)}
          </span>

        </label>

      `)
      .join("");

}


/* =========================================================
   RENDER SIMPLE LISTS
========================================================= */

function renderSimpleLists() {

  simple(
    "goals",
    "#goalList"
  );


  simple(
    "habits",
    "#habitList"
  );


  simple(
    "shopping",
    "#shoppingList"
  );


  /* NOTES */

  const notesList =
    $("#notesList");


  if (notesList) {

    notesList.innerHTML =
      (
        store.data.notes ||
        []
      )
        .map(note => `

          <div class="note-item">

            <i
              class="bi bi-lightbulb"
              aria-hidden="true"
            ></i>

            <span>
              ${esc(note.title)}
            </span>

          </div>

        `)
        .join("");

  }


  /* CHECKBOXES */

  $$(".simple-item input")
    .forEach(checkbox => {

      checkbox.onchange =
        async () => {

          const type =
            checkbox.dataset.type;


          const item =
            store.data[type]
              ?.find(
                current =>
                  current.id ===
                  checkbox.dataset.id
              );


          if (!item) {

            return;

          }


          const previous =
            item.completed;


          item.completed =
            checkbox.checked;


          try {

            await store.upsert(
              type,
              item
            );


            renderSimpleLists();


          } catch (error) {

            console.error(
              "Unable to update item:",
              error
            );


            item.completed =
              previous;


            checkbox.checked =
              previous;


            toast(
              "Unable to update item"
            );

          }

        };

    });

}


/* =========================================================
   ADD SIMPLE ITEM
========================================================= */

async function addSimple(
  type
) {

  const labels = {

    goal:
      "goal",

    habit:
      "habit",

    note:
      "note",

    shopping:
      "shopping item"

  };


  const title =
    prompt(
      `Add ${labels[type]}:`
    )?.trim();


  if (!title) {

    return;

  }


  const key =
    type === "goal"
      ? "goals"
      : type === "habit"
        ? "habits"
        : type === "note"
          ? "notes"
          : "shopping";


  const item = {

    id:
      uid(),

    title,

    createdAt:
      Date.now(),

    updatedAt:
      Date.now()

  };


  if (
    key !== "notes"
  ) {

    item.completed =
      false;

  }


  try {

    await store.upsert(
      key,
      item
    );


    render();


    toast(
      "Added"
    );


  } catch (error) {

    console.error(
      "Unable to add item:",
      error
    );


    toast(
      "Unable to add item"
    );

  }

}


/* =========================================================
   OPEN TASK EDITOR
========================================================= */

function openEdit(task) {

  if (!task) {

    console.error(
      "No task supplied to openEdit()."
    );

    return;

  }


  /* =====================================================
     LOAD VALUES
  ===================================================== */

  setValue(
    "#taskId",
    task.id
  );


  setValue(
    "#taskTitle",
    task.title || ""
  );


  setValue(
    "#taskDate",
    task.date ||
    selectedISO()
  );


  setValue(
    "#taskTime",
    task.startTime || ""
  );


  setValue(
    "#taskDuration",
    task.estimatedMinutes ||
    30
  );


  setValue(
    "#taskPriority",
    task.priority ||
    "Medium"
  );


  setValue(
    "#taskCategory",
    task.category ||
    "Personal"
  );


  setValue(
    "#taskNotes",
    task.notes || ""
  );


  setText(
    "#taskError",
    ""
  );


  /* =====================================================
     EDIT MODE
  ===================================================== */

  setText(
    "#taskModalLabel",
    "Edit Task"
  );


  const saveButton =
    $("#saveTaskBtn");


  if (saveButton) {

    saveButton.disabled =
      false;


    saveButton.innerHTML = `

      <i
        class="bi bi-check2"
        aria-hidden="true"
      ></i>

      Update Task

    `;

  }


  /* =====================================================
     DELETE
  ===================================================== */

  const deleteButton =
    $("#deleteTaskBtn");


  if (deleteButton) {

    deleteButton.classList.remove(
      "d-none"
    );

  }


  /* =====================================================
     SHOW
  ===================================================== */

  const modalElement =
    $("#taskModal");


  if (!modalElement) {

    console.error(
      'Task modal "#taskModal" not found.'
    );

    return;

  }


  bootstrap.Modal
    .getOrCreateInstance(
      modalElement
    )
    .show();


  modalElement.addEventListener(
    "shown.bs.modal",
    () => {

      const title =
        $("#taskTitle");


      if (title) {

        title.focus();

        title.select();

      }

    },
    {
      once: true
    }
  );

}


/* =========================================================
   RESET TASK FORM
========================================================= */

function resetTaskForm() {

  const form =
    $("#taskForm");


  if (!form) {

    return;

  }


  form.reset();


  setValue(
    "#taskId",
    ""
  );


  setValue(
    "#taskDate",
    selectedISO()
  );


  setValue(
    "#taskDuration",
    30
  );


  setValue(
    "#taskPriority",
    "Medium"
  );


  setValue(
    "#taskCategory",
    "Personal"
  );


  setText(
    "#taskModalLabel",
    "Add Task"
  );


  setText(
    "#taskError",
    ""
  );


  /* SAVE BUTTON */

  const saveButton =
    $("#saveTaskBtn");


  if (saveButton) {

    saveButton.disabled =
      false;


    saveButton.innerHTML = `

      <i
        class="bi bi-plus-lg"
        aria-hidden="true"
      ></i>

      Add Task

    `;

  }


  /* DELETE BUTTON */

  const deleteButton =
    $("#deleteTaskBtn");


  if (deleteButton) {

    deleteButton.classList.add(
      "d-none"
    );

  }

}


/* =========================================================
   SAVE TASK
========================================================= */

async function saveTask(task) {

  task.prtaskDefault();


  const errorElement =
    $("#taskError");


  if (errorElement) {

    errorElement.textContent =
      "";

  }


  /* =====================================================
     TITLE
  ===================================================== */

  const title =
    $("#taskTitle")
      ?.value
      .trim();


  if (!title) {

    if (errorElement) {

      errorElement.textContent =
        "Enter a task title.";

    }


    $("#taskTitle")
      ?.focus();


    return;

  }


  /* =====================================================
     EXISTING TASK
  ===================================================== */

  const existingId =
    $("#taskId")?.value ||
    "";


  const existingTask =
    existingId
      ? store.data.tasks.find(
          task =>
            task.id ===
            existingId
        )
      : null;


  /*
   * If editing, but task disappeared,
   * don't accidentally create another.
   */

  if (
    existingId &&
    !existingTask
  ) {

    if (errorElement) {

      errorElement.textContent =
        "Unable to find this task. Refresh and try again.";

    }


    return;

  }


  /* =====================================================
     BUILD TASK
  ===================================================== */

  const now =
    Date.now();


  const item = {

    /*
     * Preserve fields we may add later:
     * recurrence, reminder, seriesId,
     * parentId, attachments, etc.
     */

    ...existingTask,


    id:
      existingId ||
      uid(),


    title,


    date:
      $("#taskDate")?.value ||
      selectedISO(),


    startTime:
      $("#taskTime")?.value ||
      "",


    estimatedMinutes:
      Number(
        $("#taskDuration")
          ?.value
      ) || 30,


    priority:
      $("#taskPriority")
        ?.value ||
      "Medium",


    category:
      $("#taskCategory")
        ?.value ||
      "Personal",


    notes:
      $("#taskNotes")
        ?.value
        .trim() ||
      "",


    completed:
      existingTask?.completed ||
      false,


    createdAt:
      existingTask?.createdAt ||
      now,


    updatedAt:
      now

  };


  /* =====================================================
     BUTTON LOADING STATE
  ===================================================== */

  const saveButton =
    $("#saveTaskBtn");


  if (saveButton) {

    saveButton.disabled =
      true;


    saveButton.innerHTML = `

      <span
        class="
          spinner-border
          spinner-border-sm
          me-1
        "
        aria-hidden="true"
      ></span>

      Saving...

    `;

  }


  /* =====================================================
     SAVE
  ===================================================== */

  try {

    await store.upsert(
      "tasks",
      item
    );


    /* CLOSE MODAL */

    const modalElement =
      $("#taskModal");


    if (modalElement) {

      bootstrap.Modal
        .getInstance(
          modalElement
        )
        ?.hide();

    }


    render();


    toast(
      existingTask
        ? "Task updated"
        : "Task added"
    );


  } catch (error) {

    console.error(
      "Unable to save task:",
      error
    );


    if (errorElement) {

      errorElement.textContent =
        error?.code ===
        "permission-denied"
          ? "Firebase denied permission to save this task."
          : "Unable to save task. Please try again.";

    }


    /* RESTORE BUTTON */

    if (saveButton) {

      saveButton.disabled =
        false;


      saveButton.innerHTML =
        existingTask
          ? `

              <i
                class="bi bi-check2"
                aria-hidden="true"
              ></i>

              Update Task

            `
          : `

              <i
                class="bi bi-plus-lg"
                aria-hidden="true"
              ></i>

              Add Task

            `;

    }

  }

}


/* =========================================================
   DELETE TASK
========================================================= */

function deleteCurrentTask() {

  const id =
    $("#taskId")?.value;


  if (!id) {

    return;

  }


  const task =
    store.data.tasks.find(
      item =>
        item.id === id
    );


  if (!task) {

    console.error(
      "Unable to find task:",
      id
    );


    toast(
      "Unable to find task"
    );


    return;

  }


  /* =====================================================
     CLOSE TASK MODAL
  ===================================================== */

  const taskModal =
    $("#taskModal");


  if (taskModal) {

    bootstrap.Modal
      .getInstance(
        taskModal
      )
      ?.hide();

  }


  /* =====================================================
     CONFIRM DELETE
  ===================================================== */

  requestDelete({

    type:
      "tasks",

    id:
      task.id,

    title:
      task.title,

    afterDelete: () => {

      render();


      toast(
        "Task deleted"
      );

    }

  });

}


/* =========================================================
   BUILD DAY PLAN
========================================================= */

function buildPlan() {

  const rank = {

    High:
      0,

    Medium:
      1,

    Low:
      2

  };


  const tasks =
    tasksForDate()

      .filter(
        task =>
          !task.completed
      )

      .sort(
        (a, b) => {

          const priorityDifference =
            (
              rank[a.priority] ??
              99
            ) -
            (
              rank[b.priority] ??
              99
            );


          if (
            priorityDifference
          ) {

            return (
              priorityDifference
            );

          }


          return (
            a.startTime ||
            "99:99"
          ).localeCompare(
            b.startTime ||
            "99:99"
          );

        }
      );


  const result =
    $("#aiResult");


  if (!result) {

    return;

  }


  if (!tasks.length) {

    result.innerHTML = `

      <div class="ai-step">

        Everything for this day
        is complete.

      </div>

    `;


    return;

  }


  let cursor =
    (8 * 60) + 30;


  result.innerHTML =
    tasks
      .slice(
        0,
        8
      )
      .map(task => {

        if (task.startTime) {

          const [
            hours,
            minutes
          ] =
            task.startTime
              .split(":")
              .map(Number);


          cursor =
            Math.max(
              cursor,
              (
                hours * 60
              ) +
              minutes
            );

        }


        const start =
          cursor;


        const end =
          cursor +
          (
            Number(
              task.estimatedMinutes
            ) ||
            30
          );


        cursor =
          end + 10;


        return `

          <div class="ai-step">

            <strong>
              ${mins(start)}
            </strong>

            —

            ${esc(task.title)}

            <span class="muted">

              (${esc(
                task.priority ||
                "Medium"
              )})

            </span>

          </div>

        `;

      })
      .join("");

}


/* =========================================================
   SAFE DOM HELPERS
========================================================= */

function setText(
  selector,
  value
) {

  const element =
    $(selector);


  if (element) {

    element.textContent =
      value;

  }

}


function setValue(
  selector,
  value
) {

  const element =
    $(selector);


  if (element) {

    element.value =
      value ?? "";

  }

}


/* =========================================================
   BIND UI EVENTS
========================================================= */

function bind() {

  /* =====================================================
     MOBILE MENU
  ===================================================== */

  const mobileMenu =
    $("#mobileMenu");


  if (mobileMenu) {

    mobileMenu.onclick =
      () => {

        $(".sidebar")
          ?.classList.toggle(
            "open"
          );

      };

  }


  /* =====================================================
     TODAY
  ===================================================== */

  const todayButton =
    $("#todayBtn");


  if (todayButton) {

    todayButton.onclick =
      () => {

        state.selectedDate =
          new Date();


        render();

      };

  }


  /* =====================================================
     PREVIOUS DAY
  ===================================================== */

  const previousDay =
    $("#prevDay");


  if (previousDay) {

    previousDay.onclick =
      () => {

        const date =
          new Date(
            state.selectedDate
          );


        date.setDate(
          date.getDate() - 1
        );


        state.selectedDate =
          date;


        render();

      };

  }


  /* =====================================================
     NEXT DAY
  ===================================================== */

  const nextDay =
    $("#nextDay");


  if (nextDay) {

    nextDay.onclick =
      () => {

        const date =
          new Date(
            state.selectedDate
          );


        date.setDate(
          date.getDate() + 1
        );


        state.selectedDate =
          date;


        render();

      };

  }


  /* =====================================================
     SEARCH
  ===================================================== */

  const search =
    $("#globalSearch");


  if (search) {

    search.oninput =
      task => {

        state.search =
          task.target.value
            .trim()
            .toLowerCase();


        renderTasks();

      };

  }


  /* =====================================================
     FILTERS
  ===================================================== */

  $$(".filter")
    .forEach(button => {

      button.onclick =
        () => {

          $$(".filter")
            .forEach(
              filterButton => {

                filterButton
                  .classList
                  .remove(
                    "active"
                  );

              }
            );


          button.classList.add(
            "active"
          );


          state.filter =
            button.dataset.filter;


          renderTasks();

        };

    });


  /* =====================================================
     SIMPLE ADD BUTTONS
  ===================================================== */

  $$("[data-add]")
    .forEach(button => {

      button.onclick =
        () => {

          addSimple(
            button.dataset.add
          );

        };

    });


  /* =====================================================
     QUICK NOTE
  ===================================================== */

  const quickNoteButton =
    $("#quickNoteBtn");


  if (quickNoteButton) {

    quickNoteButton.onclick =
      () => {

        addSimple(
          "note"
        );

      };

  }


  /* =====================================================
     PLAN DAY
  ===================================================== */

  const planDayButton =
    $("#planDayBtn");


  if (planDayButton) {

    planDayButton.onclick =
      buildPlan;

  }


  /* =====================================================
     TASK MODAL
  ===================================================== */

  const taskModal =
    $("#taskModal");


  if (taskModal) {

    /*
     * Reset only AFTER modal closes.
     */

    taskModal.addEventListener(
      "hidden.bs.modal",
      resetTaskForm
    );

  }


  /* =====================================================
     TASK FORM
  ===================================================== */

  const taskForm =
    $("#taskForm");


  if (taskForm) {

    taskForm.addEventListener(
      "submit",
      saveTask
    );

  }


  /* =====================================================
     TASK DELETE
  ===================================================== */

  const deleteTaskButton =
    $("#deleteTaskBtn");


  if (deleteTaskButton) {

    deleteTaskButton.addEventListener(
      "click",
      deleteCurrentTask
    );

  }

}


/* =========================================================
   INITIALIZE APPLICATION
========================================================= */

async function init() {

  try {

    /* ===================================================
       LOAD STORE
    =================================================== */

    await store.init();


    /*
     * Make sure the collections expected
     * by this page always exist.
     */

    store.data.tasks =
      Array.isArray(
        store.data.tasks
      )
        ? store.data.tasks
        : [];


    store.data.goals =
      Array.isArray(
        store.data.goals
      )
        ? store.data.goals
        : [];


    store.data.habits =
      Array.isArray(
        store.data.habits
      )
        ? store.data.habits
        : [];


    store.data.notes =
      Array.isArray(
        store.data.notes
      )
        ? store.data.notes
        : [];


    store.data.shopping =
      Array.isArray(
        store.data.shopping
      )
        ? store.data.shopping
        : [];


    store.data.tasks =
      Array.isArray(
        store.data.tasks
      )
        ? store.data.tasks
        : [];


    /* ===================================================
       SHARED DELETE MANAGER

       Initialize this BEFORE calendar/task
       modules request deletions.
    =================================================== */

    initDeleteManager(
      store
    );


    /* ===================================================
       CALENDAR
    =================================================== */

    initCalendarPopup(
      store
    );


    /* ===================================================
       PAGE EVENTS
    =================================================== */

    bind();


    /* ===================================================
       INITIAL TASK FORM
    =================================================== */

    resetTaskForm();


    /* ===================================================
       FIRST RENDER
    =================================================== */

    render();


  } catch (error) {

    console.error(
      "Unable to initialize application:",
      error
    );


    const message =
      $("#taskError");


    if (message) {

      message.textContent =
        "The application could not be initialized. Check the browser console.";

    }

  }

}


/* =========================================================
   START
========================================================= */

init();