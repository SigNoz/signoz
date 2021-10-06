import { Col } from 'antd';
import FullView from 'container/GridGraphLayout/Graph/FullView';
import React from 'react';
import { useParams } from 'react-router-dom';

import { Card, GraphContainer, GraphTitle, Row } from '../styles';

const External = (): JSX.Element => {
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
								widget={{
									query: [
										{
											query: ``,
										},
									],
									description: '',
									id: '',
									isStacked: false,
									nullZeroValues: '',
									opacity: '0',
									panelTypes: 'TIME_SERIES',
									queryData: {
										data: [],
										error: false,
										errorMessage: '',
										loading: false,
									},
									timePreferance: 'GLOBAL_TIME',
									title: '',
									stepSize: 30,
								}}
							/>
						</GraphContainer>
					</Card>
				</Col>

				<Col span={12}>
					<Card>
						<GraphTitle>External Call duration</GraphTitle>
						<GraphContainer>
							<FullView
								fullViewOptions={false}
								widget={{
									query: [
										{
											query: `sum(rate(signoz_external_call_latency_sum{service_name="${servicename}"}[5m]))/sum(rate(signoz_external_call_latency_count{service_name="${servicename}"}[5m]))`,
											legend: 'Average Duration',
										},
									],
									description: '',
									id: '',
									isStacked: false,
									nullZeroValues: '',
									opacity: '0',
									panelTypes: 'TIME_SERIES',
									queryData: {
										data: [],
										error: false,
										errorMessage: '',
										loading: false,
									},
									timePreferance: 'GLOBAL_TIME',
									title: '',
									stepSize: 30,
								}}
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
								fullViewOptions={false}
								widget={{
									query: [
										{
											query: `sum(rate(signoz_external_call_latency_count{service_name="${servicename}"}[5m])) by (http_url)`,
											legend: '0.0.0.0:8081',
										},
									],
									description: '',
									id: '',
									isStacked: false,
									nullZeroValues: '',
									opacity: '0',
									panelTypes: 'TIME_SERIES',
									queryData: {
										data: [],
										error: false,
										errorMessage: '',
										loading: false,
									},
									timePreferance: 'GLOBAL_TIME',
									title: '',
									stepSize: 30,
								}}
							/>
						</GraphContainer>
					</Card>
				</Col>

				<Col span={12}>
					<Card>
						<GraphTitle>External Call duration(by Address)</GraphTitle>
						<GraphContainer>
							<FullView
								fullViewOptions={false}
								widget={{
									query: [
										{
											query: `sum(rate(signoz_external_call_latency_sum{service_name="${servicename}"}[5m])/rate(signoz_external_call_latency_count{service_name="${servicename}"}[5m])) by (http_url)`,
											legend: '0.0.0.0:8083',
										},
									],
									description: '',
									id: '',
									isStacked: false,
									nullZeroValues: '',
									opacity: '0',
									panelTypes: 'TIME_SERIES',
									queryData: {
										data: [],
										error: false,
										errorMessage: '',
										loading: false,
									},
									timePreferance: 'GLOBAL_TIME',
									title: '',
									stepSize: 30,
								}}
							/>
						</GraphContainer>
					</Card>
				</Col>
			</Row>
		</>
	);
};

export default External;
