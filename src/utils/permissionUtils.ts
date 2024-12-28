import { Permission } from "../models/Permission";

export function getExplicitPermissions(permissions: Partial<Record<Permission, boolean>>): Map<Permission, boolean> {
  return new Map(
    Object.entries(permissions || {}).filter(([_, value]) => value !== undefined) as [Permission, boolean][]
  );
}
