# My Checklists

A private, responsive checklist app that saves multiple lists directly in the browser. It uses plain HTML, CSS, and JavaScript, so it works on GitHub Pages without Firebase, accounts, a server, or a build step.

## Features

- Create and switch between multiple personal checklists
- Search saved checklists and filter tasks by name
- Add, complete, reopen, edit, and delete tasks
- Add tasks from a focused popup instead of typing into the search bar
- Ask **Checky Lite**, the free offline rabbit helper, for website help or a ready-made checklist
- Let Checky Lite create checklists from built-in templates and add tasks by command
- Incomplete tasks appear before completed tasks
- Progress totals and progress bars update immediately
- Recent activity is kept separately for each checklist
- The last open checklist is restored after a refresh
- Everything is stored locally on the current device
- Responsive controls for desktop, iPhone, and Android

## How saving works

The app stores checklist data in the browser's `localStorage` under the key:

```text
myChecklists.data.v1
```

Saving is automatic after every change. The app does not send checklist names, tasks, or activity to a server.

**Checky Lite also runs entirely in the browser.** Its templates and command matching are included in `app.js`, so messages, checklist names, and tasks never leave the device.

Important limitations:

- Checklists do not sync between different devices or different browsers.
- Clearing browser site data deletes the saved checklists.
- Private/incognito windows may erase data when the window closes.
- Another person using the same browser profile can open the checklists.
- Browser storage is convenient, but it is not a substitute for a backup of important information.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Checklist library, task workspace, dialogs, Checky panel, and social metadata |
| `style.css` | Responsive visual design |
| `app.js` | Checklist behavior, local device storage, and Checky Lite’s templates and commands |
| `assets/checky.png` | Checky's face-only rabbit mascot |
| `og.png` | Social sharing image |
| `.nojekyll` | Makes GitHub Pages serve the static files as-is |

Firebase configuration, authentication, database code, and database rules are no longer used.

## Run locally

You can open `index.html` directly, but a small local server more closely matches GitHub Pages. Every feature, including Checky Lite, works without a backend.

From this repository folder, use one of these commands:

```powershell
# Windows, if the Python launcher is installed
py -m http.server 5500
```

```bash
# macOS or Linux
python3 -m http.server 5500
```

Then open [http://localhost:5500](http://localhost:5500).

You can also use the **Live Server** extension in Visual Studio Code.

## Checky Lite

Checky Lite needs no API key, subscription, account, server function, or internet connection. It recognizes checklist commands locally and includes templates for kitchen essentials, travel packing, groceries, home cleaning, moving, school supplies, a gym bag, a morning routine, bathroom essentials, and a first apartment.

It is intentionally smaller than ChatGPT: it cannot answer unlimited general questions or invent a complete list for every possible topic. Ask **“what can you do?”** in the chat to see its supported help.

## Publish with GitHub Pages

1. Commit and push the files to GitHub:

   ```bash
   git add .
   git commit -m "Convert app to personal local checklists"
   git push origin main
   ```

2. Open the repository on GitHub.
3. Select **Settings > Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select the `main` branch and `/(root)` folder.
6. Select **Save**.
7. Open `https://adamfungus.github.io/CheckList/` after the deployment finishes.

All checklist features and Checky Lite work on GitHub Pages without environment variables, API keys, Firebase, or external service settings.

## Quick test

1. Create two checklists.
2. Add several tasks to each one.
3. Search for a task, then clear the search and confirm every task returns.
4. Select **Add**, create a task in the popup, and confirm it appears in the list.
5. Complete, reopen, and edit a task.
6. Switch between the lists and confirm each keeps its own tasks and activity.
7. Refresh the page and confirm the last open list returns.
8. Return to **All checklists**, search by checklist name, and confirm the matching list is shown.
9. Delete a task and a checklist, confirming that the app asks before deleting.
10. Ask Checky Lite to create a kitchen essentials checklist.
11. Ask Checky how saving works and confirm it answers without changing a list.
