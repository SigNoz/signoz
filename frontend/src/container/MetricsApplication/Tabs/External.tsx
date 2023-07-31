import { Col } from 'antd';
import { PANEL_TYPES } from 'constants/queryBuilder';
import Graph from 'container/GridGraphLayout/Graph/';
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
import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { EQueryType } from 'types/common/dashboard';
import { v4 as uuid } from 'uuid';

import { GraphTitle, legend } from '../constant';
import { getWidgetQueryBuilder } from '../MetricsApplication.factory';
import { Card, GraphContainer, Row } from '../styles';
import { Button } from './styles';
import { IServiceName } from './types';
import {
	handleNonInQueryRange,
	onGraphClickHandler,
	onViewTracePopupClick,
} from './util';

function External(): JSX.Element {
	const [selectedTimeStamp, setSelectedTimeStamp] = useState<number>(0);

	const { servicename } = useParams<IServiceName>();
	const { queries } = useResourceAttribute();

	const tagFilterItems = useMemo(
		() =>
			handleNonInQueryRange(resourceAttributesToTagFilterItems(queries)) || [],
		[queries],
	);

	const externalCallErrorWidget = useMemo(
		() =>
			getWidgetQueryBuilder({
				query: {
					queryType: EQueryType.QUERY_BUILDER,
					promql: [],
					builder: externalCallErrorPercent({
						servicename,
						legend: legend.address,
						tagFilterItems,
					}),
					clickhouse_sql: [],
					id: uuid(),
				},
				title: GraphTitle.EXTERNAL_CALL_ERROR_PERCENTAGE,
				panelTypes: PANEL_TYPES.TIME_SERIES,
			}),
		[servicename, tagFilterItems],
	);

	const selectedTraceTags = useMemo(
		() => JSON.stringify(convertRawQueriesToTraceSelectedTags(queries) || []),
		[queries],
	);

	const externalCallDurationWidget = useMemo(
		() =>
			getWidgetQueryBuilder({
				query: {
					queryType: EQueryType.QUERY_BUILDER,
					promql: [],
					builder: externalCallDuration({
						servicename,
						tagFilterItems,
					}),
					clickhouse_sql: [],
					id: uuid(),
				},
				title: GraphTitle.EXTERNAL_CALL_DURATION,
				panelTypes: PANEL_TYPES.TIME_SERIES,
			}),
		[servicename, tagFilterItems],
	);

	const externalCallRPSWidget = useMemo(
		() =>
			getWidgetQueryBuilder({
				query: {
					queryType: EQueryType.QUERY_BUILDER,
					promql: [],
					builder: externalCallRpsByAddress({
						servicename,
						legend: legend.address,
						tagFilterItems,
					}),
					clickhouse_sql: [],
					id: uuid(),
				},
				title: GraphTitle.EXTERNAL_CALL_RPS_BY_ADDRESS,
				panelTypes: PANEL_TYPES.TIME_SERIES,
			}),
		[servicename, tagFilterItems],
	);

	const externalCallDurationAddressWidget = useMemo(
		() =>
			getWidgetQueryBuilder({
				query: {
					queryType: EQueryType.QUERY_BUILDER,
					promql: [],
					builder: externalCallDurationByAddress({
						servicename,
						legend: legend.address,
						tagFilterItems,
					}),
					clickhouse_sql: [],
					id: uuid(),
				},
				title: GraphTitle.EXTERNAL_CALL_DURATION_BY_ADDRESS,
				panelTypes: PANEL_TYPES.TIME_SERIES,
			}),
		[servicename, tagFilterItems],
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
						<GraphContainer>
							<Graph
								name="external_call_error_percentage"
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
								allowClone={false}
								allowDelete={false}
								allowEdit={false}
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
						<GraphContainer>
							<Graph
								name="external_call_duration"
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
								allowClone={false}
								allowDelete={false}
								allowEdit={false}
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
						<GraphContainer>
							<Graph
								name="external_call_rps_by_address"
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
								allowClone={false}
								allowDelete={false}
								allowEdit={false}
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
						<GraphContainer>
							<Graph
								name="external_call_duration_by_address"
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
								allowClone={false}
								allowDelete={false}
								allowEdit={false}
							/>
						</GraphContainer>
					</Card>
				</Col>
			</Row>
		</>
	);
}

export default External;
