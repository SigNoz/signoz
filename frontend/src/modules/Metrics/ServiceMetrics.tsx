import React, { useEffect, useState } from 'react';
import { Tabs, Card, Row, Col } from 'antd';
import { connect } from 'react-redux';
import { useParams, RouteComponentProps } from 'react-router-dom';
import { withRouter } from 'react-router';
import ROUTES from 'Src/constants/routes';
import { GlobalTime, updateTimeInterval } from 'Src/store/actions';
import {
	metricItem,
	externalMetricsAvgDurationItem,
	externalErrCodeMetricsItem,
	externalMetricsItem,
	dbOverviewMetricsItem,
	topEndpointListItem,
} from '../../store/actions/MetricsActions';
import {
	getServicesMetrics,
	getTopEndpoints,
	getDbOverViewMetrics,
	getExternalMetrics,
	getExternalAvgDurationMetrics,
	getExternalErrCodeMetrics,
} from '../../store/actions/MetricsActions';

import { StoreState } from '../../store/reducers';
import LatencyLineChart from './LatencyLineChart';
import RequestRateChart from './RequestRateChart';
import ErrorRateChart from './ErrorRateChart';
import TopEndpointsTable from './TopEndpointsTable';
import { METRICS_PAGE_QUERY_PARAM } from 'Src/constants/query';
import ExternalApiGraph from './ExternalApi';
const { TabPane } = Tabs;

interface ServicesMetricsProps extends RouteComponentProps<any> {
	serviceMetrics: metricItem[];
	dbOverviewMetrics: dbOverviewMetricsItem[];
	getServicesMetrics: Function;
	getExternalMetrics: Function;
	getExternalErrCodeMetrics: Function;
	getExternalAvgDurationMetrics: Function;
	getDbOverViewMetrics: Function;
	externalMetrics: externalMetricsItem[];
	topEndpointsList: topEndpointListItem[];
	externalAvgDurationMetrics: externalMetricsAvgDurationItem[];
	externalErrCodeMetrics: externalErrCodeMetricsItem[];
	getTopEndpoints: Function;
	globalTime: GlobalTime;
	updateTimeInterval: Function;
}

