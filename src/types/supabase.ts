// Supabase generated types
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      pipelines: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          is_active: boolean;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          is_active?: boolean;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          is_active?: boolean;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      pipeline_stages: {
        Row: {
          id: string;
          pipeline_id: string;
          name: string;
          color: string;
          position: number;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          pipeline_id: string;
          name: string;
          color?: string;
          position?: number;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          pipeline_id?: string;
          name?: string;
          color?: string;
          position?: number;
          is_active?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "pipeline_stages_pipeline_id_fkey";
            columns: ["pipeline_id"];
            isOneToMany: false;
            referencedRelation: "pipelines";
            referencedColumns: ["id"];
          }
        ];
      };
    };
  };
}

