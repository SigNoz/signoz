import type { BrandedPermission } from '../types';
import { buildPermission } from '../utils';

export const SavedViewListPermission = buildPermission('list', 'saved-view:*');
export const SavedViewReadPermission = buildPermission('read', 'saved-view:*');
export const SavedViewCreatePermission = buildPermission(
	'create',
	'saved-view:*',
);

export const buildSavedViewUpdatePermission = (id: string): BrandedPermission =>
	buildPermission('update', `saved-view:${id}`);
export const buildSavedViewDeletePermission = (id: string): BrandedPermission =>
	buildPermission('delete', `saved-view:${id}`);
