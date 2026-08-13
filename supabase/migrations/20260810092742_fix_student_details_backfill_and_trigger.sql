/*
# Fix Student Details Not Saving During Registration

## Problem
Student details (grade, school, province, parent/guardian info) were not being
saved during registration. The student_details table was empty even though 3
students had successfully registered. The cause: the INSERT into student_details
happens client-side after signUp, but the RLS policy requires auth.uid() = user_id.
At registration time, the session may not be established yet (especially if email
confirmation is involved), so the insert is silently blocked.

## Changes

### 1. Backfill existing students
Insert student_details rows for the 3 existing students who registered but whose
details were never saved. Their grade, school, province, and parent info will be
NULL since that data was lost — only the user_id link is created so they appear
in the admin dashboard.

### 2. Update handle_new_user trigger to also create student_details
The trigger on auth.users now reads student-related fields from raw_user_meta_data
(grade, school, province, parent_name, parent_surname, parent_contact, parent_phone,
fee_payer) and inserts a row into student_details when the user's role is 'student'.
This runs server-side as SECURITY DEFINER, bypassing RLS, so it works regardless of
session state.

### 3. Registration code change (applied separately in frontend)
The frontend signUp call must include student details in the `data` (user_metadata)
option so the trigger can read them. The separate client-side insert into
student_details is removed.

## Security
- The trigger function runs as SECURITY DEFINER, which is the existing pattern.
- No new policies needed — the trigger handles inserts server-side.
- Existing RLS policies on student_details remain unchanged.
*/

-- =========================================================
-- 1. Backfill student_details for existing students
-- =========================================================
INSERT INTO public.student_details (user_id)
SELECT p.id
FROM public.profiles p
WHERE p.role = 'student'
  AND NOT EXISTS (
    SELECT 1 FROM public.student_details sd WHERE sd.user_id = p.id
  )
ON CONFLICT DO NOTHING;

-- =========================================================
-- 2. Update handle_new_user to also create student_details
-- =========================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert or update profile
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

  -- If this is a student, create student_details from metadata
  IF COALESCE(NEW.raw_user_meta_data->>'role', 'student') = 'student' THEN
    INSERT INTO public.student_details (
      user_id,
      grade,
      school,
      province,
      parent_name,
      parent_surname,
      parent_contact,
      parent_phone,
      fee_payer
    )
    VALUES (
      NEW.id,
      NEW.raw_user_meta_data->>'grade',
      NEW.raw_user_meta_data->>'school',
      NEW.raw_user_meta_data->>'province',
      NEW.raw_user_meta_data->>'parent_name',
      NEW.raw_user_meta_data->>'parent_surname',
      NEW.raw_user_meta_data->>'parent_contact',
      NEW.raw_user_meta_data->>'parent_phone',
      COALESCE(NEW.raw_user_meta_data->>'fee_payer', 'student')
    )
    ON CONFLICT (user_id) DO UPDATE SET
      grade = COALESCE(EXCLUDED.grade, student_details.grade),
      school = COALESCE(EXCLUDED.school, student_details.school),
      province = COALESCE(EXCLUDED.province, student_details.province),
      parent_name = COALESCE(EXCLUDED.parent_name, student_details.parent_name),
      parent_surname = COALESCE(EXCLUDED.parent_surname, student_details.parent_surname),
      parent_contact = COALESCE(EXCLUDED.parent_contact, student_details.parent_contact),
      parent_phone = COALESCE(EXCLUDED.parent_phone, student_details.parent_phone),
      fee_payer = COALESCE(EXCLUDED.fee_payer, student_details.fee_payer);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
