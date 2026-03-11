/*
  # Remove Duplicate Group Sessions

  1. Problem
    - Recent migrations created duplicate group_sessions
    - Migration 20260311095314 synced booking_groups to group_sessions
    - Migration 20260311095338 ran another INSERT, duplicating everything
    - Admin dashboard shows duplicate bookings

  2. Solution
    - Remove all duplicate group_sessions (keep only oldest by created_at)
    - Remove duplicate group_session_participants
    - Ensure only one entry per booking_group

  3. Security
    - No changes to RLS policies
*/

-- Step 1: Remove duplicate group_session_participants
-- Keep only the first entry for each (group_session_id, student_id) pair
DELETE FROM group_session_participants
WHERE id NOT IN (
  SELECT DISTINCT ON (group_session_id, student_id) id
  FROM group_session_participants
  ORDER BY group_session_id, student_id, created_at ASC
);

-- Step 2: Remove duplicate group_sessions
-- For each booking_group.id, keep only the first group_session (by created_at)
-- This handles cases where multiple group_sessions were created for the same booking_group
DELETE FROM group_sessions
WHERE id IN (
  SELECT gs.id
  FROM group_sessions gs
  INNER JOIN (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY id ORDER BY created_at ASC) as rn
    FROM group_sessions
  ) ranked
  ON gs.id = ranked.id
  WHERE ranked.rn > 1
);

-- Step 3: Ensure group_sessions match booking_groups 1:1
-- Remove any group_sessions that don't have a corresponding booking_group
DELETE FROM group_sessions
WHERE id NOT IN (SELECT id FROM booking_groups);

-- Step 4: Re-sync participants to ensure data consistency
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
