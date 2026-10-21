import { useMemo } from 'react';
import cx from 'classnames';
import { Pin } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { Typography } from '@signozhq/ui/typography';

import { ScatterTooltipProps } from '../types';
import { buildChannelRows, resolveHoveredPoint } from './scatterTooltipContent';

import Styles from './ScatterTooltip.module.scss';

/** Own component: the shared Tooltip lists one row per series at a shared x. */
export default function ScatterTooltip({
	uPlotInstance,
	dataIndexes,
	seriesIndex,
	channels,
	resolvePointGroupValues,
	decimalPrecision,
	isPinned,
	dismiss,
	renderTooltipFooter,
}: ScatterTooltipProps): JSX.Element | null {
	const hoveredPoint = useMemo(
		() => resolveHoveredPoint(uPlotInstance, seriesIndex, dataIndexes),
		[uPlotInstance, seriesIndex, dataIndexes],
	);

	const rows = useMemo(
		() =>
			hoveredPoint
				? buildChannelRows(hoveredPoint, channels, decimalPrecision)
				: [],
		[hoveredPoint, channels, decimalPrecision],
	);

	const labels = useMemo(
		() =>
			hoveredPoint
				? (resolvePointGroupValues?.(
						hoveredPoint.seriesIndex,
						hoveredPoint.dataIndex,
					) ?? [])
				: [],
		[hoveredPoint, resolvePointGroupValues],
	);

	if (!hoveredPoint) {
		return null;
	}

	return (
		<div
			className={cx(Styles.container, { [Styles.pinned]: isPinned })}
			data-pinned={isPinned}
			data-testid="scatter-tooltip"
		>
			<div className={Styles.header}>
				<span
					className={Styles.marker}
					style={{ backgroundColor: hoveredPoint.color }}
				/>
				<Typography.Text
					as="span"
					className={Styles.title}
					title={hoveredPoint.label}
					testId="scatter-tooltip-title"
				>
					{hoveredPoint.label}
				</Typography.Text>
				{isPinned && (
					<Button
						variant="ghost"
						color="secondary"
						size="sm"
						prefix={<Pin size={12} />}
						testId="scatter-tooltip-status"
					>
						Pinned
					</Button>
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
						<Typography.Text as="span" className={Styles.rowLabel}>
							{row.label}
						</Typography.Text>
						<Typography.Text as="span" className={Styles.rowValue}>
							{row.value}
						</Typography.Text>
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
								<Typography.Text
									as="span"
									className={Styles.rowLabel}
									title={label.key}
								>
									{label.key}
								</Typography.Text>
								<Typography.Text
									as="span"
									className={Styles.rowValue}
									title={label.value}
								>
									{label.value}
								</Typography.Text>
							</div>
						))}
					</div>
				</>
			)}

			{renderTooltipFooter?.({ isPinned, dismiss })}
		</div>
	);
}
