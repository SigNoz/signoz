import { Skeleton } from 'antd';
import { ENTITY_VERSION_V4 } from 'constants/app';
import { FeatureKeys } from 'constants/features';
import { PANEL_TYPES } from 'constants/queryBuilder';
import Graph from 'container/GridCardLayout/GridCard';
import {
	GraphTitle,
	SERVICE_CHART_ID,
} from 'container/MetricsApplication/constant';
import { getWidgetQueryBuilder } from 'container/MetricsApplication/MetricsApplication.factory';
import { latency } from 'container/MetricsApplication/MetricsPageQueries/OverviewQueries';
import { Card, GraphContainer } from 'container/MetricsApplication/styles';
import useFeatureFlag from 'hooks/useFeatureFlag';
import useResourceAttribute from 'hooks/useResourceAttribute';
import { resourceAttributesToTagFilterItems } from 'hooks/useResourceAttribute/utils';
import { OnClickPluginOpts } from 'lib/uPlotLib/plugins/onClickPlugin';
import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { EQueryType } from 'types/common/dashboard';
import { v4 as uuid } from 'uuid';

import { Button } from '../styles';
import { IServiceName } from '../types';
import {
	handleNonInQueryRange,
	onViewTracePopupClick,
	useGetAPMToTracesQueries,
} from '../util';

function ServiceOverview({
	onDragSelect,
	handleGraphClick,
	selectedTraceTags,
	selectedTimeStamp,
	topLevelOperationsRoute,
	topLevelOperationsIsLoading,
}: ServiceOverviewProps): JSX.Element {
	const { servicename: encodedServiceName } = useParams<IServiceName>();
	const servicename = decodeURIComponent(encodedServiceName);

	const isSpanMetricEnable = useFeatureFlag(FeatureKeys.USE_SPAN_METRICS)
		?.active;

	const { queries } = useResourceAttribute();

	const tagFilterItems = useMemo(
		() =>
			handleNonInQueryRange(
				resourceAttributesToTagFilterItems(queries, !isSpanMetricEnable),
			) || [],
		[isSpanMetricEnable, queries],
	);

	const latencyWidget = getWidgetQueryBuilder({
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
		yAxisUnit: 'ns',
		id: SERVICE_CHART_ID.latency,
	});

	const isQueryEnabled =
		!topLevelOperationsIsLoading && topLevelOperationsRoute.length > 0;

	const apmToTraceQuery = useGetAPMToTracesQueries({ servicename });

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
					apmToTraceQuery,
				})}
			>
				View Traces
			</Button>
			<Card data-testid="service_latency">
				<GraphContainer>
					{topLevelOperationsIsLoading && (
						<Skeleton
							style={{
								height: '100%',
								padding: '16px',
							}}
						/>
					)}
					{!topLevelOperationsIsLoading && (
						<Graph
							onDragSelect={onDragSelect}
							widget={latencyWidget}
							onClickHandler={handleGraphClick('Service')}
							isQueryEnabled={isQueryEnabled}
							version={ENTITY_VERSION_V4}
						/>
					)}
				</GraphContainer>
			</Card>
		</>
	);
}

interface ServiceOverviewProps {
	selectedTimeStamp: number;
	selectedTraceTags: string;
	onDragSelect: (start: number, end: number) => void;
	handleGraphClick: (type: string) => OnClickPluginOpts['onClick'];
	topLevelOperationsRoute: string[];
	topLevelOperationsIsLoading: boolean;
}

export default ServiceOverview;
