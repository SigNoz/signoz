import type { ReactNode } from 'react';
import DisabledReasonTooltip from 'lib/authz/components/DisabledReasonTooltip/DisabledReasonTooltip';

import styles from './DisabledMenuItemLabel.module.scss';

interface DisabledMenuItemLabelProps {
	reason: string;
	children: ReactNode;
	/**
	 * Required so a caller can never fall back to a default that mis-styles an
	 * access problem as a state the user could resolve themselves.
	 */
	kind: 'denied' | 'blocked';
}

/**
 * Label for a disabled dropdown row.
 *
 * The hover target is an overlay covering the whole row rather than the label
 * text, so the tooltip anchors to the row and lands clear of the menu instead
 * of over the row's own icon — matching the dashboards list. Anchoring to the
 * text would put it inside the menu, since the icon sits to the text's left.
 */
function DisabledMenuItemLabel({
	reason,
	children,
	kind,
}: DisabledMenuItemLabelProps): JSX.Element {
	if (!reason) {
		return <>{children}</>;
	}

	return (
		<>
			<DisabledReasonTooltip reason={reason} kind={kind} side="left" asChild>
				<span className={styles.rowAnchor} />
			</DisabledReasonTooltip>
			{children}
		</>
	);
}

export default DisabledMenuItemLabel;
