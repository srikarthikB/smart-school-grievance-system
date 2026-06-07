# Smart School Grievance Management System

A full-stack school grievance platform with React, FastAPI, SQLAlchemy, JWT authentication, Alembic migrations, PostgreSQL, seed data, and a basic PWA shell.

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

All sample accounts use `password123`.

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
SECRET_KEY=change-this-secret-in-production
ACCESS_TOKEN_EXPIRE_MINUTES=1440
BACKEND_CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

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
- Health check: `http://localhost:8000/api/health`

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

## API Documentation

See [API.md](API.md) for endpoint details and request examples. FastAPI also exposes live OpenAPI docs at `http://localhost:8000/docs`.
