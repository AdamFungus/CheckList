# Party Checklist

A responsive shared checklist for party planning. One person creates a party, shares its Party ID and password, and everyone sees tasks, members, progress, and recent activity update in real time.

The app is plain HTML, CSS, and JavaScript. It runs directly on GitHub Pages with no build step. Firebase provides Anonymous Authentication and the Realtime Database.

## What is included

- Create or join a password-protected party
- Random 10-character Party IDs with a copy button
- Anonymous browser identities and remembered sessions
- Realtime add, complete, reopen, edit, and delete actions
- Incomplete-first sorting and a live progress bar
- Member list, recent activity, and connection status
- Responsive, keyboard-friendly controls for desktop and mobile
- PBKDF2-SHA-256 password hashing in the browser
- Database rules that require Firebase Authentication, isolate party reads to members, and validate writes

## Files

| File | Purpose |
| --- | --- |
| `index.html` | App screens, forms, checklist, dialogs, and social metadata |
| `style.css` | Responsive visual design |
| `app.js` | UI state, validation, rendering, and remembered session |
| `firebase-config.js` | Your Firebase web app configuration |
| `firebase-service.js` | Authentication, password hashing, and realtime database operations |
| `firebase-rules.json` | Recommended Realtime Database rules |
| `og.png` | Social sharing card |
| `.nojekyll` | Tells GitHub Pages to serve the static files as-is |

## Before the app can work

You must complete all four of these Firebase settings:

1. Create a Realtime Database.
2. Enable Anonymous Authentication.
3. Paste your Firebase web configuration into `firebase-config.js`.
4. Publish the contents of `firebase-rules.json` as your database rules.

The website intentionally shows **Setup needed** until the configuration placeholders are replaced.

## Step-by-step Firebase setup

### 1. Create a Firebase project

