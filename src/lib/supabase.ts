import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          name: string;
          role: 'admin' | 'tutor' | 'student';
          phone_number: string | null;
          profile_image_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          role: 'admin' | 'tutor' | 'student';
          phone_number?: string | null;
          profile_image_url?: string | null;
        };
        Update: {
          name?: string;
          phone_number?: string | null;
          profile_image_url?: string | null;
        };
      };
      student_details: {
        Row: {
          id: string;
          user_id: string;
          grade: string | null;
          parent_name: string | null;
          parent_contact: string | null;
          created_at: string;
        };
        Insert: {
          user_id: string;
          grade?: string | null;
          parent_name?: string | null;
          parent_contact?: string | null;
        };
        Update: {
          grade?: string | null;
          parent_name?: string | null;
          parent_contact?: string | null;
        };
      };
      tutor_details: {
        Row: {
          id: string;
          user_id: string;
          status: 'pending' | 'approved' | 'rejected';
          subjects: string[];
          bio: string | null;
          hourly_rate: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          subjects?: string[];
          bio?: string | null;
          hourly_rate?: number | null;
        };
        Update: {
          status?: 'pending' | 'approved' | 'rejected';
          subjects?: string[];
          bio?: string | null;
          hourly_rate?: number | null;
        };
      };
      bookings: {
        Row: {
          id: string;
          student_id: string;
          tutor_id: string | null;
          subject: string;
          session_type: 'online' | 'face-to-face';
          preferred_date: string;
          preferred_time: string;
          status: 'pending' | 'approved' | 'assigned' | 'completed' | 'cancelled';
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          student_id: string;
          subject: string;
          session_type: 'online' | 'face-to-face';
          preferred_date: string;
          preferred_time: string;
          notes?: string | null;
        };
        Update: {
          tutor_id?: string | null;
          status?: 'pending' | 'approved' | 'assigned' | 'completed' | 'cancelled';
          notes?: string | null;
        };
      };
      announcements: {
        Row: {
          id: string;
          author_id: string;
          title: string;
          content: string;
          target_roles: string[];
          is_published: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          author_id: string;
          title: string;
          content: string;
          target_roles?: string[];
          is_published?: boolean;
        };
        Update: {
          title?: string;
          content?: string;
          target_roles?: string[];
          is_published?: boolean;
        };
      };
      materials: {
        Row: {
          id: string;
          uploaded_by: string;
          title: string;
          description: string | null;
          type: 'note' | 'diagram' | 'video';
          file_url: string;
          file_name: string;
          file_size: number;
          subject: string | null;
          grade: string | null;
          created_at: string;
        };
        Insert: {
          uploaded_by: string;
          title: string;
          description?: string | null;
          type: 'note' | 'diagram' | 'video';
          file_url: string;
          file_name: string;
          file_size: number;
          subject?: string | null;
          grade?: string | null;
        };
      };
      chat_conversations: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {};
        Update: {};
      };
      chat_participants: {
        Row: {
          id: string;
          conversation_id: string;
          user_id: string;
          joined_at: string;
        };
        Insert: {
          conversation_id: string;
          user_id: string;
        };
      };
      chat_messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          content: string;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          conversation_id: string;
          sender_id: string;
          content: string;
        };
        Update: {
          is_read?: boolean;
        };
      };
      payments: {
        Row: {
          id: string;
          booking_id: string;
          student_id: string;
          amount: number;
          currency: string;
          status: 'pending' | 'completed' | 'failed' | 'refunded';
          payment_method: string | null;
          transaction_id: string | null;
          created_at: string;
        };
        Insert: {
          booking_id: string;
          student_id: string;
          amount: number;
          currency?: string;
          status?: 'pending' | 'completed' | 'failed' | 'refunded';
          payment_method?: string | null;
          transaction_id?: string | null;
        };
        Update: {
          status?: 'pending' | 'completed' | 'failed' | 'refunded';
          payment_method?: string | null;
          transaction_id?: string | null;
        };
      };
      invoices: {
        Row: {
          id: string;
          invoice_number: string;
          booking_id: string;
          student_id: string;
          subtotal: number;
          tax: number;
          total: number;
          status: 'draft' | 'sent' | 'paid' | 'overdue';
          due_date: string;
          paid_at: string | null;
          created_at: string;
        };
        Insert: {
          invoice_number: string;
          booking_id: string;
          student_id: string;
          subtotal: number;
          tax?: number;
          total: number;
          status?: 'draft' | 'sent' | 'paid' | 'overdue';
          due_date: string;
          paid_at?: string | null;
        };
        Update: {
          status?: 'draft' | 'sent' | 'paid' | 'overdue';
          paid_at?: string | null;
        };
      };
      pricing_rates: {
        Row: {
          id: string;
          session_type: 'online' | 'face-to-face';
          rate: number;
          currency: string;
          updated_at: string;
        };
        Insert: {
          session_type: 'online' | 'face-to-face';
          rate: number;
          currency?: string;
        };
        Update: {
          rate?: number;
          currency?: string;
        };
      };
    };
  };
};
