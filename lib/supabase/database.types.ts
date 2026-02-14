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
          user_id: string | null;
          mime_type: string | null;
          size_bytes: number | null;
          status: Database["public"]["Enums"]["document_status"];
          error: string | null;
          extracted_text: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          file_name: string;
          file_path: string;
          created_at?: string;
          user_id?: string | null;
          mime_type?: string | null;
          size_bytes?: number | null;
          status?: Database["public"]["Enums"]["document_status"];
          error?: string | null;
          extracted_text?: string | null;
          updated_at?: string;
        };
        Update: {
          file_name?: string;
          file_path?: string;
          user_id?: string | null;
          mime_type?: string | null;
          size_bytes?: number | null;
          status?: Database["public"]["Enums"]["document_status"];
          error?: string | null;
          extracted_text?: string | null;
          updated_at?: string;
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
          project_id: string | null;
          chunk_index: number | null;
          token_count: number | null;
        };
        Insert: {
          id?: string;
          document_id: string;
          content: string;
          embedding: unknown;
          created_at?: string;
          project_id?: string | null;
          chunk_index?: number | null;
          token_count?: number | null;
        };
        Update: {
          content?: string;
          embedding?: unknown;
          project_id?: string | null;
          chunk_index?: number | null;
          token_count?: number | null;
        };
        Relationships: [];
      };
      interview_transcripts: {
        Row: {
          id: string;
          project_id: string;
          speaker: string;
          text: string;
          timestamp_ms: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          speaker: string;
          text: string;
          timestamp_ms: number;
          created_at?: string;
        };
        Update: {
          speaker?: string;
          text?: string;
          timestamp_ms?: number;
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
    Functions: {
      match_project_embeddings: {
        Args: {
          p_project_id: string;
          p_query_embedding: string;
          p_match_count?: number;
          p_min_similarity?: number;
        };
        Returns: Array<{ document_id: string; content: string; similarity: number }>;
      };
    };
    Enums: {
      document_status: "uploaded" | "processing" | "ready" | "error";
    };
    CompositeTypes: Record<string, never>;
  };
};
