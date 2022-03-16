import { Col } from 'antd';
import React from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import MetricReducer from 'types/reducer/metrics';
import DashboardGraph from 'components/DashboardGraph';

import { Card, Row } from '../styles';

const External = (): JSX.Element => {
	const {
		externalCallEndpoint,
		externalErrorEndpoints,
		addressedExternalCallRPSResponse,
		addressedExternalCallDurationResponse,
	} = useSelector<AppState, MetricReducer>((state) => state.metrics);

	return (
		<>
			<Row gutter={24}>
				<Col span={12}>
					<Card>
						<DashboardGraph
							title="External Call Error Percentage (%)"
							name="external_call_error_percentage%"
							type="line"
							endpointData={externalErrorEndpoints}
							label="External Call Error Percentage (%)"
						/>
					</Card>
				</Col>

				<Col span={12}>
					<Card>
						<DashboardGraph
							title="External Call duration"
							name="external_call_duration%"
							type="line"
							endpointData={externalCallEndpoint}
							label="Average Duration"
						/>
					</Card>
				</Col>
			</Row>

			<Row gutter={24}>
				<Col span={12}>
					<Card>
						<DashboardGraph
							title="External Call RPS(by Address)"
							name="external_call_rps_by_address"
							type="line"
							endpointData={addressedExternalCallRPSResponse}
						/>
					</Card>
				</Col>

				<Col span={12}>
					<Card>
						<DashboardGraph
							title="External Call duration(by Address)"
							name="external_call_duration_by_address"
							type="line"
							endpointData={addressedExternalCallDurationResponse}
						/>
					</Card>
				</Col>
			</Row>
		</>
	);
};

export default External;
