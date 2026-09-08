import type { ReactNode } from 'react';
import AuthZTooltip from 'lib/authz/components/AuthZTooltip/AuthZTooltip';
import type { BrandedPermission } from 'lib/authz/hooks/useAuthZ/types';

import styles from './DisabledMenuItemLabel.module.scss';

interface DisabledMenuItemLabelProps {
	/** The menu item's own `disabled` flag — nothing renders when it is available. */
	disabled: boolean;
	/** Permissions the row needs, reported in the standard wording when denied. */
	checks: BrandedPermission[];
	/** A non-permission block, which outranks the checks (see AuthZTooltip). */
	disabledTooltip?: string;
	children: ReactNode;
}

/**
 * Label for a dropdown row, with the reason it is unavailable.
 *
 * The hover target is an overlay covering the whole row rather than the label
 * text: the row is the positioning context, so the tooltip anchors to it and
 * lands clear of the menu instead of over the row's own icon. The row stops
 * pointer events when disabled, so the overlay takes the hover instead.
 */
function DisabledMenuItemLabel({
	disabled,
	checks,
	disabledTooltip,
	children,
}: DisabledMenuItemLabelProps): JSX.Element {
	if (!disabled) {
		return <>{children}</>;
	}

	return (
		<>
			<AuthZTooltip checks={checks} disabledTooltip={disabledTooltip} side="left">
				{/* A button so the tooltip can disable it the way it disables any other
				    control — a span has no disabled state. Invisible and hidden from
				    assistive tech: the row it covers carries the label and the state. */}
				<button type="button" className={styles.rowAnchor} aria-hidden />
			</AuthZTooltip>
			{children}
		</>
	);
}

export default DisabledMenuItemLabel;
