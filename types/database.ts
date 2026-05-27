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
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      consultation_reports: {
        Row: {
          ai_triage_label: Database["public"]["Enums"]["triage_level"] | null
          assigned_clinician_id: string | null
          chief_complaint: string
          clinician_notes: string | null
          clinician_triage_label:
            | Database["public"]["Enums"]["triage_level"]
            | null
          confidence_score: number | null
          created_at: string
          encrypted_transcript: string | null
          id: string
          language_used: string | null
          last_activity_at: string
          mts_chart_selected: string | null
          patient_id: string
          referee_flags: Json | null
          reviewed_at: string | null
          session_ended_at: string | null
          session_started_at: string
          soap_report: Json | null
          status: Database["public"]["Enums"]["session_status"]
          vital_record_id: string
        }
        Insert: {
          ai_triage_label?: Database["public"]["Enums"]["triage_level"] | null
          assigned_clinician_id?: string | null
          chief_complaint: string
          clinician_notes?: string | null
          clinician_triage_label?:
            | Database["public"]["Enums"]["triage_level"]
            | null
          confidence_score?: number | null
          created_at?: string
          encrypted_transcript?: string | null
          id?: string
          language_used?: string | null
          last_activity_at?: string
          mts_chart_selected?: string | null
          patient_id: string
          referee_flags?: Json | null
          reviewed_at?: string | null
          session_ended_at?: string | null
          session_started_at?: string
          soap_report?: Json | null
          status?: Database["public"]["Enums"]["session_status"]
          vital_record_id: string
        }
        Update: {
          ai_triage_label?: Database["public"]["Enums"]["triage_level"] | null
          assigned_clinician_id?: string | null
          chief_complaint?: string
          clinician_notes?: string | null
          clinician_triage_label?:
            | Database["public"]["Enums"]["triage_level"]
            | null
          confidence_score?: number | null
          created_at?: string
          encrypted_transcript?: string | null
          id?: string
          language_used?: string | null
          last_activity_at?: string
          mts_chart_selected?: string | null
          patient_id?: string
          referee_flags?: Json | null
          reviewed_at?: string | null
          session_ended_at?: string | null
          session_started_at?: string
          soap_report?: Json | null
          status?: Database["public"]["Enums"]["session_status"]
          vital_record_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultation_reports_assigned_clinician_id_fkey"
            columns: ["assigned_clinician_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultation_reports_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultation_reports_vital_record_id_fkey"
            columns: ["vital_record_id"]
            isOneToOne: false
            referencedRelation: "vital_records"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          blood_group: string | null
          created_at: string
          date_of_birth: string | null
          department: string | null
          email: string
          first_name: string
          genotype: string | null
          id: string
          languages: string[] | null
          last_name: string
          mdcn_number: string | null
          phone: string | null
          preferred_language: string | null
          role: Database["public"]["Enums"]["user_role"]
          sex: string | null
          speciality: string | null
          updated_at: string
        }
        Insert: {
          blood_group?: string | null
          created_at?: string
          date_of_birth?: string | null
          department?: string | null
          email: string
          first_name: string
          genotype?: string | null
          id: string
          languages?: string[] | null
          last_name: string
          mdcn_number?: string | null
          phone?: string | null
          preferred_language?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          sex?: string | null
          speciality?: string | null
          updated_at?: string
        }
        Update: {
          blood_group?: string | null
          created_at?: string
          date_of_birth?: string | null
          department?: string | null
          email?: string
          first_name?: string
          genotype?: string | null
          id?: string
          languages?: string[] | null
          last_name?: string
          mdcn_number?: string | null
          phone?: string | null
          preferred_language?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          sex?: string | null
          speciality?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      vital_records: {
        Row: {
          blood_pressure_diastolic: number
          blood_pressure_systolic: number
          created_at: string
          id: string
          patient_id: string
          recorded_at: string
          temperature_celsius: number
          weight_kg: number
        }
        Insert: {
          blood_pressure_diastolic: number
          blood_pressure_systolic: number
          created_at?: string
          id?: string
          patient_id: string
          recorded_at?: string
          temperature_celsius: number
          weight_kg: number
        }
        Update: {
          blood_pressure_diastolic?: number
          blood_pressure_systolic?: number
          created_at?: string
          id?: string
          patient_id?: string
          recorded_at?: string
          temperature_celsius?: number
          weight_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "vital_records_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      admin_queue_view: {
        Row: {
          ai_triage_label: Database["public"]["Enums"]["triage_level"] | null
          assigned_clinician_id: string | null
          confidence_score: number | null
          created_at: string | null
          id: string | null
          patient_id: string | null
          patient_name: string | null
          status: Database["public"]["Enums"]["session_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "consultation_reports_assigned_clinician_id_fkey"
            columns: ["assigned_clinician_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultation_reports_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      get_decrypted_transcript: {
        Args: { key: string; report_id: string }
        Returns: string
      }
      is_admin: { Args: never; Returns: boolean }
      save_consultation_transcript: {
        Args: { p_key: string; p_report_id: string; p_transcript: string }
        Returns: undefined
      }
    }
    Enums: {
      session_status:
        | "in_progress"
        | "abandoned"
        | "awaiting_referee"
        | "awaiting_clinician"
        | "completed"
      triage_level: "red" | "orange" | "yellow" | "green" | "blue"
      user_role: "patient" | "clinician" | "admin"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      session_status: [
        "in_progress",
        "abandoned",
        "awaiting_referee",
        "awaiting_clinician",
        "completed",
      ],
      triage_level: ["red", "orange", "yellow", "green", "blue"],
      user_role: ["patient", "clinician", "admin"],
    },
  },
} as const
