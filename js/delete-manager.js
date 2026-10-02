let deleteModal = null;

let pendingDelete = null;

let storeReference = null;

let afterDeleteCallback = null;


/* =========================================================
   INITIALIZE
========================================================= */

export function initDeleteManager(store) {

  storeReference = store;

  deleteModal =
    new bootstrap.Modal(
      document.getElementById(
        "deleteConfirmModal"
      )
    );


  document
    .getElementById("confirmDeleteBtn")
    .addEventListener(
      "click",
      confirmDelete
    );

}


/* =========================================================
   REQUEST DELETE
========================================================= */

export function requestDelete({
  type,
  id,
  title,
  afterDelete
}) {

  pendingDelete = {
    type,
    id
  };


  afterDeleteCallback =
    afterDelete || null;


  document.getElementById(
    "deleteItemName"
  ).textContent =
    title || "This item";


  const readableType =
    type === "tasks"
      ? "task"
      : type === "events"
        ? "event"
        : "item";


  document.getElementById(
    "deleteConfirmTitle"
  ).textContent =
    `Delete ${readableType}?`;


  deleteModal.show();

}


/* =========================================================
   CONFIRM DELETE
========================================================= */

async function confirmDelete() {

  if (!pendingDelete) {
    return;
  }


  const button =
    document.getElementById(
      "confirmDeleteBtn"
    );


  const originalHTML =
    button.innerHTML;


  button.disabled = true;

  button.innerHTML = `
    <span
      class="spinner-border spinner-border-sm"
    ></span>

    Deleting...
  `;


  try {

    await storeReference.remove(
      pendingDelete.type,
      pendingDelete.id
    );


    deleteModal.hide();


    if (afterDeleteCallback) {

      await afterDeleteCallback();

    }


    pendingDelete = null;

    afterDeleteCallback = null;


  } catch (error) {

    console.error(
      "Delete failed:",
      error
    );


    alert(
      "Unable to delete this item. Please try again."
    );

  } finally {

    button.disabled = false;

    button.innerHTML =
      originalHTML;

  }

}

document
  .getElementById(
    "deleteTaskBtn"
  )
  .addEventListener(
    "click",
    () => {

      const id =
        document.getElementById(
          "taskId"
        ).value;


      if (!id) {
        return;
      }


      const task =
        store.data.tasks.find(
          item =>
            item.id === id
        );


      if (!task) {
        return;
      }


      bootstrap.Modal
        .getInstance(
          document.getElementById(
            "taskModal"
          )
        )
        ?.hide();


      requestDelete({

        type: "tasks",

        id: task.id,

        title: task.title,

        afterDelete: () => {

          /*
           Replace renderApp() with the
           name of your existing main
           render function if different.
          */

          renderApp();

        }

      });

    }
  );