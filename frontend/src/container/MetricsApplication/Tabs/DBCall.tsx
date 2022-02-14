import { Col } from 'antd';
import React from 'react';
import Graph from 'components/Graph';
import { AppState } from 'store/reducers';
import MetricReducer from 'types/reducer/metrics';
import { Card, GraphContainer, GraphTitle, Row } from '../styles';
import { useSelector } from 'react-redux';
import { colors } from 'lib/getRandomColor';
import convertIntoEpoc from 'lib/covertIntoEpoc';

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
						<GraphTitle>Database Calls RPS</GraphTitle>
						<GraphContainer>
							<Graph
								name="database_call_rps"
								type="line"
								data={{
									datasets: dbRpsEndpoints.map((data, index) => {
										return {
											data: data.values.map((value) =>
												Number(parseFloat(value[1]).toFixed(2)),
											),
											borderColor: colors[index % colors.length],
											showLine: true,
											borderWidth: 1.5,
											spanGaps: true,
											pointRadius: 0,
										};
									}),
									labels: dbRpsEndpoints[0].values.map((data) => {
										return new Date(parseInt(convertIntoEpoc(data[0] * 1000), 10));
									}),
								}}
							/>
						</GraphContainer>
					</Card>
				</Col>

				<Col span={12}>
					<Card>
						<GraphTitle>Database Calls Avg Duration (in ms)</GraphTitle>
						<GraphContainer>
							<Graph
								name="database_call_avg_duration"
								type="line"
								data={{
									datasets: dbAvgDurationEndpoints.map((data, index) => {
										return {
											data: data.values.map((value) =>
												Number(parseFloat(value[1]).toFixed(2)),
											),
											borderColor: colors[index % colors.length],
											showLine: true,
											borderWidth: 1.5,
											spanGaps: true,
											pointRadius: 0,
										};
									}),
									labels: dbRpsEndpoints[0].values.map((data) => {
										return new Date(parseInt(convertIntoEpoc(data[0] * 1000), 10));
									}),
								}}
							/>
						</GraphContainer>
					</Card>
				</Col>
			</Row>
		</>
	);
};

export default DBCall;
