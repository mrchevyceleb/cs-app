import type { ChannelType, MessageSource, PreferredChannel, RoutingDecision, DeliveryStatus } from './channels';
import type { WebhookEventType, WebhookDeliveryStatus, WebhookSourceType } from './webhooks';

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
      agents: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          id: string
          name: string
          status: 'online' | 'away' | 'offline'
          last_seen_at: string | null
          current_ticket_id: string | null
          preferred_language: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          id: string
          name: string
          status?: 'online' | 'away' | 'offline'
          last_seen_at?: string | null
          current_ticket_id?: string | null
          preferred_language?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          status?: 'online' | 'away' | 'offline'
          last_seen_at?: string | null
          current_ticket_id?: string | null
          preferred_language?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          created_at: string
          email: string | null
          id: string
          metadata: Json
          name: string | null
          preferred_language: string
          phone_number: string | null
          preferred_channel: PreferredChannel
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          metadata?: Json
          name?: string | null
          preferred_language?: string
          phone_number?: string | null
          preferred_channel?: PreferredChannel
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          metadata?: Json
          name?: string | null
          preferred_language?: string
          phone_number?: string | null
          preferred_channel?: PreferredChannel
        }
        Relationships: []
      }
      knowledge_articles: {
        Row: {
          category: string | null
          content: string
          created_at: string
          embedding: number[] | null
          id: string
          title: string
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string
          embedding?: number[] | null
          id?: string
          title: string
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string
          embedding?: number[] | null
          id?: string
          title?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          confidence: number | null
          content: string
          content_translated: string | null
          created_at: string
          id: string
          metadata: Json
          original_language: string | null
          sender_type: 'customer' | 'agent' | 'ai'
          ticket_id: string
          source: MessageSource
          external_id: string | null
          routing_decision: RoutingDecision | null
          delivery_status: DeliveryStatus
          delivered_at: string | null
          read_at: string | null
        }
        Insert: {
          confidence?: number | null
          content: string
          content_translated?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          original_language?: string | null
          sender_type: 'customer' | 'agent' | 'ai'
          ticket_id: string
          source?: MessageSource
          external_id?: string | null
          routing_decision?: RoutingDecision | null
          delivery_status?: DeliveryStatus
          delivered_at?: string | null
          read_at?: string | null
        }
        Update: {
          confidence?: number | null
          content?: string
          content_translated?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          original_language?: string | null
          sender_type?: 'customer' | 'agent' | 'ai'
          ticket_id?: string
          source?: MessageSource
          external_id?: string | null
          routing_decision?: RoutingDecision | null
          delivery_status?: DeliveryStatus
          delivered_at?: string | null
          read_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          }
        ]
      }
      tickets: {
        Row: {
          ai_confidence: number | null
          ai_handled: boolean
          assigned_agent_id: string | null
          created_at: string
          customer_id: string
          id: string
          priority: 'low' | 'normal' | 'high' | 'urgent'
          status: 'open' | 'pending' | 'resolved' | 'escalated'
          subject: string
          tags: string[]
          updated_at: string
          // SLA fields
          sla_policy_id: string | null
          first_response_at: string | null
          first_response_due_at: string | null
          resolution_due_at: string | null
          first_response_breached: boolean
          resolution_breached: boolean
          // Channel field
          source_channel: ChannelType
        }
        Insert: {
          ai_confidence?: number | null
          ai_handled?: boolean
          assigned_agent_id?: string | null
          created_at?: string
          customer_id: string
          id?: string
          priority?: 'low' | 'normal' | 'high' | 'urgent'
          status?: 'open' | 'pending' | 'resolved' | 'escalated'
          subject: string
          tags?: string[]
          updated_at?: string
          // SLA fields
          sla_policy_id?: string | null
          first_response_at?: string | null
          first_response_due_at?: string | null
          resolution_due_at?: string | null
          first_response_breached?: boolean
          resolution_breached?: boolean
          // Channel field
          source_channel?: ChannelType
        }
        Update: {
          ai_confidence?: number | null
          ai_handled?: boolean
          assigned_agent_id?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          priority?: 'low' | 'normal' | 'high' | 'urgent'
          status?: 'open' | 'pending' | 'resolved' | 'escalated'
          subject?: string
          tags?: string[]
          updated_at?: string
          // SLA fields
          sla_policy_id?: string | null
          first_response_at?: string | null
          first_response_due_at?: string | null
          resolution_due_at?: string | null
          first_response_breached?: boolean
          resolution_breached?: boolean
          // Channel field
          source_channel?: ChannelType
        }
        Relationships: [
          {
            foreignKeyName: "tickets_assigned_agent_id_fkey"
            columns: ["assigned_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_sla_policy_id_fkey"
            columns: ["sla_policy_id"]
            isOneToOne: false
            referencedRelation: "sla_policies"
            referencedColumns: ["id"]
          }
        ]
      }
      sla_policies: {
        Row: {
          id: string
          name: string
          description: string | null
          priority: 'low' | 'normal' | 'high' | 'urgent'
          first_response_hours: number
          resolution_hours: number
          business_hours_only: boolean
          is_default: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          priority: 'low' | 'normal' | 'high' | 'urgent'
          first_response_hours: number
          resolution_hours: number
          business_hours_only?: boolean
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          priority?: 'low' | 'normal' | 'high' | 'urgent'
          first_response_hours?: number
          resolution_hours?: number
          business_hours_only?: boolean
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      canned_responses: {
        Row: {
          id: string
          title: string
          content: string
          shortcut: string | null
          category: CannedResponseCategory
          tags: string[]
          agent_id: string | null
          usage_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          content: string
          shortcut?: string | null
          category?: CannedResponseCategory
          tags?: string[]
          agent_id?: string | null
          usage_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          content?: string
          shortcut?: string | null
          category?: CannedResponseCategory
          tags?: string[]
          agent_id?: string | null
          usage_count?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "canned_responses_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          }
        ]
      }
      ticket_events: {
        Row: {
          id: string
          ticket_id: string
          agent_id: string | null
          event_type: string
          old_value: string | null
          new_value: string | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          ticket_id: string
          agent_id?: string | null
          event_type: string
          old_value?: string | null
          new_value?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          ticket_id?: string
          agent_id?: string | null
          event_type?: string
          old_value?: string | null
          new_value?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_events_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_events_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          }
        ]
      }
      message_attachments: {
        Row: {
          id: string
          message_id: string | null
          file_name: string
          file_type: string
          file_size: number
          storage_path: string
          public_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          message_id?: string | null
          file_name: string
          file_type: string
          file_size: number
          storage_path: string
          public_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          message_id?: string | null
          file_name?: string
          file_type?: string
          file_size?: number
          storage_path?: string
          public_url?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          }
        ]
      }
      email_logs: {
        Row: {
          id: string
          ticket_id: string | null
          customer_id: string | null
          email_type: 'ticket_created' | 'ticket_updated' | 'ticket_resolved' | 'agent_reply' | 'reminder'
          recipient_email: string
          subject: string
          status: 'pending' | 'sent' | 'failed' | 'bounced'
          provider_id: string | null
          error_message: string | null
          metadata: Json | null
          created_at: string
          sent_at: string | null
        }
        Insert: {
          id?: string
          ticket_id?: string | null
          customer_id?: string | null
          email_type: 'ticket_created' | 'ticket_updated' | 'ticket_resolved' | 'agent_reply' | 'reminder'
          recipient_email: string
          subject: string
          status?: 'pending' | 'sent' | 'failed' | 'bounced'
          provider_id?: string | null
          error_message?: string | null
          metadata?: Json | null
          created_at?: string
          sent_at?: string | null
        }
        Update: {
          id?: string
          ticket_id?: string | null
          customer_id?: string | null
          email_type?: 'ticket_created' | 'ticket_updated' | 'ticket_resolved' | 'agent_reply' | 'reminder'
          recipient_email?: string
          subject?: string
          status?: 'pending' | 'sent' | 'failed' | 'bounced'
          provider_id?: string | null
          error_message?: string | null
          metadata?: Json | null
          created_at?: string
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_logs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          }
        ]
      }
      ticket_feedback: {
        Row: {
          id: string
          ticket_id: string
          customer_id: string | null
          rating: number | null
          comment: string | null
          feedback_token: string | null
          token_expires_at: string | null
          submitted_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          ticket_id: string
          customer_id?: string | null
          rating?: number | null
          comment?: string | null
          feedback_token?: string | null
          token_expires_at?: string | null
          submitted_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          ticket_id?: string
          customer_id?: string | null
          rating?: number | null
          comment?: string | null
          feedback_token?: string | null
          token_expires_at?: string | null
          submitted_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_feedback_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: true
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_feedback_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          }
        ]
      }
      metrics_snapshots: {
        Row: {
          id: string
          snapshot_date: string
          period_type: 'daily' | 'weekly' | 'monthly'
          total_tickets: number
          resolved_tickets: number
          avg_resolution_time_hours: number | null
          avg_first_response_time_hours: number | null
          avg_csat_score: number | null
          csat_response_count: number
          sla_compliance_rate: number | null
          ai_resolution_rate: number | null
          escalation_rate: number | null
          tickets_by_priority: Json | null
          tickets_by_status: Json | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          snapshot_date: string
          period_type: 'daily' | 'weekly' | 'monthly'
          total_tickets?: number
          resolved_tickets?: number
          avg_resolution_time_hours?: number | null
          avg_first_response_time_hours?: number | null
          avg_csat_score?: number | null
          csat_response_count?: number
          sla_compliance_rate?: number | null
          ai_resolution_rate?: number | null
          escalation_rate?: number | null
          tickets_by_priority?: Json | null
          tickets_by_status?: Json | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          snapshot_date?: string
          period_type?: 'daily' | 'weekly' | 'monthly'
          total_tickets?: number
          resolved_tickets?: number
          avg_resolution_time_hours?: number | null
          avg_first_response_time_hours?: number | null
          avg_csat_score?: number | null
          csat_response_count?: number
          sla_compliance_rate?: number | null
          ai_resolution_rate?: number | null
          escalation_rate?: number | null
          tickets_by_priority?: Json | null
          tickets_by_status?: Json | null
          metadata?: Json | null
          created_at?: string
        }
        Relationships: []
      }
      agent_notifications: {
        Row: {
          id: string
          agent_id: string
          type: 'mention' | 'handoff' | 'assignment' | 'escalation' | 'sla_warning' | 'feedback'
          title: string
          message: string | null
          ticket_id: string | null
          from_agent_id: string | null
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          agent_id: string
          type: 'mention' | 'handoff' | 'assignment' | 'escalation' | 'sla_warning' | 'feedback'
          title: string
          message?: string | null
          ticket_id?: string | null
          from_agent_id?: string | null
          read_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          agent_id?: string
          type?: 'mention' | 'handoff' | 'assignment' | 'escalation' | 'sla_warning' | 'feedback'
          title?: string
          message?: string | null
          ticket_id?: string | null
          from_agent_id?: string | null
          read_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_notifications_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_notifications_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_notifications_from_agent_id_fkey"
            columns: ["from_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          }
        ]
      }
      ticket_handoffs: {
        Row: {
          id: string
          ticket_id: string
          from_agent_id: string
          to_agent_id: string
          reason: string
          notes: string | null
          status: 'pending' | 'accepted' | 'declined'
          created_at: string
          accepted_at: string | null
        }
        Insert: {
          id?: string
          ticket_id: string
          from_agent_id: string
          to_agent_id: string
          reason: string
          notes?: string | null
          status?: 'pending' | 'accepted' | 'declined'
          created_at?: string
          accepted_at?: string | null
        }
        Update: {
          id?: string
          ticket_id?: string
          from_agent_id?: string
          to_agent_id?: string
          reason?: string
          notes?: string | null
          status?: 'pending' | 'accepted' | 'declined'
          created_at?: string
          accepted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_handoffs_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_handoffs_from_agent_id_fkey"
            columns: ["from_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_handoffs_to_agent_id_fkey"
            columns: ["to_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          }
        ]
      }
      workflow_rules: {
        Row: {
          id: string
          name: string
          description: string | null
          is_active: boolean
          trigger_event: 'ticket_created' | 'status_changed' | 'priority_changed' | 'ticket_assigned' | 'sla_breach' | 'message_received'
          conditions: Json
          actions: Json
          priority: number
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          is_active?: boolean
          trigger_event: 'ticket_created' | 'status_changed' | 'priority_changed' | 'ticket_assigned' | 'sla_breach' | 'message_received'
          conditions?: Json
          actions?: Json
          priority?: number
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          is_active?: boolean
          trigger_event?: 'ticket_created' | 'status_changed' | 'priority_changed' | 'ticket_assigned' | 'sla_breach' | 'message_received'
          conditions?: Json
          actions?: Json
          priority?: number
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_rules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          }
        ]
      }
      workflow_executions: {
        Row: {
          id: string
          workflow_rule_id: string
          ticket_id: string
          trigger_event: 'ticket_created' | 'status_changed' | 'priority_changed' | 'ticket_assigned' | 'sla_breach' | 'message_received'
          event_data: Json
          conditions_matched: boolean
          actions_executed: Json
          status: 'pending' | 'running' | 'completed' | 'failed'
          error_message: string | null
          started_at: string
          completed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          workflow_rule_id: string
          ticket_id: string
          trigger_event: 'ticket_created' | 'status_changed' | 'priority_changed' | 'ticket_assigned' | 'sla_breach' | 'message_received'
          event_data?: Json
          conditions_matched?: boolean
          actions_executed?: Json
          status?: 'pending' | 'running' | 'completed' | 'failed'
          error_message?: string | null
          started_at: string
          completed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          workflow_rule_id?: string
          ticket_id?: string
          trigger_event?: 'ticket_created' | 'status_changed' | 'priority_changed' | 'ticket_assigned' | 'sla_breach' | 'message_received'
          event_data?: Json
          conditions_matched?: boolean
          actions_executed?: Json
          status?: 'pending' | 'running' | 'completed' | 'failed'
          error_message?: string | null
          started_at?: string
          completed_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_executions_workflow_rule_id_fkey"
            columns: ["workflow_rule_id"]
            isOneToOne: false
            referencedRelation: "workflow_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_executions_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          }
        ]
      }
      widget_settings: {
        Row: {
          id: string
          api_key: string
          company_name: string
          greeting: string
          primary_color: string
          position: 'bottom-right' | 'bottom-left'
          theme: 'light' | 'dark' | 'auto'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          api_key: string
          company_name?: string
          greeting?: string
          primary_color?: string
          position?: 'bottom-right' | 'bottom-left'
          theme?: 'light' | 'dark' | 'auto'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          api_key?: string
          company_name?: string
          greeting?: string
          primary_color?: string
          position?: 'bottom-right' | 'bottom-left'
          theme?: 'light' | 'dark' | 'auto'
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      // Channel support tables (Migration 015)
      channel_inbound_logs: {
        Row: {
          id: string
          channel: ChannelType
          external_id: string | null
          from_identifier: string
          to_identifier: string | null
          raw_payload: Json
          processed: boolean
          ticket_id: string | null
          message_id: string | null
          customer_id: string | null
          error_message: string | null
          created_at: string
          processed_at: string | null
        }
        Insert: {
          id?: string
          channel: ChannelType
          external_id?: string | null
          from_identifier: string
          to_identifier?: string | null
          raw_payload: Json
          processed?: boolean
          ticket_id?: string | null
          message_id?: string | null
          customer_id?: string | null
          error_message?: string | null
          created_at?: string
          processed_at?: string | null
        }
        Update: {
          id?: string
          channel?: ChannelType
          external_id?: string | null
          from_identifier?: string
          to_identifier?: string | null
          raw_payload?: Json
          processed?: boolean
          ticket_id?: string | null
          message_id?: string | null
          customer_id?: string | null
          error_message?: string | null
          created_at?: string
          processed_at?: string | null
        }
        Relationships: []
      }
      email_threads: {
        Row: {
          id: string
          ticket_id: string
          message_id_header: string
          in_reply_to: string | null
          references_header: string | null
          subject: string
          from_address: string
          to_address: string
          created_at: string
        }
        Insert: {
          id?: string
          ticket_id: string
          message_id_header: string
          in_reply_to?: string | null
          references_header?: string | null
          subject: string
          from_address: string
          to_address: string
          created_at?: string
        }
        Update: {
          id?: string
          ticket_id?: string
          message_id_header?: string
          in_reply_to?: string | null
          references_header?: string | null
          subject?: string
          from_address?: string
          to_address?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_threads_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          }
        ]
      }
      channel_config: {
        Row: {
          id: string
          channel: 'sms' | 'email' | 'slack' | 'widget'
          enabled: boolean
          config: Json
          ai_auto_respond: boolean
          ai_confidence_threshold: number
          ai_escalation_keywords: string[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          channel: 'sms' | 'email' | 'slack' | 'widget'
          enabled?: boolean
          config?: Json
          ai_auto_respond?: boolean
          ai_confidence_threshold?: number
          ai_escalation_keywords?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          channel?: 'sms' | 'email' | 'slack' | 'widget'
          enabled?: boolean
          config?: Json
          ai_auto_respond?: boolean
          ai_confidence_threshold?: number
          ai_escalation_keywords?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      // Webhook tables (Migration 016)
      webhook_endpoints: {
        Row: {
          id: string
          name: string
          description: string | null
          url: string
          secret: string
          enabled: boolean
          events: WebhookEventType[]
          filter_status: string[] | null
          filter_priority: string[] | null
          filter_tags: string[] | null
          max_retries: number
          retry_delay_seconds: number
          timeout_seconds: number
          headers: Json
          last_triggered_at: string | null
          last_success_at: string | null
          last_failure_at: string | null
          total_deliveries: number
          successful_deliveries: number
          failed_deliveries: number
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          url: string
          secret: string
          enabled?: boolean
          events?: WebhookEventType[]
          filter_status?: string[] | null
          filter_priority?: string[] | null
          filter_tags?: string[] | null
          max_retries?: number
          retry_delay_seconds?: number
          timeout_seconds?: number
          headers?: Json
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          url?: string
          secret?: string
          enabled?: boolean
          events?: WebhookEventType[]
          filter_status?: string[] | null
          filter_priority?: string[] | null
          filter_tags?: string[] | null
          max_retries?: number
          retry_delay_seconds?: number
          timeout_seconds?: number
          headers?: Json
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_endpoints_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          }
        ]
      }
      webhook_deliveries: {
        Row: {
          id: string
          webhook_endpoint_id: string
          event_type: WebhookEventType
          event_id: string
          payload: Json
          status: WebhookDeliveryStatus
          attempts: number
          next_retry_at: string | null
          response_status: number | null
          response_body: string | null
          response_headers: Json | null
          response_time_ms: number | null
          error_message: string | null
          created_at: string
          delivered_at: string | null
          last_attempt_at: string | null
        }
        Insert: {
          id?: string
          webhook_endpoint_id: string
          event_type: WebhookEventType
          event_id: string
          payload: Json
          status?: WebhookDeliveryStatus
          attempts?: number
          next_retry_at?: string | null
          response_status?: number | null
          response_body?: string | null
          response_headers?: Json | null
          response_time_ms?: number | null
          error_message?: string | null
          created_at?: string
          delivered_at?: string | null
          last_attempt_at?: string | null
        }
        Update: {
          id?: string
          webhook_endpoint_id?: string
          event_type?: WebhookEventType
          event_id?: string
          payload?: Json
          status?: WebhookDeliveryStatus
          attempts?: number
          next_retry_at?: string | null
          response_status?: number | null
          response_body?: string | null
          response_headers?: Json | null
          response_time_ms?: number | null
          error_message?: string | null
          created_at?: string
          delivered_at?: string | null
          last_attempt_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_deliveries_webhook_endpoint_id_fkey"
            columns: ["webhook_endpoint_id"]
            isOneToOne: false
            referencedRelation: "webhook_endpoints"
            referencedColumns: ["id"]
          }
        ]
      }
      webhook_sources: {
        Row: {
          id: string
          name: string
          description: string | null
          type: WebhookSourceType
          verification_token: string | null
          signing_secret: string | null
          field_mapping: Json
          auto_create_tickets: boolean
          default_priority: string
          default_tags: string[]
          enabled: boolean
          last_received_at: string | null
          total_received: number
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          type: WebhookSourceType
          verification_token?: string | null
          signing_secret?: string | null
          field_mapping?: Json
          auto_create_tickets?: boolean
          default_priority?: string
          default_tags?: string[]
          enabled?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          type?: WebhookSourceType
          verification_token?: string | null
          signing_secret?: string | null
          field_mapping?: Json
          auto_create_tickets?: boolean
          default_priority?: string
          default_tags?: string[]
          enabled?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_sources_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          }
        ]
      }
      // Read receipts tables (Migration 017)
      message_read_receipts: {
        Row: {
          id: string
          message_id: string
          reader_type: 'customer' | 'agent'
          reader_id: string
          read_at: string
        }
        Insert: {
          id?: string
          message_id: string
          reader_type: 'customer' | 'agent'
          reader_id: string
          read_at?: string
        }
        Update: {
          id?: string
          message_id?: string
          reader_type?: 'customer' | 'agent'
          reader_id?: string
          read_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_read_receipts_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          }
        ]
      }
      typing_indicators: {
        Row: {
          id: string
          ticket_id: string
          typer_type: 'customer' | 'agent'
          typer_id: string
          typer_name: string | null
          started_at: string
          expires_at: string
        }
        Insert: {
          id?: string
          ticket_id: string
          typer_type: 'customer' | 'agent'
          typer_id: string
          typer_name?: string | null
          started_at?: string
          expires_at?: string
        }
        Update: {
          id?: string
          ticket_id?: string
          typer_type?: 'customer' | 'agent'
          typer_id?: string
          typer_name?: string | null
          started_at?: string
          expires_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "typing_indicators_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      match_knowledge: {
        Args: {
          query_embedding: number[]
          match_threshold: number
          match_count: number
        }
        Returns: {
          id: string
          title: string
          content: string
          similarity: number
        }[]
      }
      insert_knowledge_article: {
        Args: {
          p_title: string
          p_content: string
          p_category: string | null
          p_embedding: number[]
        }
        Returns: {
          id: string
          title: string
          content: string
          category: string | null
          created_at: string
        }
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Canned response categories
export type CannedResponseCategory =
  | 'greeting'
  | 'clarification'
  | 'process'
  | 'escalation'
  | 'closing'
  | 'promise'
  | 'apology'
  | 'technical'
  | 'general'

export const CANNED_RESPONSE_CATEGORIES: CannedResponseCategory[] = [
  'greeting',
  'clarification',
  'process',
  'escalation',
  'closing',
  'promise',
  'apology',
  'technical',
  'general',
]

export const CATEGORY_COLORS: Record<CannedResponseCategory, { bg: string; text: string; border: string }> = {
  greeting: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-700' },
  clarification: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-700' },
  process: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-700' },
  escalation: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-200 dark:border-orange-700' },
  closing: { bg: 'bg-gray-100 dark:bg-gray-900/30', text: 'text-gray-700 dark:text-gray-300', border: 'border-gray-200 dark:border-gray-700' },
  promise: { bg: 'bg-cyan-100 dark:bg-cyan-900/30', text: 'text-cyan-700 dark:text-cyan-300', border: 'border-cyan-200 dark:border-cyan-700' },
  apology: { bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-200 dark:border-rose-700' },
  technical: { bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-200 dark:border-indigo-700' },
  general: { bg: 'bg-slate-100 dark:bg-slate-900/30', text: 'text-slate-700 dark:text-slate-300', border: 'border-slate-200 dark:border-slate-700' },
}

// Helper types
export type Customer = Database['public']['Tables']['customers']['Row']
export type Ticket = Database['public']['Tables']['tickets']['Row']
export type Message = Database['public']['Tables']['messages']['Row']
export type KnowledgeArticle = Database['public']['Tables']['knowledge_articles']['Row']
export type Agent = Database['public']['Tables']['agents']['Row']
export type CannedResponse = Database['public']['Tables']['canned_responses']['Row']
export type MessageAttachment = Database['public']['Tables']['message_attachments']['Row']

export type TicketStatus = Ticket['status']
export type TicketPriority = Ticket['priority']
export type SenderType = Message['sender_type']
export type AgentStatus = Agent['status']

// Insert/Update types
export type AgentInsert = Database['public']['Tables']['agents']['Insert']
export type AgentUpdate = Database['public']['Tables']['agents']['Update']
export type TicketInsert = Database['public']['Tables']['tickets']['Insert']
export type TicketUpdate = Database['public']['Tables']['tickets']['Update']
export type MessageInsert = Database['public']['Tables']['messages']['Insert']
export type CustomerInsert = Database['public']['Tables']['customers']['Insert']
export type CannedResponseInsert = Database['public']['Tables']['canned_responses']['Insert']
export type CannedResponseUpdate = Database['public']['Tables']['canned_responses']['Update']
export type MessageAttachmentInsert = Database['public']['Tables']['message_attachments']['Insert']
export type MessageAttachmentUpdate = Database['public']['Tables']['message_attachments']['Update']

// Email log types from database
export type EmailLogRow = Database['public']['Tables']['email_logs']['Row']
export type EmailLogInsertDb = Database['public']['Tables']['email_logs']['Insert']
export type EmailLogUpdateDb = Database['public']['Tables']['email_logs']['Update']
export type EmailLogType = EmailLogRow['email_type']
export type EmailLogStatus = EmailLogRow['status']

// Extended types with relations
export type TicketWithCustomer = Ticket & {
  customer: Customer
  assigned_agent?: Pick<Agent, 'id' | 'name' | 'avatar_url'> | null
}

export type TicketWithMessages = Ticket & {
  messages: Message[]
  customer: Customer
}

// Message with attachments
export type MessageWithAttachments = Message & {
  message_attachments?: MessageAttachment[]
}

// Message metadata type for internal notes and other features
export interface MessageMetadata {
  is_internal?: boolean
}

// SLA Types
export type SlaPolicy = Database['public']['Tables']['sla_policies']['Row']
export type SlaPolicyInsert = Database['public']['Tables']['sla_policies']['Insert']
export type SlaPolicyUpdate = Database['public']['Tables']['sla_policies']['Update']

export type SlaStatus = 'ok' | 'warning' | 'breached'

export interface SlaInfo {
  status: SlaStatus
  dueAt: Date | null
  timeRemaining: string | null
  percentageUsed: number
  isFirstResponse: boolean
  breached: boolean
}

// Extended ticket type with SLA info
export interface TicketWithSla extends Ticket {
  sla_policy?: SlaPolicy | null
}

// Ticket Event Types
export type TicketEventType =
  | 'created'
  | 'status_changed'
  | 'priority_changed'
  | 'assigned'
  | 'unassigned'
  | 'tagged'
  | 'escalated'
  | 'resolved'
  | 'message_sent'
  | 'note_added'
  | 'ai_handling_changed'
  | 'reassigned'

// Ticket Event Metadata type
export interface TicketEventMetadata {
  tag?: string
  message_id?: string
  previous_agent_id?: string
  previous_agent_name?: string
  new_agent_id?: string
  new_agent_name?: string
  [key: string]: unknown
}

// Ticket Event type (matches database schema)
export interface TicketEvent {
  id: string
  ticket_id: string
  agent_id: string | null
  event_type: TicketEventType
  old_value: string | null
  new_value: string | null
  metadata: TicketEventMetadata | null
  created_at: string
}

// Ticket Event with agent info for display
export interface TicketEventWithAgent extends TicketEvent {
  agent?: Pick<Agent, 'id' | 'name' | 'avatar_url'> | null
}

// Customer Access Tokens (for portal authentication)
export interface CustomerAccessToken {
  id: string
  customer_id: string
  ticket_id: string | null
  token: string
  expires_at: string | null
  last_used_at: string | null
  created_at: string
}

export interface CustomerAccessTokenInsert {
  id?: string
  customer_id: string
  ticket_id?: string | null
  token: string
  expires_at?: string | null
  last_used_at?: string | null
  created_at?: string
}

// Email Logs
export interface EmailLog {
  id: string
  ticket_id: string
  message_id: string | null
  direction: 'inbound' | 'outbound'
  from_address: string
  to_address: string
  subject: string
  body_text: string | null
  body_html: string | null
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced'
  external_id: string | null
  error_message: string | null
  created_at: string
}

export interface EmailLogInsert {
  id?: string
  ticket_id: string
  message_id?: string | null
  direction: 'inbound' | 'outbound'
  from_address: string
  to_address: string
  subject: string
  body_text?: string | null
  body_html?: string | null
  status?: 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced'
  external_id?: string | null
  error_message?: string | null
  created_at?: string
}

// Portal types
export interface PortalSession {
  customerId: string
  customerName: string | null
  customerEmail: string | null
  tokenId: string
  ticketId?: string | null // If token is for specific ticket
  expiresAt?: string | null
}

export interface PortalTicket {
  id: string
  subject: string
  status: TicketStatus
  priority: TicketPriority
  created_at: string
  updated_at: string
  last_message_at?: string
  message_count?: number
}

export interface PortalMessage {
  id: string
  sender_type: 'customer' | 'agent' | 'ai'
  content: string
  created_at: string
  // Internal notes are filtered out for portal
}

// Ticket Feedback types
export type TicketFeedback = Database['public']['Tables']['ticket_feedback']['Row']
export type TicketFeedbackInsert = Database['public']['Tables']['ticket_feedback']['Insert']
export type TicketFeedbackUpdate = Database['public']['Tables']['ticket_feedback']['Update']

// Metrics Snapshot types
export type MetricsSnapshot = Database['public']['Tables']['metrics_snapshots']['Row']
export type MetricsSnapshotInsert = Database['public']['Tables']['metrics_snapshots']['Insert']
export type MetricsSnapshotUpdate = Database['public']['Tables']['metrics_snapshots']['Update']
export type MetricsPeriodType = MetricsSnapshot['period_type']

// Feedback with ticket info for analytics
export interface TicketFeedbackWithTicket extends TicketFeedback {
  ticket?: Pick<Ticket, 'id' | 'subject' | 'status' | 'priority' | 'assigned_agent_id' | 'created_at'>
  customer?: Pick<Customer, 'id' | 'name' | 'email'>
}

// CSAT aggregated metrics
export interface CsatMetrics {
  averageScore: number
  totalResponses: number
  responseRate: number
  distribution: {
    rating: number
    count: number
    percentage: number
  }[]
  trend: {
    date: string
    score: number
    count: number
  }[]
}

// ==========================================
// Workflow Rules Engine Types
// ==========================================

// Trigger events that can start a workflow
export type WorkflowTriggerEvent =
  | 'ticket_created'
  | 'status_changed'
  | 'priority_changed'
  | 'ticket_assigned'
  | 'sla_breach'
  | 'message_received'

// Condition operators
export type WorkflowConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'greater_than'
  | 'less_than'
  | 'in'
  | 'not_in'

// Fields that can be used in conditions
export type WorkflowConditionField =
  | 'status'
  | 'priority'
  | 'subject'
  | 'tags'
  | 'customer_language'
  | 'ai_handled'
  | 'assigned_agent_id'

// Action types
export type WorkflowActionType =
  | 'set_status'
  | 'set_priority'
  | 'add_tag'
  | 'remove_tag'
  | 'assign_agent'
  | 'notify_agents'
  | 'send_email'
  | 'add_internal_note'

// Workflow condition structure
export interface WorkflowCondition {
  field: WorkflowConditionField
  operator: WorkflowConditionOperator
  value: string | number | boolean | string[]
}

// Workflow action structure
export interface WorkflowAction {
  type: WorkflowActionType
  value?: string | string[]
  filter?: string // For notify_agents: 'online', 'all', 'assigned'
  template?: string // For send_email and add_internal_note
}

// Workflow execution status
export type WorkflowExecutionStatus = 'pending' | 'running' | 'completed' | 'failed'

// Workflow rule row type
export interface WorkflowRule {
  id: string
  name: string
  description: string | null
  is_active: boolean
  trigger_event: WorkflowTriggerEvent
  conditions: WorkflowCondition[]
  actions: WorkflowAction[]
  priority: number
  created_by: string | null
  created_at: string
  updated_at: string
}

// Workflow rule insert type
export interface WorkflowRuleInsert {
  id?: string
  name: string
  description?: string | null
  is_active?: boolean
  trigger_event: WorkflowTriggerEvent
  conditions?: WorkflowCondition[]
  actions?: WorkflowAction[]
  priority?: number
  created_by?: string | null
  created_at?: string
  updated_at?: string
}

// Workflow rule update type
export interface WorkflowRuleUpdate {
  id?: string
  name?: string
  description?: string | null
  is_active?: boolean
  trigger_event?: WorkflowTriggerEvent
  conditions?: WorkflowCondition[]
  actions?: WorkflowAction[]
  priority?: number
  created_by?: string | null
  created_at?: string
  updated_at?: string
}

// Workflow execution log
export interface WorkflowExecution {
  id: string
  workflow_rule_id: string
  ticket_id: string
  trigger_event: WorkflowTriggerEvent
  event_data: Record<string, unknown>
  conditions_matched: boolean
  actions_executed: WorkflowActionResult[]
  status: WorkflowExecutionStatus
  error_message: string | null
  started_at: string
  completed_at: string | null
  created_at: string
}

// Result of executing a single action
export interface WorkflowActionResult {
  action: WorkflowAction
  success: boolean
  error?: string
  result?: Record<string, unknown>
}

// Context passed to action handlers
export interface WorkflowActionContext {
  ticket: Ticket
  customer?: Customer
  agent?: Agent
  eventData: Record<string, unknown>
  supabase: unknown // SupabaseClient type
}

// Test result for workflow rule testing
export interface WorkflowTestResult {
  conditionsMatched: boolean
  conditionResults: {
    condition: WorkflowCondition
    matched: boolean
    actualValue: unknown
  }[]
  actionsToExecute: WorkflowAction[]
}

// ==========================================
// Team Collaboration Types (Notifications & Handoffs)
// ==========================================

// Notification types
export type NotificationType = 'mention' | 'handoff' | 'assignment' | 'escalation' | 'sla_warning' | 'feedback'

// Handoff status
export type HandoffStatus = 'pending' | 'accepted' | 'declined'

// Agent notification from database
export type AgentNotification = Database['public']['Tables']['agent_notifications']['Row']
export type AgentNotificationInsert = Database['public']['Tables']['agent_notifications']['Insert']
export type AgentNotificationUpdate = Database['public']['Tables']['agent_notifications']['Update']

// Ticket handoff from database
export type TicketHandoff = Database['public']['Tables']['ticket_handoffs']['Row']
export type TicketHandoffInsert = Database['public']['Tables']['ticket_handoffs']['Insert']
export type TicketHandoffUpdate = Database['public']['Tables']['ticket_handoffs']['Update']

// Notification with related data for display
export interface AgentNotificationWithDetails extends AgentNotification {
  from_agent?: Pick<Agent, 'id' | 'name' | 'avatar_url'> | null
  ticket?: Pick<Ticket, 'id' | 'subject' | 'status' | 'priority'> | null
}

// Handoff with related data for display
export interface TicketHandoffWithDetails extends TicketHandoff {
  from_agent?: Pick<Agent, 'id' | 'name' | 'avatar_url'> | null
  to_agent?: Pick<Agent, 'id' | 'name' | 'avatar_url'> | null
  ticket?: Pick<Ticket, 'id' | 'subject' | 'status' | 'priority'> | null
}

// Mention parsed from text
export interface ParsedMention {
  agentId: string
  agentName: string
  startIndex: number
  endIndex: number
}

// ==========================================
// Channel Support Types (Migration 015)
// ==========================================

// Re-export channel types
export type { ChannelType, MessageSource, PreferredChannel, RoutingDecision, DeliveryStatus } from './channels';

export type ChannelInboundLog = Database['public']['Tables']['channel_inbound_logs']['Row']
export type ChannelInboundLogInsert = Database['public']['Tables']['channel_inbound_logs']['Insert']
export type ChannelInboundLogUpdate = Database['public']['Tables']['channel_inbound_logs']['Update']

export type EmailThread = Database['public']['Tables']['email_threads']['Row']
export type EmailThreadInsert = Database['public']['Tables']['email_threads']['Insert']
export type EmailThreadUpdate = Database['public']['Tables']['email_threads']['Update']

export type ChannelConfig = Database['public']['Tables']['channel_config']['Row']
export type ChannelConfigInsert = Database['public']['Tables']['channel_config']['Insert']
export type ChannelConfigUpdate = Database['public']['Tables']['channel_config']['Update']

// ==========================================
// Webhook Types (Migration 016)
// ==========================================

// Re-export webhook types
export type { WebhookEventType, WebhookDeliveryStatus, WebhookSourceType } from './webhooks';

export type WebhookEndpoint = Database['public']['Tables']['webhook_endpoints']['Row']
export type WebhookEndpointInsert = Database['public']['Tables']['webhook_endpoints']['Insert']
export type WebhookEndpointUpdate = Database['public']['Tables']['webhook_endpoints']['Update']

export type WebhookDelivery = Database['public']['Tables']['webhook_deliveries']['Row']
export type WebhookDeliveryInsert = Database['public']['Tables']['webhook_deliveries']['Insert']
export type WebhookDeliveryUpdate = Database['public']['Tables']['webhook_deliveries']['Update']

export type WebhookSource = Database['public']['Tables']['webhook_sources']['Row']
export type WebhookSourceInsert = Database['public']['Tables']['webhook_sources']['Insert']
export type WebhookSourceUpdate = Database['public']['Tables']['webhook_sources']['Update']

// ==========================================
// Read Receipt & Typing Types (Migration 017)
// ==========================================

export type MessageReadReceipt = Database['public']['Tables']['message_read_receipts']['Row']
export type MessageReadReceiptInsert = Database['public']['Tables']['message_read_receipts']['Insert']
export type MessageReadReceiptUpdate = Database['public']['Tables']['message_read_receipts']['Update']

export type TypingIndicator = Database['public']['Tables']['typing_indicators']['Row']
export type TypingIndicatorInsert = Database['public']['Tables']['typing_indicators']['Insert']
export type TypingIndicatorUpdate = Database['public']['Tables']['typing_indicators']['Update']

// Typing indicator broadcast payload (for Supabase Realtime Broadcast)
export interface TypingBroadcast {
  ticket_id: string
  typer_type: 'customer' | 'agent'
  typer_id: string
  typer_name: string | null
  is_typing: boolean
}

// Read receipt broadcast payload
export interface ReadReceiptBroadcast {
  ticket_id: string
  reader_type: 'customer' | 'agent'
  reader_id: string
  last_read_message_id: string
  read_at: string
}

// Message with read status for display
export interface MessageWithReadStatus extends Message {
  read_by_customer: boolean
  read_by_agents: string[] // Agent IDs who have read the message
}

// Extended ticket with channel info
export interface TicketWithChannel extends Ticket {
  source_channel: ChannelType
  customer: Customer & {
    phone_number: string | null
    preferred_channel: PreferredChannel
  }
}
