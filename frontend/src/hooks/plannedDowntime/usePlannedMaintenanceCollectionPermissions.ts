import {
	PlannedMaintenanceAttachPermission,
	PlannedMaintenanceCreatePermission,
	PlannedMaintenanceListPermission,
} from 'lib/authz/hooks/useAuthZ/permissions/planned-maintenance.permissions';
import { useAuthZ } from 'lib/authz/hooks/useAuthZ/useAuthZ';

export interface PlannedMaintenanceCollectionPermissions {
	canList: boolean;
	/** A schedule always links its alerts, all of them when none are picked. */
	canCreate: boolean;
	isLoading: boolean;
	/**
	 * The check itself failed. Callers should fall open (behave as before authz
	 * and let the API decide) rather than treat an outage as a denial.
	 */
	hasError: boolean;
}

export const PLANNED_MAINTENANCE_LIST_CHECKS = [
	PlannedMaintenanceListPermission,
];
/** `[create, attach]`, so a denial names both. */
export const PLANNED_MAINTENANCE_CREATE_CHECKS = [
	PlannedMaintenanceCreatePermission,
	PlannedMaintenanceAttachPermission,
];

// Module-level so the useQueries identity stays stable across renders.
const CHECKS = [
	...PLANNED_MAINTENANCE_LIST_CHECKS,
	...PLANNED_MAINTENANCE_CREATE_CHECKS,
];

/** Collection-level planned maintenance permissions (wildcard selector). */
export function usePlannedMaintenanceCollectionPermissions(): PlannedMaintenanceCollectionPermissions {
	const { isGranted, isLoading, error } = useAuthZ(CHECKS);

	return {
		canList: isGranted(PlannedMaintenanceListPermission),
		canCreate:
			isGranted(PlannedMaintenanceCreatePermission) &&
			isGranted(PlannedMaintenanceAttachPermission),
		isLoading,
		hasError: !!error,
	};
}
