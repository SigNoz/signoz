import { Col } from 'antd';
import FullView from 'container/GridGraphLayout/Graph/FullView';
import React from 'react';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { AppState } from 'store/reducers';
import MetricReducer from 'types/reducer/metrics';

import { Card, Row } from '../styles';
import TopEndpointsTable from '../TopEndpointsTable';

const Application = (): JSX.Element => {
	const { servicename } = useParams<{ servicename?: string }>();

	const { topEndPoints } = useSelector<AppState, MetricReducer>(
		(state) => state.metrics,
	);

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
										query: `histogram_quantile(0.5, sum(signoz_latency_bucket{service_name="${servicename}", span_kind="SPAN_KIND_SERVER"}) by (le))`,
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
										query: `sum(rate(signoz_latency_count{service_name="${servicename}", span_kind="SPAN_KIND_SERVER"}[5m]))`,
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
						{/* <ErrorRateChart
								onTracePopupClick={onErrTracePopupClick}
								data={serviceOverview}
							/> */}
					</Card>
				</Col>

				<Col span={12}>
					<Card>
						<TopEndpointsTable data={topEndPoints} />
					</Card>
				</Col>
			</Row>
		</>
	);
};

export default Application;
