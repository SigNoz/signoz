import {
	DashboardCreatePermission,
	DashboardListPermission,
} from 'lib/authz/hooks/useAuthZ/permissions/dashboard.permissions';
import { useAuthZ } from 'lib/authz/hooks/useAuthZ/useAuthZ';

export interface DashboardCollectionPermissions {
	canList: boolean;
	canCreate: boolean;
	isLoading: boolean;
	/**
	 * The check itself failed. Callers should fall open — behave as before authz
	 * and let the API decide — rather than treat an outage as a denial.
	 */
	hasError: boolean;
}

// Module-level so the useQueries identity stays stable across renders.
const CHECKS = [DashboardListPermission, DashboardCreatePermission];

/** Collection-level dashboard permissions (wildcard selector). */
export function useDashboardCollectionPermissions(): DashboardCollectionPermissions {
	const { isGranted, isLoading, error } = useAuthZ(CHECKS);

	return {
		canList: isGranted(DashboardListPermission),
		canCreate: isGranted(DashboardCreatePermission),
		isLoading,
		hasError: !!error,
	};
}
