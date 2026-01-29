import './Legend.styles.scss';
import { Tooltip as AntdTooltip } from 'antd';

import cx from 'classnames';
import { get } from 'lodash-es';
import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import { Virtuoso } from 'react-virtuoso';
import { LegendPosition } from 'types/api/dashboard/getAll';
import type uPlot from 'uplot';

import { LegendItem } from '../../config/types';
import { UPlotConfigBuilder } from '../../config/UPlotConfigBuilder';
import { usePlotContext } from '../../context/PlotContext';

const LEGENDS_PER_SET_DEFAULT = 5;

export interface LegendConfig {
	position: LegendPosition;
}
interface LegendProps {
	position?: LegendPosition;
	config: UPlotConfigBuilder;
}
export default function Legend({
	position: _position = LegendPosition.BOTTOM,
	config,
}: LegendProps): JSX.Element {
	const [legendItemsMap, setLegendItemsMap] = useState<
		Record<number, LegendItem>
	>({});
	const [focusedSeriesIndex, setFocusedSeriesIndex] = useState<number | null>(
		null,
	);
	const legendContainerRef = useRef<HTMLDivElement | null>(null);

	const rafId = useRef<number | null>(null); // requestAnimationFrame id
	const visibilityUpdatesRef = useRef<Record<number, boolean>>({});
	const visibilityRafIdRef = useRef<number | null>(null);
	const {
		onToggleSeriesVisibility,
		onToggleSeriesOnOff,
		onFocusSeries,
	} = usePlotContext();

	const applyVisibilityUpdates = useCallback(
		(updates: Record<number, boolean>): void => {
			setLegendItemsMap(
				(prev): Record<number, LegendItem> => {
					let hasChanges = false;
					const next = { ...prev };

					for (const [idxStr, visible] of Object.entries(updates)) {
						const idx = Number(idxStr);
						const current = next[idx];
						if (!current || current.visible === visible) {
							continue;
						}
						next[idx] = { ...current, visible };
						hasChanges = true;
					}

					return hasChanges ? next : prev;
				},
			);
		},
		[],
	);

	const queueVisibilityUpdate = useCallback(
		(seriesIndex: number, show: boolean): void => {
			// Accumulate visibility updates
			visibilityUpdatesRef.current[seriesIndex] = show;

			// Schedule a single state update per frame
			if (visibilityRafIdRef.current !== null) {
				return;
			}

			visibilityRafIdRef.current = requestAnimationFrame(() => {
				const updates = visibilityUpdatesRef.current;
				visibilityUpdatesRef.current = {};
				visibilityRafIdRef.current = null;

				applyVisibilityUpdates(updates);
			});
		},
		[applyVisibilityUpdates],
	);

	const handleSetSeries = useCallback(
		(_u: uPlot, seriesIndex: number | null, opts: uPlot.Series): void => {
			// Using get because focus is not a property of uPlot.Series, but it's present in the opts.
			if (get(opts, 'focus', false)) {
				setFocusedSeriesIndex(seriesIndex);
			}

			// Keep legend visibility in sync with uPlot series visibility.
			if (!seriesIndex || typeof opts.show !== 'boolean') {
				return;
			}

			queueVisibilityUpdate(seriesIndex, opts.show);
		},
		[queueVisibilityUpdate],
	);

	useLayoutEffect(() => {
		setLegendItemsMap(config.getLegendItems());

		const removeHook = config.addHook('setSeries', handleSetSeries);

		return (): void => {
			removeHook();
		};
	}, [config, handleSetSeries]);

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

	const handleLegendMouseLeave = useCallback((): void => {
		// Cancel any pending RAF from handleFocusSeries to prevent race condition
		if (rafId.current != null) {
			cancelAnimationFrame(rafId.current);
			rafId.current = null;
		}
		setFocusedSeriesIndex(null);
		onFocusSeries(null);
	}, [onFocusSeries]);

	// Cleanup pending animation frames on unmount
	useEffect(
		() => (): void => {
			if (rafId.current != null) {
				cancelAnimationFrame(rafId.current);
			}
			if (visibilityRafIdRef.current != null) {
				cancelAnimationFrame(visibilityRafIdRef.current);
			}
		},
		[],
	);

	// Chunk legend items into rows of LEGENDS_PER_ROW items each
	const legendRows = useMemo(() => {
		const items = Object.values(legendItemsMap);
		const rows: LegendItem[][] = [];

		for (let i = 0; i < items.length; i += LEGENDS_PER_SET_DEFAULT) {
			rows.push(items.slice(i, i + LEGENDS_PER_SET_DEFAULT));
		}

		return rows;
	}, [legendItemsMap]);

	const renderLegendRow = useCallback(
		(rowIndex: number, row: LegendItem[]): JSX.Element => (
			<div key={rowIndex} className="legend-row">
				{row.map((item) => (
					<AntdTooltip key={item.seriesIndex} title={item.label}>
						<div
							data-legend-item-id={item.seriesIndex}
							className={cx('legend-item', {
								'legend-item-off': !item.visible,
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
