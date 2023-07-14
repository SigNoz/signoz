import { Typography } from 'antd';
import getServiceOverview from 'api/metrics/getServiceOverview';
import getTopLevelOperations, {
	ServiceDataProps,
} from 'api/metrics/getTopLevelOperations';
import getTopOperations from 'api/metrics/getTopOperations';
import axios from 'axios';
import { ActiveElement, Chart, ChartData, ChartEvent } from 'chart.js';
import Spinner from 'components/Spinner';
import { SOMETHING_WENT_WRONG } from 'constants/api';
import { QueryParams } from 'constants/query';
import ROUTES from 'constants/routes';
import Graph from 'container/GridGraphLayout/Graph/GraphWithoutDashboard';
import { routeConfig } from 'container/SideNav/config';
import { getQueryString } from 'container/SideNav/helper';
import useResourceAttribute from 'hooks/useResourceAttribute';
import {
	convertRawQueriesToTraceSelectedTags,
	resourceAttributesToTagFilterItems,
} from 'hooks/useResourceAttribute/utils';
import getStep from 'lib/getStep';
import history from 'lib/history';
import { useCallback, useMemo, useState } from 'react';
import { useQueries, UseQueryResult } from 'react-query';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useParams } from 'react-router-dom';
import { UpdateTimeInterval } from 'store/actions';
import { AppState } from 'store/reducers';
import { PayloadProps } from 'types/api/metrics/getServiceOverview';
import { PayloadProps as PayloadPropsTopOpertions } from 'types/api/metrics/getTopOperations';
import { EQueryType } from 'types/common/dashboard';
import { GlobalReducer } from 'types/reducer/globalTime';
import { Tags } from 'types/reducer/trace';
import { v4 as uuid } from 'uuid';

import { GraphTitle } from '../constant';
import { getWidgetQueryBuilder } from '../MetricsApplication.factory';
import {
	errorPercentage,
	letency,
	operationPerSec,
} from '../MetricsPageQueries/OverviewQueries';
import { Card, Col, GraphContainer, Row } from '../styles';
import TopOperationsTable from '../TopOperationsTable';
import { Button } from './styles';
import {
	handleNonInQueryRange,
	onGraphClickHandler,
	onViewTracePopupClick,
} from './util';

