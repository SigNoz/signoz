import {
	createContext,
	PropsWithChildren,
	useCallback,
	useContext,
	useRef,
} from 'react';
import uPlot from 'uplot';

export interface IPanelContext {
	setUPlotInstance: (uPlotInstance: uPlot | null) => void;
	onToggleSeriesVisibility: (seriesIndex: number) => void;
	onToggleSeriesOnOff: (seriesIndex: number) => void;
	onFocusSeries: (seriesIndex: number | null) => void;
}

export const PanelContext = createContext<IPanelContext | null>(null);

export const PanelContextProvider = ({
	children,
}: PropsWithChildren): JSX.Element => {
	const uPlotInstanceRef = useRef<uPlot | null>(null);
	const activeSeriesIndex = useRef<number | undefined>(undefined);

	const setUPlotInstance = useCallback((uPlotInstance: uPlot | null): void => {
		uPlotInstanceRef.current = uPlotInstance;
	}, []);

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
		});
	}, []);

	const onToggleSeriesOnOff = useCallback((seriesIndex: number): void => {
		const plot = uPlotInstanceRef.current;
		if (!plot) {
			return;
		}

		plot.setSeries(seriesIndex, { show: !plot.series[seriesIndex].show });
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

	return (
		<PanelContext.Provider
			value={{
				onToggleSeriesVisibility,
				setUPlotInstance,
				onToggleSeriesOnOff,
				onFocusSeries,
			}}
		>
			{children}
		</PanelContext.Provider>
	);
};

export const usePanelContext = (): IPanelContext => {
	const context = useContext(PanelContext);

	if (!context) {
		throw new Error('Should be used inside the context');
	}

	return context;
};
