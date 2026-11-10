import { listViewInitialTraceQuery } from 'constants/queryBuilder';
import { LogsAggregatorOperator } from 'types/common/queryBuilder';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

export function getTraceExportQuery(traceId: string): Query {
	const [baseQueryData] = listViewInitialTraceQuery.builder.queryData;

	return {
		...listViewInitialTraceQuery,
		builder: {
			...listViewInitialTraceQuery.builder,
			queryData: [
				{
					...baseQueryData,
					aggregateOperator: LogsAggregatorOperator.NOOP,
					filter: { expression: `trace_id = '${traceId}'` },
					orderBy: [{ columnName: 'timestamp', order: 'asc' }],
					selectColumns: [],
				},
			],
		},
	};
}
