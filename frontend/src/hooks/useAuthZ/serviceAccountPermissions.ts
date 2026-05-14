// src/hooks/useAuthZ/serviceAccountPermissions.ts
import { buildPermission } from './utils';
import type { AuthZObject, BrandedPermission } from './types';

// Collection-level — wildcard selector required for correct response key matching
export const SAListPermission = buildPermission(
	'list',
	'serviceaccount:*' as AuthZObject<'list'>,
);
export const SACreatePermission = buildPermission(
	'create',
	'serviceaccount:*' as AuthZObject<'create'>,
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
export const buildSADetachPermission = (id: string): BrandedPermission =>
	buildPermission('detach', `serviceaccount:${id}` as AuthZObject<'detach'>);

// Wildcard role permissions — used alongside SA-level checks for role assign/revoke guards.
// Backend requires both serviceaccount:attach AND role:attach to assign a role to a SA,
// and serviceaccount:detach AND role:detach to remove a role from a SA.
export const RoleAttachWildcardPermission = buildPermission(
	'attach',
	'role:*' as AuthZObject<'attach'>,
);
export const RoleDetachWildcardPermission = buildPermission(
	'detach',
	'role:*' as AuthZObject<'detach'>,
);

// API key (factor-api-key) permissions.
// Listing keys: factor-api-key:list.
// Creating a key: factor-api-key:create (wildcard) + serviceaccount:attach.
// Revoking a key: factor-api-key:delete (specific key) + serviceaccount:detach.
export const APIKeyListPermission = buildPermission(
	'list',
	'factor-api-key:*' as AuthZObject<'list'>,
);
export const APIKeyCreatePermission = buildPermission(
	'create',
	'factor-api-key:*' as AuthZObject<'create'>,
);
export const buildAPIKeyDeletePermission = (keyId: string): BrandedPermission =>
	buildPermission('delete', `factor-api-key:${keyId}` as AuthZObject<'delete'>);
