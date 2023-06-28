import { Typography } from 'antd';
import getServiceOverview from 'api/metrics/getServiceOverview';
import getTopLevelOperations from 'api/metrics/getTopLevelOperations';
import getTopOperations from 'api/metrics/getTopOperations';
import { AxiosError } from 'axios';
import { ActiveElement, Chart, ChartData, ChartEvent } from 'chart.js';
import Graph from 'components/Graph';
import Spinner from 'components/Spinner';
import { QueryParams } from 'constants/query';
import ROUTES from 'constants/routes';
import FullView from 'container/GridGraphLayout/Graph/FullView/index.metricsBuilder';
import { routeConfig } from 'container/SideNav/config';
import { getQueryString } from 'container/SideNav/helper';
import useResourceAttribute from 'hooks/useResourceAttribute';
import {
	convertRawQueriesToTraceSelectedTags,
	resourceAttributesToTagFilterItems,
} from 'hooks/useResourceAttribute/utils';
import convertToNanoSecondsToSecond from 'lib/convertToNanoSecondsToSecond';
import GetMinMax from 'lib/getMinMax';
import { colors } from 'lib/getRandomColor';
import getStep from 'lib/getStep';
import history from 'lib/history';
import { useCallback, useMemo, useState } from 'react';
import { useQuery } from 'react-query';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useParams } from 'react-router-dom';
import { UpdateTimeInterval } from 'store/actions';
import { AppState } from 'store/reducers';
import { Widgets } from 'types/api/dashboard/getAll';
import { EQueryType } from 'types/common/dashboard';
import { GlobalReducer } from 'types/reducer/globalTime';
import { Tags } from 'types/reducer/trace';
import { v4 as uuid } from 'uuid';

import {
	errorPercentage,
	operationPerSec,
} from '../MetricsPageQueries/OverviewQueries';
import { Card, Col, GraphContainer, GraphTitle, Row } from '../styles';
import TopOperationsTable from '../TopOperationsTable';
import { Button } from './styles';
import {
	handleNonInQueryRange,
	onGraphClickHandler,
	onViewTracePopupClick,
} from './util';

