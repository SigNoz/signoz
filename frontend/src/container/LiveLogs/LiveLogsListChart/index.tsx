import { DEFAULT_ENTITY_VERSION } from 'constants/app';
import { LIVE_TAIL_GRAPH_INTERVAL } from 'constants/liveTail';
import { PANEL_TYPES } from 'constants/queryBuilder';
import LogsExplorerChart from 'container/LogsExplorerChart';
import { useGetExplorerQueryRange } from 'hooks/queryBuilder/useGetExplorerQueryRange';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useEventSource } from 'providers/EventSource';
import { useMemo } from 'react';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { QueryData } from 'types/api/widgets/getQuery';
import { DataSource, LogsAggregatorOperator } from 'types/common/queryBuilder';
import { validateQuery } from 'utils/queryValidationUtils';

import { LiveLogsListChartProps } from './types';

function LiveLogsListChart({
	className,
	initialData,
	isShowingLiveLogs = false,
}: LiveLogsListChartProps): JSX.Element {
	const { currentQuery } = useQueryBuilder();
	const { isConnectionOpen } = useEventSource();

	const listChartQuery: Query | null = useMemo(() => {
		if (!currentQuery) return null;

		const currentFilterExpression =
			currentQuery?.builder.queryData[0]?.filter?.expression?.trim() || '';

		const validationResult = validateQuery(currentFilterExpression || '');

		if (!validationResult.isValid) return null;

		return {
			...currentQuery,
			builder: {
				...currentQuery.builder,
				queryData: currentQuery.builder.queryData.map((item) => ({
					...item,
					disabled: false,
					aggregateOperator: LogsAggregatorOperator.COUNT,
					filters: {
						...item.filters,
						items:
							item.filters?.items?.filter((item) => item.key?.key !== 'id') || [],
						op: item.filters?.op || 'AND',
					},
				})),
			},
		};
	}, [currentQuery]);

	const { data, isFetching } = useGetExplorerQueryRange(
		listChartQuery,
		PANEL_TYPES.TIME_SERIES,
		DEFAULT_ENTITY_VERSION,
		{
			enabled: isConnectionOpen,
			refetchInterval: LIVE_TAIL_GRAPH_INTERVAL,
			keepPreviousData: true,
		},
		{ dataSource: DataSource.LOGS },
	);

	const chartData: QueryData[] = useMemo(() => {
		if (initialData) return initialData;

		if (!data) return [];

		return data.payload.data.result;
	}, [data, initialData]);

	return (
		<div className="live-logs-chart-container">
			<LogsExplorerChart
				isLoading={initialData ? false : isFetching}
				data={chartData}
				isLabelEnabled={false}
				className={className}
				isLogsExplorerViews={isShowingLiveLogs}
			/>
		</div>
	);
}

export default LiveLogsListChart;
