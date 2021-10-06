import { Col } from 'antd';
import FullView from 'container/GridGraphLayout/Graph/FullView';
import React from 'react';
import { useParams } from 'react-router-dom';

import { Card, Row } from '../styles';

const External = (): JSX.Element => {
	const { servicename } = useParams<{ servicename?: string }>();

	return (
		<>
			<Row gutter={24}>
				<Col span={12}>
					<Card>
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
					</Card>
				</Col>

				<Col span={12}>
					<Card>
						<FullView
							fullViewOptions={false}
							widget={{
								query: [
									{
										query: `sum(rate(signoz_external_call_latency_sum{service_name="${servicename}"}[5m]))/sum(rate(signoz_external_call_latency_count{service_name="${servicename}"}[5m]))`,
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
					</Card>
				</Col>
			</Row>

			<Row gutter={24}>
				<Col span={12}>
					<Card>
						<FullView
							fullViewOptions={false}
							widget={{
								query: [
									{
										query: `sum(rate(signoz_external_call_latency_count{service_name="${servicename}"}[5m])) by (http_url)`,
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
					</Card>
				</Col>

				<Col span={12}>
					<Card>
						<FullView
							fullViewOptions={false}
							widget={{
								query: [
									{
										query: `sum(rate(signoz_external_call_latency_sum{service_name="${servicename}"}[5m])/rate(signoz_external_call_latency_count{service_name="${servicename}"}[5m])) by (http_url)`,
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
					</Card>
				</Col>
			</Row>
		</>
	);
};

export default External;
