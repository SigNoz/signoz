import { buildPermission } from '../utils';
import type { BrandedPermission } from '../types';

// Collection-level — wildcard selector required for correct response key matching
export const SAListPermission = buildPermission('list', 'serviceaccount:*');
export const SACreatePermission = buildPermission('create', 'serviceaccount:*');

// Resource-level — require a specific SA id
export const buildSAReadPermission = (id: string): BrandedPermission =>
	buildPermission('read', `serviceaccount:${id}`);
export const buildSAUpdatePermission = (id: string): BrandedPermission =>
	buildPermission('update', `serviceaccount:${id}`);
export const buildSADeletePermission = (id: string): BrandedPermission =>
	buildPermission('delete', `serviceaccount:${id}`);
export const buildSAAttachPermission = (id: string): BrandedPermission =>
	buildPermission('attach', `serviceaccount:${id}`);
export const buildSADetachPermission = (id: string): BrandedPermission =>
	buildPermission('detach', `serviceaccount:${id}`);

// Wildcard role permissions — used alongside SA-level checks for role assign/revoke guards.
// Backend requires both serviceaccount:attach AND role:attach to assign a role to a SA,
// and serviceaccount:detach AND role:detach to remove a role from a SA.
export const RoleAttachWildcardPermission = buildPermission('attach', 'role:*');
export const RoleDetachWildcardPermission = buildPermission('detach', 'role:*');

// API key (factor-api-key) permissions.
// Listing keys: factor-api-key:list.
// Creating a key: factor-api-key:create (wildcard) + serviceaccount:attach.
// Revoking a key: factor-api-key:delete (specific key) + serviceaccount:detach.
export const APIKeyListPermission = buildPermission('list', 'factor-api-key:*');
export const APIKeyCreatePermission = buildPermission(
	'create',
	'factor-api-key:*',
);
export const buildAPIKeyUpdatePermission = (keyId: string): BrandedPermission =>
	buildPermission('update', `factor-api-key:${keyId}`);
export const buildAPIKeyDeletePermission = (keyId: string): BrandedPermission =>
	buildPermission('delete', `factor-api-key:${keyId}`);
