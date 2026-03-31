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
  student_id text,
  status text default 'Active',
  department text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

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
