import { Col } from 'antd';
import FullView from 'container/GridGraphLayout/Graph/FullView/index.metricsBuilder';
import {
	databaseCallsAvgDuration,
	databaseCallsRPS,
} from 'container/MetricsApplication/MetricsPageQueries/DBCallQueries';
import { resourceAttributesToTagFilterItems } from 'lib/resourceAttributes';
import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { AppState } from 'store/reducers';
import { Widgets } from 'types/api/dashboard/getAll';
import MetricReducer from 'types/reducer/metrics';

import { Card, GraphContainer, GraphTitle, Row } from '../styles';

function DBCall({ getWidgetQueryBuilder }: DBCallProps): JSX.Element {
	const { servicename } = useParams<{ servicename?: string }>();
	const { resourceAttributeQueries } = useSelector<AppState, MetricReducer>(
		(state) => state.metrics,
	);
	const tagFilterItems = useMemo(
		() => resourceAttributesToTagFilterItems(resourceAttributeQueries) || [],
		[resourceAttributeQueries],
	);
	const legend = '{{db_system}}';

	return (
		<Row gutter={24}>
			<Col span={12}>
				<Card>
					<GraphTitle>Database Calls RPS</GraphTitle>
					<GraphContainer>
						<FullView
							name="database_call_rps"
							fullViewOptions={false}
							widget={getWidgetQueryBuilder({
								queryType: 1,
								promQL: [],
								metricsBuilder: databaseCallsRPS({
									servicename,
									legend,
									tagFilterItems,
								}),
								clickHouse: [],
							})}
							yAxisUnit="reqps"
						/>
					</GraphContainer>
				</Card>
			</Col>

			<Col span={12}>
				<Card>
					<GraphTitle>Database Calls Avg Duration</GraphTitle>
					<GraphContainer>
						<FullView
							name="database_call_avg_duration"
							fullViewOptions={false}
							widget={getWidgetQueryBuilder({
								queryType: 1,
								promQL: [],
								metricsBuilder: databaseCallsAvgDuration({
									servicename,
									tagFilterItems,
								}),
								clickHouse: [],
							})}
							yAxisUnit="ms"
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
