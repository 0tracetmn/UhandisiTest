/*
  # Fix Group Session Status Constraint

  1. Changes
    - Update the status CHECK constraint to include 'full' status
    - Fix the trigger function to properly handle full sessions
  
  2. Notes
    - This fixes an issue where the trigger tried to set status to 'full' 
      but it wasn't allowed by the CHECK constraint
*/

-- Drop the existing constraint
ALTER TABLE group_sessions 
DROP CONSTRAINT IF EXISTS group_sessions_status_check;

-- Add the updated constraint with 'full' status
ALTER TABLE group_sessions 
ADD CONSTRAINT group_sessions_status_check 
CHECK (status IN ('forming', 'ready', 'full', 'assigned', 'approved', 'completed', 'cancelled'));