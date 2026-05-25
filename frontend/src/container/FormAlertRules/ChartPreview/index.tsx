import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
// eslint-disable-next-line no-restricted-imports
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import ErrorInPlace from 'components/ErrorInPlace/ErrorInPlace';
import QueryCancelledPlaceholder from 'components/QueryCancelledPlaceholder';
import Spinner from 'components/Spinner';
import WarningPopover from 'components/WarningPopover/WarningPopover';
import { ENTITY_VERSION_V5 } from 'constants/app';
import { FeatureKeys } from 'constants/features';
import { QueryParams } from 'constants/query';
import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import AnomalyAlertEvaluationView from 'container/AnomalyAlertEvaluationView';
import { INITIAL_CRITICAL_THRESHOLD } from 'container/CreateAlertV2/context/constants';
import { Threshold } from 'container/CreateAlertV2/context/types';
import { populateMultipleResults } from 'container/NewWidget/LeftContainer/WidgetGraph/util';
import { getFormatNameByOptionId } from 'container/NewWidget/RightContainer/alertFomatCategories';
import { timePreferenceType } from 'container/NewWidget/RightContainer/timeItems';
import {
	CustomTimeType,
	Time,
} from 'container/TopNav/DateTimeSelectionV2/types';
import { useGetQueryRange } from 'hooks/queryBuilder/useGetQueryRange';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useResizeObserver } from 'hooks/useDimensions';
import useUrlQuery from 'hooks/useUrlQuery';
import GetMinMax from 'lib/getMinMax';
import getTimeString from 'lib/getTimeString';
import history from 'lib/history';
import { LegendPosition } from 'lib/uPlotV2/components/types';
import { isEmpty } from 'lodash-es';
import { useAppContext } from 'providers/App/App';
import { useTimezone } from 'providers/Timezone';
import { UpdateTimeInterval } from 'store/actions';
import { AppState } from 'store/reducers';
import { Warning } from 'types/api';
import { AlertDef } from 'types/api/alerts/def';
import APIError from 'types/api/error';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';
import { GlobalReducer } from 'types/reducer/globalTime';
import { getGraphType } from 'utils/getGraphType';
import { getSortedSeriesData } from 'utils/getSortedSeriesData';
import { getTimeRange } from 'utils/getTimeRange';

import { AlertDetectionTypes } from '..';
import ChartContent from './ChartContent';
import { ChartContainer } from './styles';
import { getThresholds } from './utils';

import './ChartPreview.styles.scss';
import { prepareChartData } from 'lib/uPlotV2/utils/dataUtils';

// Height reserved for the `.chart-preview-header` strip rendered above the chart.
const CHART_PREVIEW_HEADER_HEIGHT = 48;
const CHART_PREVIEW_CONTAINER_PADDING = 16;

export interface ChartPreviewProps {
	query: Query | null;
	graphType?: PANEL_TYPES;
	selectedTime?: timePreferenceType;
	selectedInterval?: Time | CustomTimeType;
	headline?: JSX.Element;
	alertDef?: AlertDef;
	userQueryKey?: string;
	allowSelectedIntervalForStepGen?: boolean;
	yAxisUnit: string;
	setQueryStatus?: (status: string) => void;
	showSideLegend?: boolean;
	additionalThresholds?: Threshold[];
	isCancelled?: boolean;
	onFetchingStateChange?: (isFetching: boolean) => void;
}

