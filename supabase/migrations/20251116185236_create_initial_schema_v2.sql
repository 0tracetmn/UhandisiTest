/*
  # Uhandisi Tutors - Initial Database Schema

  ## Overview
  Complete database schema for the Uhandisi Tutors booking and management system with proper RLS policies.

  ## Tables Created
  - profiles: User profile information
  - student_details: Student-specific data
  - tutor_details: Tutor-specific data
  - tutor_qualifications: Tutor qualification files
  - bookings: Session bookings
  - announcements: System announcements
  - meetings: Meeting schedules
  - materials: Learning materials
  - chat_conversations: Chat threads
  - chat_participants: Conversation participants
  - chat_messages: Chat messages
  - payments: Payment records
  - invoices: Invoice records
  - pricing_rates: Session pricing

  ## Security
  All tables have RLS enabled with role-based policies
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'tutor', 'student')),
  phone_number text,
  profile_image_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Student details
CREATE TABLE IF NOT EXISTS student_details (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  grade text,
  parent_name text,
  parent_contact text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE student_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students view own details"
  ON student_details FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Students update own details"
  ON student_details FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Students insert own details"
  ON student_details FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Tutor details
CREATE TABLE IF NOT EXISTS tutor_details (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  subjects text[] DEFAULT '{}',
  bio text,
  hourly_rate numeric(10,2),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE tutor_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View tutor details"
  ON tutor_details FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'student'))
  );

CREATE POLICY "Tutors update own details"
  ON tutor_details FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Tutors insert own details"
  ON tutor_details FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins update tutor status"
  ON tutor_details FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Tutor qualifications
CREATE TABLE IF NOT EXISTS tutor_qualifications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tutor_id uuid NOT NULL REFERENCES tutor_details(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text NOT NULL,
  uploaded_at timestamptz DEFAULT now()
);

ALTER TABLE tutor_qualifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Manage own qualifications"
  ON tutor_qualifications FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tutor_details td
      WHERE td.id = tutor_id AND td.user_id = auth.uid()
    ) OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tutor_details td
      WHERE td.id = tutor_id AND td.user_id = auth.uid()
    ) OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Bookings
CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id uuid NOT NULL REFERENCES profiles(id),
  tutor_id uuid REFERENCES profiles(id),
  subject text NOT NULL,
  session_type text NOT NULL CHECK (session_type IN ('online', 'face-to-face')),
  preferred_date date NOT NULL,
  preferred_time text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'assigned', 'completed', 'cancelled')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View bookings"
  ON bookings FOR SELECT
  TO authenticated
  USING (
    auth.uid() = student_id OR
    auth.uid() = tutor_id OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Students create bookings"
  ON bookings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students update bookings"
  ON bookings FOR UPDATE
  TO authenticated
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Admins manage bookings"
  ON bookings FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Announcements
CREATE TABLE IF NOT EXISTS announcements (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id uuid NOT NULL REFERENCES profiles(id),
  title text NOT NULL,
  content text NOT NULL,
  target_roles text[] DEFAULT '{}',
  is_published boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View announcements"
  ON announcements FOR SELECT
  TO authenticated
  USING (
    is_published = true AND (
      target_roles = '{}' OR
      EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role = ANY(target_roles)
      )
    )
  );

CREATE POLICY "Admins manage announcements"
  ON announcements FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Meetings
CREATE TABLE IF NOT EXISTS meetings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organizer_id uuid NOT NULL REFERENCES profiles(id),
  title text NOT NULL,
  description text,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  meeting_link text,
  attendees uuid[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View meetings"
  ON meetings FOR SELECT
  TO authenticated
  USING (
    auth.uid() = organizer_id OR
    auth.uid() = ANY(attendees) OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Create meetings"
  ON meetings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'tutor'))
  );

-- Materials
CREATE TABLE IF NOT EXISTS materials (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  uploaded_by uuid NOT NULL REFERENCES profiles(id),
  title text NOT NULL,
  description text,
  type text NOT NULL CHECK (type IN ('note', 'diagram', 'video')),
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_size bigint NOT NULL,
  subject text,
  grade text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View materials"
  ON materials FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Upload materials"
  ON materials FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'tutor'))
  );

CREATE POLICY "Delete materials"
  ON materials FOR DELETE
  TO authenticated
  USING (
    auth.uid() = uploaded_by OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Chat conversations
CREATE TABLE IF NOT EXISTS chat_conversations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;

-- Chat participants
CREATE TABLE IF NOT EXISTS chat_participants (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id uuid NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at timestamptz DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;

-- Now add policies for chat_conversations that reference chat_participants
CREATE POLICY "View own conversations"
  ON chat_conversations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_participants
      WHERE conversation_id = id AND user_id = auth.uid()
    )
  );

CREATE POLICY "View conversation participants"
  ON chat_participants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_participants cp
      WHERE cp.conversation_id = conversation_id AND cp.user_id = auth.uid()
    )
  );

-- Chat messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id uuid NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES profiles(id),
  content text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View conversation messages"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_participants
      WHERE conversation_id = chat_messages.conversation_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Send messages"
  ON chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM chat_participants
      WHERE conversation_id = chat_messages.conversation_id AND user_id = auth.uid()
    )
  );

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id uuid NOT NULL REFERENCES bookings(id),
  student_id uuid NOT NULL REFERENCES profiles(id),
  amount numeric(10,2) NOT NULL,
  currency text DEFAULT 'ZAR',
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  payment_method text,
  transaction_id text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own payments"
  ON payments FOR SELECT
  TO authenticated
  USING (
    auth.uid() = student_id OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Create payments"
  ON payments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Admins manage payments"
  ON payments FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number text UNIQUE NOT NULL,
  booking_id uuid NOT NULL REFERENCES bookings(id),
  student_id uuid NOT NULL REFERENCES profiles(id),
  subtotal numeric(10,2) NOT NULL,
  tax numeric(10,2) DEFAULT 0,
  total numeric(10,2) NOT NULL,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue')),
  due_date date NOT NULL,
  paid_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own invoices"
  ON invoices FOR SELECT
  TO authenticated
  USING (
    auth.uid() = student_id OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins manage invoices"
  ON invoices FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Pricing rates
CREATE TABLE IF NOT EXISTS pricing_rates (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_type text UNIQUE NOT NULL CHECK (session_type IN ('online', 'face-to-face')),
  rate numeric(10,2) NOT NULL,
  currency text DEFAULT 'ZAR',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE pricing_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View pricing"
  ON pricing_rates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins manage pricing"
  ON pricing_rates FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Insert default pricing
INSERT INTO pricing_rates (session_type, rate, currency) VALUES
  ('online', 300.00, 'ZAR'),
  ('face-to-face', 450.00, 'ZAR')
ON CONFLICT (session_type) DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_bookings_student ON bookings(student_id);
CREATE INDEX IF NOT EXISTS idx_bookings_tutor ON bookings(tutor_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_materials_type ON materials(type);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_payments_student ON payments(student_id);
CREATE INDEX IF NOT EXISTS idx_invoices_student ON invoices(student_id);
