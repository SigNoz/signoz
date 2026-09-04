import type { MouseEvent, ReactElement, ReactNode } from 'react';
import { Button } from '@signozhq/ui/button';
import DisabledReasonTooltip from 'lib/authz/components/DisabledReasonTooltip/DisabledReasonTooltip';
import type { DisabledState } from 'lib/authz/components/DisabledReasonTooltip/disabledState.types';
import type { BrandedPermission } from 'lib/authz/hooks/useAuthZ/types';

import styles from './ActionsPopover.module.scss';

interface Props {
	label: ReactNode;
	icon: ReactElement;
	testId: string;
	onClick: () => void;
	/**
	 * Present when the item is unavailable: it both disables the item and
	 * explains it, so it cannot be disabled silently or explained in the wrong
	 * register.
	 */
	disabled?: DisabledState;
	/** Exact denied scopes, surfaced on the DOM for support and tests. */
	deniedPermissions?: BrandedPermission[];
	loading?: boolean;
	destructive?: boolean;
}

// A row in the actions menu. A disabled button swallows hover, so the wrapping
// span carries the tooltip.
function ActionsMenuItem({
	label,
	icon,
	testId,
	onClick,
	disabled: disabledState,
	deniedPermissions,
	loading = false,
	destructive = false,
}: Props): JSX.Element {
	// A spinner explains itself, so an in-flight action needs no reason.
	const disabled = loading || !!disabledState;

	return (
		// Anchored to the full-width row, so the tooltip lands clear of the menu
		// rather than over the row's own icon.
		<DisabledReasonTooltip
			reason={disabledState?.reason ?? ''}
			side="left"
			kind={disabledState?.kind ?? 'denied'}
			asChild
		>
			{/* The Button drops unknown data-* props, so the denied scopes ride on the
			    wrapper — which is also the hover target for the tooltip. */}
			<span
				className={styles.menuItemWrap}
				data-denied-permissions={deniedPermissions?.join(',') || undefined}
			>
				<Button
					variant="ghost"
					color={destructive ? 'destructive' : 'secondary'}
					className={styles.menuItem}
					prefix={icon}
					disabled={disabled}
					loading={loading}
					onClick={(e: MouseEvent<HTMLButtonElement>): void => {
						e.preventDefault();
						e.stopPropagation();
						if (!disabled) {
							onClick();
						}
					}}
					testId={testId}
				>
					{label}
				</Button>
			</span>
		</DisabledReasonTooltip>
	);
}

export default ActionsMenuItem;
