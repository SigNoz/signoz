import { InfoCircleOutlined } from '@ant-design/icons';
import Spinner from 'components/Spinner';
import { DEFAULT_ENTITY_VERSION } from 'constants/app';
import { QueryParams } from 'constants/query';
import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import GridPanelSwitch from 'container/GridPanelSwitch';
import { getFormatNameByOptionId } from 'container/NewWidget/RightContainer/alertFomatCategories';
import { timePreferenceType } from 'container/NewWidget/RightContainer/timeItems';
import { Time } from 'container/TopNav/DateTimeSelection/config';
import {
	CustomTimeType,
	Time as TimeV2,
} from 'container/TopNav/DateTimeSelectionV2/config';
import { useGetQueryRange } from 'hooks/queryBuilder/useGetQueryRange';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useResizeObserver } from 'hooks/useDimensions';
import useUrlQuery from 'hooks/useUrlQuery';
import GetMinMax from 'lib/getMinMax';
import getTimeString from 'lib/getTimeString';
import history from 'lib/history';
import { getUPlotChartOptions } from 'lib/uPlotLib/getUplotChartOptions';
import { getUPlotChartData } from 'lib/uPlotLib/utils/getUplotChartData';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { UpdateTimeInterval } from 'store/actions';
import { AppState } from 'store/reducers';
import { AlertDef } from 'types/api/alerts/def';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';
import { GlobalReducer } from 'types/reducer/globalTime';
import { getGraphType } from 'utils/getGraphType';
import { getSortedSeriesData } from 'utils/getSortedSeriesData';
import { getTimeRange } from 'utils/getTimeRange';

import { ChartContainer, FailedMessageContainer } from './styles';
import { getThresholdLabel } from './utils';

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
}: ChartPreviewProps): JSX.Element | null {
	const { t } = useTranslation('alerts');
	const dispatch = useDispatch();
	const threshold = alertDef?.condition.target || 0;
	const [minTimeScale, setMinTimeScale] = useState<number>();
	const [maxTimeScale, setMaxTimeScale] = useState<number>();

	const { minTime, maxTime, selectedTime: globalSelectedInterval } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);

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
		},
		alertDef?.version || DEFAULT_ENTITY_VERSION,
		{
			queryKey: [
				'chartPreview',
				userQueryKey || JSON.stringify(query),
				selectedInterval,
				minTime,
				maxTime,
			],
			retry: false,
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

	if (queryResponse.data && graphType === PANEL_TYPES.BAR) {
		const sortedSeriesData = getSortedSeriesData(
			queryResponse.data?.payload.data.result,
		);
		queryResponse.data.payload.data.result = sortedSeriesData;
	}

	const chartData = getUPlotChartData(queryResponse?.data?.payload);

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

	const options = useMemo(
		() =>
			getUPlotChartOptions({
				id: 'alert_legend_widget',
				yAxisUnit,
				apiResponse: queryResponse?.data?.payload,
				dimensions: containerDimensions,
				minTimeScale,
				maxTimeScale,
				isDarkMode,
				onDragSelect,
				thresholds: [
					{
						index: '0', // no impact
						keyIndex: 0,
						moveThreshold: (): void => {},
						selectedGraph: PANEL_TYPES.TIME_SERIES, // no impact
						thresholdValue: threshold,
						thresholdLabel: `${t(
							'preview_chart_threshold_label',
						)} (y=${getThresholdLabel(
							optionName,
							threshold,
							alertDef?.condition.targetUnit,
							yAxisUnit,
						)})`,
						thresholdUnit: alertDef?.condition.targetUnit,
					},
				],
				softMax: null,
				softMin: null,
				panelType: graphType,
			}),
		[
			yAxisUnit,
			queryResponse?.data?.payload,
			containerDimensions,
			minTimeScale,
			maxTimeScale,
			isDarkMode,
			onDragSelect,
			threshold,
			t,
			optionName,
			alertDef?.condition.targetUnit,
			graphType,
		],
	);

	return (
		<ChartContainer>
			{headline}

			<div ref={graphRef} style={{ height: '100%' }}>
				{queryResponse.isLoading && (
					<Spinner size="large" tip="Loading..." height="100%" />
				)}
				{(queryResponse?.isError || queryResponse?.error) && (
					<FailedMessageContainer color="red" title="Failed to refresh the chart">
						<InfoCircleOutlined />{' '}
						{queryResponse.error.message || t('preview_chart_unexpected_error')}
					</FailedMessageContainer>
				)}

				{chartData && !queryResponse.isError && !queryResponse.isLoading && (
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
			</div>
		</ChartContainer>
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
};

export default ChartPreview;
