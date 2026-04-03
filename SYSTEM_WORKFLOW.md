# DuckSiteT System Workflow

## Overview
DuckSiteT is a monorepo with:
- `frontend/` (Next.js student/admin UI)
- `backend/` (Express API)
- `supabase/` (Postgres schema and migrations)

Core domains:
- Authentication and profile setup
- Admin/professor management of classes, courses, challenges, and materials
- Student learning flow (courses, lessons/challenges, XP progression)
- Progress tracking and leaderboard

## Roles and Access
- `student`
  - Uses `/signup` and `/login` flow
  - Completes profile setup (3-step flow)
  - Accesses dashboard, courses, leaderboard, profile
- `admin` (professor/admin account)
  - Logs in via `/api/auth/admin-login` through login page
  - Accesses admin dashboard and management pages

## Authentication Flow
1. Student login:
- Frontend calls `POST /api/auth/login`
- Stores student session token (`studentToken`) and role `student`
- Loads profile via `GET /api/auth/me`
- Login does not enforce strong-password format regex; credential validity is checked by Supabase Auth

2. Admin login:
- Frontend calls `POST /api/auth/admin-login`
- Stores admin JWT (`adminToken`) and role `admin`
- Admin routes are guarded by `AdminRouteGuard` and backend `requireAdmin`

3. Profile bootstrap:
- If auth user exists but profile row is missing, backend `getMe` auto-creates a profile in `public.users`

## Admin/Professor Data Ownership
Current backend includes ownership scoping:
- `courses.owner_id` stores professor owner
- Course list/create/update/delete are scoped by owner for scoped admin accounts
- Challenge and material CRUD are scoped through owned courses

Behavior:
- Admin sees/manages own courses and related challenges/materials
- Existing legacy courses need `owner_id` backfill migration to appear under scoped admins

## Student Learning Flow
1. Student profile setup enforces class selection
2. Student sees only eligible courses (`/api/public/my-courses`)
3. Course page shows lessons/challenges by `lesson_order`
4. Unlock logic uses:
- required XP threshold
- prerequisite completion of previous lesson
5. Materials are displayed per selected course (`/api/public/materials?courseId=...`)

## Main Backend API Groups
- `/api/auth` - login, signup, profile me/update
- `/api/users` - admin user management
- `/api/classes` - class CRUD
- `/api/courses` - course CRUD + class mapping
- `/api/challenges` - challenge CRUD
- `/api/materials` - materials CRUD + file upload
- `/api/public` - student-facing data (courses, classes, leaderboard, attempts, materials)

## Data Model (High-level)
- `users` - profile, role, xp, class mapping
- `classes` - section/class records
- `courses` - includes `instructor`, `owner_id`
- `course_classes` - course-class assignment
- `course_enrollments` - student course enrollments
- `challenges` - lesson/challenge rows tied to `course_id`
- `challenge_attempts` - correctness, xp awards
- `materials` - files/resources tied to `course_id`

## Frontend Admin Safety Rules (Current)
- User management table hides admin accounts
- Add/Edit user form only creates/updates `student` role
- Create-user form requires explicit password input with show/hide toggle
- Edit-user form locks email field for security

## Backend Hardening Rules (Current)
- `/api/users` create path creates `auth.users` first, then profile row in `public.users`
- User role escalation to admin is blocked in update endpoint
- Email update is blocked in users update endpoint to avoid auth/profile mismatch
- Delete user removes auth user first; if profile row remains, backend cleans it up and returns a warning

## Health and Integrity Checks
- `GET /health` returns `warnings` array
- Health tries to verify `public.users(id) -> auth.users(id) ON DELETE CASCADE`
- Verification uses SQL function: `public.has_users_auth_fk_cascade()`

## Known Operational Notes
- Admin account creation is disabled via API route and must be done manually in Supabase
- Passwords are managed in Supabase Auth, not in `public.users`
- For role changes (student/admin), update `public.users.role`
