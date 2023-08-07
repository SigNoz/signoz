import { PANEL_TYPES } from 'constants/queryBuilder';
import Graph from 'container/GridGraphLayout/Graph';
import { GraphTitle } from 'container/MetricsApplication/constant';
import { getWidgetQueryBuilder } from 'container/MetricsApplication/MetricsApplication.factory';
import { apDexMetricsQueryBuilderQueries } from 'container/MetricsApplication/MetricsPageQueries/OverviewQueries';
import { useParams } from 'react-router-dom';
import { MetricMetaProps } from 'types/api/metrics/getApDex';
import { TagFilterItem } from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';
import { v4 as uuid } from 'uuid';

import { IServiceName } from '../../types';

function ApDexMetrics({
	delta,
	le,
	thresholdValue,
	onDragSelect,
	tagFilterItems,
	topLevelOperationsRoute,
}: ApDexMetricsProps): JSX.Element {
	const { servicename } = useParams<IServiceName>();

	const apDexMetricsWidget = getWidgetQueryBuilder({
		query: {
			queryType: EQueryType.QUERY_BUILDER,
			promql: [],
			builder: apDexMetricsQueryBuilderQueries({
				servicename,
				tagFilterItems,
				topLevelOperationsRoute,
				threashold: thresholdValue || 0,
				delta,
				le,
			}),
			clickhouse_sql: [],
			id: uuid(),
		},
		title: GraphTitle.APDEX,
		panelTypes: PANEL_TYPES.TIME_SERIES,
	});

	const isQueryEnabled = topLevelOperationsRoute.length > 0;

	return (
		<Graph
			name="apdex"
			widget={apDexMetricsWidget}
			onDragSelect={onDragSelect}
			yAxisUnit=""
			allowClone={false}
			allowDelete={false}
			allowEdit={false}
			allowThreshold
			threshold={thresholdValue}
			isQueryEnabled={isQueryEnabled}
		/>
	);
}

interface ApDexMetricsProps extends MetricMetaProps {
	thresholdValue: number;
	onDragSelect: (start: number, end: number) => void;
	topLevelOperationsRoute: string[];
	tagFilterItems: TagFilterItem[];
}

export default ApDexMetrics;
