import { buildPermission } from '../utils';
import type { BrandedPermission } from '../types';

// Collection-level — wildcard selector required for correct response key matching
export const AuthDomainListPermission = buildPermission(
	'list',
	'auth-domain:*',
);
export const AuthDomainCreatePermission = buildPermission(
	'create',
	'auth-domain:*',
);

// Resource-level — require a specific auth domain id
export const buildAuthDomainReadPermission = (id: string): BrandedPermission =>
	buildPermission('read', `auth-domain:${id}`);
export const buildAuthDomainUpdatePermission = (
	id: string,
): BrandedPermission => buildPermission('update', `auth-domain:${id}`);
export const buildAuthDomainDeletePermission = (
	id: string,
): BrandedPermission => buildPermission('delete', `auth-domain:${id}`);
