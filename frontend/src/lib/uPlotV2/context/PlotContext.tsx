import {
	// eslint-disable-next-line no-restricted-imports
	createContext,
	PropsWithChildren,
	useCallback,
	// eslint-disable-next-line no-restricted-imports
	useContext,
	useMemo,
	useRef,
} from 'react';
import {
	LEGEND_HIGHLIGHT_DIM_ALPHA,
	LEGEND_HIGHLIGHT_WIDTH_RATIO,
} from 'lib/uPlotV2/constants';
import type { SeriesVisibilityItem } from 'lib/visualization/panels/types';
import { updateSeriesVisibilityToLocalStorage } from 'lib/visualization/panels/utils/legendVisibilityUtils';
import type uPlot from 'uplot';
export interface PlotContextInitialState {
	uPlotInstance: uPlot | null;
	id?: string;
	shouldSaveSelectionPreference?: boolean;
}
export interface IPlotContext {
	setPlotContextInitialState: (state: PlotContextInitialState) => void;
	onToggleSeriesVisibility: (seriesIndex: number) => void;
	onToggleSeriesOnOff: (seriesIndex: number) => void;
	/** Show this series alone. */
	onShowOnlySeries: (seriesIndex: number) => void;
	/** Show every series again. */
	onShowAllSeries: () => void;
	onFocusSeries: (seriesIndex: number | null) => void;
	/** Lift one series above the rest (dim + thicken) without changing visibility. */
	onHighlightSeries: (seriesIndex: number | null) => void;
	syncSeriesVisibilityToLocalStorage: () => void;
}

export const PlotContext = createContext<IPlotContext | null>(null);

/** Data series (index 0 is the x-axis) currently drawn. */
const countShownSeries = (plot: uPlot): number =>
	plot.series.reduce(
		(count, series, index) =>
			index > 0 && series.show !== false ? count + 1 : count,
		0,
	);

