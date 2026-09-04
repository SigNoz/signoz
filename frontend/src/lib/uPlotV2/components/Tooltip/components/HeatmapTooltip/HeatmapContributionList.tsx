import {
	formatCount,
	formatPercent,
	HeatmapContributionRow,
} from './heatmapTooltipContent';

import Styles from './HeatmapTooltip.module.scss';

/** Only shown when the cell sums more than one group. */
export default function HeatmapContributionList({
	rows,
	groupByLabel,
}: {
	rows: HeatmapContributionRow[];
	/** The `groupBy` keys these rows are by. */
	groupByLabel: string;
}): JSX.Element {
	return (
		<div className={Styles.rows} data-testid="heatmap-tooltip-contribution">
			{groupByLabel && <span className={Styles.section}>{groupByLabel}</span>}
			{rows.map((row) => (
				<div
					key={row.label}
					className={Styles.row}
					data-testid="heatmap-tooltip-contribution-row"
				>
					<span
						className={Styles.marker}
						style={{ background: row.color }}
						data-is-legend-marker={true}
					/>
					<span className={Styles.rowLabel}>{row.label}</span>
					<span className={Styles.rowValue}>{formatCount(row.count)}</span>
					<span className={Styles.rowPercent}>{formatPercent(row.percent)}</span>
				</div>
			))}
		</div>
	);
}
