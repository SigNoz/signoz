import {
	MutableRefObject,
	useCallback,
	useLayoutEffect,
	useMemo,
	useRef,
} from 'react';
import { UPlotConfigBuilder } from 'lib/uPlotV2/config/UPlotConfigBuilder';
import { has } from 'lodash-es';
import uPlot from 'uplot';

import { stackSeries } from '../charts/utils/stackSeriesUtils';

/** Returns true if the series at the given index is hidden (e.g. via legend toggle). */
function isSeriesHidden(plot: uPlot, seriesIndex: number): boolean {
	return !plot.series[seriesIndex]?.show;
}

function canApplyStacking(
	unstackedData: uPlot.AlignedData | null,
	plot: uPlot,
	isUpdating: boolean,
): boolean {
	return (
		!isUpdating &&
		!!unstackedData &&
		!!plot.data &&
		unstackedData[0]?.length === plot.data[0]?.length
	);
}

function setupStackingHooks(
	config: UPlotConfigBuilder,
	applyStackingToChart: (plot: uPlot) => void,
	isUpdatingRef: MutableRefObject<boolean>,
): () => void {
	const onDataChange = (plot: uPlot): void => {
		if (!isUpdatingRef.current) {
			applyStackingToChart(plot);
		}
	};

	const onSeriesVisibilityChange = (
		plot: uPlot,
		_seriesIdx: number | null,
		opts: uPlot.Series,
	): void => {
		if (!has(opts, 'focus')) {
			applyStackingToChart(plot);
		}
	};

	const removeSetDataHook = config.addHook('setData', onDataChange);
	const removeSetSeriesHook = config.addHook(
		'setSeries',
		onSeriesVisibilityChange,
	);

	return (): void => {
		removeSetDataHook?.();
		removeSetSeriesHook?.();
	};
}

export interface UseBarChartStackingParams {
	data: uPlot.AlignedData;
	isStackedBarChart?: boolean;
	config: UPlotConfigBuilder | null;
}

/**
 * Handles stacking for bar charts: computes initial stacked data and re-stacks
 * when data or series visibility changes (e.g. legend toggles).
 */
export function useBarChartStacking({
	data,
	isStackedBarChart = false,
	config,
}: UseBarChartStackingParams): uPlot.AlignedData {
	// Store unstacked source data so uPlot hooks can access it (hooks run outside React's render cycle)
	const unstackedDataRef = useRef<uPlot.AlignedData | null>(null);
	unstackedDataRef.current = isStackedBarChart ? data : null;

	// Prevents re-entrant calls when we update chart data (avoids infinite loop in setData hook)
	const isUpdatingChartRef = useRef(false);

	const chartData = useMemo((): uPlot.AlignedData => {
		if (!isStackedBarChart || !data || data.length < 2) {
			return data;
		}
		const noSeriesHidden = (): boolean => false; // include all series in initial stack
		const { data: stacked } = stackSeries(data, noSeriesHidden);
		return stacked;
	}, [data, isStackedBarChart]);

	const applyStackingToChart = useCallback((plot: uPlot): void => {
		const unstacked = unstackedDataRef.current;
		if (
			!unstacked ||
			!canApplyStacking(unstacked, plot, isUpdatingChartRef.current)
		) {
			return;
		}

		const shouldExcludeSeries = (idx: number): boolean =>
			isSeriesHidden(plot, idx);
		const { data: stacked, bands } = stackSeries(unstacked, shouldExcludeSeries);

		plot.delBand(null);
		bands.forEach((band: uPlot.Band) => plot.addBand(band));

		isUpdatingChartRef.current = true;
		plot.setData(stacked);
		isUpdatingChartRef.current = false;
	}, []);

	useLayoutEffect(() => {
		if (!isStackedBarChart || !config) {
			return undefined;
		}
		return setupStackingHooks(config, applyStackingToChart, isUpdatingChartRef);
	}, [isStackedBarChart, config, applyStackingToChart]);

	return chartData;
}
