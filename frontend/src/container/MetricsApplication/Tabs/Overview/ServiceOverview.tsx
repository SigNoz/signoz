import Graph from 'container/GridGraphLayout/Graph/';
import { GraphTitle } from 'container/MetricsApplication/constant';
import { getWidgetQueryBuilder } from 'container/MetricsApplication/MetricsApplication.factory';
import { latency } from 'container/MetricsApplication/MetricsPageQueries/OverviewQueries';
import { Card, GraphContainer } from 'container/MetricsApplication/styles';
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
}: ServiceOverviewProps): JSX.Element {
	const { servicename } = useParams<IServiceName>();

	const latencyWidget = useMemo(
		() =>
			getWidgetQueryBuilder(
				{
					queryType: EQueryType.QUERY_BUILDER,
					promql: [],
					builder: latency({
						servicename,
						tagFilterItems,
					}),
					clickhouse_sql: [],
					id: uuid(),
				},
				GraphTitle.LATENCY,
			),
		[servicename, tagFilterItems],
	);

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
}

export default ServiceOverview;
