import { MousePointerClick, X } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { Kbd } from '@signozhq/ui/kbd';

import footerStyles from './TooltipFooter.module.scss';

interface GroupedTooltipFooterProps {
	isGroup: boolean;
	isPinned: boolean;
	canDrilldown: boolean;
	onUnpin: () => void;
}

/**
 * The time-series tooltip footer's look, with the click-to-pin hints of a grouped item
 * (Pie's Other slice, Distribution's Other bar) whose series are picked once pinned.
 */
export default function GroupedTooltipFooter({
	isGroup,
	isPinned,
	canDrilldown,
	onUnpin,
}: GroupedTooltipFooterProps): JSX.Element {
	let clickHint = canDrilldown ? 'Click to drilldown' : null;
	if (isGroup) {
		clickHint = canDrilldown
			? 'Click to pin, then pick a series'
			: 'Click to pin the tooltip';
	}
	if (isPinned) {
		clickHint = canDrilldown ? 'Click a series to drilldown' : null;
	}

	return (
		<div className={footerStyles.footer} data-testid="grouped-tooltip-footer">
			<div className={footerStyles.hintList}>
				{clickHint && (
					<div className={footerStyles.hint} data-active="false">
						<span className={footerStyles.pointerKey} aria-hidden="true">
							<MousePointerClick size={12} />
						</span>
						<span>{clickHint}</span>
					</div>
				)}
				{isPinned && (
					<div className={footerStyles.hint} data-active="false">
						<span>Press</span>
						<Kbd value="Escape" testId="grouped-tooltip-escape-key" />
						<span>to unpin</span>
					</div>
				)}
			</div>

			{isPinned && (
				<Button
					variant="outlined"
					color="secondary"
					size="sm"
					onClick={onUnpin}
					aria-label="Unpin tooltip"
					testId="grouped-tooltip-unpin"
					prefix={<X size={10} />}
				>
					<span>Unpin</span>
				</Button>
			)}
		</div>
	);
}
