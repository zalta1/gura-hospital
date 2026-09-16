export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string;
          role: Database["public"]["Enums"]["app_role"];
          created_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string;
          role?: Database["public"]["Enums"]["app_role"];
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          full_name?: string;
          role?: Database["public"]["Enums"]["app_role"];
          created_at?: string;
        };
        Relationships: [];
      };
      doctors: {
        Row: {
          id: string;
          profile_id: string | null;
          name: string;
          specialty: string;
          specialty_slug: string | null;
          slug: string | null;
          office: string | null;
          phone: string | null;
          on_shift: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id?: string | null;
          name: string;
          specialty?: string;
          specialty_slug?: string | null;
          slug?: string | null;
          office?: string | null;
          phone?: string | null;
          on_shift?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string | null;
          name?: string;
          specialty?: string;
          specialty_slug?: string | null;
          slug?: string | null;
          office?: string | null;
          phone?: string | null;
          on_shift?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "doctors_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      patients: {
        Row: {
          id: string;
          full_name: string;
          dob: string | null;
          email: string | null;
          phone: string | null;
          address: string | null;
          insurance: string | null;
          assigned_doctor_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          full_name: string;
          dob?: string | null;
          email?: string | null;
          phone?: string | null;
          address?: string | null;
          insurance?: string | null;
          assigned_doctor_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          dob?: string | null;
          email?: string | null;
          phone?: string | null;
          address?: string | null;
          insurance?: string | null;
          assigned_doctor_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "patients_assigned_doctor_id_fkey";
            columns: ["assigned_doctor_id"];
            isOneToOne: false;
            referencedRelation: "doctors";
            referencedColumns: ["id"];
          },
        ];
      };
      appointments: {
        Row: {
          id: string;
          patient_id: string;
          doctor_id: string | null;
          datetime: string;
          appointment_date: string | null;
          appointment_time: string | null;
          status: Database["public"]["Enums"]["appointment_status"];
          pipeline_stage: Database["public"]["Enums"]["pipeline_stage"];
          reason_for_visit: string | null;
          preferred_specialty: string | null;
          visit_preference: string | null;
          visit_type: Database["public"]["Enums"]["visit_type"];
          campus: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          patient_id: string;
          doctor_id?: string | null;
          datetime: string;
          appointment_date?: string | null;
          appointment_time?: string | null;
          status?: Database["public"]["Enums"]["appointment_status"];
          pipeline_stage?: Database["public"]["Enums"]["pipeline_stage"];
          reason_for_visit?: string | null;
          preferred_specialty?: string | null;
          visit_preference?: string | null;
          visit_type?: Database["public"]["Enums"]["visit_type"];
          campus?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          patient_id?: string;
          doctor_id?: string | null;
          datetime?: string;
          appointment_date?: string | null;
          appointment_time?: string | null;
          status?: Database["public"]["Enums"]["appointment_status"];
          pipeline_stage?: Database["public"]["Enums"]["pipeline_stage"];
          reason_for_visit?: string | null;
          preferred_specialty?: string | null;
          visit_preference?: string | null;
          visit_type?: Database["public"]["Enums"]["visit_type"];
          campus?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "appointments_patient_id_fkey";
            columns: ["patient_id"];
            isOneToOne: false;
            referencedRelation: "patients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "appointments_doctor_id_fkey";
            columns: ["doctor_id"];
            isOneToOne: false;
            referencedRelation: "doctors";
            referencedColumns: ["id"];
          },
        ];
      };
      patient_reports: {
        Row: {
          id: string;
          patient_id: string;
          doctor_id: string;
          appointment_id: string | null;
          diagnosis: string | null;
          notes: string | null;
          vitals: Json;
          ai_drafted: boolean;
          approved_by_doctor: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          patient_id: string;
          doctor_id: string;
          appointment_id?: string | null;
          diagnosis?: string | null;
          notes?: string | null;
          vitals?: Json;
          ai_drafted?: boolean;
          approved_by_doctor?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          patient_id?: string;
          doctor_id?: string;
          appointment_id?: string | null;
          diagnosis?: string | null;
          notes?: string | null;
          vitals?: Json;
          ai_drafted?: boolean;
          approved_by_doctor?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "patient_reports_patient_id_fkey";
            columns: ["patient_id"];
            isOneToOne: false;
            referencedRelation: "patients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "patient_reports_doctor_id_fkey";
            columns: ["doctor_id"];
            isOneToOne: false;
            referencedRelation: "doctors";
            referencedColumns: ["id"];
          },
        ];
      };
      medication_plans: {
        Row: {
          id: string;
          patient_id: string;
          doctor_id: string;
          drug_name: string;
          dose: string;
          schedule: string;
          duration: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          patient_id: string;
          doctor_id: string;
          drug_name: string;
          dose: string;
          schedule: string;
          duration?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          patient_id?: string;
          doctor_id?: string;
          drug_name?: string;
          dose?: string;
          schedule?: string;
          duration?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      ai_reminders: {
        Row: {
          id: string;
          patient_id: string;
          medication_plan_id: string | null;
          scheduled_time: string;
          channel: Database["public"]["Enums"]["reminder_channel"];
          status: Database["public"]["Enums"]["reminder_status"];
          approved_to_send: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          patient_id: string;
          medication_plan_id?: string | null;
          scheduled_time: string;
          channel?: Database["public"]["Enums"]["reminder_channel"];
          status?: Database["public"]["Enums"]["reminder_status"];
          approved_to_send?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          patient_id?: string;
          medication_plan_id?: string | null;
          scheduled_time?: string;
          channel?: Database["public"]["Enums"]["reminder_channel"];
          status?: Database["public"]["Enums"]["reminder_status"];
          approved_to_send?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      ai_followups: {
        Row: {
          id: string;
          patient_id: string;
          doctor_id: string;
          follow_up_date: string;
          status: Database["public"]["Enums"]["followup_status"];
          summary_json: Json;
          transcript_text: string | null;
          resolved_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          patient_id: string;
          doctor_id: string;
          follow_up_date: string;
          status?: Database["public"]["Enums"]["followup_status"];
          summary_json?: Json;
          transcript_text?: string | null;
          resolved_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          patient_id?: string;
          doctor_id?: string;
          follow_up_date?: string;
          status?: Database["public"]["Enums"]["followup_status"];
          summary_json?: Json;
          transcript_text?: string | null;
          resolved_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ai_followups_patient_id_fkey";
            columns: ["patient_id"];
            isOneToOne: false;
            referencedRelation: "patients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ai_followups_doctor_id_fkey";
            columns: ["doctor_id"];
            isOneToOne: false;
            referencedRelation: "doctors";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_activity: {
        Row: {
          id: string;
          patient_id: string | null;
          activity_type: Database["public"]["Enums"]["ai_activity_type"];
          outcome: Database["public"]["Enums"]["ai_activity_outcome"];
          summary: string | null;
          related_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          patient_id?: string | null;
          activity_type: Database["public"]["Enums"]["ai_activity_type"];
          outcome?: Database["public"]["Enums"]["ai_activity_outcome"];
          summary?: string | null;
          related_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          patient_id?: string | null;
          activity_type?: Database["public"]["Enums"]["ai_activity_type"];
          outcome?: Database["public"]["Enums"]["ai_activity_outcome"];
          summary?: string | null;
          related_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ai_activity_patient_id_fkey";
            columns: ["patient_id"];
            isOneToOne: false;
            referencedRelation: "patients";
            referencedColumns: ["id"];
          },
        ];
      };
      staff: {
        Row: {
          id: string;
          profile_id: string | null;
          name: string;
          role_title: string;
          department: string;
          shift_schedule: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id?: string | null;
          name: string;
          role_title: string;
          department: string;
          shift_schedule?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string | null;
          name?: string;
          role_title?: string;
          department?: string;
          shift_schedule?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      billing_records: {
        Row: {
          id: string;
          patient_id: string;
          appointment_id: string | null;
          amount: number;
          status: Database["public"]["Enums"]["billing_status"];
          payer: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          patient_id: string;
          appointment_id?: string | null;
          amount?: number;
          status?: Database["public"]["Enums"]["billing_status"];
          payer?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          patient_id?: string;
          appointment_id?: string | null;
          amount?: number;
          status?: Database["public"]["Enums"]["billing_status"];
          payer?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "billing_records_patient_id_fkey";
            columns: ["patient_id"];
            isOneToOne: false;
            referencedRelation: "patients";
            referencedColumns: ["id"];
          },
        ];
      };
      inventory_items: {
        Row: {
          id: string;
          name: string;
          category: string;
          quantity_on_hand: number;
          reorder_threshold: number;
          unit_cost: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          category?: string;
          quantity_on_hand?: number;
          reorder_threshold?: number;
          unit_cost?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          category?: string;
          quantity_on_hand?: number;
          reorder_threshold?: number;
          unit_cost?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      audit_log: {
        Row: {
          id: string;
          actor_id: string | null;
          action: string;
          target_table: string | null;
          target_id: string | null;
          detail: string | null;
          timestamp: string;
        };
        Insert: {
          id?: string;
          actor_id?: string | null;
          action: string;
          target_table?: string | null;
          target_id?: string | null;
          detail?: string | null;
          timestamp?: string;
        };
        Update: {
          id?: string;
          actor_id?: string | null;
          action?: string;
          target_table?: string | null;
          target_id?: string | null;
          detail?: string | null;
          timestamp?: string;
        };
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications_log: {
        Row: {
          id: string;
          booking_id: string | null;
          type: string;
          status: string;
          error_message: string | null;
          sent_at: string;
        };
        Insert: {
          id?: string;
          booking_id?: string | null;
          type: string;
          status: string;
          error_message?: string | null;
          sent_at?: string;
        };
        Update: {
          id?: string;
          booking_id?: string | null;
          type?: string;
          status?: string;
          error_message?: string | null;
          sent_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_log_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "appointments";
            referencedColumns: ["id"];
          },
        ];
      };
      emergency_flags: {
        Row: {
          id: string;
          conversation_id: string | null;
          reason: string;
          created_at: string;
          resolved: boolean;
        };
        Insert: {
          id?: string;
          conversation_id?: string | null;
          reason: string;
          created_at?: string;
          resolved?: boolean;
        };
        Update: {
          id?: string;
          conversation_id?: string | null;
          reason?: string;
          created_at?: string;
          resolved?: boolean;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      submit_booking: {
        Args: {
          p_full_name: string;
          p_email: string;
          p_phone: string;
          p_reason: string;
          p_dob?: string | null;
          p_insurance?: string | null;
          p_preferred_specialty?: string | null;
          p_visit_preference?: string | null;
          p_doctor_slug?: string | null;
        };
        Returns: string;
      };
      flag_voice_emergency: {
        Args: {
          p_reason: string;
          p_conversation_id?: string | null;
        };
        Returns: string;
      };
      write_audit: {
        Args: {
          p_action: string;
          p_target_table?: string;
          p_target_id?: string;
          p_detail?: string;
        };
        Returns: undefined;
      };
      current_role: {
        Args: Record<PropertyKey, never>;
        Returns: Database["public"]["Enums"]["app_role"];
      };
      current_doctor_id: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      is_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      is_admin_or_staff: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
    };
    Enums: {
      app_role: "admin" | "doctor" | "staff" | "patient";
      appointment_status: "pending" | "confirmed" | "completed" | "cancelled" | "unassigned";
      pipeline_stage: "pending_intake" | "navigator_matched" | "confirmed" | "completed";
      visit_type: "in_person" | "telehealth";
      reminder_channel: "cold_call" | "sms" | "whatsapp" | "app";
      reminder_status: "pending" | "sent" | "completed" | "failed";
      followup_status: "scheduled" | "completed" | "escalated";
      billing_status: "pending" | "paid" | "denied" | "insurance_review";
      ai_activity_type: "voice_navigator" | "medication_reminder" | "wellness_check";
      ai_activity_outcome: "completed" | "no_answer" | "escalated";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
export type Enums<T extends keyof Database["public"]["Enums"]> = Database["public"]["Enums"][T];

export type AppRole = Database["public"]["Enums"]["app_role"];
export type AppointmentStatus = Database["public"]["Enums"]["appointment_status"];
export type PipelineStage = Database["public"]["Enums"]["pipeline_stage"];
export type VisitType = Database["public"]["Enums"]["visit_type"];
export type ReminderChannel = Database["public"]["Enums"]["reminder_channel"];
export type ReminderStatus = Database["public"]["Enums"]["reminder_status"];
export type FollowupStatus = Database["public"]["Enums"]["followup_status"];
export type BillingStatus = Database["public"]["Enums"]["billing_status"];
export type AiActivityType = Database["public"]["Enums"]["ai_activity_type"];
export type AiActivityOutcome = Database["public"]["Enums"]["ai_activity_outcome"];
