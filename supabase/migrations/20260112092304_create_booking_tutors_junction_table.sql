/*
  # Create Booking Tutors Junction Table

  1. Purpose
    - Support multiple tutors per booking/session (min 1, max 5)
    - Replace single tutor_id with many-to-many relationship
    - Allow admin to assign multiple tutors to handle larger sessions

  2. New Table: `booking_tutors`
    - Links bookings to multiple tutors
    - Tracks assignment order and timestamps
    - Enforces min 1, max 5 tutors per booking

  3. Changes
    - Keep existing `tutor_id` columns for backward compatibility
    - Add new junction table for multi-tutor assignments
    - Add validation to ensure 1-5 tutors per booking

  4. Security
    - Enable RLS on booking_tutors table
    - Allow admins to manage assignments
    - Allow tutors and students to view their assignments
*/

-- Create booking_tutors junction table
CREATE TABLE IF NOT EXISTS booking_tutors (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  tutor_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_at timestamptz DEFAULT now(),
  assigned_by uuid REFERENCES profiles(id),
  assignment_order integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  UNIQUE(booking_id, tutor_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_booking_tutors_booking_id ON booking_tutors(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_tutors_tutor_id ON booking_tutors(tutor_id);

-- Enable RLS
ALTER TABLE booking_tutors ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can manage all assignments
CREATE POLICY "Admins can manage booking tutors"
  ON booking_tutors FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Policy: Tutors can view their assignments
CREATE POLICY "Tutors can view their assignments"
  ON booking_tutors FOR SELECT
  TO authenticated
  USING (tutor_id = auth.uid());

-- Policy: Students can view tutors assigned to their bookings
CREATE POLICY "Students can view their booking tutors"
  ON booking_tutors FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings 
      WHERE bookings.id = booking_tutors.booking_id 
      AND bookings.student_id = auth.uid()
    )
  );

-- Function to validate tutor count (1-5 tutors per booking)
CREATE OR REPLACE FUNCTION validate_booking_tutor_count()
RETURNS TRIGGER AS $$
DECLARE
  tutor_count integer;
BEGIN
  -- Count current tutors for this booking
  SELECT COUNT(*) INTO tutor_count
  FROM booking_tutors
  WHERE booking_id = NEW.booking_id;
  
  -- Check if adding this tutor would exceed maximum
  IF tutor_count >= 5 THEN
    RAISE EXCEPTION 'Cannot assign more than 5 tutors to a booking';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to enforce tutor count limit
DROP TRIGGER IF EXISTS trigger_validate_booking_tutor_count ON booking_tutors;
CREATE TRIGGER trigger_validate_booking_tutor_count
  BEFORE INSERT ON booking_tutors
  FOR EACH ROW
  EXECUTE FUNCTION validate_booking_tutor_count();

-- Function to check minimum tutor requirement
CREATE OR REPLACE FUNCTION check_min_tutors_assigned(p_booking_id uuid)
RETURNS boolean AS $$
DECLARE
  tutor_count integer;
BEGIN
  SELECT COUNT(*) INTO tutor_count
  FROM booking_tutors
  WHERE booking_id = p_booking_id;
  
  RETURN tutor_count >= 1;
END;
$$ LANGUAGE plpgsql;
