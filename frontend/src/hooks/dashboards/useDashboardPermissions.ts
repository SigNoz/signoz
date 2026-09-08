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
	/**
	 * `read` is required to render the dashboard at all, so a page gates its mount
	 * on this one alone.
	 */
	isReadPermissionLoading: boolean;
	/**
	 * `update` and `delete` only gate individual controls, which stay disabled
	 * without a reason until these land rather than holding up the whole page.
	 */
	areOtherPermissionsLoading: boolean;
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

	const { isGranted, isLoading } = useAuthZ(checks, { enabled });

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
		// One request covers all three, so the two flags only differ when a page
		// preloads `read` ahead of the rest — see `preloadChecks`.
		isReadPermissionLoading: isLoading,
		areOtherPermissionsLoading: isLoading,
		readPermission,
		updatePermission,
		deletePermission,
		editChecks,
	};
}
