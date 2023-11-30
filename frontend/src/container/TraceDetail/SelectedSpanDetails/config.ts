import { initialAutocompleteData, OPERATORS } from 'constants/queryBuilder';
import getStep from 'lib/getStep';
import {
	BaseAutocompleteData,
	DataTypes,
} from 'types/api/queryBuilder/queryAutocompleteResponse';
import { Query, TagFilter } from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';
import { DataSource, LogsAggregatorOperator } from 'types/common/queryBuilder';
import { v4 as uuid } from 'uuid';

export const getTraceToLogsQuery = (
	traceId: string,
	minTime: number,
	maxTime: number,
): Query => {
	const key: BaseAutocompleteData = {
		id: uuid(),
		dataType: DataTypes.String,
		isColumn: true,
		type: '',
		isJSON: false,
		key: 'trace_id',
	};

	const filters: TagFilter = {
		items: [
			{
				id: uuid(),
				op: OPERATORS.IN,
				value: traceId,
				key,
			},
		],
		op: 'AND',
	};

	const query: Query = {
		id: uuid(),
		queryType: EQueryType.QUERY_BUILDER,
		clickhouse_sql: [],
		promql: [],
		builder: {
			queryData: [
				{
					filters,
					dataSource: DataSource.LOGS,
					disabled: false,
					limit: null,
					aggregateAttribute: initialAutocompleteData,
					aggregateOperator: LogsAggregatorOperator.NOOP,
					expression: 'A',
					groupBy: [],
					having: [],
					legend: '',
					orderBy: [],
					queryName: 'A',
					reduceTo: 'min',
					stepInterval: getStep({
						start: minTime,
						end: maxTime,
						inputFormat: 'ns',
					}),
				},
			],
			queryFormulas: [],
		},
	};

	return query;
};
