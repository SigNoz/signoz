import './Legend.styles.scss';
import { Tooltip as AntdTooltip } from 'antd';

import cx from 'classnames';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Virtuoso } from 'react-virtuoso';
import { LegendPosition } from 'types/api/dashboard/getAll';
import { LegendItem } from '../../config/types';
import { UPlotConfigBuilder } from '../../config/UPlotConfigBuilder';
import { usePlotContext } from '../../context/PlotContext';
import useLegendsSync from 'lib/visualization/hooks/useLegendsSync';

const LEGENDS_PER_SET_DEFAULT = 5;

export interface LegendConfig {
	position: LegendPosition;
}
interface LegendProps {
	position?: LegendPosition;
	config: UPlotConfigBuilder;
	legendsPerSet?: number;
}
export default function Legend({
	position: _position = LegendPosition.BOTTOM,
	config,
}: LegendProps): JSX.Element {
	const {
		legendItemsMap,
		focusedSeriesIndex,
		setFocusedSeriesIndex,
	} = useLegendsSync(config);
	const legendContainerRef = useRef<HTMLDivElement | null>(null);

	const rafId = useRef<number | null>(null); // requestAnimationFrame id
	const {
		onToggleSeriesVisibility,
		onToggleSeriesOnOff,
		onFocusSeries,
	} = usePlotContext();

	const getLegendItemIdFromEvent = useCallback(
		(e: React.MouseEvent<HTMLDivElement>): string | undefined => {
			const target = e.target as HTMLElement | null;
			if (!target) {
				return undefined;
			}

			const legendItemElement = target.closest<HTMLElement>(
				'[data-legend-item-id]',
			);

			return legendItemElement?.dataset.legendItemId;
		},
		[],
	);

	const handleLegendClick = useCallback(
		(e: React.MouseEvent<HTMLDivElement>): void => {
			const legendItemId = getLegendItemIdFromEvent(e);
			if (!legendItemId) {
				return;
			}
			const isLegendMarker = (e.target as HTMLElement).dataset.isLegendMarker;
			const seriesIndex = Number(legendItemId);

			if (isLegendMarker) {
				onToggleSeriesOnOff(seriesIndex);
				return;
			}

			onToggleSeriesVisibility(seriesIndex);
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[onToggleSeriesVisibility, onToggleSeriesOnOff, getLegendItemIdFromEvent],
	);

	const handleFocusSeries = useCallback(
		(seriesIndex: number | null): void => {
			if (rafId.current != null) {
				cancelAnimationFrame(rafId.current);
			}
			rafId.current = requestAnimationFrame(() => {
				setFocusedSeriesIndex(seriesIndex);
				onFocusSeries(seriesIndex);
			});
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[onFocusSeries],
	);

	const handleLegendMouseMove = (e: React.MouseEvent<HTMLDivElement>): void => {
		const legendItemId = getLegendItemIdFromEvent(e);
		const seriesIndex = legendItemId ? Number(legendItemId) : null;
		if (seriesIndex === focusedSeriesIndex) {
			return;
		}
		handleFocusSeries(seriesIndex);
	};

	const handleLegendMouseLeave = useCallback(
		(): void => {
			// Cancel any pending RAF from handleFocusSeries to prevent race condition
			if (rafId.current != null) {
				cancelAnimationFrame(rafId.current);
				rafId.current = null;
			}
			setFocusedSeriesIndex(null);
			onFocusSeries(null);
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[onFocusSeries],
	);

	// Cleanup pending animation frames on unmount
	useEffect(
		() => (): void => {
			if (rafId.current != null) {
				cancelAnimationFrame(rafId.current);
			}
		},
		[],
	);

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
			<div key={rowIndex} className="legend-row">
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
		[focusedSeriesIndex],
	);

	return (
		<div
			ref={legendContainerRef}
			className="legend-container"
			onClick={handleLegendClick}
			onMouseMove={handleLegendMouseMove}
			onMouseLeave={handleLegendMouseLeave}
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
