const STORAGE_KEY = "myChecklists.data.v1";
const CHECKY_HISTORY_KEY = "myChecklists.checky.v1";
const STORE_VERSION = 1;
const MAX_ACTIVITY_ITEMS = 50;
const CHECKY_ENDPOINT =
  document.querySelector('meta[name="checky-api-url"]')?.content?.trim() || "/api/checky";
const CHECKY_INTRO =
  "Hi, I’m Checky! I can answer questions about the app, create a new checklist, or add tasks to one you already have.";

const elements = {
  brand: document.querySelector(".brand"),
  welcomeView: document.querySelector("#welcome-view"),
  checklistView: document.querySelector("#checklist-view"),
  createForm: document.querySelector("#create-checklist-form"),
  checklistNameInput: document.querySelector("#checklist-name"),
  createError: document.querySelector("#create-error"),
  savedListCount: document.querySelector("#saved-list-count"),
  savedListGrid: document.querySelector("#saved-list-grid"),
  emptyLibrary: document.querySelector("#empty-library"),
  checklistSearchInput: document.querySelector("#checklist-search-input"),
  noChecklistResults: document.querySelector("#no-checklist-results"),
  checklistTitle: document.querySelector("#checklist-title"),
  backToListsButton: document.querySelector("#back-to-lists-button"),
  deleteChecklistButton: document.querySelector("#delete-checklist-button"),
  newChecklistButton: document.querySelector("#new-checklist-button"),
  taskSearchInput: document.querySelector("#task-search-input"),
  openAddTaskButton: document.querySelector("#open-add-task-button"),
  taskList: document.querySelector("#task-list"),
  taskTemplate: document.querySelector("#task-template"),
  emptyTasks: document.querySelector("#empty-tasks"),
  noTaskResults: document.querySelector("#no-task-results"),
  completedCount: document.querySelector("#completed-count"),
  taskCount: document.querySelector("#task-count"),
  progressPercent: document.querySelector("#progress-percent"),
  progressTrack: document.querySelector(".progress-track"),
  progressFill: document.querySelector("#progress-fill"),
  checklistCount: document.querySelector("#checklist-count"),
  checklistSwitcher: document.querySelector("#checklist-switcher"),
  activityList: document.querySelector("#activity-list"),
  emptyActivity: document.querySelector("#empty-activity"),
  addTaskModal: document.querySelector("#add-task-modal"),
  addTaskForm: document.querySelector("#add-task-form"),
  newTaskInput: document.querySelector("#new-task-input"),
  addTaskError: document.querySelector("#add-task-error"),
  closeAddTaskModalButton: document.querySelector("#close-add-task-modal-button"),
  cancelAddTaskButton: document.querySelector("#cancel-add-task-button"),
  editModal: document.querySelector("#edit-modal"),
  editForm: document.querySelector("#edit-form"),
  editInput: document.querySelector("#edit-task-input"),
  editError: document.querySelector("#edit-error"),
  closeModalButton: document.querySelector("#close-modal-button"),
  cancelEditButton: document.querySelector("#cancel-edit-button"),
  toastRegion: document.querySelector("#toast-region"),
  checkyLauncher: document.querySelector("#checky-launcher"),
  checkyPanel: document.querySelector("#checky-panel"),
  closeCheckyButton: document.querySelector("#close-checky-button"),
  checkyMessages: document.querySelector("#checky-messages"),
  checkyPrompts: document.querySelector("#checky-prompts"),
  checkyPromptButtons: [...document.querySelectorAll("[data-checky-prompt]")],
  checkyForm: document.querySelector("#checky-form"),
  checkyInput: document.querySelector("#checky-input"),
  checkySendButton: document.querySelector("#checky-send-button"),
  checkyStatus: document.querySelector("#checky-status"),
};

const state = {
  data: loadData(),
  activeChecklistId: null,
  editingTaskId: null,
  checklistSearchTerm: "",
  taskSearchTerm: "",
  checkyMessages: loadCheckyHistory(),
  checkyBusy: false,
};

bindInterface();
restoreLastView();
renderCheckyConversation();

