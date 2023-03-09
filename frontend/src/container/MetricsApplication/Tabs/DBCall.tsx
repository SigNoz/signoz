import { Col } from 'antd';
import FullView from 'container/GridGraphLayout/Graph/FullView/index.metricsBuilder';
import {
	databaseCallsAvgDuration,
	databaseCallsRPS,
} from 'container/MetricsApplication/MetricsPageQueries/DBCallQueries';
import {
	convertRawQueriesToTraceSelectedTags,
	resourceAttributesToTagFilterItems,
} from 'lib/resourceAttributes';
import React, { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { AppState } from 'store/reducers';
import { Widgets } from 'types/api/dashboard/getAll';
import MetricReducer from 'types/reducer/metrics';

import { Card, GraphContainer, GraphTitle, Row } from '../styles';
import { Button } from './styles';
import {
	dbSystemTags,
	onGraphClickHandler,
	onViewTracePopupClick,
} from './util';

function DBCall({ getWidgetQueryBuilder }: DBCallProps): JSX.Element {
	const { servicename } = useParams<{ servicename?: string }>();
	const [selectedTimeStamp, setSelectedTimeStamp] = useState<number>(0);
	const { resourceAttributeQueries } = useSelector<AppState, MetricReducer>(
		(state) => state.metrics,
	);
	const tagFilterItems = useMemo(
		() => resourceAttributesToTagFilterItems(resourceAttributeQueries) || [],
		[resourceAttributeQueries],
	);
	const selectedTraceTags: string = useMemo(
		() =>
			JSON.stringify(
				convertRawQueriesToTraceSelectedTags(resourceAttributeQueries).concat(
					...dbSystemTags,
				) || [],
			),
		[resourceAttributeQueries],
	);
	const legend = '{{db_system}}';

	const databaseCallsRPSWidget = useMemo(
		() =>
			getWidgetQueryBuilder({
				queryType: 1,
				promQL: [],
				metricsBuilder: databaseCallsRPS({
					servicename,
					legend,
					tagFilterItems,
				}),
				clickHouse: [],
			}),
		[getWidgetQueryBuilder, servicename, tagFilterItems],
	);
	const databaseCallsAverageDurationWidget = useMemo(
		() =>
			getWidgetQueryBuilder({
				queryType: 1,
				promQL: [],
				metricsBuilder: databaseCallsAvgDuration({
					servicename,
					tagFilterItems,
				}),
				clickHouse: [],
			}),
		[getWidgetQueryBuilder, servicename, tagFilterItems],
	);

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
					})}
				>
					View Traces
				</Button>
				<Card>
					<GraphTitle>Database Calls RPS</GraphTitle>
					<GraphContainer>
						<FullView
							name="database_call_rps"
							fullViewOptions={false}
							widget={databaseCallsRPSWidget}
							yAxisUnit="reqps"
							onClickHandler={(ChartEvent, activeElements, chart, data): void => {
								onGraphClickHandler(setSelectedTimeStamp)(
									ChartEvent,
									activeElements,
									chart,
									data,
									'database_call_rps',
								);
							}}
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
					})}
				>
					View Traces
				</Button>
				<Card>
					<GraphTitle>Database Calls Avg Duration</GraphTitle>
					<GraphContainer>
						<FullView
							name="database_call_avg_duration"
							fullViewOptions={false}
							widget={databaseCallsAverageDurationWidget}
							yAxisUnit="ms"
							onClickHandler={(ChartEvent, activeElements, chart, data): void => {
								onGraphClickHandler(setSelectedTimeStamp)(
									ChartEvent,
									activeElements,
									chart,
									data,
									'database_call_avg_duration',
								);
							}}
						/>
					</GraphContainer>
				</Card>
			</Col>
		</Row>
	);
}

interface DBCallProps {
	getWidgetQueryBuilder: (query: Widgets['query']) => Widgets;
}

export default DBCall;
