-- Add expertise field to faculty for research areas / specialization
alter table faculty add column if not exists expertise text[];

-- Add innovation capabilities to institution_facilities
-- Reusing the existing facilities table with a type discriminator
alter table institution_facilities add column if not exists facility_type text not null default 'facility';

-- facility_type values: 'facility', 'laboratory', 'research_centre', 'incubation_centre', 'innovation_centre'
-- This avoids creating a separate table for a concept that is structurally identical to facilities.

comment on column institution_facilities.facility_type is
  'Discriminator: facility, laboratory, research_centre, incubation_centre, innovation_centre';

comment on column faculty.expertise is
  'Array of research areas / specializations for this faculty member';
