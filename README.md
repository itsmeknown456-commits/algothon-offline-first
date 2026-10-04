# FieldSync

FieldSync is an offline-first task tracker built for hackathon problem **ALG-WEB-02**. Tasks are stored in the browser first, so work remains available when the network drops.

## Live Demo

- [Open the FieldSync live demo](https://fieldsync-offline.netlify.app)
- Demo videos: [Video 1](https://drive.google.com/file/d/1klp0TYrsgVvT2z36nXF72_8K8AljAWbx/view?usp=drive_link) · 
[Video 2](https://drive.google.com/file/d/1a_yqnlgwOptYuCf7US-Y3Sxl8r2jjBLd/view?usp=sharing) · 
[Video 3](https://drive.google.com/file/d/1XGx2uqpIf61EBIh_65eIMFsBJ7naJXac/view?usp=sharing)

## Problem Statement

Field workers and distributed teams need to create and update tasks in unreliable network conditions. FieldSync keeps tasks in browser storage while offline and synchronizes with a locally run backend when connectivity returns.

## Features

- Create tasks offline, change their status, and delete them. The current task form does not edit titles or notes after creation.
- Persist tasks in IndexedDB across page reloads.
- Show pending and synced task indicators.
- Simulate offline mode without disconnecting the device.
- Retry sync after connectivity returns, with network health checks and backoff.
- Restore server tasks on a fresh client database when the backend is reachable.
- Install as a Progressive Web App and load the cached app shell offline.
- Resolve sync conflicts by choosing local or server values for differing fields when the API supplies conflict records.

## Deployment Note

The live demo is the frontend only and is deployed on Netlify. Its offline-first features work in the browser: local IndexedDB storage, adding tasks, changing task status (the available task editing), deleting tasks, persistence across reloads, PWA installation, and the simulate-offline toggle. The sync bar shows **Offline** in the live demo because its backend is not deployed there. Backend sync uses Node.js and SQLite and runs locally through `/health`, `/sync/push`, and `/sync/pull` (the pull route is `/pull` on the mounted sync router); it is demonstrated in the demo videos above.

## Run Locally

Start the backend from the repository root:

```sh
npm install
npm start
```

The backend listens on port 3000.

Start the client in a second terminal:

```sh
cd client
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Vite proxies `/health` and `/sync` requests to port 3000.

To run the in-memory mock API instead of the SQLite backend, start it from the repository root:

```sh
node tools/mock-server/server.js
```

Use either the backend or the mock on port 3000, not both at once.

## Tech Stack

- Client: JavaScript, React 18, Vite 6, Dexie 4, dexie-react-hooks, vite-plugin-pwa, and plain CSS.
- Backend: Node.js, Express 5, cors, and SQLite through sqlite3.
- Mock API: Node.js built-in HTTP and URL modules.
- Backend test files use Jest and Supertest.

The client does not use a UI library or a state-management library.

## Demo Offline Mode

1. Open FieldSync and turn on **Simulate offline**.
2. Add a task, change its status, or delete it. Local changes appear in IndexedDB and show as pending.
3. Reload the page; the local task data persists.
4. Turn **Simulate offline** off. With a backend available locally, the client syncs queued work and updates the task indicator.
5. To check the offline app shell, open the built app once, switch the browser to offline mode, and reload.

## Demo Sync and Conflict Resolution

Run the local backend or mock API, then run the Vite client. Create or update a task and sync runs after the local save. The **Sync now** button triggers a manual sync when online. To demo conflict resolution using the mock server, start it with `MOCK_FORCE_CONFLICT=1`; the next push returns a conflict for the client resolver.

The actual backend API is described in [docs/API.md](docs/API.md). The architecture is shown below.

![FieldSync architecture](docs/architecture.png)

Editable vector: [docs/architecture.svg](docs/architecture.svg).

## Repository

[GitHub repository](https://github.com/itsmeknown456-commits/algothon-offline-first)

## Folder Structure

```text
hackathon/
├── client/                 # React/Vite offline-first frontend
│   ├── public/              # PWA manifest and icons
│   └── src/                 # App, Dexie database, sync engine, components, styles
├── docs/                    # Backend API documentation and architecture diagrams
├── tools/mock-server/       # Local Node mock API
├── server/                  # Express and SQLite backend
├── shared/                  # Shared backend code
├── README.md
└── .gitignore
```

## Team Roles

- **Client/frontend:** React interface, IndexedDB persistence, sync behavior, PWA shell, and client documentation.
- **Server/shared:** Express API, SQLite persistence, and shared server code.
