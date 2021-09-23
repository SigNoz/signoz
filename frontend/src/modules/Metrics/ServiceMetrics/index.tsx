import { Col, Tabs } from 'antd';
import Spinner from 'components/Spinner';
import { METRICS_PAGE_QUERY_PARAM } from 'constants/query';
import ROUTES from 'constants/routes';
import history from 'lib/history';
import React, { useEffect } from 'react';
import { connect } from 'react-redux';
import { useParams } from 'react-router-dom';
import { GlobalTime, updateTimeInterval } from 'store/actions';
import {
	dbOverviewMetricsItem,
	externalErrCodeMetricsItem,
	externalMetricsAvgDurationItem,
	externalMetricsItem,
	getInitialMerticDataProps,
	metricItem,
	topEndpointListItem,
} from 'store/actions/MetricsActions';
import {
	getDbOverViewMetrics,
	getExternalAvgDurationMetrics,
	getExternalErrCodeMetrics,
	getExternalMetrics,
	getInitialMerticData,
	getServicesMetrics,
	getTopEndpoints,
} from 'store/actions/MetricsActions';
import { AppState } from 'store/reducers';

import ErrorRateChart from '../ErrorRateChart';
import ExternalApiGraph from '../ExternalApi';
import LatencyLineChart from '../LatencyLineChart';
import RequestRateChart from '../RequestRateChart';
import TopEndpointsTable from '../TopEndpointsTable';
import { Card, Row } from './styles';
const { TabPane } = Tabs;

const _ServiceMetrics = (props: ServicesMetricsProps): JSX.Element => {
	const { servicename } = useParams<{ servicename?: string }>();
	const { globalTime, getInitialMerticData } = props;

	useEffect(() => {
		if (servicename !== undefined) {
			getInitialMerticData({
				globalTime: globalTime,
				serviceName: servicename,
			});
		}
	}, [getInitialMerticData, servicename, globalTime]);

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

	if (props.loading) {
		return <Spinner tip="Loading..." height="100vh" size="large" />;
	}

	return (
		<Tabs defaultActiveKey="1">
			<TabPane tab="Application Metrics" key="1">
				<Row gutter={24}>
					<Col span={12}>
						<Card>
							<LatencyLineChart
								data={props.serviceMetrics}
								popupClickHandler={onTracePopupClick}
							/>
						</Card>
					</Col>

					<Col span={12}>
						<Card>
							<RequestRateChart data={props.serviceMetrics} />
						</Card>
					</Col>
				</Row>

				<Row gutter={24}>
					<Col span={12}>
						<Card>
							<ErrorRateChart
								onTracePopupClick={onErrTracePopupClick}
								data={props.serviceMetrics}
							/>
						</Card>
					</Col>

					<Col span={12}>
						<Card>
							<TopEndpointsTable data={props.topEndpointsList} />
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
								dataIdentifier="errorRate"
								data={props.externalErrCodeMetrics}
							/>
						</Card>
					</Col>

					<Col span={12}>
						<Card>
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

				<Row gutter={24}>
					<Col span={12}>
						<Card>
							<ExternalApiGraph
								title="External Call RPS(by Address)"
								keyIdentifier="externalHttpUrl"
								dataIdentifier="callRate"
								data={props.externalMetrics}
							/>
						</Card>
					</Col>

					<Col span={12}>
						<Card>
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
				<Row gutter={24}>
					<Col span={12}>
						<Card>
							<ExternalApiGraph
								title="Database Calls RPS"
								keyIdentifier="dbSystem"
								dataIdentifier="callRate"
								data={props.dbOverviewMetrics}
							/>
						</Card>
					</Col>

					<Col span={12}>
						<Card>
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

interface ServicesMetricsProps {
	serviceMetrics: metricItem[];
	dbOverviewMetrics: dbOverviewMetricsItem[];
	getServicesMetrics: () => void;
	getExternalMetrics: () => void;
	getExternalErrCodeMetrics: () => void;
	getExternalAvgDurationMetrics: () => void;
	getDbOverViewMetrics: () => void;
	externalMetrics: externalMetricsItem[];
	topEndpointsList: topEndpointListItem[];
	externalAvgDurationMetrics: externalMetricsAvgDurationItem[];
	externalErrCodeMetrics: externalErrCodeMetricsItem[];
	getTopEndpoints: () => void;
	globalTime: GlobalTime;
	updateTimeInterval: () => void;
	getInitialMerticData: (props: getInitialMerticDataProps) => void;
	loading: boolean;
}

const mapStateToProps = (
	state: AppState,
): {
	serviceMetrics: metricItem[];
	topEndpointsList: topEndpointListItem[];
	externalAvgDurationMetrics: externalMetricsAvgDurationItem[];
	externalErrCodeMetrics: externalErrCodeMetricsItem[];
	externalMetrics: externalMetricsItem[];
	dbOverviewMetrics: dbOverviewMetricsItem[];
	globalTime: GlobalTime;
	loading: boolean;
} => {
	return {
		externalErrCodeMetrics: state.metricsData.externalErrCodeMetricsItem,
		serviceMetrics: state.metricsData.metricItems,
		topEndpointsList: state.metricsData.topEndpointListItem,
		externalMetrics: state.metricsData.externalMetricsItem,
		globalTime: state.globalTime,
		dbOverviewMetrics: state.metricsData.dbOverviewMetricsItem,
		externalAvgDurationMetrics: state.metricsData.externalMetricsAvgDurationItem,
		loading: state.metricsData.loading,
	};
};

export const ServiceMetrics = connect(mapStateToProps, {
	getServicesMetrics: getServicesMetrics,
	getExternalMetrics: getExternalMetrics,
	getExternalErrCodeMetrics: getExternalErrCodeMetrics,
	getExternalAvgDurationMetrics: getExternalAvgDurationMetrics,
	getTopEndpoints: getTopEndpoints,
	updateTimeInterval: updateTimeInterval,
	getDbOverViewMetrics: getDbOverViewMetrics,
	getInitialMerticData: getInitialMerticData,
})(_ServiceMetrics);
