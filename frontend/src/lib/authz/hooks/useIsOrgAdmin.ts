import { IsAdminPermission } from './useAuthZ/legacy';
import { useAuthZ } from './useAuthZ/useAuthZ';

const CHECKS = [IsAdminPermission];

export function useIsOrgAdmin(options?: { enabled?: boolean }): {
	isOrgAdmin: boolean;
	isLoading: boolean;
} {
	const { isGranted, isLoading } = useAuthZ(CHECKS, options);
	return { isOrgAdmin: isGranted(IsAdminPermission), isLoading };
}
