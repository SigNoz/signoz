import { Col } from 'antd';
import logEvent from 'api/common/logEvent';
import { ENTITY_VERSION_V4 } from 'constants/app';
import { QueryParams } from 'constants/query';
import { PANEL_TYPES } from 'constants/queryBuilder';
import Graph from 'container/GridCardLayout/GridCard';
import {
	databaseCallsAvgDuration,
	databaseCallsRPS,
} from 'container/MetricsApplication/MetricsPageQueries/DBCallQueries';
import useResourceAttribute from 'hooks/useResourceAttribute';
import {
	convertRawQueriesToTraceSelectedTags,
	resourceAttributesToTagFilterItems,
} from 'hooks/useResourceAttribute/utils';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import useUrlQuery from 'hooks/useUrlQuery';
import getStep from 'lib/getStep';
import history from 'lib/history';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useLocation, useParams } from 'react-router-dom';
import store from 'store';
import { UpdateTimeInterval } from 'store/actions';
import { TagFilterItem } from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';
import { v4 as uuid } from 'uuid';

import { GraphTitle, MENU_ITEMS, SERVICE_CHART_ID } from '../constant';
import { getWidgetQueryBuilder } from '../MetricsApplication.factory';
import { Card, GraphContainer, Row } from '../styles';
import { Button } from './styles';
import { IServiceName } from './types';
import {
	dbSystemTags,
	handleNonInQueryRange,
	onGraphClickHandler,
	onViewTracePopupClick,
	useGetAPMToTracesQueries,
} from './util';

function DBCall(): JSX.Element {
	const { servicename: encodedServiceName } = useParams<IServiceName>();

	const servicename = decodeURIComponent(encodedServiceName);
	const [selectedTimeStamp, setSelectedTimeStamp] = useState<number>(0);
	const { queries } = useResourceAttribute();
	const urlQuery = useUrlQuery();
	const { pathname } = useLocation();
	const dispatch = useDispatch();

	const onDragSelect = useCallback(
		(start: number, end: number) => {
			const startTimestamp = Math.trunc(start);
			const endTimestamp = Math.trunc(end);

			urlQuery.set(QueryParams.startTime, startTimestamp.toString());
			urlQuery.set(QueryParams.endTime, endTimestamp.toString());
			const generatedUrl = `${pathname}?${urlQuery.toString()}`;
			history.push(generatedUrl);

			if (startTimestamp !== endTimestamp) {
				dispatch(UpdateTimeInterval('custom', [startTimestamp, endTimestamp]));
			}
		},
		[dispatch, pathname, urlQuery],
	);

	const tagFilterItems: TagFilterItem[] = useMemo(
		() =>
			handleNonInQueryRange(resourceAttributesToTagFilterItems(queries)) || [],
		[queries],
	);

	const selectedTraceTags: string = useMemo(
		() =>
			JSON.stringify(
				convertRawQueriesToTraceSelectedTags(queries).concat(...dbSystemTags) || [],
			),
		[queries],
	);

	const legend = '{{db_system}}';

	const databaseCallsRPSWidget = useMemo(
		() =>
			getWidgetQueryBuilder({
				query: {
					queryType: EQueryType.QUERY_BUILDER,
					promql: [],
					builder: databaseCallsRPS({
						servicename,
						legend,
						tagFilterItems,
					}),
					clickhouse_sql: [],
					id: uuid(),
				},
				title: GraphTitle.DATABASE_CALLS_RPS,
				panelTypes: PANEL_TYPES.TIME_SERIES,
				yAxisUnit: 'reqps',
				id: SERVICE_CHART_ID.dbCallsRPS,
				fillSpans: false,
			}),
		[servicename, tagFilterItems],
	);
	const databaseCallsAverageDurationWidget = useMemo(
		() =>
			getWidgetQueryBuilder({
				query: {
					queryType: EQueryType.QUERY_BUILDER,
					promql: [],
					builder: databaseCallsAvgDuration({
						servicename,
						tagFilterItems,
					}),
					clickhouse_sql: [],
					id: uuid(),
				},
				title: GraphTitle.DATABASE_CALLS_AVG_DURATION,
				panelTypes: PANEL_TYPES.TIME_SERIES,
				yAxisUnit: 'ms',
				id: GraphTitle.DATABASE_CALLS_AVG_DURATION,
				fillSpans: true,
			}),
		[servicename, tagFilterItems],
	);

	const stepInterval = useMemo(
		() =>
			getStep({
				end: store.getState().globalTime.maxTime,
				inputFormat: 'ns',
				start: store.getState().globalTime.minTime,
			}),
		[],
	);

	const logEventCalledRef = useRef(false);

	useEffect(() => {
		if (!logEventCalledRef.current) {
			const selectedEnvironments = queries.find(
				(val) => val.tagKey === 'resource_deployment_environment',
			)?.tagValue;

			logEvent('APM: Service detail page visited', {
				selectedEnvironments,
				resourceAttributeUsed: !!queries?.length,
				section: 'dbMetrics',
			});
			logEventCalledRef.current = true;
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const apmToTraceQuery = useGetAPMToTracesQueries({
		servicename,
		isDBCall: true,
	});
	const { safeNavigate } = useSafeNavigate();

	return (
		<Row gutter={24}>
			<Col span={12}>
				<Button
					type="default"
					size="small"
					id="database_call_rps_button"
					onClick={onViewTracePopupClick({
						servicename,
						selectedTraceTags,
						timestamp: selectedTimeStamp,
						apmToTraceQuery,
						stepInterval,
						safeNavigate,
					})}
				>
					View Traces
				</Button>
				<Card data-testid="database_call_rps">
					<GraphContainer>
						<Graph
							widget={databaseCallsRPSWidget}
							onClickHandler={(xValue, yValue, mouseX, mouseY): void => {
								onGraphClickHandler(setSelectedTimeStamp)(
									xValue,
									yValue,
									mouseX,
									mouseY,
									'database_call_rps',
								);
							}}
							onDragSelect={onDragSelect}
							version={ENTITY_VERSION_V4}
						/>
					</GraphContainer>
				</Card>
			</Col>

			<Col span={12}>
				<Button
					type="default"
					size="small"
					id="database_call_avg_duration_button"
					onClick={onViewTracePopupClick({
						servicename,
						selectedTraceTags,
						timestamp: selectedTimeStamp,
						apmToTraceQuery,
						stepInterval,
						safeNavigate,
					})}
				>
					View Traces
				</Button>

				<Card data-testid="database_call_avg_duration">
					<GraphContainer>
						<Graph
							widget={databaseCallsAverageDurationWidget}
							headerMenuList={MENU_ITEMS}
							onClickHandler={(xValue, yValue, mouseX, mouseY): void => {
								onGraphClickHandler(setSelectedTimeStamp)(
									xValue,
									yValue,
									mouseX,
									mouseY,
									'database_call_avg_duration',
								);
							}}
							onDragSelect={onDragSelect}
							version={ENTITY_VERSION_V4}
						/>
					</GraphContainer>
				</Card>
			</Col>
		</Row>
	);
}

export default DBCall;
