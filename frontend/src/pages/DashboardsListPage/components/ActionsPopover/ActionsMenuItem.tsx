import type { MouseEvent, ReactElement, ReactNode } from 'react';
import AuthZButton from 'lib/authz/components/AuthZButton/AuthZButton';
import type { BrandedPermission } from 'lib/authz/hooks/useAuthZ/types';

import styles from './ActionsPopover.module.scss';

interface Props {
	label: ReactNode;
	icon: ReactElement;
	testId: string;
	onClick: (event: MouseEvent<HTMLButtonElement>) => void;
	/** Permissions the row needs; the standard denial wording explains a refusal. */
	checks: BrandedPermission[];
	/** A non-permission block, which outranks the checks (see AuthZTooltip). */
	disabledTooltip?: string;
	loading?: boolean;
	destructive?: boolean;
}

/**
 * A row in the actions menu. The button fills the row, so the tooltip anchors to
 * the whole row and lands clear of the menu rather than over the row's own icon.
 */
function ActionsMenuItem({
	label,
	icon,
	testId,
	onClick,
	checks,
	disabledTooltip,
	loading = false,
	destructive = false,
}: Props): JSX.Element {
	return (
		<AuthZButton
			checks={checks}
			disabledTooltip={disabledTooltip}
			side="left"
			variant="ghost"
			color={destructive ? 'destructive' : 'secondary'}
			className={styles.menuItem}
			prefix={icon}
			disabled={loading}
			loading={loading}
			onClick={(e: MouseEvent<HTMLButtonElement>): void => {
				e.preventDefault();
				e.stopPropagation();
				onClick(e);
			}}
			testId={testId}
		>
			{label}
		</AuthZButton>
	);
}

export default ActionsMenuItem;
