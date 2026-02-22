import {
	Dispatch,
	SetStateAction,
	useCallback,
	useEffect,
	useRef,
} from 'react';
import { usePlotContext } from 'lib/uPlotV2/context/PlotContext';

export function useLegendActions({
	setFocusedSeriesIndex,
	focusedSeriesIndex,
}: {
	setFocusedSeriesIndex: Dispatch<SetStateAction<number | null>>;
	focusedSeriesIndex: number | null;
}): {
	onLegendClick: (e: React.MouseEvent<HTMLDivElement>) => void;
	onFocusSeries: (seriesIndex: number | null) => void;
	onLegendMouseMove: (e: React.MouseEvent<HTMLDivElement>) => void;
	onLegendMouseLeave: () => void;
} {
	const {
		onFocusSeries: onFocusSeriesPlot,
		onToggleSeriesOnOff,
		onToggleSeriesVisibility,
	} = usePlotContext();

	const rafId = useRef<number | null>(null); // requestAnimationFrame id

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

	const onLegendClick = useCallback(
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

	const onFocusSeries = useCallback(
		(seriesIndex: number | null): void => {
			if (rafId.current != null) {
				cancelAnimationFrame(rafId.current);
			}
			rafId.current = requestAnimationFrame(() => {
				setFocusedSeriesIndex(seriesIndex);
				onFocusSeriesPlot(seriesIndex);
			});
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[onFocusSeriesPlot],
	);

	const onLegendMouseMove = (e: React.MouseEvent<HTMLDivElement>): void => {
		const legendItemId = getLegendItemIdFromEvent(e);
		const seriesIndex = legendItemId ? Number(legendItemId) : null;
		if (seriesIndex === focusedSeriesIndex) {
			return;
		}
		onFocusSeries(seriesIndex);
	};

	const onLegendMouseLeave = useCallback(
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
	return {
		onLegendClick,
		onFocusSeries,
		onLegendMouseMove,
		onLegendMouseLeave,
	};
}
