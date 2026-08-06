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
	readPermission: BrandedPermission;
	updatePermission: BrandedPermission;
	deletePermission: BrandedPermission;
	/** `[read, update]` — pass to AuthZTooltip so both are named when both are denied. */
	editChecks: BrandedPermission[];
}

/**
 * Resource-level dashboard permissions. Pass `enabled: false` while the id is
 * unknown so no check is fired against an empty selector.
 */
export function useDashboardPermissions(
	dashboardId: string,
	options?: { enabled?: boolean },
): DashboardPermissions {
	const enabled = (options?.enabled ?? true) && !!dashboardId;

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

	const { permissions, isLoading } = useAuthZ(checks, { enabled });

	const canRead = permissions?.[readPermission]?.isGranted ?? false;
	const canUpdate = permissions?.[updatePermission]?.isGranted ?? false;
	const canDelete = permissions?.[deletePermission]?.isGranted ?? false;

	const editChecks = useMemo(
		() => [readPermission, updatePermission],
		[readPermission, updatePermission],
	);

	return {
		canRead,
		canUpdate,
		canDelete,
		canEdit: canRead && canUpdate,
		isLoading: enabled && isLoading,
		readPermission,
		updatePermission,
		deletePermission,
		editChecks,
	};
}
