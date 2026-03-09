import { normalizeRole } from "./roles";

export function serializeRoleGroup(group: {
  id: number;
  name: string;
  description: string | null;
  role: string;
  _count?: { users: number };
}) {
  return {
    id: group.id,
    name: group.name,
    description: group.description,
    role: normalizeRole(group.role),
    userCount: group._count?.users ?? 0,
  };
}
