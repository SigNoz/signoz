import { Col } from 'antd';
import React from 'react';
import { AppState } from 'store/reducers';
import MetricReducer from 'types/reducer/metrics';
import { Card, Row } from '../styles';
import { useSelector } from 'react-redux';
import DashboardGraph from 'components/DashboardGraph';

const DBCall = (): JSX.Element => {
	const { dbRpsEndpoints, dbAvgDurationEndpoints } = useSelector<
		AppState,
		MetricReducer
	>((state) => state.metrics);

	return (
		<>
			<Row gutter={24}>
				<Col span={12}>
					<Card>
						<DashboardGraph
							title="Database Calls RPS"
							name="database_call_rps"
							type="line"
							endpointData={dbRpsEndpoints}
						/>
					</Card>
				</Col>

				<Col span={12}>
					<Card>
						<DashboardGraph
							title="Database Calls Avg Duration (in ms)"
							name="database_call_avg_duration"
							type="line"
							endpointData={dbAvgDurationEndpoints}
						/>
					</Card>
				</Col>
			</Row>
		</>
	);
};

export default DBCall;
