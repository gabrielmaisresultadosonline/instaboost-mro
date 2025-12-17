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
      call_analytics: {
        Row: {
          created_at: string
          device_type: string | null
          event_type: string
          id: string
          referrer: string | null
          source_url: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          device_type?: string | null
          event_type: string
          id?: string
          referrer?: string | null
          source_url?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          device_type?: string | null
          event_type?: string
          id?: string
          referrer?: string | null
          source_url?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      created_accesses: {
        Row: {
          access_type: string
          api_created: boolean | null
          created_at: string
          customer_email: string
          customer_name: string | null
          days_access: number | null
          email_opened: boolean | null
          email_opened_at: string | null
          email_sent: boolean | null
          email_sent_at: string | null
          expiration_date: string | null
          expiration_warning_sent: boolean | null
          expiration_warning_sent_at: string | null
          expired_notification_sent: boolean | null
          expired_notification_sent_at: string | null
          id: string
          notes: string | null
          password: string
          service_type: string
          tracking_id: string | null
          updated_at: string
          username: string
        }
        Insert: {
          access_type: string
          api_created?: boolean | null
          created_at?: string
          customer_email: string
          customer_name?: string | null
          days_access?: number | null
          email_opened?: boolean | null
          email_opened_at?: string | null
          email_sent?: boolean | null
          email_sent_at?: string | null
          expiration_date?: string | null
          expiration_warning_sent?: boolean | null
          expiration_warning_sent_at?: string | null
          expired_notification_sent?: boolean | null
          expired_notification_sent_at?: string | null
          id?: string
          notes?: string | null
          password: string
          service_type: string
          tracking_id?: string | null
          updated_at?: string
          username: string
        }
        Update: {
          access_type?: string
          api_created?: boolean | null
          created_at?: string
          customer_email?: string
          customer_name?: string | null
          days_access?: number | null
          email_opened?: boolean | null
          email_opened_at?: string | null
          email_sent?: boolean | null
          email_sent_at?: string | null
          expiration_date?: string | null
          expiration_warning_sent?: boolean | null
          expiration_warning_sent_at?: string | null
          expired_notification_sent?: boolean | null
          expired_notification_sent_at?: string | null
          id?: string
          notes?: string | null
          password?: string
          service_type?: string
          tracking_id?: string | null
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      paid_users: {
        Row: {
          created_at: string
          creatives_used: number | null
          email: string
          id: string
          instagram_username: string | null
          password: string | null
          strategies_generated: number | null
          stripe_customer_id: string | null
          subscription_end: string | null
          subscription_id: string | null
          subscription_status: string | null
          updated_at: string
          username: string
        }
        Insert: {
          created_at?: string
          creatives_used?: number | null
          email: string
          id?: string
          instagram_username?: string | null
          password?: string | null
          strategies_generated?: number | null
          stripe_customer_id?: string | null
          subscription_end?: string | null
          subscription_id?: string | null
          subscription_status?: string | null
          updated_at?: string
          username: string
        }
        Update: {
          created_at?: string
          creatives_used?: number | null
          email?: string
          id?: string
          instagram_username?: string | null
          password?: string | null
          strategies_generated?: number | null
          stripe_customer_id?: string | null
          subscription_end?: string | null
          subscription_id?: string | null
          subscription_status?: string | null
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      promo33_users: {
        Row: {
          created_at: string
          email: string
          id: string
          instagram_data: Json | null
          instagram_username: string | null
          name: string | null
          password: string
          payment_id: string | null
          phone: string | null
          strategies_generated: Json | null
          subscription_end: string | null
          subscription_start: string | null
          subscription_status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          instagram_data?: Json | null
          instagram_username?: string | null
          name?: string | null
          password: string
          payment_id?: string | null
          phone?: string | null
          strategies_generated?: Json | null
          subscription_end?: string | null
          subscription_start?: string | null
          subscription_status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          instagram_data?: Json | null
          instagram_username?: string | null
          name?: string | null
          password?: string
          payment_id?: string | null
          phone?: string | null
          strategies_generated?: Json | null
          subscription_end?: string | null
          subscription_start?: string | null
          subscription_status?: string
          updated_at?: string
        }
        Relationships: []
      }
      squarecloud_user_profiles: {
        Row: {
          created_at: string | null
          id: string
          instagram_username: string
          profile_data: Json
          squarecloud_username: string
          synced_at: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          instagram_username: string
          profile_data?: Json
          squarecloud_username: string
          synced_at?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          instagram_username?: string
          profile_data?: Json
          squarecloud_username?: string
          synced_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          admin_notes: string | null
          created_at: string
          email: string | null
          id: string
          message: string
          platform: string
          priority: string
          resolved_at: string | null
          status: string
          subject: string
          ticket_number: string
          updated_at: string
          username: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          email?: string | null
          id?: string
          message: string
          platform: string
          priority?: string
          resolved_at?: string | null
          status?: string
          subject: string
          ticket_number: string
          updated_at?: string
          username: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          email?: string | null
          id?: string
          message?: string
          platform?: string
          priority?: string
          resolved_at?: string | null
          status?: string
          subject?: string
          ticket_number?: string
          updated_at?: string
          username?: string
        }
        Relationships: []
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
      user_sessions: {
        Row: {
          archived_profiles: Json | null
          created_at: string
          days_remaining: number | null
          email: string | null
          id: string
          last_access: string | null
          lifetime_creative_used_at: string | null
          profile_sessions: Json | null
          squarecloud_username: string
          updated_at: string
        }
        Insert: {
          archived_profiles?: Json | null
          created_at?: string
          days_remaining?: number | null
          email?: string | null
          id?: string
          last_access?: string | null
          lifetime_creative_used_at?: string | null
          profile_sessions?: Json | null
          squarecloud_username: string
          updated_at?: string
        }
        Update: {
          archived_profiles?: Json | null
          created_at?: string
          days_remaining?: number | null
          email?: string | null
          id?: string
          last_access?: string | null
          lifetime_creative_used_at?: string | null
          profile_sessions?: Json | null
          squarecloud_username?: string
          updated_at?: string
        }
        Relationships: []
      }
      zapmro_users: {
        Row: {
          created_at: string
          days_remaining: number | null
          email: string | null
          email_locked: boolean | null
          id: string
          last_access: string | null
          updated_at: string
          username: string
        }
        Insert: {
          created_at?: string
          days_remaining?: number | null
          email?: string | null
          email_locked?: boolean | null
          id?: string
          last_access?: string | null
          updated_at?: string
          username: string
        }
        Update: {
          created_at?: string
          days_remaining?: number | null
          email?: string | null
          email_locked?: boolean | null
          id?: string
          last_access?: string | null
          updated_at?: string
          username?: string
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
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
