import { ActiveElement, Chart, ChartData, ChartEvent } from 'chart.js';
import Graph from 'components/Graph';
import { METRICS_PAGE_QUERY_PARAM } from 'constants/query';
import ROUTES from 'constants/routes';
import FullView from 'container/GridGraphLayout/Graph/FullView';
import { colors } from 'lib/getRandomColor';
import history from 'lib/history';
import React, { useRef } from 'react';
import { connect, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { bindActionCreators } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { GlobalTimeLoading } from 'store/actions';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { Widgets } from 'types/api/dashboard/getAll';
import MetricReducer from 'types/reducer/metrics';

import { Card, Col, GraphContainer, GraphTitle, Row } from '../styles';
import TopEndpointsTable from '../TopEndpointsTable';
import { Button } from './styles';

const Application = ({
	globalLoading,
	getWidget,
}: DashboardProps): JSX.Element => {
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
		if (servicename) {
			urlParams.set(METRICS_PAGE_QUERY_PARAM.service, servicename);
		}

		globalLoading();
		history.push(`${ROUTES.TRACES}?${urlParams.toString()}`);
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
						selectedTimeStamp.current = new Date(time).getTime();
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
		if (servicename) {
			urlParams.set(METRICS_PAGE_QUERY_PARAM.service, servicename);
		}
		urlParams.set(METRICS_PAGE_QUERY_PARAM.error, 'true');

		globalLoading();
		history.push(`${ROUTES.TRACES}?${urlParams.toString()}`);
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
								type="line"
								data={{
									datasets: [
										{
											data: serviceOverview.map((e) => e.p99),
											borderColor: colors[0],
											label: 'p99 Latency',
											showLine: true,
											borderWidth: 1.5,
											spanGaps: true,
											pointRadius: 1.5,
										},
										{
											data: serviceOverview.map((e) => e.p95),
											borderColor: colors[1],
											label: 'p95 Latency',
											showLine: true,
											borderWidth: 1.5,
											spanGaps: true,
											pointRadius: 1.5,
										},
										{
											data: serviceOverview.map((e) => e.p50),
											borderColor: colors[2],
											label: 'p50 Latency',
											showLine: true,
											borderWidth: 1.5,
											spanGaps: true,
											pointRadius: 1.5,
										},
									],
									labels: serviceOverview.map((e) => {
										return new Date(e.timestamp / 1000000);
									}),
								}}
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
						<Card>
							<GraphTitle>Error Percentage (%)</GraphTitle>
							<GraphContainer>
								<FullView
									noDataGraph
									fullViewOptions={false}
									onClickHandler={(ChartEvent, activeElements, chart, data): void => {
										onClickhandler(ChartEvent, activeElements, chart, data, 'Error');
									}}
									widget={getWidget([
										{
											query: `sum(rate(signoz_calls_total{service_name="${servicename}", span_kind="SPAN_KIND_SERVER", status_code="STATUS_CODE_ERROR"}[1m]) OR rate(signoz_calls_total{service_name="${servicename}", span_kind="SPAN_KIND_SERVER", http_status_code=~"5.."}[1m]) OR vector(0))*100/sum(rate(signoz_calls_total{service_name="${servicename}", span_kind="SPAN_KIND_SERVER"}[1m]))`,
											legend: 'Error Percentage (%)',
										},
									])}
								/>
							</GraphContainer>
						</Card>
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

interface DispatchProps {
	globalLoading: () => void;
}

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
): DispatchProps => ({
	globalLoading: bindActionCreators(GlobalTimeLoading, dispatch),
});

interface DashboardProps extends DispatchProps {
	getWidget: (query: Widgets['query']) => Widgets;
}

export default connect(null, mapDispatchToProps)(Application);
