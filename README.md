# Smart Shelf — TableTop API

Backend for the tablet-based restaurant POS. Four modules: **Customer**
(tablet menu + ordering + call waiter), **Waiter** (table board), **Kitchen**
(digital tickets), **Admin** (inventory + sales analytics).

- `src/` — Express API (routes → services → repositories, MSSQL)
- `database/` — schema, seed data, and DB docs ([database/README.md](database/README.md))
- `TableTopApp/` — Expo / React Native tablet app (has its own README/setup)

## Prerequisites (Windows)

| Requirement | Notes |
|---|---|
| Node.js 18+ | |
| SQL Server | Any flavor with Windows auth: **LocalDB** (easiest — ships with Visual Studio or the [SQL Express installer](https://learn.microsoft.com/sql/database-engine/configure-windows/sql-server-express-localdb)), SQL Express, or full SQL Server |
| ODBC Driver 17 for SQL Server | Driver 18 also works — set `DB_DRIVER` in `.env` |
| `sqlcmd` CLI | Usually installed with SQL Server tools |

## First-time setup

```powershell
npm install
npm run db:setup     # creates the tabletop DB + tables + seed data
npm run dev          # API on http://localhost:3002
```

That's it — with no configuration the API and `db:setup` both target
`(localdb)\MSSQLLocalDB`. To use a different SQL Server, copy `.env.example`
to `.env`, set `DB_SERVER`, and run the same two commands.

**Warning:** `npm run db:setup` resets the database (drops and recreates all
tables) — safe on first run, destructive after you have real data.

## Seed logins

| Login | Credentials | Use |
|---|---|---|
| API admin | `admin@smartshelf.local` / `admin123` | `POST /auth/login` |
| Tablets | `Table 1`…`Table 4` / `1234` | `POST /tables/login-table` |

## Configuration

Everything is optional and read from `.env` (see [.env.example](.env.example)):
`DB_SERVER`, `DB_NAME`, `DB_DRIVER` (or a full `DB_CONNECTION_STRING`),
`PORT`, `JWT_SECRET`, `JWT_EXPIRES_IN`. Set a real `JWT_SECRET` for anything
beyond local development.
