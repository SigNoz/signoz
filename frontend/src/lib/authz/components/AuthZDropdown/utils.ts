import type {
	DropdownGroupChildType,
	DropdownItemType,
} from '@signozhq/ui/dropdown';
import { AUTHZ_LOADING_TOOLTIP } from 'lib/authz/components/constants';
import { formatDeniedMessage } from 'lib/authz/components/formatDeniedMessage';
import type {
	AuthZCheckResponse,
	BrandedPermission,
} from 'lib/authz/hooks/useAuthZ/types';

import type { AuthZDropdownItemType, AuthZGroupChildType } from './types';

interface GateState {
	permissions: AuthZCheckResponse | null;
	isLoading: boolean;
	userId: string;
}

/**
 * A non-permission reason blocks the row; without one the row's checks decide.
 */
export function blockedBy(reason: string): {
	disabled: boolean;
	disabledTooltip: string | undefined;
} {
	return { disabled: !!reason, disabledTooltip: reason || undefined };
}

function getActiveChecks(item: AuthZGroupChildType): BrandedPermission[] {
	if (!('checks' in item) || !item.checks || item.disabled || item.loading) {
		return [];
	}
	return item.checks;
}

export function collectChecks(
	items: AuthZDropdownItemType[],
): BrandedPermission[] {
	return [
		...new Set(
			items.flatMap((item) =>
				item.type === 'group'
					? item.items.flatMap(getActiveChecks)
					: getActiveChecks(item),
			),
		),
	];
}

function gateRow(
	item: AuthZGroupChildType,
	{ permissions, isLoading, userId }: GateState,
): DropdownGroupChildType {
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
}

export function applyAuthZ(
	items: AuthZDropdownItemType[],
	state: GateState,
): DropdownItemType[] {
	return items.map(
		(item): DropdownItemType =>
			item.type === 'group'
				? { ...item, items: item.items.map((child) => gateRow(child, state)) }
				: gateRow(item, state),
	);
}
