/*
  # Seed initial tutoring services

  1. Data Seeded
    - Two service categories:
      - High School Tutoring (Grade 10–12)
      - University Tutoring (Levels 1–3)
    
    - High School services:
      - Mathematics
      - Physical Sciences
      - Computer Applications Technology (CAT) & IT Modules
      - English and Life Orientation support
    
    - University services:
      - Information Technology modules (Programming, Databases, Networking)
      - Study support for NQF Level 5–7 IT qualifications
      - Academic writing, research guidance, and exam preparation

  2. Important Notes
    - All services are available both online and in-person by default
    - All services are set as active
    - Display order is set for proper ordering in UI
*/

-- Insert service categories
INSERT INTO service_categories (id, name, description, display_order)
VALUES 
  ('a1b2c3d4-e5f6-4a5b-8c9d-1e2f3a4b5c6d', 'High School Tutoring (Grade 10–12)', 'Comprehensive tutoring support for high school students in Grades 10 to 12', 1),
  ('b2c3d4e5-f6a7-4b5c-9d1e-2f3a4b5c6d7e', 'University Tutoring (Levels 1–3)', 'Advanced tutoring for university students pursuing IT qualifications at NQF Levels 5–7', 2)
ON CONFLICT DO NOTHING;

-- Insert High School services
INSERT INTO tutoring_services (category_id, name, description, online_available, in_person_available, display_order, is_active)
VALUES 
  (
    'a1b2c3d4-e5f6-4a5b-8c9d-1e2f3a4b5c6d',
    'Mathematics',
    'Advanced mathematics tutoring covering algebra, calculus, geometry, and more',
    true,
    true,
    1,
    true
  ),
  (
    'a1b2c3d4-e5f6-4a5b-8c9d-1e2f3a4b5c6d',
    'Physical Sciences',
    'Physics and Chemistry tutoring for high school students',
    true,
    true,
    2,
    true
  ),
  (
    'a1b2c3d4-e5f6-4a5b-8c9d-1e2f3a4b5c6d',
    'Computer Applications Technology (CAT) & IT Modules',
    'CAT and basic IT skills training for high school curriculum',
    true,
    true,
    3,
    true
  ),
  (
    'a1b2c3d4-e5f6-4a5b-8c9d-1e2f3a4b5c6d',
    'English and Life Orientation',
    'Language arts, essay writing, and life skills support',
    true,
    true,
    4,
    true
  )
ON CONFLICT DO NOTHING;

-- Insert University services
INSERT INTO tutoring_services (category_id, name, description, online_available, in_person_available, display_order, is_active)
VALUES 
  (
    'b2c3d4e5-f6a7-4b5c-9d1e-2f3a4b5c6d7e',
    'Information Technology Modules',
    'Programming, Databases, Networking, and other IT modules',
    true,
    true,
    1,
    true
  ),
  (
    'b2c3d4e5-f6a7-4b5c-9d1e-2f3a4b5c6d7e',
    'NQF Level 5–7 IT Qualifications',
    'Study support for advanced IT qualifications',
    true,
    true,
    2,
    true
  ),
  (
    'b2c3d4e5-f6a7-4b5c-9d1e-2f3a4b5c6d7e',
    'Academic Writing & Research',
    'Academic writing, research guidance, and exam preparation',
    true,
    true,
    3,
    true
  )
ON CONFLICT DO NOTHING;