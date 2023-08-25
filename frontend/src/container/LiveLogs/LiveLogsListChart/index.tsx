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

import { LiveLogsListChartProps } from './types';

function LiveLogsListChart({ className }: LiveLogsListChartProps): JSX.Element {
	const { stagedQuery } = useQueryBuilder();
	const { isConnectionOpen, isConnectionLoading } = useEventSource();

	const listChartQuery: Query | null = useMemo(() => {
		if (!stagedQuery) return null;

		return {
			...stagedQuery,
			builder: {
				...stagedQuery.builder,
				queryData: stagedQuery.builder.queryData.map((item) => ({
					...item,
					disabled: false,
					aggregateOperator: LogsAggregatorOperator.COUNT,
					filters: {
						...item.filters,
						items: item.filters.items.filter((item) => item.key?.key !== 'id'),
					},
				})),
			},
		};
	}, [stagedQuery]);

	const { data, isFetching } = useGetExplorerQueryRange(
		listChartQuery,
		PANEL_TYPES.TIME_SERIES,

		{
			enabled: isConnectionOpen,
			refetchInterval: LIVE_TAIL_GRAPH_INTERVAL,
		},
		{ dataSource: DataSource.LOGS },
	);

	const chartData: QueryData[] = useMemo(() => {
		if (!data) return [];

		return data.payload.data.result;
	}, [data]);

	const isLoading = useMemo(
		() => isFetching || (isConnectionLoading && !isConnectionOpen),
		[isConnectionLoading, isConnectionOpen, isFetching],
	);

	return (
		<LogsExplorerChart
			isLoading={isLoading}
			data={chartData}
			isLabelEnabled={false}
			className={className}
		/>
	);
}

export default LiveLogsListChart;
