/*
  # Add Grade-Based Announcement Targeting and Read Tracking

  1. Changes to `announcements` table
    - Add `target_grades` column (text[]) - Array of target grades for the announcement
      - Empty array or null means announcement is for all students
      - Can contain values like: 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12', 'NQF 5', 'NQF 6', 'NQF 7'

  2. New Table: `announcement_reads`
    - Tracks which students have read which announcements
    - Columns:
      - `id` (uuid, primary key)
      - `announcement_id` (uuid, foreign key to announcements)
      - `user_id` (uuid, foreign key to profiles)
      - `read_at` (timestamptz) - When the announcement was read
    - Unique constraint on (announcement_id, user_id) to prevent duplicate reads

  3. Security
    - Enable RLS on `announcement_reads` table
    - Students can insert their own read records
    - Students can view their own read records
    - Admins can view all read records

  4. Indexes
    - Index on announcement_id for faster lookups
    - Index on user_id for faster user-specific queries
*/

-- Add target_grades column to announcements table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'announcements' AND column_name = 'target_grades'
  ) THEN
    ALTER TABLE announcements ADD COLUMN target_grades text[] DEFAULT '{}';
  END IF;
END $$;

-- Create announcement_reads table
CREATE TABLE IF NOT EXISTS announcement_reads (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  announcement_id uuid NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  read_at timestamptz DEFAULT now(),
  UNIQUE(announcement_id, user_id)
);

-- Enable RLS
ALTER TABLE announcement_reads ENABLE ROW LEVEL SECURITY;

-- RLS Policies for announcement_reads

-- Students can insert their own read records
CREATE POLICY "Students can mark announcements as read"
  ON announcement_reads FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Students can view their own read records
CREATE POLICY "Students can view own read records"
  ON announcement_reads FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can view all read records
CREATE POLICY "Admins can view all read records"
  ON announcement_reads FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_announcement_reads_announcement_id 
  ON announcement_reads(announcement_id);

CREATE INDEX IF NOT EXISTS idx_announcement_reads_user_id 
  ON announcement_reads(user_id);