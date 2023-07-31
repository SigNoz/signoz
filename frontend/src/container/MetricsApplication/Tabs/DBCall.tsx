import { Col } from 'antd';
import { PANEL_TYPES } from 'constants/queryBuilder';
import Graph from 'container/GridGraphLayout/Graph/';
import {
	databaseCallsAvgDuration,
	databaseCallsRPS,
} from 'container/MetricsApplication/MetricsPageQueries/DBCallQueries';
import useResourceAttribute from 'hooks/useResourceAttribute';
import {
	convertRawQueriesToTraceSelectedTags,
	resourceAttributesToTagFilterItems,
} from 'hooks/useResourceAttribute/utils';
import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { TagFilterItem } from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';
import { v4 as uuid } from 'uuid';

import { GraphTitle } from '../constant';
import { getWidgetQueryBuilder } from '../MetricsApplication.factory';
import { Card, GraphContainer, Row } from '../styles';
import { Button } from './styles';
import { IServiceName } from './types';
import {
	dbSystemTags,
	handleNonInQueryRange,
	onGraphClickHandler,
	onViewTracePopupClick,
} from './util';

function DBCall(): JSX.Element {
	const { servicename } = useParams<IServiceName>();
	const [selectedTimeStamp, setSelectedTimeStamp] = useState<number>(0);
	const { queries } = useResourceAttribute();

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
			}),
		[servicename, tagFilterItems],
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
					<GraphContainer>
						<Graph
							name="database_call_rps"
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
							allowClone={false}
							allowDelete={false}
							allowEdit={false}
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
					<GraphContainer>
						<Graph
							name="database_call_avg_duration"
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
							allowClone={false}
							allowDelete={false}
							allowEdit={false}
						/>
					</GraphContainer>
				</Card>
			</Col>
		</Row>
	);
}

export default DBCall;
