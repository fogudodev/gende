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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      blocked_times: {
        Row: {
          created_at: string
          end_time: string
          id: string
          professional_id: string
          reason: string | null
          start_time: string
        }
        Insert: {
          created_at?: string
          end_time: string
          id?: string
          professional_id: string
          reason?: string | null
          start_time: string
        }
        Update: {
          created_at?: string
          end_time?: string
          id?: string
          professional_id?: string
          reason?: string | null
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocked_times_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          client_id: string | null
          client_name: string | null
          client_phone: string | null
          created_at: string
          duration_minutes: number
          employee_id: string | null
          end_time: string
          google_calendar_event_id: string | null
          id: string
          notes: string | null
          price: number
          professional_id: string
          service_id: string | null
          start_time: string
          status: Database["public"]["Enums"]["booking_status"]
          stripe_payment_intent_id: string | null
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          client_name?: string | null
          client_phone?: string | null
          created_at?: string
          duration_minutes?: number
          employee_id?: string | null
          end_time: string
          google_calendar_event_id?: string | null
          id?: string
          notes?: string | null
          price?: number
          professional_id: string
          service_id?: string | null
          start_time: string
          status?: Database["public"]["Enums"]["booking_status"]
          stripe_payment_intent_id?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          client_name?: string | null
          client_phone?: string | null
          created_at?: string
          duration_minutes?: number
          employee_id?: string | null
          end_time?: string
          google_calendar_event_id?: string | null
          id?: string
          notes?: string | null
          price?: number
          professional_id?: string
          service_id?: string | null
          start_time?: string
          status?: Database["public"]["Enums"]["booking_status"]
          stripe_payment_intent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "salon_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_contacts: {
        Row: {
          campaign_id: string
          client_id: string | null
          client_name: string | null
          created_at: string
          error_message: string | null
          id: string
          phone: string
          sent_at: string | null
          status: string
        }
        Insert: {
          campaign_id: string
          client_id?: string | null
          client_name?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          phone: string
          sent_at?: string | null
          status?: string
        }
        Update: {
          campaign_id?: string
          client_id?: string | null
          client_name?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          phone?: string
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_contacts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          completed_at: string | null
          created_at: string
          failed_count: number
          id: string
          message: string
          name: string
          professional_id: string
          scheduled_at: string | null
          sent_count: number
          started_at: string | null
          status: string
          target_type: string
          total_contacts: number
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          failed_count?: number
          id?: string
          message: string
          name: string
          professional_id: string
          scheduled_at?: string | null
          sent_count?: number
          started_at?: string | null
          status?: string
          target_type?: string
          total_contacts?: number
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          failed_count?: number
          id?: string
          message?: string
          name?: string
          professional_id?: string
          scheduled_at?: string | null
          sent_count?: number
          started_at?: string | null
          status?: string
          target_type?: string
          total_contacts?: number
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_registers: {
        Row: {
          closed_at: string | null
          closing_amount: number | null
          created_at: string
          expected_amount: number | null
          id: string
          notes: string | null
          opened_at: string
          opened_by: string | null
          opening_amount: number
          professional_id: string
          status: string
          updated_at: string
        }
        Insert: {
          closed_at?: string | null
          closing_amount?: number | null
          created_at?: string
          expected_amount?: number | null
          id?: string
          notes?: string | null
          opened_at?: string
          opened_by?: string | null
          opening_amount?: number
          professional_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          closed_at?: string | null
          closing_amount?: number | null
          created_at?: string
          expected_amount?: number | null
          id?: string
          notes?: string | null
          opened_at?: string
          opened_by?: string | null
          opening_amount?: number
          professional_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_registers_opened_by_fkey"
            columns: ["opened_by"]
            isOneToOne: false
            referencedRelation: "salon_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_registers_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_transactions: {
        Row: {
          amount: number
          booking_id: string | null
          cash_register_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          payment_method: string | null
          professional_id: string
          type: string
        }
        Insert: {
          amount?: number
          booking_id?: string | null
          cash_register_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          payment_method?: string | null
          professional_id: string
          type?: string
        }
        Update: {
          amount?: number
          booking_id?: string | null
          cash_register_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          payment_method?: string | null
          professional_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_transactions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_transactions_cash_register_id_fkey"
            columns: ["cash_register_id"]
            isOneToOne: false
            referencedRelation: "cash_registers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "salon_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_transactions_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          attachment_url: string | null
          chat_type: string
          created_at: string
          id: string
          message: string | null
          professional_id: string
          sender_name: string | null
          sender_role: string
        }
        Insert: {
          attachment_url?: string | null
          chat_type?: string
          created_at?: string
          id?: string
          message?: string | null
          professional_id: string
          sender_name?: string | null
          sender_role?: string
        }
        Update: {
          attachment_url?: string | null
          chat_type?: string
          created_at?: string
          id?: string
          message?: string | null
          professional_id?: string
          sender_name?: string | null
          sender_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          professional_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          professional_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          professional_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      commissions: {
        Row: {
          booking_amount: number
          booking_id: string | null
          commission_amount: number
          commission_percentage: number
          created_at: string
          employee_id: string
          id: string
          paid_at: string | null
          professional_id: string
          status: string
        }
        Insert: {
          booking_amount?: number
          booking_id?: string | null
          commission_amount?: number
          commission_percentage?: number
          created_at?: string
          employee_id: string
          id?: string
          paid_at?: string | null
          professional_id: string
          status?: string
        }
        Update: {
          booking_amount?: number
          booking_id?: string | null
          commission_amount?: number
          commission_percentage?: number
          created_at?: string
          employee_id?: string
          id?: string
          paid_at?: string | null
          professional_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "commissions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "salon_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          description: string | null
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean
          max_uses: number | null
          min_amount: number | null
          professional_id: string
          updated_at: string
          used_count: number
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_amount?: number | null
          professional_id: string
          updated_at?: string
          used_count?: number
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_amount?: number | null
          professional_id?: string
          updated_at?: string
          used_count?: number
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coupons_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_message_usage: {
        Row: {
          campaigns_sent: number
          created_at: string
          id: string
          professional_id: string
          reminders_sent: number
          usage_date: string
        }
        Insert: {
          campaigns_sent?: number
          created_at?: string
          id?: string
          professional_id: string
          reminders_sent?: number
          usage_date?: string
        }
        Update: {
          campaigns_sent?: number
          created_at?: string
          id?: string
          professional_id?: string
          reminders_sent?: number
          usage_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_message_usage_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_services: {
        Row: {
          created_at: string
          employee_id: string
          id: string
          service_id: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          id?: string
          service_id: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          id?: string
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_services_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "salon_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          description: string
          employee_id: string | null
          expense_date: string
          id: string
          professional_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          category?: string
          created_at?: string
          description: string
          employee_id?: string | null
          expense_date?: string
          id?: string
          professional_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          description?: string
          employee_id?: string | null
          expense_date?: string
          id?: string
          professional_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "salon_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      google_calendar_tokens: {
        Row: {
          access_token: string
          calendar_id: string
          created_at: string
          id: string
          last_synced_at: string | null
          professional_id: string
          refresh_token: string
          sync_enabled: boolean
          token_expires_at: string
          updated_at: string
        }
        Insert: {
          access_token: string
          calendar_id?: string
          created_at?: string
          id?: string
          last_synced_at?: string | null
          professional_id: string
          refresh_token: string
          sync_enabled?: boolean
          token_expires_at: string
          updated_at?: string
        }
        Update: {
          access_token?: string
          calendar_id?: string
          created_at?: string
          id?: string
          last_synced_at?: string | null
          professional_id?: string
          refresh_token?: string
          sync_enabled?: boolean
          token_expires_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "google_calendar_tokens_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: true
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_config: {
        Row: {
          accept_card: boolean
          accept_cash: boolean
          accept_pix: boolean
          created_at: string
          id: string
          pix_beneficiary_name: string | null
          pix_key: string | null
          pix_key_type: string | null
          professional_id: string
          signal_enabled: boolean
          signal_type: string
          signal_value: number
          updated_at: string
        }
        Insert: {
          accept_card?: boolean
          accept_cash?: boolean
          accept_pix?: boolean
          created_at?: string
          id?: string
          pix_beneficiary_name?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          professional_id: string
          signal_enabled?: boolean
          signal_type?: string
          signal_value?: number
          updated_at?: string
        }
        Update: {
          accept_card?: boolean
          accept_cash?: boolean
          accept_pix?: boolean
          created_at?: string
          id?: string
          pix_beneficiary_name?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          professional_id?: string
          signal_enabled?: boolean
          signal_type?: string
          signal_value?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_config_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: true
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          booking_id: string | null
          created_at: string
          currency: string
          id: string
          payment_method: string | null
          professional_id: string
          status: string
          stripe_payment_intent_id: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          booking_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          payment_method?: string | null
          professional_id: string
          status?: string
          stripe_payment_intent_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          booking_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          payment_method?: string | null
          professional_id?: string
          status?: string
          stripe_payment_intent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_limits: {
        Row: {
          campaign_max_contacts: number
          campaign_min_interval_hours: number
          created_at: string
          daily_campaigns: number
          daily_reminders: number
          id: string
          plan_id: string
          updated_at: string
        }
        Insert: {
          campaign_max_contacts?: number
          campaign_min_interval_hours?: number
          created_at?: string
          daily_campaigns?: number
          daily_reminders?: number
          id?: string
          plan_id: string
          updated_at?: string
        }
        Update: {
          campaign_max_contacts?: number
          campaign_min_interval_hours?: number
          created_at?: string
          daily_campaigns?: number
          daily_reminders?: number
          id?: string
          plan_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      platform_reviews: {
        Row: {
          booking_id: string | null
          client_name: string
          client_phone: string | null
          comment: string | null
          created_at: string
          id: string
          professional_id: string
          rating: number
        }
        Insert: {
          booking_id?: string | null
          client_name: string
          client_phone?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          professional_id: string
          rating?: number
        }
        Update: {
          booking_id?: string | null
          client_name?: string
          client_phone?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          professional_id?: string
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "platform_reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_reviews_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string | null
          cost_price: number
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          price: number
          professional_id: string
          stock_quantity: number
          updated_at: string
        }
        Insert: {
          category?: string | null
          cost_price?: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          price?: number
          professional_id: string
          stock_quantity?: number
          updated_at?: string
        }
        Update: {
          category?: string | null
          cost_price?: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          professional_id?: string
          stock_quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_limits: {
        Row: {
          campaign_max_contacts: number | null
          campaign_min_interval_hours: number | null
          created_at: string
          daily_campaigns: number | null
          daily_reminders: number | null
          id: string
          professional_id: string
          updated_at: string
        }
        Insert: {
          campaign_max_contacts?: number | null
          campaign_min_interval_hours?: number | null
          created_at?: string
          daily_campaigns?: number | null
          daily_reminders?: number | null
          id?: string
          professional_id: string
          updated_at?: string
        }
        Update: {
          campaign_max_contacts?: number | null
          campaign_min_interval_hours?: number | null
          created_at?: string
          daily_campaigns?: number | null
          daily_reminders?: number | null
          id?: string
          professional_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "professional_limits_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: true
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      professionals: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"]
          avatar_url: string | null
          bg_color: string | null
          bio: string | null
          blocked_reason: string | null
          business_name: string | null
          component_color: string | null
          confirmation_message: string | null
          cover_url: string | null
          created_at: string
          email: string
          feature_public_page: boolean
          feature_reports: boolean
          feature_whatsapp: boolean
          followup_message: string | null
          id: string
          is_blocked: boolean
          logo_url: string | null
          name: string
          phone: string | null
          primary_color: string | null
          reminder_message: string | null
          slug: string | null
          stripe_customer_id: string | null
          system_accent_color: string | null
          system_sidebar_color: string | null
          system_sidebar_text_color: string | null
          text_color: string | null
          updated_at: string
          user_id: string
          welcome_description: string | null
          welcome_message: string | null
          welcome_title: string | null
        }
        Insert: {
          account_type?: Database["public"]["Enums"]["account_type"]
          avatar_url?: string | null
          bg_color?: string | null
          bio?: string | null
          blocked_reason?: string | null
          business_name?: string | null
          component_color?: string | null
          confirmation_message?: string | null
          cover_url?: string | null
          created_at?: string
          email?: string
          feature_public_page?: boolean
          feature_reports?: boolean
          feature_whatsapp?: boolean
          followup_message?: string | null
          id?: string
          is_blocked?: boolean
          logo_url?: string | null
          name?: string
          phone?: string | null
          primary_color?: string | null
          reminder_message?: string | null
          slug?: string | null
          stripe_customer_id?: string | null
          system_accent_color?: string | null
          system_sidebar_color?: string | null
          system_sidebar_text_color?: string | null
          text_color?: string | null
          updated_at?: string
          user_id: string
          welcome_description?: string | null
          welcome_message?: string | null
          welcome_title?: string | null
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"]
          avatar_url?: string | null
          bg_color?: string | null
          bio?: string | null
          blocked_reason?: string | null
          business_name?: string | null
          component_color?: string | null
          confirmation_message?: string | null
          cover_url?: string | null
          created_at?: string
          email?: string
          feature_public_page?: boolean
          feature_reports?: boolean
          feature_whatsapp?: boolean
          followup_message?: string | null
          id?: string
          is_blocked?: boolean
          logo_url?: string | null
          name?: string
          phone?: string | null
          primary_color?: string | null
          reminder_message?: string | null
          slug?: string | null
          stripe_customer_id?: string | null
          system_accent_color?: string | null
          system_sidebar_color?: string | null
          system_sidebar_text_color?: string | null
          text_color?: string | null
          updated_at?: string
          user_id?: string
          welcome_description?: string | null
          welcome_message?: string | null
          welcome_title?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          booking_id: string | null
          client_name: string
          client_phone: string | null
          comment: string | null
          created_at: string
          employee_id: string | null
          id: string
          is_public: boolean
          professional_id: string
          rating: number
        }
        Insert: {
          booking_id?: string | null
          client_name: string
          client_phone?: string | null
          comment?: string | null
          created_at?: string
          employee_id?: string | null
          id?: string
          is_public?: boolean
          professional_id: string
          rating?: number
        }
        Update: {
          booking_id?: string | null
          client_name?: string
          client_phone?: string | null
          comment?: string | null
          created_at?: string
          employee_id?: string | null
          id?: string
          is_public?: boolean
          professional_id?: string
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "salon_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      salon_employees: {
        Row: {
          avatar_url: string | null
          commission_percentage: number
          created_at: string
          email: string | null
          has_login: boolean
          id: string
          is_active: boolean
          name: string
          phone: string | null
          role: string
          salon_id: string
          specialty: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          commission_percentage?: number
          created_at?: string
          email?: string | null
          has_login?: boolean
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          role?: string
          salon_id: string
          specialty?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          commission_percentage?: number
          created_at?: string
          email?: string | null
          has_login?: boolean
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          role?: string
          salon_id?: string
          specialty?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "salon_employees_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          active: boolean
          category: string | null
          created_at: string
          description: string | null
          duration_minutes: number
          id: string
          maintenance_interval_days: number | null
          name: string
          price: number
          professional_id: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          category?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          maintenance_interval_days?: number | null
          name: string
          price?: number
          professional_id: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          maintenance_interval_days?: number | null
          name?: string
          price?: number
          professional_id?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          max_bookings_per_month: number | null
          max_clients: number | null
          max_services: number | null
          plan_id: string | null
          professional_id: string
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          max_bookings_per_month?: number | null
          max_clients?: number | null
          max_services?: number | null
          plan_id?: string | null
          professional_id: string
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          max_bookings_per_month?: number | null
          max_clients?: number | null
          max_services?: number | null
          plan_id?: string | null
          professional_id?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: true
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_automations: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          message_template: string
          professional_id: string
          trigger_type: Database["public"]["Enums"]["automation_trigger"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          message_template?: string
          professional_id: string
          trigger_type: Database["public"]["Enums"]["automation_trigger"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          message_template?: string
          professional_id?: string
          trigger_type?: Database["public"]["Enums"]["automation_trigger"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_automations_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_conversations: {
        Row: {
          client_phone: string
          context: Json
          created_at: string
          id: string
          messages: Json
          professional_id: string
          status: string
          updated_at: string
        }
        Insert: {
          client_phone: string
          context?: Json
          created_at?: string
          id?: string
          messages?: Json
          professional_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          client_phone?: string
          context?: Json
          created_at?: string
          id?: string
          messages?: Json
          professional_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversations_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_instances: {
        Row: {
          created_at: string
          id: string
          instance_id: string | null
          instance_name: string
          phone_number: string | null
          professional_id: string
          qr_code: string | null
          status: Database["public"]["Enums"]["whatsapp_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          instance_id?: string | null
          instance_name?: string
          phone_number?: string | null
          professional_id: string
          qr_code?: string | null
          status?: Database["public"]["Enums"]["whatsapp_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          instance_id?: string | null
          instance_name?: string
          phone_number?: string | null
          professional_id?: string
          qr_code?: string | null
          status?: Database["public"]["Enums"]["whatsapp_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_instances_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: true
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_logs: {
        Row: {
          automation_id: string | null
          booking_id: string | null
          created_at: string
          delivered_at: string | null
          error_message: string | null
          id: string
          message_content: string
          professional_id: string
          recipient_phone: string
          sent_at: string | null
          status: string
        }
        Insert: {
          automation_id?: string | null
          booking_id?: string | null
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          message_content?: string
          professional_id: string
          recipient_phone: string
          sent_at?: string | null
          status?: string
        }
        Update: {
          automation_id?: string | null
          booking_id?: string | null
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          message_content?: string
          professional_id?: string
          recipient_phone?: string
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_logs_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_automations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_logs_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_logs_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      working_hours: {
        Row: {
          day_of_week: number
          end_time: string
          id: string
          is_active: boolean
          professional_id: string
          start_time: string
        }
        Insert: {
          day_of_week: number
          end_time: string
          id?: string
          is_active?: boolean
          professional_id: string
          start_time: string
        }
        Update: {
          day_of_week?: number
          end_time?: string
          id?: string
          is_active?: boolean
          professional_id?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "working_hours_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_public_booking: {
        Args: {
          p_client_name: string
          p_client_phone: string
          p_professional_id: string
          p_service_id: string
          p_start_time: string
        }
        Returns: Json
      }
      get_available_slots: {
        Args: {
          p_date: string
          p_professional_id: string
          p_service_id: string
        }
        Returns: Json
      }
      get_my_professional_id: { Args: never; Returns: string }
      get_reception_salon_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_support: { Args: never; Returns: boolean }
    }
    Enums: {
      account_type: "autonomous" | "salon"
      app_role: "admin" | "professional" | "user" | "support"
      automation_trigger:
        | "booking_created"
        | "reminder_24h"
        | "reminder_3h"
        | "post_service"
        | "reactivation_30d"
        | "maintenance_reminder"
        | "post_sale_review"
      booking_status:
        | "pending"
        | "confirmed"
        | "cancelled"
        | "completed"
        | "no_show"
      subscription_status:
        | "active"
        | "past_due"
        | "cancelled"
        | "trialing"
        | "incomplete"
      whatsapp_status: "connected" | "disconnected" | "connecting" | "error"
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
      account_type: ["autonomous", "salon"],
      app_role: ["admin", "professional", "user", "support"],
      automation_trigger: [
        "booking_created",
        "reminder_24h",
        "reminder_3h",
        "post_service",
        "reactivation_30d",
        "maintenance_reminder",
        "post_sale_review",
      ],
      booking_status: [
        "pending",
        "confirmed",
        "cancelled",
        "completed",
        "no_show",
      ],
      subscription_status: [
        "active",
        "past_due",
        "cancelled",
        "trialing",
        "incomplete",
      ],
      whatsapp_status: ["connected", "disconnected", "connecting", "error"],
    },
  },
} as const
