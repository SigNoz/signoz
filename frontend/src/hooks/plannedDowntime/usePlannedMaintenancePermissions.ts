import { useMemo } from 'react';
import {
	buildPlannedMaintenanceAttachPermission,
	buildPlannedMaintenanceDeletePermission,
	buildPlannedMaintenanceDetachPermission,
	buildPlannedMaintenanceReadPermission,
	buildPlannedMaintenanceUpdatePermission,
} from 'lib/authz/hooks/useAuthZ/permissions/planned-maintenance.permissions';
import type { BrandedPermission } from 'lib/authz/hooks/useAuthZ/types';
import { useAuthZ } from 'lib/authz/hooks/useAuthZ/useAuthZ';

export interface PlannedMaintenancePermissions {
	canRead: boolean;
	canUpdate: boolean;
	canDelete: boolean;
	/** Per the authz guide, an edit affordance needs `read` as well as `update`. */
	canEdit: boolean;
	canAttach: boolean;
	canDetach: boolean;
	isLoading: boolean;
	/** The check failed: callers fall open and let the API decide. */
	hasError: boolean;
	readPermission: BrandedPermission;
	updatePermission: BrandedPermission;
	deletePermission: BrandedPermission;
	attachPermission: BrandedPermission;
	detachPermission: BrandedPermission;
	/** `[read, update]`, so a denial names both. */
	editChecks: BrandedPermission[];
}

/** Pass `enabled: false` while the id is unknown, so no check fires against an empty selector. */
export function usePlannedMaintenancePermissions(
	scheduleId: string,
	options?: { enabled?: boolean },
): PlannedMaintenancePermissions {
	const enabled = options?.enabled ?? true;

	const {
		readPermission,
		updatePermission,
		deletePermission,
		attachPermission,
		detachPermission,
	} = useMemo(
		() => ({
			readPermission: buildPlannedMaintenanceReadPermission(scheduleId),
			updatePermission: buildPlannedMaintenanceUpdatePermission(scheduleId),
			deletePermission: buildPlannedMaintenanceDeletePermission(scheduleId),
			attachPermission: buildPlannedMaintenanceAttachPermission(scheduleId),
			detachPermission: buildPlannedMaintenanceDetachPermission(scheduleId),
		}),
		[scheduleId],
	);

	const checks = useMemo(
		() => [
			readPermission,
			updatePermission,
			deletePermission,
			attachPermission,
			detachPermission,
		],
		[
			readPermission,
			updatePermission,
			deletePermission,
			attachPermission,
			detachPermission,
		],
	);

	const { isGranted, isLoading, error } = useAuthZ(checks, { enabled });

	const canRead = isGranted(readPermission);
	const canUpdate = isGranted(updatePermission);

	const editChecks = useMemo(
		() => [readPermission, updatePermission],
		[readPermission, updatePermission],
	);

	return {
		canRead,
		canUpdate,
		canDelete: isGranted(deletePermission),
		canEdit: canRead && canUpdate,
		canAttach: isGranted(attachPermission),
		canDetach: isGranted(detachPermission),
		isLoading,
		hasError: !!error,
		readPermission,
		updatePermission,
		deletePermission,
		attachPermission,
		detachPermission,
		editChecks,
	};
}
