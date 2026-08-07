# CyberEd — Run the Full Stack Locally

## Prerequisites

- Node.js 20+
- pnpm (`npm install -g pnpm`)
- PostgreSQL 17 running locally (or a cloud database URL)

---

## Step 1: Install PostgreSQL (Windows)

Download and run the installer:
👉 https://www.postgresql.org/download/windows/

During install:
- Set **password** for `postgres` user to: `postgres`
- Keep default port: `5432`
- Keep default data directory

---

## Step 2: Create the Database

Open **pgAdmin** (installed with PostgreSQL) or run in terminal:

```powershell
# Open psql (PowerShell)
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -c "CREATE DATABASE cybered;"
```

When prompted, enter password: `postgres`

---

## Step 3: Set Up Environment Files

The `.env` file is already created at:
📄 `artifacts/api-server/.env`

Contents:
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/cybered
JWT_SECRET=cybered-local-dev-secret-key-change-in-production
PORT=3000
NODE_ENV=development
```

---

## Step 4: Run the Full Stack

### Terminal 1 — Start the Frontend (port 5000)

```powershell
cd d:\CYBERED
npx pnpm --filter "@workspace/cybered" dev
```

Open: http://localhost:5000

### Terminal 2 — Start the Backend API (port 3000)

```powershell
cd d:\CYBERED\artifacts\api-server
node start.mjs
```

This will:
1. Push the database schema (create tables)
2. Build the API server
3. Start it on port 3000

---

## Architecture: How Frontend Talks to Backend

The Vite dev server proxies API calls. Requests to `/api/*` from the frontend go to `http://localhost:3000`.

---

## First Login

1. Open http://localhost:5000
2. Click **Register**
3. The **first account** auto-gets **admin** role
4. Login to access full dashboard

---

## Troubleshooting

| Problem | Solution |
|---|---|
| `ECONNREFUSED 5432` | PostgreSQL is not running — start it from Services |
| `database "cybered" does not exist` | Run `psql -U postgres -c "CREATE DATABASE cybered;"` |
| Port 3000 busy | Change `PORT=3001` in `.env` |
| Port 5000 busy | Change `PORT=5001` in `artifacts/cybered/vite.config.ts` |
