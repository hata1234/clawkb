-- ACL Migration: seed built-in roles + permissions, migrate legacy data

-- Create built-in roles
INSERT INTO roles (name, description, "builtIn", "createdAt", "updatedAt") VALUES
  ('Admin', 'Full access', true, now(), now()),
  ('Editor', 'Can read, create, and edit', true, now(), now()),
  ('Viewer', 'Read only', true, now(), now())
ON CONFLICT (name) DO NOTHING;

-- Seed permissions for Admin role
INSERT INTO permissions ("roleId", action, scope)
SELECT r.id, unnest(ARRAY['read','create','edit','delete','manage_settings','manage_users']), 'global'
FROM roles r WHERE r.name = 'Admin'
ON CONFLICT ("roleId", action, scope, "scopeId") DO NOTHING;

-- Seed permissions for Editor role
INSERT INTO permissions ("roleId", action, scope)
SELECT r.id, unnest(ARRAY['read','create','edit']), 'global'
FROM roles r WHERE r.name = 'Editor'
ON CONFLICT ("roleId", action, scope, "scopeId") DO NOTHING;

-- Seed permissions for Viewer role
INSERT INTO permissions ("roleId", action, scope)
SELECT r.id, 'read', 'global'
FROM roles r WHERE r.name = 'Viewer'
ON CONFLICT ("roleId", action, scope, "scopeId") DO NOTHING;

-- Migrate User.role string to roleId
UPDATE users SET "roleId" = (SELECT id FROM roles WHERE name = 'Admin') WHERE role = 'admin' AND "roleId" IS NULL;
UPDATE users SET "roleId" = (SELECT id FROM roles WHERE name = 'Editor') WHERE role = 'editor' AND "roleId" IS NULL;
UPDATE users SET "roleId" = (SELECT id FROM roles WHERE name = 'Viewer') WHERE role = 'viewer' AND "roleId" IS NULL;

-- Migrate groups if they have a legacy role column
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'groups' AND column_name = 'role') THEN
    UPDATE groups SET "roleId" = (SELECT id FROM roles WHERE name = 'Admin') WHERE role = 'admin' AND "roleId" IS NULL;
    UPDATE groups SET "roleId" = (SELECT id FROM roles WHERE name = 'Editor') WHERE role = 'editor' AND "roleId" IS NULL;
    UPDATE groups SET "roleId" = (SELECT id FROM roles WHERE name = 'Viewer') WHERE role = 'viewer' AND "roleId" IS NULL;
  END IF;
END $$;
