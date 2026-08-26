-- Raah demo/test institution seed data.
-- Idempotent: safe to re-run. All records are clearly marked as demo data.
--
-- Usage:
--   supabase db reset            -- applies migrations + this seed
--   or paste into the Supabase SQL editor.

do $$
declare
  demo_inst_id uuid;
  demo_dept_cs uuid;
  demo_dept_ce uuid;
  demo_fac_1 uuid;
  demo_fac_2 uuid;
begin
  -- Institution
  insert into public.institutions (
    slug, name, type, institution_code,
    official_email, official_domain, website,
    state, district, city, address, description,
    verification_status, verified_at
  ) values (
    'raah-demo-institute',
    'Raah Demo Institute',
    'engineering_college',
    'DEMO-001',
    'contact@raahdemo.ac.in',
    'raahdemo.ac.in',
    'https://raahdemo.ac.in',
    'Jharkhand',
    'Ranchi',
    'Ranchi',
    'Demo Campus, Ranchi, Jharkhand',
    'DEMO / TEST DATA. Raah Demo Institute is a fictional engineering college used only for development and testing of the Raah platform. It is not a real institution.',
    'verified',
    now()
  )
  on conflict (slug) do update set
    description = excluded.description,
    verification_status = excluded.verification_status,
    verified_at = excluded.verified_at
  returning id into demo_inst_id;

  -- Departments
  insert into public.departments (institution_id, name)
  values
    (demo_inst_id, 'Computer Science and Engineering'),
    (demo_inst_id, 'Civil Engineering'),
    (demo_inst_id, 'Mechanical Engineering'),
    (demo_inst_id, 'Agricultural Engineering')
  on conflict do nothing;

  select id into demo_dept_cs from public.departments
    where institution_id = demo_inst_id and name = 'Computer Science and Engineering' limit 1;
  select id into demo_dept_ce from public.departments
    where institution_id = demo_inst_id and name = 'Civil Engineering' limit 1;

  -- Research areas
  insert into public.institution_research_areas (institution_id, area)
  values
    (demo_inst_id, 'Artificial Intelligence'),
    (demo_inst_id, 'Water Resources'),
    (demo_inst_id, 'IoT'),
    (demo_inst_id, 'Renewable Energy'),
    (demo_inst_id, 'Environmental Engineering')
  on conflict do nothing;

  -- Capabilities
  insert into public.institution_capabilities (institution_id, capability)
  values
    (demo_inst_id, 'Prototyping'),
    (demo_inst_id, 'Testing'),
    (demo_inst_id, 'Industry collaboration'),
    (demo_inst_id, 'Technology transfer')
  on conflict do nothing;

  -- Facilities (with typed discriminator)
  insert into public.institution_facilities (institution_id, name, description, facility_type)
  values
    (demo_inst_id, 'AI/ML Laboratory', 'GPU workstations for research', 'laboratory'),
    (demo_inst_id, 'IoT Laboratory', 'Sensor networks and edge devices', 'laboratory'),
    (demo_inst_id, 'Fabrication Laboratory', '3D printing and CNC', 'laboratory'),
    (demo_inst_id, 'Ranchi Innovation Centre', 'Startup mentoring space', 'innovation_centre'),
    (demo_inst_id, 'Jharkhand Incubation Cell', 'Early-stage startup incubation', 'incubation_centre')
  on conflict do nothing;

  -- Faculty
  insert into public.faculty (institution_id, full_name, designation, department, official_email, expertise)
  values
    (demo_inst_id, 'Dr. Demo Faculty One', 'Professor', 'Computer Science and Engineering', 'faculty1@raahdemo.ac.in', array['Artificial Intelligence', 'Machine Learning']),
    (demo_inst_id, 'Dr. Demo Faculty Two', 'Associate Professor', 'Civil Engineering', 'faculty2@raahdemo.ac.in', array['Water Resources', 'Environmental Engineering'])
  on conflict (institution_id, lower(official_email)) do nothing;

  select id into demo_fac_1 from public.faculty
    where institution_id = demo_inst_id and official_email = 'faculty1@raahdemo.ac.in' limit 1;
  select id into demo_fac_2 from public.faculty
    where institution_id = demo_inst_id and official_email = 'faculty2@raahdemo.ac.in' limit 1;

  -- Faculty verification: one verified, one pending — for a partial signal
  insert into public.faculty_verifications (faculty_id, status, method, verified_at)
  values (demo_fac_1, 'verified', 'email_domain', now())
  on conflict do nothing;

  insert into public.faculty_verifications (faculty_id, status, method)
  values (demo_fac_2, 'pending', 'email_domain')
  on conflict do nothing;

  -- Verification history record
  insert into public.institution_verifications (
    institution_id, submitted_at, reviewed_at, decision, notes
  ) values (
    demo_inst_id, now() - interval '1 day', now(), 'verified', 'Demo institution — auto-approved by seed.'
  );

end $$;
