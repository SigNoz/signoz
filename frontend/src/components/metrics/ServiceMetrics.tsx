import React, { useEffect, useState } from "react";
import { Tabs, Card, Row, Col } from "antd";
import { connect } from "react-redux";
import { useParams, RouteComponentProps } from "react-router-dom";
import { withRouter } from "react-router";

import {
	getServicesMetrics,
	metricItem,
	getTopEndpoints,
	topEndpointListItem,
	GlobalTime,
	updateTimeInterval,
} from "../../actions";
import { StoreState } from "../../reducers";
import LatencyLineChart from "./LatencyLineChart";
import RequestRateChart from "./RequestRateChart";
import ErrorRateChart from "./ErrorRateChart";
import TopEndpointsTable from "./TopEndpointsTable";
import { METRICS_PAGE_QUERY_PARAM } from "Src/constants/query";

const { TabPane } = Tabs;

interface ServicesMetricsProps extends RouteComponentProps<any> {
	serviceMetrics: metricItem[];
	getServicesMetrics: Function;
	topEndpointsList: topEndpointListItem[];
	getTopEndpoints: Function;
	globalTime: GlobalTime;
	updateTimeInterval: Function;
}

const _ServiceMetrics = (props: ServicesMetricsProps) => {
	const { servicename } = useParams<{ servicename?: string }>();
	useEffect(() => {
		props.getServicesMetrics(servicename, props.globalTime);
		props.getTopEndpoints(servicename, props.globalTime);
	}, [props.globalTime, servicename]);

	const onTracePopupClick = (timestamp: number) => {
		const currentTime = timestamp / 1000000;
		const tPlusOne = timestamp / 1000000 + 1 * 60 * 1000;

		props.updateTimeInterval("custom", [currentTime, tPlusOne]); // updateTimeInterval takes second range in ms -- give -5 min to selected time,

		const urlParams = new URLSearchParams();
		urlParams.set(METRICS_PAGE_QUERY_PARAM.startTime, currentTime.toString());
		urlParams.set(METRICS_PAGE_QUERY_PARAM.endTime, tPlusOne.toString());
		if (servicename) {
			urlParams.set(METRICS_PAGE_QUERY_PARAM.service, servicename);
		}

		props.history.push(`/traces?${urlParams.toString()}`);
	};

	return (
		<Tabs defaultActiveKey="1">
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
							<ErrorRateChart data={props.serviceMetrics} />
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
				<div style={{ margin: 20 }}> Coming Soon.. </div>
				<div
					className="container"
					style={{ display: "flex", flexFlow: "column wrap" }}
				>
					<div className="row">
						<div className="col-md-6 col-sm-12 col-12">
							{/* <ChartJSLineChart data={this.state.graphData} />       */}
						</div>
						<div className="col-md-6 col-sm-12 col-12">
							{/* <ChartJSLineChart data={this.state.graphData} />        */}
						</div>
					</div>
				</div>
			</TabPane>
		</Tabs>
	);
};

const mapStateToProps = (
	state: StoreState,
): {
	serviceMetrics: metricItem[];
	topEndpointsList: topEndpointListItem[];
	globalTime: GlobalTime;
} => {
	return {
		serviceMetrics: state.serviceMetrics,
		topEndpointsList: state.topEndpointsList,
		globalTime: state.globalTime,
	};
};

export const ServiceMetrics = withRouter(
	connect(mapStateToProps, {
		getServicesMetrics: getServicesMetrics,
		getTopEndpoints: getTopEndpoints,
		updateTimeInterval: updateTimeInterval,
	})(_ServiceMetrics),
);
