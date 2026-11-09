import { MousePointerClick, X } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { Kbd } from '@signozhq/ui/kbd';
import logEvent from 'api/common/logEvent';
import { Events } from 'constants/events';
import { DEFAULT_PIN_TOOLTIP_KEY } from 'lib/uPlotV2/plugins/TooltipPlugin/types';

import footerStyles from 'lib/visualization/panels/components/TooltipFooter.module.scss';

import styles from './ChartTooltipFooter.module.scss';
import { Typography } from '@signozhq/ui/typography';

interface ChartTooltipFooterProps {
	id: string;
	pinKey?: string;
	isPinned: boolean;
	canSelectTimeRange?: boolean;
	dismiss: () => void;
}

export default function ChartTooltipFooter({
	id,
	pinKey = DEFAULT_PIN_TOOLTIP_KEY,
	isPinned,
	canSelectTimeRange = true,
	dismiss,
}: ChartTooltipFooterProps): JSX.Element {
	const handleUnpinClick = (): void => {
		void logEvent(Events.TOOLTIP_UNPINNED, {
			id,
		});
		dismiss();
	};

	return (
		<output className={styles.footer} data-testid="entity-chart-tooltip-footer">
			<div>
				{isPinned ? (
					<Typography.Text className={styles.hint} size="small">
						<span>Press</span>
						<Kbd value={pinKey} testId="entity-chart-tooltip-pin-key" />
						<span>or</span>
						<Kbd value="Escape" testId="entity-chart-tooltip-escape-key" />
						<span>to unpin</span>
					</Typography.Text>
				) : (
					<div className={styles.hintList}>
						{canSelectTimeRange && (
							<Typography.Text
								className={styles.hint}
								size="small"
								data-active="false"
							>
								<span className={footerStyles.pointerKey} aria-hidden="true">
									<MousePointerClick size={12} />
								</span>
								<span>Click and drag to zoom into a time range</span>
							</Typography.Text>
						)}
						<Typography.Text className={styles.hint} size="small" data-active="false">
							<span>Press</span>
							<Kbd value={pinKey} testId="entity-chart-tooltip-pin-key" />
							<span>to pin the tooltip</span>
						</Typography.Text>
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
					testId="entity-chart-tooltip-unpin"
					prefix={<X size={10} />}
				>
					<span>Unpin</span>
				</Button>
			)}
		</output>
	);
}
