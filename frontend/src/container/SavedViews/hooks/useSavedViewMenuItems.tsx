import { isValidElement, useMemo } from 'react';
import type { MenuItem } from '@signozhq/ui/dropdown-menu';
import cx from 'classnames';
import AuthZTooltip from 'lib/authz/components/AuthZTooltip/AuthZTooltip';
import { useAuthZ } from 'lib/authz/hooks/useAuthZ/useAuthZ';

import styles from '../SavedViewsMenu.module.scss';
import { SavedViewMenuItem, UseSavedViewMenuItemsOptions } from '../types';

/**
 * Gates `DropdownMenuSimple` items: an item with `checks` is disabled while they
 * load or when denied, and shows the denial on hover. One check for the menu.
 */
export function useSavedViewMenuItems(
	items: SavedViewMenuItem[],
	{ enabled = true }: UseSavedViewMenuItemsOptions = {},
): MenuItem[] {
	const permissions = useMemo(
		() => [...new Set(items.flatMap((item) => item.checks ?? []))],
		[items],
	);
	const { isLoading, deniedPermissions } = useAuthZ(permissions, {
		enabled: enabled && permissions.length > 0,
	});
	const isChecking = !enabled || isLoading;

	return useMemo(
		() =>
			items.map(({ checks, ...item }): MenuItem => {
				if (!checks?.length || !('label' in item)) {
					return item as MenuItem;
				}
				const isBlocked =
					isChecking || checks.some((check) => deniedPermissions.includes(check));
				const label = isValidElement(item.label) ? (
					item.label
				) : (
					<span>{item.label}</span>
				);
				return {
					...item,
					label: (
						<AuthZTooltip checks={checks} enabled={enabled}>
							{label}
						</AuthZTooltip>
					),
					disabled: item.disabled || isBlocked,
					className: cx(item.className, { [styles.deniedItem]: isBlocked }),
				} as MenuItem;
			}),
		[items, isChecking, deniedPermissions, enabled],
	);
}
