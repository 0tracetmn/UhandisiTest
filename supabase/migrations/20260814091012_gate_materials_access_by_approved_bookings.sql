CREATE OR REPLACE FUNCTION public.current_user_grade()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT grade FROM student_details WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_user_approved_subjects()
RETURNS TABLE(subject text)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT DISTINCT b.subject
    FROM bookings b
   WHERE b.student_id = auth.uid()
     AND b.status IN ('approved','assigned','confirmed','scheduled','completed')
     AND b.subject IS NOT NULL
  UNION
  SELECT DISTINCT ts.name
    FROM booking_subjects bs
    JOIN bookings b ON b.id = bs.booking_id
    JOIN tutoring_services ts ON ts.id = bs.service_id
   WHERE b.student_id = auth.uid()
     AND b.status IN ('approved','assigned','confirmed','scheduled','completed')
  UNION
  SELECT DISTINCT gs.subject
    FROM group_session_participants gsp
    JOIN group_sessions gs ON gs.id = gsp.group_session_id
   WHERE gsp.student_id = auth.uid()
     AND gs.status IN ('approved','scheduled','completed');
$$;

CREATE OR REPLACE FUNCTION public.normalize_grade(g text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  m text[];
BEGIN
  IF g IS NULL THEN
    RETURN '';
  END IF;
  m := regexp_matches(lower(g), '\d+');
  IF m IS NULL THEN
    RETURN lower(g);
  END IF;
  RETURN m[1];
END;
$$;

GRANT EXECUTE ON FUNCTION public.current_user_grade() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_approved_subjects() TO authenticated;
GRANT EXECUTE ON FUNCTION public.normalize_grade(text) TO authenticated, anon;

DROP POLICY IF EXISTS "View materials" ON public.materials;
DROP POLICY IF EXISTS "Admins and tutors view all materials" ON public.materials;
DROP POLICY IF EXISTS "Students view materials for approved subjects" ON public.materials;

CREATE POLICY "Admins and tutors view all materials" ON public.materials
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
       WHERE profiles.id = auth.uid()
         AND profiles.role IN ('admin','tutor')
    )
  );

CREATE POLICY "Students view materials for approved subjects" ON public.materials
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
       WHERE profiles.id = auth.uid()
         AND profiles.role = 'student'
    )
    AND subject IS NOT NULL
    AND subject IN (SELECT s.subject FROM public.current_user_approved_subjects() s)
    AND (
      grade IS NULL
      OR public.normalize_grade(grade) = public.normalize_grade(public.current_user_grade())
    )
  );

DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view materials" ON storage.objects;
DROP POLICY IF EXISTS "View materials bucket objects" ON storage.objects;

CREATE POLICY "View materials bucket objects" ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'materials'
    AND (
      (storage.foldername(name))[1] = 'qualifications'
      OR EXISTS (
        SELECT 1 FROM public.materials m
         WHERE m.file_url = storage.objects.name
      )
    )
  );
