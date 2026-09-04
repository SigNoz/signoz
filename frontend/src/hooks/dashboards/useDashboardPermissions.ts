import { useMemo } from 'react';
import {
	buildDashboardDeletePermission,
	buildDashboardReadPermission,
	buildDashboardUpdatePermission,
} from 'lib/authz/hooks/useAuthZ/permissions/dashboard.permissions';
import type { BrandedPermission } from 'lib/authz/hooks/useAuthZ/types';
import { useAuthZ } from 'lib/authz/hooks/useAuthZ/useAuthZ';

export interface DashboardPermissions {
	canRead: boolean;
	canUpdate: boolean;
	canDelete: boolean;
	/** Per the authz guide, an edit affordance needs `read` as well as `update`. */
	canEdit: boolean;
	isLoading: boolean;
	/**
	 * The check itself failed. Callers should fall open rather than treat an
	 * authz outage as a denial.
	 */
	hasError: boolean;
	readPermission: BrandedPermission;
	updatePermission: BrandedPermission;
	deletePermission: BrandedPermission;
	/** `[read, update]` — pass to AuthZTooltip so both are named when both are denied. */
	editChecks: BrandedPermission[];
}

/**
 * Resource-level dashboard permissions. Pass `enabled: false` while the id is
 * unknown, so no check is fired against an empty selector.
 */
export function useDashboardPermissions(
	dashboardId: string,
	options?: { enabled?: boolean },
): DashboardPermissions {
	const enabled = options?.enabled ?? true;

	const { readPermission, updatePermission, deletePermission } = useMemo(
		() => ({
			readPermission: buildDashboardReadPermission(dashboardId),
			updatePermission: buildDashboardUpdatePermission(dashboardId),
			deletePermission: buildDashboardDeletePermission(dashboardId),
		}),
		[dashboardId],
	);

	const checks = useMemo(
		() => [readPermission, updatePermission, deletePermission],
		[readPermission, updatePermission, deletePermission],
	);

	const { isGranted, isLoading, error } = useAuthZ(checks, { enabled });

	const canRead = isGranted(readPermission);
	const canUpdate = isGranted(updatePermission);
	const canDelete = isGranted(deletePermission);

	const editChecks = useMemo(
		() => [readPermission, updatePermission],
		[readPermission, updatePermission],
	);

	return {
		canRead,
		canUpdate,
		canDelete,
		canEdit: canRead && canUpdate,
		isLoading,
		hasError: !!error,
		readPermission,
		updatePermission,
		deletePermission,
		editChecks,
	};
}
