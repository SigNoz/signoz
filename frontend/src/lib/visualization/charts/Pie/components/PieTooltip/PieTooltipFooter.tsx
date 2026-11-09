import { MousePointerClick, X } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { Kbd } from '@signozhq/ui/kbd';

import footerStyles from 'lib/visualization/panels/components/TooltipFooter.module.scss';

interface PieTooltipFooterProps {
	isGroup: boolean;
	isPinned: boolean;
	canDrilldown: boolean;
	onUnpin: () => void;
}

/** The timeseries tooltip footer's look, with the pie's click-to-pin hints. */
export default function PieTooltipFooter({
	isGroup,
	isPinned,
	canDrilldown,
	onUnpin,
}: PieTooltipFooterProps): JSX.Element {
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
		<div className={footerStyles.footer} data-testid="pie-tooltip-footer">
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
						<Kbd value="Escape" testId="pie-tooltip-escape-key" />
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
					testId="pie-tooltip-unpin"
					prefix={<X size={10} />}
				>
					<span>Unpin</span>
				</Button>
			)}
		</div>
	);
}
