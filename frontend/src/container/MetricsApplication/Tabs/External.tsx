import { Col } from 'antd';
import { PANEL_TYPES } from 'constants/queryBuilder';
import Graph from 'container/GridCardLayout/GridCard';
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

import { GraphTitle, legend, MENU_ITEMS } from '../constant';
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
				yAxisUnit: '%',
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
				yAxisUnit: 'ms',
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
				yAxisUnit: 'reqps',
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
				yAxisUnit: 'ms',
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
					<Card data-testid="external_call_error_percentage">
						<GraphContainer>
							<Graph
								fillSpans={false}
								headerMenuList={MENU_ITEMS}
								name="external_call_error_percentage"
								widget={externalCallErrorWidget}
								onClickHandler={(xValue, yValue, mouseX, mouseY): void => {
									onGraphClickHandler(setSelectedTimeStamp)(
										xValue,
										yValue,
										mouseX,
										mouseY,
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

					<Card data-testid="external_call_duration">
						<GraphContainer>
							<Graph
								fillSpans
								name="external_call_duration"
								headerMenuList={MENU_ITEMS}
								widget={externalCallDurationWidget}
								onClickHandler={(xValue, yValue, mouseX, mouseY): void => {
									onGraphClickHandler(setSelectedTimeStamp)(
										xValue,
										yValue,
										mouseX,
										mouseY,
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
					<Card data-testid="external_call_rps_by_address">
						<GraphContainer>
							<Graph
								fillSpans
								name="external_call_rps_by_address"
								widget={externalCallRPSWidget}
								headerMenuList={MENU_ITEMS}
								onClickHandler={(xValue, yValue, mouseX, mouseY): Promise<void> =>
									onGraphClickHandler(setSelectedTimeStamp)(
										xValue,
										yValue,
										mouseX,
										mouseY,
										'external_call_rps_by_address',
									)
								}
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

					<Card data-testid="external_call_duration_by_address">
						<GraphContainer>
							<Graph
								name="external_call_duration_by_address"
								widget={externalCallDurationAddressWidget}
								headerMenuList={MENU_ITEMS}
								fillSpans
								onClickHandler={(xValue, yValue, mouseX, mouseY): void => {
									onGraphClickHandler(setSelectedTimeStamp)(
										xValue,
										yValue,
										mouseX,
										mouseY,
										'external_call_duration_by_address',
									);
								}}
							/>
						</GraphContainer>
					</Card>
				</Col>
			</Row>
		</>
	);
}

export default External;
