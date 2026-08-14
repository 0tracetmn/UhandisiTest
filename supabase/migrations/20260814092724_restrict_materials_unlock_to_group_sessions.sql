CREATE OR REPLACE FUNCTION public.current_user_approved_subjects()
RETURNS TABLE(subject text)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT DISTINCT gs.subject
    FROM group_session_participants gsp
    JOIN group_sessions gs ON gs.id = gsp.group_session_id
   WHERE gsp.student_id = auth.uid()
     AND gs.status IN ('approved','scheduled','completed');
$$;
