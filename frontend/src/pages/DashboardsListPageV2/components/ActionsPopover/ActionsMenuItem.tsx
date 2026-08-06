import type { MouseEvent, ReactElement, ReactNode } from 'react';
import { Tooltip } from 'antd';
import { Button } from '@signozhq/ui/button';
import type { BrandedPermission } from 'lib/authz/hooks/useAuthZ/types';

import styles from './ActionsPopover.module.scss';

interface Props {
	label: ReactNode;
	icon: ReactElement;
	testId: string;
	onClick: () => void;
	disabled?: boolean;
	/** Why the item is disabled. Empty while a permission check is in flight. */
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
	disabled = false,
	reason = '',
	deniedPermissions,
	loading = false,
	destructive = false,
}: Props): JSX.Element {
	return (
		<Tooltip placement="left" title={reason}>
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
		</Tooltip>
	);
}

export default ActionsMenuItem;
