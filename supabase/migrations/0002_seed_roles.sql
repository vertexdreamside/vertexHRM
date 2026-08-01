-- Seeds the standard role set from
-- "Vertex Suite — Access Levels & Role Definitions".
-- System Administrator and Employee are marked is_system = true
-- (protected from deletion in application code).

insert into roles (name, description, is_system) values
  ('System Administrator', 'Full access, all modules, both systems.', true),
  ('HR Manager', 'Full access to HRM; view-only elsewhere.', false),
  ('HR Officer', 'Edit access to HRM records; cannot change system config.', false),
  ('Department Manager', 'Approves for their department; views their team''s data.', false),
  ('Supervisor', 'Approves for a smaller team, usually with lower monetary limits.', false),
  ('IT Officer', 'Full access to IT Support & Assets; no HR data.', false),
  ('Procurement Officer', 'Full access to Procurement & Inventory.', false),
  ('Finance Officer', 'Full access to Expenses & Budgets; view-only elsewhere.', false),
  ('Office Administrator', 'Manages Documents, Communication, Calendar, incoming Requests.', false),
  ('Employee', 'Self-service only — own records and submissions.', true),
  ('Auditor', 'View-only across Audit Log and Reports; no edit rights anywhere.', false);
