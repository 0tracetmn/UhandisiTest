/*
  # Fix booking_groups table to allow null preferred_date

  1. Changes
    - Make `preferred_date` nullable in `booking_groups` table
    - This aligns with the subject-only group booking approach
    - Students will no longer provide dates when booking group sessions

  2. Reasoning
    - The previous migration only updated `group_sessions` table
    - `booking_groups` table also needs to allow null dates
    - This ensures consistency across both tables

  3. Notes
    - Only affects group bookings
    - One-on-one bookings still require dates
*/

-- Make preferred_date nullable in booking_groups
ALTER TABLE booking_groups
ALTER COLUMN preferred_date DROP NOT NULL;

-- Update existing booking_groups with null dates where they're forming/ready
UPDATE booking_groups
SET preferred_date = NULL, updated_at = now()
WHERE id IN (
  SELECT bg.id 
  FROM booking_groups bg
  JOIN group_sessions gs ON bg.id = gs.id
  WHERE gs.status IN ('forming', 'ready')
);