import { MousePointerClick, X } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { Kbd } from '@signozhq/ui/kbd';
import logEvent from 'api/common/logEvent';
import { Events } from 'constants/events';
import { DEFAULT_PIN_TOOLTIP_KEY } from 'lib/uPlotV2/plugins/TooltipPlugin/types';

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
						<Kbd active>{pinKey.toUpperCase()}</Kbd>
						<span>or</span>
						<Kbd active>Esc</Kbd>
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
								<Kbd>
									<MousePointerClick size={12} />
								</Kbd>
								<span>Click and drag to zoom into a time range</span>
							</Typography.Text>
						)}
						<Typography.Text className={styles.hint} size="small" data-active="false">
							<span>Press</span>
							<Kbd>{pinKey.toUpperCase()}</Kbd>
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
					data-testid="entity-chart-tooltip-unpin"
				>
					<X size={10} />
					<span>Unpin</span>
				</Button>
			)}
		</output>
	);
}
