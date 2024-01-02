import getTopLevelOperations, {
	ServiceDataProps,
} from 'api/metrics/getTopLevelOperations';
import { FeatureKeys } from 'constants/features';
import { QueryParams } from 'constants/query';
import { PANEL_TYPES } from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import { routeConfig } from 'container/SideNav/config';
import { getQueryString } from 'container/SideNav/helper';
import useFeatureFlag from 'hooks/useFeatureFlag';
import useResourceAttribute from 'hooks/useResourceAttribute';
import {
	convertRawQueriesToTraceSelectedTags,
	resourceAttributesToTagFilterItems,
} from 'hooks/useResourceAttribute/utils';
import history from 'lib/history';
import { OnClickPluginOpts } from 'lib/uPlotLib/plugins/onClickPlugin';
import { useCallback, useMemo, useState } from 'react';
import { useQuery } from 'react-query';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useParams } from 'react-router-dom';
import { UpdateTimeInterval } from 'store/actions';
import { AppState } from 'store/reducers';
import { EQueryType } from 'types/common/dashboard';
import { GlobalReducer } from 'types/reducer/globalTime';
import { Tags } from 'types/reducer/trace';
import { v4 as uuid } from 'uuid';

import { GraphTitle, SERVICE_CHART_ID } from '../constant';
import { getWidgetQueryBuilder } from '../MetricsApplication.factory';
import {
	errorPercentage,
	operationPerSec,
} from '../MetricsPageQueries/OverviewQueries';
import { Col, ColApDexContainer, ColErrorContainer, Row } from '../styles';
import ApDex from './Overview/ApDex';
import ServiceOverview from './Overview/ServiceOverview';
import TopLevelOperation from './Overview/TopLevelOperations';
import TopOperation from './Overview/TopOperation';
import TopOperationMetrics from './Overview/TopOperationMetrics';
import { Button, Card } from './styles';
import { IServiceName } from './types';
import {
	handleNonInQueryRange,
	onGraphClickHandler,
	onViewTracePopupClick,
} from './util';

