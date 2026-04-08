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
# Installs all dependencies including canvas-confetti for confetti animation
```

```bash
cd ../backend
npm install
```
## 11. Animation Effects (Confetti)

The frontend uses [canvas-confetti](https://www.npmjs.com/package/canvas-confetti) to display a confetti animation when a student answers a challenge correctly.

**Troubleshooting:**
- If you do not see the confetti animation, ensure that your operating system's "Animation effects" (Windows) or "Reduce motion" (macOS) setting is enabled to allow animations. Chrome and other browsers respect this system setting.
- The confetti effect will not appear if "prefers-reduced-motion" is enabled.

No additional setup is required beyond `npm install` in the frontend directory.

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
- `users.bio`
- class instructor nullable/default update

If needed, run explicitly:

```sql
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS instructor text default '';
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS owner_id uuid;
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS course_id bigint;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE public.classes ALTER COLUMN instructor SET DEFAULT '';
ALTER TABLE public.classes ALTER COLUMN instructor DROP NOT NULL;
```

Health-check helper function (needed for `/health` FK warning verification):

```sql
create or replace function public.has_users_auth_fk_cascade()
returns boolean
language sql
security definer
set search_path = public, auth, pg_catalog
as $$
  select exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'users'
      and c.contype = 'f'
      and pg_get_constraintdef(c.oid) ilike '%references auth.users(id)%'
      and pg_get_constraintdef(c.oid) ilike '%on delete cascade%'
  );
$$;

grant execute on function public.has_users_auth_fk_cascade() to anon, authenticated, service_role;
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
- `/health` responds with `warnings: []` or meaningful warning text if FK check cannot be verified

## 10. Common Issues
- Student redirected to profile setup instead of admin dashboard:
  - `public.users.role` is likely `student` for that account
- Material create fails with `course_id` missing:
  - run `materials.course_id` migration
- Class create fails with instructor null error:
  - run classes instructor default/not-null migration

- Student created from User Management cannot log in:
  - ensure email + password were entered during creation
  - confirm auth user exists under Supabase Authentication -> Users
  - reset password in Supabase if needed

- Login rejects valid old password format:
  - ensure backend/frontend are updated; current login should not enforce strong password regex