const _ServiceMetrics = (props: ServicesMetricsProps) => {
	const { servicename } = useParams<{ servicename?: string }>();
	useEffect(() => {
		props.getServicesMetrics(servicename, props.globalTime);
		props.getTopEndpoints(servicename, props.globalTime);
		props.getExternalMetrics(servicename, props.globalTime);
		props.getExternalErrCodeMetrics(servicename, props.globalTime);
		props.getExternalAvgDurationMetrics(servicename, props.globalTime);
		props.getDbOverViewMetrics(servicename, props.globalTime);
	}, [props.globalTime, servicename]);

	const onTracePopupClick = (timestamp: number) => {
		const currentTime = timestamp / 1000000;
		const tPlusOne = timestamp / 1000000 + 1 * 60 * 1000;

		props.updateTimeInterval('custom', [currentTime, tPlusOne]); // updateTimeInterval takes second range in ms -- give -5 min to selected time,

		const urlParams = new URLSearchParams();
		urlParams.set(METRICS_PAGE_QUERY_PARAM.startTime, currentTime.toString());
		urlParams.set(METRICS_PAGE_QUERY_PARAM.endTime, tPlusOne.toString());
		if (servicename) {
			urlParams.set(METRICS_PAGE_QUERY_PARAM.service, servicename);
		}

		props.history.push(`${ROUTES.TRACES}?${urlParams.toString()}`);
	};

	const onErrTracePopupClick = (timestamp: number) => {
		const currentTime = timestamp / 1000000;
		const tPlusOne = timestamp / 1000000 + 1 * 60 * 1000;

		props.updateTimeInterval('custom', [currentTime, tPlusOne]); // updateTimeInterval takes second range in ms -- give -5 min to selected time,

		const urlParams = new URLSearchParams();
		urlParams.set(METRICS_PAGE_QUERY_PARAM.startTime, currentTime.toString());
		urlParams.set(METRICS_PAGE_QUERY_PARAM.endTime, tPlusOne.toString());
		if (servicename) {
			urlParams.set(METRICS_PAGE_QUERY_PARAM.service, servicename);
		}
		urlParams.set(METRICS_PAGE_QUERY_PARAM.error, 'true');

		props.history.push(`${ROUTES.TRACES}?${urlParams.toString()}`);
	};

	return (
		<Tabs defaultActiveKey="1" tabBarGutter={48}>
			<TabPane tab="Application Metrics" key="1">
				<Row gutter={32} style={{ margin: 20 }}>
					<Col span={12}>
						<Card bodyStyle={{ padding: 10 }}>
							<LatencyLineChart
								data={props.serviceMetrics}
								popupClickHandler={onTracePopupClick}
							/>
						</Card>
					</Col>

					<Col span={12}>
						<Card bodyStyle={{ padding: 10 }}>
							<RequestRateChart data={props.serviceMetrics} />
						</Card>
					</Col>
				</Row>

				<Row gutter={32} style={{ margin: 20 }}>
					<Col span={12}>
						<Card bodyStyle={{ padding: 10 }}>
							<ErrorRateChart
								onTracePopupClick={onErrTracePopupClick}
								data={props.serviceMetrics}
							/>
						</Card>
					</Col>

					<Col span={12}>
						<Card bodyStyle={{ padding: 10 }}>
							<TopEndpointsTable data={props.topEndpointsList} />
						</Card>
					</Col>
				</Row>
			</TabPane>

			<TabPane tab="External Calls" key="2">
				<Row gutter={32} style={{ margin: 20 }}>
					<Col span={12}>
						<Card bodyStyle={{ padding: 10 }}>
							<ExternalApiGraph
								title="External Call Error Percentage (%)"
								keyIdentifier="externalHttpUrl"
								dataIdentifier="errorRate"
								data={props.externalErrCodeMetrics}
							/>
						</Card>
					</Col>

					<Col span={12}>
						<Card bodyStyle={{ padding: 10 }}>
							<ExternalApiGraph
								label="Average Duration"
								title="External Call duration"
								dataIdentifier="avgDuration"
								fnDataIdentifier={(s) => Number(s) / 1000000}
								data={props.externalAvgDurationMetrics}
							/>
						</Card>
					</Col>
				</Row>

				<Row gutter={32} style={{ margin: 20 }}>
					<Col span={12}>
						<Card bodyStyle={{ padding: 10 }}>
							<ExternalApiGraph
								title="External Call RPS(by Address)"
								keyIdentifier="externalHttpUrl"
								dataIdentifier="callRate"
								data={props.externalMetrics}
							/>
						</Card>
					</Col>

					<Col span={12}>
						<Card bodyStyle={{ padding: 10 }}>
							<ExternalApiGraph
								title="External Call duration(by Address)"
								keyIdentifier="externalHttpUrl"
								dataIdentifier="avgDuration"
								fnDataIdentifier={(s) => Number(s) / 1000000}
								data={props.externalMetrics}
							/>
						</Card>
					</Col>
				</Row>
			</TabPane>

			<TabPane tab="Database Calls" key="3">
				<Row gutter={32} style={{ margin: 20 }}>
					<Col span={12}>
						<Card bodyStyle={{ padding: 10 }}>
							<ExternalApiGraph
								title="Database Calls RPS"
								keyIdentifier="dbSystem"
								dataIdentifier="callRate"
								data={props.dbOverviewMetrics}
							/>
						</Card>
					</Col>

					<Col span={12}>
						<Card bodyStyle={{ padding: 10 }}>
							<ExternalApiGraph
								label="Average Duration"
								title="Database Calls Avg Duration (in ms)"
								dataIdentifier="avgDuration"
								fnDataIdentifier={(s) => Number(s) / 1000000}
								data={props.dbOverviewMetrics}
							/>
						</Card>
					</Col>
				</Row>
			</TabPane>
		</Tabs>
	);
};

const mapStateToProps = (
	state: StoreState,
): {
	serviceMetrics: metricItem[];
	topEndpointsList: topEndpointListItem[];
	externalAvgDurationMetrics: externalMetricsAvgDurationItem[];
	externalErrCodeMetrics: externalErrCodeMetricsItem[];
	externalMetrics: externalMetricsItem[];
	dbOverviewMetrics: dbOverviewMetricsItem[];
	globalTime: GlobalTime;
} => {
	return {
		externalErrCodeMetrics: state.metricsData.externalErrCodeMetricsItem,
		serviceMetrics: state.metricsData.metricItems,
		topEndpointsList: state.metricsData.topEndpointListItem,
		externalMetrics: state.metricsData.externalMetricsItem,
		globalTime: state.globalTime,
		dbOverviewMetrics: state.metricsData.dbOverviewMetricsItem,
		externalAvgDurationMetrics: state.metricsData.externalMetricsAvgDurationItem,
	};
};

export const ServiceMetrics = withRouter(
	connect(mapStateToProps, {
		getServicesMetrics: getServicesMetrics,
		getExternalMetrics: getExternalMetrics,
		getExternalErrCodeMetrics: getExternalErrCodeMetrics,
		getExternalAvgDurationMetrics: getExternalAvgDurationMetrics,
		getTopEndpoints: getTopEndpoints,
		updateTimeInterval: updateTimeInterval,
		getDbOverViewMetrics: getDbOverViewMetrics,
	})(_ServiceMetrics),
);
