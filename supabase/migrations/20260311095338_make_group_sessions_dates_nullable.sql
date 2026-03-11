/*
  # Make group_sessions dates nullable for subject-only bookings

  1. Changes
    - Make preferred_date nullable in group_sessions
    - Make preferred_time nullable in group_sessions
    - This allows group_sessions to be created without dates (TBD by admin)

  2. Reasoning
    - Students can now book group sessions by subject only
    - Admin sets dates later when group is ready
    - Need to support this in group_sessions table
*/

-- Make preferred_date and preferred_time nullable in group_sessions
ALTER TABLE group_sessions
ALTER COLUMN preferred_date DROP NOT NULL;

ALTER TABLE group_sessions
ALTER COLUMN preferred_time DROP NOT NULL;

-- Now sync all booking_groups (including those with null dates) to group_sessions
INSERT INTO group_sessions (
  id,
  subject,
  session_type,
  preferred_date,
  preferred_time,
  status,
  min_students,
  max_students,
  current_count,
  created_at,
  updated_at
)
SELECT 
  bg.id,
  bg.subject,
  bg.session_type,
  bg.preferred_date,
  CASE 
    WHEN bg.preferred_time IS NOT NULL THEN bg.preferred_time::time
    ELSE NULL
  END,
  CASE 
    WHEN bg.current_group_size >= 3 THEN 'ready'
    ELSE 'forming'
  END,
  3,
  50,
  bg.current_group_size,
  bg.created_at,
  bg.updated_at
FROM booking_groups bg
WHERE NOT EXISTS (
  SELECT 1 FROM group_sessions gs WHERE gs.id = bg.id
)
ON CONFLICT (id) DO UPDATE SET
  current_count = EXCLUDED.current_count,
  status = EXCLUDED.status,
  preferred_date = EXCLUDED.preferred_date,
  preferred_time = EXCLUDED.preferred_time,
  updated_at = EXCLUDED.updated_at;

-- Add all participants to group_session_participants
INSERT INTO group_session_participants (group_session_id, student_id, notes, joined_at, created_at)
SELECT DISTINCT
  b.group_id,
  b.student_id,
  b.notes,
  b.created_at,
  now()
FROM bookings b
WHERE b.group_id IS NOT NULL
  AND b.class_type = 'group'
  AND EXISTS (SELECT 1 FROM group_sessions gs WHERE gs.id = b.group_id)
ON CONFLICT (group_session_id, student_id) DO NOTHING;