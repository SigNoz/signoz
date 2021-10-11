import { Col } from 'antd';
import { ActiveElement, Chart, ChartData, ChartEvent } from 'chart.js';
import { METRICS_PAGE_QUERY_PARAM } from 'constants/query';
import ROUTES from 'constants/routes';
import FullView from 'container/GridGraphLayout/Graph/FullView';
import { Time } from 'container/Header/DateTimeSelection/config';
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

import { Card, GraphContainer, GraphTitle, Row } from '../styles';
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
	});

	const { topEndPoints } = useSelector<AppState, MetricReducer>(
		(state) => state.metrics,
	);

	const onTracePopupClick = (timestamp: number): void => {
		const currentTime = timestamp / 1000000;
		const tPlusOne = timestamp / 1000000 + 1 * 60 * 1000;

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
				<Button
					type="primary"
					{...{
						showbutton: buttonState.show,
						x: buttonState.xCoordinate,
						y: buttonState.yCoordinate,
					}}
					onClick={(): void => onTracePopupClick(buttonState.selectedTimeStamp)}
				>
					View
				</Button>

				<Col span={12}>
					<Card>
						<GraphTitle>Application latency in ms</GraphTitle>
						<GraphContainer>
							<FullView
								onClickHandler={(event, element, chart, data): void => {
									onClickhandler(event, element, chart, data);
								}}
								fullViewOptions={false}
								widget={getWidget([
									{
										query: `histogram_quantile(0.5, sum(rate(signoz_latency_bucket{service_name="${servicename}", span_kind="SPAN_KIND_SERVER"}[1m])) by (le))`,
										legend: 'p50 latency',
									},
									{
										query: `histogram_quantile(0.9, sum(rate(signoz_latency_bucket{service_name="${servicename}", span_kind="SPAN_KIND_SERVER"}[1m])) by (le))`,
										legend: 'p90 latency',
									},
									{
										query: `histogram_quantile(0.99, sum(rate(signoz_latency_bucket{service_name="${servicename}", span_kind="SPAN_KIND_SERVER"}[1m])) by (le))`,
										legend: 'p99 latency',
									},
								])}
							/>
						</GraphContainer>
					</Card>
				</Col>

				<Col span={12}>
					<Card>
						<GraphTitle>Request per sec</GraphTitle>
						<GraphContainer>
							<FullView
								fullViewOptions={false}
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
