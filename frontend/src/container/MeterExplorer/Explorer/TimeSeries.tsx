import { useMemo, useRef } from 'react';
// eslint-disable-next-line no-restricted-imports
import { useSelector } from 'react-redux';
import QueryCancelledPlaceholder from 'components/QueryCancelledPlaceholder';
import BarChart from 'container/DashboardContainer/visualization/charts/BarChart/BarChart';
import { BuilderUnitsFilter } from 'container/QueryBuilder/filters/BuilderUnitsFilter';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useResizeObserver } from 'hooks/useDimensions';
import useUrlYAxisUnit from 'hooks/useUrlYAxisUnit';
import { LegendPosition } from 'lib/uPlotV2/components/types';
import { prepareChartData } from 'lib/uPlotV2/utils/dataUtils';
import { useTimezone } from 'providers/Timezone';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';
import uPlot from 'uplot';

import { buildMeterChartConfig } from './configBuilder';
import EmptyMeterSearch from './EmptyMeterSearch';
import MeterLoading from './MeterLoading';
import styles from './TimeSeries.module.scss';
import { useTimeSeriesQueries } from './useTimeSeriesQueries';
import { useTimeSeriesTimeManagement } from './useTimeSeriesTimeManagement';

const WIDGET_ID = 'meter-explorer-bar-chart';

interface TimeSeriesProps {
	onFetchingStateChange?: (isFetching: boolean) => void;
	isCancelled?: boolean;
}

function TimeSeries({
	onFetchingStateChange,
	isCancelled = false,
}: TimeSeriesProps): JSX.Element {
	const graphRef = useRef<HTMLDivElement>(null);

	const { stagedQuery, currentQuery } = useQueryBuilder();
	const { yAxisUnit, onUnitChange } = useUrlYAxisUnit('');

	const isDarkMode = useIsDarkMode();
	const { timezone } = useTimezone();
	const containerDimensions = useResizeObserver(graphRef);

	const {
		selectedTime: globalSelectedTime,
		maxTime,
		minTime,
	} = useSelector<AppState, GlobalReducer>((state) => state.globalTime);

	const { minTimeScale, maxTimeScale, onDragSelect } =
		useTimeSeriesTimeManagement({
			globalSelectedTime,
			maxTime,
			minTime,
		});

	const { responseData, isLoading, isError } = useTimeSeriesQueries({
		stagedQuery,
		currentQuery,
		globalSelectedTime,
		maxTime,
		minTime,
		onFetchingStateChange,
	});

	const hasMetricSelected = useMemo(
		() => currentQuery.builder.queryData.some((q) => q.aggregateAttribute?.key),
		[currentQuery],
	);

	const chartsData = useMemo(() => {
		return responseData.map((response, index) => {
			const apiResponse = response?.payload;

			const config = buildMeterChartConfig({
				id: `${WIDGET_ID}-${index}`,
				isDarkMode,
				currentQuery,
				onDragSelect,
				apiResponse,
				timezone,
				yAxisUnit: yAxisUnit || 'short',
				minTimeScale,
				maxTimeScale,
			});

			const chartData = apiResponse ? prepareChartData(apiResponse) : [];

			return {
				config,
				chartData,
				hasData: chartData.length > 0 && chartData[0]?.length > 0,
			};
		});
	}, [
		responseData,
		currentQuery,
		yAxisUnit,
		isDarkMode,
		onDragSelect,
		timezone,
		minTimeScale,
		maxTimeScale,
	]);

	const hasAnyData = chartsData.some((chart) => chart.hasData);

	return (
		<div className={styles.meterTimeSeriesContainer}>
			<BuilderUnitsFilter onChange={onUnitChange} yAxisUnit={yAxisUnit} />
			<div className={styles.timeSeriesContainer} ref={graphRef}>
				{!hasMetricSelected && <EmptyMeterSearch />}
				{isCancelled && hasMetricSelected && (
					<QueryCancelledPlaceholder subText='Click "Run Query" to load metrics.' />
				)}
				{isLoading && hasMetricSelected && !isCancelled && <MeterLoading />}
				{!isCancelled &&
					hasMetricSelected &&
					!isLoading &&
					!isError &&
					!hasAnyData && (
						<EmptyMeterSearch hasQueryResult={responseData[0] !== undefined} />
					)}
				{!isCancelled &&
					hasMetricSelected &&
					!isLoading &&
					!isError &&
					containerDimensions.width > 0 &&
					containerDimensions.height > 0 &&
					chartsData.map(
						(chart, index) =>
							chart.hasData && (
								<div
									className={styles.timeSeriesViewPanel}
									// oxlint-disable-next-line react/no-array-index-key -- query responses have no stable ID
									key={`${WIDGET_ID}-${index}`}
								>
									<BarChart
										config={chart.config}
										legendConfig={{
											position: LegendPosition.BOTTOM,
										}}
										data={chart.chartData as uPlot.AlignedData}
										width={containerDimensions.width}
										height={containerDimensions.height}
										isStackedBarChart
										yAxisUnit={yAxisUnit || 'short'}
										timezone={timezone}
									/>
								</div>
							),
					)}
			</div>
		</div>
	);
}

export default TimeSeries;