function Application({ getWidgetQueryBuilder }: DashboardProps): JSX.Element {
	const globalTime = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const { maxTime, minTime } = GetMinMax(globalTime.selectedTime, [
		globalTime.minTime / 1000000,
		globalTime.maxTime / 1000000,
	]);

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

	const {
		data: serviceOverview,
		error: serviceOverviewError,
		isError: serviceOverviewIsError,
		isLoading: serviceOverviewIsLoading,
	} = useQuery(
		[
			`getServiceOverview`,
			servicename,
			getStep({ start: minTime, end: maxTime, inputFormat: 'ns' }),
			selectedTags,
			globalTime.minTime,
			globalTime.maxTime,
		],
		() =>
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
	);

	const {
		data: topOperations,
		error: topOperationsError,
		isError: topOperationsIsError,
		isLoading: topOperationsLoading,
	} = useQuery(
		[
			`topOperation`,
			servicename,
			selectedTags,
			globalTime.minTime,
			globalTime.maxTime,
		],
		() =>
			getTopOperations({
				service: servicename || '',
				start: minTime,
				end: maxTime,
				selectedTags,
			}),
	);

	const {
		data: topLevelOperations,
		error: topLevelOperationsError,
		isError: topLevelOperationsIsError,
		isLoading: topLevelOperationsLoading,
	} = useQuery(
		[
			`topLevelOperation`,
			servicename,
			selectedTags,
			globalTime.minTime,
			globalTime.maxTime,
		],
		() => getTopLevelOperations(),
	);

	const selectedTraceTags: string = JSON.stringify(
		convertRawQueriesToTraceSelectedTags(queries) || [],
	);

	const tagFilterItems = useMemo(
		() =>
			handleNonInQueryRange(resourceAttributesToTagFilterItems(queries)) || [],
		[queries],
	);

	const operationPerSecWidget = useMemo(
		() =>
			getWidgetQueryBuilder({
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
			}),
		[getWidgetQueryBuilder, servicename, topLevelOperations, tagFilterItems],
	);

	const errorPercentageWidget = useMemo(
		() =>
			getWidgetQueryBuilder({
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
			}),
		[servicename, topLevelOperations, tagFilterItems, getWidgetQueryBuilder],
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

	const generalChartDataProperties = useCallback(
		(title: string, colorIndex: number) => ({
			borderColor: colors[colorIndex],
			label: title,
			showLine: true,
			borderWidth: 1.5,
			spanGaps: true,
			pointRadius: 2,
			pointHoverRadius: 4,
		}),
		[],
	);

	const dataSets = useMemo(() => {
		if (!serviceOverview) {
			return [];
		}

		return [
			{
				data: serviceOverview.map((e) =>
					parseFloat(convertToNanoSecondsToSecond(e.p99)),
				),
				...generalChartDataProperties('p99 Latency', 0),
			},
			{
				data: serviceOverview.map((e) =>
					parseFloat(convertToNanoSecondsToSecond(e.p95)),
				),
				...generalChartDataProperties('p95 Latency', 1),
			},
			{
				data: serviceOverview.map((e) =>
					parseFloat(convertToNanoSecondsToSecond(e.p50)),
				),
				...generalChartDataProperties('p50 Latency', 2),
			},
		];
	}, [generalChartDataProperties, serviceOverview]);

	const data = useMemo(() => {
		if (!serviceOverview) {
			return {
				datasets: [],
				labels: [],
			};
		}

		return {
			datasets: dataSets,
			labels: serviceOverview.map(
				(e) => new Date(parseFloat(convertToNanoSecondsToSecond(e.timestamp))),
			),
		};
	}, [serviceOverview, dataSets]);

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
						{serviceOverviewIsError && (
							<Typography>
								{(serviceOverviewError as AxiosError)?.response?.data}
							</Typography>
						)}
						{!serviceOverviewIsError && (
							<>
								<GraphTitle>Latency</GraphTitle>
								{serviceOverviewIsLoading && (
									<Spinner size="large" tip="Loading..." height="40vh" />
								)}
								{!serviceOverviewIsLoading && (
									<GraphContainer>
										<Graph
											animate={false}
											onClickHandler={handleGraphClick('Service')}
											name="service_latency"
											type="line"
											data={data}
											yAxisUnit="ms"
											onDragSelect={onDragSelect}
										/>
									</GraphContainer>
								)}
							</>
						)}
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
						{topLevelOperationsIsError && (
							<Typography>
								{(topLevelOperationsError as AxiosError).response?.data}
							</Typography>
						)}
						{!topLevelOperationsIsError && !topLevelOperationsLoading && (
							<>
								<GraphTitle>Rate (ops/s)</GraphTitle>
								<GraphContainer>
									<FullView
										name="operations_per_sec"
										fullViewOptions={false}
										onClickHandler={handleGraphClick('Rate')}
										widget={operationPerSecWidget}
										yAxisUnit="ops"
										onDragSelect={onDragSelect}
									/>
								</GraphContainer>
							</>
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
						{topLevelOperationsIsError && (
							<Typography>
								{(topLevelOperationsError as AxiosError).response?.data}
							</Typography>
						)}
						{!topLevelOperationsIsError && !topLevelOperationsLoading && (
							<>
								<GraphTitle>Error Percentage</GraphTitle>
								<GraphContainer>
									<FullView
										name="error_percentage_%"
										fullViewOptions={false}
										onClickHandler={handleGraphClick('Error')}
										widget={errorPercentageWidget}
										yAxisUnit="%"
										onDragSelect={onDragSelect}
									/>
								</GraphContainer>
							</>
						)}
					</Card>
				</Col>

				<Col span={12}>
					<Card>
						{topOperationsIsError && (
							<Typography>
								{(topOperationsError as AxiosError).response?.data}
							</Typography>
						)}
						{!topOperationsIsError && !topOperationsLoading && (
							<TopOperationsTable data={topOperations || []} />
						)}
					</Card>
				</Col>
			</Row>
		</>
	);
}

interface DashboardProps {
	getWidgetQueryBuilder: (query: Widgets['query']) => Widgets;
}

type ClickHandlerType = (
	ChartEvent: ChartEvent,
	activeElements: ActiveElement[],
	chart: Chart,
	data: ChartData,
	type?: string,
) => void;

export default Application;
