import { FeatureKeys } from 'constants/features';
import { PANEL_TYPES } from 'constants/queryBuilder';
import Graph from 'container/GridGraphLayout/Graph/';
import { GraphTitle } from 'container/MetricsApplication/constant';
import { getWidgetQueryBuilder } from 'container/MetricsApplication/MetricsApplication.factory';
import { latency } from 'container/MetricsApplication/MetricsPageQueries/OverviewQueries';
import { Card, GraphContainer } from 'container/MetricsApplication/styles';
import useFeatureFlag from 'hooks/useFeatureFlag';
import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { TagFilterItem } from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';
import { v4 as uuid } from 'uuid';

import { ClickHandlerType } from '../Overview';
import { Button } from '../styles';
import { IServiceName } from '../types';
import { onViewTracePopupClick } from '../util';

function ServiceOverview({
	onDragSelect,
	handleGraphClick,
	selectedTraceTags,
	selectedTimeStamp,
	tagFilterItems,
	topLevelOperationsRoute,
}: ServiceOverviewProps): JSX.Element {
	const { servicename } = useParams<IServiceName>();

	const isSpanMetricEnable = useFeatureFlag(FeatureKeys.USE_SPAN_METRICS)
		?.active;

	const latencyWidget = useMemo(
		() =>
			getWidgetQueryBuilder({
				query: {
					queryType: EQueryType.QUERY_BUILDER,
					promql: [],
					builder: latency({
						servicename,
						tagFilterItems,
						isSpanMetricEnable,
						topLevelOperationsRoute,
					}),
					clickhouse_sql: [],
					id: uuid(),
				},
				title: GraphTitle.LATENCY,
				panelTypes: PANEL_TYPES.TIME_SERIES,
			}),
		[servicename, tagFilterItems, isSpanMetricEnable, topLevelOperationsRoute],
	);

	const isQueryEnabled = topLevelOperationsRoute.length > 0;

	return (
		<>
			<Button
				type="default"
				size="small"
				id="Service_button"
				onClick={onViewTracePopupClick({
					servicename,
					selectedTraceTags,
					timestamp: selectedTimeStamp,
				})}
			>
				View Traces
			</Button>
			<Card>
				<GraphContainer>
					<Graph
						name="service_latency"
						onDragSelect={onDragSelect}
						widget={latencyWidget}
						yAxisUnit="ns"
						onClickHandler={handleGraphClick('Service')}
						allowClone={false}
						allowDelete={false}
						allowEdit={false}
						isQueryEnabled={isQueryEnabled}
					/>
				</GraphContainer>
			</Card>
		</>
	);
}

interface ServiceOverviewProps {
	selectedTimeStamp: number;
	selectedTraceTags: string;
	onDragSelect: (start: number, end: number) => void;
	handleGraphClick: (type: string) => ClickHandlerType;
	tagFilterItems: TagFilterItem[];
	topLevelOperationsRoute: string[];
}

export default ServiceOverview;
