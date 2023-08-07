import axios from 'axios';
import Spinner from 'components/Spinner';
import { FeatureKeys } from 'constants/features';
import { PANEL_TYPES } from 'constants/queryBuilder';
import Graph from 'container/GridGraphLayout/Graph';
import { GraphTitle } from 'container/MetricsApplication/constant';
import { getWidgetQueryBuilder } from 'container/MetricsApplication/MetricsApplication.factory';
import { apDexTracesQueryBuilderQueries } from 'container/MetricsApplication/MetricsPageQueries/OverviewQueries';
import { Card, GraphContainer } from 'container/MetricsApplication/styles';
import { useGetApDexSettings } from 'hooks/apDex/useGetApDexSettings';
import useFeatureFlag from 'hooks/useFeatureFlag';
import { useNotifications } from 'hooks/useNotifications';
import { useParams } from 'react-router-dom';
import { TagFilterItem } from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';
import { v4 as uuid } from 'uuid';

import { IServiceName } from '../../types';

function ApDex({
	onDragSelect,
	topLevelOperationsRoute,
	tagFilterItems,
}: ApDexProps): JSX.Element {
	const { servicename } = useParams<IServiceName>();
	const { data, isLoading, error, isRefetching } = useGetApDexSettings(
		servicename,
	);
	const { notifications } = useNotifications();

	const isSpanMetricEnable = useFeatureFlag(FeatureKeys.USE_SPAN_METRICS)
		?.active;

	const apDexWidget = getWidgetQueryBuilder({
		query: {
			queryType: EQueryType.QUERY_BUILDER,
			promql: [],
			builder: apDexTracesQueryBuilderQueries({
				servicename,
				tagFilterItems,
				isSpanMetricEnable,
				topLevelOperationsRoute,
				threashold: data?.data[0].threshold || 0,
			}),
			clickhouse_sql: [],
			id: uuid(),
		},
		title: GraphTitle.APDEX,
		panelTypes: PANEL_TYPES.TIME_SERIES,
	});

	if (error && axios.isAxiosError(error)) {
		notifications.error({
			message: error.message,
		});
		return <Card>{error.message}</Card>;
	}

	return (
		<Card>
			<GraphContainer>
				{isLoading || isRefetching ? (
					<Spinner height="10vh" />
				) : (
					<Graph
						name="apdex"
						widget={apDexWidget}
						onDragSelect={onDragSelect}
						yAxisUnit=""
						allowClone={false}
						allowDelete={false}
						allowEdit={false}
						allowThreshold
						threshold={data?.data[0].threshold}
					/>
				)}
			</GraphContainer>
		</Card>
	);
}

interface ApDexProps {
	onDragSelect: (start: number, end: number) => void;
	topLevelOperationsRoute: string[];
	tagFilterItems: TagFilterItem[];
}

export default ApDex;
