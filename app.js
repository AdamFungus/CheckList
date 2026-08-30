import { isFirebaseConfigured } from "./firebase-config.js";

const SESSION_KEY = "partyChecklist.session.v1";

const elements = {
  modeTabs: document.querySelectorAll("[data-mode]"),
  createPanel: document.querySelector("#create-panel"),
  joinPanel: document.querySelector("#join-panel"),
  createForm: document.querySelector("#create-form"),
  joinForm: document.querySelector("#join-form"),
  createError: document.querySelector("#create-error"),
  joinError: document.querySelector("#join-error"),
  welcomeView: document.querySelector("#welcome-view"),
  checklistView: document.querySelector("#checklist-view"),
  connectionStatus: document.querySelector("#connection-status"),
  statusLabel: document.querySelector("#connection-status .status-label"),
  partyTitle: document.querySelector("#party-title"),
  currentUserName: document.querySelector("#current-user-name"),
  partyCode: document.querySelector("#party-code"),
  copyCodeButton: document.querySelector("#copy-code-button"),
  leaveButton: document.querySelector("#leave-button"),
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
  memberCount: document.querySelector("#member-count"),
  memberList: document.querySelector("#member-list"),
  emptyActivity: document.querySelector("#empty-activity"),
  activityList: document.querySelector("#activity-list"),
  editModal: document.querySelector("#edit-modal"),
  editForm: document.querySelector("#edit-form"),
  editInput: document.querySelector("#edit-task-input"),
  editError: document.querySelector("#edit-error"),
  closeModalButton: document.querySelector("#close-modal-button"),
  cancelEditButton: document.querySelector("#cancel-edit-button"),
  toastRegion: document.querySelector("#toast-region"),
};

const state = {
  firebase: null,
  userId: "",
  partyId: "",
  displayName: "",
  tasks: [],
  editingTaskId: null,
  unsubscribeParty: null,
};

bindInterface();
startApp();

async function startApp() {
  if (!isFirebaseConfigured()) {
    setConnectionStatus("setup", "Setup needed");
    return;
  }

  setConnectionStatus("connecting", "Connecting…");
  try {
    state.firebase = await import("./firebase-service.js");
    const firebaseUser = await state.firebase.initializeFirebase((connected) => {
      setConnectionStatus(
        connected ? "connected" : "connecting",
        connected ? "Connected" : "Reconnecting…",
      );
    });
    state.userId = firebaseUser.uid;

    const savedSession = readSession();
    if (savedSession) {
      const restored = await state.firebase.restorePartySession(savedSession);
      if (restored) enterParty(restored);
      else clearSession();
    }
  } catch (error) {
    console.error("Firebase initialization failed", error);
    setConnectionStatus("error", "Connection error");
    showToast("Could not connect to Firebase. Check your configuration and try again.", "error");
  }
}

function bindInterface() {
  elements.modeTabs.forEach((tab) => {
    tab.addEventListener("click", () => setMode(tab.dataset.mode));
  });
  document.querySelectorAll("[data-password-toggle]").forEach((button) => {
    button.addEventListener("click", () => togglePassword(button));
  });

  elements.createForm.addEventListener("submit", handleCreateParty);
  elements.joinForm.addEventListener("submit", handleJoinParty);
  elements.taskForm.addEventListener("submit", handleAddTask);
  elements.copyCodeButton.addEventListener("click", copyPartyId);
  elements.leaveButton.addEventListener("click", handleLeaveParty);
  elements.editForm.addEventListener("submit", handleEditTask);
  elements.closeModalButton.addEventListener("click", closeEditModal);
  elements.cancelEditButton.addEventListener("click", closeEditModal);
  elements.editModal.addEventListener("click", (event) => {
    if (event.target === elements.editModal) closeEditModal();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !elements.editModal.hidden) closeEditModal();
  });
}

