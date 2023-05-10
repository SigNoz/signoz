import { Col } from 'antd';
import FullView from 'container/GridGraphLayout/Graph/FullView/index.metricsBuilder';
import {
	externalCallDuration,
	externalCallDurationByAddress,
	externalCallErrorPercent,
	externalCallRpsByAddress,
} from 'container/MetricsApplication/MetricsPageQueries/ExternalQueries';
import useResourceAttribute from 'hooks/useResourceAttribute';
import {
	convertRawQueriesToTraceSelectedTags,
	resourceAttributesToTagFilterItems,
} from 'hooks/useResourceAttribute/utils';
import React, { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Widgets } from 'types/api/dashboard/getAll';
import { EQueryType } from 'types/common/dashboard';

import { Card, GraphContainer, GraphTitle, Row } from '../../styles';
import { legend } from '../constant';
import { Button } from '../styles';
import {
	handleNonInQueryRange,
	onGraphClickHandler,
	onViewTracePopupClick,
} from '../util';
import Table from './Table';

function External({ getWidgetQueryBuilder }: ExternalProps): JSX.Element {
	const [selectedTimeStamp, setSelectedTimeStamp] = useState<number>(0);

	const { servicename } = useParams<{ servicename?: string }>();
	const { queries } = useResourceAttribute();

	const tagFilterItems = useMemo(
		() =>
			handleNonInQueryRange(resourceAttributesToTagFilterItems(queries)) || [],
		[queries],
	);

	const externalCallErrorWidget = useMemo(
		() =>
			getWidgetQueryBuilder({
				queryType: EQueryType.QUERY_BUILDER,
				promql: [],
				builder: externalCallErrorPercent({
					servicename,
					legend: legend.address,
					tagFilterItems,
				}),
				clickhouse_sql: [],
			}),
		[getWidgetQueryBuilder, servicename, tagFilterItems],
	);

	const selectedTraceTags = useMemo(
		() => JSON.stringify(convertRawQueriesToTraceSelectedTags(queries) || []),
		[queries],
	);

	const externalCallDurationWidget = useMemo(
		() =>
			getWidgetQueryBuilder({
				queryType: EQueryType.QUERY_BUILDER,
				promql: [],
				builder: externalCallDuration({
					servicename,
					tagFilterItems,
				}),
				clickhouse_sql: [],
			}),
		[getWidgetQueryBuilder, servicename, tagFilterItems],
	);

	const externalCallRPSWidget = useMemo(
		() =>
			getWidgetQueryBuilder({
				queryType: EQueryType.QUERY_BUILDER,
				promql: [],
				builder: externalCallRpsByAddress({
					servicename,
					legend: legend.address,
					tagFilterItems,
				}),
				clickhouse_sql: [],
			}),
		[getWidgetQueryBuilder, servicename, tagFilterItems],
	);

	const externalCallDurationAddressWidget = useMemo(
		() =>
			getWidgetQueryBuilder({
				queryType: EQueryType.QUERY_BUILDER,
				promql: [],
				builder: externalCallDurationByAddress({
					servicename,
					legend: legend.address,
					tagFilterItems,
				}),
				clickhouse_sql: [],
			}),
		[getWidgetQueryBuilder, servicename, tagFilterItems],
	);

	return (
		<>
			<Row gutter={24}>
				<Col span={12}>
					<Button
						type="default"
						size="small"
						id="external_call_error_percentage_button"
						onClick={onViewTracePopupClick({
							servicename,
							selectedTraceTags,
							timestamp: selectedTimeStamp,
							isExternalCall: true,
						})}
					>
						View Traces
					</Button>
					<Card>
						<GraphTitle>External Call Error Percentage</GraphTitle>
						<GraphContainer>
							<FullView
								name="external_call_error_percentage"
								fullViewOptions={false}
								widget={externalCallErrorWidget}
								yAxisUnit="%"
								onClickHandler={(ChartEvent, activeElements, chart, data): void => {
									onGraphClickHandler(setSelectedTimeStamp)(
										ChartEvent,
										activeElements,
										chart,
										data,
										'external_call_error_percentage',
									);
								}}
							/>
						</GraphContainer>
					</Card>
				</Col>

				<Col span={12}>
					<Button
						type="default"
						size="small"
						id="external_call_duration_button"
						onClick={onViewTracePopupClick({
							servicename,
							selectedTraceTags,
							timestamp: selectedTimeStamp,
							isExternalCall: true,
						})}
					>
						View Traces
					</Button>

					<Card>
						<GraphTitle>External Call duration</GraphTitle>
						<GraphContainer>
							<FullView
								name="external_call_duration"
								fullViewOptions={false}
								widget={externalCallDurationWidget}
								yAxisUnit="ms"
								onClickHandler={(ChartEvent, activeElements, chart, data): void => {
									onGraphClickHandler(setSelectedTimeStamp)(
										ChartEvent,
										activeElements,
										chart,
										data,
										'external_call_duration',
									);
								}}
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
						id="external_call_rps_by_address_button"
						onClick={onViewTracePopupClick({
							servicename,
							selectedTraceTags,
							timestamp: selectedTimeStamp,
							isExternalCall: true,
						})}
					>
						View Traces
					</Button>
					<Card>
						<GraphTitle>External Call RPS(by Address)</GraphTitle>
						<GraphContainer>
							<FullView
								name="external_call_rps_by_address"
								fullViewOptions={false}
								widget={externalCallRPSWidget}
								yAxisUnit="reqps"
								onClickHandler={(ChartEvent, activeElements, chart, data): void => {
									onGraphClickHandler(setSelectedTimeStamp)(
										ChartEvent,
										activeElements,
										chart,
										data,
										'external_call_rps_by_address',
									);
								}}
							/>
						</GraphContainer>
					</Card>
				</Col>

				<Col span={12}>
					<Button
						type="default"
						size="small"
						id="external_call_duration_by_address_button"
						onClick={onViewTracePopupClick({
							servicename,
							selectedTraceTags,
							timestamp: selectedTimeStamp,
							isExternalCall: true,
						})}
					>
						View Traces
					</Button>

					<Card>
						<GraphTitle>External Call duration(by Address)</GraphTitle>
						<GraphContainer>
							<FullView
								name="external_call_duration_by_address"
								fullViewOptions={false}
								widget={externalCallDurationAddressWidget}
								yAxisUnit="ms"
								onClickHandler={(ChartEvent, activeElements, chart, data): void => {
									onGraphClickHandler(setSelectedTimeStamp)(
										ChartEvent,
										activeElements,
										chart,
										data,
										'external_call_duration_by_address',
									);
								}}
							/>
						</GraphContainer>
					</Card>
				</Col>
			</Row>
			{servicename && (
				<Row>
					<Col span={24}>
						<Table widgetId="external-calls-table" serviceName={servicename} />
					</Col>
				</Row>
			)}
		</>
	);
}

interface ExternalProps {
	getWidgetQueryBuilder: (query: Widgets['query']) => Widgets;
}

export default External;
