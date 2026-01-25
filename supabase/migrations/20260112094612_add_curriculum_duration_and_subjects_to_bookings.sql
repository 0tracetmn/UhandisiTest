/*
  # Add Curriculum, Duration and Multiple Subjects Support to Bookings

  1. Purpose
    - Add curriculum field to track student's current curriculum
    - Add duration field to specify session length (in minutes)
    - Create booking_subjects junction table for multiple subjects per booking
    - Support one-on-one sessions with multiple subjects

  2. Changes to `bookings` Table
    - Add `curriculum` field (text, for student's curriculum like CAPS, IEB, etc.)
    - Add `duration_minutes` field (integer, for session length)

  3. New Table: `booking_subjects`
    - Junction table linking bookings to multiple tutoring services/subjects
    - Tracks order of subjects for the booking
    - Allows bookings to have 1-5 subjects

  4. Security
    - Enable RLS on booking_subjects table
    - Allow students to manage their own booking subjects
    - Allow admins and assigned tutors to view booking subjects
*/

-- Add new fields to bookings table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'curriculum'
  ) THEN
    ALTER TABLE bookings ADD COLUMN curriculum text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'duration_minutes'
  ) THEN
    ALTER TABLE bookings ADD COLUMN duration_minutes integer;
  END IF;
END $$;

-- Create booking_subjects junction table
CREATE TABLE IF NOT EXISTS booking_subjects (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES tutoring_services(id) ON DELETE CASCADE,
  subject_order integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  UNIQUE(booking_id, service_id)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_booking_subjects_booking_id ON booking_subjects(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_subjects_service_id ON booking_subjects(service_id);

-- Enable RLS
ALTER TABLE booking_subjects ENABLE ROW LEVEL SECURITY;

-- Policy: Students can manage their own booking subjects
CREATE POLICY "Students can manage own booking subjects"
  ON booking_subjects FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings 
      WHERE bookings.id = booking_subjects.booking_id 
      AND bookings.student_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings 
      WHERE bookings.id = booking_subjects.booking_id 
      AND bookings.student_id = auth.uid()
    )
  );

-- Policy: Admins can view all booking subjects
CREATE POLICY "Admins can view all booking subjects"
  ON booking_subjects FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Policy: Tutors can view booking subjects for their assigned bookings
CREATE POLICY "Tutors can view their booking subjects"
  ON booking_subjects FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM booking_tutors
      WHERE booking_tutors.booking_id = booking_subjects.booking_id
      AND booking_tutors.tutor_id = auth.uid()
    )
  );

-- Function to validate subject count (1-5 subjects)
CREATE OR REPLACE FUNCTION validate_booking_subject_count()
RETURNS TRIGGER AS $$
DECLARE
  subject_count integer;
BEGIN
  -- Count current subjects for this booking
  SELECT COUNT(*) INTO subject_count
  FROM booking_subjects
  WHERE booking_id = NEW.booking_id;
  
  -- Check if adding this subject would exceed maximum
  IF subject_count >= 5 THEN
    RAISE EXCEPTION 'Cannot add more than 5 subjects to a booking';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to enforce subject count limit
DROP TRIGGER IF EXISTS trigger_validate_booking_subject_count ON booking_subjects;
CREATE TRIGGER trigger_validate_booking_subject_count
  BEFORE INSERT ON booking_subjects
  FOR EACH ROW
  EXECUTE FUNCTION validate_booking_subject_count();

-- Add comment for documentation
COMMENT ON COLUMN bookings.curriculum IS 'Student curriculum (e.g., CAPS, IEB, Cambridge)';
COMMENT ON COLUMN bookings.duration_minutes IS 'Session duration in minutes';
COMMENT ON TABLE booking_subjects IS 'Junction table for bookings with multiple subjects';
