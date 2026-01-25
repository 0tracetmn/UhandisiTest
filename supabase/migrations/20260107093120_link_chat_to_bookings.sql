/*
  # Link Chat Conversations to Bookings and Group Sessions

  1. Changes
    - Add `booking_id` column to `chat_conversations` for one-on-one bookings
    - Add `group_session_id` column to `chat_conversations` for group sessions
    - Add indexes for better query performance

  2. Security
    - Update policies to allow conversation creation for approved/assigned bookings
    - Add policy for tutors to create conversations for their assigned bookings
    - Ensure students and tutors can only access conversations for their bookings

  3. Notes
    - A conversation can be linked to either a booking (one-on-one) or a group session
    - Chat is only available when a booking is approved/assigned and has a tutor
*/

-- Add booking_id and group_session_id to chat_conversations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_conversations' AND column_name = 'booking_id'
  ) THEN
    ALTER TABLE chat_conversations ADD COLUMN booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_conversations' AND column_name = 'group_session_id'
  ) THEN
    ALTER TABLE chat_conversations ADD COLUMN group_session_id uuid REFERENCES group_sessions(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chat_conversations_booking ON chat_conversations(booking_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_group_session ON chat_conversations(group_session_id);

-- Add policy for students and tutors to create conversations for approved bookings
CREATE POLICY "Create conversation for approved bookings"
  ON chat_conversations FOR INSERT
  TO authenticated
  WITH CHECK (
    -- For one-on-one bookings
    (
      booking_id IS NOT NULL AND
      group_session_id IS NULL AND
      EXISTS (
        SELECT 1 FROM bookings
        WHERE bookings.id = booking_id
        AND bookings.status IN ('approved', 'assigned', 'completed')
        AND bookings.tutor_id IS NOT NULL
        AND (bookings.student_id = auth.uid() OR bookings.tutor_id = auth.uid())
      )
    )
    OR
    -- For group sessions
    (
      group_session_id IS NOT NULL AND
      booking_id IS NULL AND
      EXISTS (
        SELECT 1 FROM group_sessions
        WHERE group_sessions.id = group_session_id
        AND group_sessions.status IN ('assigned', 'approved', 'completed')
        AND group_sessions.tutor_id IS NOT NULL
        AND (
          -- Tutor assigned to the group session
          group_sessions.tutor_id = auth.uid()
          OR
          -- Student participating in the group session
          EXISTS (
            SELECT 1 FROM group_session_participants
            WHERE group_session_participants.group_session_id = group_sessions.id
            AND group_session_participants.student_id = auth.uid()
          )
        )
      )
    )
  );

-- Add policy to allow creating participant records when creating conversations
CREATE POLICY "Add participants to conversations"
  ON chat_participants FOR INSERT
  TO authenticated
  WITH CHECK (
    -- User can add themselves to a conversation
    user_id = auth.uid()
    OR
    -- User can add others if they're part of an approved booking
    EXISTS (
      SELECT 1 FROM chat_conversations cc
      LEFT JOIN bookings b ON cc.booking_id = b.id
      LEFT JOIN group_sessions gs ON cc.group_session_id = gs.id
      WHERE cc.id = conversation_id
      AND (
        -- For one-on-one: tutor or student can add the other party
        (b.id IS NOT NULL AND (b.student_id = auth.uid() OR b.tutor_id = auth.uid()))
        OR
        -- For group: tutor can add students
        (gs.id IS NOT NULL AND gs.tutor_id = auth.uid())
      )
    )
  );

-- Update conversation when messages are sent
CREATE POLICY "Update conversation timestamp"
  ON chat_conversations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_participants
      WHERE conversation_id = id AND user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_participants
      WHERE conversation_id = id AND user_id = auth.uid()
    )
  );
