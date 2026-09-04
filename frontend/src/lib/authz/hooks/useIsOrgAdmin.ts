import { IsAdminPermission } from './useAuthZ/legacy';
import { useAuthZ } from './useAuthZ/useAuthZ';

const CHECKS = [IsAdminPermission];

/**
 * Whether the caller holds the managed org-admin role, resolved through authz
 * rather than `user.role` so "admin" means what the authz store means.
 *
 * Named once here so the handful of backend rules that still fall back to the
 * admin role have a single place to change when `legacy.ts` goes away.
 */
export function useIsOrgAdmin(options?: { enabled?: boolean }): {
	isOrgAdmin: boolean;
	isLoading: boolean;
} {
	const { isGranted, isLoading } = useAuthZ(CHECKS, options);
	return { isOrgAdmin: isGranted(IsAdminPermission), isLoading };
}
