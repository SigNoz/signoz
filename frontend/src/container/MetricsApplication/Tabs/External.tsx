import { Col } from 'antd';
import FullView from 'container/GridGraphLayout/Graph/FullView';
import React from 'react';
import { useParams } from 'react-router-dom';
import { Widgets } from 'types/api/dashboard/getAll';

import { Card, GraphContainer, GraphTitle, Row } from '../styles';

const External = ({ getWidget }: ExternalProps): JSX.Element => {
	const { servicename } = useParams<{ servicename?: string }>();

	return (
		<>
			<Row gutter={24}>
				<Col span={12}>
					<Card>
						<GraphTitle>External Call Error Percentage (%)</GraphTitle>
						<GraphContainer>
							<FullView
								fullViewOptions={false}
								noDataGraph
								widget={getWidget([
									{
										query: `(sum(rate(signoz_external_call_latency_count{service_name="${servicename}", status_code="STATUS_CODE_ERROR"}[1m]) OR rate(signoz_external_call_latency_count{service_name="${servicename}", http_status_code=~"5.."}[1m]) OR vector(0)) by (http_url))*100/sum(rate(signoz_external_call_latency_count{service_name="${servicename}"}[1m])) by (http_url)`,
										legend: '{{http_url}}',
									},
								])}
							/>
						</GraphContainer>
					</Card>
				</Col>

				<Col span={12}>
					<Card>
						<GraphTitle>External Call duration</GraphTitle>
						<GraphContainer>
							<FullView
								noDataGraph
								fullViewOptions={false}
								widget={getWidget([
									{
										query: `sum(rate(signoz_external_call_latency_sum{service_name="${servicename}"}[5m]))/sum(rate(signoz_external_call_latency_count{service_name="${servicename}"}[5m]))`,
										legend: 'Average Duration',
									},
								])}
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
								noDataGraph
								fullViewOptions={false}
								widget={getWidget([
									{
										query: `sum(rate(signoz_external_call_latency_count{service_name="${servicename}"}[5m])) by (http_url)`,
										legend: '{{http_url}}',
									},
								])}
							/>
						</GraphContainer>
					</Card>
				</Col>

				<Col span={12}>
					<Card>
						<GraphTitle>External Call duration(by Address)</GraphTitle>
						<GraphContainer>
							<FullView
								noDataGraph
								fullViewOptions={false}
								widget={getWidget([
									{
										query: `sum(rate(signoz_external_call_latency_sum{service_name="${servicename}"}[5m])/rate(signoz_external_call_latency_count{service_name="${servicename}"}[5m])) by (http_url)`,
										legend: '{{http_url}}',
									},
								])}
							/>
						</GraphContainer>
					</Card>
				</Col>
			</Row>
		</>
	);
};

interface ExternalProps {
	getWidget: (query: Widgets['query']) => Widgets;
}

export default External;
