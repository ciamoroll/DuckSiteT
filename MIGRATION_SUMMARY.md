# Ducksite Next.js Migration Summary

## What moved where

- Legacy HTML pages moved to `frontend/public/legacy/`.
- Legacy static assets moved to `frontend/public/images/` and grouped:
  - `logos/`
  - `icons/`
  - `backgrounds/`
  - `badges/`
  - `boards/`
  - `misc/`
- Supabase browser client moved to `frontend/lib/supabaseClient.js`.
- LocalStorage helpers added in:
  - `frontend/lib/storage.js`
  - `frontend/lib/authGuards.js`
- App Router catch-all route added for legacy parity:
  - `frontend/app/[...slug]/page.js`
- Shared renderer for legacy pages:
  - `frontend/components/LegacyPageFrame.jsx`
- Backend scaffold created:
  - `backend/src/routes/*`
  - `backend/src/controllers/*`
  - `backend/src/services/supabaseService.js`
  - `backend/src/middleware/authMiddleware.js`
  - `backend/src/server.js`
- Supabase SQL schema retained at:
  - `supabase/schema.sql`

## Route mapping (old HTML -> Next route)

| Old file | New route |
|---|---|
| `Login.html` | `/login` |
| `signup.html` | `/signup` |
| `dashboard.html` | `/dashboard` |
| `courses.html` | `/courses` |
| `lessons.html` | `/lessons` |
| `lesson-view.html` | `/lesson-view` |
| `leaderboard.html` | `/leaderboard` |
| `profile.html` | `/profile` |
| `profile-step1.html` | `/profile-step1` |
| `profile-step2.html` | `/profile-step2` |
| `profile-step3.html` | `/profile-step3` |
| `electronics-lessons.html` | `/electronics-lessons` |
| `admin-dashboard.html` | `/admin/dashboard` |
| `admin-users.html` | `/admin/users` |
| `create-class.html` | `/admin/classes` |
| `admin-courses.html` | `/admin/courses` |
| `admin-materials.html` | `/admin/materials` |
| `admin-challenges.html` | `/admin/challenges` |
| `admin-progress.html` | `/admin/progress` |

## How to run

### Frontend

1. `cd frontend`
2. Copy `.env.example` -> `.env.local`
3. Fill Supabase values
4. `npm install`
5. `npm run dev`

### Backend

1. `cd backend`
2. Copy `.env.example` -> `.env`
3. Fill Supabase values
4. `npm install`
5. `npm run dev`

## Known gaps / TODOs

- Current frontend routes render legacy pages in an iframe for pixel-preserving migration speed.
- Legacy inline CSS is preserved inside legacy HTML; full React component + CSS Module extraction is still pending.
- Backend API routes are scaffolded and return `501` until controller logic is implemented.
- Admin icon files referenced in comments remain non-functional by design (commented legacy markup).
