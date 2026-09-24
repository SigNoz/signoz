import { useMemo } from 'react';
import cx from 'classnames';
import { Pin } from '@signozhq/icons';

import { ScatterTooltipProps } from '../types';
import { buildChannelRows, resolveHoveredPoint } from './scatterTooltipContent';

import Styles from './ScatterTooltip.module.scss';

/**
 * One point, its channels, then the group values that name it. Purpose-built
 * rather than composed from the shared `Tooltip`, whose list is one row per
 * series at a shared x; a scatter point has no such neighbours.
 */
export default function ScatterTooltip({
	uPlotInstance,
	dataIndexes,
	seriesIndex,
	channels,
	resolvePointLabels,
	decimalPrecision,
	isPinned,
	dismiss,
	renderTooltipFooter,
}: ScatterTooltipProps): JSX.Element | null {
	const point = useMemo(
		() => resolveHoveredPoint(uPlotInstance, seriesIndex, dataIndexes),
		[uPlotInstance, seriesIndex, dataIndexes],
	);

	const rows = useMemo(
		() => (point ? buildChannelRows(point, channels, decimalPrecision) : []),
		[point, channels, decimalPrecision],
	);

	const labels = useMemo(
		() =>
			point
				? (resolvePointLabels?.(point.seriesIndex, point.dataIndex) ?? [])
				: [],
		[point, resolvePointLabels],
	);

	if (!point) {
		return null;
	}

	return (
		<div
			className={cx(Styles.container, { [Styles.pinned]: isPinned })}
			data-pinned={isPinned}
			data-testid="scatter-tooltip"
		>
			<div className={Styles.header}>
				<span className={Styles.marker} style={{ backgroundColor: point.color }} />
				<span
					className={Styles.title}
					title={point.label}
					data-testid="scatter-tooltip-title"
				>
					{point.label}
				</span>
				{isPinned && (
					<span className={Styles.status} data-testid="scatter-tooltip-status">
						<Pin size={12} />
						<span>Pinned</span>
					</span>
				)}
			</div>

			<span className={Styles.divider} />

			<div className={Styles.rows}>
				{rows.map((row) => (
					<div
						key={row.label}
						className={Styles.row}
						data-testid="scatter-tooltip-row"
					>
						<span className={Styles.rowLabel}>{row.label}</span>
						<span className={Styles.rowValue}>{row.value}</span>
					</div>
				))}
			</div>

			{labels.length > 0 && (
				<>
					<span className={Styles.divider} />
					<div className={Styles.rows}>
						{labels.map((label) => (
							<div
								key={label.key}
								className={cx(Styles.row, Styles.rowMuted)}
								data-testid="scatter-tooltip-label"
							>
								<span className={Styles.rowLabel} title={label.key}>
									{label.key}
								</span>
								<span className={Styles.rowValue} title={label.value}>
									{label.value}
								</span>
							</div>
						))}
					</div>
				</>
			)}

			{renderTooltipFooter?.({ isPinned, dismiss })}
		</div>
	);
}
