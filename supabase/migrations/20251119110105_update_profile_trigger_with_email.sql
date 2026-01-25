/*
  # Update profile creation trigger to include email

  1. Changes
    - Update handle_new_user function to include email field
    - Email is populated from NEW.email during user registration
    - Existing trigger remains active, just updates the function

  2. Important Notes
    - This ensures all new registrations will have email in profiles table
    - Makes querying user data easier without auth table joins
    - Email is synced from Supabase auth automatically

  3. Security
    - Function runs with SECURITY DEFINER to allow profile creation
    - No additional security changes needed
*/

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, profiles.email),
    name = COALESCE(EXCLUDED.name, profiles.name),
    role = COALESCE(EXCLUDED.role, profiles.role),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;