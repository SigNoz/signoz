import {
	DashboardCreatePermission,
	DashboardListPermission,
} from 'lib/authz/hooks/useAuthZ/permissions/dashboard.permissions';
import { useAuthZ } from 'lib/authz/hooks/useAuthZ/useAuthZ';

export interface DashboardCollectionPermissions {
	canList: boolean;
	canCreate: boolean;
	isLoading: boolean;
}

// Module-level so the useQueries identity stays stable across renders.
const CHECKS = [DashboardListPermission, DashboardCreatePermission];

/** Collection-level dashboard permissions (wildcard selector). */
export function useDashboardCollectionPermissions(): DashboardCollectionPermissions {
	const { permissions, isLoading } = useAuthZ(CHECKS);

	return {
		canList: permissions?.[DashboardListPermission]?.isGranted ?? false,
		canCreate: permissions?.[DashboardCreatePermission]?.isGranted ?? false,
		isLoading,
	};
}
