/*
  # Fix Booking Groups Preferred Time Constraint

  1. Changes
    - Make `booking_groups.preferred_time` nullable
    - This allows group bookings to be created without a specific time
    - Admin will assign the time later for group sessions

  2. Reasoning
    - Group bookings don't have a specific time when initially created
    - Students only select the date, and time is assigned later
    - The trigger that creates booking_groups was failing due to NOT NULL constraint
*/

-- Make preferred_time nullable in booking_groups
ALTER TABLE booking_groups 
ALTER COLUMN preferred_time DROP NOT NULL;
