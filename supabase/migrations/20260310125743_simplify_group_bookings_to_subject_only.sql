/*
  # Simplify Group Bookings to Subject-Only Matching

  1. Changes
    - Make `preferred_date` nullable in `group_sessions` table
    - Update `max_students` default from 40 to 50
    - Remove date-based index and create subject-only index
    - Update existing forming/ready group sessions to have null dates

  2. Reasoning
    - Students will be grouped purely by subject, not by date
    - Admin will manage the timetable and notify students of actual dates
    - Simpler booking flow for students - just select subject
    - Group size increased to 50 as per requirement

  3. Notes
    - Only updates group sessions that haven't been approved yet (forming/ready status)
    - Keeps historical data intact for completed sessions
*/

-- Make preferred_date nullable in group_sessions
ALTER TABLE group_sessions
ALTER COLUMN preferred_date DROP NOT NULL;

-- Update max_students default to 50
ALTER TABLE group_sessions
ALTER COLUMN max_students SET DEFAULT 50;

-- Update existing forming/ready group sessions to have null dates
UPDATE group_sessions
SET preferred_date = NULL, updated_at = now()
WHERE status IN ('forming', 'ready');

-- Drop the old date-based index
DROP INDEX IF EXISTS idx_group_sessions_subject_date_time;

-- Create new index for subject-only matching
CREATE INDEX IF NOT EXISTS idx_group_sessions_subject_session_type
ON group_sessions(subject, service_id, session_type, status)
WHERE status IN ('forming', 'ready');