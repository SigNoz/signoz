import { buildPermission } from '../utils';
import type { BrandedPermission } from '../types';

// Collection-level. Wildcard selector required for correct response key matching.
export const RoutePolicyListPermission = buildPermission(
	'list',
	'route-policy:*',
);
export const RoutePolicyCreatePermission = buildPermission(
	'create',
	'route-policy:*',
);
// A new policy has no id until it is saved, so linking its channels is checked
// against the wildcard.
export const RoutePolicyAttachPermission = buildPermission(
	'attach',
	'route-policy:*',
);

// Resource-level. Requires a specific policy id.
export const buildRoutePolicyReadPermission = (id: string): BrandedPermission =>
	buildPermission('read', `route-policy:${id}`);
export const buildRoutePolicyUpdatePermission = (
	id: string,
): BrandedPermission => buildPermission('update', `route-policy:${id}`);
export const buildRoutePolicyDeletePermission = (
	id: string,
): BrandedPermission => buildPermission('delete', `route-policy:${id}`);
export const buildRoutePolicyAttachPermission = (
	id: string,
): BrandedPermission => buildPermission('attach', `route-policy:${id}`);
export const buildRoutePolicyDetachPermission = (
	id: string,
): BrandedPermission => buildPermission('detach', `route-policy:${id}`);
