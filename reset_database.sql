/*
  # Database Reset Script

  ## Purpose
  Resets the Uhandisi Tutors database to a clean state, removing all user-generated
  data while preserving essential configuration data.

  ## Data PRESERVED:
  - pricing_rates (session pricing configuration)
  - service_categories (tutoring categories)
  - tutoring_services (available tutoring services)

  ## Data DELETED:
  - All user accounts and profiles
  - All bookings and group sessions
  - All chat messages and conversations
  - All announcements
  - All materials and meetings
  - All payments and invoices
  - All notifications
  - All tutor-service assignments
  - All availability schedules

  ## WARNING
  This script will permanently delete all user data. Use with caution!

  ## Usage
  Run this script manually when you need to reset the database to initial state.
*/

-- Start transaction
BEGIN;

-- =============================================================================
-- STEP 1: Delete all user-related data
-- =============================================================================

-- Delete notifications
DELETE FROM notifications;

-- Delete announcement reads
DELETE FROM announcement_reads;

-- Delete announcements
DELETE FROM announcements;

-- Delete chat messages
DELETE FROM chat_messages;

-- Delete chat participants
DELETE FROM chat_participants;

-- Delete chat conversations
DELETE FROM chat_conversations;

-- Delete materials
DELETE FROM materials;

-- Delete meetings
DELETE FROM meetings;

-- =============================================================================
-- STEP 2: Delete booking and session related data
-- =============================================================================

-- Delete booking subjects
DELETE FROM booking_subjects;

-- Delete booking tutors
DELETE FROM booking_tutors;

-- Delete payments
DELETE FROM payments;

-- Delete invoices
DELETE FROM invoices;

-- Delete bookings (this will also clear related group session references)
DELETE FROM bookings;

-- Delete booking groups
DELETE FROM booking_groups;

-- Delete group session tutors
DELETE FROM group_session_tutors;

-- Delete group session participants
DELETE FROM group_session_participants;

-- Delete group sessions
DELETE FROM group_sessions;

-- =============================================================================
-- STEP 3: Delete tutor-service assignments
-- =============================================================================

-- Delete service tutor assignments
DELETE FROM service_tutors;

-- =============================================================================
-- STEP 4: Delete tutor availability and qualifications
-- =============================================================================

-- Delete tutor availability schedules
DELETE FROM tutor_availability;

-- Delete tutor qualifications
DELETE FROM tutor_qualifications;

-- =============================================================================
-- STEP 5: Delete user details and profiles
-- =============================================================================

-- Delete student details
DELETE FROM student_details;

-- Delete tutor details
DELETE FROM tutor_details;

-- Delete all profiles (and cascade to auth.users)
-- Note: This will also delete the user from Supabase Auth
DELETE FROM profiles;

-- =============================================================================
-- STEP 6: Reset any sequences or counters if needed
-- =============================================================================

-- Reset booking groups counter (if using sequences)
-- ALTER SEQUENCE IF EXISTS booking_groups_id_seq RESTART WITH 1;

-- =============================================================================
-- VERIFICATION: Check remaining data
-- =============================================================================

-- You can uncomment these lines to verify what's left after deletion:
-- SELECT 'profiles' as table_name, COUNT(*) as remaining_records FROM profiles
-- UNION ALL
-- SELECT 'pricing_rates', COUNT(*) FROM pricing_rates
-- UNION ALL
-- SELECT 'service_categories', COUNT(*) FROM service_categories
-- UNION ALL
-- SELECT 'tutoring_services', COUNT(*) FROM tutoring_services
-- UNION ALL
-- SELECT 'bookings', COUNT(*) FROM bookings
-- UNION ALL
-- SELECT 'announcements', COUNT(*) FROM announcements
-- UNION ALL
-- SELECT 'materials', COUNT(*) FROM materials
-- UNION ALL
-- SELECT 'chat_messages', COUNT(*) FROM chat_messages;

-- =============================================================================
-- COMMIT or ROLLBACK
-- =============================================================================

-- If everything looks good, commit the changes:
COMMIT;

-- If you want to undo, use ROLLBACK instead:
-- ROLLBACK;

/*
  ## Post-Reset State

  After running this script, your database will contain:
  ✓ pricing_rates (2 records: online and face-to-face pricing)
  ✓ service_categories (2 records: High School and University)
  ✓ tutoring_services (7 records: various subjects)

  All other tables will be empty, ready for new users and data.
*/
