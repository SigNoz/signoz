import { buildPermission } from '../utils';
import type { BrandedPermission } from '../types';

// Collection-level. Wildcard selector required for correct response key matching.
export const PlannedMaintenanceListPermission = buildPermission(
	'list',
	'planned-maintenance:*',
);
export const PlannedMaintenanceCreatePermission = buildPermission(
	'create',
	'planned-maintenance:*',
);
// A new schedule has no id until it is saved, so linking its alerts is checked
// against the wildcard.
export const PlannedMaintenanceAttachPermission = buildPermission(
	'attach',
	'planned-maintenance:*',
);

// Resource-level. Requires a specific schedule id.
export const buildPlannedMaintenanceReadPermission = (
	id: string,
): BrandedPermission => buildPermission('read', `planned-maintenance:${id}`);
export const buildPlannedMaintenanceUpdatePermission = (
	id: string,
): BrandedPermission => buildPermission('update', `planned-maintenance:${id}`);
export const buildPlannedMaintenanceDeletePermission = (
	id: string,
): BrandedPermission => buildPermission('delete', `planned-maintenance:${id}`);
export const buildPlannedMaintenanceAttachPermission = (
	id: string,
): BrandedPermission => buildPermission('attach', `planned-maintenance:${id}`);
export const buildPlannedMaintenanceDetachPermission = (
	id: string,
): BrandedPermission => buildPermission('detach', `planned-maintenance:${id}`);
