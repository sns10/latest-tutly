-- Create faculty table
create table public.faculty (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Enable RLS on faculty
alter table public.faculty enable row level security;

-- RLS policies for faculty
create policy "Allow all for authenticated users"
on public.faculty
for all
to authenticated
using (true)
with check (true);

-- Create faculty-subjects mapping table (many-to-many)
create table public.faculty_subjects (
  id uuid primary key default gen_random_uuid(),
  faculty_id uuid references public.faculty(id) on delete cascade not null,
  subject_id uuid references public.subjects(id) on delete cascade not null,
  created_at timestamptz default now() not null,
  unique(faculty_id, subject_id)
);

-- Enable RLS on faculty_subjects
alter table public.faculty_subjects enable row level security;

-- RLS policies for faculty_subjects
create policy "Allow all for authenticated users"
on public.faculty_subjects
for all
to authenticated
using (true)
with check (true);

-- Create timetable/schedule table
create table public.timetable (
  id uuid primary key default gen_random_uuid(),
  class text not null,
  subject_id uuid references public.subjects(id) on delete cascade not null,
  faculty_id uuid references public.faculty(id) on delete cascade not null,
  day_of_week integer not null check (day_of_week >= 0 and day_of_week <= 6),
  start_time time not null,
  end_time time not null,
  room_number text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Enable RLS on timetable
alter table public.timetable enable row level security;

-- RLS policies for timetable
create policy "Allow all for authenticated users"
on public.timetable
for all
to authenticated
using (true)
with check (true);

-- Add subject and faculty columns to student_attendance
alter table public.student_attendance 
  add column subject_id uuid references public.subjects(id) on delete set null,
  add column faculty_id uuid references public.faculty(id) on delete set null;