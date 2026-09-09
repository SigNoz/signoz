import { buildPermission } from '../utils';
import type { BrandedPermission } from '../types';

// Resource-level — require a specific license id
export const buildLicenseReadPermission = (id: string): BrandedPermission =>
	buildPermission('read', `license:${id}`);
export const buildLicenseUpdatePermission = (id: string): BrandedPermission =>
	buildPermission('update', `license:${id}`);
