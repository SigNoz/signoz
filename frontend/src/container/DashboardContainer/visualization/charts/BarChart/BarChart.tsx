import { useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import ChartWrapper from 'container/DashboardContainer/visualization/charts/ChartWrapper/ChartWrapper';
import BarChartTooltip from 'lib/uPlotV2/components/Tooltip/BarChartTooltip';
import {
	BarTooltipProps,
	TooltipRenderArgs,
} from 'lib/uPlotV2/components/types';
import { has } from 'lodash-es';
import uPlot from 'uplot';

import { BarChartProps } from '../types';
import { stack } from './stackUtils';

/** Returns true if the series at the given index is hidden (e.g. via legend toggle) */
function isSeriesHidden(plot: uPlot, seriesIndex: number): boolean {
	return !plot.series[seriesIndex]?.show;
}

export default function BarChart(props: BarChartProps): JSX.Element {
	const { children, isStackedBarChart, config, data, ...rest } = props;

	// Store unstacked source data so uPlot hooks can access it (hooks run outside React's render cycle)
	const unstackedDataRef = useRef<uPlot.AlignedData | null>(null);
	unstackedDataRef.current = isStackedBarChart ? data : null;

	// Prevents re-entrant calls when we update chart data (avoids infinite loop in setData hook)
	const isUpdatingChartRef = useRef(false);

	const chartData = useMemo((): uPlot.AlignedData => {
		if (!isStackedBarChart || !data || data.length < 2) {
			return data as uPlot.AlignedData;
		}
		const noSeriesHidden = (): boolean => false; // include all series in initial stack
		const { data: stacked } = stack(data as uPlot.AlignedData, noSeriesHidden);
		return stacked;
	}, [data, isStackedBarChart]);

	const applyStackingToChart = useCallback((plot: uPlot): void => {
		const unstacked = unstackedDataRef.current;
		const hasValidData =
			unstacked && plot.data && unstacked[0]?.length === plot.data[0]?.length;

		if (!hasValidData || isUpdatingChartRef.current) {
			return;
		}

		const shouldExcludeSeries = (idx: number): boolean =>
			isSeriesHidden(plot, idx);
		const { data: stacked, bands } = stack(unstacked, shouldExcludeSeries);

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

		const onDataChange = (plot: uPlot): void => {
			if (!isUpdatingChartRef.current) {
				applyStackingToChart(plot);
			}
		};

		const onSeriesVisibilityChange = (
			plot: uPlot,
			_seriesIdx: number | null,
			opts: uPlot.Series,
		): void => {
			if (has(opts, 'focus')) {
				return;
			}
			applyStackingToChart(plot);
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
	}, [isStackedBarChart, config, applyStackingToChart]);

	const renderTooltip = useCallback(
		(props: TooltipRenderArgs): React.ReactNode => {
			const tooltipProps: BarTooltipProps = {
				...props,
				timezone: rest.timezone,
				yAxisUnit: rest.yAxisUnit,
				decimalPrecision: rest.decimalPrecision,
				isStackedBarChart: isStackedBarChart,
			};
			return <BarChartTooltip {...tooltipProps} />;
		},
		[rest.timezone, rest.yAxisUnit, rest.decimalPrecision, isStackedBarChart],
	);

	return (
		<ChartWrapper
			{...rest}
			config={config}
			data={chartData}
			renderTooltip={renderTooltip}
		>
			{children}
		</ChartWrapper>
	);
}
