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
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          id: string
          name: string
          status?: 'online' | 'away' | 'offline'
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          status?: 'online' | 'away' | 'offline'
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
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          metadata?: Json
          name?: string | null
          preferred_language?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          metadata?: Json
          name?: string | null
          preferred_language?: string
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
          original_language: string | null
          sender_type: 'customer' | 'agent' | 'ai'
          ticket_id: string
        }
        Insert: {
          confidence?: number | null
          content: string
          content_translated?: string | null
          created_at?: string
          id?: string
          original_language?: string | null
          sender_type: 'customer' | 'agent' | 'ai'
          ticket_id: string
        }
        Update: {
          confidence?: number | null
          content?: string
          content_translated?: string | null
          created_at?: string
          id?: string
          original_language?: string | null
          sender_type?: 'customer' | 'agent' | 'ai'
          ticket_id?: string
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

// Helper types
export type Customer = Database['public']['Tables']['customers']['Row']
export type Ticket = Database['public']['Tables']['tickets']['Row']
export type Message = Database['public']['Tables']['messages']['Row']
export type KnowledgeArticle = Database['public']['Tables']['knowledge_articles']['Row']
export type Agent = Database['public']['Tables']['agents']['Row']

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

// Extended types with relations
export type TicketWithCustomer = Ticket & {
  customer: Customer
}

export type TicketWithMessages = Ticket & {
  messages: Message[]
  customer: Customer
}
