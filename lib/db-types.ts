/**
 * Hand-written TypeScript types matching the live Supabase schema.
 * Regenerate by running `supabase gen types typescript` against the project
 * if the schema drifts.
 *
 * Project: edkeagxgdpyzhrhkwcqs
 */

export type Database = {
  public: {
    Tables: {
      members: {
        Row: {
          id: string;
          name: string;
          email: string;
          phone: string | null;
          company: string | null;
          category: "Member" | "Executive";
          role: "member" | "admin" | "super_admin";
          active: boolean;
          member_since: string; // date
          created_at: string;
          updated_at: string;
          auth_user_id: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          phone?: string | null;
          company?: string | null;
          category?: "Member" | "Executive";
          role?: "member" | "admin" | "super_admin";
          active?: boolean;
          member_since?: string;
          auth_user_id?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["members"]["Insert"]>;
      };

      committee_roles: {
        Row: {
          key: string;
          name: string;
          category:
            | "executive"
            | "area_head"
            | "team_member"
            | "past_president"
            | "honorary";
          sort_order: number;
          max_holders: number | null;
          active: boolean;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["committee_roles"]["Row"],
          "created_at"
        > & { created_at?: string };
        Update: Partial<
          Database["public"]["Tables"]["committee_roles"]["Insert"]
        >;
      };

      committee_appointments: {
        Row: {
          id: string;
          member_id: string;
          role_key: string;
          area_name: string | null;
          term_start: string; // date
          term_end: string; // date
          status: "active" | "inactive" | "ended";
          display_order: number;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          member_id: string;
          role_key: string;
          area_name?: string | null;
          term_start: string;
          term_end: string;
          status?: "active" | "inactive" | "ended";
          display_order?: number;
          notes?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["committee_appointments"]["Insert"]
        >;
      };

      lab_tests_catalog: {
        Row: {
          code: string;
          name: string;
          description: string | null;
          sample_type: string | null;
          price_inr: number | null;
          turnaround_days: number | null;
          active: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          code: string;
          name: string;
          description?: string | null;
          sample_type?: string | null;
          price_inr?: number | null;
          turnaround_days?: number | null;
          active?: boolean;
          sort_order?: number;
        };
        Update: Partial<
          Database["public"]["Tables"]["lab_tests_catalog"]["Insert"]
        >;
      };

      bookings: {
        Row: {
          id: string;
          member_id: string | null;
          member_name: string | null;
          member_company: string | null;
          tests: string[] | null;
          sample_count: number | null;
          preferred_date: string | null;
          notes: string | null;
          status:
            | "pending"
            | "confirmed"
            | "in_progress"
            | "completed"
            | "cancelled";
          submitted_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["bookings"]["Row"]> & {
          id: string;
        };
        Update: Partial<Database["public"]["Tables"]["bookings"]["Insert"]>;
      };

      news: {
        Row: {
          id: string;
          tag: "ANNOUNCEMENT" | "EVENT" | "NOTICE" | "UPDATE";
          title: string;
          body: string | null;
          published_date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          tag?: "ANNOUNCEMENT" | "EVENT" | "NOTICE" | "UPDATE";
          title: string;
          body?: string | null;
          published_date?: string;
        };
        Update: Partial<Database["public"]["Tables"]["news"]["Insert"]>;
      };

      events: {
        Row: {
          id: string;
          name: string;
          event_date: string | null;
          event_time: string | null;
          venue: string | null;
          description: string | null;
          recurring: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          event_date?: string | null;
          event_time?: string | null;
          venue?: string | null;
          description?: string | null;
          recurring?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["events"]["Insert"]>;
      };

      contact_messages: {
        Row: {
          id: string;
          name: string;
          email: string;
          phone: string | null;
          subject: string | null;
          message: string;
          status: "new" | "read" | "replied" | "archived";
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          phone?: string | null;
          subject?: string | null;
          message: string;
          status?: "new" | "read" | "replied" | "archived";
          ip_address?: string | null;
          user_agent?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["contact_messages"]["Insert"]
        >;
      };

      office_info: {
        Row: {
          id: number;
          phone: string | null;
          lab_phone: string | null;
          email: string | null;
          address: string | null;
          hours: string | null;
          lab_contact_name: string | null;
          lab_contact_role: string | null;
          lab_billing_model: string | null;
          updated_at: string;
        };
        Insert: {
          id?: number;
          phone?: string | null;
          lab_phone?: string | null;
          email?: string | null;
          address?: string | null;
          hours?: string | null;
          lab_contact_name?: string | null;
          lab_contact_role?: string | null;
          lab_billing_model?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["office_info"]["Insert"]
        >;
      };

      documents: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          category: string | null;
          storage_path: string;
          file_size_bytes: number | null;
          published: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["documents"]["Row"]> & {
          title: string;
          storage_path: string;
        };
        Update: Partial<Database["public"]["Tables"]["documents"]["Insert"]>;
      };

      gallery: {
        Row: {
          id: string;
          title: string | null;
          caption: string | null;
          storage_path: string;
          event_date: string | null;
          sort_order: number;
          published: boolean;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["gallery"]["Row"]> & {
          storage_path: string;
        };
        Update: Partial<Database["public"]["Tables"]["gallery"]["Insert"]>;
      };
    };
  };
};

// Convenience row types
export type Member = Database["public"]["Tables"]["members"]["Row"];
export type CommitteeRole = Database["public"]["Tables"]["committee_roles"]["Row"];
export type CommitteeAppointment =
  Database["public"]["Tables"]["committee_appointments"]["Row"];
export type LabTest = Database["public"]["Tables"]["lab_tests_catalog"]["Row"];
export type Booking = Database["public"]["Tables"]["bookings"]["Row"];
export type NewsItem = Database["public"]["Tables"]["news"]["Row"];
export type EventItem = Database["public"]["Tables"]["events"]["Row"];
export type ContactMessage =
  Database["public"]["Tables"]["contact_messages"]["Row"];
export type OfficeInfo = Database["public"]["Tables"]["office_info"]["Row"];
