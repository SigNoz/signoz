import { BrandedPermission } from '../types';
import { buildPermission } from '../utils';

export const buildOrganizationReadPermission = (
	id: string,
): BrandedPermission => buildPermission('read', `organization:${id}`);

export const buildOrganizationUpdatePermission = (
	id: string,
): BrandedPermission => buildPermission('update', `organization:${id}`);
