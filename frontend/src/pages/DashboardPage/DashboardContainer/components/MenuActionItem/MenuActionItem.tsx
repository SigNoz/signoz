import type { ReactElement, ReactNode } from 'react';
import AuthZButton from 'lib/authz/components/AuthZButton/AuthZButton';
import type { BrandedPermission } from 'lib/authz/hooks/useAuthZ/types';

import styles from './MenuActionItem.module.scss';

interface MenuActionItemProps {
	label: ReactNode;
	icon: ReactElement;
	/** Permissions the row needs. Empty for a row that needs none. */
	checks: BrandedPermission[];
	/** A non-permission block, which outranks the checks (see AuthZTooltip). */
	disabledTooltip?: string;
	destructive?: boolean;
}

/**
 * A row in a dashboard dropdown. The button fills the row, so the tooltip
 * anchors to the whole row and lands clear of the menu.
 *
 * Takes no `onClick` or `disabled`: the item keeps both, because Radix reads
 * `disabled` off it for keyboard navigation and only marks a row `clickable` —
 * the pointer cursor — when the item carries the handler.
 */
function MenuActionItem({
	label,
	icon,
	checks,
	disabledTooltip,
	destructive = false,
}: MenuActionItemProps): JSX.Element {
	if (destructive) {
		return (
			<span className={styles.menuActionItem}>
				<AuthZButton
					size="md"
					checks={checks}
					disabledTooltip={disabledTooltip}
					variant="solid"
					color="danger"
					width="100%"
					prefix={icon}
				>
					{label}
				</AuthZButton>
			</span>
		);
	}

	return (
		<span className={styles.menuActionItem}>
			<AuthZButton
				size="md"
				checks={checks}
				disabledTooltip={disabledTooltip}
				variant="ghost"
				color="secondary"
				width="100%"
				prefix={icon}
			>
				{label}
			</AuthZButton>
		</span>
	);
}

export default MenuActionItem;
