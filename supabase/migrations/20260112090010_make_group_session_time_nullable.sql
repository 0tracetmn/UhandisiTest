/*
  # Make Group Session Time Nullable

  1. Changes
    - Alter `group_sessions.preferred_time` to allow NULL values
    - This allows group sessions to be created without a specific time
    - Time can be assigned later by admin based on timetable

  2. Reasoning
    - Group sessions follow a set timetable that is communicated to students
    - Students only select their preferred date when booking
    - The specific time is assigned later by admins
*/

-- Make preferred_time nullable for group sessions
ALTER TABLE group_sessions 
ALTER COLUMN preferred_time DROP NOT NULL;
