import { PANEL_TYPES } from 'constants/queryBuilder';
import Graph from 'container/GridGraphLayout/Graph';
import { GraphTitle } from 'container/MetricsApplication/constant';
import { getWidgetQueryBuilder } from 'container/MetricsApplication/MetricsApplication.factory';
import { apDexMetricsQueryBuilderQueries } from 'container/MetricsApplication/MetricsPageQueries/OverviewQueries';
import { useParams } from 'react-router-dom';
import { TagFilterItem } from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';
import { v4 as uuid } from 'uuid';

import { ClickHandlerType } from '../../Overview';
import { IServiceName } from '../../types';

function ApDexMetrics({
	delta,
	le,
	thresholdValue,
	onDragSelect,
	tagFilterItems,
	topLevelOperationsRoute,
	handleGraphClick,
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
				delta: delta || false,
				le: le || [],
			}),
			clickhouse_sql: [],
			id: uuid(),
		},
		title: GraphTitle.APDEX,
		panelTypes: PANEL_TYPES.TIME_SERIES,
	});

	const isQueryEnabled =
		topLevelOperationsRoute.length > 0 &&
		le &&
		le?.length > 0 &&
		delta !== undefined;

	return (
		<Graph
			name="apdex"
			widget={apDexMetricsWidget}
			onDragSelect={onDragSelect}
			onClickHandler={handleGraphClick('ApDex')}
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

interface ApDexMetricsProps {
	delta?: boolean;
	le?: number[];
	thresholdValue: number;
	onDragSelect: (start: number, end: number) => void;
	handleGraphClick: (type: string) => ClickHandlerType;
	topLevelOperationsRoute: string[];
	tagFilterItems: TagFilterItem[];
}

ApDexMetrics.defaultProps = {
	delta: undefined,
	le: undefined,
};

export default ApDexMetrics;