async function handleCreateParty(event) {
  event.preventDefault();
  clearMessage(elements.createError);
  if (!requireFirebase(elements.createError)) return;

  const formData = new FormData(elements.createForm);
  const partyName = cleanText(formData.get("partyName"));
  const displayName = cleanText(formData.get("displayName"));
  const password = String(formData.get("password") || "");
  const validationError = validatePartyForm({ partyName, displayName, password });

  if (validationError) {
    showMessage(elements.createError, validationError);
    return;
  }

  const submitButton = elements.createForm.querySelector("button[type='submit']");
  setButtonBusy(submitButton, true, "Creating…");
  try {
    const session = await state.firebase.createParty({ partyName, displayName, password });
    writeSession(session);
    elements.createForm.reset();
    enterParty(session);
    showToast("Party created — share the Party ID with your crew.", "success");
  } catch (error) {
    handleFormError(error, elements.createError, "We could not create the party. Please try again.");
  } finally {
    setButtonBusy(submitButton, false, "Create party", true);
  }
}

async function handleJoinParty(event) {
  event.preventDefault();
  clearMessage(elements.joinError);
  if (!requireFirebase(elements.joinError)) return;

  const formData = new FormData(elements.joinForm);
  const partyId = normalizePartyId(formData.get("partyId"));
  const displayName = cleanText(formData.get("displayName"));
  const password = String(formData.get("password") || "");

  if (!partyId) {
    showMessage(elements.joinError, "Enter the Party ID your friend shared with you.");
    return;
  }
  if (!displayName) {
    showMessage(elements.joinError, "Enter the name your friends will see.");
    return;
  }
  if (!password) {
    showMessage(elements.joinError, "Enter the party password.");
    return;
  }

  const submitButton = elements.joinForm.querySelector("button[type='submit']");
  setButtonBusy(submitButton, true, "Joining…");
  try {
    const session = await state.firebase.joinParty({ partyId, displayName, password });
    writeSession(session);
    elements.joinForm.reset();
    enterParty(session);
    showToast("You’re in! This checklist is now live.", "success");
  } catch (error) {
    handleFormError(error, elements.joinError, "We could not join that party. Please try again.");
  } finally {
    setButtonBusy(submitButton, false, "Join party", true);
  }
}

