-- Run this in Supabase SQL editor.
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  uid uuid unique,
  first_name text,
  middle_name text,
  last_name text,
  email text unique not null,
  role text default 'student',
  profile_completed boolean default false,
  profile_step int default 1,
  xp int default 0,
  year_level text,
  class_id bigint,
  class_code text,
  student_id text,
  status text default 'Active',
  department text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.users add column if not exists class_code text;
alter table public.users add column if not exists class_id bigint;
alter table public.users add column if not exists bio text;
alter table public.users add column if not exists middle_name text;

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

create table if not exists public.classes (
  id bigint generated always as identity primary key,
  name text not null,
  code text not null,
  instructor text default '',
  students int default 0,
  created_at timestamptz default now()
);

alter table public.classes alter column instructor set default '';
alter table public.classes alter column instructor drop not null;

alter table public.users
  drop constraint if exists users_class_id_fkey;

alter table public.users
  add constraint users_class_id_fkey
  foreign key (class_id) references public.classes(id) on delete set null;

create table if not exists public.courses (
  id bigint generated always as identity primary key,
  name text not null,
  code text not null,
  description text,
  instructor text default '',
  owner_id uuid references public.users(id) on delete set null,
  classes jsonb default '[]'::jsonb,
  lessons jsonb default '[]'::jsonb,
  materials jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

alter table public.courses add column if not exists instructor text default '';
alter table public.courses add column if not exists owner_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'courses_owner_id_fkey'
  ) then
    alter table public.courses
      add constraint courses_owner_id_fkey
      foreign key (owner_id) references public.users(id) on delete set null;
  end if;
end $$;

-- One-time legacy backfill for per-professor ownership.
-- 1) Try to map course.instructor to admin full name.
-- 2) Remaining unowned courses fall back to the first admin account.
with admin_names as (
  select
    id,
    lower(trim(concat_ws(' ', first_name, last_name))) as full_name
  from public.users
  where role = 'admin'
),
matched as (
  select c.id as course_id, a.id as admin_id
  from public.courses c
  join admin_names a
    on lower(trim(coalesce(c.instructor, ''))) = a.full_name
  where c.owner_id is null
)
update public.courses c
set owner_id = m.admin_id
from matched m
where c.id = m.course_id
  and c.owner_id is null;

with fallback_admin as (
  select id
  from public.users
  where role = 'admin'
  order by created_at asc nulls last, id asc
  limit 1
)
update public.courses c
set owner_id = fa.id
from fallback_admin fa
where c.owner_id is null;

create table if not exists public.course_enrollments (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  course_id bigint not null references public.courses(id) on delete cascade,
  created_at timestamptz default now(),
  unique(user_id, course_id)
);

create table if not exists public.course_classes (
  id bigint generated always as identity primary key,
  course_id bigint not null references public.courses(id) on delete cascade,
  class_id bigint not null references public.classes(id) on delete cascade,
  created_at timestamptz default now(),
  unique(course_id, class_id)
);

insert into public.course_classes (course_id, class_id)
select c.id, cls.id
from public.courses c
cross join lateral jsonb_array_elements_text(coalesce(c.classes, '[]'::jsonb)) as code(value)
join public.classes cls on cls.code = code.value
on conflict (course_id, class_id) do nothing;

update public.users u
set class_id = cls.id
from public.classes cls
where u.class_id is null
  and u.class_code is not null
  and cls.code = u.class_code;

insert into public.course_enrollments (user_id, course_id)
select u.id, c.id
from public.users u
cross join public.courses c
where u.role = 'student'
on conflict (user_id, course_id) do nothing;

create table if not exists public.challenges (
  id bigint generated always as identity primary key,
  title text not null,
  points int default 0,
  completed int default 0,
  status text default 'Active',
  created_at timestamptz default now()
);

create table if not exists public.materials (
  id bigint generated always as identity primary key,
  title text not null,
  description text,
  course_id bigint,
  lesson text,
  file_url text,
  uploaded_at timestamptz default now(),
  foreign key (course_id) references public.courses(id) on delete cascade
);

alter table public.materials add column if not exists course_id bigint;

create table if not exists public.user_progress (
  id bigint generated always as identity primary key,
  name text not null,
  module text not null,
  progress int default 0,
  status text default 'Not Started',
  last_updated text,
  created_at timestamptz default now()
);

-- Challenge gameplay extensions for capstone flow.
alter table public.challenges add column if not exists course_id bigint;
alter table public.challenges add column if not exists question_text text;
alter table public.challenges add column if not exists options jsonb default '[]'::jsonb;
alter table public.challenges add column if not exists correct_answer text;
alter table public.challenges add column if not exists explanation text;
alter table public.challenges add column if not exists lesson_order int default 1;
alter table public.challenges add column if not exists required_xp int default 0;

create table if not exists public.challenge_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  challenge_id bigint not null references public.challenges(id) on delete cascade,
  selected_answer text,
  is_correct boolean default false,
  awarded_xp int default 0,
  attempts_count int default 0,
  last_attempt_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, challenge_id)
);
