import {
	createContext,
	PropsWithChildren,
	useCallback,
	useContext,
	useMemo,
	useRef,
} from 'react';
import type { SeriesVisibilityItem } from 'container/DashboardContainer/visualization/panels/types';
import { updateSeriesVisibilityToLocalStorage } from 'container/DashboardContainer/visualization/panels/utils/legendVisibilityUtils';
import type uPlot from 'uplot';

export interface PlotContextInitialState {
	uPlotInstance: uPlot | null;
	widgetId?: string;
}
export interface IPlotContext {
	setPlotContextInitialState: (state: PlotContextInitialState) => void;
	onToggleSeriesVisibility: (seriesIndex: number) => void;
	onToggleSeriesOnOff: (seriesIndex: number) => void;
	onFocusSeries: (seriesIndex: number | null) => void;
}

export const PlotContext = createContext<IPlotContext | null>(null);

export const PlotContextProvider = ({
	children,
}: PropsWithChildren): JSX.Element => {
	const uPlotInstanceRef = useRef<uPlot | null>(null);
	const activeSeriesIndex = useRef<number | undefined>(undefined);
	const widgetIdRef = useRef<string | undefined>(undefined);

	const setPlotContextInitialState = useCallback(
		({ uPlotInstance, widgetId }: PlotContextInitialState): void => {
			uPlotInstanceRef.current = uPlotInstance;
			widgetIdRef.current = widgetId;
			activeSeriesIndex.current = undefined;
		},
		[],
	);

	const onToggleSeriesVisibility = useCallback((seriesIndex: number): void => {
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
			if (widgetIdRef.current) {
				const seriesVisibility: SeriesVisibilityItem[] = plot.series.map(
					(series) => ({
						label: series.label ?? '',
						show: series.show ?? true,
					}),
				);
				updateSeriesVisibilityToLocalStorage(widgetIdRef.current, seriesVisibility);
			}
		});
	}, []);

	const onToggleSeriesOnOff = useCallback((seriesIndex: number): void => {
		const plot = uPlotInstanceRef.current;
		if (!plot) {
			return;
		}

		const series = plot.series[seriesIndex];
		if (!series) {
			return;
		}
		plot.setSeries(seriesIndex, { show: !series.show });
		if (widgetIdRef.current) {
			const seriesVisibility: SeriesVisibilityItem[] = plot.series.map(
				(series) => ({
					label: series.label ?? '',
					show: series.show ?? true,
				}),
			);
			updateSeriesVisibilityToLocalStorage(widgetIdRef.current, seriesVisibility);
		}
	}, []);

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
			onFocusSeries,
		}),
		[
			onToggleSeriesVisibility,
			setPlotContextInitialState,
			onToggleSeriesOnOff,
			onFocusSeries,
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
