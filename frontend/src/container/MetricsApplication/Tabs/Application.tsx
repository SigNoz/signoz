import { ActiveElement, Chart, ChartData, ChartEvent } from 'chart.js';
import Graph from 'components/Graph';
import { METRICS_PAGE_QUERY_PARAM } from 'constants/query';
import ROUTES from 'constants/routes';
import FullView from 'container/GridGraphLayout/Graph/FullView';
import { Time } from 'container/Header/DateTimeSelection/config';
import { colors } from 'lib/getRandomColor';
import history from 'lib/history';
import React, { useState } from 'react';
import { connect, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { bindActionCreators, Dispatch } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { GlobalTimeLoading, UpdateTimeInterval } from 'store/actions';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { Widgets } from 'types/api/dashboard/getAll';
import MetricReducer from 'types/reducer/metrics';

import { Card, Col, GraphContainer, GraphTitle, Row } from '../styles';
import TopEndpointsTable from '../TopEndpointsTable';
import { Button } from './styles';

const Application = ({
	updateTimeInterval,
	globalLoading,
	getWidget,
}: DashboardProps): JSX.Element => {
	const { servicename } = useParams<{ servicename?: string }>();
	const [buttonState, setButtonState] = useState({
		xCoordinate: 0,
		yCoordinate: 0,
		show: false,
		selectedTimeStamp: 0,
		from: '',
	});

	const { topEndPoints, serviceOverview } = useSelector<AppState, MetricReducer>(
		(state) => state.metrics,
	);

	const onTracePopupClick = (timestamp: number): void => {
		const currentTime = timestamp;
		const tPlusOne = timestamp + 1 * 60 * 1000;

		updateTimeInterval('custom', [currentTime, tPlusOne]); // updateTimeInterval takes second range in ms -- give -5 min to selected time,

		const urlParams = new URLSearchParams();
		urlParams.set(METRICS_PAGE_QUERY_PARAM.startTime, currentTime.toString());
		urlParams.set(METRICS_PAGE_QUERY_PARAM.endTime, tPlusOne.toString());
		if (servicename) {
			urlParams.set(METRICS_PAGE_QUERY_PARAM.service, servicename);
		}

		history.push(`${ROUTES.TRACES}?${urlParams.toString()}`);
		globalLoading();
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

			if (points.length) {
				const firstPoint = points[0];

				if (data.labels) {
					const time = data?.labels[firstPoint.index] as Date;

					setButtonState({
						selectedTimeStamp: new Date(time).getTime(),
						xCoordinate: firstPoint.element.x,
						show: true,
						yCoordinate: firstPoint.element.y,
						from,
					});
				}
			} else {
				if (buttonState.show) {
					setButtonState((state) => ({
						...state,
						show: false,
					}));
				}
			}
		}
	};

	return (
		<>
			<Row gutter={24}>
				<Col span={12}>
					{buttonState.from === 'Application' && (
						<Button
							type="default"
							size="small"
							{...{
								showbutton: buttonState.show,
								x: buttonState.xCoordinate,
								y: buttonState.yCoordinate,
							}}
							onClick={(): void => onTracePopupClick(buttonState.selectedTimeStamp)}
						>
							View Traces
						</Button>
					)}
					<Card>
						<GraphTitle>Application latency in ms</GraphTitle>
						<GraphContainer>
							<Graph
								onClickHandler={(Chart, activeElements): void => {
									onTracePopupClick(
										serviceOverview[activeElements[0].datasetIndex].timestamp,
									);
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
										return new Date(e.timestamp / 100000);
									}),
								}}
							/>
						</GraphContainer>
					</Card>
				</Col>

				<Col span={12}>
					{buttonState.from === 'Request' && (
						<Button
							type="default"
							size="small"
							{...{
								showbutton: buttonState.show,
								x: buttonState.xCoordinate,
								y: buttonState.yCoordinate,
							}}
							onClick={(): void => onTracePopupClick(buttonState.selectedTimeStamp)}
						>
							View Traces
						</Button>
					)}
					<Card>
						<GraphTitle>Request per sec</GraphTitle>
						<GraphContainer>
							<FullView
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
					<Card>
						<Card>
							<GraphTitle>Error Percentage (%)</GraphTitle>
							<GraphContainer>
								<FullView
									fullViewOptions={false}
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
	updateTimeInterval: (
		interval: Time,
		dateTimeRange?: [number, number],
	) => (dispatch: Dispatch<AppActions>) => void;
	globalLoading: () => void;
}

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
): DispatchProps => ({
	updateTimeInterval: bindActionCreators(UpdateTimeInterval, dispatch),
	globalLoading: bindActionCreators(GlobalTimeLoading, dispatch),
});

interface DashboardProps extends DispatchProps {
	getWidget: (query: Widgets['query']) => Widgets;
}

export default connect(null, mapDispatchToProps)(Application);
