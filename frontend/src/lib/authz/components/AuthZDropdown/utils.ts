import type { DropdownItemType } from '@signozhq/ui/dropdown';
import { AUTHZ_LOADING_TOOLTIP } from 'lib/authz/components/constants';
import { formatDeniedMessage } from 'lib/authz/components/formatDeniedMessage';
import type {
	AuthZCheckResponse,
	BrandedPermission,
} from 'lib/authz/hooks/useAuthZ/types';

import type { AuthZDropdownItemType } from './types';

function getActiveChecks(item: AuthZDropdownItemType): BrandedPermission[] {
	if (!('checks' in item) || !item.checks || item.disabled || item.loading) {
		return [];
	}
	return item.checks;
}

export function collectChecks(
	items: AuthZDropdownItemType[],
): BrandedPermission[] {
	return [...new Set(items.flatMap(getActiveChecks))];
}

export function applyAuthZ(
	items: AuthZDropdownItemType[],
	{
		permissions,
		isLoading,
		userId,
	}: {
		permissions: AuthZCheckResponse | null;
		isLoading: boolean;
		userId: string;
	},
): DropdownItemType[] {
	return items.map((item): DropdownItemType => {
		if (!('checks' in item)) {
			return item;
		}

		const { checks: _checks, ...row } = item;
		const checks = getActiveChecks(item);
		if (checks.length === 0) {
			return row;
		}

		if (isLoading) {
			return { ...row, loading: true, loadingTooltip: AUTHZ_LOADING_TOOLTIP };
		}

		const denied = checks.filter((p) => permissions?.[p]?.isGranted === false);
		if (denied.length === 0) {
			return row;
		}

		return {
			...row,
			disabled: true,
			disabledTooltip: formatDeniedMessage(denied, userId),
		};
	});
}
