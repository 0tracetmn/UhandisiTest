/*
  # Add Meeting Links and Notifications System

  ## Changes
  
  1. Add Meeting Link Columns
    - Add `meeting_link` to `bookings` table for individual sessions
    - Add `meeting_link` to `group_sessions` table for group sessions
  
  2. Create Notifications Table
    - `id` (uuid, primary key)
    - `user_id` (uuid, references profiles)
    - `type` (text) - notification type (e.g., 'meeting_link')
    - `title` (text) - notification title
    - `message` (text) - notification message
    - `related_id` (uuid) - related booking or group session ID
    - `related_type` (text) - 'booking' or 'group_session'
    - `is_read` (boolean) - whether notification has been read
    - `created_at` (timestamptz)
  
  3. Security
    - Enable RLS on notifications table
    - Add policies for users to view and update their own notifications
    - Add policy for admins to create notifications
*/

-- Add meeting_link column to bookings table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'meeting_link'
  ) THEN
    ALTER TABLE bookings ADD COLUMN meeting_link text;
  END IF;
END $$;

-- Add meeting_link column to group_sessions table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'group_sessions' AND column_name = 'meeting_link'
  ) THEN
    ALTER TABLE group_sessions ADD COLUMN meeting_link text;
  END IF;
END $$;

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'general',
  title text NOT NULL,
  message text NOT NULL,
  related_id uuid,
  related_type text,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own notifications
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Admins and tutors can create notifications
CREATE POLICY "Admins and tutors can create notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'tutor')
    )
  );

-- Policy: Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- Function to notify students when meeting link is added to booking
CREATE OR REPLACE FUNCTION notify_students_meeting_link()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if meeting_link was just added (changed from NULL to a value)
  IF (TG_OP = 'UPDATE' AND OLD.meeting_link IS NULL AND NEW.meeting_link IS NOT NULL) THEN
    -- Insert notification for the student
    INSERT INTO notifications (user_id, type, title, message, related_id, related_type)
    VALUES (
      NEW.student_id,
      'meeting_link',
      'Meeting Link Available',
      'A meeting link has been added to your session. Click to view details.',
      NEW.id,
      'booking'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to notify students when meeting link is added to group session
CREATE OR REPLACE FUNCTION notify_group_students_meeting_link()
RETURNS TRIGGER AS $$
DECLARE
  booking_record RECORD;
BEGIN
  -- Only proceed if meeting_link was just added (changed from NULL to a value)
  IF (TG_OP = 'UPDATE' AND OLD.meeting_link IS NULL AND NEW.meeting_link IS NOT NULL) THEN
    -- Find all students in this group session via booking_groups
    FOR booking_record IN
      SELECT DISTINCT b.student_id
      FROM bookings b
      INNER JOIN booking_groups bg ON b.group_id = bg.id
      WHERE bg.group_session_id = NEW.id
    LOOP
      -- Insert notification for each student
      INSERT INTO notifications (user_id, type, title, message, related_id, related_type)
      VALUES (
        booking_record.student_id,
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

-- Create triggers
DROP TRIGGER IF EXISTS trigger_notify_booking_meeting_link ON bookings;
CREATE TRIGGER trigger_notify_booking_meeting_link
  AFTER UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION notify_students_meeting_link();

DROP TRIGGER IF EXISTS trigger_notify_group_session_meeting_link ON group_sessions;
CREATE TRIGGER trigger_notify_group_session_meeting_link
  AFTER UPDATE ON group_sessions
  FOR EACH ROW
  EXECUTE FUNCTION notify_group_students_meeting_link();