import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Division, Subject, Faculty, Room, Timetable, Challenge, Announcement, ClassName } from '@/types';
import { toast } from 'sonner';

const STALE_TIME = 10 * 60 * 1000; // 10 minutes for less volatile data
const GC_TIME = 60 * 60 * 1000; // 1 hour

// Divisions - rarely changes
export function useDivisionsQuery(tuitionId: string | null) {
  return useQuery({
    queryKey: ['divisions', tuitionId],
    queryFn: async () => {
      if (!tuitionId) return [];

      const { data, error } = await supabase
        .from('divisions')
        .select('*')
        .order('class', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;

      return data.map(div => ({
        id: div.id,
        class: div.class as ClassName,
        name: div.name,
        createdAt: div.created_at,
      })) as Division[];
    },
    enabled: !!tuitionId,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });
}

// Subjects - rarely changes
export function useSubjectsQuery(tuitionId: string | null) {
  return useQuery({
    queryKey: ['subjects', tuitionId],
    queryFn: async () => {
      if (!tuitionId) return [];

      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .order('class', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;

      return data.map(s => ({
        id: s.id,
        name: s.name,
        class: s.class,
        createdAt: s.created_at,
      })) as Subject[];
    },
    enabled: !!tuitionId,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });
}

// Faculty - rarely changes
export function useFacultyQuery(tuitionId: string | null) {
  return useQuery({
    queryKey: ['faculty', tuitionId],
    queryFn: async () => {
      if (!tuitionId) return [];

      const { data, error } = await supabase
        .from('faculty')
        .select(`
          *,
          faculty_subjects (
            subject_id,
            subjects (*)
          )
        `)
        .order('name');

      if (error) throw error;

      return data.map((f: any) => ({
        id: f.id,
        name: f.name,
        email: f.email,
        phone: f.phone,
        subjects: f.faculty_subjects?.map((fs: any) => ({
          id: fs.subjects.id,
          name: fs.subjects.name,
          class: fs.subjects.class,
          createdAt: fs.subjects.created_at,
        })) || [],
        createdAt: f.created_at,
        updatedAt: f.updated_at,
      })) as Faculty[];
    },
    enabled: !!tuitionId,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });
}

// Rooms - rarely changes
export function useRoomsQuery(tuitionId: string | null) {
  return useQuery({
    queryKey: ['rooms', tuitionId],
    queryFn: async () => {
      if (!tuitionId) return [];

      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .order('name');

      if (error) throw error;

      return data.map(r => ({
        id: r.id,
        name: r.name,
        capacity: r.capacity,
        description: r.description,
        isActive: r.is_active,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      })) as Room[];
    },
    enabled: !!tuitionId,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });
}

// Timetable
export function useTimetableQuery(tuitionId: string | null) {
  return useQuery({
    queryKey: ['timetable', tuitionId],
    queryFn: async () => {
      if (!tuitionId) return [];

      const { data, error } = await supabase
        .from('timetable')
        .select(`
          *,
          subjects (*),
          faculty (*),
          divisions (*)
        `)
        .order('day_of_week', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw error;

      return data.map((t: any) => ({
        id: t.id,
        class: t.class,
        divisionId: t.division_id,
        division: t.divisions ? {
          id: t.divisions.id,
          class: t.divisions.class as ClassName,
          name: t.divisions.name,
          createdAt: t.divisions.created_at,
        } : undefined,
        subjectId: t.subject_id,
        facultyId: t.faculty_id,
        dayOfWeek: t.day_of_week,
        startTime: t.start_time,
        endTime: t.end_time,
        roomNumber: t.room_number,
        roomId: t.room_id,
        type: t.type || 'regular',
        specificDate: t.specific_date,
        startDate: t.start_date,
        endDate: t.end_date,
        eventType: t.event_type,
        notes: t.notes,
        subject: t.subjects ? {
          id: t.subjects.id,
          name: t.subjects.name,
          class: t.subjects.class,
          createdAt: t.subjects.created_at,
        } : undefined,
        faculty: t.faculty ? {
          id: t.faculty.id,
          name: t.faculty.name,
          email: t.faculty.email,
          phone: t.faculty.phone,
          createdAt: t.faculty.created_at,
          updatedAt: t.faculty.updated_at,
        } : undefined,
        createdAt: t.created_at,
        updatedAt: t.updated_at,
      })) as Timetable[];
    },
    enabled: !!tuitionId,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });
}

// Challenges
export function useChallengesQuery(tuitionId: string | null) {
  return useQuery({
    queryKey: ['challenges', tuitionId],
    queryFn: async () => {
      if (!tuitionId) return [];

      const { data, error } = await supabase
        .from('challenges')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(challenge => ({
        id: challenge.id,
        title: challenge.title,
        description: challenge.description,
        type: challenge.type,
        xpReward: challenge.xp_reward,
        startDate: challenge.start_date,
        endDate: challenge.end_date,
        isActive: challenge.is_active,
        createdAt: challenge.created_at,
      })) as Challenge[];
    },
    enabled: !!tuitionId,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });
}

// Announcements
export function useAnnouncementsQuery(tuitionId: string | null) {
  return useQuery({
    queryKey: ['announcements', tuitionId],
    queryFn: async () => {
      if (!tuitionId) return [];

      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('published_at', { ascending: false })
        .limit(50); // Only recent announcements

      if (error) throw error;

      return data.map(announcement => ({
        id: announcement.id,
        title: announcement.title,
        body: announcement.body,
        publishedAt: announcement.published_at,
        createdBy: announcement.created_by,
        targetClass: announcement.target_class,
        xpBonus: announcement.xp_bonus,
      })) as Announcement[];
    },
    enabled: !!tuitionId,
    staleTime: 5 * 60 * 1000, // 5 min for announcements
    gcTime: GC_TIME,
  });
}

// Student Challenges
export function useStudentChallengesQuery(tuitionId: string | null) {
  return useQuery({
    queryKey: ['studentChallenges', tuitionId],
    queryFn: async () => {
      if (!tuitionId) return [];

      const { data, error } = await supabase
        .from('student_challenges')
        .select('*');

      if (error) throw error;

      return data.map(sc => ({
        id: sc.id,
        studentId: sc.student_id,
        challengeId: sc.challenge_id,
        completedAt: sc.completed_at,
        status: sc.status,
      }));
    },
    enabled: !!tuitionId,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });
}
