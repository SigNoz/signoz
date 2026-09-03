import type { ReactNode } from 'react';
import { TooltipSimple } from '@signozhq/ui/tooltip';

import styles from './DisabledMenuItemLabel.module.scss';

interface DisabledMenuItemLabelProps {
	reason: string;
	children: ReactNode;
}

// A disabled row has pointer-events: none, so the label re-enables them to catch hover.
function DisabledMenuItemLabel({
	reason,
	children,
}: DisabledMenuItemLabelProps): JSX.Element {
	return (
		<TooltipSimple
			title={reason}
			arrow
			disableHoverableContent
			tooltipContentProps={{ className: styles.aboveOverlay }}
		>
			<span className={styles.label}>{children}</span>
		</TooltipSimple>
	);
}

export default DisabledMenuItemLabel;
