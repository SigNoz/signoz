import cx from 'classnames';

import { formatCount } from './heatmapTooltipContent';
import { HeatmapBucketRow } from './types';

import Styles from './HeatmapTooltip.module.scss';

/** The buckets either side of the hovered one, so a mode reads as a shape rather
 *  than a single number. */
export default function HeatmapBucketList({
	rows,
}: {
	rows: HeatmapBucketRow[];
}): JSX.Element {
	return (
		<div className={Styles.rows} data-testid="heatmap-tooltip-buckets">
			{rows.map((bucket) => (
				<div
					key={bucket.row}
					className={cx(Styles.row, { [Styles.rowHovered]: bucket.isHovered })}
					data-hovered={bucket.isHovered}
					data-testid="heatmap-tooltip-bucket-row"
				>
					<span className={Styles.rowLabel}>{bucket.label}</span>
					<span className={Styles.rowSeparator} />
					<span className={Styles.rowValue}>{formatCount(bucket.count)}</span>
				</div>
			))}
		</div>
	);
}
