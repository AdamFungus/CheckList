// Paste the exact configuration object from Firebase Console > Project settings > Your apps.
// These values identify your Firebase project; database access is protected by Authentication
// and the rules in firebase-rules.json, not by hiding this browser configuration.
export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "YOUR_DATABASE_URL",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.firebasestorage.app",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
};

export function isFirebaseConfigured() {
  return (
    firebaseConfig.apiKey !== "YOUR_API_KEY" &&
    !firebaseConfig.projectId.startsWith("YOUR_") &&
    firebaseConfig.databaseURL.startsWith("https://")
  );
}
