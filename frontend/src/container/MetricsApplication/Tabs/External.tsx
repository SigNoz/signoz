import { Col } from 'antd';
import Graph from 'components/Graph';
import convertIntoEpoc from 'lib/covertIntoEpoc';
import { colors } from 'lib/getRandomColor';
import React from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import MetricReducer from 'types/reducer/metrics';

import { Card, GraphContainer, GraphTitle, Row } from '../styles';

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
						<GraphTitle>External Call Error Percentage (%)</GraphTitle>
						<GraphContainer>
							<Graph
								name="external_call_error_percentage%"
								type="line"
								data={{
									datasets: externalErrorEndpoints.map((data, index) => {
										return {
											data: data.values.map((value) =>
												Number(parseFloat(value[1]).toFixed(2)),
											),
											borderColor: colors[index % colors.length],
											label: 'External Call Error Percentage (%)',
											showLine: true,
											borderWidth: 1.5,
											spanGaps: true,
											pointRadius: 0,
										};
									}),
									labels: externalErrorEndpoints[0].values.map((data) => {
										return new Date(parseInt(convertIntoEpoc(data[0] * 1000), 10));
									}),
								}}
							/>
						</GraphContainer>
					</Card>
				</Col>

				<Col span={12}>
					<Card>
						<GraphTitle>External Call duration</GraphTitle>
						<GraphContainer>
							<Graph
								name="external_call_duration%"
								type="line"
								data={{
									datasets: externalCallEndpoint.map((data, index) => {
										return {
											data: data.values.map((value) =>
												Number(parseFloat(value[1]).toFixed(2)),
											),
											borderColor: colors[index % colors.length],
											label: 'Average Duration',
											showLine: true,
											borderWidth: 1.5,
											spanGaps: true,
											pointRadius: 0,
										};
									}),
									labels: externalCallEndpoint[0].values.map((data) => {
										return new Date(parseInt(convertIntoEpoc(data[0] * 1000), 10));
									}),
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
							<Graph
								name="external_call_rps_by_address"
								type="line"
								data={{
									datasets: addressedExternalCallRPSResponse.map((data, index) => {
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
									labels: addressedExternalCallRPSResponse[0].values.map((data) => {
										return new Date(parseInt(convertIntoEpoc(data[0] * 1000), 10));
									}),
								}}
							/>
						</GraphContainer>
					</Card>
				</Col>

				<Col span={12}>
					<Card>
						<GraphTitle>External Call duration(by Address)</GraphTitle>
						<GraphContainer>
							<Graph
								name="external_call_duration_by_address"
								type="line"
								data={{
									datasets: addressedExternalCallDurationResponse.map((data, index) => {
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
									labels: addressedExternalCallDurationResponse[0].values.map((data) => {
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

export default External;
