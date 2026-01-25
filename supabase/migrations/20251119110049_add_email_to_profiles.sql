/*
  # Add email column to profiles table

  1. Changes
    - Add `email` column to `profiles` table to store user email addresses
    - This allows easier querying without needing to join with auth.users
    - The email will be populated during registration via the auth trigger

  2. Important Notes
    - Email is nullable to support existing users
    - The trigger that creates profiles should be updated to include email
    - For existing users, email can be populated via a one-time migration

  3. Security
    - No RLS changes needed (inherits from existing table policies)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'email'
  ) THEN
    ALTER TABLE profiles ADD COLUMN email text;
  END IF;
END $$;