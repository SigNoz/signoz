import { formatCount, formatShare } from './heatmapTooltipContent';
import { HeatmapContributionRow } from './types';

import Styles from './HeatmapTooltip.module.scss';

/** Only shown when the cell sums more than one group. */
export default function HeatmapContributionList({
	rows,
}: {
	rows: HeatmapContributionRow[];
}): JSX.Element {
	return (
		<div className={Styles.rows} data-testid="heatmap-tooltip-contribution">
			<div className={Styles.columnHeader}>
				<span>Group</span>
				<span>Contribution</span>
			</div>
			{rows.map((row) => (
				<div
					key={row.label}
					className={Styles.row}
					data-testid="heatmap-tooltip-contribution-row"
				>
					<span
						className={Styles.marker}
						style={{ borderColor: row.color, backgroundColor: row.color }}
						data-is-legend-marker={true}
					/>
					<span className={Styles.rowLabel}>{row.label}</span>
					<span className={Styles.rowSeparator} style={{ borderColor: row.color }} />
					<span className={Styles.rowValue}>{formatCount(row.count)}</span>
					<span
						className={Styles.rowShare}
						data-testid="heatmap-tooltip-contribution-share"
					>
						{formatShare(row.share)}
					</span>
				</div>
			))}
		</div>
	);
}
