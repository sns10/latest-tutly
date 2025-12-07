export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      academic_materials: {
        Row: {
          class: string
          created_at: string
          description: string | null
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          material_type: string
          subject_id: string | null
          title: string
          tuition_id: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          class: string
          created_at?: string
          description?: string | null
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          material_type: string
          subject_id?: string | null
          title: string
          tuition_id: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          class?: string
          created_at?: string
          description?: string | null
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          material_type?: string
          subject_id?: string | null
          title?: string
          tuition_id?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "academic_materials_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_materials_tuition_id_fkey"
            columns: ["tuition_id"]
            isOneToOne: false
            referencedRelation: "tuitions"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          body: string
          created_by: string | null
          id: string
          published_at: string
          target_class: string | null
          title: string
          tuition_id: string
          xp_bonus: number | null
        }
        Insert: {
          body: string
          created_by?: string | null
          id?: string
          published_at?: string
          target_class?: string | null
          title: string
          tuition_id: string
          xp_bonus?: number | null
        }
        Update: {
          body?: string
          created_by?: string | null
          id?: string
          published_at?: string
          target_class?: string | null
          title?: string
          tuition_id?: string
          xp_bonus?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "announcements_tuition_id_fkey"
            columns: ["tuition_id"]
            isOneToOne: false
            referencedRelation: "tuitions"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          created_at: string
          description: string
          difficulty: string
          end_date: string | null
          id: string
          is_active: boolean | null
          start_date: string | null
          title: string
          tuition_id: string
          type: string | null
          xp_reward: number
        }
        Insert: {
          created_at?: string
          description: string
          difficulty: string
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          start_date?: string | null
          title: string
          tuition_id: string
          type?: string | null
          xp_reward: number
        }
        Update: {
          created_at?: string
          description?: string
          difficulty?: string
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          start_date?: string | null
          title?: string
          tuition_id?: string
          type?: string | null
          xp_reward?: number
        }
        Relationships: [
          {
            foreignKeyName: "challenges_tuition_id_fkey"
            columns: ["tuition_id"]
            isOneToOne: false
            referencedRelation: "tuitions"
            referencedColumns: ["id"]
          },
        ]
      }
      class_fees: {
        Row: {
          amount: number
          class: string
          created_at: string
          id: string
          tuition_id: string
        }
        Insert: {
          amount: number
          class: string
          created_at?: string
          id?: string
          tuition_id: string
        }
        Update: {
          amount?: number
          class?: string
          created_at?: string
          id?: string
          tuition_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_fees_tuition_id_fkey"
            columns: ["tuition_id"]
            isOneToOne: false
            referencedRelation: "tuitions"
            referencedColumns: ["id"]
          },
        ]
      }
      divisions: {
        Row: {
          class: string
          created_at: string
          id: string
          name: string
          tuition_id: string
        }
        Insert: {
          class: string
          created_at?: string
          id?: string
          name: string
          tuition_id: string
        }
        Update: {
          class?: string
          created_at?: string
          id?: string
          name?: string
          tuition_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "divisions_tuition_id_fkey"
            columns: ["tuition_id"]
            isOneToOne: false
            referencedRelation: "tuitions"
            referencedColumns: ["id"]
          },
        ]
      }
      faculty: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          tuition_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          tuition_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          tuition_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "faculty_tuition_id_fkey"
            columns: ["tuition_id"]
            isOneToOne: false
            referencedRelation: "tuitions"
            referencedColumns: ["id"]
          },
        ]
      }
      faculty_subjects: {
        Row: {
          created_at: string
          faculty_id: string
          id: string
          subject_id: string
        }
        Insert: {
          created_at?: string
          faculty_id: string
          id?: string
          subject_id: string
        }
        Update: {
          created_at?: string
          faculty_id?: string
          id?: string
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "faculty_subjects_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "faculty"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faculty_subjects_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          tuition_id: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          tuition_id?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          tuition_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tuition_id_fkey"
            columns: ["tuition_id"]
            isOneToOne: false
            referencedRelation: "tuitions"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          capacity: number | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          tuition_id: string
          updated_at: string
        }
        Insert: {
          capacity?: number | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          tuition_id: string
          updated_at?: string
        }
        Update: {
          capacity?: number | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          tuition_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rooms_tuition_id_fkey"
            columns: ["tuition_id"]
            isOneToOne: false
            referencedRelation: "tuitions"
            referencedColumns: ["id"]
          },
        ]
      }
      student_attendance: {
        Row: {
          created_at: string
          date: string
          faculty_id: string | null
          id: string
          notes: string | null
          status: string
          student_id: string | null
          subject_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          date: string
          faculty_id?: string | null
          id?: string
          notes?: string | null
          status: string
          student_id?: string | null
          subject_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          faculty_id?: string | null
          id?: string
          notes?: string | null
          status?: string
          student_id?: string | null
          subject_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_attendance_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "faculty"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_attendance_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      student_badges: {
        Row: {
          badge_id: string
          earned_at: string
          id: string
          student_id: string | null
        }
        Insert: {
          badge_id: string
          earned_at?: string
          id?: string
          student_id?: string | null
        }
        Update: {
          badge_id?: string
          earned_at?: string
          id?: string
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_badges_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_challenges: {
        Row: {
          challenge_id: string | null
          completed_at: string
          id: string
          status: string | null
          student_id: string | null
        }
        Insert: {
          challenge_id?: string | null
          completed_at?: string
          id?: string
          status?: string | null
          student_id?: string | null
        }
        Update: {
          challenge_id?: string | null
          completed_at?: string
          id?: string
          status?: string | null
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_challenges_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_challenges_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_fees: {
        Row: {
          amount: number
          created_at: string
          due_date: string
          fee_type: string | null
          id: string
          notes: string | null
          paid_date: string | null
          status: string
          student_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          due_date: string
          fee_type?: string | null
          id?: string
          notes?: string | null
          paid_date?: string | null
          status: string
          student_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string
          fee_type?: string | null
          id?: string
          notes?: string | null
          paid_date?: string | null
          status?: string
          student_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_fees_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_rewards: {
        Row: {
          id: string
          purchased_at: string
          reward_id: string
          student_id: string | null
          used: boolean
          used_at: string | null
        }
        Insert: {
          id?: string
          purchased_at?: string
          reward_id: string
          student_id?: string | null
          used?: boolean
          used_at?: string | null
        }
        Update: {
          id?: string
          purchased_at?: string
          reward_id?: string
          student_id?: string | null
          used?: boolean
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_rewards_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_test_results: {
        Row: {
          created_at: string
          id: string
          marks: number
          student_id: string | null
          test_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          marks: number
          student_id?: string | null
          test_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          marks?: number
          student_id?: string | null
          test_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_test_results_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_test_results_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "weekly_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      student_xp: {
        Row: {
          amount: number
          category: string
          created_at: string
          id: string
          student_id: string | null
        }
        Insert: {
          amount?: number
          category: string
          created_at?: string
          id?: string
          student_id?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          id?: string
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_xp_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          avatar: string | null
          class: string
          created_at: string
          division_id: string | null
          email: string | null
          id: string
          name: string
          team: string | null
          total_xp: number
          tuition_id: string
          user_id: string | null
        }
        Insert: {
          avatar?: string | null
          class: string
          created_at?: string
          division_id?: string | null
          email?: string | null
          id?: string
          name: string
          team?: string | null
          total_xp?: number
          tuition_id: string
          user_id?: string | null
        }
        Update: {
          avatar?: string | null
          class?: string
          created_at?: string
          division_id?: string | null
          email?: string | null
          id?: string
          name?: string
          team?: string | null
          total_xp?: number
          tuition_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_tuition_id_fkey"
            columns: ["tuition_id"]
            isOneToOne: false
            referencedRelation: "tuitions"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          class: string
          created_at: string
          id: string
          name: string
          tuition_id: string
        }
        Insert: {
          class: string
          created_at?: string
          id?: string
          name: string
          tuition_id: string
        }
        Update: {
          class?: string
          created_at?: string
          id?: string
          name?: string
          tuition_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subjects_tuition_id_fkey"
            columns: ["tuition_id"]
            isOneToOne: false
            referencedRelation: "tuitions"
            referencedColumns: ["id"]
          },
        ]
      }
      term_exam_results: {
        Row: {
          created_at: string
          grade: string | null
          id: string
          marks: number | null
          student_id: string
          subject_id: string
          term_exam_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          grade?: string | null
          id?: string
          marks?: number | null
          student_id: string
          subject_id: string
          term_exam_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          grade?: string | null
          id?: string
          marks?: number | null
          student_id?: string
          subject_id?: string
          term_exam_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "term_exam_results_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "term_exam_results_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "term_exam_results_term_exam_id_fkey"
            columns: ["term_exam_id"]
            isOneToOne: false
            referencedRelation: "term_exams"
            referencedColumns: ["id"]
          },
        ]
      }
      term_exam_subjects: {
        Row: {
          created_at: string
          exam_date: string | null
          id: string
          max_marks: number
          subject_id: string
          term_exam_id: string
        }
        Insert: {
          created_at?: string
          exam_date?: string | null
          id?: string
          max_marks?: number
          subject_id: string
          term_exam_id: string
        }
        Update: {
          created_at?: string
          exam_date?: string | null
          id?: string
          max_marks?: number
          subject_id?: string
          term_exam_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "term_exam_subjects_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "term_exam_subjects_term_exam_id_fkey"
            columns: ["term_exam_id"]
            isOneToOne: false
            referencedRelation: "term_exams"
            referencedColumns: ["id"]
          },
        ]
      }
      term_exams: {
        Row: {
          academic_year: string
          class: string
          created_at: string
          end_date: string | null
          id: string
          name: string
          start_date: string | null
          term: string
          tuition_id: string
          updated_at: string
        }
        Insert: {
          academic_year: string
          class: string
          created_at?: string
          end_date?: string | null
          id?: string
          name: string
          start_date?: string | null
          term: string
          tuition_id: string
          updated_at?: string
        }
        Update: {
          academic_year?: string
          class?: string
          created_at?: string
          end_date?: string | null
          id?: string
          name?: string
          start_date?: string | null
          term?: string
          tuition_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "term_exams_tuition_id_fkey"
            columns: ["tuition_id"]
            isOneToOne: false
            referencedRelation: "tuitions"
            referencedColumns: ["id"]
          },
        ]
      }
      timetable: {
        Row: {
          class: string
          created_at: string
          day_of_week: number
          division_id: string | null
          end_date: string | null
          end_time: string
          event_type: string | null
          faculty_id: string
          id: string
          notes: string | null
          room_id: string | null
          room_number: string | null
          specific_date: string | null
          start_date: string | null
          start_time: string
          subject_id: string
          tuition_id: string
          type: string
          updated_at: string
        }
        Insert: {
          class: string
          created_at?: string
          day_of_week: number
          division_id?: string | null
          end_date?: string | null
          end_time: string
          event_type?: string | null
          faculty_id: string
          id?: string
          notes?: string | null
          room_id?: string | null
          room_number?: string | null
          specific_date?: string | null
          start_date?: string | null
          start_time: string
          subject_id: string
          tuition_id: string
          type?: string
          updated_at?: string
        }
        Update: {
          class?: string
          created_at?: string
          day_of_week?: number
          division_id?: string | null
          end_date?: string | null
          end_time?: string
          event_type?: string | null
          faculty_id?: string
          id?: string
          notes?: string | null
          room_id?: string | null
          room_number?: string | null
          specific_date?: string | null
          start_date?: string | null
          start_time?: string
          subject_id?: string
          tuition_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "timetable_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "faculty"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_tuition_id_fkey"
            columns: ["tuition_id"]
            isOneToOne: false
            referencedRelation: "tuitions"
            referencedColumns: ["id"]
          },
        ]
      }
      tuitions: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          features: Json | null
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          phone: string | null
          subscription_end_date: string | null
          subscription_start_date: string | null
          subscription_status: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          phone?: string | null
          subscription_end_date?: string | null
          subscription_start_date?: string | null
          subscription_status?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          phone?: string | null
          subscription_end_date?: string | null
          subscription_start_date?: string | null
          subscription_status?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          tuition_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          tuition_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tuition_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_tuition_id_fkey"
            columns: ["tuition_id"]
            isOneToOne: false
            referencedRelation: "tuitions"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_tests: {
        Row: {
          class: string | null
          created_at: string
          id: string
          max_marks: number
          name: string
          subject: string
          test_date: string
          tuition_id: string
        }
        Insert: {
          class?: string | null
          created_at?: string
          id?: string
          max_marks: number
          name: string
          subject: string
          test_date: string
          tuition_id: string
        }
        Update: {
          class?: string | null
          created_at?: string
          id?: string
          max_marks?: number
          name?: string
          subject?: string
          test_date?: string
          tuition_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_tests_tuition_id_fkey"
            columns: ["tuition_id"]
            isOneToOne: false
            referencedRelation: "tuitions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_tuition_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      setup_tuition_admin: {
        Args: { _full_name: string; _tuition_id: string; _user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "super_admin" | "tuition_admin" | "student" | "parent"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["super_admin", "tuition_admin", "student", "parent"],
    },
  },
} as const
