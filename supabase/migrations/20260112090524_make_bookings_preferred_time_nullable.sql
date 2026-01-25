/*
  # Make Bookings Preferred Time Nullable

  1. Changes
    - Alter `bookings.preferred_time` to allow NULL values
    - This is needed for group bookings where time is assigned later by admin
    - Matches the change made to group_sessions table

  2. Reasoning
    - Group bookings don't have a specific time when created
    - Students only select the date, and admin assigns time later
    - One-on-one bookings will still provide a specific time
*/

-- Make preferred_time nullable for bookings
ALTER TABLE bookings 
ALTER COLUMN preferred_time DROP NOT NULL;