export const PlotContextProvider = ({
	children,
}: PropsWithChildren): JSX.Element => {
	const uPlotInstanceRef = useRef<uPlot | null>(null);
	const activeSeriesIndex = useRef<number | undefined>(undefined);
	const idRef = useRef<string | undefined>(undefined);
	const shouldSavePreferencesRef = useRef<boolean>(false);
	/** Pre-highlight stroke widths, captured on the first highlight so it can be undone. */
	const baseSeriesWidthsRef = useRef<Map<number, number | undefined>>(new Map());
	const highlightedSeriesIndexRef = useRef<number | null>(null);

	const setPlotContextInitialState = useCallback(
		({
			uPlotInstance,
			id,
			shouldSaveSelectionPreference,
		}: PlotContextInitialState): void => {
			uPlotInstanceRef.current = uPlotInstance;
			idRef.current = id;
			activeSeriesIndex.current = undefined;
			baseSeriesWidthsRef.current = new Map();
			highlightedSeriesIndexRef.current = null;
			shouldSavePreferencesRef.current = !!shouldSaveSelectionPreference;
		},
		[],
	);

	const syncSeriesVisibilityToLocalStorage = useCallback((): void => {
		const plot = uPlotInstanceRef.current;
		if (!plot || !idRef.current) {
			return;
		}

		const seriesVisibility: SeriesVisibilityItem[] = plot.series.map(
			(series) => ({
				label: series.label ?? '',
				show: series.show ?? true,
			}),
		);

		updateSeriesVisibilityToLocalStorage(idRef.current, seriesVisibility);
	}, []);

	const onHighlightSeries = useCallback((seriesIndex: number | null): void => {
		const plot = uPlotInstanceRef.current;
		if (!plot) {
			return;
		}

		highlightedSeriesIndexRef.current = seriesIndex;

		plot.series.forEach((series, index) => {
			if (index === 0) {
				return;
			}
			if (!baseSeriesWidthsRef.current.has(index)) {
				baseSeriesWidthsRef.current.set(index, series.width);
			}
			const baseWidth = baseSeriesWidthsRef.current.get(index);
			const isHighlighted = index === seriesIndex;

			/* eslint-disable no-param-reassign */
			series.alpha =
				seriesIndex === null || isHighlighted ? 1 : LEGEND_HIGHLIGHT_DIM_ALPHA;
			series.width =
				isHighlighted && baseWidth !== undefined
					? baseWidth * LEGEND_HIGHLIGHT_WIDTH_RATIO
					: baseWidth;
			/* eslint-enable no-param-reassign */
		});

		// Only the stroke style changed, so the cached paths stay valid.
		plot.redraw(false);
	}, []);

	/**
	 * Leaving the dim on a hidden series leaves every other one faded, which
	 * reads as an isolation rather than as one series being excluded.
	 */
	const clearHighlightIfHidden = useCallback((): void => {
		const plot = uPlotInstanceRef.current;
		const highlightedIndex = highlightedSeriesIndexRef.current;
		if (!plot || highlightedIndex === null) {
			return;
		}

		if (plot.series[highlightedIndex]?.show === false) {
			onHighlightSeries(null);
		}
	}, [onHighlightSeries]);

	const onToggleSeriesVisibility = useCallback(
		(seriesIndex: number): void => {
			const plot = uPlotInstanceRef.current;
			if (!plot) {
				return;
			}

			const isReset = activeSeriesIndex.current === seriesIndex;
			activeSeriesIndex.current = isReset ? undefined : seriesIndex;

			plot.batch(() => {
				plot.series.forEach((_, index) => {
					if (index === 0) {
						return;
					}
					const currentSeriesIndex = index;
					plot.setSeries(currentSeriesIndex, {
						show: isReset || currentSeriesIndex === seriesIndex,
					});
				});
				if (idRef.current && shouldSavePreferencesRef.current) {
					syncSeriesVisibilityToLocalStorage();
				}
			});
		},
		[syncSeriesVisibilityToLocalStorage],
	);

	const onToggleSeriesOnOff = useCallback(
		(seriesIndex: number): void => {
			const plot = uPlotInstanceRef.current;
			if (!plot) {
				return;
			}

			const series = plot.series[seriesIndex];
			if (!series) {
				return;
			}

			// An empty chart is never worth reaching.
			const isHiding = series.show !== false;
			if (isHiding && countShownSeries(plot) <= 1) {
				return;
			}

			plot.setSeries(seriesIndex, { show: !series.show });
			if (idRef.current && shouldSavePreferencesRef.current) {
				syncSeriesVisibilityToLocalStorage();
			}

			clearHighlightIfHidden();
		},
		[syncSeriesVisibilityToLocalStorage, clearHighlightIfHidden],
	);

	/** Applies `resolveShow` to every data series in one batch, then persists. */
	const setSeriesVisibility = useCallback(
		(resolveShow: (seriesIndex: number) => boolean): void => {
			const plot = uPlotInstanceRef.current;
			if (!plot) {
				return;
			}

			activeSeriesIndex.current = undefined;

			plot.batch(() => {
				plot.series.forEach((_, index) => {
					if (index === 0) {
						return;
					}
					plot.setSeries(index, { show: resolveShow(index) });
				});
				if (idRef.current && shouldSavePreferencesRef.current) {
					syncSeriesVisibilityToLocalStorage();
				}
			});

			clearHighlightIfHidden();
		},
		[syncSeriesVisibilityToLocalStorage, clearHighlightIfHidden],
	);

	const onShowOnlySeries = useCallback(
		(seriesIndex: number): void => {
			setSeriesVisibility((index) => index === seriesIndex);
		},
		[setSeriesVisibility],
	);

	const onShowAllSeries = useCallback((): void => {
		setSeriesVisibility(() => true);
	}, [setSeriesVisibility]);

	const onFocusSeries = useCallback((seriesIndex: number | null): void => {
		const plot = uPlotInstanceRef.current;
		if (!plot) {
			return;
		}

		plot.setSeries(
			seriesIndex,
			{
				focus: true,
			},
			false,
		);
	}, []);

	const value = useMemo(
		() => ({
			onToggleSeriesVisibility,
			setPlotContextInitialState,
			onToggleSeriesOnOff,
			onShowOnlySeries,
			onShowAllSeries,
			onFocusSeries,
			onHighlightSeries,
			syncSeriesVisibilityToLocalStorage,
		}),
		[
			onToggleSeriesVisibility,
			setPlotContextInitialState,
			onToggleSeriesOnOff,
			onShowOnlySeries,
			onShowAllSeries,
			onFocusSeries,
			onHighlightSeries,
			syncSeriesVisibilityToLocalStorage,
		],
	);

	return <PlotContext.Provider value={value}>{children}</PlotContext.Provider>;
};

export const usePlotContext = (): IPlotContext => {
	const context = useContext(PlotContext);

	if (!context) {
		throw new Error('Should be used inside the context');
	}

	return context;
};
