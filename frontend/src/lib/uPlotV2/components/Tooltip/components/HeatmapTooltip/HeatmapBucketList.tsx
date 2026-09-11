import cx from 'classnames';

import { formatCount, HeatmapBucketRow } from './heatmapTooltipContent';

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
			{rows.map((row) => (
				<div
					key={row.label}
					className={cx(Styles.row, { [Styles.rowHovered]: row.isHovered })}
					data-hovered={row.isHovered}
					data-testid="heatmap-tooltip-bucket-row"
				>
					<span className={Styles.rowLabel}>{row.label}</span>
					<span className={Styles.rowValue}>{formatCount(row.count)}</span>
				</div>
			))}
		</div>
	);
}
