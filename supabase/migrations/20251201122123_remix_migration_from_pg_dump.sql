CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.7

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



SET default_table_access_method = heap;

--
-- Name: academic_materials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.academic_materials (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    class text NOT NULL,
    subject_id uuid,
    material_type text NOT NULL,
    title text NOT NULL,
    description text,
    file_url text NOT NULL,
    file_name text NOT NULL,
    file_size bigint,
    uploaded_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT academic_materials_material_type_check CHECK ((material_type = ANY (ARRAY['notes'::text, 'pyq'::text])))
);


--
-- Name: announcements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.announcements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    published_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by text,
    target_class text,
    xp_bonus integer DEFAULT 0
);


--
-- Name: challenges; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.challenges (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    xp_reward integer NOT NULL,
    difficulty text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    type text,
    start_date timestamp with time zone,
    end_date timestamp with time zone,
    is_active boolean DEFAULT true
);


--
-- Name: class_fees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.class_fees (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    class text NOT NULL,
    amount numeric NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: divisions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.divisions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    class text NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: faculty; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.faculty (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    email text,
    phone text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: faculty_subjects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.faculty_subjects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    faculty_id uuid NOT NULL,
    subject_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: student_attendance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_attendance (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid,
    date date NOT NULL,
    status text NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    subject_id uuid,
    faculty_id uuid,
    CONSTRAINT attendance_status_check CHECK ((status = ANY (ARRAY['present'::text, 'absent'::text, 'late'::text, 'excused'::text])))
);


--
-- Name: student_badges; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_badges (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid,
    badge_id text NOT NULL,
    earned_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: student_challenges; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_challenges (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid,
    challenge_id uuid,
    completed_at timestamp with time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'completed'::text
);


--
-- Name: student_fees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_fees (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid,
    amount numeric NOT NULL,
    due_date date NOT NULL,
    status text NOT NULL,
    paid_date date,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    fee_type text,
    notes text,
    CONSTRAINT student_fees_status_check CHECK ((status = ANY (ARRAY['paid'::text, 'unpaid'::text, 'partial'::text, 'overdue'::text])))
);


--
-- Name: student_rewards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_rewards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid,
    reward_id text NOT NULL,
    purchased_at timestamp with time zone DEFAULT now() NOT NULL,
    used boolean DEFAULT false NOT NULL,
    used_at timestamp with time zone
);


--
-- Name: student_test_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_test_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    test_id uuid,
    student_id uuid,
    marks integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: student_xp; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_xp (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid,
    category text NOT NULL,
    amount integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: students; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.students (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    avatar text,
    class text NOT NULL,
    team text,
    total_xp integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    division_id uuid
);


--
-- Name: subjects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subjects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    class text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: timetable; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.timetable (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    class text NOT NULL,
    subject_id uuid NOT NULL,
    faculty_id uuid NOT NULL,
    day_of_week integer NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    room_number text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    type text DEFAULT 'regular'::text NOT NULL,
    specific_date date,
    start_date date,
    end_date date,
    CONSTRAINT timetable_day_of_week_check CHECK (((day_of_week >= 0) AND (day_of_week <= 6))),
    CONSTRAINT timetable_type_check CHECK ((type = ANY (ARRAY['regular'::text, 'special'::text])))
);


--
-- Name: weekly_tests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.weekly_tests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    subject text NOT NULL,
    max_marks integer NOT NULL,
    test_date date NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    class text
);


--
-- Name: academic_materials academic_materials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academic_materials
    ADD CONSTRAINT academic_materials_pkey PRIMARY KEY (id);


--
-- Name: announcements announcements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_pkey PRIMARY KEY (id);


--
-- Name: student_attendance attendance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_attendance
    ADD CONSTRAINT attendance_pkey PRIMARY KEY (id);


--
-- Name: student_attendance attendance_student_id_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_attendance
    ADD CONSTRAINT attendance_student_id_date_key UNIQUE (student_id, date);


--
-- Name: challenges challenges_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.challenges
    ADD CONSTRAINT challenges_pkey PRIMARY KEY (id);


--
-- Name: class_fees class_fees_class_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_fees
    ADD CONSTRAINT class_fees_class_key UNIQUE (class);


--
-- Name: class_fees class_fees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_fees
    ADD CONSTRAINT class_fees_pkey PRIMARY KEY (id);


--
-- Name: divisions divisions_class_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.divisions
    ADD CONSTRAINT divisions_class_name_key UNIQUE (class, name);


--
-- Name: divisions divisions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.divisions
    ADD CONSTRAINT divisions_pkey PRIMARY KEY (id);


--
-- Name: faculty faculty_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.faculty
    ADD CONSTRAINT faculty_pkey PRIMARY KEY (id);


--
-- Name: faculty_subjects faculty_subjects_faculty_id_subject_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.faculty_subjects
    ADD CONSTRAINT faculty_subjects_faculty_id_subject_id_key UNIQUE (faculty_id, subject_id);


--
-- Name: faculty_subjects faculty_subjects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.faculty_subjects
    ADD CONSTRAINT faculty_subjects_pkey PRIMARY KEY (id);


--
-- Name: student_badges student_badges_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_badges
    ADD CONSTRAINT student_badges_pkey PRIMARY KEY (id);


--
-- Name: student_challenges student_challenges_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_challenges
    ADD CONSTRAINT student_challenges_pkey PRIMARY KEY (id);


--
-- Name: student_challenges student_challenges_student_id_challenge_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_challenges
    ADD CONSTRAINT student_challenges_student_id_challenge_id_key UNIQUE (student_id, challenge_id);


--
-- Name: student_fees student_fees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_fees
    ADD CONSTRAINT student_fees_pkey PRIMARY KEY (id);


--
-- Name: student_rewards student_rewards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_rewards
    ADD CONSTRAINT student_rewards_pkey PRIMARY KEY (id);


--
-- Name: student_test_results student_test_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_test_results
    ADD CONSTRAINT student_test_results_pkey PRIMARY KEY (id);


--
-- Name: student_test_results student_test_results_test_id_student_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_test_results
    ADD CONSTRAINT student_test_results_test_id_student_id_key UNIQUE (test_id, student_id);


--
-- Name: student_xp student_xp_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_xp
    ADD CONSTRAINT student_xp_pkey PRIMARY KEY (id);


--
-- Name: students students_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_pkey PRIMARY KEY (id);


--
-- Name: subjects subjects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subjects
    ADD CONSTRAINT subjects_pkey PRIMARY KEY (id);


--
-- Name: timetable timetable_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timetable
    ADD CONSTRAINT timetable_pkey PRIMARY KEY (id);


--
-- Name: weekly_tests weekly_tests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.weekly_tests
    ADD CONSTRAINT weekly_tests_pkey PRIMARY KEY (id);


--
-- Name: idx_students_division_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_students_division_id ON public.students USING btree (division_id);


--
-- Name: idx_timetable_dates; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_timetable_dates ON public.timetable USING btree (specific_date, start_date, end_date);


--
-- Name: academic_materials academic_materials_subject_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academic_materials
    ADD CONSTRAINT academic_materials_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON DELETE CASCADE;


--
-- Name: academic_materials academic_materials_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academic_materials
    ADD CONSTRAINT academic_materials_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES auth.users(id);


--
-- Name: student_attendance attendance_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_attendance
    ADD CONSTRAINT attendance_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: faculty_subjects faculty_subjects_faculty_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.faculty_subjects
    ADD CONSTRAINT faculty_subjects_faculty_id_fkey FOREIGN KEY (faculty_id) REFERENCES public.faculty(id) ON DELETE CASCADE;


--
-- Name: faculty_subjects faculty_subjects_subject_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.faculty_subjects
    ADD CONSTRAINT faculty_subjects_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON DELETE CASCADE;


--
-- Name: student_attendance student_attendance_faculty_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_attendance
    ADD CONSTRAINT student_attendance_faculty_id_fkey FOREIGN KEY (faculty_id) REFERENCES public.faculty(id) ON DELETE SET NULL;


--
-- Name: student_attendance student_attendance_subject_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_attendance
    ADD CONSTRAINT student_attendance_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON DELETE SET NULL;


--
-- Name: student_badges student_badges_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_badges
    ADD CONSTRAINT student_badges_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: student_challenges student_challenges_challenge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_challenges
    ADD CONSTRAINT student_challenges_challenge_id_fkey FOREIGN KEY (challenge_id) REFERENCES public.challenges(id) ON DELETE CASCADE;


--
-- Name: student_challenges student_challenges_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_challenges
    ADD CONSTRAINT student_challenges_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: student_fees student_fees_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_fees
    ADD CONSTRAINT student_fees_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: student_rewards student_rewards_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_rewards
    ADD CONSTRAINT student_rewards_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: student_test_results student_test_results_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_test_results
    ADD CONSTRAINT student_test_results_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: student_test_results student_test_results_test_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_test_results
    ADD CONSTRAINT student_test_results_test_id_fkey FOREIGN KEY (test_id) REFERENCES public.weekly_tests(id) ON DELETE CASCADE;


--
-- Name: student_xp student_xp_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_xp
    ADD CONSTRAINT student_xp_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: students students_division_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_division_id_fkey FOREIGN KEY (division_id) REFERENCES public.divisions(id) ON DELETE SET NULL;


--
-- Name: timetable timetable_faculty_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timetable
    ADD CONSTRAINT timetable_faculty_id_fkey FOREIGN KEY (faculty_id) REFERENCES public.faculty(id) ON DELETE CASCADE;


--
-- Name: timetable timetable_subject_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timetable
    ADD CONSTRAINT timetable_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON DELETE CASCADE;


--
-- Name: announcements Allow all for authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all for authenticated users" ON public.announcements TO authenticated USING (true) WITH CHECK (true);


--
-- Name: challenges Allow all for authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all for authenticated users" ON public.challenges TO authenticated USING (true) WITH CHECK (true);


--
-- Name: class_fees Allow all for authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all for authenticated users" ON public.class_fees TO authenticated USING (true) WITH CHECK (true);


--
-- Name: divisions Allow all for authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all for authenticated users" ON public.divisions TO authenticated USING (true) WITH CHECK (true);


--
-- Name: faculty Allow all for authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all for authenticated users" ON public.faculty TO authenticated USING (true) WITH CHECK (true);


--
-- Name: faculty_subjects Allow all for authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all for authenticated users" ON public.faculty_subjects TO authenticated USING (true) WITH CHECK (true);


--
-- Name: student_attendance Allow all for authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all for authenticated users" ON public.student_attendance TO authenticated USING (true) WITH CHECK (true);


--
-- Name: student_badges Allow all for authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all for authenticated users" ON public.student_badges TO authenticated USING (true) WITH CHECK (true);


--
-- Name: student_challenges Allow all for authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all for authenticated users" ON public.student_challenges TO authenticated USING (true) WITH CHECK (true);


--
-- Name: student_fees Allow all for authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all for authenticated users" ON public.student_fees TO authenticated USING (true) WITH CHECK (true);


--
-- Name: student_rewards Allow all for authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all for authenticated users" ON public.student_rewards TO authenticated USING (true) WITH CHECK (true);


--
-- Name: student_test_results Allow all for authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all for authenticated users" ON public.student_test_results TO authenticated USING (true) WITH CHECK (true);


--
-- Name: student_xp Allow all for authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all for authenticated users" ON public.student_xp TO authenticated USING (true) WITH CHECK (true);


--
-- Name: students Allow all for authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all for authenticated users" ON public.students TO authenticated USING (true) WITH CHECK (true);


--
-- Name: timetable Allow all for authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all for authenticated users" ON public.timetable TO authenticated USING (true) WITH CHECK (true);


--
-- Name: weekly_tests Allow all for authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all for authenticated users" ON public.weekly_tests TO authenticated USING (true) WITH CHECK (true);


--
-- Name: academic_materials Allow delete for materials; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow delete for materials" ON public.academic_materials FOR DELETE TO authenticated USING ((uploaded_by = auth.uid()));


--
-- Name: academic_materials Allow insert for materials; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow insert for materials" ON public.academic_materials FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: subjects Allow insert for subjects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow insert for subjects" ON public.subjects FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: academic_materials Allow read access for materials; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow read access for materials" ON public.academic_materials FOR SELECT TO authenticated USING (true);


--
-- Name: subjects Allow read access for subjects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow read access for subjects" ON public.subjects FOR SELECT TO authenticated USING (true);


--
-- Name: academic_materials Allow update for materials; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow update for materials" ON public.academic_materials FOR UPDATE TO authenticated USING ((uploaded_by = auth.uid()));


--
-- Name: academic_materials; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.academic_materials ENABLE ROW LEVEL SECURITY;

--
-- Name: announcements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

--
-- Name: challenges; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

--
-- Name: class_fees; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.class_fees ENABLE ROW LEVEL SECURITY;

--
-- Name: divisions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.divisions ENABLE ROW LEVEL SECURITY;

--
-- Name: faculty; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.faculty ENABLE ROW LEVEL SECURITY;

--
-- Name: faculty_subjects; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.faculty_subjects ENABLE ROW LEVEL SECURITY;

--
-- Name: student_attendance; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.student_attendance ENABLE ROW LEVEL SECURITY;

--
-- Name: student_badges; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.student_badges ENABLE ROW LEVEL SECURITY;

--
-- Name: student_challenges; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.student_challenges ENABLE ROW LEVEL SECURITY;

--
-- Name: student_fees; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.student_fees ENABLE ROW LEVEL SECURITY;

--
-- Name: student_rewards; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.student_rewards ENABLE ROW LEVEL SECURITY;

--
-- Name: student_test_results; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.student_test_results ENABLE ROW LEVEL SECURITY;

--
-- Name: student_xp; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.student_xp ENABLE ROW LEVEL SECURITY;

--
-- Name: students; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

--
-- Name: subjects; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

--
-- Name: timetable; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.timetable ENABLE ROW LEVEL SECURITY;

--
-- Name: weekly_tests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.weekly_tests ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--


