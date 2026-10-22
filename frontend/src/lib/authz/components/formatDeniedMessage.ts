import type { BrandedPermission } from 'lib/authz/hooks/useAuthZ/types';
import { formatPermission } from 'lib/authz/hooks/useAuthZ/utils';

export function formatDeniedMessage(
	denied: BrandedPermission[],
	userId: string,
	override?: string,
): string {
	if (override) {
		return override;
	}
	const permissions = denied.map(formatPermission).join(', ');
	return `user/${userId} is not authorized to perform ${permissions}`;
}
