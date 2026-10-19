# Smart School Grievance Management System

A full-stack school grievance platform with React, FastAPI, SQLAlchemy, JWT authentication, Alembic migrations, PostgreSQL, seed data, and a basic PWA shell.

Use Python 3.11 or newer and Node.js 20 or newer (Tailwind CSS 4.3 in the lockfile requires Node 20+). The included Docker Compose database credentials, example environment values, and sample seed accounts are development-only; do not use them or expose the development database in production.

## Features

- Student registration and login
- JWT authentication with bcrypt password hashing
- Role-based access for student, staff, and admin users
- Student complaint submission, anonymous complaints, status tracking, history, and feedback
- Staff assigned complaint queue, status updates, resolution notes, and resolution flow
- Admin complaint management, assignment to staff, priority/status updates, user management, and analytics
- PostgreSQL schema managed by Alembic
- Seed script with sample accounts and complaints
- Manifest and service worker for installable PWA behavior

## Project Structure

```text
backend/
  alembic/
  app/
    api/routes/
    core/
    db/
    models/
    schemas/
    services/
  seed.py
  requirements.txt
frontend/
  public/
  src/
    api/
    auth/
    components/
    pages/
API.md
docker-compose.yml
```

## Sample Accounts

The local seed script uses `password123` for sample accounts. These credentials are for disposable development data only; do not use them in staging or production.

| Role | Email |
| --- | --- |
| Admin | `admin@school.com` |
| Staff | `academic@school.com` |
| Student | `student@school.com` |

## Setup

### 1. Start PostgreSQL

Using Docker:

```bash
docker compose up -d
```

Or create a PostgreSQL database manually:

```sql
CREATE DATABASE school_grievances;
```

If your PostgreSQL username, password, host, port, or database differs, update `backend/.env`.

### 2. Configure Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

Edit `backend/.env` if needed:

```env
DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5432/school_grievances
# Generate a unique random secret locally; use at least 32 characters.
SECRET_KEY=
ACCESS_TOKEN_EXPIRE_MINUTES=1440
BACKEND_CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

`BACKEND_CORS_ORIGINS` is a comma-separated allowlist of exact browser origins. Wildcards are rejected, and CORS credentials are disabled because the frontend sends bearer tokens rather than cookies. For deployment, configure the real frontend origin(s) in the environment; do not copy localhost origins into production.

`SECRET_KEY` is required and must be at least 32 characters. Generate a unique random value outside the repository for each environment; do not use a sample or development key in a shared deployment.

Run migrations and seed data:

```bash
alembic upgrade head
python seed.py
```

Start the API:

```bash
uvicorn app.main:app --reload
```

Backend URLs:

- API: `http://localhost:8000/api`
- Swagger docs: `http://localhost:8000/docs`
- Liveness: `http://localhost:8000/api/health` (process only)
- Readiness: `http://localhost:8000/api/ready` (database reachable and migration head current)

### 3. Configure Frontend

In another terminal:

```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```

Frontend URL:

```text
http://localhost:5173
```

## Manual PostgreSQL Information Needed

If you are not using the included Docker Compose file, you need to provide:

- PostgreSQL host
- Port
- Database name
- Username
- Password

Put those values into `backend/.env` as a SQLAlchemy URL:

```env
DATABASE_URL=postgresql+psycopg2://USERNAME:PASSWORD@HOST:PORT/DATABASE_NAME
```

## Common Commands

Create a new migration after model changes:

```bash
cd backend
alembic revision --autogenerate -m "describe change"
```

Apply migrations:

```bash
alembic upgrade head
```

Reset seed data only adds missing records and does not delete existing data:

```bash
python seed.py
```

Build frontend:

```bash
cd frontend
npm run build
```

## Account retention and anonymous complaints

The admin delete action deactivates an account and increments its token version; it does not hard-delete the user. Admins can reactivate an account, which also invalidates prior tokens. Complaint, repair, feedback, notification, and timeline records are retained by this application flow.

The historical schema contains `ON DELETE CASCADE` foreign keys from complaints to their creator and from complaint records to related evidence, feedback, events, and notifications. Direct SQL deletion or an older application path that hard-deletes a user can therefore erase records; some repair submitter references instead use `RESTRICT`, so hard deletion may also fail depending on history. Do not run out-of-band deletion, anonymization, or purging without school retention-policy approval. Changing these historical constraints requires a reviewed forward-only migration after the deployed schema is known.

Anonymous mode limits identity exposure in application responses but does not guarantee anonymity. Aliases, contextual details in complaint or repair text, distinctive filenames, image contents, and information known to the assigned staff may identify a student. The system does not inspect or redact identifying details embedded in images.

Migration review note: downgrading `0002` drops attachment, timeline, and notification records; `0003` drops token-version state; and `0005` drops account activation state. `0004` intentionally refuses downgrade because removing the PostgreSQL enum value and repair history is unsafe. Treat rollback as a separately reviewed restore/forward-fix plan, not as a routine deployment step.

## Staging migration and deployment checklist

Before applying migrations or deploying:

1. Confirm the intended database and PostgreSQL version without sharing connection credentials.
2. Obtain a verified backup or create a disposable copy of the intended database.
3. Inspect the existing schema and its Alembic revision without modifying it.
4. Test migrations `0001` through `0005` on both a clean database of the intended PostgreSQL version and a copy of the intended schema.
5. Verify account deactivation/reactivation and token invalidation, plus complaint, feedback, timeline, attachment, and repair-history persistence.
6. Confirm the deployment secret, exact CORS origin allowlist, runtime version, and `/api/ready` response in staging.
7. Only after review and sign-off, schedule the production migration and deployment with a rollback/restore plan.

No live database revision or production compatibility is assumed by this checklist. `/api/health` is a liveness endpoint; use `/api/ready` to check database connectivity and migration readiness.

## API Documentation

See [API.md](API.md) for endpoint details and request examples. FastAPI also exposes live OpenAPI docs at `http://localhost:8000/docs`.