// eslint-disable-next-line sonarjs/cognitive-complexity
function ChartPreview({
	query,
	graphType = PANEL_TYPES.TIME_SERIES,
	selectedTime = 'GLOBAL_TIME',
	selectedInterval = '5m',
	headline,
	userQueryKey,
	allowSelectedIntervalForStepGen = false,
	alertDef,
	yAxisUnit,
	setQueryStatus,
	showSideLegend = false,
	additionalThresholds,
	isCancelled = false,
	onFetchingStateChange,
}: ChartPreviewProps): JSX.Element | null {
	const { t } = useTranslation('alerts');
	const dispatch = useDispatch();
	const thresholds: Threshold[] = useMemo(
		() =>
			additionalThresholds || [
				{
					...INITIAL_CRITICAL_THRESHOLD,
					thresholdValue: alertDef?.condition.target || 0,
					unit: alertDef?.condition.targetUnit || '',
				},
			],
		[
			additionalThresholds,
			alertDef?.condition.target,
			alertDef?.condition.targetUnit,
		],
	);

	const [minTimeScale, setMinTimeScale] = useState<number>();
	const [maxTimeScale, setMaxTimeScale] = useState<number>();
	const { currentQuery } = useQueryBuilder();

	const {
		minTime,
		maxTime,
		selectedTime: globalSelectedInterval,
	} = useSelector<AppState, GlobalReducer>((state) => state.globalTime);

	const { featureFlags } = useAppContext();

	const handleBackNavigation = (): void => {
		const searchParams = new URLSearchParams(window.location.search);
		const startTime = searchParams.get(QueryParams.startTime);
		const endTime = searchParams.get(QueryParams.endTime);

		if (startTime && endTime && startTime !== endTime) {
			dispatch(
				UpdateTimeInterval('custom', [
					Number.parseInt(getTimeString(startTime), 10),
					Number.parseInt(getTimeString(endTime), 10),
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

	const canQuery = useMemo((): boolean => {
		if (!query || query == null) {
			return false;
		}

		switch (query?.queryType) {
			case EQueryType.PROM:
				return query.promql?.length > 0 && query.promql[0].query !== '';
			case EQueryType.CLICKHOUSE:
				return (
					query.clickhouse_sql?.length > 0 &&
					query.clickhouse_sql[0].query?.length > 0
				);
			case EQueryType.QUERY_BUILDER:
				return (
					query.builder.queryData.length > 0 &&
					query.builder.queryData[0].queryName !== ''
				);
			default:
				return false;
		}
	}, [query]);
	const queryResponse = useGetQueryRange(
		{
			query: query || initialQueriesMap.metrics,
			globalSelectedInterval: selectedInterval,
			graphType: getGraphType(graphType),
			selectedTime,
			params: {
				allowSelectedIntervalForStepGen,
			},
			originalGraphType: graphType,
		},
		// alertDef?.version || DEFAULT_ENTITY_VERSION,
		ENTITY_VERSION_V5,
		{
			queryKey: [
				REACT_QUERY_KEY.ALERT_RULES_CHART_PREVIEW,
				userQueryKey || JSON.stringify(query),
				selectedInterval,
				minTime,
				maxTime,
				alertDef?.ruleType,
			],
			enabled: canQuery,
			keepPreviousData: true,
		},
	);

	useEffect(() => {
		onFetchingStateChange?.(queryResponse.isFetching);
	}, [queryResponse.isFetching, onFetchingStateChange]);

	const graphRef = useRef<HTMLDivElement>(null);

	useEffect((): void => {
		const { startTime, endTime } = getTimeRange(queryResponse);
		if (setQueryStatus) {
			setQueryStatus(queryResponse.status);
		}
		setMinTimeScale(startTime);
		setMaxTimeScale(endTime);
	}, [maxTime, minTime, globalSelectedInterval, queryResponse, setQueryStatus]);

	if (queryResponse.data && graphType === PANEL_TYPES.BAR) {
		const sortedSeriesData = getSortedSeriesData(
			queryResponse.data?.payload.data.result,
		);
		queryResponse.data.payload.data.result = sortedSeriesData;
	}

	if (queryResponse.data && graphType === PANEL_TYPES.PIE) {
		const transformedData = populateMultipleResults(queryResponse?.data);
		queryResponse.data = transformedData;
	}

	const containerDimensions = useResizeObserver(graphRef);

	const isDarkMode = useIsDarkMode();
	const urlQuery = useUrlQuery();
	const location = useLocation();

	const optionName =
		getFormatNameByOptionId(alertDef?.condition.targetUnit || '') || '';

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
			const generatedUrl = `${location.pathname}?${urlQuery.toString()}`;
			history.push(generatedUrl);
		},
		[dispatch, location.pathname, urlQuery],
	);

	const { timezone } = useTimezone();

	const legendPosition = useMemo(() => {
		if (!showSideLegend) {
			return LegendPosition.BOTTOM;
		}
		const numberOfSeries =
			queryResponse?.data?.payload?.data?.result?.length || 0;
		if (numberOfSeries <= 1) {
			return LegendPosition.BOTTOM;
		}
		return LegendPosition.RIGHT;
	}, [queryResponse?.data?.payload?.data?.result?.length, showSideLegend]);

	const resolvedThresholds = useMemo(
		() => getThresholds(thresholds, t, optionName, yAxisUnit),
		[thresholds, t, optionName, yAxisUnit],
	);

	const chartData = useMemo(() => {
		if (!queryResponse?.data?.payload) {
			return [];
		}
		return prepareChartData(queryResponse?.data?.payload);
	}, [queryResponse?.data?.payload]);

	const hasResultData = !!queryResponse?.data?.payload?.data?.result?.length;

	const isAnomalyDetectionAlert =
		alertDef?.ruleType === AlertDetectionTypes.ANOMALY_DETECTION_ALERT;

	const chartDataAvailable =
		chartData &&
		hasResultData &&
		!queryResponse.isLoading &&
		(!queryResponse.isError || isCancelled);

	const isAnomalyDetectionEnabled =
		featureFlags?.find((flag) => flag.name === FeatureKeys.ANOMALY_DETECTION)
			?.active || false;

	const isWarning = !isEmpty(queryResponse.data?.warning);

	const chartWidth = containerDimensions?.width
		? containerDimensions.width - CHART_PREVIEW_CONTAINER_PADDING
		: 0;
	const chartHeight = containerDimensions?.height
		? containerDimensions.height - CHART_PREVIEW_HEADER_HEIGHT
		: 0;

	return (
		<div className="alert-chart-container" ref={graphRef}>
			<ChartContainer>
				<div className="chart-preview-header">
					{headline}
					{isWarning && (
						<WarningPopover warningData={queryResponse.data?.warning as Warning} />
					)}
				</div>

				<div className="threshold-alert-uplot-chart-container">
					{queryResponse.isLoading && (
						<Spinner size="large" tip="Loading..." height="100%" />
					)}
					{(queryResponse?.isError || queryResponse?.error) && !isCancelled && (
						<ErrorInPlace error={queryResponse.error as APIError} />
					)}

					{isCancelled && !queryResponse.isLoading && !hasResultData && (
						<QueryCancelledPlaceholder subText='Click "Run Query" to load the chart preview.' />
					)}

					{chartDataAvailable && !isAnomalyDetectionAlert && (
						<ChartContent
							panelType={graphType}
							alertId={alertDef?.id}
							query={query || currentQuery}
							apiResponse={queryResponse.data?.payload}
							data={chartData}
							thresholds={resolvedThresholds}
							yAxisUnit={yAxisUnit}
							legendPosition={legendPosition}
							isDarkMode={isDarkMode}
							timezone={timezone}
							width={chartWidth}
							height={chartHeight}
							minTimeScale={minTimeScale}
							maxTimeScale={maxTimeScale}
							onDragSelect={onDragSelect}
						/>
					)}

					{chartDataAvailable &&
						isAnomalyDetectionAlert &&
						isAnomalyDetectionEnabled &&
						queryResponse?.data?.payload?.data?.resultType === 'time_series' && (
							<AnomalyAlertEvaluationView
								data={queryResponse?.data?.payload}
								yAxisUnit={yAxisUnit}
							/>
						)}
				</div>
			</ChartContainer>
		</div>
	);
}

ChartPreview.defaultProps = {
	graphType: PANEL_TYPES.TIME_SERIES,
	selectedTime: 'GLOBAL_TIME',
	selectedInterval: '5min',
	headline: undefined,
	userQueryKey: '',
	allowSelectedIntervalForStepGen: false,
	alertDef: undefined,
	setQueryStatus: (): void => {},
	showSideLegend: false,
	additionalThresholds: undefined,
	isCancelled: false,
	onFetchingStateChange: undefined,
};

export default ChartPreview;
