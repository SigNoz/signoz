import './Legend.styles.scss';

import cx from 'classnames';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { LegendPosition } from 'types/api/dashboard/getAll';

import { LegendItem } from '../../config/types';
import { UPlotConfigBuilder } from '../../config/UPlotConfigBuilder';
import { usePanelContext } from '../../context/PanelContext';

interface LegendProps {
	placement?: LegendPosition;
	config: UPlotConfigBuilder;
}
export default function Legend({
	placement = LegendPosition.BOTTOM,
	config,
}: LegendProps): JSX.Element {
	const [legendItemsMap, setLegendItemsMap] = useState<
		Record<number, LegendItem>
	>({});
	const [focusedSeriesIndex, setFocusedSeriesIndex] = useState<number | null>(
		null,
	);
	const rafId = useRef<number | null>(null); // requestAnimationFrame id

	const {
		onToggleSeriesVisibility,
		onToggleSeriesOnOff,
		onFocusSeries,
	} = usePanelContext();

	useLayoutEffect(() => {
		setLegendItemsMap(config.getLegendItems());

		config.addHook(
			'setSeries',
			(u: uPlot, seriesIndex: number | null, opts: uPlot.Series) => {
				// eslint-disable-next-line @typescript-eslint/ban-ts-comment
				// @ts-ignore
				if (opts.focus) {
					setFocusedSeriesIndex(seriesIndex);
				}
			},
		);
	}, [config]);

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

	const handleMove = useCallback(
		(e: React.MouseEvent<HTMLDivElement>, seriesIndex: number | null): void => {
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
		handleMove(e, seriesIndex);
	};

	const handleLegendMouseLeave = useCallback((): void => {
		setFocusedSeriesIndex(null);
		onFocusSeries(null);
	}, [onFocusSeries]);

	return (
		<div
			style={{
				flexDirection: placement === LegendPosition.RIGHT ? 'column' : 'row',
				flexWrap: placement === LegendPosition.RIGHT ? 'nowrap' : 'wrap',
			}}
			className="legend-container"
			onClick={handleLegendClick}
			onMouseMove={handleLegendMouseMove}
			onMouseLeave={handleLegendMouseLeave}
		>
			{Object.values(legendItemsMap).map((item) => (
				<div
					key={item.seriesIndex}
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
			))}
		</div>
	);
}
