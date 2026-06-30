import { CalendarClock, Link2, Timer } from '@signozhq/icons';
import { getYAxisFormattedValue } from 'components/Graph/yAxisConfig';
import dayjs from 'dayjs';
import KeyValueLabel from 'periscope/components/KeyValueLabel';
import { SpanV3 } from 'types/api/trace/getTraceV3';

import { HIGHLIGHTED_OPTIONS } from './config';
import {
	LinkedSpansPanel,
	LinkedSpansToggle,
	useLinkedSpans,
} from './LinkedSpans/LinkedSpans';
import SpanPercentileBadge from './SpanPercentile/SpanPercentileBadge';
import SpanPercentilePanel from './SpanPercentile/SpanPercentilePanel';
import useSpanPercentile from './SpanPercentile/useSpanPercentile';

import styles from './SpanSummary.module.scss';

interface SpanSummaryProps {
	selectedSpan: SpanV3;
	traceStartTime?: number;
	traceEndTime?: number;
}

// Summary block shown above (narrow) / beside (wide) the tabs: span name +
// percentile, exec time / timestamp / linked spans, and the highlighted options.
function SpanSummary({
	selectedSpan,
	traceStartTime,
	traceEndTime,
}: SpanSummaryProps): JSX.Element {
	const percentile = useSpanPercentile(selectedSpan);
	const linkedSpans = useLinkedSpans((selectedSpan as any).references);

	return (
		<>
			<div className={styles.spanRow}>
				<KeyValueLabel
					badgeKey="Span name"
					badgeValue={selectedSpan.name}
					maxCharacters={50}
				/>
				<SpanPercentileBadge
					loading={percentile.loading}
					percentileValue={percentile.percentileValue}
					duration={percentile.duration}
					spanPercentileData={percentile.spanPercentileData}
					isOpen={percentile.isOpen}
					toggleOpen={percentile.toggleOpen}
				/>
			</div>

			<SpanPercentilePanel selectedSpan={selectedSpan} percentile={percentile} />

			<div className={styles.spanInfo}>
				<div className={styles.spanInfoItem}>
					<Timer size={14} />
					<span>
						{getYAxisFormattedValue(`${selectedSpan.duration_nano / 1000000}`, 'ms')}
						{traceStartTime && traceEndTime && traceEndTime > traceStartTime && (
							<>
								{' — '}
								<strong>
									{(
										(selectedSpan.duration_nano * 100) /
										((traceEndTime - traceStartTime) * 1e6)
									).toFixed(2)}
									%
								</strong>
								{' of total exec time'}
							</>
						)}
					</span>
				</div>
				<div className={styles.spanInfoItem}>
					<CalendarClock size={14} />
					<span>
						{dayjs(selectedSpan.timestamp).format('HH:mm:ss — MMM D, YYYY')}
					</span>
				</div>
				<div className={styles.spanInfoItem}>
					<Link2 size={14} />
					<LinkedSpansToggle
						count={linkedSpans.count}
						isOpen={linkedSpans.isOpen}
						toggleOpen={linkedSpans.toggleOpen}
					/>
				</div>
			</div>

			<LinkedSpansPanel
				linkedSpans={linkedSpans.linkedSpans}
				isOpen={linkedSpans.isOpen}
			/>

			<div className={styles.highlightedOptions}>
				{HIGHLIGHTED_OPTIONS.map((option) => {
					const rendered = option.render(selectedSpan);
					if (!rendered) {
						return null;
					}
					return (
						<KeyValueLabel
							key={option.key}
							badgeKey={option.label}
							badgeValue={rendered}
							direction="column"
						/>
					);
				})}
			</div>
		</>
	);
}

export default SpanSummary;
