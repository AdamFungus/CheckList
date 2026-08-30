# My Checklists

A private, responsive checklist app that saves multiple lists directly in the browser. It uses plain HTML, CSS, and JavaScript, so it works on GitHub Pages without Firebase, accounts, a server, or a build step.

## Features

- Create and switch between multiple personal checklists
- Search saved checklists and filter tasks by name
- Add, complete, reopen, edit, and delete tasks
- Add tasks from a focused popup instead of typing into the search bar
- Ask **Checky**, the on-device rabbit AI, for website help or a ready-made checklist
- Let Checky create original checklists and add tasks after validating its suggestions locally
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

**Checky also runs entirely in the browser.** It uses [WebLLM](https://github.com/mlc-ai/web-llm) and the Apache-2.0-licensed [SmolLM2 360M Instruct](https://huggingface.co/HuggingFaceTB/SmolLM2-360M-Instruct) model. Messages, checklist context, and generated replies stay on the device.

The first time you start Checky, the browser downloads about 210 MB of model files and caches them. A compatible browser with WebGPU support is required. The browser may remove the cached model when storage is low, which would require another download.

Important limitations:

- Checklists do not sync between different devices or different browsers.
- Clearing browser site data deletes the saved checklists.
- Private/incognito windows may erase data when the window closes.
- Another person using the same browser profile can open the checklists.
- Browser storage is convenient, but it is not a substitute for a backup of important information.
- Small local models can make mistakes, so review important checklist suggestions.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Checklist library, task workspace, dialogs, Checky panel, and social metadata |
| `style.css` | Responsive visual design |
| `app.js` | Checklist behavior, local storage, model loading, and validated Checky actions |
| `checky-worker.js` | Runs Checky’s open-source model away from the main interface thread |
| `assets/checky.png` | Checky's face-only rabbit mascot |
| `og.png` | Social sharing image |
| `.nojekyll` | Makes GitHub Pages serve the static files as-is |

Firebase configuration, authentication, database code, and database rules are no longer used.

## Run locally

Run the app through a local server. Checky’s model worker and browser cache require an HTTP or HTTPS address rather than opening `index.html` directly.

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

## Start Checky’s local AI

Checky needs no API key, subscription, account, or server function. Open Checky and select **Start local AI**. The first start needs an internet connection to download the WebLLM runtime and the model; later starts use the browser’s cached files when they are still available.

The selected SmolLM2 build is about 207 MB and uses roughly 580 MB of device graphics memory. It is much smaller than cloud AI models, so replies may be slower or less accurate, especially on older phones. If the app says WebGPU is unavailable, try a current browser and device that supports it.

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

All checklist features and Checky work on GitHub Pages without environment variables, API keys, Firebase, or a private backend. Starting Checky still downloads the public WebLLM runtime and model files on first use.

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
10. Start Checky’s local model and wait for the ready message.
11. Ask Checky to create a kitchen essentials checklist.
12. Ask Checky how saving works and confirm it answers without changing a list.
