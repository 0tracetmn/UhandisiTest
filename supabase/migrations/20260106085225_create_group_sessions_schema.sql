/*
  # Create Group Sessions Schema

  1. New Tables
    - `group_sessions`
      - `id` (uuid, primary key)
      - `subject` (text) - Subject being taught
      - `service_id` (uuid, nullable) - Reference to tutoring_services
      - `session_type` (text) - online or face-to-face
      - `preferred_date` (date) - Session date
      - `preferred_time` (time) - Session time
      - `status` (text) - forming, ready, assigned, approved, completed, cancelled
      - `tutor_id` (uuid, nullable) - Assigned tutor
      - `min_students` (integer) - Minimum students required (default 3)
      - `max_students` (integer) - Maximum students allowed (default 40)
      - `current_count` (integer) - Current number of enrolled students
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `group_session_participants`
      - `id` (uuid, primary key)
      - `group_session_id` (uuid) - Reference to group_sessions
      - `student_id` (uuid) - Reference to profiles
      - `notes` (text, nullable) - Student's notes for the session
      - `joined_at` (timestamptz) - When student joined
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Changes
    - Add `group_session_id` column to bookings table for linking group bookings

  3. Security
    - Enable RLS on both new tables
    - Add policies for students to view their group sessions
    - Add policies for admins to manage group sessions
    - Add policies for tutors to view assigned group sessions
*/

-- Create group_sessions table
CREATE TABLE IF NOT EXISTS group_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL,
  service_id uuid REFERENCES tutoring_services(id),
  session_type text NOT NULL CHECK (session_type IN ('online', 'face-to-face')),
  preferred_date date NOT NULL,
  preferred_time time NOT NULL,
  status text NOT NULL DEFAULT 'forming' CHECK (status IN ('forming', 'ready', 'assigned', 'approved', 'completed', 'cancelled')),
  tutor_id uuid REFERENCES profiles(id),
  min_students integer NOT NULL DEFAULT 3,
  max_students integer NOT NULL DEFAULT 40,
  current_count integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create group_session_participants table
CREATE TABLE IF NOT EXISTS group_session_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_session_id uuid NOT NULL REFERENCES group_sessions(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  notes text,
  joined_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(group_session_id, student_id)
);

-- Add group_session_id to bookings table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'group_session_id'
  ) THEN
    ALTER TABLE bookings ADD COLUMN group_session_id uuid REFERENCES group_sessions(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_group_sessions_status ON group_sessions(status);
CREATE INDEX IF NOT EXISTS idx_group_sessions_subject_date_time ON group_sessions(subject, preferred_date, preferred_time);
CREATE INDEX IF NOT EXISTS idx_group_sessions_tutor ON group_sessions(tutor_id);
CREATE INDEX IF NOT EXISTS idx_group_session_participants_session ON group_session_participants(group_session_id);
CREATE INDEX IF NOT EXISTS idx_group_session_participants_student ON group_session_participants(student_id);
CREATE INDEX IF NOT EXISTS idx_bookings_group_session ON bookings(group_session_id);

-- Enable RLS
ALTER TABLE group_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_session_participants ENABLE ROW LEVEL SECURITY;

-- Group Sessions Policies

-- Students can view group sessions they are part of
CREATE POLICY "Students can view their group sessions"
  ON group_sessions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM group_session_participants
      WHERE group_session_participants.group_session_id = group_sessions.id
      AND group_session_participants.student_id = auth.uid()
    )
  );

-- Tutors can view group sessions assigned to them
CREATE POLICY "Tutors can view assigned group sessions"
  ON group_sessions
  FOR SELECT
  TO authenticated
  USING (
    tutor_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'tutor'
    )
  );

-- Admins can view all group sessions
CREATE POLICY "Admins can view all group sessions"
  ON group_sessions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Students can create group sessions (when making a group booking)
CREATE POLICY "Students can create group sessions"
  ON group_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'student'
    )
  );

-- Admins can update group sessions
CREATE POLICY "Admins can update group sessions"
  ON group_sessions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admins can delete group sessions
CREATE POLICY "Admins can delete group sessions"
  ON group_sessions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Group Session Participants Policies

-- Students can view their own participation records
CREATE POLICY "Students can view their participation"
  ON group_session_participants
  FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

-- Admins can view all participation records
CREATE POLICY "Admins can view all participants"
  ON group_session_participants
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Tutors can view participants in their assigned group sessions
CREATE POLICY "Tutors can view their group participants"
  ON group_session_participants
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM group_sessions
      WHERE group_sessions.id = group_session_participants.group_session_id
      AND group_sessions.tutor_id = auth.uid()
    )
  );

-- Students can join group sessions (insert their participation)
CREATE POLICY "Students can join group sessions"
  ON group_session_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (student_id = auth.uid());

-- Students can remove themselves from forming group sessions
CREATE POLICY "Students can leave forming group sessions"
  ON group_session_participants
  FOR DELETE
  TO authenticated
  USING (
    student_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM group_sessions
      WHERE group_sessions.id = group_session_participants.group_session_id
      AND group_sessions.status = 'forming'
    )
  );

-- Admins can manage all participation records
CREATE POLICY "Admins can manage all participants"
  ON group_session_participants
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Function to update group session count and status
CREATE OR REPLACE FUNCTION update_group_session_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE group_sessions
    SET 
      current_count = current_count + 1,
      status = CASE
        WHEN current_count + 1 >= min_students AND status = 'forming' THEN 'ready'
        WHEN current_count + 1 >= max_students THEN 'full'
        ELSE status
      END,
      updated_at = now()
    WHERE id = NEW.group_session_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE group_sessions
    SET 
      current_count = GREATEST(current_count - 1, 0),
      status = CASE
        WHEN current_count - 1 < min_students AND status IN ('ready', 'full') THEN 'forming'
        ELSE status
      END,
      updated_at = now()
    WHERE id = OLD.group_session_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update group session count
DROP TRIGGER IF EXISTS trigger_update_group_session_count ON group_session_participants;
CREATE TRIGGER trigger_update_group_session_count
AFTER INSERT OR DELETE ON group_session_participants
FOR EACH ROW
EXECUTE FUNCTION update_group_session_count();
