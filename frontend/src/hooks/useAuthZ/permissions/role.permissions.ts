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
