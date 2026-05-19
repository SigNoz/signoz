import {
	initialQueryBuilderFormValuesMap,
	PANEL_TYPES,
} from 'constants/queryBuilder';
import { GetQueryResultsProps } from 'lib/dashboard/getQueryResults';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';
import {
	DataSource,
	LogsAggregatorOperator,
	ReduceOperators,
} from 'types/common/queryBuilder';
import APIError from 'types/api/error';
import { v4 as uuidv4 } from 'uuid';

const K8S_EVENT_KEYS = ['k8s.object.kind', 'k8s.object.name'];

export function isEventsKeyNotFoundError(error: unknown): boolean {
	if (!(error instanceof APIError)) {
		return false;
	}

	const errorDetails = error.getErrorDetails();
	if (errorDetails.error.code !== 'invalid_input') {
		return false;
	}

	const errors = errorDetails.error.errors || [];
	return errors.some((err) =>
		K8S_EVENT_KEYS.some((key) =>
			err.message?.includes(`key \`${key}\` not found`),
		),
	);
}

export interface EntityEventsQueryParams {
	start: number;
	end: number;
	expression: string;
	offset?: number;
	pageSize?: number;
}

function buildEntityEventsQueryData(
	expression: string,
	{
		offset,
		pageSize,
	}: {
		offset: number;
		pageSize: number;
	},
): IBuilderQuery {
	return {
		...initialQueryBuilderFormValuesMap.logs,
		queryName: 'A',
		dataSource: DataSource.LOGS,
		aggregateOperator: LogsAggregatorOperator.NOOP,
		aggregateAttribute: {
			id: '------false',
			dataType: DataTypes.String,
			key: '',
			type: '',
		},
		timeAggregation: 'rate',
		spaceAggregation: 'sum',
		functions: [],
		aggregations: [],
		filter: { expression },
		expression,
		having: {
			expression: '',
		},
		disabled: false,
		stepInterval: 60,
		limit: null,
		orderBy: [
			{
				columnName: 'timestamp',
				order: 'desc',
			},
			{
				columnName: 'id',
				order: 'desc',
			},
		],
		groupBy: [],
		legend: '',
		reduceTo: ReduceOperators.AVG,
		offset,
		pageSize,
	};
}

const DEFAULT_PAGE_SIZE = 10;

export function getEntityEventsQueryPayload({
	start,
	end,
	expression,
	offset = 0,
	pageSize = DEFAULT_PAGE_SIZE,
}: EntityEventsQueryParams): {
	query: GetQueryResultsProps;
	queryData: IBuilderQuery;
} {
	const queryData = buildEntityEventsQueryData(expression, { offset, pageSize });

	return {
		query: {
			graphType: PANEL_TYPES.LIST,
			selectedTime: 'GLOBAL_TIME',
			query: {
				clickhouse_sql: [],
				promql: [],
				builder: {
					queryData: [queryData],
					queryFormulas: [],
					queryTraceOperator: [],
				},
				id: uuidv4(),
				queryType: EQueryType.QUERY_BUILDER,
			},
			start,
			end,
		},
		queryData,
	};
}