function bindInterface() {
  elements.brand.addEventListener("click", (event) => {
    event.preventDefault();
    showLibrary();
  });
  elements.createForm.addEventListener("submit", handleCreateChecklist);
  elements.backToListsButton.addEventListener("click", () => showLibrary());
  elements.newChecklistButton.addEventListener("click", () => showLibrary(true));
  elements.deleteChecklistButton.addEventListener("click", () => deleteChecklist(state.activeChecklistId));
  elements.checklistSearchInput.addEventListener("input", handleChecklistSearch);
  elements.taskSearchInput.addEventListener("input", handleTaskSearch);
  elements.openAddTaskButton.addEventListener("click", openAddTaskModal);
  elements.addTaskForm.addEventListener("submit", handleAddTask);
  elements.closeAddTaskModalButton.addEventListener("click", closeAddTaskModal);
  elements.cancelAddTaskButton.addEventListener("click", closeAddTaskModal);
  elements.addTaskModal.addEventListener("click", (event) => {
    if (event.target === elements.addTaskModal) closeAddTaskModal();
  });
  elements.editForm.addEventListener("submit", handleEditTask);
  elements.closeModalButton.addEventListener("click", closeEditModal);
  elements.cancelEditButton.addEventListener("click", closeEditModal);
  elements.editModal.addEventListener("click", (event) => {
    if (event.target === elements.editModal) closeEditModal();
  });
  elements.checkyLauncher.addEventListener("click", openChecky);
  elements.closeCheckyButton.addEventListener("click", closeChecky);
  elements.checkyForm.addEventListener("submit", handleCheckySubmit);
  elements.checkyInput.addEventListener("input", resizeCheckyInput);
  elements.checkyInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      elements.checkyForm.requestSubmit();
    }
  });
  elements.checkyPromptButtons.forEach((button) => {
    button.addEventListener("click", () => {
      elements.checkyInput.value = button.dataset.checkyPrompt || "";
      resizeCheckyInput();
      elements.checkyForm.requestSubmit();
    });
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (!elements.addTaskModal.hidden) {
      closeAddTaskModal();
    } else if (!elements.editModal.hidden) {
      closeEditModal();
    } else if (!elements.checkyPanel.hidden) {
      closeChecky();
    }
  });
  window.addEventListener("storage", handleStorageChange);
}

function restoreLastView() {
  const lastActiveId = state.data.activeChecklistId;
  if (lastActiveId && findChecklist(lastActiveId)) {
    openChecklist(lastActiveId, false);
    return;
  }
  showLibrary(false, false);
}

function handleCreateChecklist(event) {
  event.preventDefault();
  const name = cleanText(elements.checklistNameInput.value);

  if (!name) {
    showMessage(elements.createError, "Give your checklist a name.");
    elements.checklistNameInput.focus();
    return;
  }

  const now = Date.now();
  const checklist = {
    id: createId("list"),
    name,
    createdAt: now,
    updatedAt: now,
    tasks: [],
    activity: [createActivity("created-list", "", now)],
  };

  state.data.checklists.unshift(checklist);
  state.data.activeChecklistId = checklist.id;
  if (!commitData()) return;

  elements.createForm.reset();
  clearMessage(elements.createError);
  openChecklist(checklist.id, false);
  showToast("Checklist created and saved on this device.", "success");
}

