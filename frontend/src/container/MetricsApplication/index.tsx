import { Col, Tabs } from 'antd';
import { METRICS_PAGE_QUERY_PARAM } from 'constants/query';
import ROUTES from 'constants/routes';
import { Time } from 'container/Header/DateTimeSelection/config';
import history from 'lib/history';
import React from 'react';
import { connect, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { bindActionCreators, Dispatch } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { UpdateTimeInterval } from 'store/actions';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import MetricReducer from 'types/reducer/metrics';

import ErrorRateChart from './ErrorRateChart';
import ExternalApiGraph from './ExternalApi';
import LatencyLineChart from './LatencyLineChart';
import RequestRateChart from './RequestRateChart';
import { Card, Row } from './styles';
import TopEndpointsTable from './TopEndpointsTable';
const { TabPane } = Tabs;

const ServiceMetrics = (props: Props): JSX.Element => {
	const { servicename } = useParams<{ servicename?: string }>();
	const { updateTimeInterval } = props;
	const {
		dbOverView,
		externalService,
		externalAverageDuration,
		externalError,
		topEndPoints,
		serviceOverview,
	} = useSelector<AppState, MetricReducer>((state) => state.metrics);

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
	};

	const onErrTracePopupClick = (timestamp: number): void => {
		const currentTime = timestamp / 1000000;
		const tPlusOne = timestamp / 1000000 + 1 * 60 * 1000;

		updateTimeInterval('custom', [currentTime, tPlusOne]); // updateTimeInterval takes second range in ms -- give -5 min to selected time,

		const urlParams = new URLSearchParams();
		urlParams.set(METRICS_PAGE_QUERY_PARAM.startTime, currentTime.toString());
		urlParams.set(METRICS_PAGE_QUERY_PARAM.endTime, tPlusOne.toString());
		if (servicename) {
			urlParams.set(METRICS_PAGE_QUERY_PARAM.service, servicename);
		}
		urlParams.set(METRICS_PAGE_QUERY_PARAM.error, 'true');

		history.push(`${ROUTES.TRACES}?${urlParams.toString()}`);
	};

	return (
		<Tabs defaultActiveKey="1">
			<TabPane tab="Application Metrics" key="1">
				<Row gutter={24}>
					<Col span={12}>
						<Card>
							<LatencyLineChart
								data={serviceOverview}
								popupClickHandler={onTracePopupClick}
							/>
						</Card>
					</Col>

					<Col span={12}>
						<Card>
							<RequestRateChart data={serviceOverview} />
						</Card>
					</Col>
				</Row>

				<Row gutter={24}>
					<Col span={12}>
						<Card>
							<ErrorRateChart
								onTracePopupClick={onErrTracePopupClick}
								data={serviceOverview}
							/>
						</Card>
					</Col>

					<Col span={12}>
						<Card>
							<TopEndpointsTable data={topEndPoints} />
						</Card>
					</Col>
				</Row>
			</TabPane>

			<TabPane tab="External Calls" key="2">
				<Row gutter={24}>
					<Col span={12}>
						<Card>
							<ExternalApiGraph
								title="External Call Error Percentage (%)"
								keyIdentifier="externalHttpUrl"
								dataIdentifier="callRate"
								data={externalError.map((e) => ({
									avgDuration: e.avgDuration,
									callRate: e.errorRate,
									externalHttpUrl: e.externalHttpUrl,
									numCalls: e.numErrors,
									timestamp: e.timestamp,
								}))}
							/>
						</Card>
					</Col>

					<Col span={12}>
						<Card>
							<ExternalApiGraph
								label="Average Duration"
								title="External Call duration"
								dataIdentifier="avgDuration"
								fnDataIdentifier={(s): number => Number(s) / 1000000}
								data={externalAverageDuration.map((e) => ({
									avgDuration: e.avgDuration,
									callRate: e.errorRate,
									externalHttpUrl: '',
									numCalls: e.numErrors,
									timestamp: e.timestamp,
								}))}
							/>
						</Card>
					</Col>
				</Row>

				<Row gutter={24}>
					<Col span={12}>
						<Card>
							<ExternalApiGraph
								title="External Call RPS(by Address)"
								keyIdentifier="externalHttpUrl"
								dataIdentifier="callRate"
								data={externalService}
							/>
						</Card>
					</Col>

					<Col span={12}>
						<Card>
							<ExternalApiGraph
								title="External Call duration(by Address)"
								keyIdentifier="externalHttpUrl"
								dataIdentifier="avgDuration"
								fnDataIdentifier={(s): number => Number(s) / 1000000}
								data={externalService}
							/>
						</Card>
					</Col>
				</Row>
			</TabPane>

			<TabPane tab="Database Calls" key="3">
				<Row gutter={24}>
					<Col span={12}>
						<Card>
							<ExternalApiGraph
								title="Database Calls RPS"
								keyIdentifier="dbSystem"
								dataIdentifier="callRate"
								data={dbOverView}
							/>
						</Card>
					</Col>

					<Col span={12}>
						<Card>
							<ExternalApiGraph
								label="Average Duration"
								title="Database Calls Avg Duration (in ms)"
								dataIdentifier="avgDuration"
								fnDataIdentifier={(s): number => Number(s) / 1000000}
								data={dbOverView}
							/>
						</Card>
					</Col>
				</Row>
			</TabPane>
		</Tabs>
	);
};

interface DispatchProps {
	updateTimeInterval: (
		interval: Time,
		dateTimeRange?: [number, number],
	) => (dispatch: Dispatch<AppActions>) => void;
}

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
): DispatchProps => ({
	updateTimeInterval: bindActionCreators(UpdateTimeInterval, dispatch),
});

type Props = DispatchProps;

export default connect(null, mapDispatchToProps)(ServiceMetrics);
