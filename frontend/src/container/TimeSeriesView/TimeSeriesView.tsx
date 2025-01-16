import './TimeSeriesView.styles.scss';

import logEvent from 'api/common/logEvent';
import Uplot from 'components/Uplot';
import { QueryParams } from 'constants/query';
import EmptyLogsSearch from 'container/EmptyLogsSearch/EmptyLogsSearch';
import LogsError from 'container/LogsError/LogsError';
import { LogsLoading } from 'container/LogsLoading/LogsLoading';
import NoLogs from 'container/NoLogs/NoLogs';
import { CustomTimeType } from 'container/TopNav/DateTimeSelectionV2/config';
import { TracesLoading } from 'container/TracesExplorer/TraceLoading/TraceLoading';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useResizeObserver } from 'hooks/useDimensions';
import useUrlQuery from 'hooks/useUrlQuery';
import GetMinMax from 'lib/getMinMax';
import getTimeString from 'lib/getTimeString';
import history from 'lib/history';
import { getUPlotChartOptions } from 'lib/uPlotLib/getUplotChartOptions';
import { getUPlotChartData } from 'lib/uPlotLib/utils/getUplotChartData';
import { isEmpty } from 'lodash-es';
import { useTimezone } from 'providers/Timezone';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { UpdateTimeInterval } from 'store/actions';
import { AppState } from 'store/reducers';
import { SuccessResponse } from 'types/api';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import { DataSource } from 'types/common/queryBuilder';
import { GlobalReducer } from 'types/reducer/globalTime';
import uPlot from 'uplot';
import { getTimeRange } from 'utils/getTimeRange';

import { Container } from './styles';

function TimeSeriesView({
	data,
	isLoading,
	isError,
	yAxisUnit,
	isFilterApplied,
	dataSource,
}: TimeSeriesViewProps): JSX.Element {
	const graphRef = useRef<HTMLDivElement>(null);

	const dispatch = useDispatch();
	const urlQuery = useUrlQuery();
	const location = useLocation();

	const chartData = useMemo(() => getUPlotChartData(data?.payload), [
		data?.payload,
	]);

	const isDarkMode = useIsDarkMode();
	const containerDimensions = useResizeObserver(graphRef);

	const [minTimeScale, setMinTimeScale] = useState<number>();
	const [maxTimeScale, setMaxTimeScale] = useState<number>();

	const { minTime, maxTime, selectedTime: globalSelectedInterval } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);

	useEffect((): void => {
		const { startTime, endTime } = getTimeRange();

		setMinTimeScale(startTime);
		setMaxTimeScale(endTime);
	}, [maxTime, minTime, globalSelectedInterval, data]);

	const onDragSelect = useCallback(
		(start: number, end: number): void => {
			const startTimestamp = Math.trunc(start);
			const endTimestamp = Math.trunc(end);

			if (startTimestamp !== endTimestamp) {
				dispatch(UpdateTimeInterval('custom', [startTimestamp, endTimestamp]));
			}

			const { maxTime, minTime } = GetMinMax('custom', [
				startTimestamp,
				endTimestamp,
			]);

			urlQuery.set(QueryParams.startTime, minTime.toString());
			urlQuery.set(QueryParams.endTime, maxTime.toString());
			urlQuery.delete(QueryParams.relativeTime);
			const generatedUrl = `${location.pathname}?${urlQuery.toString()}`;
			history.push(generatedUrl);
		},
		[dispatch, location.pathname, urlQuery],
	);

	const handleBackNavigation = (): void => {
		const searchParams = new URLSearchParams(window.location.search);
		const startTime = searchParams.get(QueryParams.startTime);
		const endTime = searchParams.get(QueryParams.endTime);
		const relativeTime = searchParams.get(
			QueryParams.relativeTime,
		) as CustomTimeType;

		if (relativeTime) {
			dispatch(UpdateTimeInterval(relativeTime));
		} else if (startTime && endTime && startTime !== endTime) {
			dispatch(
				UpdateTimeInterval('custom', [
					parseInt(getTimeString(startTime), 10),
					parseInt(getTimeString(endTime), 10),
				]),
			);
		}
	};

	useEffect(() => {
		window.addEventListener('popstate', handleBackNavigation);

		return (): void => {
			window.removeEventListener('popstate', handleBackNavigation);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		if (chartData[0] && chartData[0]?.length !== 0 && !isLoading && !isError) {
			if (dataSource === DataSource.TRACES) {
				logEvent('Traces Explorer: Data present', {
					panelType: 'TIME_SERIES',
				});
			} else if (dataSource === DataSource.LOGS) {
				logEvent('Logs Explorer: Data present', {
					panelType: 'TIME_SERIES',
				});
			}
		}
	}, [isLoading, isError, chartData, dataSource]);

	const { timezone } = useTimezone();

	const chartOptions = getUPlotChartOptions({
		onDragSelect,
		yAxisUnit: yAxisUnit || '',
		apiResponse: data?.payload,
		dimensions: {
			width: containerDimensions.width,
			height: containerDimensions.height,
		},
		isDarkMode,
		minTimeScale,
		maxTimeScale,
		softMax: null,
		softMin: null,
		tzDate: (timestamp: number) =>
			uPlot.tzDate(new Date(timestamp * 1e3), timezone.value),
		timezone: timezone.value,
	});

	return (
		<Container>
			{isError && <LogsError />}
			<div
				className="graph-container"
				style={{ height: '100%', width: '100%' }}
				ref={graphRef}
				data-testid="time-series-graph"
			>
				{isLoading &&
					(dataSource === DataSource.LOGS ? <LogsLoading /> : <TracesLoading />)}

				{chartData &&
					chartData[0] &&
					chartData[0]?.length === 0 &&
					!isLoading &&
					!isError &&
					isFilterApplied && (
						<EmptyLogsSearch dataSource={dataSource} panelType="TIME_SERIES" />
					)}

				{chartData &&
					chartData[0] &&
					chartData[0]?.length === 0 &&
					!isLoading &&
					!isError &&
					!isFilterApplied && <NoLogs dataSource={dataSource} />}

				{!isLoading &&
					!isError &&
					chartData &&
					!isEmpty(chartData?.[0]) &&
					chartOptions && <Uplot data={chartData} options={chartOptions} />}
			</div>
		</Container>
	);
}

interface TimeSeriesViewProps {
	data?: SuccessResponse<MetricRangePayloadProps>;
	yAxisUnit?: string;
	isLoading: boolean;
	isError: boolean;
	isFilterApplied: boolean;
	dataSource: DataSource;
}

TimeSeriesView.defaultProps = {
	data: undefined,
	yAxisUnit: 'short',
};

export default TimeSeriesView;
