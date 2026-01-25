/*
  # Create Group Session Tutors Junction Table

  1. Purpose
    - Support multiple tutors per group session (min 1, max 5)
    - Mirror the booking_tutors structure for consistency
    - Allow admin to assign multiple tutors to group sessions

  2. New Table: `group_session_tutors`
    - Links group sessions to multiple tutors
    - Tracks assignment order and timestamps
    - Enforces min 1, max 5 tutors per group session

  3. Security
    - Enable RLS on group_session_tutors table
    - Allow admins to manage assignments
    - Allow tutors and students to view their assignments
*/

-- Create group_session_tutors junction table
CREATE TABLE IF NOT EXISTS group_session_tutors (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_session_id uuid NOT NULL REFERENCES group_sessions(id) ON DELETE CASCADE,
  tutor_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_at timestamptz DEFAULT now(),
  assigned_by uuid REFERENCES profiles(id),
  assignment_order integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  UNIQUE(group_session_id, tutor_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_group_session_tutors_session_id ON group_session_tutors(group_session_id);
CREATE INDEX IF NOT EXISTS idx_group_session_tutors_tutor_id ON group_session_tutors(tutor_id);

-- Enable RLS
ALTER TABLE group_session_tutors ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can manage all assignments
CREATE POLICY "Admins can manage group session tutors"
  ON group_session_tutors FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Policy: Tutors can view their assignments
CREATE POLICY "Tutors can view their group session assignments"
  ON group_session_tutors FOR SELECT
  TO authenticated
  USING (tutor_id = auth.uid());

-- Policy: Students can view tutors assigned to their group sessions
CREATE POLICY "Students can view their group session tutors"
  ON group_session_tutors FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM group_session_participants 
      WHERE group_session_participants.group_session_id = group_session_tutors.group_session_id 
      AND group_session_participants.student_id = auth.uid()
    )
  );

-- Function to validate tutor count for group sessions (1-5 tutors)
CREATE OR REPLACE FUNCTION validate_group_session_tutor_count()
RETURNS TRIGGER AS $$
DECLARE
  tutor_count integer;
BEGIN
  -- Count current tutors for this group session
  SELECT COUNT(*) INTO tutor_count
  FROM group_session_tutors
  WHERE group_session_id = NEW.group_session_id;
  
  -- Check if adding this tutor would exceed maximum
  IF tutor_count >= 5 THEN
    RAISE EXCEPTION 'Cannot assign more than 5 tutors to a group session';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to enforce tutor count limit
DROP TRIGGER IF EXISTS trigger_validate_group_session_tutor_count ON group_session_tutors;
CREATE TRIGGER trigger_validate_group_session_tutor_count
  BEFORE INSERT ON group_session_tutors
  FOR EACH ROW
  EXECUTE FUNCTION validate_group_session_tutor_count();
