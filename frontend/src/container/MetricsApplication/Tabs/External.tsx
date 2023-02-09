import { Col } from 'antd';
import FullView from 'container/GridGraphLayout/Graph/FullView/index.metricsBuilder';
import {
	externalCallDuration,
	externalCallDurationByAddress,
	externalCallErrorPercent,
	externalCallRpsByAddress,
} from 'container/MetricsApplication/MetricsPageQueries/ExternalQueries';
import {
	convertRawQueriesToTraceSelectedTags,
	resourceAttributesToTagFilterItems,
} from 'lib/resourceAttributes';
import React, { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { AppState } from 'store/reducers';
import { Widgets } from 'types/api/dashboard/getAll';
import MetricReducer from 'types/reducer/metrics';

import { Card, GraphContainer, GraphTitle, Row } from '../styles';
import { Button } from './styles';
import { onGraphClickHandler, onViewTracePopupClick } from './util';

function External({ getWidgetQueryBuilder }: ExternalProps): JSX.Element {
	const { servicename } = useParams<{ servicename?: string }>();
	const { resourceAttributeQueries } = useSelector<AppState, MetricReducer>(
		(state) => state.metrics,
	);
	const [selectedTimeStamp, setSelectedTimeStamp] = useState<number>(0);

	const tagFilterItems = useMemo(
		() => resourceAttributesToTagFilterItems(resourceAttributeQueries) || [],
		[resourceAttributeQueries],
	);

	const selectedTraceTags: string = JSON.stringify(
		convertRawQueriesToTraceSelectedTags(resourceAttributeQueries) || [],
	);

	const legend = '{{address}}';

	const externalCallErrorWidget = useMemo(
		() =>
			getWidgetQueryBuilder({
				queryType: 1,
				promQL: [],
				metricsBuilder: externalCallErrorPercent({
					servicename,
					legend,
					tagFilterItems,
				}),
				clickHouse: [],
			}),
		[getWidgetQueryBuilder, servicename, tagFilterItems],
	);

	const externalCallDurationWidget = useMemo(
		() =>
			getWidgetQueryBuilder({
				queryType: 1,
				promQL: [],
				metricsBuilder: externalCallDuration({
					servicename,
					tagFilterItems,
				}),
				clickHouse: [],
			}),
		[getWidgetQueryBuilder, servicename, tagFilterItems],
	);

	const externalCallRPSWidget = useMemo(
		() =>
			getWidgetQueryBuilder({
				queryType: 1,
				promQL: [],
				metricsBuilder: externalCallRpsByAddress({
					servicename,
					legend,
					tagFilterItems,
				}),
				clickHouse: [],
			}),
		[getWidgetQueryBuilder, servicename, tagFilterItems],
	);

	const externalCallDurationAddressWidget = useMemo(
		() =>
			getWidgetQueryBuilder({
				queryType: 1,
				promQL: [],
				metricsBuilder: externalCallDurationByAddress({
					servicename,
					legend,
					tagFilterItems,
				}),
				clickHouse: [],
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
						onClick={onViewTracePopupClick(
							servicename,
							selectedTraceTags,
							selectedTimeStamp,
						)}
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
						onClick={onViewTracePopupClick(
							servicename,
							selectedTraceTags,
							selectedTimeStamp,
						)}
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
						onClick={onViewTracePopupClick(
							servicename,
							selectedTraceTags,
							selectedTimeStamp,
						)}
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
						onClick={onViewTracePopupClick(
							servicename,
							selectedTraceTags,
							selectedTimeStamp,
						)}
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
		</>
	);
}

interface ExternalProps {
	getWidgetQueryBuilder: (query: Widgets['query']) => Widgets;
}

export default External;
