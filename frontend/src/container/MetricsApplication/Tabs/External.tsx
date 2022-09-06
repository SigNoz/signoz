import { Col } from 'antd';
import FullView from 'container/GridGraphLayout/Graph/FullView/index.metricsBuilder';
import {
	externalCallDuration,
	externalCallDurationByAddress,
	externalCallErrorPercent,
	externalCallRpsByAddress,
} from 'container/MetricsApplication/MetricsPageQueries/ExternalQueries';
import React from 'react';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { AppState } from 'store/reducers';
import {
	IQueryBuilderTagFilterItems,
	Widgets,
} from 'types/api/dashboard/getAll';
import MetricReducer from 'types/reducer/metrics';

import { Card, GraphContainer, GraphTitle, Row } from '../styles';

function External({ getWidgetQueryBuilder }: ExternalProps): JSX.Element {
	const { servicename } = useParams<{ servicename?: string }>();
	const { resourceAttributeQueries } = useSelector<AppState, MetricReducer>(
		(state) => state.metrics,
	);

	/* Convert resource attributes to tagFilter items for queryBuilder */
	const temp: IQueryBuilderTagFilterItems[] | [] = [];
	resourceAttributeQueries.forEach((res) => {
		const tempObj: IQueryBuilderTagFilterItems = {
			id: `${res.id}`,
			key: `${res.tagKey}`,
			op: `${res.operator}`,
			value: `${res.tagValue}`.split(','),
		};
		temp.push(tempObj);
		return temp;
	});

	const legend = '{{address}}';

	return (
		<>
			<Row gutter={24}>
				<Col span={12}>
					<Card>
						<GraphTitle>External Call Error Percentage</GraphTitle>
						<GraphContainer>
							<FullView
								name="external_call_error_percentage"
								fullViewOptions={false}
								widget={getWidgetQueryBuilder({
									queryType: 1,
									promQL: [],
									metricsBuilder: externalCallErrorPercent(servicename, legend, temp),
									clickHouse: [],
								})}
								yAxisUnit="%"
							/>
						</GraphContainer>
					</Card>
				</Col>

				<Col span={12}>
					<Card>
						<GraphTitle>External Call duration</GraphTitle>
						<GraphContainer>
							<FullView
								name="external_call_duration"
								fullViewOptions={false}
								widget={getWidgetQueryBuilder({
									queryType: 1,
									promQL: [],
									metricsBuilder: externalCallDuration(servicename, temp),
									clickHouse: [],
								})}
								yAxisUnit="ms"
							/>
						</GraphContainer>
					</Card>
				</Col>
			</Row>

			<Row gutter={24}>
				<Col span={12}>
					<Card>
						<GraphTitle>External Call RPS(by Address)</GraphTitle>
						<GraphContainer>
							<FullView
								name="external_call_rps_by_address"
								fullViewOptions={false}
								widget={getWidgetQueryBuilder({
									queryType: 1,
									promQL: [],
									metricsBuilder: externalCallRpsByAddress(servicename, legend, temp),
									clickHouse: [],
								})}
								yAxisUnit="reqps"
							/>
						</GraphContainer>
					</Card>
				</Col>

				<Col span={12}>
					<Card>
						<GraphTitle>External Call duration(by Address)</GraphTitle>
						<GraphContainer>
							<FullView
								name="external_call_duration_by_address"
								fullViewOptions={false}
								widget={getWidgetQueryBuilder({
									queryType: 1,
									promQL: [],
									metricsBuilder: externalCallDurationByAddress(
										servicename,
										legend,
										temp,
									),
									clickHouse: [],
								})}
								yAxisUnit="ms"
							/>
						</GraphContainer>
					</Card>
				</Col>
			</Row>
		</>
	);
}

interface ExternalProps {
	getWidgetQueryBuilder: (query: Widgets['query']) => Widgets;
}

export default External;