function openChecklist(checklistId, persist = true) {
  const checklist = findChecklist(checklistId);
  if (!checklist) {
    showLibrary();
    return;
  }

  state.activeChecklistId = checklist.id;
  state.data.activeChecklistId = checklist.id;
  state.taskSearchTerm = "";
  elements.taskSearchInput.value = "";
  closeAddTaskModal(false);
  closeEditModal();
  if (persist) saveData();

  elements.welcomeView.hidden = true;
  elements.checklistView.hidden = false;
  renderActiveChecklist();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showLibrary(focusName = false, persist = true) {
  closeAddTaskModal(false);
  closeEditModal();
  state.activeChecklistId = null;
  state.data.activeChecklistId = null;
  if (persist) saveData();
  elements.checklistView.hidden = true;
  elements.welcomeView.hidden = false;
  document.title = "My Checklists";
  renderLibrary();
  window.scrollTo({ top: 0, behavior: "smooth" });
  if (focusName) requestAnimationFrame(() => elements.checklistNameInput.focus());
}

function renderLibrary() {
  const allChecklists = sortedChecklists();
  const checklists = state.checklistSearchTerm
    ? allChecklists.filter((checklist) => matchesSearch(checklist.name, state.checklistSearchTerm))
    : allChecklists;

  elements.savedListCount.textContent = String(allChecklists.length);
  elements.savedListGrid.replaceChildren();
  elements.emptyLibrary.hidden = allChecklists.length > 0;
  elements.noChecklistResults.hidden = !(
    allChecklists.length > 0 &&
    state.checklistSearchTerm &&
    checklists.length === 0
  );

  checklists.forEach((checklist) => {
    const item = document.createElement("li");
    item.className = "saved-list-card";

    const openButton = document.createElement("button");
    openButton.className = "saved-list-open";
    openButton.type = "button";
    openButton.setAttribute("aria-label", `Open ${checklist.name}`);

    const heading = document.createElement("span");
    heading.className = "saved-list-title-row";
    const name = document.createElement("strong");
    name.textContent = checklist.name;
    const arrow = document.createElement("span");
    arrow.className = "saved-list-arrow";
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = "→";
    heading.append(name, arrow);

    const total = checklist.tasks.length;
    const completed = checklist.tasks.filter((task) => task.completed).length;
    const percent = total ? Math.round((completed / total) * 100) : 0;
    const meta = document.createElement("span");
    meta.className = "saved-list-meta";
    meta.textContent = total
      ? `${completed} of ${total} complete · Updated ${relativeTime(checklist.updatedAt).toLowerCase()}`
      : "No tasks yet · Ready when you are";

    const progress = document.createElement("span");
    progress.className = "saved-list-progress";
    const progressFill = document.createElement("span");
    progressFill.style.width = `${percent}%`;
    progress.append(progressFill);

    openButton.append(heading, meta, progress);
    openButton.addEventListener("click", () => openChecklist(checklist.id));

    const deleteButton = document.createElement("button");
    deleteButton.className = "icon-button danger saved-list-delete";
    deleteButton.type = "button";
    deleteButton.setAttribute("aria-label", `Delete ${checklist.name}`);
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", () => deleteChecklist(checklist.id));

    item.append(openButton, deleteButton);
    elements.savedListGrid.append(item);
  });
}

function renderActiveChecklist() {
  const checklist = getActiveChecklist();
  if (!checklist) {
    showLibrary();
    return;
  }

  elements.checklistTitle.textContent = checklist.name;
  document.title = `${checklist.name} · My Checklists`;
  renderTasks(checklist);
  renderSwitcher();
  renderActivity(checklist);
}

function renderTasks(checklist) {
  const allTasks = [...checklist.tasks].sort((left, right) => {
    if (left.completed !== right.completed) return Number(left.completed) - Number(right.completed);
    return left.createdAt - right.createdAt;
  });
  const tasks = state.taskSearchTerm
    ? allTasks.filter((task) => matchesSearch(task.text, state.taskSearchTerm))
    : allTasks;

  elements.taskList.replaceChildren();
  elements.emptyTasks.hidden = allTasks.length > 0;
  elements.noTaskResults.hidden = !(
    allTasks.length > 0 &&
    state.taskSearchTerm &&
    tasks.length === 0
  );

  tasks.forEach((task) => {
    const fragment = elements.taskTemplate.content.cloneNode(true);
    const item = fragment.querySelector(".task-item");
    const checkButton = fragment.querySelector(".task-check");
    const text = fragment.querySelector(".task-text");
    const meta = fragment.querySelector(".task-meta");
    const editButton = fragment.querySelector(".edit-task-button");
    const deleteButton = fragment.querySelector(".delete-task-button");

    item.dataset.taskId = task.id;
    item.classList.toggle("completed", task.completed);
    text.textContent = task.text;
    meta.textContent = task.completed
      ? `Completed ${formatDate(task.completedAt)}`
      : `Added ${formatDate(task.createdAt)}`;
    checkButton.setAttribute(
      "aria-label",
      task.completed ? `Reopen ${task.text}` : `Complete ${task.text}`,
    );
    checkButton.addEventListener("click", () => toggleTask(task.id));
    editButton.addEventListener("click", () => openEditModal(task));
    deleteButton.addEventListener("click", () => deleteTask(task.id));

    elements.taskList.append(fragment);
  });

  updateProgress(checklist.tasks);
}

function handleChecklistSearch(event) {
  state.checklistSearchTerm = normalizeSearch(event.target.value);
  renderLibrary();
}

function handleTaskSearch(event) {
  state.taskSearchTerm = normalizeSearch(event.target.value);
  const checklist = getActiveChecklist();
  if (checklist) renderTasks(checklist);
}

function openChecky() {
  elements.checkyPanel.hidden = false;
  elements.checkyLauncher.hidden = true;
  elements.checkyLauncher.setAttribute("aria-expanded", "true");
  clearMessage(elements.checkyStatus);
  renderCheckyConversation();
  requestAnimationFrame(() => elements.checkyInput.focus());
}

function closeChecky() {
  const wasOpen = !elements.checkyPanel.hidden;
  elements.checkyPanel.hidden = true;
  elements.checkyLauncher.hidden = false;
  elements.checkyLauncher.setAttribute("aria-expanded", "false");
  if (wasOpen) requestAnimationFrame(() => elements.checkyLauncher.focus());
}

function renderCheckyConversation() {
  elements.checkyMessages.replaceChildren();
  elements.checkyMessages.append(createCheckyMessageElement("assistant", CHECKY_INTRO));
  state.checkyMessages.forEach((message) => {
    elements.checkyMessages.append(
      createCheckyMessageElement(message.role, message.text, message.actionText),
    );
  });

  if (state.checkyBusy) elements.checkyMessages.append(createCheckyTypingElement());

  elements.checkyPrompts.hidden = state.checkyMessages.length > 0;
  elements.checkyInput.disabled = state.checkyBusy;
  elements.checkySendButton.disabled = state.checkyBusy;
  requestAnimationFrame(() => {
    elements.checkyMessages.scrollTop = elements.checkyMessages.scrollHeight;
  });
}

function createCheckyMessageElement(role, text, actionText = "") {
  const row = document.createElement("div");
  row.className = `checky-message ${role === "user" ? "user" : "assistant"}`;

  if (role !== "user") {
    const avatar = document.createElement("span");
    avatar.className = "checky-message-avatar";
    avatar.setAttribute("aria-hidden", "true");
    const image = document.createElement("img");
    image.src = "assets/checky.png";
    image.alt = "";
    avatar.append(image);
    row.append(avatar);
  }

  const bubble = document.createElement("div");
  bubble.className = "checky-message-bubble";
  bubble.textContent = text;
  if (actionText) {
    const note = document.createElement("span");
    note.className = "checky-action-note";
    note.textContent = `✓ ${actionText}`;
    bubble.append(note);
  }
  row.append(bubble);
  return row;
}

function createCheckyTypingElement() {
  const row = document.createElement("div");
  row.className = "checky-message assistant checky-typing";
  row.setAttribute("aria-label", "Checky is thinking");

  const avatar = document.createElement("span");
  avatar.className = "checky-message-avatar";
  avatar.setAttribute("aria-hidden", "true");
  const image = document.createElement("img");
  image.src = "assets/checky.png";
  image.alt = "";
  avatar.append(image);

  const bubble = document.createElement("div");
  bubble.className = "checky-message-bubble";
  for (let index = 0; index < 3; index += 1) {
    const dot = document.createElement("span");
    dot.className = "checky-typing-dot";
    bubble.append(dot);
  }
  row.append(avatar, bubble);
  return row;
}

function appendCheckyMessage(role, text, actionText = "") {
  const message = {
    role: role === "user" ? "user" : "assistant",
    text: cleanText(text),
    actionText: cleanText(actionText),
  };
  if (!message.text) return;
  state.checkyMessages.push(message);
  state.checkyMessages = state.checkyMessages.slice(-18);
  saveCheckyHistory();
}

async function handleCheckySubmit(event) {
  event.preventDefault();
  if (state.checkyBusy) return;

  const message = cleanText(elements.checkyInput.value);
  if (!message) {
    showMessage(elements.checkyStatus, "Type a message for Checky first.");
    elements.checkyInput.focus();
    return;
  }

  clearMessage(elements.checkyStatus);
  elements.checkyInput.value = "";
  resizeCheckyInput();
  appendCheckyMessage("user", message);
  state.checkyBusy = true;
  renderCheckyConversation();

  try {
    const response = await requestChecky(message);
    const actionResult = applyCheckyActions(response.actions);
    appendCheckyMessage(
      "assistant",
      response.reply || "Done — I’ve updated your checklists.",
      actionResult.note,
    );
  } catch (error) {
    const setupMissing = error.status === 404 || error.code === "missing_openai_key";
    const reply = setupMissing
      ? "My chat window is ready, but my secure AI connection still needs to be turned on for this copy of the site."
      : "I couldn’t reach my AI connection just now. Your saved checklists were not changed, so please try again in a moment.";
    appendCheckyMessage("assistant", reply);
    console.error("Checky request failed", error);
  } finally {
    state.checkyBusy = false;
    renderCheckyConversation();
    if (!elements.checkyPanel.hidden) elements.checkyInput.focus();
  }
}

async function requestChecky(message) {
  const response = await fetch(CHECKY_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      history: state.checkyMessages
        .slice(0, -1)
        .slice(-10)
        .map(({ role, text }) => ({ role, text })),
      context: buildCheckyContext(),
    }),
  });

  let payload = {};
  try {
    payload = await response.json();
  } catch (error) {
    console.warn("Checky returned a non-JSON response", error);
  }

  if (!response.ok) {
    const error = new Error(payload.error || `Checky request failed with ${response.status}`);
    error.status = response.status;
    error.code = payload.code || "request_failed";
    throw error;
  }

  return {
    reply: cleanText(payload.reply),
    actions: Array.isArray(payload.actions) ? payload.actions : [],
  };
}

