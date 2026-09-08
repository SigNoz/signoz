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
 * The contents of a dashboard dropdown row: its icon, its label, and the reason
 * it is unavailable.
 *
 * The button fills the row, so the tooltip anchors to the whole row and lands
 * clear of the menu rather than over the icon. It deliberately takes no
 * `onClick` — the dropdown item keeps that, along with its own `disabled`, so
 * the menu still knows which rows are dead for keyboard navigation.
 */
function MenuActionItem({
	label,
	icon,
	checks,
	disabledTooltip,
	destructive = false,
}: MenuActionItemProps): JSX.Element {
	return (
		<AuthZButton
			checks={checks}
			disabledTooltip={disabledTooltip}
			side="left"
			variant="ghost"
			color={destructive ? 'destructive' : 'secondary'}
			className={styles.menuActionItem}
			prefix={icon}
		>
			{label}
		</AuthZButton>
	);
}

export default MenuActionItem;
