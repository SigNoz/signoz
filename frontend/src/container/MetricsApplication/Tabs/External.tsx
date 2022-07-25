import { Col } from 'antd';
import FullView from 'container/GridGraphLayout/Graph/FullView/index.metricsBuilder';
import React from 'react';
import { useParams } from 'react-router-dom';
import { Widgets } from 'types/api/dashboard/getAll';

import { Card, GraphContainer, GraphTitle, Row } from '../styles';

function External({ getWidgetQueryBuilder }: ExternalProps): JSX.Element {
	const { servicename } = useParams<{ servicename?: string }>();

	// const legend = '{{http_url}}';

	// console.log(legend);

	// console.log(servicename);

	// console.log(getWidgetQueryBuilder);

	return (
		<>
			<Row gutter={24}>
				<Col span={12}>
					<Card>
						<GraphTitle>External Call Error Percentage</GraphTitle>
						<GraphContainer>
							1
							<FullView
								name="external_call_error_percentage"
								fullViewOptions={false}
								widget={getWidgetQueryBuilder({
									queryType: 1,
									promQL: [],
									metricsBuilder: {
										formulas: [
											{
												name: 'F1',
												expression: 'A*100/B',
												disabled: false,
											},
										],
										queryBuilder: [
											{
												name: 'A',
												aggregateOperator: 18,
												metricName: 'signoz_external_call_latency_count',
												tagFilters: {
													items: [
														{
															id: '',
															key: 'service_name',
															op: 'IN',
															value: [`${servicename}`],
														},
														{
															id: '',
															key: 'status_code',
															op: 'IN',
															value: ['STATUS_CODE_ERROR'],
														},
													],
													op: 'AND',
												},
												groupBy: ['http_url'],
												legend: '',
												disabled: false,
											},
											{
												name: 'B',
												aggregateOperator: 18,
												metricName: 'signoz_external_call_latency_count',
												tagFilters: {
													items: [
														{
															id: '',
															key: 'service_name',
															op: 'IN',
															value: [`${servicename}`],
														},
													],
													op: 'AND',
												},
												groupBy: ['http_url'],
												legend: '',
												disabled: false,
											},
										],
									},
									clickHouse: [],
								})}
								// yAxisUnit="%"
							/>
						</GraphContainer>
					</Card>
				</Col>

				<Col span={12}>
					<Card>
						<GraphTitle>External Call duration</GraphTitle>
						<GraphContainer>
							2
							<FullView
								name="external_call_duration"
								fullViewOptions={false}
								widget={getWidgetQueryBuilder({
									queryType: 1,
									promQL: [],
									metricsBuilder: {
										formulas: [
											{
												disabled: false,
												expression: 'A/B',
												name: 'F1',
											},
										],
										queryBuilder: [
											{
												aggregateOperator: 18,
												disabled: true,
												groupBy: [],
												legend: '',
												metricName: 'signoz_external_call_latency_sum',
												name: 'A',
												reduceTo: 1,
												tagFilters: {
													items: [
														{
															id: '',
															key: 'service_name',
															op: 'IN',
															value: [`${servicename}`],
														},
													],
													op: 'AND',
												},
											},
											{
												aggregateOperator: 18,
												disabled: true,
												groupBy: [],
												legend: '',
												metricName: 'signoz_external_call_latency_count',
												name: 'B',
												reduceTo: 1,
												tagFilters: {
													items: [
														{
															id: '',
															key: 'service_name',
															op: 'IN',
															value: [`${servicename}`],
														},
													],
													op: 'AND',
												},
											},
										],
									},
									clickHouse: [],
								})}
								yAxisUnit="ms"
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
							3
							<FullView
								name="external_call_rps_by_address"
								fullViewOptions={false}
								widget={getWidgetQueryBuilder({
									queryType: 1,
									promQL: [],
									metricsBuilder: {
										formulas: [],
										queryBuilder: [
											{
												aggregateOperator: 18,
												disabled: false,
												groupBy: ['http_url', 'service_name'],
												legend: '{{http_url}}',
												metricName: 'signoz_external_call_latency_count',
												name: 'A',
												reduceTo: 1,
												tagFilters: {
													items: [
														{
															id: '',
															key: 'service_name',
															op: 'IN',
															value: [`${servicename}`],
														},
													],
													op: 'AND',
												},
											},
										],
									},
									clickHouse: [],
								})}
								yAxisUnit="reqps"
							/>
						</GraphContainer>
					</Card>
				</Col>

				<Col span={12}>
					<Card>
						<GraphTitle>External Call duration(by Address)</GraphTitle>
						<GraphContainer>
							4
							<FullView
								name="external_call_duration_by_address"
								fullViewOptions={false}
								widget={getWidgetQueryBuilder({
									queryType: 1,
									promQL: [],
									metricsBuilder: {
										formulas: [
											{
												disabled: false,
												expression: 'A/B',
												name: 'F1',
											},
										],
										queryBuilder: [
											{
												aggregateOperator: 18,
												disabled: false,
												groupBy: ['http_url'],
												legend: '',
												metricName: 'signoz_external_call_latency_sum',
												name: 'A',
												reduceTo: 1,
												tagFilters: {
													items: [
														{
															id: '',
															key: 'service_name',
															op: 'IN',
															value: [`${servicename}`],
														},
													],
													op: 'AND',
												},
											},
											{
												aggregateOperator: 18,
												disabled: false,
												groupBy: ['http_url'],
												legend: '',
												metricName: 'signoz_external_call_latency_count',
												name: 'B',
												reduceTo: 1,
												tagFilters: {
													items: [
														{
															id: '',
															key: 'service_name',
															op: 'IN',
															value: [`${servicename}`],
														},
													],
													op: 'AND',
												},
											},
										],
									},
									clickHouse: [],
								})}
								yAxisUnit="ms"
							/>
						</GraphContainer>
					</Card>
				</Col>
			</Row>
		</>
	);
}

interface ExternalProps {
	getWidgetQueryBuilder: (query: Widgets['query']) => Widgets;
}

export default External;
