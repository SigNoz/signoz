import type { ReactNode } from 'react';
import { TooltipSimple } from '@signozhq/ui/tooltip';

import styles from './DisabledControlTooltip.module.scss';

interface DisabledControlTooltipProps {
	/** Why the wrapped control is unavailable. Empty means it is available. */
	reason: string;
	children: ReactNode;
}

// A disabled button swallows hover, so the wrapping span is the tooltip trigger.
function DisabledControlTooltip({
	reason,
	children,
}: DisabledControlTooltipProps): JSX.Element {
	if (!reason) {
		return <>{children}</>;
	}
	return (
		<TooltipSimple
			title={reason}
			arrow
			disableHoverableContent
			tooltipContentProps={{ className: styles.aboveOverlay }}
		>
			<span className={styles.trigger}>{children}</span>
		</TooltipSimple>
	);
}

export default DisabledControlTooltip;
