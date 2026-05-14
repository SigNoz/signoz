import { buildPermission } from './utils';
import type { AuthZObject, BrandedPermission } from './types';

// Collection-level — no specific role id needed
export const RoleCreatePermission = buildPermission(
	'create',
	'role:*' as AuthZObject<'create'>,
);
export const RoleListPermission = buildPermission(
	'list',
	'role:*' as AuthZObject<'list'>,
);

// Resource-level — require a specific role id
export const buildRoleReadPermission = (id: string): BrandedPermission =>
	buildPermission('read', `role:${id}` as AuthZObject<'read'>);
export const buildRoleUpdatePermission = (id: string): BrandedPermission =>
	buildPermission('update', `role:${id}` as AuthZObject<'update'>);
export const buildRoleDeletePermission = (id: string): BrandedPermission =>
	buildPermission('delete', `role:${id}` as AuthZObject<'delete'>);
