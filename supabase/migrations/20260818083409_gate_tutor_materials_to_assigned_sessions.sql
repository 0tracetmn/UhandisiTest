CREATE OR REPLACE FUNCTION public.current_tutor_assigned_subjects()
RETURNS TABLE(subject text)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT DISTINCT gs.subject
    FROM group_sessions gs
   WHERE gs.tutor_id = auth.uid()
     AND gs.status IN ('approved','scheduled','completed')
     AND gs.subject IS NOT NULL
  UNION
  SELECT DISTINCT gs.subject
    FROM group_session_tutors gst
    JOIN group_sessions gs ON gs.id = gst.group_session_id
   WHERE gst.tutor_id = auth.uid()
     AND gs.status IN ('approved','scheduled','completed')
     AND gs.subject IS NOT NULL
  UNION
  SELECT DISTINCT b.subject
    FROM bookings b
   WHERE b.tutor_id = auth.uid()
     AND b.status IN ('approved','assigned','confirmed','scheduled','completed')
     AND b.subject IS NOT NULL
  UNION
  SELECT DISTINCT b.subject
    FROM booking_tutors bt
    JOIN bookings b ON b.id = bt.booking_id
   WHERE bt.tutor_id = auth.uid()
     AND b.status IN ('approved','assigned','confirmed','scheduled','completed')
     AND b.subject IS NOT NULL
  UNION
  SELECT DISTINCT ts.name
    FROM booking_subjects bs
    JOIN bookings b ON b.id = bs.booking_id
    JOIN tutoring_services ts ON ts.id = bs.service_id
   WHERE b.status IN ('approved','assigned','confirmed','scheduled','completed')
     AND (
       b.tutor_id = auth.uid()
       OR EXISTS (SELECT 1 FROM booking_tutors bt2 WHERE bt2.booking_id = b.id AND bt2.tutor_id = auth.uid())
     );
$$;

GRANT EXECUTE ON FUNCTION public.current_tutor_assigned_subjects() TO authenticated;

DROP POLICY IF EXISTS "Admins and tutors view all materials" ON public.materials;
DROP POLICY IF EXISTS "Admins view all materials" ON public.materials;
DROP POLICY IF EXISTS "Tutors view materials for assigned subjects" ON public.materials;

CREATE POLICY "Admins view all materials" ON public.materials
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
       WHERE profiles.id = auth.uid()
         AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Tutors view materials for assigned subjects" ON public.materials
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
       WHERE profiles.id = auth.uid()
         AND profiles.role = 'tutor'
    )
    AND (
      uploaded_by = auth.uid()
      OR (
        subject IS NOT NULL
        AND subject IN (SELECT s.subject FROM public.current_tutor_assigned_subjects() s)
      )
    )
  );
