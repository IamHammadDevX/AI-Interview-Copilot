export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          created_at?: string;
        };
        Update: {
          full_name?: string | null;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
        };
        Relationships: [];
      };
      documents: {
        Row: {
          id: string;
          project_id: string;
          file_name: string;
          file_path: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          file_name: string;
          file_path: string;
          created_at?: string;
        };
        Update: {
          file_name?: string;
          file_path?: string;
        };
        Relationships: [];
      };
      embeddings: {
        Row: {
          id: string;
          document_id: string;
          content: string;
          embedding: unknown;
          created_at: string;
        };
        Insert: {
          id?: string;
          document_id: string;
          content: string;
          embedding: unknown;
          created_at?: string;
        };
        Update: {
          content?: string;
          embedding?: unknown;
        };
        Relationships: [];
      };
      user_settings: {
        Row: {
          id: string;
          user_id: string;
          preferred_provider: string | null;
          preferred_model: string | null;
          encrypted_api_key: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          preferred_provider?: string | null;
          preferred_model?: string | null;
          encrypted_api_key?: string | null;
          created_at?: string;
        };
        Update: {
          preferred_provider?: string | null;
          preferred_model?: string | null;
          encrypted_api_key?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
