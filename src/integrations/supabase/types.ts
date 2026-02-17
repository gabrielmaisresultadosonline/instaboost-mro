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
          campaign_activated_at: string | null
          campaign_active: boolean | null
          campaign_end_date: string | null
          competitor1_instagram: string | null
          competitor2_instagram: string | null
          created_at: string
          edit_count: number | null
          id: string
          instagram: string | null
          logo_url: string | null
          media_urls: string[] | null
          niche: string | null
          observations: string | null
          offer_description: string | null
          region: string | null
          sales_page_url: string | null
          telegram_group: string | null
          updated_at: string
          user_id: string
          whatsapp: string | null
        }
        Insert: {
          campaign_activated_at?: string | null
          campaign_active?: boolean | null
          campaign_end_date?: string | null
          competitor1_instagram?: string | null
          competitor2_instagram?: string | null
          created_at?: string
          edit_count?: number | null
          id?: string
          instagram?: string | null
          logo_url?: string | null
          media_urls?: string[] | null
          niche?: string | null
          observations?: string | null
          offer_description?: string | null
          region?: string | null
          sales_page_url?: string | null
          telegram_group?: string | null
          updated_at?: string
          user_id: string
          whatsapp?: string | null
        }
        Update: {
          campaign_activated_at?: string | null
          campaign_active?: boolean | null
          campaign_end_date?: string | null
          competitor1_instagram?: string | null
          competitor2_instagram?: string | null
          created_at?: string
          edit_count?: number | null
          id?: string
          instagram?: string | null
          logo_url?: string | null
          media_urls?: string[] | null
          niche?: string | null
          observations?: string | null
          offer_description?: string | null
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
          invoice_slug: string | null
          name: string
          nsu_order: string
          paid_at: string | null
          status: string
          transaction_nsu: string | null
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
          invoice_slug?: string | null
          name: string
          nsu_order: string
          paid_at?: string | null
          status?: string
          transaction_nsu?: string | null
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
          invoice_slug?: string | null
          name?: string
          nsu_order?: string
          paid_at?: string | null
          status?: string
          transaction_nsu?: string | null
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
      corretor_announcement_views: {
        Row: {
          announcement_id: string
          id: string
          user_id: string
          viewed_at: string
        }
        Insert: {
          announcement_id: string
          id?: string
          user_id: string
          viewed_at?: string
        }
        Update: {
          announcement_id?: string
          id?: string
          user_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "corretor_announcement_views_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "corretor_announcements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corretor_announcement_views_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "corretor_users"
            referencedColumns: ["id"]
          },
        ]
      }
      corretor_announcements: {
        Row: {
          content: string | null
          created_at: string
          display_duration: number | null
          end_date: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_blocking: boolean | null
          start_date: string | null
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          display_duration?: number | null
          end_date?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_blocking?: boolean | null
          start_date?: string | null
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          display_duration?: number | null
          end_date?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_blocking?: boolean | null
          start_date?: string | null
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      corretor_corrections_log: {
        Row: {
          correction_type: string | null
          created_at: string
          id: string
          text_length: number | null
          user_id: string
        }
        Insert: {
          correction_type?: string | null
          created_at?: string
          id?: string
          text_length?: number | null
          user_id: string
        }
        Update: {
          correction_type?: string | null
          created_at?: string
          id?: string
          text_length?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "corretor_corrections_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "corretor_users"
            referencedColumns: ["id"]
          },
        ]
      }
      corretor_orders: {
        Row: {
          access_created: boolean | null
          amount: number
          created_at: string
          email: string
          email_sent: boolean | null
          expired_at: string | null
          id: string
          infinitepay_link: string | null
          name: string | null
          nsu_order: string
          paid_at: string | null
          phone: string | null
          status: string
          updated_at: string
        }
        Insert: {
          access_created?: boolean | null
          amount?: number
          created_at?: string
          email: string
          email_sent?: boolean | null
          expired_at?: string | null
          id?: string
          infinitepay_link?: string | null
          name?: string | null
          nsu_order: string
          paid_at?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          access_created?: boolean | null
          amount?: number
          created_at?: string
          email?: string
          email_sent?: boolean | null
          expired_at?: string | null
          id?: string
          infinitepay_link?: string | null
          name?: string | null
          nsu_order?: string
          paid_at?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      corretor_settings: {
        Row: {
          created_at: string
          id: string
          setting_key: string
          setting_value: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          setting_key: string
          setting_value?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          setting_key?: string
          setting_value?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      corretor_users: {
        Row: {
          corrections_count: number | null
          created_at: string
          days_remaining: number
          email: string
          id: string
          last_access: string | null
          name: string | null
          status: string
          subscription_end: string | null
          subscription_start: string | null
          updated_at: string
        }
        Insert: {
          corrections_count?: number | null
          created_at?: string
          days_remaining?: number
          email: string
          id?: string
          last_access?: string | null
          name?: string | null
          status?: string
          subscription_end?: string | null
          subscription_start?: string | null
          updated_at?: string
        }
        Update: {
          corrections_count?: number | null
          created_at?: string
          days_remaining?: number
          email?: string
          id?: string
          last_access?: string | null
          name?: string | null
          status?: string
          subscription_end?: string | null
          subscription_start?: string | null
          updated_at?: string
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
      free_trial_registrations: {
        Row: {
          created_at: string
          email: string
          email_sent: boolean | null
          expiration_email_sent: boolean | null
          expires_at: string
          full_name: string
          generated_password: string
          generated_username: string
          id: string
          instagram_removed: boolean | null
          instagram_removed_at: string | null
          instagram_username: string
          mro_master_user: string
          profile_screenshot_url: string | null
          registered_at: string
          updated_at: string
          whatsapp: string
        }
        Insert: {
          created_at?: string
          email: string
          email_sent?: boolean | null
          expiration_email_sent?: boolean | null
          expires_at: string
          full_name: string
          generated_password: string
          generated_username: string
          id?: string
          instagram_removed?: boolean | null
          instagram_removed_at?: string | null
          instagram_username: string
          mro_master_user: string
          profile_screenshot_url?: string | null
          registered_at?: string
          updated_at?: string
          whatsapp: string
        }
        Update: {
          created_at?: string
          email?: string
          email_sent?: boolean | null
          expiration_email_sent?: boolean | null
          expires_at?: string
          full_name?: string
          generated_password?: string
          generated_username?: string
          id?: string
          instagram_removed?: boolean | null
          instagram_removed_at?: string | null
          instagram_username?: string
          mro_master_user?: string
          profile_screenshot_url?: string | null
          registered_at?: string
          updated_at?: string
          whatsapp?: string
        }
        Relationships: []
      }
      free_trial_settings: {
        Row: {
          created_at: string
          download_link: string | null
          group_link: string | null
          id: string
          installation_video_thumbnail: string | null
          installation_video_url: string | null
          is_active: boolean | null
          mro_master_password: string
          mro_master_username: string
          trial_duration_hours: number | null
          updated_at: string
          usage_video_thumbnail: string | null
          usage_video_url: string | null
          welcome_video_thumbnail: string | null
          welcome_video_url: string | null
        }
        Insert: {
          created_at?: string
          download_link?: string | null
          group_link?: string | null
          id?: string
          installation_video_thumbnail?: string | null
          installation_video_url?: string | null
          is_active?: boolean | null
          mro_master_password: string
          mro_master_username: string
          trial_duration_hours?: number | null
          updated_at?: string
          usage_video_thumbnail?: string | null
          usage_video_url?: string | null
          welcome_video_thumbnail?: string | null
          welcome_video_url?: string | null
        }
        Update: {
          created_at?: string
          download_link?: string | null
          group_link?: string | null
          id?: string
          installation_video_thumbnail?: string | null
          installation_video_url?: string | null
          is_active?: boolean | null
          mro_master_password?: string
          mro_master_username?: string
          trial_duration_hours?: number | null
          updated_at?: string
          usage_video_thumbnail?: string | null
          usage_video_url?: string | null
          welcome_video_thumbnail?: string | null
          welcome_video_url?: string | null
        }
        Relationships: []
      }
      infinitepay_webhook_logs: {
        Row: {
          affiliate_id: string | null
          amount: number | null
          created_at: string
          email: string | null
          event_type: string
          id: string
          order_found: boolean | null
          order_id: string | null
          order_nsu: string | null
          payload: Json | null
          result_message: string | null
          status: string
          transaction_nsu: string | null
          username: string | null
        }
        Insert: {
          affiliate_id?: string | null
          amount?: number | null
          created_at?: string
          email?: string | null
          event_type?: string
          id?: string
          order_found?: boolean | null
          order_id?: string | null
          order_nsu?: string | null
          payload?: Json | null
          result_message?: string | null
          status?: string
          transaction_nsu?: string | null
          username?: string | null
        }
        Update: {
          affiliate_id?: string | null
          amount?: number | null
          created_at?: string
          email?: string | null
          event_type?: string
          id?: string
          order_found?: boolean | null
          order_id?: string | null
          order_nsu?: string | null
          payload?: Json | null
          result_message?: string | null
          status?: string
          transaction_nsu?: string | null
          username?: string | null
        }
        Relationships: []
      }
      inteligencia_fotos_admins: {
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
      inteligencia_fotos_generations: {
        Row: {
          created_at: string
          format: string
          generated_image_url: string
          id: string
          input_image_url: string
          saved: boolean | null
          template_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          format?: string
          generated_image_url: string
          id?: string
          input_image_url: string
          saved?: boolean | null
          template_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          format?: string
          generated_image_url?: string
          id?: string
          input_image_url?: string
          saved?: boolean | null
          template_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inteligencia_fotos_generations_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "inteligencia_fotos_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inteligencia_fotos_generations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "inteligencia_fotos_users"
            referencedColumns: ["id"]
          },
        ]
      }
      inteligencia_fotos_settings: {
        Row: {
          created_at: string
          id: string
          setting_key: string
          setting_value: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          setting_key: string
          setting_value?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          setting_key?: string
          setting_value?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      inteligencia_fotos_templates: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string
          is_active: boolean | null
          order_index: number | null
          prompt: string
          title: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url: string
          is_active?: boolean | null
          order_index?: number | null
          prompt: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string
          is_active?: boolean | null
          order_index?: number | null
          prompt?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      inteligencia_fotos_users: {
        Row: {
          created_at: string
          email: string
          id: string
          last_access: string | null
          name: string
          password: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          last_access?: string | null
          name: string
          password: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          last_access?: string | null
          name?: string
          password?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      license_keys: {
        Row: {
          created_at: string
          email: string
          id: string
          is_active: boolean
          last_validated_at: string | null
          license_key: string
          password: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_active?: boolean
          last_validated_at?: string | null
          license_key: string
          password: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          last_validated_at?: string | null
          license_key?: string
          password?: string
          updated_at?: string
        }
        Relationships: []
      }
      license_settings: {
        Row: {
          admin_email: string
          admin_password: string
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          admin_email?: string
          admin_password?: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          admin_email?: string
          admin_password?: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      live_analytics: {
        Row: {
          created_at: string
          device_type: string | null
          id: string
          session_id: string
          updated_at: string
          user_agent: string | null
          visitor_id: string
          watch_percentage: number
        }
        Insert: {
          created_at?: string
          device_type?: string | null
          id?: string
          session_id: string
          updated_at?: string
          user_agent?: string | null
          visitor_id: string
          watch_percentage?: number
        }
        Update: {
          created_at?: string
          device_type?: string | null
          id?: string
          session_id?: string
          updated_at?: string
          user_agent?: string | null
          visitor_id?: string
          watch_percentage?: number
        }
        Relationships: [
          {
            foreignKeyName: "live_analytics_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "live_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      live_sessions: {
        Row: {
          created_at: string
          cta_button_link: string | null
          cta_button_text: string | null
          cta_description: string | null
          cta_title: string | null
          description: string | null
          ended_at: string | null
          fake_viewers_max: number
          fake_viewers_min: number
          hls_url: string | null
          id: string
          status: string
          title: string
          updated_at: string
          video_url: string | null
          whatsapp_group_link: string | null
        }
        Insert: {
          created_at?: string
          cta_button_link?: string | null
          cta_button_text?: string | null
          cta_description?: string | null
          cta_title?: string | null
          description?: string | null
          ended_at?: string | null
          fake_viewers_max?: number
          fake_viewers_min?: number
          hls_url?: string | null
          id?: string
          status?: string
          title?: string
          updated_at?: string
          video_url?: string | null
          whatsapp_group_link?: string | null
        }
        Update: {
          created_at?: string
          cta_button_link?: string | null
          cta_button_text?: string | null
          cta_description?: string | null
          cta_title?: string | null
          description?: string | null
          ended_at?: string | null
          fake_viewers_max?: number
          fake_viewers_min?: number
          hls_url?: string | null
          id?: string
          status?: string
          title?: string
          updated_at?: string
          video_url?: string | null
          whatsapp_group_link?: string | null
        }
        Relationships: []
      }
      live_settings: {
        Row: {
          admin_email: string
          admin_password: string
          created_at: string
          default_whatsapp_group: string | null
          id: string
          updated_at: string
        }
        Insert: {
          admin_email?: string
          admin_password?: string
          created_at?: string
          default_whatsapp_group?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          admin_email?: string
          admin_password?: string
          created_at?: string
          default_whatsapp_group?: string | null
          id?: string
          updated_at?: string
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
      mro_euro_orders: {
        Row: {
          amount: number
          api_created: boolean | null
          completed_at: string | null
          created_at: string
          email: string
          email_sent: boolean | null
          id: string
          paid_at: string | null
          phone: string | null
          plan_type: string
          status: string
          stripe_payment_intent: string | null
          stripe_session_id: string | null
          updated_at: string
          username: string
        }
        Insert: {
          amount?: number
          api_created?: boolean | null
          completed_at?: string | null
          created_at?: string
          email: string
          email_sent?: boolean | null
          id?: string
          paid_at?: string | null
          phone?: string | null
          plan_type?: string
          status?: string
          stripe_payment_intent?: string | null
          stripe_session_id?: string | null
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
          id?: string
          paid_at?: string | null
          phone?: string | null
          plan_type?: string
          status?: string
          stripe_payment_intent?: string | null
          stripe_session_id?: string | null
          updated_at?: string
          username?: string
        }
        Relationships: []
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
          invoice_slug: string | null
          nsu_order: string
          paid_at: string | null
          phone: string | null
          plan_type: string
          status: string
          transaction_nsu: string | null
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
          invoice_slug?: string | null
          nsu_order: string
          paid_at?: string | null
          phone?: string | null
          plan_type?: string
          status?: string
          transaction_nsu?: string | null
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
          invoice_slug?: string | null
          nsu_order?: string
          paid_at?: string | null
          phone?: string | null
          plan_type?: string
          status?: string
          transaction_nsu?: string | null
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
      renda_extra_analytics: {
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
      renda_extra_email_logs: {
        Row: {
          created_at: string
          email_to: string
          email_type: string
          error_message: string | null
          id: string
          lead_id: string | null
          status: string
          subject: string | null
        }
        Insert: {
          created_at?: string
          email_to: string
          email_type: string
          error_message?: string | null
          id?: string
          lead_id?: string | null
          status?: string
          subject?: string | null
        }
        Update: {
          created_at?: string
          email_to?: string
          email_type?: string
          error_message?: string | null
          id?: string
          lead_id?: string | null
          status?: string
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "renda_extra_email_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "renda_extra_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      renda_extra_leads: {
        Row: {
          created_at: string
          email: string
          email_confirmacao_enviado: boolean | null
          email_confirmacao_enviado_at: string | null
          email_lembrete_enviado: boolean | null
          email_lembrete_enviado_at: string | null
          id: string
          instagram_username: string | null
          media_salarial: string
          nome_completo: string
          tipo_computador: string
          trabalha_atualmente: boolean | null
          whatsapp: string
        }
        Insert: {
          created_at?: string
          email: string
          email_confirmacao_enviado?: boolean | null
          email_confirmacao_enviado_at?: string | null
          email_lembrete_enviado?: boolean | null
          email_lembrete_enviado_at?: string | null
          id?: string
          instagram_username?: string | null
          media_salarial: string
          nome_completo: string
          tipo_computador: string
          trabalha_atualmente?: boolean | null
          whatsapp: string
        }
        Update: {
          created_at?: string
          email?: string
          email_confirmacao_enviado?: boolean | null
          email_confirmacao_enviado_at?: string | null
          email_lembrete_enviado?: boolean | null
          email_lembrete_enviado_at?: string | null
          id?: string
          instagram_username?: string | null
          media_salarial?: string
          nome_completo?: string
          tipo_computador?: string
          trabalha_atualmente?: boolean | null
          whatsapp?: string
        }
        Relationships: []
      }
      renda_extra_settings: {
        Row: {
          admin_email: string | null
          admin_password: string | null
          created_at: string
          id: string
          launch_date: string | null
          updated_at: string
          whatsapp_group_link: string | null
        }
        Insert: {
          admin_email?: string | null
          admin_password?: string | null
          created_at?: string
          id?: string
          launch_date?: string | null
          updated_at?: string
          whatsapp_group_link?: string | null
        }
        Update: {
          admin_email?: string | null
          admin_password?: string | null
          created_at?: string
          id?: string
          launch_date?: string | null
          updated_at?: string
          whatsapp_group_link?: string | null
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
      zapmro_orders: {
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
          amount?: number
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
      increment_corretor_corrections: {
        Args: { p_user_id: string }
        Returns: undefined
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
