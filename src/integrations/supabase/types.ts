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
      ads_admins: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string | null
          password: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name?: string | null
          password: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string | null
          password?: string
        }
        Relationships: []
      }
      ads_balance_orders: {
        Row: {
          amount: number
          created_at: string
          id: string
          infinitepay_link: string | null
          leads_quantity: number
          nsu_order: string
          paid_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          infinitepay_link?: string | null
          leads_quantity: number
          nsu_order: string
          paid_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          infinitepay_link?: string | null
          leads_quantity?: number
          nsu_order?: string
          paid_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ads_balance_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "ads_users"
            referencedColumns: ["id"]
          },
        ]
      }
      ads_client_data: {
        Row: {
          created_at: string
          id: string
          instagram: string | null
          logo_url: string | null
          niche: string | null
          observations: string | null
          region: string | null
          sales_page_url: string | null
          telegram_group: string | null
          updated_at: string
          user_id: string
          whatsapp: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          instagram?: string | null
          logo_url?: string | null
          niche?: string | null
          observations?: string | null
          region?: string | null
          sales_page_url?: string | null
          telegram_group?: string | null
          updated_at?: string
          user_id: string
          whatsapp?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          instagram?: string | null
          logo_url?: string | null
          niche?: string | null
          observations?: string | null
          region?: string | null
          sales_page_url?: string | null
          telegram_group?: string | null
          updated_at?: string
          user_id?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ads_client_data_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "ads_users"
            referencedColumns: ["id"]
          },
        ]
      }
      ads_orders: {
        Row: {
          amount: number
          created_at: string
          email: string
          expired_at: string | null
          id: string
          infinitepay_link: string | null
          name: string
          nsu_order: string
          paid_at: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          email: string
          expired_at?: string | null
          id?: string
          infinitepay_link?: string | null
          name: string
          nsu_order: string
          paid_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          email?: string
          expired_at?: string | null
          id?: string
          infinitepay_link?: string | null
          name?: string
          nsu_order?: string
          paid_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ads_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "ads_users"
            referencedColumns: ["id"]
          },
        ]
      }
      ads_users: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          password: string
          phone: string | null
          status: string
          subscription_end: string | null
          subscription_start: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name: string
          password: string
          phone?: string | null
          status?: string
          subscription_end?: string | null
          subscription_start?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          password?: string
          phone?: string | null
          status?: string
          subscription_end?: string | null
          subscription_start?: string | null
          updated_at?: string
        }
        Relationships: []
      }
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
      metodo_seguidor_admins: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string | null
          password: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name?: string | null
          password: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string | null
          password?: string
        }
        Relationships: []
      }
      metodo_seguidor_banners: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string
          is_active: boolean | null
          link_text: string | null
          link_url: string | null
          order_index: number | null
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url: string
          is_active?: boolean | null
          link_text?: string | null
          link_url?: string | null
          order_index?: number | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string
          is_active?: boolean | null
          link_text?: string | null
          link_url?: string | null
          order_index?: number | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      metodo_seguidor_modules: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          order_index: number | null
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          order_index?: number | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          order_index?: number | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      metodo_seguidor_orders: {
        Row: {
          amount: number
          created_at: string
          email: string
          expired_at: string | null
          id: string
          infinitepay_link: string | null
          instagram_username: string | null
          nsu_order: string
          paid_at: string | null
          phone: string | null
          status: string | null
          updated_at: string
          user_id: string | null
          verified_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          email: string
          expired_at?: string | null
          id?: string
          infinitepay_link?: string | null
          instagram_username?: string | null
          nsu_order: string
          paid_at?: string | null
          phone?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string | null
          verified_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          email?: string
          expired_at?: string | null
          id?: string
          infinitepay_link?: string | null
          instagram_username?: string | null
          nsu_order?: string
          paid_at?: string | null
          phone?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "metodo_seguidor_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "metodo_seguidor_users"
            referencedColumns: ["id"]
          },
        ]
      }
      metodo_seguidor_upsells: {
        Row: {
          button_text: string | null
          button_url: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          module_id: string | null
          order_index: number | null
          original_price: string | null
          price: string | null
          show_after_days: number | null
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          button_text?: string | null
          button_url: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          module_id?: string | null
          order_index?: number | null
          original_price?: string | null
          price?: string | null
          show_after_days?: number | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          button_text?: string | null
          button_url?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          module_id?: string | null
          order_index?: number | null
          original_price?: string | null
          price?: string | null
          show_after_days?: number | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "metodo_seguidor_upsells_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "metodo_seguidor_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      metodo_seguidor_users: {
        Row: {
          created_at: string
          email: string
          email_sent: boolean | null
          email_sent_at: string | null
          id: string
          instagram_username: string | null
          last_access: string | null
          password: string
          payment_id: string | null
          phone: string | null
          subscription_end: string | null
          subscription_start: string | null
          subscription_status: string | null
          updated_at: string
          username: string
        }
        Insert: {
          created_at?: string
          email: string
          email_sent?: boolean | null
          email_sent_at?: string | null
          id?: string
          instagram_username?: string | null
          last_access?: string | null
          password: string
          payment_id?: string | null
          phone?: string | null
          subscription_end?: string | null
          subscription_start?: string | null
          subscription_status?: string | null
          updated_at?: string
          username: string
        }
        Update: {
          created_at?: string
          email?: string
          email_sent?: boolean | null
          email_sent_at?: string | null
          id?: string
          instagram_username?: string | null
          last_access?: string | null
          password?: string
          payment_id?: string | null
          phone?: string | null
          subscription_end?: string | null
          subscription_start?: string | null
          subscription_status?: string | null
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      metodo_seguidor_videos: {
        Row: {
          created_at: string
          description: string | null
          duration: string | null
          id: string
          is_active: boolean | null
          module_id: string | null
          order_index: number | null
          show_number: boolean | null
          show_play_button: boolean | null
          show_title: boolean | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          video_type: string | null
          video_url: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration?: string | null
          id?: string
          is_active?: boolean | null
          module_id?: string | null
          order_index?: number | null
          show_number?: boolean | null
          show_play_button?: boolean | null
          show_title?: boolean | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          video_type?: string | null
          video_url?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          duration?: string | null
          id?: string
          is_active?: boolean | null
          module_id?: string | null
          order_index?: number | null
          show_number?: boolean | null
          show_play_button?: boolean | null
          show_title?: boolean | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          video_type?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "metodo_seguidor_videos_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "metodo_seguidor_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      mro_orders: {
        Row: {
          amount: number
          api_created: boolean | null
          completed_at: string | null
          created_at: string
          email: string
          email_sent: boolean | null
          expired_at: string | null
          id: string
          infinitepay_link: string | null
          nsu_order: string
          paid_at: string | null
          phone: string | null
          plan_type: string
          status: string
          updated_at: string
          username: string
        }
        Insert: {
          amount: number
          api_created?: boolean | null
          completed_at?: string | null
          created_at?: string
          email: string
          email_sent?: boolean | null
          expired_at?: string | null
          id?: string
          infinitepay_link?: string | null
          nsu_order: string
          paid_at?: string | null
          phone?: string | null
          plan_type?: string
          status?: string
          updated_at?: string
          username: string
        }
        Update: {
          amount?: number
          api_created?: boolean | null
          completed_at?: string | null
          created_at?: string
          email?: string
          email_sent?: boolean | null
          expired_at?: string | null
          id?: string
          infinitepay_link?: string | null
          nsu_order?: string
          paid_at?: string | null
          phone?: string | null
          plan_type?: string
          status?: string
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
      payment_orders: {
        Row: {
          amount: number
          created_at: string
          email: string
          expires_at: string
          id: string
          infinitepay_link: string | null
          nsu_order: string
          paid_at: string | null
          status: string
          updated_at: string
          verified_at: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          infinitepay_link?: string | null
          nsu_order: string
          paid_at?: string | null
          status?: string
          updated_at?: string
          verified_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          infinitepay_link?: string | null
          nsu_order?: string
          paid_at?: string | null
          status?: string
          updated_at?: string
          verified_at?: string | null
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
          profile_screenshot_url: string | null
          squarecloud_username: string
          synced_at: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          instagram_username: string
          profile_data?: Json
          profile_screenshot_url?: string | null
          squarecloud_username: string
          synced_at?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          instagram_username?: string
          profile_data?: Json
          profile_screenshot_url?: string | null
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
