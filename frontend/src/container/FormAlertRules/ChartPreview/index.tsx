import './ChartPreview.styles.scss';

import ErrorInPlace from 'components/ErrorInPlace/ErrorInPlace';
import Spinner from 'components/Spinner';
import WarningPopover from 'components/WarningPopover/WarningPopover';
import { ENTITY_VERSION_V5 } from 'constants/app';
import { FeatureKeys } from 'constants/features';
import { QueryParams } from 'constants/query';
import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import AnomalyAlertEvaluationView from 'container/AnomalyAlertEvaluationView';
import { INITIAL_CRITICAL_THRESHOLD } from 'container/CreateAlertV2/context/constants';
import { Threshold } from 'container/CreateAlertV2/context/types';
import { getLocalStorageGraphVisibilityState } from 'container/GridCardLayout/GridCard/utils';
import GridPanelSwitch from 'container/GridPanelSwitch';
import { populateMultipleResults } from 'container/NewWidget/LeftContainer/WidgetGraph/util';
import { getFormatNameByOptionId } from 'container/NewWidget/RightContainer/alertFomatCategories';
import { timePreferenceType } from 'container/NewWidget/RightContainer/timeItems';
import { Time } from 'container/TopNav/DateTimeSelection/config';
import {
	CustomTimeType,
	Time as TimeV2,
} from 'container/TopNav/DateTimeSelectionV2/config';
import { useGetQueryRange } from 'hooks/queryBuilder/useGetQueryRange';
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
import { useAppContext } from 'providers/App/App';
import { useTimezone } from 'providers/Timezone';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { UpdateTimeInterval } from 'store/actions';
import { AppState } from 'store/reducers';
import { Warning } from 'types/api';
import { AlertDef } from 'types/api/alerts/def';
import { LegendPosition } from 'types/api/dashboard/getAll';
import APIError from 'types/api/error';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';
import { GlobalReducer } from 'types/reducer/globalTime';
import uPlot from 'uplot';
import { getGraphType } from 'utils/getGraphType';
import { getSortedSeriesData } from 'utils/getSortedSeriesData';
import { getTimeRange } from 'utils/getTimeRange';

import { AlertDetectionTypes } from '..';
import { ChartContainer } from './styles';
import { getThresholds } from './utils';

export interface ChartPreviewProps {
	name: string;
	query: Query | null;
	graphType?: PANEL_TYPES;
	selectedTime?: timePreferenceType;
	selectedInterval?: Time | TimeV2 | CustomTimeType;
	headline?: JSX.Element;
	alertDef?: AlertDef;
	userQueryKey?: string;
	allowSelectedIntervalForStepGen?: boolean;
	yAxisUnit: string;
	setQueryStatus?: (status: string) => void;
	showSideLegend?: boolean;
	additionalThresholds?: Threshold[];
}

