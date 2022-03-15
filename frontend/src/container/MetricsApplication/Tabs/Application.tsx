import { ActiveElement, Chart, ChartData, ChartEvent } from 'chart.js';
import Graph from 'components/Graph';
import { METRICS_PAGE_QUERY_PARAM } from 'constants/query';
import ROUTES from 'constants/routes';
import FullView from 'container/GridGraphLayout/Graph/FullView';
import convertToNanoSecondsToSecond from 'lib/convertToNanoSecondsToSecond';
import { colors } from 'lib/getRandomColor';
import history from 'lib/history';
import React, { useRef } from 'react';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { AppState } from 'store/reducers';
import { Widgets } from 'types/api/dashboard/getAll';
import MetricReducer from 'types/reducer/metrics';

import { Card, Col, GraphContainer, GraphTitle, Row } from '../styles';
import TopEndpointsTable from '../TopEndpointsTable';
import { Button } from './styles';

const Application = ({ getWidget }: DashboardProps): JSX.Element => {
	const { servicename } = useParams<{ servicename?: string }>();
	const selectedTimeStamp = useRef(0);

	const { topEndPoints, serviceOverview } = useSelector<AppState, MetricReducer>(
		(state) => state.metrics,
	);

	const onTracePopupClick = (timestamp: number): void => {
		const currentTime = timestamp;
		const tPlusOne = timestamp + 1 * 60 * 1000;

		const urlParams = new URLSearchParams();
		urlParams.set(METRICS_PAGE_QUERY_PARAM.startTime, currentTime.toString());
		urlParams.set(METRICS_PAGE_QUERY_PARAM.endTime, tPlusOne.toString());

		history.replace(
			`${ROUTES.TRACE
			}?${urlParams.toString()}&selected={"serviceName":["${servicename}"],"status":["ok","error"]}&filterToFetchData=["duration","status","serviceName"]&userSelectedFilter={"status":["error","ok"],"serviceName":["${servicename}"]}&isSelectedFilterSkipped=true`,
		);
	};

	const onClickhandler = async (
		event: ChartEvent,
		elements: ActiveElement[],
		chart: Chart,
		data: ChartData,
		from: string,
	): Promise<void> => {
		if (event.native) {
			const points = chart.getElementsAtEventForMode(
				event.native,
				'nearest',
				{ intersect: true },
				true,
			);

			const id = `${from}_button`;
			const buttonElement = document.getElementById(id);

			if (points.length !== 0) {
				const firstPoint = points[0];

				if (data.labels) {
					const time = data?.labels[firstPoint.index] as Date;

					if (buttonElement) {
						buttonElement.style.display = 'block';
						buttonElement.style.left = `${firstPoint.element.x}px`;
						buttonElement.style.top = `${firstPoint.element.y}px`;
						selectedTimeStamp.current = time.getTime();
					}
				}
			} else {
				if (buttonElement && buttonElement.style.display === 'block') {
					buttonElement.style.display = 'none';
				}
			}
		}
	};

	const onErrorTrackHandler = (timestamp: number): void => {
		const currentTime = timestamp;
		const tPlusOne = timestamp + 1 * 60 * 1000;

		const urlParams = new URLSearchParams();
		urlParams.set(METRICS_PAGE_QUERY_PARAM.startTime, currentTime.toString());
		urlParams.set(METRICS_PAGE_QUERY_PARAM.endTime, tPlusOne.toString());

		history.replace(
			`${ROUTES.TRACE
			}?${urlParams.toString()}&selected={"serviceName":["${servicename}"],"status":["error"]}&filterToFetchData=["duration","status","serviceName"]&userSelectedFilter={"status":["error"],"serviceName":["${servicename}"]}&isSelectedFilterSkipped=true`,
		);
	};

	return (
		<>
			<Row gutter={24}>
				<Col span={12}>
					<Button
						type="default"
						size="small"
						id="Application_button"
						onClick={(): void => {
							onTracePopupClick(selectedTimeStamp.current);
						}}
					>
						View Traces
					</Button>
					<Card>
						<GraphTitle>Application latency in ms</GraphTitle>
						<GraphContainer>
							<Graph
								onClickHandler={(ChartEvent, activeElements, chart, data): void => {
									onClickhandler(ChartEvent, activeElements, chart, data, 'Application');
								}}
								name="application_latency"
								type="line"
								data={{
									datasets: [
										{
											data: serviceOverview.map((e) =>
												parseFloat(convertToNanoSecondsToSecond(e.p99)),
											),
											borderColor: colors[0],
											label: 'p99 Latency',
											showLine: true,
											borderWidth: 1.5,
											spanGaps: true,
											pointRadius: 1.5,
										},
										{
											data: serviceOverview.map((e) =>
												parseFloat(convertToNanoSecondsToSecond(e.p95)),
											),
											borderColor: colors[1],
											label: 'p95 Latency',
											showLine: true,
											borderWidth: 1.5,
											spanGaps: true,
											pointRadius: 1.5,
										},
										{
											data: serviceOverview.map((e) =>
												parseFloat(convertToNanoSecondsToSecond(e.p50)),
											),
											borderColor: colors[2],
											label: 'p50 Latency',
											showLine: true,
											borderWidth: 1.5,
											spanGaps: true,
											pointRadius: 1.5,
										},
									],
									labels: serviceOverview.map((e) => {
										return new Date(
											parseFloat(convertToNanoSecondsToSecond(e.timestamp)),
										);
									}),
								}}
								yAxisUnit="ms"
							/>
						</GraphContainer>
					</Card>
				</Col>

				<Col span={12}>
					<Button
						type="default"
						size="small"
						id="Request_button"
						onClick={(): void => {
							onTracePopupClick(selectedTimeStamp.current);
						}}
					>
						View Traces
					</Button>
					<Card>
						<GraphTitle>Request per sec</GraphTitle>
						<GraphContainer>
							<FullView
								name="request_per_sec"
								noDataGraph
								fullViewOptions={false}
								onClickHandler={(event, element, chart, data): void => {
									onClickhandler(event, element, chart, data, 'Request');
								}}
								widget={getWidget([
									{
										query: `sum(rate(signoz_latency_count{service_name="${servicename}", span_kind="SPAN_KIND_SERVER"}[2m]))`,
										legend: 'Request per second',
									},
								])}
								yAxisUnit="short"
							/>
						</GraphContainer>
					</Card>
				</Col>
			</Row>
			<Row gutter={24}>
				<Col span={12}>
					<Button
						type="default"
						size="small"
						id="Error_button"
						onClick={(): void => {
							onErrorTrackHandler(selectedTimeStamp.current);
						}}
					>
						View Traces
					</Button>

					<Card>
						<GraphTitle>Error Percentage (%)</GraphTitle>
						<GraphContainer>
							<FullView
								name="error_percentage_%"
								noDataGraph
								fullViewOptions={false}
								onClickHandler={(ChartEvent, activeElements, chart, data): void => {
									onClickhandler(ChartEvent, activeElements, chart, data, 'Error');
								}}
								widget={getWidget([
									{
										query: `max(sum(rate(signoz_calls_total{service_name="${servicename}", span_kind="SPAN_KIND_SERVER", status_code="STATUS_CODE_ERROR"}[1m]) OR rate(signoz_calls_total{service_name="${servicename}", span_kind="SPAN_KIND_SERVER", http_status_code=~"5.."}[1m]))*100/sum(rate(signoz_calls_total{service_name="${servicename}", span_kind="SPAN_KIND_SERVER"}[1m]))) < 1000 OR vector(0)`,
										legend: 'Error Percentage (%)',
									},
								])}
								yAxisUnit="%"
							/>
						</GraphContainer>
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

interface DashboardProps {
	getWidget: (query: Widgets['query']) => Widgets;
}

export default Application;
