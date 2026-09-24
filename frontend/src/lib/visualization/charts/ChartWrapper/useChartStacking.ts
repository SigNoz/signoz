import {
	MutableRefObject,
	useCallback,
	useLayoutEffect,
	useMemo,
	useRef,
} from 'react';
import { UPlotConfigBuilder } from 'lib/uPlotV2/config/UPlotConfigBuilder';
import { StackMode } from 'lib/uPlotV2/config/types';
import { has } from 'lodash-es';
import uPlot from 'uplot';

import { stackSeries } from 'lib/visualization/charts/utils/stackSeriesUtils';

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
	updateStacksInChart: (plot: uPlot) => void,
	isUpdatingRef: MutableRefObject<boolean>,
): () => void {
	const onDataChange = (plot: uPlot): void => {
		if (!isUpdatingRef.current) {
			updateStacksInChart(plot);
		}
	};

	const onSeriesVisibilityChange = (
		plot: uPlot,
		_seriesIdx: number | null,
		opts: uPlot.Series,
	): void => {
		// uPlot fires setSeries for hover focus too; only visibility changes restack.
		if (!has(opts, 'focus')) {
			updateStacksInChart(plot);
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

export interface UseChartStackingParams {
	data: uPlot.AlignedData;
	config: UPlotConfigBuilder | null;
}

/**
 * Stacks a chart's data for the mode declared on its config, and re-stacks on data or
 * visibility changes. The pre-stack values live in a ref because the uPlot hooks that
 * read them run outside React's render cycle.
 */
export function useChartStacking({
	data,
	config,
}: UseChartStackingParams): uPlot.AlignedData {
	const stack = config?.getStackMode() ?? StackMode.None;
	const unstackedDataRef = useRef<uPlot.AlignedData | null>(null);
	unstackedDataRef.current = stack === 'none' ? null : data;

	// Guards the re-entrant setData below, which would otherwise re-trigger our own hook.
	const isUpdatingChartRef = useRef(false);

	const chartData = useMemo((): uPlot.AlignedData => {
		if (stack === StackMode.None || !data || data.length < 2) {
			return data;
		}
		const noSeriesHidden = (): boolean => false; // include all series in initial stack
		return stackSeries(data, noSeriesHidden, stack).data;
	}, [data, stack]);

	const updateStacksInChart = useCallback(
		(plot: uPlot): void => {
			const unstacked = unstackedDataRef.current;
			if (
				!unstacked ||
				!canApplyStacking(unstacked, plot, isUpdatingChartRef.current)
			) {
				return;
			}

			const shouldExcludeSeries = (idx: number): boolean =>
				isSeriesHidden(plot, idx);
			const { data: stacked, bands } = stackSeries(
				unstacked,
				shouldExcludeSeries,
				stack,
			);

			plot.delBand(null);
			bands.forEach((band: uPlot.Band) => plot.addBand(band));

			isUpdatingChartRef.current = true;
			plot.setData(stacked);
			isUpdatingChartRef.current = false;
		},
		[stack],
	);

	useLayoutEffect(() => {
		if (stack === StackMode.None || !config) {
			return undefined;
		}
		return setupStackingHooks(config, updateStacksInChart, isUpdatingChartRef);
	}, [stack, config, updateStacksInChart]);

	return chartData;
}