function buildCheckyContext() {
  return {
    currentView: elements.checklistView.hidden ? "checklist-library" : "open-checklist",
    activeChecklistId: state.activeChecklistId || "",
    checklists: sortedChecklists()
      .slice(0, 24)
      .map((checklist) => ({
        id: checklist.id,
        name: checklist.name,
        taskCount: checklist.tasks.length,
        incompleteCount: checklist.tasks.filter((task) => !task.completed).length,
        tasks: checklist.tasks
          .slice(0, checklist.id === state.activeChecklistId ? 40 : 10)
          .map((task) => ({ text: task.text.slice(0, 180), completed: task.completed })),
      })),
  };
}

function applyCheckyActions(actions) {
  if (!Array.isArray(actions) || actions.length === 0) return { note: "" };

  let listsCreated = 0;
  let tasksAdded = 0;
  let affectedChecklist = null;
  let dataChanged = false;

  actions.slice(0, 3).forEach((action) => {
    if (!action || !["create_checklist", "add_tasks"].includes(action.type)) return;

    const requestedName = cleanText(action.checklist_name).slice(0, 60);
    const requestedId = cleanText(action.checklist_id);
    let checklist = requestedId ? findChecklist(requestedId) : null;
    if (!checklist && requestedName) {
      const normalizedName = normalizeSearch(requestedName);
      checklist = state.data.checklists.find(
        (item) => normalizeSearch(item.name) === normalizedName,
      );
    }

    if (!checklist && action.type === "create_checklist" && requestedName) {
      const now = Date.now();
      checklist = {
        id: createId("list"),
        name: requestedName,
        createdAt: now,
        updatedAt: now,
        tasks: [],
        activity: [createActivity("created-list", "", now)],
      };
      state.data.checklists.unshift(checklist);
      listsCreated += 1;
      dataChanged = true;
    }

    if (!checklist) return;

    const existingTasks = new Set(checklist.tasks.map((task) => normalizeSearch(task.text)));
    const taskTexts = [...new Set(
      (Array.isArray(action.tasks) ? action.tasks : [])
        .map((task) => cleanText(task).slice(0, 180))
        .filter(Boolean),
    )].slice(0, 40);

    taskTexts.forEach((text) => {
      const normalizedText = normalizeSearch(text);
      if (existingTasks.has(normalizedText)) return;
      const now = Date.now();
      checklist.tasks.push({
        id: createId("task"),
        text,
        completed: false,
        createdAt: now,
        completedAt: null,
      });
      addActivity(checklist, "added", text, now);
      touchChecklist(checklist, now);
      existingTasks.add(normalizedText);
      tasksAdded += 1;
      dataChanged = true;
    });

    affectedChecklist = checklist;
  });

  if (!dataChanged || !affectedChecklist) {
    return { note: "No new items were needed" };
  }

  state.activeChecklistId = affectedChecklist.id;
  state.data.activeChecklistId = affectedChecklist.id;
  if (!commitData()) return { note: "The changes could not be saved" };

  openChecklist(affectedChecklist.id, false);
  const listPart = listsCreated
    ? `${listsCreated === 1 ? "Created a checklist" : `Created ${listsCreated} checklists`}`
    : "";
  const taskPart = tasksAdded
    ? `${tasksAdded === 1 ? "added 1 task" : `added ${tasksAdded} tasks`}`
    : "";
  const note = [listPart, taskPart].filter(Boolean).join(" and ");
  showToast(`${note || "Checklist updated"} with Checky.`, "success");
  return { note };
}

