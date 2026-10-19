# Smart School Grievance Management System API

Base URL: `http://localhost:8000/api`

Authentication uses JWT bearer tokens. Send `Authorization: Bearer <token>` for protected endpoints. The browser client does not use cookie authentication.

## Auth

| Method | Path | Roles | Description |
| --- | --- | --- | --- |
| POST | `/auth/register` | Public | Register a student account. |
| POST | `/auth/login` | Public | Login and receive JWT token. |
| POST | `/auth/logout` | Authenticated | Revoke all currently issued tokens for the user. |
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
| POST | `/complaints/{id}/attachments` | Student owner | Upload initial image evidence. |
| GET | `/complaints/{id}/attachments` | Owner, assigned staff, admin | List evidence metadata. |
| GET | `/complaints/{id}/attachments/{attachment_id}/content` | Owner, assigned staff, admin | Read image evidence. |
| POST | `/complaints/{id}/repairs` | Assigned staff | Submit repair notes and image evidence. |
| GET | `/complaints/{id}/repairs` | Owner, assigned staff, admin | Read repair history. |
| POST | `/complaints/{id}/verification` | Student owner | Approve or return submitted repair evidence. |
| GET | `/complaints/{id}/timeline` | Owner, assigned staff, admin | Read complaint history. |

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

Allowed statuses: `Submitted`, `Under Review`, `In Progress`, `Awaiting Verification`, `Resolved`, `Rejected`.

For anonymous complaints, only the student owner and administrators can see the complainant identity. Staff-facing complaint text, timeline events, feedback comments, notifications, repair history and attachment filenames are redacted where possible. This is not guaranteed anonymity: aliases, identifying context, details in free text, image contents, and information already known to viewers can still identify a student.

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
| PATCH | `/users/{id}` | Admin | Update role, department, name, password, or account activation state. Reactivation invalidates previously issued tokens. |
| DELETE | `/users/{id}` | Admin | Deactivate a user other than yourself; grievance records are preserved. |

Deactivation is a soft account state change; it does not delete complaint or evidence history. Direct database deletion or older code paths remain subject to database foreign-key cascades and can permanently remove associated complaint history. Do not hard-delete accounts without an approved retention policy and a verified backup.

## Notifications and health

| Method | Path | Roles | Description |
| --- | --- | --- | --- |
| GET | `/notifications/mine` | Authenticated | List the current user's notifications. |
| PATCH | `/notifications/{id}/read` | Owner | Mark one notification as read. |
| POST | `/notifications/read-all` | Authenticated | Mark the current user's notifications as read. |
| GET | `/health` | Public | Process liveness only; it does not verify database or migration readiness. |
| GET | `/ready` | Public | Checks database connectivity and that the database revision matches the current migration head. |

Configure `BACKEND_CORS_ORIGINS` as a comma-separated list of exact browser origins. Wildcard origins are rejected; credentials are disabled because the client uses bearer tokens. Development examples include only localhost origins. Set the actual frontend origin(s) in the deployment environment; no production origin is assumed here.

## Analytics

| Method | Path | Roles | Description |
| --- | --- | --- | --- |
| GET | `/analytics` | Admin | Total complaints, category buckets, status buckets, and resolution rate. |

Interactive API documentation is available after startup at:

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
