import { buildPermission } from '../utils';
import type { BrandedPermission } from '../types';

// Collection-level — wildcard selector required for correct response key matching.
// `list` also covers pin/unpin and saved-view CRUD, which the backend gates on it.
export const DashboardListPermission = buildPermission('list', 'dashboard:*');
export const DashboardCreatePermission = buildPermission(
	'create',
	'dashboard:*',
);

// Resource-level — require a specific dashboard id
export const buildDashboardReadPermission = (id: string): BrandedPermission =>
	buildPermission('read', `dashboard:${id}`);
export const buildDashboardUpdatePermission = (id: string): BrandedPermission =>
	buildPermission('update', `dashboard:${id}`);
export const buildDashboardDeletePermission = (id: string): BrandedPermission =>
	buildPermission('delete', `dashboard:${id}`);