function resizeCheckyInput() {
  elements.checkyInput.style.height = "auto";
  elements.checkyInput.style.height = `${Math.min(elements.checkyInput.scrollHeight, 116)}px`;
}

function openAddTaskModal() {
  elements.addTaskForm.reset();
  clearMessage(elements.addTaskError);
  elements.addTaskModal.hidden = false;
  updateModalBodyLock();
  requestAnimationFrame(() => elements.newTaskInput.focus());
}

function closeAddTaskModal(restoreFocus = true) {
  const wasOpen = !elements.addTaskModal.hidden;
  elements.addTaskModal.hidden = true;
  clearMessage(elements.addTaskError);
  updateModalBodyLock();
  if (wasOpen && restoreFocus && !elements.checklistView.hidden) {
    requestAnimationFrame(() => elements.openAddTaskButton.focus());
  }
}

function handleAddTask(event) {
  event.preventDefault();
  const checklist = getActiveChecklist();
  const text = cleanText(elements.newTaskInput.value);

  if (!checklist) return;
  if (!text) {
    showMessage(elements.addTaskError, "Add a short description before saving this task.");
    elements.newTaskInput.focus();
    return;
  }

  const now = Date.now();
  checklist.tasks.push({
    id: createId("task"),
    text,
    completed: false,
    createdAt: now,
    completedAt: null,
  });
  addActivity(checklist, "added", text, now);
  touchChecklist(checklist, now);

  if (!commitData()) return;
  state.taskSearchTerm = "";
  elements.taskSearchInput.value = "";
  closeAddTaskModal(false);
  renderActiveChecklist();
  elements.taskSearchInput.focus();
}

