/*
# Fix group session meeting link notifications

## Problem
Saving a meeting link on a group session failed silently. The trigger
`notify_group_students_meeting_link` looked up participants through the
`booking_groups` table joined on a `group_session_id` column, but that table
has no such column and is empty. The real participants live in
`group_session_participants`. The trigger therefore errored, rolling back
the UPDATE that saved the meeting link.

## Fix
Rewrite `notify_group_students_meeting_link()` to read participants from
`group_session_participants` (which references group_sessions directly).
Keep the same behaviour: only notify the first time a link is added
(meeting_link goes from NULL to a value). Keep SECURITY DEFINER so the
trigger can insert notifications regardless of the caller's role.

## No data changes
No tables or columns are added, removed, or renamed. Only the trigger
function body changes.
*/

CREATE OR REPLACE FUNCTION notify_group_students_meeting_link()
RETURNS TRIGGER AS $$
DECLARE
  participant_record RECORD;
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.meeting_link IS NULL AND NEW.meeting_link IS NOT NULL) THEN
    FOR participant_record IN
      SELECT student_id
      FROM group_session_participants
      WHERE group_session_id = NEW.id
    LOOP
      INSERT INTO notifications (user_id, type, title, message, related_id, related_type)
      VALUES (
        participant_record.student_id,
        'meeting_link',
        'Meeting Link Available',
        'A meeting link has been added to your group session. Click to view details.',
        NEW.id,
        'group_session'
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
