# Ducksite

Ducksite is a web learning platform with **student** and **admin/professor** experiences.  
It includes course management, materials, challenges, progress monitoring, and role-based dashboards powered by Supabase.

Main features:
- Student signup/login and learning dashboard
- Admin/professor login and admin dashboard
- Course and class management
- Learning materials management (with storage support)
- Challenge creation with points/rewards
- Student progress tracking and reporting

## 1) Project Title + Overview

Ducksite is a monorepo app with:
- `frontend/` for the Next.js web app
- `backend/` for the Express API
- `supabase/` for SQL schema/bootstrap

It supports:
- **Student flow**: register, login, view dashboard, take courses/lessons
- **Admin flow**: login and manage users/classes/courses/materials/challenges, monitor progress


## 2) Tech Stack

- **Frontend**: Next.js, React, Supabase JS, [canvas-confetti](https://www.npmjs.com/package/canvas-confetti) (for celebration animation)
- **Backend**: Node.js, Express, Supabase JS
- **Database/Auth/Storage**: Supabase (Postgres + Auth + Storage)

## 3) Repository Structure

```text
Ducksite/
├─ frontend/
│  ├─ app/                    # Next.js App Router pages/layouts
│  ├─ components/             # Shared React components
│  ├─ lib/                    # Frontend helpers (Supabase client, auth/storage utils)
│  ├─ public/
│  │  ├─ images/              # Organized static assets
│  │  ├─ legacy/              # Legacy HTML pages still routed/used where needed
│  │  ├─ runtime-config.js    # Runtime config for legacy scripts
│  │  └─ admin-api-client.js  # Admin API helper for legacy admin pages
│  ├─ styles/                 # Global/frame styles
│  ├─ package.json
│  └─ .env.local              # Frontend environment variables (local only)
├─ backend/
│  ├─ src/
│  │  ├─ controllers/         # Route handlers
│  │  ├─ routes/              # Express route definitions
│  │  ├─ middleware/          # Auth/admin guards, logging, etc.
│  │  ├─ services/            # Supabase service client
│  │  ├─ utils/               # Shared response helpers
│  │  └─ server.js            # Express app entrypoint
│  ├─ package.json
│  └─ .env                    # Backend secrets (local only)
├─ supabase/
│  └─ schema.sql              # DB schema bootstrap SQL
└─ README.md
```

## 4) Prerequisites

- Node.js **18+** (recommended: latest LTS)
- npm (bundled with Node.js)
- A Supabase account + project

## 5) Environment Variables

Create these files:
- `frontend/.env.local`
- `backend/.env`

### `frontend/.env.local`

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
```

What each key does:
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL (safe for frontend)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: public anon key (safe for frontend)
- `NEXT_PUBLIC_API_BASE_URL`: backend base URL used by frontend

### `backend/.env`

```env
PORT=4000
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
ENABLE_AUTH_MIDDLEWARE=false
ADMIN_USER=admin
ADMIN_PASS=12345
ADMIN_JWT_SECRET=CHANGE_ME_TO_STRONG_RANDOM_SECRET
```

What each key does:
- `SUPABASE_URL`: Supabase project URL (backend)
- `SUPABASE_SERVICE_ROLE_KEY`: **secret** service role key (backend only)
- `ENABLE_AUTH_MIDDLEWARE`: toggles token middleware behavior
- `ADMIN_USER` / `ADMIN_PASS`: legacy admin credential path
- `ADMIN_JWT_SECRET`: signs admin API JWT tokens

Security notes:
- `NEXT_PUBLIC_*` keys are intentionally exposed to browser bundles
- `SUPABASE_SERVICE_ROLE_KEY` and admin secrets must stay backend-only
- Change all default admin values before production

## 6) Supabase Setup

1. Create a Supabase project.
2. Copy project values:
   - Project URL
   - Anon key
   - Service role key
3. Add values to env files:
   - `frontend/.env.local`
   - `backend/.env`
4. In Supabase SQL Editor, run:
   - `supabase/schema.sql`
5. Create storage bucket(s) if using materials upload:
   - Recommended bucket name: `materials`
6. Configure RLS and policies:
   - Ensure required read/write policies exist for your tables and storage.
   - If API calls return `401/403`, review RLS policies first.


## 7) Install Dependencies

From repository root:

```bash
cd frontend
npm install
# Installs all dependencies including canvas-confetti for confetti animation
```

```bash
cd ../backend
npm install
```
## 17) Animation Effects (Confetti)

The platform uses [canvas-confetti](https://www.npmjs.com/package/canvas-confetti) to display a confetti animation when a student answers a challenge correctly.

**Troubleshooting:**
- If you do not see the confetti animation, ensure that your operating system's "Animation effects" (Windows) or "Reduce motion" (macOS) setting is enabled to allow animations. Chrome and other browsers respect this system setting.
- The confetti effect will not appear if "prefers-reduced-motion" is enabled.

No additional setup is required beyond `npm install` in the frontend directory.

## 8) Run the App (Development)

Use **two terminals**.

### Terminal 1: Backend

```bash
cd backend
npm run dev
```

Expected:
- Backend running on `http://localhost:4000`
- Health check: `http://localhost:4000/health`

### Terminal 2: Frontend

```bash
cd frontend
npm run dev
```

Expected:
- Frontend on `http://localhost:3000`

## 9) Default Auth Flow

### Student flow
1. Go to `/signup` to create account.
2. Login at `/login`.
3. Redirects to `/dashboard`.

### Admin flow
1. **Legacy admin credentials**
  - Login from admin section in `/login` using `ADMIN_USER`/`ADMIN_PASS`.
2. **Supabase admin profile account**
  - Create auth user in Supabase Authentication.
  - Set `public.users.role = 'admin'` for that account.
  - Login from `/login` using admin email/password.

Notes:
- Institutional email domain restriction is enforced for email login.
- Password format policy is enforced on signup/create flows, not on login.

Expected redirects:
- Student login → `/dashboard`
- Admin login → `/admin/dashboard`
- Non-admin access to admin routes → redirected to `/login`

## 10) API Overview (Backend)

### Health
- `GET /health`  
  Service status check.
  Returns a `warnings` array when FK cascade verification cannot be confirmed.

### Auth
- `POST /api/auth/login`  
  Student login.
- `POST /api/auth/signup`  
  Student signup + profile creation.
- `POST /api/auth/admin-login`  
  Admin login (legacy or admin account path).

### Users
- `GET /api/users/*`  
  Admin user listing/details.
- `POST/PUT/DELETE /api/users/*`  
  User management operations.

Current hardening behavior:
- User Management creates student auth+profile accounts.
- Role escalation to admin is blocked in user update endpoints.
- Email update is blocked in user update endpoint.
- Delete removes auth user first, then cleans leftover profile row if cascade is missing.

### Courses
- `GET /api/courses/*`
- `POST/PUT/DELETE /api/courses/*`

### Challenges
- `GET /api/challenges/*`
- `POST/PUT/DELETE /api/challenges/*`

### Progress
- `GET /api/progress/*`
- `GET /api/progress/summary`

Additional admin/public groups used in current app:
- `GET/POST/PUT/DELETE /api/classes/*`
- `GET/POST/DELETE /api/materials/*`
- `GET /api/public/courses`

## 11) Troubleshooting

### Invalid Supabase key or project ref
- Symptoms: auth fails, API returns Supabase errors.
- Fix: verify URL/keys in `frontend/.env.local` and `backend/.env`.

### 401/403 from Supabase
- Symptoms: reads/writes blocked despite valid setup.
- Fix: review Supabase RLS policies and storage policies.

### 501 endpoint responses
- Symptoms: API route returns TODO response.
- Fix: ensure backend is running latest code and restarted after changes.

### CORS errors
- Symptoms: browser blocks API calls.
- Fix: confirm backend is running and reachable at `NEXT_PUBLIC_API_BASE_URL`.

### Port conflicts
- Symptoms: app starts on unexpected port.
- Fix: free ports 3000/4000 or update env/config accordingly.

### Login works but no profile row in `users` table
- Symptoms: auth user exists but app data missing.
- Fix:
  - Ensure `users` table exists (run `supabase/schema.sql`)
  - Check backend logs for upsert errors
  - Check RLS policy for `users` writes

### Student created from User Management cannot log in
- Symptoms: account exists in users table but login fails.
- Fix:
  - Ensure create request includes a password and email.
  - Confirm auth user exists in Supabase Authentication.
  - Reset password from Supabase Authentication if needed.

### `/health` shows FK cascade warning
- Symptoms: health endpoint contains warning about users-auth FK cascade check.
- Fix:
  - Re-run `supabase/schema.sql` to create `public.has_users_auth_fk_cascade()`.
  - Confirm `public.users.id` references `auth.users(id)` with `on delete cascade`.

## 12) Scripts

### Frontend (`frontend/package.json`)

| Script | Command | Purpose |
|---|---|---|
| dev | `npm run dev` | Start Next.js dev server |
| build | `npm run build` | Production build |
| start | `npm run start` | Run production build |
| lint | `npm run lint` | Lint frontend code |

### Backend (`backend/package.json`)

| Script | Command | Purpose |
|---|---|---|
| dev | `npm run dev` | Start Express server |
| start | `npm run start` | Start Express server |
| test | `npm run test` | Placeholder test script |

## 13) Deployment Notes

High-level:
- Deploy frontend and backend separately.
- Set environment variables in your hosting platform (do not commit secrets).
- Point frontend API base URL to deployed backend.
- Ensure backend has correct Supabase service role key and admin secrets.

Production reminders:
- Rotate all default admin keys/passwords.
- Use strong `ADMIN_JWT_SECRET` and `ADMIN_SETUP_KEY`.
- Restrict CORS origins to trusted frontend domains.

## 14) Security Notes

- Never commit `.env` files.
- Rotate compromised keys immediately.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to frontend/public code.
- Change default admin credentials and setup key before production.

## 15) Contributing

- Create a feature branch from main.
- Keep changes scoped and tested.
- Open a PR with clear summary and test notes.
- Run lint/build before submitting.

## 16) License

No license file is currently defined. Add a `LICENSE` file if you plan to open-source or distribute the project.

---

## Quick Start (TL;DR)

- Clone repo and install:
  - `cd frontend && npm install`
  - `cd ../backend && npm install`
- Create env files:
  - `frontend/.env.local`
  - `backend/.env`
- Fill Supabase URL/keys and admin secrets.
- Run schema:
  - Execute `supabase/schema.sql` in Supabase SQL editor.
- Start backend:
  - `cd backend && npm run dev`
- Start frontend:
  - `cd frontend && npm run dev`
- Open:
  - App: `http://localhost:3000`
  - Health: `http://localhost:4000/health`