function toggleTask(taskId) {
  const checklist = getActiveChecklist();
  const task = checklist?.tasks.find((item) => item.id === taskId);
  if (!checklist || !task) return;

  const now = Date.now();
  task.completed = !task.completed;
  task.completedAt = task.completed ? now : null;
  addActivity(checklist, task.completed ? "completed" : "reopened", task.text, now);
  touchChecklist(checklist, now);
  if (commitData()) renderActiveChecklist();
}

function openEditModal(task) {
  state.editingTaskId = task.id;
  elements.editInput.value = task.text;
  clearMessage(elements.editError);
  elements.editModal.hidden = false;
  updateModalBodyLock();
  requestAnimationFrame(() => {
    elements.editInput.focus();
    elements.editInput.select();
  });
}

function closeEditModal() {
  state.editingTaskId = null;
  elements.editModal.hidden = true;
  updateModalBodyLock();
}

function updateModalBodyLock() {
  document.body.style.overflow =
    elements.addTaskModal.hidden && elements.editModal.hidden ? "" : "hidden";
}

function handleEditTask(event) {
  event.preventDefault();
  const checklist = getActiveChecklist();
  const task = checklist?.tasks.find((item) => item.id === state.editingTaskId);
  const text = cleanText(elements.editInput.value);

  if (!task || !checklist) {
    showMessage(elements.editError, "That task is no longer available.");
    return;
  }
  if (!text) {
    showMessage(elements.editError, "A task cannot be blank.");
    return;
  }
  if (text === task.text) {
    closeEditModal();
    return;
  }

  const now = Date.now();
  task.text = text;
  addActivity(checklist, "edited", text, now);
  touchChecklist(checklist, now);
  if (!commitData()) return;

  closeEditModal();
  renderActiveChecklist();
  showToast("Task updated.", "success");
}

function deleteTask(taskId) {
  const checklist = getActiveChecklist();
  const task = checklist?.tasks.find((item) => item.id === taskId);
  if (!checklist || !task) return;

  const confirmed = window.confirm(`Delete “${task.text}”? This cannot be undone.`);
  if (!confirmed) return;

  const now = Date.now();
  checklist.tasks = checklist.tasks.filter((item) => item.id !== taskId);
  addActivity(checklist, "deleted", task.text, now);
  touchChecklist(checklist, now);
  if (commitData()) {
    renderActiveChecklist();
    showToast("Task deleted.");
  }
}

