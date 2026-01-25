/*
  # Add Class Type and Group Session Support to Bookings

  1. Changes to `bookings` table
    - Add `class_type` column (text) - Either 'one-on-one' or 'group'
    - Add `group_id` column (uuid) - Links group session bookings together
    - Add `max_group_size` column (integer) - Maximum students per group (default 5)
    - Add `current_group_size` column (integer) - Current number of students in group
  
  2. New Table: `booking_groups`
    - Tracks group session information
    - Links multiple bookings together
    - Stores group metadata
  
  3. Security
    - Update RLS policies to handle group bookings
    - Ensure students can see other students in their group
  
  4. Notes
    - Class type determines if the booking is individual or group
    - Group bookings with same subject, date, time, and session_type are linked
    - One tutor can be assigned to the entire group
*/

-- Add class_type column to bookings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'class_type'
  ) THEN
    ALTER TABLE bookings ADD COLUMN class_type text DEFAULT 'one-on-one' CHECK (class_type IN ('one-on-one', 'group'));
  END IF;
END $$;

-- Add group_id column to bookings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'group_id'
  ) THEN
    ALTER TABLE bookings ADD COLUMN group_id uuid;
  END IF;
END $$;

-- Create booking_groups table if it doesn't exist
CREATE TABLE IF NOT EXISTS booking_groups (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject text NOT NULL,
  session_type text NOT NULL CHECK (session_type IN ('online', 'face-to-face')),
  delivery_mode text NOT NULL,
  preferred_date date NOT NULL,
  preferred_time text NOT NULL,
  tutor_id uuid REFERENCES profiles(id),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'assigned', 'completed', 'cancelled')),
  max_group_size integer DEFAULT 5,
  current_group_size integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on booking_groups
ALTER TABLE booking_groups ENABLE ROW LEVEL SECURITY;

-- Policies for booking_groups
CREATE POLICY "View booking groups"
  ON booking_groups FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings 
      WHERE bookings.group_id = booking_groups.id 
      AND (bookings.student_id = auth.uid() OR bookings.tutor_id = auth.uid())
    ) OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admin can manage booking groups"
  ON booking_groups FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Add foreign key constraint for group_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'bookings_group_id_fkey'
  ) THEN
    ALTER TABLE bookings 
    ADD CONSTRAINT bookings_group_id_fkey 
    FOREIGN KEY (group_id) REFERENCES booking_groups(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Function to auto-assign students to group sessions
CREATE OR REPLACE FUNCTION assign_to_group_session()
RETURNS TRIGGER AS $$
DECLARE
  v_group_id uuid;
  v_current_size integer;
BEGIN
  -- Only process if this is a group booking
  IF NEW.class_type = 'group' THEN
    -- Look for an existing group with same subject, date, time, session_type, and delivery_mode
    -- that is not full and has status 'pending' or 'approved'
    SELECT bg.id, bg.current_group_size INTO v_group_id, v_current_size
    FROM booking_groups bg
    WHERE bg.subject = NEW.subject
      AND bg.session_type = NEW.session_type
      AND bg.preferred_date = NEW.preferred_date
      AND bg.preferred_time = NEW.preferred_time
      AND bg.delivery_mode = COALESCE(NEW.delivery_mode, NEW.session_type)
      AND bg.status IN ('pending', 'approved')
      AND bg.current_group_size < bg.max_group_size
    ORDER BY bg.created_at ASC
    LIMIT 1;

    -- If no suitable group found, create a new one
    IF v_group_id IS NULL THEN
      INSERT INTO booking_groups (
        subject,
        session_type,
        delivery_mode,
        preferred_date,
        preferred_time,
        status,
        current_group_size
      )
      VALUES (
        NEW.subject,
        NEW.session_type,
        COALESCE(NEW.delivery_mode, NEW.session_type),
        NEW.preferred_date,
        NEW.preferred_time,
        'pending',
        1
      )
      RETURNING id INTO v_group_id;
    ELSE
      -- Update the group size
      UPDATE booking_groups
      SET current_group_size = current_group_size + 1,
          updated_at = now()
      WHERE id = v_group_id;
    END IF;

    -- Assign the booking to the group
    NEW.group_id := v_group_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-assignment
DROP TRIGGER IF EXISTS trigger_assign_to_group_session ON bookings;
CREATE TRIGGER trigger_assign_to_group_session
  BEFORE INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION assign_to_group_session();

-- Add delivery_mode column to bookings if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'delivery_mode'
  ) THEN
    ALTER TABLE bookings ADD COLUMN delivery_mode text;
  END IF;
END $$;