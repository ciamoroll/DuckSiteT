# DuckSiteT Setup Guide

## 1. Prerequisites
- Node.js 18+
- npm
- Supabase project (URL, anon key, service role key)

## 2. Clone and Install
From repo root:

```bash
cd frontend
npm install
```

```bash
cd ../backend
npm install
```

## 3. Environment Files
Create:
- `frontend/.env.local`
- `backend/.env`

### frontend/.env.local
```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
```

### backend/.env
```env
PORT=4000
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
ADMIN_JWT_SECRET=REPLACE_WITH_STRONG_SECRET
ADMIN_USER=admin
ADMIN_PASS=REPLACE_WITH_STRONG_PASSWORD
```

## 4. Database Setup (Supabase SQL Editor)
Run `supabase/schema.sql`.

Important: ensure these newer columns/migrations exist after applying schema:
- `courses.instructor`
- `courses.owner_id`
- `materials.course_id`
- class instructor nullable/default update

If needed, run explicitly:

```sql
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS instructor text default '';
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS owner_id uuid;
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS course_id bigint;
ALTER TABLE public.classes ALTER COLUMN instructor SET DEFAULT '';
ALTER TABLE public.classes ALTER COLUMN instructor DROP NOT NULL;
```

## 5. Storage Setup
In Supabase Storage, create bucket:
- `materials`

## 6. Run the App
Use two terminals.

Backend:
```bash
cd backend
npm run dev
```

Frontend:
```bash
cd frontend
npm run dev
```

Open:
- Frontend: `http://localhost:3000`
- Backend health: `http://localhost:4000/health`

## 7. Create Admin (Professor) Account
Admin signup endpoint is disabled, so use manual method:

How to create another admin professor account from Supabase

Create the auth account
Open Supabase Dashboard
Go to Authentication, then Users
Click Add user
Enter email and password
Save
Promote that account in public users table
Open SQL Editor and run this (replace values)

```sql
update public.users
set
role = 'admin',
first_name = 'Mike',
last_name = 'Tolentino',
profile_completed = true,
profile_step = 3,
updated_at = now()
where lower(email) = 'miketolentino@paterostechnologicalcollege.edu.ph';
```

If the row does not exist yet, insert it from auth.users first

```sql
insert into public.users (id, uid, email, first_name, last_name, role, profile_completed, profile_step, xp, created_at, updated_at)
select id, id, email, 'Mike', 'Tolentino', 'admin', true, 3, 0, now(), now()
from auth.users
where lower(email) = 'miketolentino@paterostechnologicalcollege.edu.ph'
on conflict (id) do update
set
role = 'admin',
first_name = excluded.first_name,
last_name = excluded.last_name,
profile_completed = true,
profile_step = 3,
updated_at = now();
```

Verify

```sql
select id, email, role, profile_completed, profile_step
from public.users
where lower(email) = 'miketolentino@paterostechnologicalcollege.edu.ph';
```

## 8. Optional Ownership Backfill (Existing Courses)
If scoped professors cannot see old courses, backfill `owner_id`:
- first by matching instructor full name to admin name
- fallback to first admin account

(Already included in current `schema.sql` migration block.)

## 9. Quick Validation Checklist
- Student can sign up and complete profile
- Admin can log in and access `/admin/dashboard`
- Admin can create course with instructor and class assignment
- Student sees assigned course and lesson unlock behavior
- Materials appear on student course page

## 10. Common Issues
- Student redirected to profile setup instead of admin dashboard:
  - `public.users.role` is likely `student` for that account
- Material create fails with `course_id` missing:
  - run `materials.course_id` migration
- Class create fails with instructor null error:
  - run classes instructor default/not-null migration
