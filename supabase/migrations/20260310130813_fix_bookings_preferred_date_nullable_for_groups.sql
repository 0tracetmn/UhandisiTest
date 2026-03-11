/*
  # Fix bookings table to allow null preferred_date for group bookings

  1. Changes
    - Make `preferred_date` nullable in `bookings` table
    - This allows individual student bookings within a group to not have dates initially

  2. Reasoning
    - For group bookings, students only select subject and delivery mode
    - Admin sets the date/time later when the group is ready
    - Individual bookings still require dates (validation in application layer)

  3. Notes
    - The application layer should enforce that one-on-one bookings still require dates
    - Group bookings (class_type = 'group') can have null dates initially
*/

-- Make preferred_date nullable in bookings table
ALTER TABLE bookings
ALTER COLUMN preferred_date DROP NOT NULL;

-- Update existing group bookings to have null dates
UPDATE bookings
SET preferred_date = NULL, updated_at = now()
WHERE class_type = 'group' 
AND group_id IS NOT NULL;