/*
  # Create Tutor Availability System

  1. New Tables
    - `tutor_availability`
      - `id` (uuid, primary key)
      - `tutor_id` (uuid, foreign key to profiles)
      - `day_of_week` (integer, 0=Sunday, 1=Monday, etc.)
      - `start_time` (time)
      - `end_time` (time)
      - `is_active` (boolean)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `tutor_availability` table
    - Add policy for tutors to manage their own availability
    - Add policy for admins to view all tutor availability

  3. Indexes
    - Index on tutor_id for faster lookups
    - Index on day_of_week for availability queries
*/

CREATE TABLE IF NOT EXISTS tutor_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_tutor_availability_tutor_id ON tutor_availability(tutor_id);
CREATE INDEX IF NOT EXISTS idx_tutor_availability_day ON tutor_availability(day_of_week);
CREATE INDEX IF NOT EXISTS idx_tutor_availability_active ON tutor_availability(tutor_id, is_active);

-- Enable RLS
ALTER TABLE tutor_availability ENABLE ROW LEVEL SECURITY;

-- Policy: Tutors can view and manage their own availability
CREATE POLICY "Tutors can view own availability"
  ON tutor_availability
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = tutor_id
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Tutors can insert own availability"
  ON tutor_availability
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = tutor_id
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'tutor'
    )
  );

CREATE POLICY "Tutors can update own availability"
  ON tutor_availability
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = tutor_id)
  WITH CHECK (auth.uid() = tutor_id);

CREATE POLICY "Tutors can delete own availability"
  ON tutor_availability
  FOR DELETE
  TO authenticated
  USING (auth.uid() = tutor_id);