function Application(): JSX.Element {
	const { maxTime, minTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);
	const { servicename } = useParams<IServiceName>();
	const [selectedTimeStamp, setSelectedTimeStamp] = useState<number>(0);
	const { search } = useLocation();
	const { queries } = useResourceAttribute();
	const selectedTags = useMemo(
		() => (convertRawQueriesToTraceSelectedTags(queries) as Tags[]) || [],
		[queries],
	);
	const isSpanMetricEnabled = useFeatureFlag(FeatureKeys.USE_SPAN_METRICS)
		?.active;

	const handleSetTimeStamp = useCallback((selectTime: number) => {
		setSelectedTimeStamp(selectTime);
	}, []);

	const dispatch = useDispatch();
	const handleGraphClick = useCallback(
		(type: string): OnClickPluginOpts['onClick'] => (
			xValue,
			yValue,
			mouseX,
			mouseY,
		): Promise<void> =>
			onGraphClickHandler(handleSetTimeStamp)(
				xValue,
				yValue,
				mouseX,
				mouseY,
				type,
			),
		[handleSetTimeStamp],
	);

	const {
		data: topLevelOperations,
		error: topLevelOperationsError,
		isLoading: topLevelOperationsIsLoading,
		isError: topLevelOperationsIsError,
	} = useQuery<ServiceDataProps>({
		queryKey: [servicename, minTime, maxTime, selectedTags],
		queryFn: getTopLevelOperations,
	});

	const selectedTraceTags: string = JSON.stringify(
		convertRawQueriesToTraceSelectedTags(queries) || [],
	);

	const tagFilterItems = useMemo(
		() =>
			handleNonInQueryRange(resourceAttributesToTagFilterItems(queries)) || [],
		[queries],
	);

	const topLevelOperationsRoute = useMemo(
		() => (topLevelOperations ? topLevelOperations[servicename || ''] : []),
		[servicename, topLevelOperations],
	);

	const operationPerSecWidget = useMemo(
		() =>
			getWidgetQueryBuilder({
				query: {
					queryType: EQueryType.QUERY_BUILDER,
					promql: [],
					builder: operationPerSec({
						servicename,
						tagFilterItems,
						topLevelOperations: topLevelOperationsRoute,
					}),
					clickhouse_sql: [],
					id: uuid(),
				},
				title: GraphTitle.RATE_PER_OPS,
				panelTypes: PANEL_TYPES.TIME_SERIES,
				yAxisUnit: 'ops',
				id: SERVICE_CHART_ID.rps,
			}),
		[servicename, tagFilterItems, topLevelOperationsRoute],
	);

	const errorPercentageWidget = useMemo(
		() =>
			getWidgetQueryBuilder({
				query: {
					queryType: EQueryType.QUERY_BUILDER,
					promql: [],
					builder: errorPercentage({
						servicename,
						tagFilterItems,
						topLevelOperations: topLevelOperationsRoute,
					}),
					clickhouse_sql: [],
					id: uuid(),
				},
				title: GraphTitle.ERROR_PERCENTAGE,
				panelTypes: PANEL_TYPES.TIME_SERIES,
				yAxisUnit: '%',
				id: SERVICE_CHART_ID.errorPercentage,
			}),
		[servicename, tagFilterItems, topLevelOperationsRoute],
	);

	const onDragSelect = useCallback(
		(start: number, end: number) => {
			const startTimestamp = Math.trunc(start);
			const endTimestamp = Math.trunc(end);

			if (startTimestamp !== endTimestamp) {
				dispatch(UpdateTimeInterval('custom', [startTimestamp, endTimestamp]));
			}
		},
		[dispatch],
	);

	const onErrorTrackHandler = (timestamp: number): (() => void) => (): void => {
		const currentTime = timestamp;
		const tPlusOne = timestamp + 60 * 1000;

		const urlParams = new URLSearchParams(search);
		urlParams.set(QueryParams.startTime, currentTime.toString());
		urlParams.set(QueryParams.endTime, tPlusOne.toString());

		const avialableParams = routeConfig[ROUTES.TRACE];
		const queryString = getQueryString(avialableParams, urlParams);

		history.replace(
			`${
				ROUTES.TRACE
			}?selected={"serviceName":["${servicename}"],"status":["error"]}&filterToFetchData=["duration","status","serviceName"]&spanAggregateCurrentPage=1&selectedTags=${selectedTraceTags}&isFilterExclude={"serviceName":false,"status":false}&userSelectedFilter={"serviceName":["${servicename}"],"status":["error"]}&spanAggregateCurrentPage=1&${queryString.join(
				'',
			)}`,
		);
	};

	return (
		<>
			<Row gutter={24}>
				<Col span={12}>
					<ServiceOverview
						onDragSelect={onDragSelect}
						handleGraphClick={handleGraphClick}
						selectedTimeStamp={selectedTimeStamp}
						selectedTraceTags={selectedTraceTags}
						topLevelOperationsRoute={topLevelOperationsRoute}
						topLevelOperationsIsLoading={topLevelOperationsIsLoading}
					/>
				</Col>

				<Col span={12}>
					<Button
						type="default"
						size="small"
						id="Rate_button"
						onClick={onViewTracePopupClick({
							servicename,
							selectedTraceTags,
							timestamp: selectedTimeStamp,
						})}
					>
						View Traces
					</Button>
					<TopLevelOperation
						handleGraphClick={handleGraphClick}
						onDragSelect={onDragSelect}
						topLevelOperationsError={topLevelOperationsError}
						topLevelOperationsIsError={topLevelOperationsIsError}
						name="operations_per_sec"
						widget={operationPerSecWidget}
						opName="Rate"
						topLevelOperationsIsLoading={topLevelOperationsIsLoading}
					/>
				</Col>
			</Row>
			<Row gutter={24}>
				<Col span={12}>
					<ColApDexContainer>
						<Button
							type="default"
							size="small"
							id="ApDex_button"
							onClick={onViewTracePopupClick({
								servicename,
								selectedTraceTags,
								timestamp: selectedTimeStamp,
							})}
						>
							View Traces
						</Button>
						<ApDex
							handleGraphClick={handleGraphClick}
							onDragSelect={onDragSelect}
							topLevelOperationsRoute={topLevelOperationsRoute}
							tagFilterItems={tagFilterItems}
						/>
					</ColApDexContainer>
					<ColErrorContainer>
						<Button
							type="default"
							size="small"
							id="Error_button"
							onClick={onErrorTrackHandler(selectedTimeStamp)}
						>
							View Traces
						</Button>

						<TopLevelOperation
							handleGraphClick={handleGraphClick}
							onDragSelect={onDragSelect}
							topLevelOperationsError={topLevelOperationsError}
							topLevelOperationsIsError={topLevelOperationsIsError}
							name="error_percentage_%"
							widget={errorPercentageWidget}
							opName="Error"
							topLevelOperationsIsLoading={topLevelOperationsIsLoading}
						/>
					</ColErrorContainer>
				</Col>

				<Col span={12}>
					<Card>
						{isSpanMetricEnabled ? <TopOperationMetrics /> : <TopOperation />}{' '}
					</Card>
				</Col>
			</Row>
		</>
	);
}

export type ClickHandlerType = () => void;

export default Application;
