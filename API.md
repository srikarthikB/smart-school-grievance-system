# Smart School Grievance Management System API

Base URL: `http://localhost:8000/api`

Authentication uses JWT bearer tokens. Send `Authorization: Bearer <token>` for protected endpoints.

## Auth

| Method | Path | Roles | Description |
| --- | --- | --- | --- |
| POST | `/auth/register` | Public | Register a student account. |
| POST | `/auth/login` | Public | Login and receive JWT token. |
| GET | `/auth/me` | Authenticated | Get current user profile. |

Login body:

```json
{
  "email": "student@school.com",
  "password": "password123"
}
```

## Complaints

| Method | Path | Roles | Description |
| --- | --- | --- | --- |
| POST | `/complaints` | Student | Create a complaint. |
| GET | `/complaints/mine` | Student | List own complaints. |
| GET | `/complaints/assigned` | Staff | List assigned complaints. Anonymous complaints hide creator identity from staff. |
| GET | `/complaints` | Admin | List all complaints. |
| GET | `/complaints/{id}` | Owner, assigned staff, admin | Get complaint details. |
| PATCH | `/complaints/{id}` | Owner, assigned staff, admin | Update allowed fields by role. |
| PATCH | `/complaints/{id}/assign` | Admin | Assign complaint to staff. |
| PATCH | `/complaints/{id}/status` | Staff, admin | Change status and optionally add resolution notes. |
| PATCH | `/complaints/{id}/resolution` | Staff, admin | Add or replace resolution notes. |

Create complaint body:

```json
{
  "title": "Bus delayed frequently",
  "description": "The morning bus arrives 30 minutes late several days a week.",
  "category": "Transport",
  "priority": "Medium",
  "is_anonymous": true
}
```

Allowed categories: `Academic`, `Faculty`, `Student`, `Infrastructure`, `Transport`, `Administration`, `Other`.

Allowed priorities: `Low`, `Medium`, `High`.

Allowed statuses: `Submitted`, `Under Review`, `In Progress`, `Resolved`, `Rejected`.

## Feedback

| Method | Path | Roles | Description |
| --- | --- | --- | --- |
| POST | `/feedback` | Student | Submit one feedback entry for own resolved complaint. |
| GET | `/feedback/{complaint_id}` | Owner, assigned staff, admin | Get feedback for a complaint. |

Feedback body:

```json
{
  "complaint_id": 1,
  "rating": 5,
  "comment": "Resolved quickly."
}
```

## Users

| Method | Path | Roles | Description |
| --- | --- | --- | --- |
| GET | `/users` | Admin | List users. |
| POST | `/users` | Admin | Create student, staff, or admin user. |
| PATCH | `/users/{id}` | Admin | Update role, department, name, or password. |
| DELETE | `/users/{id}` | Admin | Delete a user other than yourself. |

## Analytics

| Method | Path | Roles | Description |
| --- | --- | --- | --- |
| GET | `/analytics` | Admin | Total complaints, category buckets, status buckets, and resolution rate. |

Interactive API documentation is available after startup at:

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
