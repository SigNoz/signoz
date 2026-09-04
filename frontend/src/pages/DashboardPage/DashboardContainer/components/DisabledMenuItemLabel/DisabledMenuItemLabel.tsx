import type { ReactNode } from 'react';
import DisabledReasonTooltip from 'lib/authz/components/DisabledReasonTooltip/DisabledReasonTooltip';

interface DisabledMenuItemLabelProps {
	reason: string;
	children: ReactNode;
	kind?: 'denied' | 'blocked';
}

/**
 * Label for a disabled dropdown row. The row sets `pointer-events: none`, so the
 * wrapper re-enables them to catch hover.
 *
 * The tooltip sits to the left, beside the row it explains — above would cover
 * the row before it in the menu. Matches the dashboards list's row menu.
 */
function DisabledMenuItemLabel({
	reason,
	children,
	kind = 'blocked',
}: DisabledMenuItemLabelProps): JSX.Element {
	return (
		<DisabledReasonTooltip reason={reason} kind={kind} side="left" interactive>
			{children}
		</DisabledReasonTooltip>
	);
}

export default DisabledMenuItemLabel;
