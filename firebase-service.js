import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import {
  browserLocalPersistence,
  getAuth,
  onAuthStateChanged,
  setPersistence,
  signInAnonymously,
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import {
  get,
  getDatabase,
  limitToLast,
  onValue,
  orderByChild,
  push,
  query,
  ref,
  remove,
  serverTimestamp,
  set,
  update,
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-database.js";
import { firebaseConfig } from "./firebase-config.js";

const PARTY_ID_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const PARTY_ID_LENGTH = 10;
const PASSWORD_ITERATIONS = 210_000;
const MAX_ACTIVITY_ITEMS = 25;

let auth;
let database;
let user;
let connectionUnsubscribe;

export async function initializeFirebase(onConnectionChange) {
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  database = getDatabase(app);

  await setPersistence(auth, browserLocalPersistence);
  user = await getOrCreateAnonymousUser();

  connectionUnsubscribe?.();
  connectionUnsubscribe = onValue(
    ref(database, ".info/connected"),
    (snapshot) => onConnectionChange(Boolean(snapshot.val())),
    () => onConnectionChange(false),
  );

  return user;
}

function getOrCreateAnonymousUser() {
  return new Promise((resolve, reject) => {
    let unsubscribe = () => {};
    unsubscribe = onAuthStateChanged(
      auth,
      async (existingUser) => {
        unsubscribe();
        if (existingUser) {
          resolve(existingUser);
          return;
        }

        try {
          resolve((await signInAnonymously(auth)).user);
        } catch (error) {
          reject(error);
        }
      },
      reject,
    );
  });
}

export async function createParty({ partyName, displayName, password }) {
  requireReady();
  const partyId = await createUniquePartyId();
  const passwordSalt = createSalt();
  const passwordHash = await hashPassword(password, passwordSalt);
  const activityId = push(ref(database, `parties/${partyId}/activity`)).key;

  const updates = {
    [`partyAccess/${partyId}`]: {
      creatorUid: user.uid,
      passwordHash,
      passwordSalt,
      createdAt: serverTimestamp(),
    },
    [`parties/${partyId}`]: {
      name: partyName,
      createdBy: user.uid,
      createdAt: serverTimestamp(),
      members: {
        [user.uid]: {
          name: displayName,
          joinedAt: serverTimestamp(),
        },
      },
      activity: {
        [activityId]: createActivity("created-party", displayName, ""),
      },
    },
  };

  await update(ref(database), updates);
  return { partyId, displayName };
}

export async function joinParty({ partyId, displayName, password }) {
  requireReady();
  const normalizedId = normalizePartyId(partyId);
  const accessSnapshot = await get(ref(database, `partyAccess/${normalizedId}`));

  if (!accessSnapshot.exists()) {
    throw serviceError("PARTY_NOT_FOUND", "That Party ID does not exist.");
  }

  const access = accessSnapshot.val();
  const candidateHash = await hashPassword(password, access.passwordSalt);
  if (!constantTimeEqual(candidateHash, access.passwordHash)) {
    throw serviceError("INCORRECT_PASSWORD", "That password does not match this party.");
  }

  // The party data is member-only, so create this browser's membership before reading it.
  await set(ref(database, `parties/${normalizedId}/members/${user.uid}`), {
    name: displayName,
    joinedAt: serverTimestamp(),
  });
  await writeActivity(normalizedId, "joined", displayName, "");

  return { partyId: normalizedId, displayName };
}

export async function restorePartySession({ partyId, displayName }) {
  requireReady();
  const normalizedId = normalizePartyId(partyId);

  try {
    const memberSnapshot = await get(
      ref(database, `parties/${normalizedId}/members/${user.uid}`),
    );
    if (!memberSnapshot.exists()) return null;

    return {
      partyId: normalizedId,
      displayName: memberSnapshot.val().name || displayName,
    };
  } catch {
    return null;
  }
}

export function subscribeToParty(partyId, callbacks) {
  requireReady();
  const unsubscriptions = [];

  unsubscriptions.push(
    onValue(
      ref(database, `parties/${partyId}/name`),
      (snapshot) => callbacks.onPartyName(snapshot.val() || "Party Checklist"),
      callbacks.onError,
    ),
  );
  unsubscriptions.push(
    onValue(
      ref(database, `parties/${partyId}/members`),
      (snapshot) => callbacks.onMembers(snapshot.val() || {}),
      callbacks.onError,
    ),
  );
  unsubscriptions.push(
    onValue(
      ref(database, `parties/${partyId}/tasks`),
      (snapshot) => callbacks.onTasks(snapshot.val() || {}),
      callbacks.onError,
    ),
  );

  const activityQuery = query(
    ref(database, `parties/${partyId}/activity`),
    orderByChild("timestamp"),
    limitToLast(MAX_ACTIVITY_ITEMS),
  );
  unsubscriptions.push(
    onValue(
      activityQuery,
      (snapshot) => callbacks.onActivity(snapshot.val() || {}),
      callbacks.onError,
    ),
  );

  return () => unsubscriptions.forEach((unsubscribe) => unsubscribe());
}

export async function addTask(partyId, text, displayName) {
  requireReady();
  const taskRef = push(ref(database, `parties/${partyId}/tasks`));
  const activityRef = push(ref(database, `parties/${partyId}/activity`));
  const task = {
    id: taskRef.key,
    text,
    completed: false,
    createdBy: user.uid,
    createdByName: displayName,
    createdAt: serverTimestamp(),
    completedBy: "",
    completedByName: "",
    completedAt: 0,
  };

  await update(ref(database), {
    [`parties/${partyId}/tasks/${taskRef.key}`]: task,
    [`parties/${partyId}/activity/${activityRef.key}`]: createActivity(
      "added",
      displayName,
      text,
    ),
  });
}

export async function setTaskCompleted(partyId, task, completed, displayName) {
  requireReady();
  const activityRef = push(ref(database, `parties/${partyId}/activity`));
  const taskUpdates = completed
    ? {
        completed: true,
        completedBy: user.uid,
        completedByName: displayName,
        completedAt: serverTimestamp(),
      }
    : {
        completed: false,
        completedBy: "",
        completedByName: "",
        completedAt: 0,
      };

  await update(ref(database), {
    [`parties/${partyId}/tasks/${task.id}/completed`]: taskUpdates.completed,
    [`parties/${partyId}/tasks/${task.id}/completedBy`]: taskUpdates.completedBy,
    [`parties/${partyId}/tasks/${task.id}/completedByName`]: taskUpdates.completedByName,
    [`parties/${partyId}/tasks/${task.id}/completedAt`]: taskUpdates.completedAt,
    [`parties/${partyId}/activity/${activityRef.key}`]: createActivity(
      completed ? "completed" : "reopened",
      displayName,
      task.text,
    ),
  });
}

export async function editTask(partyId, task, text, displayName) {
  requireReady();
  const activityRef = push(ref(database, `parties/${partyId}/activity`));

  await update(ref(database), {
    [`parties/${partyId}/tasks/${task.id}/text`]: text,
    [`parties/${partyId}/activity/${activityRef.key}`]: createActivity(
      "edited",
      displayName,
      text,
    ),
  });
}

export async function deleteTask(partyId, task, displayName) {
  requireReady();
  const activityRef = push(ref(database, `parties/${partyId}/activity`));

  await update(ref(database), {
    [`parties/${partyId}/tasks/${task.id}`]: null,
    [`parties/${partyId}/activity/${activityRef.key}`]: createActivity(
      "deleted",
      displayName,
      task.text,
    ),
  });
}

export async function leaveParty(partyId, displayName) {
  requireReady();
  try {
    await writeActivity(partyId, "left", displayName, "");
  } finally {
    await remove(ref(database, `parties/${partyId}/members/${user.uid}`));
  }
}

async function createUniquePartyId() {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const id = generatePartyId();
    const snapshot = await get(ref(database, `partyAccess/${id}`));
    if (!snapshot.exists()) return id;
  }
  throw serviceError("ID_GENERATION_FAILED", "Could not create a Party ID. Please try again.");
}

function generatePartyId() {
  const bytes = crypto.getRandomValues(new Uint8Array(PARTY_ID_LENGTH));
  return Array.from(bytes, (byte) => PARTY_ID_ALPHABET[byte % PARTY_ID_ALPHABET.length]).join("");
}

function normalizePartyId(partyId) {
  return String(partyId).trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function createSalt() {
  return bytesToBase64(crypto.getRandomValues(new Uint8Array(16)));
}

// Client-side PBKDF2-SHA-256 is lightweight protection for a small personal project.
// Because comparison happens in browser code, it is not equivalent to secure server-side
// password authentication. See README.md for the full limitations and upgrade path.
async function hashPassword(password, saltBase64) {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: base64ToBytes(saltBase64),
      iterations: PASSWORD_ITERATIONS,
    },
    keyMaterial,
    256,
  );
  return bytesToBase64(new Uint8Array(derivedBits));
}

function bytesToBase64(bytes) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function base64ToBytes(value) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

function constantTimeEqual(left, right) {
  if (typeof left !== "string" || typeof right !== "string" || left.length !== right.length) {
    return false;
  }
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

function createActivity(type, userName, taskText) {
  return {
    type,
    userId: user.uid,
    userName,
    taskText,
    timestamp: serverTimestamp(),
  };
}

async function writeActivity(partyId, type, displayName, taskText) {
  await set(
    push(ref(database, `parties/${partyId}/activity`)),
    createActivity(type, displayName, taskText),
  );
}

function requireReady() {
  if (!database || !user) {
    throw serviceError("FIREBASE_NOT_READY", "Firebase is not ready yet.");
  }
}

function serviceError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}
