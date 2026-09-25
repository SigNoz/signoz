import { TooltipSimple } from '@signozhq/ui/tooltip';
import TooltipScrollArea, {
	TOOLTIP_SCROLL_CONTENT_CLASS,
} from 'components/TooltipScrollArea/TooltipScrollArea';

import styles from '../../VariablesBar.module.scss';

interface OverflowValuesTooltipProps {
	/** The selected values the pill hides behind this `+N`. */
	values: string[];
}

/**
 * The multi-select's `+N` overflow item, revealing on hover the values it stands
 * for — one bullet each, all of them, scrolling rather than truncating. The
 * scrollbar stays put instead of auto-hiding, so a capped list reads as scrollable.
 */
function OverflowValuesTooltip({
	values,
}: OverflowValuesTooltipProps): JSX.Element {
	return (
		<TooltipSimple
			side="top"
			delayDuration={300}
			tooltipContentProps={{ className: TOOLTIP_SCROLL_CONTENT_CLASS }}
			title={
				<TooltipScrollArea>
					<ul className={styles.overflowValues}>
						{values.map((value) => (
							<li key={value}>{value}</li>
						))}
					</ul>
				</TooltipScrollArea>
			}
		>
			{/* rc-select copies this node into the overflow wrapper's `title`; an empty
			    one keeps the browser's own "[object Object]" tooltip out of the way. */}
			<span title="">+{values.length}</span>
		</TooltipSimple>
	);
}

export default OverflowValuesTooltip;