function Application(): JSX.Element {
	const { maxTime, minTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);
	const { servicename } = useParams<{ servicename?: string }>();
	const [selectedTimeStamp, setSelectedTimeStamp] = useState<number>(0);
	const { search } = useLocation();
	const { queries } = useResourceAttribute();
	const selectedTags = useMemo(
		() => (convertRawQueriesToTraceSelectedTags(queries) as Tags[]) || [],
		[queries],
	);

	const handleSetTimeStamp = useCallback((selectTime: number) => {
		setSelectedTimeStamp(selectTime);
	}, []);

	const dispatch = useDispatch();
	const handleGraphClick = useCallback(
		(type: string): ClickHandlerType => (
			ChartEvent: ChartEvent,
			activeElements: ActiveElement[],
			chart: Chart,
			data: ChartData,
		): void => {
			onGraphClickHandler(handleSetTimeStamp)(
				ChartEvent,
				activeElements,
				chart,
				data,
				type,
			);
		},
		[handleSetTimeStamp],
	);

	const queryResult = useQueries<
		[
			UseQueryResult<PayloadProps>,
			UseQueryResult<PayloadPropsTopOpertions>,
			UseQueryResult<ServiceDataProps>,
		]
	>([
		{
			queryKey: [servicename, selectedTags, minTime, maxTime],
			queryFn: (): Promise<PayloadProps> =>
				getServiceOverview({
					service: servicename || '',
					start: minTime,
					end: maxTime,
					step: getStep({
						start: minTime,
						end: maxTime,
						inputFormat: 'ns',
					}),
					selectedTags,
				}),
		},
		{
			queryKey: [minTime, maxTime, servicename, selectedTags],
			queryFn: (): Promise<PayloadPropsTopOpertions> =>
				getTopOperations({
					service: servicename || '',
					start: minTime,
					end: maxTime,
					selectedTags,
				}),
		},
		{
			queryKey: [servicename, minTime, maxTime, selectedTags],
			queryFn: (): Promise<ServiceDataProps> => getTopLevelOperations(),
		},
	]);

	const serviceOverviewIsLoading = queryResult[0].isLoading;
	const topOperations = queryResult[1].data;
	const topLevelOperations = queryResult[2].data;
	const topLevelOperationsLoading = queryResult[2].isLoading;
	const topLevelOperationsError = queryResult[2].error;
	const topLevelOperationsIsError = queryResult[2].isError;

	const selectedTraceTags: string = JSON.stringify(
		convertRawQueriesToTraceSelectedTags(queries) || [],
	);

	const tagFilterItems = useMemo(
		() =>
			handleNonInQueryRange(resourceAttributesToTagFilterItems(queries)) || [],
		[queries],
	);

	const latencyWidget = useMemo(
		() =>
			getWidgetQueryBuilder(
				{
					queryType: EQueryType.QUERY_BUILDER,
					promql: [],
					builder: letency({
						servicename,
						tagFilterItems,
					}),
					clickhouse_sql: [],
					id: uuid(),
				},
				GraphTitle.LATENCY,
			),
		[servicename, tagFilterItems],
	);

	const operationPerSecWidget = useMemo(
		() =>
			getWidgetQueryBuilder(
				{
					queryType: EQueryType.QUERY_BUILDER,
					promql: [],
					builder: operationPerSec({
						servicename,
						tagFilterItems,
						topLevelOperations: topLevelOperations
							? topLevelOperations[servicename || '']
							: [],
					}),
					clickhouse_sql: [],
					id: uuid(),
				},
				GraphTitle.RATE_PER_OPS,
			),
		[servicename, topLevelOperations, tagFilterItems],
	);

	const errorPercentageWidget = useMemo(
		() =>
			getWidgetQueryBuilder(
				{
					queryType: EQueryType.QUERY_BUILDER,
					promql: [],
					builder: errorPercentage({
						servicename,
						tagFilterItems,
						topLevelOperations: topLevelOperations
							? topLevelOperations[servicename || '']
							: [],
					}),
					clickhouse_sql: [],
					id: uuid(),
				},
				GraphTitle.ERROR_PERCENTAGE,
			),
		[servicename, topLevelOperations, tagFilterItems],
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

	const onErrorTrackHandler = (timestamp: number): void => {
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
					<Button
						type="default"
						size="small"
						id="Service_button"
						onClick={onViewTracePopupClick({
							servicename,
							selectedTraceTags,
							timestamp: selectedTimeStamp,
						})}
					>
						View Traces
					</Button>
					<Card>
						<GraphContainer>
							{serviceOverviewIsLoading && (
								<Spinner size="large" tip="Loading..." height="40vh" />
							)}
							{!serviceOverviewIsLoading && (
								<Graph
									name="service_latency"
									onDragSelect={onDragSelect}
									widget={latencyWidget}
									yAxisUnit="ms"
									onClickHandler={handleGraphClick('Service')}
								/>
							)}
						</GraphContainer>
					</Card>
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
					<Card>
						{topLevelOperationsIsError ? (
							<Typography>
								{axios.isAxiosError(topLevelOperationsError)
									? topLevelOperationsError.response?.data
									: SOMETHING_WENT_WRONG}
							</Typography>
						) : (
							<GraphContainer>
								{topLevelOperationsLoading && (
									<Spinner size="large" tip="Loading..." height="40vh" />
								)}
								{!topLevelOperationsLoading && (
									<Graph
										name="operations_per_sec"
										widget={operationPerSecWidget}
										onClickHandler={handleGraphClick('Rate')}
										yAxisUnit="ops"
										onDragSelect={onDragSelect}
									/>
								)}
							</GraphContainer>
						)}
					</Card>
				</Col>
			</Row>
			<Row gutter={24}>
				<Col span={12}>
					<Button
						type="default"
						size="small"
						id="Error_button"
						onClick={(): void => {
							onErrorTrackHandler(selectedTimeStamp);
						}}
					>
						View Traces
					</Button>

					<Card>
						{topLevelOperationsIsError ? (
							<Typography>
								{axios.isAxiosError(topLevelOperationsError)
									? topLevelOperationsError.response?.data
									: SOMETHING_WENT_WRONG}
							</Typography>
						) : (
							<GraphContainer>
								{topLevelOperationsLoading && (
									<Spinner size="large" tip="Loading..." height="40vh" />
								)}
								{!topLevelOperationsLoading && (
									<Graph
										name="error_percentage_%"
										onClickHandler={handleGraphClick('Error')}
										widget={errorPercentageWidget}
										yAxisUnit="%"
										onDragSelect={onDragSelect}
									/>
								)}
							</GraphContainer>
						)}
					</Card>
				</Col>

				<Col span={12}>
					<Card>
						<TopOperationsTable data={topOperations || []} />
					</Card>
				</Col>
			</Row>
		</>
	);
}

type ClickHandlerType = (
	ChartEvent: ChartEvent,
	activeElements: ActiveElement[],
	chart: Chart,
	data: ChartData,
	type?: string,
) => void;

export default Application;
