/* =========================================================
   DELETE MANAGER
========================================================= */

let deleteModal = null;

let pendingDelete = null;

let storeReference = null;

let afterDeleteCallback = null;


/* =========================================================
   INITIALIZE
========================================================= */

export function initDeleteManager(store) {

  storeReference = store;


  const modalElement =
    document.getElementById(
      "deleteConfirmModal"
    );


  const confirmButton =
    document.getElementById(
      "confirmDeleteBtn"
    );


  /* =====================================================
     VALIDATE REQUIRED HTML
  ===================================================== */

  if (!modalElement) {

    console.error(
      'Delete manager: "#deleteConfirmModal" was not found.'
    );

    return;

  }


  if (!confirmButton) {

    console.error(
      'Delete manager: "#confirmDeleteBtn" was not found.'
    );

    return;

  }


  /* =====================================================
     CREATE BOOTSTRAP MODAL
  ===================================================== */

  deleteModal =
    bootstrap.Modal.getOrCreateInstance(
      modalElement
    );


  /* =====================================================
     CONFIRM DELETE BUTTON
  ===================================================== */

  confirmButton.addEventListener(
    "click",
    confirmDelete
  );


  /* =====================================================
     CLEAN UP WHEN MODAL CLOSES
  ===================================================== */

  modalElement.addEventListener(
    "hidden.bs.modal",
    () => {

      /*
       * Only clear pending information
       * when a deletion is not currently
       * being processed.
       */

      const button =
        document.getElementById(
          "confirmDeleteBtn"
        );


      if (
        button &&
        !button.disabled
      ) {

        pendingDelete = null;

        afterDeleteCallback = null;

      }

    }
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

  /* =====================================================
     VALIDATE DELETE MANAGER
  ===================================================== */

  if (!storeReference) {

    console.error(
      "Delete manager has not been initialized."
    );

    return;

  }


  if (!deleteModal) {

    console.error(
      "Delete confirmation modal is not available."
    );

    return;

  }


  /* =====================================================
     VALIDATE ITEM
  ===================================================== */

  if (!type || !id) {

    console.error(
      "Delete request requires a type and ID."
    );

    return;

  }


  /* =====================================================
     SAVE PENDING DELETE
  ===================================================== */

  pendingDelete = {
    type,
    id
  };


  afterDeleteCallback =
    typeof afterDelete === "function"
      ? afterDelete
      : null;


  /* =====================================================
     UPDATE ITEM NAME
  ===================================================== */

  const itemNameElement =
    document.getElementById(
      "deleteItemName"
    );


  if (itemNameElement) {

    itemNameElement.textContent =
      title ||
      "This item";

  }


  /* =====================================================
     UPDATE MODAL TITLE
  ===================================================== */

  const titleElement =
    document.getElementById(
      "deleteConfirmTitle"
    );


  const readableType =
    type === "tasks"
      ? "task"
      : type === "tasks"
        ? "task"
        : "item";


  if (titleElement) {

    titleElement.textContent =
      `Delete ${readableType}?`;

  }


  /* =====================================================
     SHOW CONFIRMATION
  ===================================================== */

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


  if (!button) {

    console.error(
      "Delete confirmation button was not found."
    );

    return;

  }


  /*
   * Capture this before awaiting Firestore.
   *
   * This prtasks state changes while
   * deletion is processing.
   */

  const deleteRequest = {
    ...pendingDelete
  };


  const callback =
    afterDeleteCallback;


  const originalHTML =
    button.innerHTML;


  /* =====================================================
     LOADING STATE
  ===================================================== */

  button.disabled = true;


  button.innerHTML = `

    <span
      class="spinner-border spinner-border-sm me-2"
      role="status"
      aria-hidden="true"
    ></span>

    Deleting...

  `;


  try {

    /* ===================================================
       DELETE FROM STORE / FIRESTORE
    =================================================== */

    await storeReference.remove(
      deleteRequest.type,
      deleteRequest.id
    );


    /* ===================================================
       CLEAR STATE
    =================================================== */

    pendingDelete = null;

    afterDeleteCallback = null;


    /* ===================================================
       CLOSE CONFIRMATION
    =================================================== */

    deleteModal.hide();


    /* ===================================================
       REFRESH CALLER
    =================================================== */

    if (callback) {

      await callback();

    }


  } catch (error) {

    console.error(
      "Delete failed:",
      error
    );


    /*
     * Keep pendingDelete intact so
     * the user can try again.
     */

    pendingDelete =
      deleteRequest;


    afterDeleteCallback =
      callback;


    alert(
      "Unable to delete this item. Please try again."
    );


  } finally {

    /* ===================================================
       RESTORE BUTTON
    =================================================== */

    button.disabled = false;

    button.innerHTML =
      originalHTML;

  }

}