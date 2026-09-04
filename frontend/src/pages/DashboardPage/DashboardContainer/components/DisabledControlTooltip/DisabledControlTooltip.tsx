import type { ReactNode } from 'react';
import DisabledReasonTooltip from 'lib/authz/components/DisabledReasonTooltip/DisabledReasonTooltip';

interface DisabledControlTooltipProps {
	/** Why the wrapped control is unavailable. Empty means it is available. */
	reason: string;
	children: ReactNode;
}

/** Dashboard-flavoured alias so control sites read declaratively. */
function DisabledControlTooltip({
	reason,
	children,
}: DisabledControlTooltipProps): JSX.Element {
	return (
		<DisabledReasonTooltip reason={reason}>{children}</DisabledReasonTooltip>
	);
}

export default DisabledControlTooltip;
