-- Admin Operations as its own gated space, per request: (1) governed
-- by the same role-based permission system as the rest of the
-- platform, (2) a single switch to disable the whole thing, (3) kept
-- structurally separate from Vertex HRM's own nav/dashboard — see the
-- new app/(ops)/ route group and its own layout/sidebar.
--
-- Two-level access model:
--   - `modules.admin_ops` — one global on/off switch (Configuration
--     §5.5 already has this pattern for Admin/PIM/Leave/etc.)
--   - `role_permissions` module='admin_ops' — per-role "can this role
--     enter the Admin Ops space at all." The individual submodule keys
--     (documents, requests, procurement, it_support, assets,
--     inventory, expenses, budgets, calendar, communication, reports)
--     were already seeded back in migration 0003 — this is the
--     missing "front door" permission above them, not a duplicate of
--     what's already fine-grained per submodule.

insert into modules (key, name, enabled) values ('admin_ops', 'Admin Operations', true);

insert into role_permissions (role_id, module, can_view, can_add, can_edit, can_delete, can_approve)
select r.id, 'admin_ops',
  true,                                    -- can_view: every role gets in the door by default;
                                            -- what they see inside is still governed by each
                                            -- submodule's own already-seeded permission.
  (r.name = 'System Administrator'),
  (r.name = 'System Administrator'),
  (r.name = 'System Administrator'),
  (r.name = 'System Administrator')
from roles r;
