export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          slug: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          id: string
          org_id: string
          full_name: string
          email: string
          role: string
          created_at: string
        }
        Insert: {
          id: string
          org_id: string
          full_name: string
          email: string
          role?: string
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          full_name?: string
          email?: string
          role?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'users_org_id_fkey'
            columns: ['org_id']
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      org_members: {
        Row: {
          id: string
          user_id: string
          org_id: string
          role: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          org_id: string
          role?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          org_id?: string
          role?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'org_members_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'org_members_org_id_fkey'
            columns: ['org_id']
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      brand_books: {
        Row: {
          id: string
          org_id: string
          created_by: string
          name: string
          client_name: string | null
          tagline: string | null
          status: string
          current_step: number
          pdf_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          created_by: string
          name: string
          client_name?: string | null
          tagline?: string | null
          status?: string
          current_step?: number
          pdf_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          created_by?: string
          name?: string
          client_name?: string | null
          tagline?: string | null
          status?: string
          current_step?: number
          pdf_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'brand_books_org_id_fkey'
            columns: ['org_id']
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'brand_books_created_by_fkey'
            columns: ['created_by']
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      brand_book_sections: {
        Row: {
          id: string
          brand_book_id: string
          section_key: string
          step_number: number | null
          title: string | null
          status: string
          content: string | null
          order_index: number | null
          user_input: Record<string, unknown>
          ai_generated: Record<string, unknown>
          final_content: Record<string, unknown>
          ai_status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          brand_book_id: string
          section_key: string
          step_number?: number | null
          title?: string | null
          status?: string
          content?: string | null
          order_index?: number | null
          user_input?: Record<string, unknown>
          ai_generated?: Record<string, unknown>
          final_content?: Record<string, unknown>
          ai_status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          brand_book_id?: string
          section_key?: string
          step_number?: number | null
          title?: string | null
          status?: string
          content?: string | null
          order_index?: number | null
          user_input?: Record<string, unknown>
          ai_generated?: Record<string, unknown>
          final_content?: Record<string, unknown>
          ai_status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'brand_book_sections_brand_book_id_fkey'
            columns: ['brand_book_id']
            referencedRelation: 'brand_books'
            referencedColumns: ['id']
          },
        ]
      }
      campaigns: {
        Row: {
          id: string
          org_id: string
          created_by: string
          brand_book_id: string | null
          name: string
          client_name: string | null
          status: string
          current_stage: number
          uploaded_brand_book_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          created_by: string
          brand_book_id?: string | null
          name: string
          client_name?: string | null
          status?: string
          current_stage?: number
          uploaded_brand_book_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          created_by?: string
          brand_book_id?: string | null
          name?: string
          client_name?: string | null
          status?: string
          current_stage?: number
          uploaded_brand_book_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'campaigns_org_id_fkey'
            columns: ['org_id']
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'campaigns_created_by_fkey'
            columns: ['created_by']
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'campaigns_brand_book_id_fkey'
            columns: ['brand_book_id']
            referencedRelation: 'brand_books'
            referencedColumns: ['id']
          },
        ]
      }
      campaign_stages: {
        Row: {
          id: string
          campaign_id: string
          stage_key: string
          stage_number: number
          title: string | null
          status: string
          content: string | null
          user_input: Record<string, unknown>
          ai_generated: Record<string, unknown>
          final_content: Record<string, unknown>
          ai_status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          campaign_id: string
          stage_key: string
          stage_number: number
          title?: string | null
          status?: string
          content?: string | null
          user_input?: Record<string, unknown>
          ai_generated?: Record<string, unknown>
          final_content?: Record<string, unknown>
          ai_status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          campaign_id?: string
          stage_key?: string
          stage_number?: number
          title?: string | null
          status?: string
          content?: string | null
          user_input?: Record<string, unknown>
          ai_generated?: Record<string, unknown>
          final_content?: Record<string, unknown>
          ai_status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'campaign_stages_campaign_id_fkey'
            columns: ['campaign_id']
            referencedRelation: 'campaigns'
            referencedColumns: ['id']
          },
        ]
      }
      prompt_templates: {
        Row: {
          id: string
          org_id: string
          prompt_key: string
          active_version: number
          model: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          prompt_key: string
          active_version?: number
          model?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          prompt_key?: string
          active_version?: number
          model?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'prompt_templates_org_id_fkey'
            columns: ['org_id']
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      prompt_versions: {
        Row: {
          id: string
          prompt_id: string
          version: number
          system_prompt: string
          user_prompt_template: string
          model: string
          max_tokens: number
          temperature: number
          created_at: string
        }
        Insert: {
          id?: string
          prompt_id: string
          version: number
          system_prompt: string
          user_prompt_template: string
          model?: string
          max_tokens?: number
          temperature?: number
          created_at?: string
        }
        Update: {
          id?: string
          prompt_id?: string
          version?: number
          system_prompt?: string
          user_prompt_template?: string
          model?: string
          max_tokens?: number
          temperature?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'prompt_versions_prompt_id_fkey'
            columns: ['prompt_id']
            referencedRelation: 'prompt_templates'
            referencedColumns: ['id']
          },
        ]
      }
      prompt_registry: {
        Row: {
          id: string
          prompt_key: string
          version: number
          system_prompt: string
          user_prompt_template: string
          model: string
          max_tokens: number
          temperature: number
          is_active: boolean
          created_at: string
          notes: string | null
        }
        Insert: {
          id?: string
          prompt_key: string
          version?: number
          system_prompt: string
          user_prompt_template: string
          model?: string
          max_tokens?: number
          temperature?: number
          is_active?: boolean
          created_at?: string
          notes?: string | null
        }
        Update: {
          id?: string
          prompt_key?: string
          version?: number
          system_prompt?: string
          user_prompt_template?: string
          model?: string
          max_tokens?: number
          temperature?: number
          is_active?: boolean
          created_at?: string
          notes?: string | null
        }
        Relationships: []
      }
      llm_call_log: {
        Row: {
          id: string
          org_id: string
          user_id: string
          prompt_key: string
          prompt_version: number
          input_tokens: number | null
          output_tokens: number | null
          latency_ms: number | null
          status: string
          error_message: string | null
          related_entity_type: string | null
          related_entity_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          user_id: string
          prompt_key: string
          prompt_version: number
          input_tokens?: number | null
          output_tokens?: number | null
          latency_ms?: number | null
          status: string
          error_message?: string | null
          related_entity_type?: string | null
          related_entity_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          user_id?: string
          prompt_key?: string
          prompt_version?: number
          input_tokens?: number | null
          output_tokens?: number | null
          latency_ms?: number | null
          status?: string
          error_message?: string | null
          related_entity_type?: string | null
          related_entity_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'llm_call_log_org_id_fkey'
            columns: ['org_id']
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'llm_call_log_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      file_uploads: {
        Row: {
          id: string
          org_id: string
          uploaded_by: string
          file_name: string
          file_type: string
          storage_path: string
          related_entity_type: string | null
          related_entity_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          uploaded_by: string
          file_name: string
          file_type: string
          storage_path: string
          related_entity_type?: string | null
          related_entity_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          uploaded_by?: string
          file_name?: string
          file_type?: string
          storage_path?: string
          related_entity_type?: string | null
          related_entity_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'file_uploads_org_id_fkey'
            columns: ['org_id']
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'file_uploads_uploaded_by_fkey'
            columns: ['uploaded_by']
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
