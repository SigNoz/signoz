import { PermissionScope } from '../../types';

export enum ScopeBadgeVariant {
	ALL = 'all',
	NONE = 'none',
	SELECTED = 'selected',
}

export interface ScopeBadge {
	label: string;
	variant: ScopeBadgeVariant;
}

export function getActionLabel(actionName: string): string {
	if (!actionName) {
		return 'Unknown';
	}

	return actionName[0].toUpperCase() + actionName.slice(1);
}

export function getScopeBadge(
	scope: PermissionScope,
	selectedCount: number,
): ScopeBadge {
	switch (scope) {
		case PermissionScope.ALL:
			return { label: 'All', variant: ScopeBadgeVariant.ALL };
		case PermissionScope.ONLY_SELECTED:
			return {
				label: `Only selected · ${selectedCount}`,
				variant: ScopeBadgeVariant.SELECTED,
			};
		case PermissionScope.NONE:
		default:
			return { label: 'None', variant: ScopeBadgeVariant.NONE };
	}
}
