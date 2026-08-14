/*
  # Allow group bookings without a preferred date

  1. Purpose
    - Group sessions are matched by subject only. The admin picks dates later,
      once enough students have joined. The app inserts NULL for preferred_date
      into three tables when a student joins a group, but those columns are
      still NOT NULL, causing the insert to fail.

  2. Changes
    - Drop NOT NULL on preferred_date for:
        - public.bookings
        - public.booking_groups
        - public.group_sessions
    - preferred_time is already nullable on all three; no change needed.

  3. Safety
    - No data is lost: existing rows keep their values.
    - One-on-one bookings still validate the date client-side, so this only
      relaxes the constraint for the group-booking flow.
*/

ALTER TABLE public.bookings ALTER COLUMN preferred_date DROP NOT NULL;
ALTER TABLE public.booking_groups ALTER COLUMN preferred_date DROP NOT NULL;
ALTER TABLE public.group_sessions ALTER COLUMN preferred_date DROP NOT NULL;
