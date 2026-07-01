# Task Manager

A simple task manager built with Node.js, Express, and vanilla JS. Tasks are stored in a local JSON file — no database setup needed.

## Features

- Create, edit, delete tasks
- Title, description, due date, priority (low/medium/high)
- Status tracking (todo / in-progress / done), with a quick checkbox toggle
- Categories/tags
- Search by title/description
- Filter by status, priority, category
- Sort by due date, priority, title, or newest

## Setup

```bash
npm install
npm start
```

Then open http://localhost:3000

For auto-restart on file changes during development:

```bash
npm run dev
```

## Project structure

```
task-manager/
├── server.js          # Express app entrypoint
├── routes/
│   └── tasks.js        # CRUD + filter/search/sort API routes
├── data/
│   ├── store.js         # JSON file read/write helper
│   └── tasks.json        # Task data (auto-created/updated)
└── public/              # Frontend (HTML/CSS/JS, no build step)
    ├── index.html
    ├── style.css
    └── app.js
```

## API

| Method | Endpoint                 | Description                          |
|--------|---------------------------|---------------------------------------|
| GET    | /api/tasks                | List tasks (supports query params below) |
| GET    | /api/tasks/:id             | Get one task                          |
| POST   | /api/tasks                | Create a task                         |
| PUT    | /api/tasks/:id             | Update a task (partial updates ok)    |
| PATCH  | /api/tasks/:id/status      | Quick status update                   |
| DELETE | /api/tasks/:id             | Delete a task                         |

Query params for `GET /api/tasks`: `status`, `priority`, `category`, `search`, `sortBy` (`dueDate`|`priority`|`createdAt`|`title`|`status`), `order` (`asc`|`desc`).

### Task shape

```json
{
  "id": "uuid",
  "title": "string",
  "description": "string",
  "dueDate": "YYYY-MM-DD | null",
  "priority": "low | medium | high",
  "status": "todo | in-progress | done",
  "category": "string",
  "createdAt": "ISO timestamp",
  "updatedAt": "ISO timestamp"
}
```

## Notes / next steps

- Storage is a single JSON file — fine for local/single-user use, but not safe for multiple server instances writing concurrently (e.g. if you later deploy with more than one process/replica).
- No authentication — anyone who can reach the server can read/edit all tasks. Add auth before deploying this publicly.
- If you outgrow the JSON file, swapping `data/store.js` for SQLite (e.g. `better-sqlite3`) is the natural next step — the routes file wouldn't need to change much since it just calls `readTasks()`/`writeTasks()`.
