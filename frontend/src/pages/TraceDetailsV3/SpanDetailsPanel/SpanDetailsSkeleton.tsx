import { Skeleton } from '@signozhq/ui/skeleton';

import styles from './SpanDetailsPanel.module.scss';

const PILL_WIDTHS = [96, 120, 88, 132];

/** Placeholder shaped like the span summary, trace sections and tabs. */
function SpanDetailsSkeleton(): JSX.Element {
	return (
		<div className={styles.panelBody} data-testid="span-details-skeleton">
			<Skeleton
				active
				title={{ width: '55%' }}
				paragraph={{ rows: 1, width: '35%' }}
			/>
			<div className={styles.skeletonPills}>
				{PILL_WIDTHS.map((width) => (
					<Skeleton.Input key={width} active size="small" style={{ width }} />
				))}
			</div>
			<Skeleton.Input active block className={styles.skeletonSection} />
			<Skeleton.Input active block className={styles.skeletonSection} />
			<Skeleton
				active
				title={{ width: '30%' }}
				paragraph={{ rows: 4, width: ['100%', '90%', '95%', '70%'] }}
			/>
		</div>
	);
}

export default SpanDetailsSkeleton;
