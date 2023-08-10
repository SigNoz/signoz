import { PANEL_TYPES } from 'constants/queryBuilder';
import Graph from 'container/GridGraphLayout/Graph';
import { GraphTitle } from 'container/MetricsApplication/constant';
import { getWidgetQueryBuilder } from 'container/MetricsApplication/MetricsApplication.factory';
import { apDexTracesQueryBuilderQueries } from 'container/MetricsApplication/MetricsPageQueries/OverviewQueries';
import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { EQueryType } from 'types/common/dashboard';
import { v4 as uuid } from 'uuid';

import { IServiceName } from '../../types';
import { ApDexDataSwitcherProps } from './types';

function ApDexTraces({
	handleGraphClick,
	onDragSelect,
	topLevelOperationsRoute,
	tagFilterItems,
	thresholdValue,
}: ApDexDataSwitcherProps): JSX.Element {
	const { servicename } = useParams<IServiceName>();

	const apDexTracesWidget = useMemo(
		() =>
			getWidgetQueryBuilder({
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
			}),
		[servicename, tagFilterItems, thresholdValue, topLevelOperationsRoute],
	);

	const isQueryEnabled =
		topLevelOperationsRoute.length > 0 && thresholdValue !== undefined;

	return (
		<Graph
			name="apdex"
			widget={apDexTracesWidget}
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

export default ApDexTraces;
