import { Col } from 'antd';
import FullView from 'container/GridGraphLayout/Graph/FullView';
import React from 'react';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { AppState } from 'store/reducers';
import { PromQLWidgets } from 'types/api/dashboard/getAll';
import MetricReducer from 'types/reducer/metrics';

import { Card, GraphContainer, GraphTitle, Row } from '../styles';

function External({ getWidget }: ExternalProps): JSX.Element {
	const { servicename } = useParams<{ servicename?: string }>();
	const { resourceAttributePromQLQuery } = useSelector<AppState, MetricReducer>(
		(state) => state.metrics,
	);
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
								widget={getWidget([
									{
										query: `max((sum(rate(signoz_external_call_latency_count{service_name="${servicename}", status_code="STATUS_CODE_ERROR"${resourceAttributePromQLQuery}}[5m]) OR vector(0)) by (address))*100/sum(rate(signoz_external_call_latency_count{service_name="${servicename}"${resourceAttributePromQLQuery}}[5m])) by (address)) < 1000 OR vector(0)`,
										legend: 'External Call Error Percentage',
									},
								])}
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
								widget={getWidget([
									{
										query: `sum(rate(signoz_external_call_latency_sum{service_name="${servicename}"${resourceAttributePromQLQuery}}[5m]))/sum(rate(signoz_external_call_latency_count{service_name="${servicename}"${resourceAttributePromQLQuery}}[5m]))`,
										legend: 'Average Duration',
									},
								])}
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
								widget={getWidget([
									{
										query: `sum(rate(signoz_external_call_latency_count{service_name="${servicename}"${resourceAttributePromQLQuery}}[5m])) by (address)`,
										legend,
									},
								])}
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
								widget={getWidget([
									{
										query: `(sum(rate(signoz_external_call_latency_sum{service_name="${servicename}"${resourceAttributePromQLQuery}}[5m])) by (address))/(sum(rate(signoz_external_call_latency_count{service_name="${servicename}"${resourceAttributePromQLQuery}}[5m])) by (address))`,
										legend,
									},
								])}
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
	getWidget: (query: PromQLWidgets['query']) => PromQLWidgets;
}

export default External;
