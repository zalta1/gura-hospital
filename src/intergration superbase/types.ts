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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      ai_triage: {
        Row: {
          care_request_id: string
          confidence: number | null
          created_at: string
          id: string
          patient_answers: Json
          questions_asked: Json
          reasoning_summary: string | null
          recommended_providers: Json
          recommended_specialty: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          care_request_id: string
          confidence?: number | null
          created_at?: string
          id?: string
          patient_answers?: Json
          questions_asked?: Json
          reasoning_summary?: string | null
          recommended_providers?: Json
          recommended_specialty?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          care_request_id?: string
          confidence?: number | null
          created_at?: string
          id?: string
          patient_answers?: Json
          questions_asked?: Json
          reasoning_summary?: string | null
          recommended_providers?: Json
          recommended_specialty?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_triage_care_request_id_fkey"
            columns: ["care_request_id"]
            isOneToOne: false
            referencedRelation: "care_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          appointment_time: string
          appointment_type: string
          care_request_id: string | null
          created_at: string
          facility_id: string | null
          id: string
          patient_id: string
          provider_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          appointment_time: string
          appointment_type?: string
          care_request_id?: string | null
          created_at?: string
          facility_id?: string | null
          id?: string
          patient_id: string
          provider_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          appointment_time?: string
          appointment_type?: string
          care_request_id?: string | null
          created_at?: string
          facility_id?: string | null
          id?: string
          patient_id?: string
          provider_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_care_request_id_fkey"
            columns: ["care_request_id"]
            isOneToOne: false
            referencedRelation: "care_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          detail: string | null
          id: string
          patient_id: string | null
          resource_id: string | null
          resource_type: string
          timestamp: string
          user_id: string | null
        }
        Insert: {
          action: string
          detail?: string | null
          id?: string
          patient_id?: string | null
          resource_id?: string | null
          resource_type: string
          timestamp?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          detail?: string | null
          id?: string
          patient_id?: string | null
          resource_id?: string | null
          resource_type?: string
          timestamp?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      care_requests: {
        Row: {
          created_at: string
          id: string
          insurance_provider: string | null
          patient_id: string
          preferred_facility: string | null
          preferred_specialty: string | null
          reason_for_visit: string
          source: string
          status: string
          updated_at: string
          visit_preference: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          insurance_provider?: string | null
          patient_id: string
          preferred_facility?: string | null
          preferred_specialty?: string | null
          reason_for_visit: string
          source?: string
          status?: string
          updated_at?: string
          visit_preference?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          insurance_provider?: string | null
          patient_id?: string
          preferred_facility?: string | null
          preferred_specialty?: string | null
          reason_for_visit?: string
          source?: string
          status?: string
          updated_at?: string
          visit_preference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "care_requests_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string
          document_type: string
          file_name: string
          id: string
          patient_id: string
          storage_path: string | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          document_type?: string
          file_name: string
          id?: string
          patient_id: string
          storage_path?: string | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          document_type?: string
          file_name?: string
          id?: string
          patient_id?: string
          storage_path?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      encounters: {
        Row: {
          appointment_id: string | null
          created_at: string
          encounter_date: string
          encounter_type: string
          id: string
          patient_id: string
          provider_id: string | null
          reason: string | null
          status: string
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string
          encounter_date?: string
          encounter_type?: string
          id?: string
          patient_id: string
          provider_id?: string | null
          reason?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          created_at?: string
          encounter_date?: string
          encounter_type?: string
          id?: string
          patient_id?: string
          provider_id?: string | null
          reason?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "encounters_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "encounters_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "encounters_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      facilities: {
        Row: {
          address: string | null
          created_at: string
          id: string
          name: string
          phone: string | null
          slug: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          name: string
          phone?: string | null
          slug: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          name?: string
          phone?: string | null
          slug?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          body: string
          created_at: string
          direction: string
          id: string
          patient_id: string
          read_at: string | null
          sender_id: string | null
          sender_label: string
        }
        Insert: {
          body: string
          created_at?: string
          direction?: string
          id?: string
          patient_id: string
          read_at?: string | null
          sender_id?: string | null
          sender_label?: string
        }
        Update: {
          body?: string
          created_at?: string
          direction?: string
          id?: string
          patient_id?: string
          read_at?: string | null
          sender_id?: string | null
          sender_label?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          created_at: string
          date_of_birth: string | null
          email: string | null
          first_name: string
          id: string
          last_name: string
          phone: string | null
          profile_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          first_name: string
          id?: string
          last_name: string
          phone?: string | null
          profile_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string
          phone?: string | null
          profile_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      provider_availability: {
        Row: {
          appointment_type: string
          created_at: string
          date: string
          end_time: string
          id: string
          provider_id: string
          start_time: string
          status: string
        }
        Insert: {
          appointment_type?: string
          created_at?: string
          date: string
          end_time: string
          id?: string
          provider_id: string
          start_time: string
          status?: string
        }
        Update: {
          appointment_type?: string
          created_at?: string
          date?: string
          end_time?: string
          id?: string
          provider_id?: string
          start_time?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_availability_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_insurance: {
        Row: {
          created_at: string
          id: string
          insurance_provider: string
          plan_name: string | null
          provider_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          insurance_provider: string
          plan_name?: string | null
          provider_id: string
        }
        Update: {
          created_at?: string
          id?: string
          insurance_provider?: string
          plan_name?: string | null
          provider_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_insurance_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      providers: {
        Row: {
          accepting_new_patients: boolean
          created_at: string
          credentials: string | null
          facility_id: string | null
          first_name: string
          id: string
          last_name: string
          office: string | null
          phone: string | null
          slug: string | null
          specialty: string
          specialty_slug: string | null
          subspecialties: string[]
          telehealth_available: boolean
        }
        Insert: {
          accepting_new_patients?: boolean
          created_at?: string
          credentials?: string | null
          facility_id?: string | null
          first_name: string
          id?: string
          last_name: string
          office?: string | null
          phone?: string | null
          slug?: string | null
          specialty: string
          specialty_slug?: string | null
          subspecialties?: string[]
          telehealth_available?: boolean
        }
        Update: {
          accepting_new_patients?: boolean
          created_at?: string
          credentials?: string | null
          facility_id?: string | null
          first_name?: string
          id?: string
          last_name?: string
          office?: string | null
          phone?: string | null
          slug?: string | null
          specialty?: string
          specialty_slug?: string | null
          subspecialties?: string[]
          telehealth_available?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "providers_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_clinical: { Args: { _user_id: string }; Returns: boolean }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      owns_patient: { Args: { _patient_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "patient"
        | "receptionist"
        | "nurse"
        | "provider"
        | "administrator"
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
      app_role: [
        "patient",
        "receptionist",
        "nurse",
        "provider",
        "administrator",
      ],
    },
  },
} as const
