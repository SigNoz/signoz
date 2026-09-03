import { buildPermission } from '../utils';
import type { BrandedPermission } from '../types';

// Resource-level — require a specific license id
export const buildLicenseReadPermission = (id: string): BrandedPermission =>
	buildPermission('read', `license:${id}`);
