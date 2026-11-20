import { ChartNoAxesGantt, TriangleAlert } from '@signozhq/icons';
import cx from 'classnames';

import styles from './SpanDrawerTraceSection.module.scss';

type TraceCountsProps = {
	totalSpansCount: number | undefined;
	totalErrorSpansCount: number | undefined;
};

function TraceCounts({
	totalSpansCount,
	totalErrorSpansCount,
}: TraceCountsProps): JSX.Element | null {
	if (totalSpansCount === undefined) {
		return null;
	}
	const errors = totalErrorSpansCount ?? 0;

	return (
		<span className={styles.counts} data-testid="span-drawer-trace-counts">
			<span className={styles.countItem}>
				<ChartNoAxesGantt size={13} />
				Spans: {totalSpansCount}
			</span>
			<span className={cx(styles.countItem, { [styles.hasErrors]: errors > 0 })}>
				<TriangleAlert size={13} />
				Errors: {errors}
			</span>
		</span>
	);
}

export default TraceCounts;