function enterParty({ partyId, displayName }) {
  state.unsubscribeParty?.();
  state.partyId = partyId;
  state.displayName = displayName;
  state.tasks = [];

  elements.partyCode.textContent = partyId;
  elements.currentUserName.textContent = displayName;
  elements.welcomeView.hidden = true;
  elements.checklistView.hidden = false;
  renderTasks({});
  renderMembers({});
  renderActivity({});

  state.unsubscribeParty = state.firebase.subscribeToParty(partyId, {
    onPartyName: (name) => {
      elements.partyTitle.textContent = name;
      document.title = `${name} · Party Checklist`;
    },
    onMembers: renderMembers,
    onTasks: renderTasks,
    onActivity: renderActivity,
    onError: (error) => {
      console.error("Realtime subscription failed", error);
      showToast("The live connection was interrupted. We’ll keep trying.", "error");
    },
  });

  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function handleAddTask(event) {
  event.preventDefault();
  clearMessage(elements.taskError);
  const text = cleanText(elements.taskInput.value);
  if (!text) {
    showMessage(elements.taskError, "Add a short description before saving this task.");
    elements.taskInput.focus();
    return;
  }

  const submitButton = elements.taskForm.querySelector("button[type='submit']");
  setButtonBusy(submitButton, true, "Adding…");
  try {
    await state.firebase.addTask(state.partyId, text, state.displayName);
    elements.taskInput.value = "";
    elements.taskInput.focus();
  } catch (error) {
    handleFormError(error, elements.taskError, "That task could not be added. Please try again.");
  } finally {
    setButtonBusy(submitButton, false, "Add");
  }
}

function renderTasks(taskMap) {
  state.tasks = Object.entries(taskMap)
    .map(([id, task]) => ({ ...task, id: task.id || id }))
    .sort((left, right) => {
      if (left.completed !== right.completed) return Number(left.completed) - Number(right.completed);
      return numberOrMax(left.createdAt) - numberOrMax(right.createdAt);
    });

  elements.taskList.replaceChildren();
  elements.emptyTasks.hidden = state.tasks.length > 0;

  state.tasks.forEach((task) => {
    const fragment = elements.taskTemplate.content.cloneNode(true);
    const item = fragment.querySelector(".task-item");
    const checkButton = fragment.querySelector(".task-check");
    const text = fragment.querySelector(".task-text");
    const meta = fragment.querySelector(".task-meta");
    const editButton = fragment.querySelector(".edit-task-button");
    const deleteButton = fragment.querySelector(".delete-task-button");

    item.dataset.taskId = task.id;
    item.classList.toggle("completed", Boolean(task.completed));
    text.textContent = task.text;
    meta.textContent = task.completed && task.completedByName
      ? `Completed by ${task.completedByName}`
      : `Added by ${task.createdByName || "a party member"}`;
    checkButton.setAttribute(
      "aria-label",
      task.completed ? `Reopen ${task.text}` : `Complete ${task.text}`,
    );

    checkButton.addEventListener("click", () => toggleTask(task, checkButton));
    editButton.addEventListener("click", () => openEditModal(task));
    deleteButton.addEventListener("click", () => confirmDeleteTask(task, deleteButton));
    elements.taskList.append(fragment);
  });

  updateProgress();
}

async function toggleTask(task, button) {
  button.disabled = true;
  try {
    await state.firebase.setTaskCompleted(
      state.partyId,
      task,
      !task.completed,
      state.displayName,
    );
  } catch (error) {
    showToast(readableError(error, "That task could not be updated."), "error");
  } finally {
    button.disabled = false;
  }
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

async function handleEditTask(event) {
  event.preventDefault();
  const task = state.tasks.find((item) => item.id === state.editingTaskId);
  const text = cleanText(elements.editInput.value);

  if (!task) {
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

  const submitButton = elements.editForm.querySelector("button[type='submit']");
  setButtonBusy(submitButton, true, "Saving…");
  try {
    await state.firebase.editTask(state.partyId, task, text, state.displayName);
    closeEditModal();
    showToast("Task updated.", "success");
  } catch (error) {
    handleFormError(error, elements.editError, "That edit could not be saved.");
  } finally {
    setButtonBusy(submitButton, false, "Save changes");
  }
}

async function confirmDeleteTask(task, button) {
  const confirmed = window.confirm(`Delete “${task.text}”? This cannot be undone.`);
  if (!confirmed) return;

  button.disabled = true;
  try {
    await state.firebase.deleteTask(state.partyId, task, state.displayName);
    showToast("Task deleted.");
  } catch (error) {
    showToast(readableError(error, "That task could not be deleted."), "error");
    button.disabled = false;
  }
}

function updateProgress() {
  const total = state.tasks.length;
  const completed = state.tasks.filter((task) => task.completed).length;
  const percent = total ? Math.round((completed / total) * 100) : 0;

  elements.completedCount.textContent = String(completed);
  elements.taskCount.textContent = String(total);
  elements.progressPercent.textContent = `${percent}%`;
  elements.progressFill.style.width = `${percent}%`;
  elements.progressTrack.setAttribute("aria-valuenow", String(percent));
}

function renderMembers(memberMap) {
  const members = Object.entries(memberMap)
    .map(([id, member]) => ({ ...member, id }))
    .sort((left, right) => numberOrMax(left.joinedAt) - numberOrMax(right.joinedAt));

  elements.memberCount.textContent = String(members.length);
  elements.memberList.replaceChildren();

  members.forEach((member) => {
    const item = document.createElement("li");
    item.className = "member-item";
    const avatar = document.createElement("span");
    avatar.className = "member-avatar";
    avatar.setAttribute("aria-hidden", "true");
    avatar.textContent = getInitials(member.name);
    const name = document.createElement("span");
    name.textContent = member.name;
    if (member.id === state.userId) name.textContent += " (you)";
    item.append(avatar, name);
    elements.memberList.append(item);
  });
}

function renderActivity(activityMap) {
  const activities = Object.entries(activityMap)
    .map(([id, activity]) => ({ ...activity, id }))
    .sort((left, right) => (Number(right.timestamp) || 0) - (Number(left.timestamp) || 0))
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

async function copyPartyId() {
  try {
    await navigator.clipboard.writeText(state.partyId);
    showToast("Party ID copied.", "success");
  } catch {
    showToast(`Party ID: ${state.partyId}`);
  }
}

async function handleLeaveParty() {
  const confirmed = window.confirm("Leave this party on this device?");
  if (!confirmed) return;

  elements.leaveButton.disabled = true;
  try {
    await state.firebase.leaveParty(state.partyId, state.displayName);
  } catch (error) {
    console.warn("Could not remove member entry while leaving", error);
  } finally {
    state.unsubscribeParty?.();
    state.unsubscribeParty = null;
    state.partyId = "";
    state.displayName = "";
    state.tasks = [];
    clearSession();
    closeEditModal();
    elements.checklistView.hidden = true;
    elements.welcomeView.hidden = false;
    elements.leaveButton.disabled = false;
    document.title = "Party Checklist";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

function setMode(mode) {
  elements.modeTabs.forEach((tab) => {
    const isActive = tab.dataset.mode === mode;
    tab.classList.toggle("active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
  });
  elements.createPanel.hidden = mode !== "create";
  elements.joinPanel.hidden = mode !== "join";
  (mode === "create" ? elements.createPanel : elements.joinPanel).querySelector("input")?.focus();
}

function togglePassword(button) {
  const input = document.querySelector(`#${button.dataset.passwordToggle}`);
  const showPassword = input.type === "password";
  input.type = showPassword ? "text" : "password";
  button.textContent = showPassword ? "Hide" : "Show";
  button.setAttribute("aria-label", `${showPassword ? "Hide" : "Show"} password`);
}

function requireFirebase(messageElement) {
  if (state.firebase) return true;
  showMessage(
    messageElement,
    isFirebaseConfigured()
      ? "Firebase is still connecting. Try again in a moment."
      : "Add your Firebase configuration first. The README walks you through it.",
  );
  return false;
}

function validatePartyForm({ partyName, displayName, password }) {
  if (!partyName) return "Give your party a name.";
  if (!displayName) return "Enter the name your friends will see.";
  if (!password) return "Create a password for this party.";
  if (password.length < 6) return "Use at least 6 characters for the party password.";
  return "";
}

function writeSession(session) {
  localStorage.setItem(
    SESSION_KEY,
    JSON.stringify({ partyId: session.partyId, displayName: session.displayName }),
  );
}

function readSession() {
  try {
    const session = JSON.parse(localStorage.getItem(SESSION_KEY));
    if (!session?.partyId || !session?.displayName) return null;
    return session;
  } catch {
    clearSession();
    return null;
  }
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function setConnectionStatus(stateName, label) {
  elements.connectionStatus.dataset.state = stateName;
  elements.statusLabel.textContent = label;
}

function setButtonBusy(button, busy, label, arrow = false) {
  button.disabled = busy;
  button.textContent = label;
  if (!busy && arrow) {
    const arrowSpan = document.createElement("span");
    arrowSpan.setAttribute("aria-hidden", "true");
    arrowSpan.textContent = "→";
    button.append(arrowSpan);
  }
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
  window.setTimeout(() => toast.remove(), 4200);
}

function handleFormError(error, messageElement, fallback) {
  console.error(error);
  showMessage(messageElement, readableError(error, fallback));
}

function readableError(error, fallback) {
  if (error?.code === "PARTY_NOT_FOUND") return "That Party ID does not exist.";
  if (error?.code === "INCORRECT_PASSWORD") return "That password is not correct.";
  if (String(error?.code).includes("permission-denied")) {
    return "Firebase blocked that change. Check the database rules in the README.";
  }
  if (String(error?.code).includes("network")) {
    return "The connection dropped. Check your internet connection and try again.";
  }
  return fallback;
}

function cleanText(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function normalizePartyId(value) {
  return String(value || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function numberOrMax(value) {
  return Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : Number.MAX_SAFE_INTEGER;
}

function getInitials(name) {
  return String(name)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
}

function activitySentence(activity) {
  const name = activity.userName || "Someone";
  const task = activity.taskText ? `“${activity.taskText}”` : "";
  const actions = {
    "created-party": `${name} created the party`,
    joined: `${name} joined the party`,
    left: `${name} left the party`,
    added: `${name} added ${task}`,
    completed: `${name} completed ${task}`,
    reopened: `${name} reopened ${task}`,
    edited: `${name} edited ${task}`,
    deleted: `${name} deleted ${task}`,
  };
  return actions[activity.type] || `${name} updated the checklist`;
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
  return `${Math.floor(hours / 24)}d ago`;
}
