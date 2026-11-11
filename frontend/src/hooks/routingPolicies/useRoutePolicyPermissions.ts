import { useMemo } from 'react';
import {
	buildRoutePolicyAttachPermission,
	buildRoutePolicyDeletePermission,
	buildRoutePolicyDetachPermission,
	buildRoutePolicyReadPermission,
	buildRoutePolicyUpdatePermission,
} from 'lib/authz/hooks/useAuthZ/permissions/route-policy.permissions';
import type { BrandedPermission } from 'lib/authz/hooks/useAuthZ/types';
import { useAuthZ } from 'lib/authz/hooks/useAuthZ/useAuthZ';

export interface RoutePolicyPermissions {
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
export function useRoutePolicyPermissions(
	policyId: string,
	options?: { enabled?: boolean },
): RoutePolicyPermissions {
	const enabled = options?.enabled ?? true;

	const {
		readPermission,
		updatePermission,
		deletePermission,
		attachPermission,
		detachPermission,
	} = useMemo(
		() => ({
			readPermission: buildRoutePolicyReadPermission(policyId),
			updatePermission: buildRoutePolicyUpdatePermission(policyId),
			deletePermission: buildRoutePolicyDeletePermission(policyId),
			attachPermission: buildRoutePolicyAttachPermission(policyId),
			detachPermission: buildRoutePolicyDetachPermission(policyId),
		}),
		[policyId],
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
