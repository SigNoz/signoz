import { IsAdminPermission } from 'lib/authz/hooks/useAuthZ/legacy';
import { useAuthZ } from 'lib/authz/hooks/useAuthZ/useAuthZ';

const ADMIN_PERMISSION = [IsAdminPermission];

export function useCanManageAttributeMapping(): boolean {
	const { allowed } = useAuthZ(ADMIN_PERMISSION);
	return allowed;
}