function deleteChecklist(checklistId) {
  const checklist = findChecklist(checklistId);
  if (!checklist) return;
  const activeBeforeDelete = state.activeChecklistId;

  const confirmed = window.confirm(
    `Delete “${checklist.name}” and all of its tasks? This cannot be undone.`,
  );
  if (!confirmed) return;

  state.data.checklists = state.data.checklists.filter((item) => item.id !== checklistId);
  if (state.data.activeChecklistId === checklistId) state.data.activeChecklistId = null;
  if (state.activeChecklistId === checklistId) state.activeChecklistId = null;
  if (!commitData()) {
    state.activeChecklistId = activeBeforeDelete;
    state.data.activeChecklistId = activeBeforeDelete;
    return;
  }

  showLibrary(false, false);
  showToast("Checklist deleted.");
}

function renderSwitcher() {
  const checklists = sortedChecklists();
  elements.checklistCount.textContent = String(checklists.length);
  elements.checklistSwitcher.replaceChildren();

  checklists.forEach((checklist) => {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "switcher-button";
    button.classList.toggle("active", checklist.id === state.activeChecklistId);
    if (checklist.id === state.activeChecklistId) button.setAttribute("aria-current", "true");

    const name = document.createElement("span");
    name.textContent = checklist.name;
    const count = document.createElement("small");
    count.textContent = `${checklist.tasks.filter((task) => !task.completed).length} left`;
    button.append(name, count);
    button.addEventListener("click", () => openChecklist(checklist.id));
    item.append(button);
    elements.checklistSwitcher.append(item);
  });
}

function renderActivity(checklist) {
  const activities = [...checklist.activity]
    .sort((left, right) => right.timestamp - left.timestamp)
    .slice(0, 25);

  elements.activityList.replaceChildren();
  elements.emptyActivity.hidden = activities.length > 0;

  activities.forEach((activity) => {
    const item = document.createElement("li");
    item.className = "activity-item";
    const copy = document.createElement("p");
    copy.className = "activity-copy";
    copy.textContent = activitySentence(activity);
    const time = document.createElement("p");
    time.className = "activity-time";
    time.textContent = relativeTime(activity.timestamp);
    item.append(copy, time);
    elements.activityList.append(item);
  });
}

function updateProgress(tasks) {
  const total = tasks.length;
  const completed = tasks.filter((task) => task.completed).length;
  const percent = total ? Math.round((completed / total) * 100) : 0;

  elements.completedCount.textContent = String(completed);
  elements.taskCount.textContent = String(total);
  elements.progressPercent.textContent = `${percent}%`;
  elements.progressFill.style.width = `${percent}%`;
  elements.progressTrack.setAttribute("aria-valuenow", String(percent));
}

function addActivity(checklist, type, taskText, timestamp = Date.now()) {
  checklist.activity.unshift(createActivity(type, taskText, timestamp));
  checklist.activity = checklist.activity.slice(0, MAX_ACTIVITY_ITEMS);
}

function createActivity(type, taskText, timestamp) {
  return { id: createId("activity"), type, taskText, timestamp };
}

function activitySentence(activity) {
  const task = activity.taskText ? `“${activity.taskText}”` : "";
  const messages = {
    "created-list": "Checklist created",
    added: `Added ${task}`,
    completed: `Completed ${task}`,
    reopened: `Reopened ${task}`,
    edited: `Edited ${task}`,
    deleted: `Deleted ${task}`,
  };
  return messages[activity.type] || "Checklist updated";
}

function handleStorageChange(event) {
  if (event.key !== STORAGE_KEY) return;
  state.data = loadData();
  if (state.activeChecklistId && findChecklist(state.activeChecklistId)) {
    renderActiveChecklist();
  } else {
    showLibrary(false, false);
  }
}

function loadCheckyHistory() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CHECKY_HISTORY_KEY));
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((message) => message?.role === "user" || message?.role === "assistant")
      .map((message) => ({
        role: message.role,
        text: cleanText(message.text).slice(0, 1200),
        actionText: cleanText(message.actionText).slice(0, 160),
      }))
      .filter((message) => message.text)
      .slice(-18);
  } catch (error) {
    console.warn("Checky chat history could not be read", error);
    return [];
  }
}

