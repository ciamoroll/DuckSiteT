-- Run this in Supabase SQL editor.
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  uid uuid unique,
  first_name text,
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

alter table public.users
  drop constraint if exists users_class_id_fkey;

alter table public.users
  add constraint users_class_id_fkey
  foreign key (class_id) references public.classes(id) on delete set null;

create table if not exists public.classes (
  id bigint generated always as identity primary key,
  name text not null,
  code text not null,
  instructor text not null,
  students int default 0,
  created_at timestamptz default now()
);

create table if not exists public.courses (
  id bigint generated always as identity primary key,
  name text not null,
  code text not null,
  description text,
  classes jsonb default '[]'::jsonb,
  lessons jsonb default '[]'::jsonb,
  materials jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

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
  course text,
  lesson text,
  file_url text,
  uploaded_at timestamptz default now()
);

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
