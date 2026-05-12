// src/hooks/useAuthZ/serviceAccountPermissions.ts
import { buildPermission } from './utils';
import type { AuthZObject, BrandedPermission } from './types';

// Metaresource-level — no specific ID needed
export const SAListPermission = buildPermission(
	'list',
	'serviceaccount' as AuthZObject<'list'>,
);
export const SACreatePermission = buildPermission(
	'create',
	'serviceaccount' as AuthZObject<'create'>,
);

// Resource-level — require a specific SA id
export const buildSAReadPermission = (id: string): BrandedPermission =>
	buildPermission('read', `serviceaccount:${id}` as AuthZObject<'read'>);
export const buildSAUpdatePermission = (id: string): BrandedPermission =>
	buildPermission('update', `serviceaccount:${id}` as AuthZObject<'update'>);
export const buildSADeletePermission = (id: string): BrandedPermission =>
	buildPermission('delete', `serviceaccount:${id}` as AuthZObject<'delete'>);
export const buildSAAttachPermission = (id: string): BrandedPermission =>
	buildPermission('attach', `serviceaccount:${id}` as AuthZObject<'attach'>);

// Wildcard role attach — used alongside buildSAAttachPermission for role selector guard.
// Backend requires both serviceaccount:attach AND role:attach to assign/revoke roles on a SA.
export const RoleAttachWildcardPermission = buildPermission(
	'attach',
	'role:*' as AuthZObject<'attach'>,
);
