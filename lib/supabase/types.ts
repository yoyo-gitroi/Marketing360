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
      }
      brand_books: {
        Row: {
          id: string
          org_id: string
          created_by: string
          name: string
          client_name: string | null
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
          status?: string
          current_step?: number
          pdf_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      brand_book_sections: {
        Row: {
          id: string
          brand_book_id: string
          section_key: string
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
          user_input?: Record<string, unknown>
          ai_generated?: Record<string, unknown>
          final_content?: Record<string, unknown>
          ai_status?: string
          created_at?: string
          updated_at?: string
        }
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
      }
      campaign_stages: {
        Row: {
          id: string
          campaign_id: string
          stage_key: string
          stage_number: number
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
          user_input?: Record<string, unknown>
          ai_generated?: Record<string, unknown>
          final_content?: Record<string, unknown>
          ai_status?: string
          created_at?: string
          updated_at?: string
        }
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
