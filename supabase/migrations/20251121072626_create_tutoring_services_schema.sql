/*
  # Create tutoring services schema

  1. New Tables
    - `service_categories`
      - `id` (uuid, primary key)
      - `name` (text) - e.g., "High School Tutoring", "University Tutoring"
      - `description` (text)
      - `display_order` (integer) - for sorting
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `tutoring_services`
      - `id` (uuid, primary key)
      - `category_id` (uuid, foreign key to service_categories)
      - `name` (text) - e.g., "Mathematics", "Programming"
      - `description` (text)
      - `online_available` (boolean) - whether service is available online
      - `in_person_available` (boolean) - whether service is available in-person
      - `hourly_rate` (numeric) - optional pricing
      - `display_order` (integer) - for sorting within category
      - `is_active` (boolean) - whether service is currently offered
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `service_tutors`
      - `id` (uuid, primary key)
      - `service_id` (uuid, foreign key to tutoring_services)
      - `tutor_id` (uuid, foreign key to profiles)
      - `assigned_at` (timestamptz)
      - Unique constraint on (service_id, tutor_id)

  2. Security
    - Enable RLS on all tables
    - Admins can perform all operations
    - Tutors and students can view active services
    - Tutors can view their assigned services

  3. Important Notes
    - Services can be offered online, in-person, or both
    - Multiple tutors can be assigned to the same service
    - Services can be deactivated without deletion (soft delete)
*/

-- Create service_categories table
CREATE TABLE IF NOT EXISTS service_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create tutoring_services table
CREATE TABLE IF NOT EXISTS tutoring_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES service_categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  online_available boolean DEFAULT true,
  in_person_available boolean DEFAULT true,
  hourly_rate numeric(10,2),
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create service_tutors junction table
CREATE TABLE IF NOT EXISTS service_tutors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES tutoring_services(id) ON DELETE CASCADE,
  tutor_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_at timestamptz DEFAULT now(),
  UNIQUE(service_id, tutor_id)
);

-- Enable RLS
ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tutoring_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_tutors ENABLE ROW LEVEL SECURITY;

-- RLS Policies for service_categories
CREATE POLICY "Anyone can view service categories"
  ON service_categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage service categories"
  ON service_categories FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- RLS Policies for tutoring_services
CREATE POLICY "Anyone can view active services"
  ON tutoring_services FOR SELECT
  TO authenticated
  USING (is_active = true OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can manage services"
  ON tutoring_services FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- RLS Policies for service_tutors
CREATE POLICY "Anyone can view service tutor assignments"
  ON service_tutors FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage service tutor assignments"
  ON service_tutors FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_tutoring_services_category_id ON tutoring_services(category_id);
CREATE INDEX IF NOT EXISTS idx_tutoring_services_is_active ON tutoring_services(is_active);
CREATE INDEX IF NOT EXISTS idx_service_tutors_service_id ON service_tutors(service_id);
CREATE INDEX IF NOT EXISTS idx_service_tutors_tutor_id ON service_tutors(tutor_id);