// eslint-disable-next-line sonarjs/cognitive-complexity
function ChartPreview({
	name,
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
	const [graphVisibility, setGraphVisibility] = useState<boolean[]>([]);
	const legendScrollPositionRef = useRef<{
		scrollTop: number;
		scrollLeft: number;
	}>({
		scrollTop: 0,
		scrollLeft: 0,
	});
	const { currentQuery } = useQueryBuilder();

	const { minTime, maxTime, selectedTime: globalSelectedInterval } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);

	const { featureFlags } = useAppContext();

	const handleBackNavigation = (): void => {
		const searchParams = new URLSearchParams(window.location.search);
		const startTime = searchParams.get(QueryParams.startTime);
		const endTime = searchParams.get(QueryParams.endTime);

		if (startTime && endTime && startTime !== endTime) {
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
				'chartPreview',
				userQueryKey || JSON.stringify(query),
				selectedInterval,
				minTime,
				maxTime,
				alertDef?.ruleType,
			],
			enabled: canQuery,
		},
	);

	const graphRef = useRef<HTMLDivElement>(null);

	useEffect((): void => {
		const { startTime, endTime } = getTimeRange(queryResponse);
		if (setQueryStatus) setQueryStatus(queryResponse.status);
		setMinTimeScale(startTime);
		setMaxTimeScale(endTime);
	}, [maxTime, minTime, globalSelectedInterval, queryResponse, setQueryStatus]);

	// Initialize graph visibility from localStorage
	useEffect(() => {
		if (queryResponse?.data?.payload?.data?.result) {
			const {
				graphVisibilityStates: localStoredVisibilityState,
			} = getLocalStorageGraphVisibilityState({
				apiResponse: queryResponse.data.payload.data.result,
				name: 'alert-chart-preview',
			});
			setGraphVisibility(localStoredVisibilityState);
		}
	}, [queryResponse?.data?.payload?.data?.result]);

	if (queryResponse.data && graphType === PANEL_TYPES.BAR) {
		const sortedSeriesData = getSortedSeriesData(
			queryResponse.data?.payload.data.result,
		);
		queryResponse.data.payload.data.result = sortedSeriesData;
	}

	if (queryResponse.data && graphType === PANEL_TYPES.PIE) {
		const transformedData = populateMultipleResults(queryResponse?.data);
		// eslint-disable-next-line no-param-reassign
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

	const options = useMemo(
		() =>
			getUPlotChartOptions({
				id: 'alert_legend_widget',
				yAxisUnit,
				apiResponse: queryResponse?.data?.payload,
				dimensions: {
					height: containerDimensions?.height ? containerDimensions.height - 48 : 0,
					width: containerDimensions?.width,
				},
				minTimeScale,
				maxTimeScale,
				isDarkMode,
				onDragSelect,
				thresholds: getThresholds(thresholds, t, optionName, yAxisUnit),
				softMax: null,
				softMin: null,
				panelType: graphType,
				tzDate: (timestamp: number) =>
					uPlot.tzDate(new Date(timestamp * 1e3), timezone.value),
				timezone: timezone.value,
				currentQuery,
				query: query || currentQuery,
				graphsVisibilityStates: graphVisibility,
				setGraphsVisibilityStates: setGraphVisibility,
				enhancedLegend: true,
				legendPosition,
				legendScrollPosition: legendScrollPositionRef.current,
				setLegendScrollPosition: (position: {
					scrollTop: number;
					scrollLeft: number;
				}) => {
					legendScrollPositionRef.current = position;
				},
			}),
		[
			yAxisUnit,
			queryResponse?.data?.payload,
			containerDimensions,
			minTimeScale,
			maxTimeScale,
			isDarkMode,
			onDragSelect,
			thresholds,
			t,
			optionName,
			graphType,
			timezone.value,
			currentQuery,
			query,
			graphVisibility,
			legendPosition,
		],
	);

	const chartData = getUPlotChartData(queryResponse?.data?.payload);

	const isAnomalyDetectionAlert =
		alertDef?.ruleType === AlertDetectionTypes.ANOMALY_DETECTION_ALERT;

	const chartDataAvailable =
		chartData && !queryResponse.isError && !queryResponse.isLoading;

	const isAnomalyDetectionEnabled =
		featureFlags?.find((flag) => flag.name === FeatureKeys.ANOMALY_DETECTION)
			?.active || false;

	const isWarning = !isEmpty(queryResponse.data?.warning);
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
					{(queryResponse?.isError || queryResponse?.error) && (
						<ErrorInPlace error={queryResponse.error as APIError} />
					)}

					{chartDataAvailable && !isAnomalyDetectionAlert && (
						<GridPanelSwitch
							options={options}
							panelType={graphType}
							data={chartData}
							name={name || 'Chart Preview'}
							panelData={
								queryResponse.data?.payload?.data?.newResult?.data?.result || []
							}
							query={query || initialQueriesMap.metrics}
							yAxisUnit={yAxisUnit}
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
};

export default ChartPreview;
