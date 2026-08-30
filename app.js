const STORAGE_KEY = "myChecklists.data.v1";
const STORE_VERSION = 1;
const MAX_ACTIVITY_ITEMS = 50;

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
  checklistTitle: document.querySelector("#checklist-title"),
  backToListsButton: document.querySelector("#back-to-lists-button"),
  deleteChecklistButton: document.querySelector("#delete-checklist-button"),
  newChecklistButton: document.querySelector("#new-checklist-button"),
  taskForm: document.querySelector("#task-form"),
  taskInput: document.querySelector("#task-input"),
  taskError: document.querySelector("#task-error"),
  taskList: document.querySelector("#task-list"),
  taskTemplate: document.querySelector("#task-template"),
  emptyTasks: document.querySelector("#empty-tasks"),
  completedCount: document.querySelector("#completed-count"),
  taskCount: document.querySelector("#task-count"),
  progressPercent: document.querySelector("#progress-percent"),
  progressTrack: document.querySelector(".progress-track"),
  progressFill: document.querySelector("#progress-fill"),
  checklistCount: document.querySelector("#checklist-count"),
  checklistSwitcher: document.querySelector("#checklist-switcher"),
  activityList: document.querySelector("#activity-list"),
  emptyActivity: document.querySelector("#empty-activity"),
  editModal: document.querySelector("#edit-modal"),
  editForm: document.querySelector("#edit-form"),
  editInput: document.querySelector("#edit-task-input"),
  editError: document.querySelector("#edit-error"),
  closeModalButton: document.querySelector("#close-modal-button"),
  cancelEditButton: document.querySelector("#cancel-edit-button"),
  toastRegion: document.querySelector("#toast-region"),
};

const state = {
  data: loadData(),
  activeChecklistId: null,
  editingTaskId: null,
};

bindInterface();
restoreLastView();

function bindInterface() {
  elements.brand.addEventListener("click", (event) => {
    event.preventDefault();
    showLibrary();
  });
  elements.createForm.addEventListener("submit", handleCreateChecklist);
  elements.backToListsButton.addEventListener("click", () => showLibrary());
  elements.newChecklistButton.addEventListener("click", () => showLibrary(true));
  elements.deleteChecklistButton.addEventListener("click", () => deleteChecklist(state.activeChecklistId));
  elements.taskForm.addEventListener("submit", handleAddTask);
  elements.editForm.addEventListener("submit", handleEditTask);
  elements.closeModalButton.addEventListener("click", closeEditModal);
  elements.cancelEditButton.addEventListener("click", closeEditModal);
  elements.editModal.addEventListener("click", (event) => {
    if (event.target === elements.editModal) closeEditModal();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !elements.editModal.hidden) closeEditModal();
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
  if (persist) saveData();

  elements.welcomeView.hidden = true;
  elements.checklistView.hidden = false;
  renderActiveChecklist();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showLibrary(focusName = false, persist = true) {
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
  const checklists = sortedChecklists();
  elements.savedListCount.textContent = String(checklists.length);
  elements.savedListGrid.replaceChildren();
  elements.emptyLibrary.hidden = checklists.length > 0;

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
  const tasks = [...checklist.tasks].sort((left, right) => {
    if (left.completed !== right.completed) return Number(left.completed) - Number(right.completed);
    return left.createdAt - right.createdAt;
  });

  elements.taskList.replaceChildren();
  elements.emptyTasks.hidden = tasks.length > 0;

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

function handleAddTask(event) {
  event.preventDefault();
  const checklist = getActiveChecklist();
  const text = cleanText(elements.taskInput.value);

  if (!checklist) return;
  if (!text) {
    showMessage(elements.taskError, "Add a short description before saving this task.");
    elements.taskInput.focus();
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
  elements.taskInput.value = "";
  clearMessage(elements.taskError);
  renderActiveChecklist();
  elements.taskInput.focus();
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
  document.body.style.overflow = "hidden";
  requestAnimationFrame(() => {
    elements.editInput.focus();
    elements.editInput.select();
  });
}

function closeEditModal() {
  state.editingTaskId = null;
  elements.editModal.hidden = true;
  document.body.style.overflow = "";
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
