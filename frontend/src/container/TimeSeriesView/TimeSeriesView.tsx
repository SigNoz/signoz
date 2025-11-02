import './TimeSeriesView.styles.scss';

import logEvent from 'api/common/logEvent';
import ErrorInPlace from 'components/ErrorInPlace/ErrorInPlace';
import Uplot from 'components/Uplot';
import { QueryParams } from 'constants/query';
import { PANEL_TYPES } from 'constants/queryBuilder';
import EmptyLogsSearch from 'container/EmptyLogsSearch/EmptyLogsSearch';
import { getLocalStorageGraphVisibilityState } from 'container/GridCardLayout/GridCard/utils';
import { LogsLoading } from 'container/LogsLoading/LogsLoading';
import EmptyMetricsSearch from 'container/MetricsExplorer/Explorer/EmptyMetricsSearch';
import { MetricsLoading } from 'container/MetricsExplorer/MetricsLoading/MetricsLoading';
import NoLogs from 'container/NoLogs/NoLogs';
import { CustomTimeType } from 'container/TopNav/DateTimeSelectionV2/config';
import { TracesLoading } from 'container/TracesExplorer/TraceLoading/TraceLoading';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
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
import {
	Dispatch,
	SetStateAction,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { UpdateTimeInterval } from 'store/actions';
import { AppState } from 'store/reducers';
import { SuccessResponse, Warning } from 'types/api';
import { LegendPosition } from 'types/api/dashboard/getAll';
import APIError from 'types/api/error';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import { DataSource } from 'types/common/queryBuilder';
import { GlobalReducer } from 'types/reducer/globalTime';
import uPlot from 'uplot';
import { getTimeRange } from 'utils/getTimeRange';

function TimeSeriesView({
	data,
	isLoading,
	isError,
	error,
	yAxisUnit,
	isFilterApplied,
	dataSource,
	setWarning,
	panelType = PANEL_TYPES.TIME_SERIES,
}: TimeSeriesViewProps): JSX.Element {
	const graphRef = useRef<HTMLDivElement>(null);

	const dispatch = useDispatch();
	const urlQuery = useUrlQuery();
	const location = useLocation();
	const { currentQuery } = useQueryBuilder();

	const chartData = useMemo(() => getUPlotChartData(data?.payload), [
		data?.payload,
	]);

	useEffect(() => {
		if (data?.payload) {
			setWarning?.(data?.warning);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [data?.payload, data?.warning]);

	const isDarkMode = useIsDarkMode();
	const containerDimensions = useResizeObserver(graphRef);

	const [minTimeScale, setMinTimeScale] = useState<number>();
	const [maxTimeScale, setMaxTimeScale] = useState<number>();
	const [graphVisibility, setGraphVisibility] = useState<boolean[]>([]);
	const legendScrollPositionRef = useRef<{
		scrollTop: number;
		scrollLeft: number;
	}>({
		scrollTop: 0,
		scrollLeft: 0,
	});

	const { minTime, maxTime, selectedTime: globalSelectedInterval } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);

	useEffect((): void => {
		const { startTime, endTime } = getTimeRange();

		setMinTimeScale(startTime);
		setMaxTimeScale(endTime);
	}, [maxTime, minTime, globalSelectedInterval, data]);

	// Initialize graph visibility from localStorage
	useEffect(() => {
		if (data?.payload?.data?.result) {
			const {
				graphVisibilityStates: localStoredVisibilityState,
			} = getLocalStorageGraphVisibilityState({
				apiResponse: data.payload.data.result,
				name: 'time-series-explorer',
			});
			setGraphVisibility(localStoredVisibilityState);
		}
	}, [data?.payload?.data?.result]);

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
			} else if (dataSource === DataSource.METRICS) {
				logEvent('Metrics Explorer: Data present', {
					panelType: 'TIME_SERIES',
				});
			}
		}
	}, [isLoading, isError, chartData, dataSource]);

	const { timezone } = useTimezone();

	const chartOptions = getUPlotChartOptions({
		id: 'time-series-explorer',
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
		panelType,
		tzDate: (timestamp: number) =>
			uPlot.tzDate(new Date(timestamp * 1e3), timezone.value),
		timezone: timezone.value,
		currentQuery,
		query: currentQuery,
		graphsVisibilityStates: graphVisibility,
		setGraphsVisibilityStates: setGraphVisibility,
		enhancedLegend: true,
		legendPosition: LegendPosition.BOTTOM,
		legendScrollPosition: legendScrollPositionRef.current,
		setLegendScrollPosition: (position: {
			scrollTop: number;
			scrollLeft: number;
		}) => {
			legendScrollPositionRef.current = position;
		},
	});

	return (
		<div className="time-series-view">
			{isError && error && <ErrorInPlace error={error as APIError} />}

			<div
				className="graph-container"
				style={{ height: '100%', width: '100%' }}
				ref={graphRef}
				data-testid="time-series-graph"
			>
				{isLoading && dataSource === DataSource.LOGS && <LogsLoading />}
				{isLoading && dataSource === DataSource.TRACES && <TracesLoading />}
				{isLoading && dataSource === DataSource.METRICS && <MetricsLoading />}

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
					!isFilterApplied &&
					dataSource !== DataSource.METRICS && <NoLogs dataSource={dataSource} />}

				{chartData &&
					chartData[0] &&
					chartData[0]?.length === 0 &&
					!isLoading &&
					!isError &&
					dataSource === DataSource.METRICS && <EmptyMetricsSearch />}

				{!isLoading &&
					!isError &&
					chartData &&
					!isEmpty(chartData?.[0]) &&
					chartOptions && <Uplot data={chartData} options={chartOptions} />}
			</div>
		</div>
	);
}

interface TimeSeriesViewProps {
	data?: SuccessResponse<MetricRangePayloadProps> & { warning?: Warning };
	yAxisUnit?: string;
	isLoading: boolean;
	isError: boolean;
	error?: Error | APIError;
	isFilterApplied: boolean;
	dataSource: DataSource;
	setWarning?: Dispatch<SetStateAction<Warning | undefined>>;
	panelType?: PANEL_TYPES;
}

TimeSeriesView.defaultProps = {
	data: undefined,
	yAxisUnit: 'short',
	error: undefined,
	setWarning: undefined,
	panelType: PANEL_TYPES.TIME_SERIES,
};

export default TimeSeriesView;
