import {
	RoutePolicyAttachPermission,
	RoutePolicyCreatePermission,
	RoutePolicyListPermission,
} from 'lib/authz/hooks/useAuthZ/permissions/route-policy.permissions';
import { useAuthZ } from 'lib/authz/hooks/useAuthZ/useAuthZ';

export interface RoutePolicyCollectionPermissions {
	canList: boolean;
	/** A policy needs at least one channel, so creating one always links it. */
	canCreate: boolean;
	isLoading: boolean;
	/**
	 * The check itself failed. Callers should fall open (behave as before authz
	 * and let the API decide) rather than treat an outage as a denial.
	 */
	hasError: boolean;
}

export const ROUTE_POLICY_LIST_CHECKS = [RoutePolicyListPermission];
/** `[create, attach]`, so a denial names both. */
export const ROUTE_POLICY_CREATE_CHECKS = [
	RoutePolicyCreatePermission,
	RoutePolicyAttachPermission,
];

// Module-level so the useQueries identity stays stable across renders.
const CHECKS = [...ROUTE_POLICY_LIST_CHECKS, ...ROUTE_POLICY_CREATE_CHECKS];

/** Collection-level routing policy permissions (wildcard selector). */
export function useRoutePolicyCollectionPermissions(): RoutePolicyCollectionPermissions {
	const { isGranted, isLoading, error } = useAuthZ(CHECKS);

	return {
		canList: isGranted(RoutePolicyListPermission),
		canCreate:
			isGranted(RoutePolicyCreatePermission) &&
			isGranted(RoutePolicyAttachPermission),
		isLoading,
		hasError: !!error,
	};
}
