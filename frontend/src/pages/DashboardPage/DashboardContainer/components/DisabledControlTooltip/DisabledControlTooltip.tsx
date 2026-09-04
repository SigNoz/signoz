import type { ReactNode } from 'react';
import DisabledReasonTooltip from 'lib/authz/components/DisabledReasonTooltip/DisabledReasonTooltip';

interface DisabledControlTooltipProps {
	/** Why the wrapped control is unavailable. Empty means it is available. */
	reason: string;
	children: ReactNode;
	/** Defaults to a state block, which is what most page controls hit. */
	kind?: 'denied' | 'blocked';
}

/** Dashboard-flavoured alias so control sites read declaratively. */
function DisabledControlTooltip({
	reason,
	children,
	kind = 'blocked',
}: DisabledControlTooltipProps): JSX.Element {
	return (
		<DisabledReasonTooltip reason={reason} kind={kind}>
			{children}
		</DisabledReasonTooltip>
	);
}

export default DisabledControlTooltip;
