import type { ReactNode } from 'react';

import styles from './TooltipScrollArea.module.scss';

interface TooltipScrollAreaProps {
	children: ReactNode;
}

/**
 * Pass as the hosting tooltip's content class (`tooltipContentProps`) so its
 * padding makes room for the scroll area's own edge handling.
 */
export const TOOLTIP_SCROLL_CONTENT_CLASS = styles.tooltipContent;

/**
 * Scroll container for hover reveals that list an unbounded number of items (tag
 * chips, variable values): caps the tooltip's height and scrolls past it. Plain CSS
 * overflow with a pinned-visible thin scrollbar — a tooltip is transient, so an
 * auto-hiding scrollbar would leave no hint that there is more below.
 */
function TooltipScrollArea({ children }: TooltipScrollAreaProps): JSX.Element {
	return <div className={styles.scrollArea}>{children}</div>;
}

export default TooltipScrollArea;
