# ClawKB: ACL Permission System + Remove Type (Unify Collections)

## Backup Tag
`pre-acl-refactor` on commit `00875b7`

## Project Location
`/Users/hata1234/clawd/projects/clawkb/app`

## Tech Stack
- Next.js 16.1.6, TypeScript, Prisma, PostgreSQL 17
- Auth: NextAuth v5 (Auth.js), JWT sessions
- PM2 managed, port 3500

## Current Permission System
- Simple 3-role system: `admin`, `editor`, `viewer`
- `User.role` (string) + `RoleGroup.role` (string)
- `effectiveRole = max(directRole, groupRole)` by rank
- Permission checks via functions in `src/lib/auth.ts`:
  - `canCreateEntries`, `canEditEntry`, `canDeleteEntry`, `canCreateComment`, `canManageSettings`, `canManageUsers`
- All hardcoded to role checks

## Part 1: ACL Permission System

### Goal
Replace the simple 3-role system with fine-grained, group-based permissions while keeping backward compatibility.

### New Schema

#### PermissionGroup (replaces RoleGroup concept)
```
model PermissionGroup {
  id          Int      @id @default(autoincrement())
  name        String   @unique    // e.g. "POD Team", "Recon Agents", "Read-Only Guests"
  description String?
  builtIn     Boolean  @default(false)  // true for system groups (admin, editor, viewer)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  permissions Permission[]
  users       UserGroup[]
}
```

#### Permission
```
model Permission {
  id           Int      @id @default(autoincrement())
  groupId      Int
  action       String   // "read" | "create" | "edit" | "delete" | "manage_settings" | "manage_users"
  scope        String   // "global" | "own" | "collection" | "entry"
  scopeId      Int?     // collection ID or entry ID when scope is "collection" or "entry"
  
  group        PermissionGroup @relation(fields: [groupId], references: [id], onDelete: Cascade)
  
  @@unique([groupId, action, scope, scopeId])
  @@map("permissions")
}
```

#### UserGroup (many-to-many: User ↔ PermissionGroup)
```
model UserGroup {
  id       Int @id @default(autoincrement())
  userId   Int
  groupId  Int
  
  user     User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  group    PermissionGroup @relation(fields: [groupId], references: [id], onDelete: Cascade)
  
  @@unique([userId, groupId])
  @@map("user_groups")
}
```

### Permission Resolution Logic
1. Collect all groups the user belongs to
2. Union all permissions across all groups
3. Check: does the union include the required (action, scope, scopeId)?
4. Scope hierarchy: `global` > `collection` > `entry` > `own`
   - If user has `global:read`, they can read everything
   - If user has `collection:read` for collection 5, they can read entries in collection 5
   - `own` scope means user can only act on entries they authored

### Built-in Groups (seeded on first run)
- **Administrators**: all permissions, global scope
- **Editors**: create(global), read(global), edit(own), delete(own)
- **Viewers**: read(global)

### Migration Strategy
1. Create new tables (PermissionGroup, Permission, UserGroup)
2. Seed built-in groups
3. Migrate existing users:
   - `role=admin` → add to Administrators group
   - `role=editor` → add to Editors group
   - `role=viewer` → add to Viewers group
4. Keep `User.role` field as a legacy fallback (don't remove yet)
5. Update `getEffectiveRole` to check new groups first, fallback to old role
6. Update all `can*` functions in `auth.ts` to use new permission system

### API Changes
- `GET /api/groups` — list permission groups
- `POST /api/groups` — create group (admin only)
- `PATCH /api/groups/:id` — update group
- `DELETE /api/groups/:id` — delete group (not built-in)
- `GET /api/groups/:id/permissions` — list group permissions
- `POST /api/groups/:id/permissions` — add permission to group
- `DELETE /api/groups/:id/permissions/:permId` — remove permission
- `POST /api/groups/:id/users` — add user to group
- `DELETE /api/groups/:id/users/:userId` — remove user from group

### Settings UI
- New Settings tab: "Permissions" (admin only)
- Shows all groups with their permissions
- Can create/edit/delete custom groups
- Can assign users to groups
- Built-in groups can be edited (add/remove permissions) but not deleted

## Part 2: Remove Type, Unify with Collections

### Goal
The `Entry.type` field is redundant with Collections. Remove it and make Collections the sole organizational mechanism.

### Changes
1. **Keep `Entry.type` in DB** for backward compat, but:
   - Stop showing TypeBadge in UI (remove from EntryCard, EntryDetailPage)
   - Remove Type filter from entries page sidebar
   - Remove Type select from EntryForm
   - Default `type` to "entry" for all new entries
2. **Migrate existing type values to Collections**:
   - For each unique `type` value, find or create a Collection with that name
   - Add entries to their corresponding type-based Collection
   - This is a one-time data migration script
3. **Update API**:
   - `type` param in GET /api/entries still works (backward compat for agents)
   - New entries default `type` to "entry" if not specified
   - Response still includes `type` field
4. **Update UI**:
   - EntryCard: show Collections instead of TypeBadge
   - EntryForm: remove Type selector, add Collection selector
   - Entries page: Collections filter replaces Type filter
   - EntryDetailPage: show Collections, hide Type

### Migration Script
Create `scripts/migrate-types-to-collections.ts`:
1. Query all distinct `type` values
2. For each, find or create a Collection
3. For each entry with that type, add it to the corresponding Collection (if not already)
4. Log results

## Implementation Order
1. Add new Prisma models (PermissionGroup, Permission, UserGroup)
2. Generate and run migration
3. Seed built-in groups
4. Update auth.ts permission functions
5. Add API routes for groups/permissions
6. Add Settings > Permissions UI
7. Type → Collections migration script
8. Update EntryForm (remove Type, add Collection selector)
9. Update EntryCard (Collections instead of TypeBadge)
10. Update EntryDetailPage
11. Update entries page filters

## File Map (key files to modify)
- `prisma/schema.prisma` — add new models
- `src/lib/auth.ts` — permission resolution
- `src/lib/roles.ts` — may need updates or deprecation
- `src/app/api/entries/route.ts` — default type, filter changes
- `src/app/api/groups/` — new API routes
- `src/components/EntryCard.tsx` — remove TypeBadge, show Collections
- `src/components/EntryForm.tsx` — remove Type select, add Collection select
- `src/components/TypeBadge.tsx` — deprecate/remove
- `src/app/entries/[id]/page.tsx` — update detail view
- `src/app/settings/` — new Permissions tab

## Constraints
- PostgreSQL 17 on localhost, default connection string from .env
- Must not break existing API token auth
- Must not lose existing data
- Keep backward compat: `type` field stays in DB and API responses
- Built-in groups cannot be deleted
- Prisma migrate dev for schema changes

## Testing
After implementation:
1. Existing admin user can still do everything
2. Create a custom group with read-only on a specific collection
3. Assign a user → verify they can only read that collection's entries
4. Verify migration: existing entries appear in type-based collections
5. Verify EntryForm creates entries without requiring type selection

## When Done
1. Run `cd /Users/hata1234/clawd/projects/clawkb/app && npx next build` to verify
2. Git commit with descriptive message
3. Run: `openclaw system event --text "Done: ClawKB ACL permission system + Type→Collections migration complete" --mode now`
