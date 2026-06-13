// Generated Supabase DB types — regenerate with:
// npx supabase gen types typescript --project-id <ref> > src/types/supabase.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      orgs: {
        Row: {
          id: string
          name: string
          plan: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          plan?: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          plan?: string
          created_at?: string
        }
      }
      users: {
        Row: {
          id: string
          org_id: string
          email: string
          full_name: string
          role: string
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          email: string
          full_name: string
          role?: string
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          email?: string
          full_name?: string
          role?: string
          avatar_url?: string | null
          created_at?: string
        }
      }
      contacts: {
        Row: {
          id: string
          org_id: string
          first_name: string
          last_name: string
          email: string | null
          phone: string | null
          company: string | null
          title: string | null
          owner_id: string | null
          tags: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          first_name: string
          last_name: string
          email?: string | null
          phone?: string | null
          company?: string | null
          title?: string | null
          owner_id?: string | null
          tags?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['contacts']['Insert']>
      }
      leads: {
        Row: {
          id: string
          org_id: string
          first_name: string
          last_name: string
          email: string | null
          phone: string | null
          company: string | null
          source: string | null
          status: string
          owner_id: string | null
          converted_contact_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          first_name: string
          last_name: string
          email?: string | null
          phone?: string | null
          company?: string | null
          source?: string | null
          status?: string
          owner_id?: string | null
          converted_contact_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['leads']['Insert']>
      }
      deals: {
        Row: {
          id: string
          org_id: string
          title: string
          value: number | null
          currency: string
          stage: string
          pipeline_id: string
          contact_id: string | null
          owner_id: string | null
          expected_close_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          title: string
          value?: number | null
          currency?: string
          stage?: string
          pipeline_id: string
          contact_id?: string | null
          owner_id?: string | null
          expected_close_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['deals']['Insert']>
      }
      tickets: {
        Row: {
          id: string
          org_id: string
          subject: string
          description: string | null
          status: string
          priority: string
          contact_id: string | null
          assignee_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          subject: string
          description?: string | null
          status?: string
          priority?: string
          contact_id?: string | null
          assignee_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['tickets']['Insert']>
      }
      activities: {
        Row: {
          id: string
          org_id: string
          type: string
          title: string
          description: string | null
          contact_id: string | null
          lead_id: string | null
          deal_id: string | null
          ticket_id: string | null
          user_id: string
          occurred_at: string
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          type: string
          title: string
          description?: string | null
          contact_id?: string | null
          lead_id?: string | null
          deal_id?: string | null
          ticket_id?: string | null
          user_id: string
          occurred_at?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['activities']['Insert']>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
