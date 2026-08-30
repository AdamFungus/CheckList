# My Checklists

A private, responsive checklist app that saves multiple lists directly in the browser. It uses plain HTML, CSS, and JavaScript, so it works on GitHub Pages without Firebase, accounts, a server, or a build step.

## Features

- Create and switch between multiple personal checklists
- Search saved checklists and filter tasks by name
- Add, complete, reopen, edit, and delete tasks
- Add tasks from a focused popup instead of typing into the search bar
- Ask **Checky**, the rabbit AI assistant, for website help or a ready-made checklist
- Let Checky create checklists and add tasks after validating its suggestions locally
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

The exception is **Checky**: when you send Checky a message, the app sends that message, recent chat turns, checklist names, and a limited set of task text to the secure `/api/checky` endpoint. The endpoint calls the OpenAI Responses API with `store: false`. The API key remains on the server and is never included in browser code.

Important limitations:

- Checklists do not sync between different devices or different browsers.
- Clearing browser site data deletes the saved checklists.
- Private/incognito windows may erase data when the window closes.
- Another person using the same browser profile can open the checklists.
- Browser storage is convenient, but it is not a substitute for a backup of important information.
- Do not send sensitive personal information to Checky; AI requests leave the device for processing.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Checklist library, task workspace, dialogs, Checky panel, and social metadata |
| `style.css` | Responsive visual design |
| `app.js` | Checklist behavior, local device storage, and validated Checky actions |
| `assets/checky.png` | Checky's face-only rabbit mascot |
| `api/checky.js` | Secure server-side OpenAI endpoint |
| `.env.example` | Required server configuration names without secrets |
| `vercel.json` | Serverless function configuration |
| `og.png` | Social sharing image |
| `.nojekyll` | Makes GitHub Pages serve the static files as-is |

Firebase configuration, authentication, database code, and database rules are no longer used.

## Run locally

You can open `index.html` directly, but a small local server more closely matches GitHub Pages. The checklist features work this way; Checky needs the secure server endpoint described below.

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

## Turn on Checky

Checky uses the OpenAI API through a server function so the API key never appears in the website's JavaScript.

1. Create an API key at [platform.openai.com/api-keys](https://platform.openai.com/api-keys).
2. Copy `.env.example` to `.env.local` and set `OPENAI_API_KEY` there. Never commit that file.
3. Install the [Vercel CLI](https://vercel.com/docs/cli), then run:

   ```bash
   vercel dev
   ```

4. Open the local URL printed by Vercel and ask Checky a question.

The default model is `gpt-5-mini`. You can change `OPENAI_MODEL` in the server environment without editing browser code.

For production, import this repository into Vercel and add `OPENAI_API_KEY` as a protected environment variable. If the frontend and API use different domains, add the exact frontend origin to `CHECKY_ALLOWED_ORIGINS` and change the `checky-api-url` meta tag in `index.html` to the deployed endpoint.

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

The local checklist features still require no environment variables, API keys, Firebase project, or external service settings. Checky will display a setup message until its secure OpenAI endpoint is configured. GitHub Pages cannot run the included server function by itself; either deploy the full project to Vercel or point the `checky-api-url` meta tag at a separately deployed secure endpoint.

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
10. With the secure endpoint configured, ask Checky to create a kitchen essentials checklist.
11. Ask Checky how saving works and confirm it answers without changing a list.
