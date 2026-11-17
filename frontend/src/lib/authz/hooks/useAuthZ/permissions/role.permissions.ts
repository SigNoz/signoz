import { buildPermission } from '../utils';
import type { BrandedPermission } from '../types';

// Collection-level — no specific role id needed
export const RoleCreatePermission = buildPermission('create', 'role:*');
export const RoleListPermission = buildPermission('list', 'role:*');

// Resource-level — require a specific role id
export const buildRoleReadPermission = (id: string): BrandedPermission =>
	buildPermission('read', `role:${id}`);
export const buildRoleUpdatePermission = (id: string): BrandedPermission =>
	buildPermission('update', `role:${id}`);
export const buildRoleDeletePermission = (id: string): BrandedPermission =>
	buildPermission('delete', `role:${id}`);

// Wildcard role permissions — used alongside SA-level checks for role assign/revoke guards.
// Backend requires both serviceaccount:attach AND role:attach to assign a role to a SA,
// and serviceaccount:detach AND role:detach to remove a role from a SA.
export const RoleAttachWildcardPermission = buildPermission('attach', 'role:*');
export const RoleDetachWildcardPermission = buildPermission('detach', 'role:*');
