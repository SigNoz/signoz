import { useCallback, useMemo, useRef } from 'react';
import { Virtuoso } from 'react-virtuoso';
import { Tooltip as AntdTooltip } from 'antd';
import cx from 'classnames';
import { LegendItem } from 'lib/uPlotV2/config/types';
import { LegendPosition } from 'types/api/dashboard/getAll';

import { LegendProps } from '../types';
import { useLegendActions } from './useLegendActions';

import './Legend.styles.scss';

const LEGENDS_PER_SET_DEFAULT = 5;

export default function Legend({
	position = LegendPosition.BOTTOM,
	config,
}: LegendProps): JSX.Element {
	const {
		onLegendClick,
		onLegendMouseMove,
		onLegendMouseLeave,
		legendItemsMap,
		focusedSeriesIndex,
	} = useLegendActions({ config });
	const legendContainerRef = useRef<HTMLDivElement | null>(null);

	// Chunk legend items into rows of LEGENDS_PER_ROW items each
	const legendRows = useMemo(() => {
		const legendItems = Object.values(legendItemsMap);
		if (LEGENDS_PER_SET_DEFAULT >= legendItems.length) {
			return [legendItems];
		}

		return legendItems.reduce((acc: LegendItem[][], curr, i) => {
			if (i % LEGENDS_PER_SET_DEFAULT === 0) {
				acc.push([]);
			}
			acc[acc.length - 1].push(curr);
			return acc;
		}, [] as LegendItem[][]);
	}, [legendItemsMap]);

	const renderLegendRow = useCallback(
		(rowIndex: number, row: LegendItem[]): JSX.Element => (
			<div
				key={rowIndex}
				className={cx(
					'legend-row',
					`legend-row-${position.toLowerCase()}`,
					legendRows.length === 1 && position === LegendPosition.BOTTOM
						? 'legend-single-row'
						: '',
				)}
			>
				{row.map((item) => (
					<AntdTooltip key={item.seriesIndex} title={item.label}>
						<div
							data-legend-item-id={item.seriesIndex}
							className={cx('legend-item', {
								'legend-item-off': !item.show,
								'legend-item-focused': focusedSeriesIndex === item.seriesIndex,
							})}
						>
							<div
								className="legend-marker"
								style={{ borderColor: String(item.color) }}
								data-is-legend-marker={true}
							/>
							<span className="legend-label">{item.label}</span>
						</div>
					</AntdTooltip>
				))}
			</div>
		),
		[focusedSeriesIndex, position, legendRows],
	);

	return (
		<div
			ref={legendContainerRef}
			className="legend-container"
			onClick={onLegendClick}
			onMouseMove={onLegendMouseMove}
			onMouseLeave={onLegendMouseLeave}
		>
			<Virtuoso
				style={{
					height: '100%',
					width: '100%',
				}}
				data={legendRows}
				itemContent={(index, row): JSX.Element => renderLegendRow(index, row)}
			/>
		</div>
	);
}