function saveCheckyHistory() {
  try {
    localStorage.setItem(CHECKY_HISTORY_KEY, JSON.stringify(state.checkyMessages));
  } catch (error) {
    console.warn("Checky chat history could not be saved", error);
  }
}

function loadData() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(parsed)) {
      return { version: STORE_VERSION, activeChecklistId: null, checklists: parsed.map(normalizeChecklist) };
    }
    if (parsed && Array.isArray(parsed.checklists)) {
      return {
        version: STORE_VERSION,
        activeChecklistId: typeof parsed.activeChecklistId === "string" ? parsed.activeChecklistId : null,
        checklists: parsed.checklists.map(normalizeChecklist),
      };
    }
  } catch (error) {
    console.warn("Saved checklist data could not be read", error);
  }
  return { version: STORE_VERSION, activeChecklistId: null, checklists: [] };
}

function normalizeChecklist(checklist) {
  const now = Date.now();
  return {
    id: typeof checklist?.id === "string" ? checklist.id : createId("list"),
    name: cleanText(checklist?.name) || "Untitled checklist",
    createdAt: toTimestamp(checklist?.createdAt, now),
    updatedAt: toTimestamp(checklist?.updatedAt, now),
    tasks: Array.isArray(checklist?.tasks) ? checklist.tasks.map(normalizeTask) : [],
    activity: Array.isArray(checklist?.activity)
      ? checklist.activity.map(normalizeActivity).slice(0, MAX_ACTIVITY_ITEMS)
      : [],
  };
}

function normalizeTask(task) {
  return {
    id: typeof task?.id === "string" ? task.id : createId("task"),
    text: cleanText(task?.text) || "Untitled task",
    completed: Boolean(task?.completed),
    createdAt: toTimestamp(task?.createdAt, Date.now()),
    completedAt: task?.completed ? toTimestamp(task?.completedAt, Date.now()) : null,
  };
}

function normalizeActivity(activity) {
  return {
    id: typeof activity?.id === "string" ? activity.id : createId("activity"),
    type: typeof activity?.type === "string" ? activity.type : "updated",
    taskText: cleanText(activity?.taskText),
    timestamp: toTimestamp(activity?.timestamp, Date.now()),
  };
}

function saveData(silent = false) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
    return true;
  } catch (error) {
    console.error("Checklist data could not be saved", error);
    if (!silent) showToast("This browser could not save that change. Check its storage settings.", "error");
    return false;
  }
}

function commitData() {
  if (saveData()) return true;

  const activeChecklistId = state.activeChecklistId;
  state.data = loadData();
  if (activeChecklistId && findChecklist(activeChecklistId)) {
    state.activeChecklistId = activeChecklistId;
  } else {
    state.activeChecklistId = null;
  }
  return false;
}

function getActiveChecklist() {
  return findChecklist(state.activeChecklistId);
}

function findChecklist(checklistId) {
  return state.data.checklists.find((checklist) => checklist.id === checklistId);
}

function sortedChecklists() {
  return [...state.data.checklists].sort((left, right) => right.updatedAt - left.updatedAt);
}

function touchChecklist(checklist, timestamp = Date.now()) {
  checklist.updatedAt = timestamp;
}

function cleanText(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function normalizeSearch(value) {
  return cleanText(value).toLocaleLowerCase();
}

function matchesSearch(value, searchTerm) {
  return String(value || "").toLocaleLowerCase().includes(searchTerm);
}

function createId(prefix) {
  if (typeof crypto.randomUUID === "function") return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function toTimestamp(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function formatDate(timestamp) {
  const value = Number(timestamp);
  if (!value) return "just now";
  const date = new Date(value);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function relativeTime(timestamp) {
  const value = Number(timestamp);
  if (!value) return "Just now";
  const seconds = Math.max(0, Math.floor((Date.now() - value) / 1000));
  if (seconds < 45) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(value).toLocaleDateString([], { month: "short", day: "numeric" });
}

function showMessage(element, message) {
  element.textContent = message;
}

function clearMessage(element) {
  element.textContent = "";
}

function showToast(message, type = "") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`.trim();
  toast.textContent = message;
  elements.toastRegion.append(toast);
  window.setTimeout(() => toast.remove(), 3800);
}
