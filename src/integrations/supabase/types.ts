export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      announcements: {
        Row: {
          body: string
          created_by: string | null
          id: string
          published_at: string
          target_class: string | null
          title: string
          xp_bonus: number | null
        }
        Insert: {
          body: string
          created_by?: string | null
          id?: string
          published_at?: string
          target_class?: string | null
          title: string
          xp_bonus?: number | null
        }
        Update: {
          body?: string
          created_by?: string | null
          id?: string
          published_at?: string
          target_class?: string | null
          title?: string
          xp_bonus?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      badges: {
        Row: {
          description: string
          emoji: string
          id: string
          name: string
        }
        Insert: {
          description: string
          emoji: string
          id: string
          name: string
        }
        Update: {
          description?: string
          emoji?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      challenges: {
        Row: {
          created_at: string
          description: string
          end_date: string | null
          id: string
          is_active: boolean
          start_date: string
          title: string
          type: string
          xp_reward: number
        }
        Insert: {
          created_at?: string
          description: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          start_date: string
          title: string
          type: string
          xp_reward?: number
        }
        Update: {
          created_at?: string
          description?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          start_date?: string
          title?: string
          type?: string
          xp_reward?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      rewards: {
        Row: {
          cost: number
          description: string
          emoji: string
          id: string
          name: string
        }
        Insert: {
          cost: number
          description: string
          emoji: string
          id: string
          name: string
        }
        Update: {
          cost?: number
          description?: string
          emoji?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      student_attendance: {
        Row: {
          created_at: string
          date: string
          id: string
          notes: string | null
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          notes?: string | null
          status: string
          student_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_badges: {
        Row: {
          badge_id: string
          date_earned: string
          id: string
          student_id: string
        }
        Insert: {
          badge_id: string
          date_earned?: string
          id?: string
          student_id: string
        }
        Update: {
          badge_id?: string
          date_earned?: string
          id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
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
          challenge_id: string
          completed_at: string
          id: string
          status: string
          student_id: string
        }
        Insert: {
          challenge_id: string
          completed_at?: string
          id?: string
          status?: string
          student_id: string
        }
        Update: {
          challenge_id?: string
          completed_at?: string
          id?: string
          status?: string
          student_id?: string
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
          fee_type: string
          id: string
          notes: string | null
          paid_date: string | null
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          due_date: string
          fee_type: string
          id?: string
          notes?: string | null
          paid_date?: string | null
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string
          fee_type?: string
          id?: string
          notes?: string | null
          paid_date?: string | null
          status?: string
          student_id?: string
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
          instance_id: string
          purchased_at: string
          reward_id: string
          student_id: string
        }
        Insert: {
          id?: string
          instance_id: string
          purchased_at?: string
          reward_id: string
          student_id: string
        }
        Update: {
          id?: string
          instance_id?: string
          purchased_at?: string
          reward_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_rewards_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "rewards"
            referencedColumns: ["id"]
          },
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
          student_id: string
          test_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          marks: number
          student_id: string
          test_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          marks?: number
          student_id?: string
          test_id?: string
          updated_at?: string
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
          category: Database["public"]["Enums"]["xp_category"]
          id: string
          student_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          category: Database["public"]["Enums"]["xp_category"]
          id?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: Database["public"]["Enums"]["xp_category"]
          id?: string
          student_id?: string
          updated_at?: string
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
          class: Database["public"]["Enums"]["class_name"]
          created_at: string
          created_by: string | null
          id: string
          name: string
          team: Database["public"]["Enums"]["team_name"] | null
          total_xp: number
          updated_at: string
        }
        Insert: {
          avatar?: string | null
          class: Database["public"]["Enums"]["class_name"]
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          team?: Database["public"]["Enums"]["team_name"] | null
          total_xp?: number
          updated_at?: string
        }
        Update: {
          avatar?: string | null
          class?: Database["public"]["Enums"]["class_name"]
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          team?: Database["public"]["Enums"]["team_name"] | null
          total_xp?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_tests: {
        Row: {
          class: Database["public"]["Enums"]["class_name"]
          created_at: string
          created_by: string | null
          id: string
          max_marks: number
          name: string
          subject: string
          test_date: string
          updated_at: string
        }
        Insert: {
          class: Database["public"]["Enums"]["class_name"]
          created_at?: string
          created_by?: string | null
          id?: string
          max_marks: number
          name: string
          subject: string
          test_date: string
          updated_at?: string
        }
        Update: {
          class?: Database["public"]["Enums"]["class_name"]
          created_at?: string
          created_by?: string | null
          id?: string
          max_marks?: number
          name?: string
          subject?: string
          test_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_tests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      class_name: "8th" | "9th" | "10th" | "11th" | "All"
      team_name: "Alpha" | "Bravo" | "Charlie"
      xp_category: "blackout" | "futureMe" | "recallWar"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      class_name: ["8th", "9th", "10th", "11th", "All"],
      team_name: ["Alpha", "Bravo", "Charlie"],
      xp_category: ["blackout", "futureMe", "recallWar"],
    },
  },
} as const
