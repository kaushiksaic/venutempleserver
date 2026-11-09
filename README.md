# Venutemple Server API

Basic Express.js + PostgreSQL API for the temple website CMS (admin login, marquee ticker, events, gallery). Built so the same API can later serve a React Native app.

## Setup

1. Copy env file and set your PostgreSQL password:

```bash
copy .env.example .env
```

Edit `.env`:

```
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/venutemple
JWT_SECRET=change-this-to-a-long-random-string
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
```

2. Install and initialize DB:

```bash
npm install
npm run db:init
npm run dev
```

API: `http://localhost:5000`

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | No | Health check |
| POST | `/api/auth/login` | No | `{ username, password }` → JWT |
| GET | `/api/auth/me` | Yes | Current admin |
| GET | `/api/ticker` | No | Active marquee items |
| GET/POST/PUT/DELETE | `/api/ticker...` | Yes | Admin ticker CRUD |
| GET | `/api/events?type=monthly` | No | Sections + events |
| GET/POST/PUT/DELETE | `/api/events/...` | Yes | Admin event CRUD |
| GET | `/api/gallery` | No | Albums + images by year |
| POST | `/api/gallery/albums/:id/images` | Yes | Multipart upload field `image` |

Admin routes need header: `Authorization: Bearer <token>`

## Vite migration (when)

**Do not migrate the CRA frontend yet.** Move to Vite after:

1. Frontend Home/Gallery read from this API (not hardcoded JSX)
2. Basic admin login UI exists and works against these endpoints

Migrating tooling before that only adds risk. CRA → Vite is a short swap once the API is wired.

## Project layout

```
server/
  src/index.js          Express app
  src/db.js             pg pool
  src/routes/           auth, ticker, events, gallery
  src/scripts/initDb.js Creates DB, schema, admin, seed
  sql/schema.sql
  sql/seed.sql
  uploads/gallery/      Uploaded gallery images
```
