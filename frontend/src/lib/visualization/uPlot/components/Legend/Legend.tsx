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
	const initialLegendItemsMap = useRef<Record<number, LegendItem>>({});
	const focusedSeriesIndex = useRef<number | null>(null);
	const animationFrameRef = useRef<boolean>(false);
	const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const {
		onToggleSeriesVisibility,
		onToggleSeriesOnOff,
		onFocusSeries,
	} = usePanelContext();

	useLayoutEffect(() => {
		const legendItems = config.getLegendItems();
		const legendItemsMap = legendItems.reduce((acc, item) => {
			acc[item.seriesIndex] = item;
			return acc;
		}, {} as Record<number, LegendItem>);
		initialLegendItemsMap.current = legendItemsMap;
		setLegendItemsMap(legendItemsMap);
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
		[onToggleSeriesVisibility, onToggleSeriesOnOff, getLegendItemIdFromEvent],
	);

	const handleMove = useCallback(
		(e: React.MouseEvent<HTMLDivElement>): void => {
			const legendItemId = getLegendItemIdFromEvent(e);
			const seriesIndex = legendItemId ? Number(legendItemId) : null;
			if (seriesIndex === focusedSeriesIndex.current) {
				return;
			}
			focusedSeriesIndex.current = seriesIndex;
			onFocusSeries(seriesIndex);
		},
		[getLegendItemIdFromEvent, onFocusSeries],
	);

	const handleLegendMouseMove = useCallback(
		(e: React.MouseEvent<HTMLDivElement>): void => {
			if (!animationFrameRef.current) {
				animationFrameRef.current = true;

				requestAnimationFrame(() => {
					if (timeoutRef.current) {
						clearTimeout(timeoutRef.current);
					}
					handleMove(e);
					animationFrameRef.current = false;
				});
			}
		},
		[handleMove],
	);

	const handleLegendMouseLeave = useCallback((): void => {
		focusedSeriesIndex.current = null;
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
						'legend-item-unfocused': !item.focused,
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
