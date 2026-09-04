import type { MouseEvent, ReactElement, ReactNode } from 'react';
import { Button } from '@signozhq/ui/button';
import DisabledReasonTooltip from 'lib/authz/components/DisabledReasonTooltip/DisabledReasonTooltip';
import type { BrandedPermission } from 'lib/authz/hooks/useAuthZ/types';

import styles from './ActionsPopover.module.scss';

interface Props {
	label: ReactNode;
	icon: ReactElement;
	testId: string;
	onClick: () => void;
	/**
	 * Why the item is unavailable. Non-empty both disables it and explains it, so
	 * it cannot be disabled silently.
	 */
	reason?: string;
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
	reason = '',
	deniedPermissions,
	loading = false,
	destructive = false,
}: Props): JSX.Element {
	// A spinner explains itself, so an in-flight action needs no reason.
	const disabled = loading || !!reason;

	return (
		<DisabledReasonTooltip reason={reason} side="left" asChild>
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