1. Open the [Firebase console](https://console.firebase.google.com/).
2. Select **Create a project**.
3. Enter a project name such as `party-checklist`.
4. Google Analytics is optional for this app. You can leave it disabled.
5. Select **Create project**, then wait for setup to finish.

### 2. Create the Realtime Database

1. Open your new Firebase project.
2. In the left sidebar, select **Build > Realtime Database**.
3. Select **Create Database**.
4. Choose the region closest to most of your users. The database region cannot be changed later.
5. Choose **Start in locked mode**. Do not use permanent public read/write rules.
6. Select **Enable**.
7. Copy the database URL shown near the top of the Data page. It normally looks like one of these:
   - `https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com`
   - `https://YOUR_DATABASE_NAME.REGION.firebasedatabase.app`

### 3. Enable Anonymous Authentication

1. In Firebase, select **Build > Authentication**.
2. Select **Get started** if Authentication has not been initialized.
3. Open the **Sign-in method** tab.
4. Select **Anonymous**.
5. Turn on **Enable**, then select **Save**.

Anonymous Authentication gives each browser a Firebase user ID. It is what lets the rules keep unrelated party data separate without requiring permanent user accounts.

### 4. Register a Firebase web app

1. Select the gear beside **Project Overview**, then **Project settings**.
2. Scroll to **Your apps**.
3. Select the web icon (`</>`).
4. Enter a nickname such as `Party Checklist Web`.
5. Do not enable Firebase Hosting; this project uses GitHub Pages.
6. Select **Register app**.

### 5. Find and copy `firebaseConfig`

Firebase displays an object similar to this:

```js
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  databaseURL: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

If you closed that screen, return to **Project settings > General > Your apps**, choose the web app, and select **Config** under SDK setup and configuration.

### 6. Put the configuration into the project

Open `firebase-config.js` and replace every placeholder value with the values from your Firebase project. Make sure `databaseURL` is present; add the URL from step 2 if Firebase did not include it automatically.

The file should still export the object:

```js
export const firebaseConfig = {
  apiKey: "your-real-value",
  authDomain: "your-real-value",
  databaseURL: "https://your-real-database-url",
  projectId: "your-real-value",
  storageBucket: "your-real-value",
  messagingSenderId: "your-real-value",
  appId: "your-real-value"
};
```

Firebase web configuration is visible to visitors by design. Your protection comes from Firebase Authentication and Database Security Rules, so completing the next step is essential.

### 7. Add the database security rules

1. Open `firebase-rules.json` in this repository and copy the entire file.
2. In Firebase, open **Build > Realtime Database > Rules**.
3. Replace the current editor contents with the copied JSON.
4. Select **Publish**.

These rules do not use `".read": true` or `".write": true` globally. They require an authenticated Firebase user, only allow party data to be read by a party member, constrain membership writes to the current user's UID, keep party metadata immutable, and validate task/activity shapes and sizes.

### 8. Add authorized domains

1. In Firebase, open **Build > Authentication > Settings**.
2. Find **Authorized domains**.
3. Add `adamfungus.github.io` for this repository's GitHub Pages site.
4. For local testing, add `localhost` if it is not already listed. Firebase projects created after April 28, 2025 do not add it automatically.

Only enter the hostname—do not include `https://` or `/CheckList/`.

## Test locally

ES modules do not work reliably when `index.html` is opened with a `file://` address. Use a small local web server instead.

From the repository folder, choose one option:

```powershell
# Windows, if the Python launcher is installed
py -m http.server 5500
```

```bash
# macOS or Linux
python3 -m http.server 5500
```

You can also use the **Live Server** extension in Visual Studio Code.

Then open [http://localhost:5500](http://localhost:5500). A green **Connected** status means Firebase initialized successfully.

### Test the full realtime flow

1. In a normal browser window, create a party and copy its Party ID.
2. Open a private/incognito window or a different browser/device.
3. Join using the Party ID, password, and a different display name.
4. Add a task in the first window. It should appear in the second without refreshing.
5. Complete the task in the second window. The checkmark, progress, completion name, and activity should update in the first.
6. Test reopening, editing, and deleting the task.
7. Refresh both windows. Each should return to the joined party without storing or re-entering the party password.
8. Select **Leave party** in one window. That browser should return to the start screen and disappear from the member list.

If you see **Connection error**, verify the config values, Anonymous provider, authorized domain, database URL, and published rules. The browser developer console may contain a more specific Firebase error.

## Push the project to GitHub

This folder is already connected to `https://github.com/AdamFungus/CheckList.git`. After reviewing your Firebase configuration:

```bash
git add .
git commit -m "Build realtime Party Checklist app"
git push origin main
```

If your default branch has a different name, replace `main` with that branch name. Do not put unrelated private keys, service-account JSON, or server credentials in this repository. The normal Firebase web `firebaseConfig` object is not a secret.

## Turn on GitHub Pages

1. Open the repository on GitHub.
2. Select **Settings**.
3. In the sidebar, select **Pages**.
4. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
5. Select the `main` branch and the `/(root)` folder.
6. Select **Save**.
7. Wait for GitHub to finish the Pages deployment.
8. Open `https://adamfungus.github.io/CheckList/`.

If the site URL differs, copy the exact URL from **Settings > Pages** and add its hostname to Firebase Authentication's authorized domains.

## Security limitations

The party password is never stored in plaintext or in `localStorage`. A random salt and a PBKDF2-SHA-256 derived hash are stored in Firebase; only the Party ID and display name are remembered locally. The Firebase anonymous session itself is persisted by the Firebase SDK.

This is still lightweight protection for a small personal project—not secure server-side authentication:

- The password comparison happens in browser code that visitors can inspect or modify.
- An authenticated client that knows a valid Party ID can read its salt/hash and could bypass the UI's password check to add its own membership.
- A weak password can be guessed offline after obtaining the hash.
- Anonymous accounts are tied to browser storage and are not recoverable permanent accounts.
- Do not use this app for confidential, financial, health, safety, or other sensitive information.

The rules meaningfully reduce accidental cross-party access: they deny database-wide reads, require Firebase Authentication, gate checklist reads by member UID, and validate writes. They cannot turn a client-only shared password into a strong authorization system.

For stronger security, move the password verification to a trusted backend such as a Firebase Callable Cloud Function, issue membership with custom claims or server-controlled records, rate-limit join attempts, enable App Check, and consider permanent user accounts. Structure is separated in `firebase-service.js` so that upgrade can be made without redesigning the interface.

## Firebase SDK version

The app uses Firebase's modular browser SDK from the official CDN, pinned consistently to version `12.18.0` in `firebase-service.js`. If you update it later, change all three Firebase import URLs to the same release and repeat the two-browser realtime test.

## Useful official documentation

- [Add Firebase to a JavaScript project](https://firebase.google.com/docs/web/setup)
- [Use Firebase browser modules](https://firebase.google.com/docs/web/alt-setup)
- [Anonymous Authentication for web](https://firebase.google.com/docs/auth/web/anonymous-auth)
- [Realtime Database web reads and writes](https://firebase.google.com/docs/database/web/read-and-write)
- [Realtime Database Security Rules](https://firebase.google.com/docs/database/security)
- [Configure a GitHub Pages publishing source](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
