import { Button } from '@signozhq/ui/button';
import { Kbd } from '@signozhq/ui/kbd';
import { DEFAULT_PIN_TOOLTIP_KEY } from 'lib/uPlotV2/plugins/TooltipPlugin/types';

import Styles from 'lib/visualization/panels/components/TooltipFooter.module.scss';
import { MousePointerClick, X } from '@signozhq/icons';
import logEvent from 'api/common/logEvent';
import { Events } from 'constants/events';

interface TooltipFooterProps {
	id: string;
	pinKey?: string;
	isPinned: boolean;
	canDrilldown?: boolean;
	dismiss: () => void;
}

export default function TooltipFooter({
	id,
	pinKey = DEFAULT_PIN_TOOLTIP_KEY,
	isPinned,
	canDrilldown = true,
	dismiss,
}: TooltipFooterProps): JSX.Element {
	const handleUnpinClick = (): void => {
		logEvent(Events.TOOLTIP_UNPINNED, {
			id: id,
		});
		dismiss();
	};
	return (
		<div
			className={Styles.footer}
			role="status"
			data-testid="uplot-tooltip-footer"
		>
			<div>
				{isPinned ? (
					<div className={Styles.hint}>
						<span>Press</span>
						<Kbd value={pinKey} testId="uplot-tooltip-pin-key" />
						<span>or</span>
						<Kbd value="Escape" testId="uplot-tooltip-escape-key" />
						<span>to unpin</span>
					</div>
				) : (
					<div className={Styles.hintList}>
						{canDrilldown && (
							<div className={Styles.hint} data-active="false">
								<span className={Styles.pointerKey} aria-hidden="true">
									<MousePointerClick size={12} />
								</span>
								<span>Click to drilldown</span>
							</div>
						)}
						<div className={Styles.hint} data-active="false">
							<span>Press</span>
							<Kbd value={pinKey} testId="uplot-tooltip-pin-key" />
							<span>to pin the tooltip</span>
						</div>
					</div>
				)}
			</div>

			{isPinned && (
				<Button
					variant="outlined"
					color="secondary"
					size="sm"
					onClick={handleUnpinClick}
					aria-label="Unpin tooltip"
					testId="uplot-tooltip-unpin"
					prefix={<X size={10} />}
				>
					<span>Unpin</span>
				</Button>
			)}
		</div>
	);
}
