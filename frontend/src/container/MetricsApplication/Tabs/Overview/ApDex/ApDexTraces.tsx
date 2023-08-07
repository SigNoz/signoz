import { PANEL_TYPES } from 'constants/queryBuilder';
import Graph from 'container/GridGraphLayout/Graph';
import { GraphTitle } from 'container/MetricsApplication/constant';
import { getWidgetQueryBuilder } from 'container/MetricsApplication/MetricsApplication.factory';
import { apDexTracesQueryBuilderQueries } from 'container/MetricsApplication/MetricsPageQueries/OverviewQueries';
import { useParams } from 'react-router-dom';
import { TagFilterItem } from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';
import { v4 as uuid } from 'uuid';

import { IServiceName } from '../../types';

interface ApDexTracesProps {
	onDragSelect: (start: number, end: number) => void;
	topLevelOperationsRoute: string[];
	tagFilterItems: TagFilterItem[];
	thresholdValue: number;
}

function ApDexTraces({
	onDragSelect,
	topLevelOperationsRoute,
	tagFilterItems,
	thresholdValue,
}: ApDexTracesProps): JSX.Element {
	const { servicename } = useParams<IServiceName>();

	const apDexTracesWidget = getWidgetQueryBuilder({
		query: {
			queryType: EQueryType.QUERY_BUILDER,
			promql: [],
			builder: apDexTracesQueryBuilderQueries({
				servicename,
				tagFilterItems,
				topLevelOperationsRoute,
				threashold: thresholdValue || 0,
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
			widget={apDexTracesWidget}
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

export default ApDexTraces;
