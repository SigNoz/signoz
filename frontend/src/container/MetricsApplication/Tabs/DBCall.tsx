import { Col } from 'antd';
import FullView from 'container/GridGraphLayout/Graph/FullView';
import React from 'react';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { AppState } from 'store/reducers';
import { Widgets } from 'types/api/dashboard/getAll';
import MetricReducer from 'types/reducer/metrics';

import { Card, GraphContainer, GraphTitle, Row } from '../styles';

function DBCall({ getWidget }: DBCallProps): JSX.Element {
	const { servicename } = useParams<{ servicename?: string }>();
	const { resourceAttributePromQLQuery } = useSelector<AppState, MetricReducer>(
		(state) => state.metrics,
	);
	return (
		<Row gutter={24}>
			<Col span={12}>
				<Card>
					<GraphTitle>Database Calls RPS</GraphTitle>
					<GraphContainer>
						<FullView
							name="database_call_rps"
							fullViewOptions={false}
							widget={getWidget([
								{
									query: `sum(rate(signoz_db_latency_count{service_name="${servicename}"${resourceAttributePromQLQuery}}[1m])) by (db_system)`,
									legend: '{{db_system}}',
								},
							])}
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
							widget={getWidget([
								{
									query: `sum(rate(signoz_db_latency_sum{service_name="${servicename}"${resourceAttributePromQLQuery}}[5m]))/sum(rate(signoz_db_latency_count{service_name="${servicename}"${resourceAttributePromQLQuery}}[5m]))`,
									legend: '',
								},
							])}
							yAxisUnit="ms"
						/>
					</GraphContainer>
				</Card>
			</Col>
		</Row>
	);
}

interface DBCallProps {
	getWidget: (query: Widgets['query']) => Widgets;
}

export default DBCall;
