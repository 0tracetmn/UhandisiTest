/*
  # Update bookings table for services integration

  1. Changes
    - Add `service_id` column to link bookings with tutoring_services
    - Add `delivery_mode` column for online/in-person selection
    - Keep existing `subject` for backward compatibility
    - Add `tutor_assigned_at` for tracking when tutor is assigned
    - Update status check constraint to include new workflow

  2. Important Notes
    - service_id is nullable for backward compatibility
    - Status flow: pending → approved → assigned → completed/cancelled
    - Admin approves, then assigns tutor
    - delivery_mode: 'online' or 'in_person'

  3. Security
    - RLS policies already in place for bookings table
    - Will add policy for students to view their own bookings
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'service_id'
  ) THEN
    ALTER TABLE bookings ADD COLUMN service_id uuid REFERENCES tutoring_services(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'delivery_mode'
  ) THEN
    ALTER TABLE bookings ADD COLUMN delivery_mode text CHECK (delivery_mode IN ('online', 'in_person'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'tutor_assigned_at'
  ) THEN
    ALTER TABLE bookings ADD COLUMN tutor_assigned_at timestamptz;
  END IF;
END $$;

-- Update status constraint to support new workflow
DO $$
BEGIN
  ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
  ALTER TABLE bookings ADD CONSTRAINT bookings_status_check 
    CHECK (status IN ('pending', 'approved', 'assigned', 'completed', 'cancelled', 'rejected'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_bookings_service_id ON bookings(service_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_student_id ON bookings(student_id);