import type { ReactNode } from 'react';
import DisabledReasonTooltip from 'lib/authz/components/DisabledReasonTooltip/DisabledReasonTooltip';

interface DisabledControlTooltipProps {
	/** Why the wrapped control is unavailable. Empty means it is available. */
	reason: string;
	children: ReactNode;
	/**
	 * Required so a caller can never fall back to a default that mis-styles an
	 * access problem as a state the user could resolve themselves.
	 */
	kind: 'denied' | 'blocked';
}

/** Dashboard-flavoured alias so control sites read declaratively. */
function DisabledControlTooltip({
	reason,
	children,
	kind,
}: DisabledControlTooltipProps): JSX.Element {
	return (
		<DisabledReasonTooltip reason={reason} kind={kind}>
			{children}
		</DisabledReasonTooltip>
	);
}

export default DisabledControlTooltip;
