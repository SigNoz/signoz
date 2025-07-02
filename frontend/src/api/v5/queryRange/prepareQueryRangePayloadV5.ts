/* eslint-disable sonarjs/cognitive-complexity */
import { PANEL_TYPES } from 'constants/queryBuilder';
import { GetQueryResultsProps } from 'lib/dashboard/getQueryResults';
import getStartEndRangeTime from 'lib/getStartEndRangeTime';
import { mapQueryDataToApi } from 'lib/newQueryBuilder/queryBuilderMappers/mapQueryDataToApi';
import { isEmpty } from 'lodash-es';
import {
	IBuilderQuery,
	QueryFunctionProps,
} from 'types/api/queryBuilder/queryBuilderData';
import {
	BaseBuilderQuery,
	FieldContext,
	FieldDataType,
	FunctionName,
	GroupByKey,
	LogAggregation,
	MetricAggregation,
	OrderBy,
	QueryEnvelope,
	QueryFunction,
	QueryRangePayloadV5,
	QueryType,
	RequestType,
	TelemetryFieldKey,
	TraceAggregation,
	VariableItem,
} from 'types/api/v5/queryRange';
import { EQueryType } from 'types/common/dashboard';
import { DataSource } from 'types/common/queryBuilder';

type PrepareQueryRangePayloadV5Result = {
	queryPayload: QueryRangePayloadV5;
	legendMap: Record<string, string>;
};

/**
 * Maps panel types to V5 request types
 */
function mapPanelTypeToRequestType(panelType: PANEL_TYPES): RequestType {
	switch (panelType) {
		case PANEL_TYPES.TIME_SERIES:
		case PANEL_TYPES.BAR:
			return 'time_series';
		case PANEL_TYPES.TABLE:
		case PANEL_TYPES.PIE:
		case PANEL_TYPES.VALUE:
		case PANEL_TYPES.TRACE:
			return 'scalar';
		case PANEL_TYPES.LIST:
			return 'raw';
		case PANEL_TYPES.HISTOGRAM:
			return 'distribution';
		default:
			return '';
	}
}

/**
 * Gets signal type from data source
 */
function getSignalType(dataSource: string): 'traces' | 'logs' | 'metrics' {
	if (dataSource === 'traces') return 'traces';
	if (dataSource === 'logs') return 'logs';
	return 'metrics';
}

/**
 * Creates base spec for builder queries
 */
function createBaseSpec(
	queryData: IBuilderQuery,
	requestType: RequestType,
	panelType?: PANEL_TYPES,
): BaseBuilderQuery {
	return {
		stepInterval: queryData.stepInterval,
		disabled: queryData.disabled,
		filter: queryData?.filter?.expression ? queryData.filter : undefined,
		groupBy:
			queryData.groupBy?.length > 0
				? queryData.groupBy.map(
						(item: any): GroupByKey => ({
							name: item.key,
							fieldDataType: item?.dataType,
							fieldContext: item?.type,
							description: item?.description,
							unit: item?.unit,
							signal: item?.signal,
							materialized: item?.materialized,
						}),
				  )
				: undefined,
		limit:
			panelType === PANEL_TYPES.TABLE || panelType === PANEL_TYPES.LIST
				? queryData.limit || queryData.pageSize || undefined
				: queryData.limit || undefined,
		offset: requestType === 'raw' ? queryData.offset : undefined,
		order:
			queryData.orderBy.length > 0
				? queryData.orderBy.map(
						(order: any): OrderBy => ({
							key: {
								name: order.columnName,
							},
							direction: order.order,
						}),
				  )
				: undefined,
		// legend: isEmpty(queryData.legend) ? undefined : queryData.legend,
		having: isEmpty(queryData.havingExpression)
			? undefined
			: queryData?.havingExpression,
		functions: isEmpty(queryData.functions)
			? undefined
			: queryData.functions.map(
					(func: QueryFunctionProps): QueryFunction => ({
						name: func.name as FunctionName,
						args: func.args.map((arg) => ({
							// name: arg.name,
							value: arg,
						})),
					}),
			  ),
		selectFields: isEmpty(queryData.selectColumns)
			? undefined
			: queryData.selectColumns?.map(
					(column: any): TelemetryFieldKey => ({
						name: column.name ?? column.key,
						fieldDataType:
							column?.fieldDataType ?? (column?.dataType as FieldDataType),
						fieldContext: column?.fieldContext ?? (column?.type as FieldContext),
						signal: column?.signal ?? undefined,
					}),
			  ),
	};
}
// Utility to parse aggregation expressions with optional alias
export function parseAggregations(
	expression: string,
): { expression: string; alias?: string }[] {
	const result: { expression: string; alias?: string }[] = [];
	const regex = /([a-zA-Z0-9_]+\([^)]*\))(?:\s*as\s+([a-zA-Z0-9_]+))?/g;
	let match = regex.exec(expression);
	while (match !== null) {
		const expr = match[1];
		const alias = match[2];
		if (alias) {
			result.push({ expression: expr, alias });
		} else {
			result.push({ expression: expr });
		}
		match = regex.exec(expression);
	}
	return result;
}

export function createAggregation(
	queryData: any,
): TraceAggregation[] | LogAggregation[] | MetricAggregation[] {
	if (queryData.dataSource === DataSource.METRICS) {
		return [
			{
				metricName: queryData?.aggregateAttribute?.key,
				temporality: queryData?.aggregateAttribute?.temporality,
				timeAggregation: queryData?.timeAggregation,
				spaceAggregation: queryData?.spaceAggregation,
			},
		];
	}

	if (queryData.aggregations?.length > 0) {
		return isEmpty(parseAggregations(queryData.aggregations?.[0].expression))
			? [{ expression: 'count()' }]
			: parseAggregations(queryData.aggregations?.[0].expression);
	}

	return [{ expression: 'count()' }];
}

/**
 * Converts query builder data to V5 builder queries
 */
function convertBuilderQueriesToV5(
	builderQueries: Record<string, any>, // eslint-disable-line @typescript-eslint/no-explicit-any
	requestType: RequestType,
	panelType?: PANEL_TYPES,
): QueryEnvelope[] {
	return Object.entries(builderQueries).map(
		([queryName, queryData]): QueryEnvelope => {
			const signal = getSignalType(queryData.dataSource);
			const baseSpec = createBaseSpec(queryData, requestType, panelType);
			let spec: QueryEnvelope['spec'];

			const aggregations = createAggregation(queryData);

			switch (signal) {
				case 'traces':
					spec = {
						name: queryName,
						signal: 'traces' as const,
						...baseSpec,
						aggregations: aggregations as TraceAggregation[],
					};
					break;
				case 'logs':
					spec = {
						name: queryName,
						signal: 'logs' as const,
						...baseSpec,
						aggregations: aggregations as LogAggregation[],
					};
					break;
				case 'metrics':
				default:
					spec = {
						name: queryName,
						signal: 'metrics' as const,
						...baseSpec,
						aggregations: aggregations as MetricAggregation[],
						// reduceTo: queryData.reduceTo,
					};
					break;
			}

			return {
				type: 'builder_query' as QueryType,
				spec,
			};
		},
	);
}

/**
 * Converts PromQL queries to V5 format
 */
function convertPromQueriesToV5(
	promQueries: Record<string, any>, // eslint-disable-line @typescript-eslint/no-explicit-any
): QueryEnvelope[] {
	return Object.entries(promQueries).map(
		([queryName, queryData]): QueryEnvelope => ({
			type: 'promql' as QueryType,
			spec: {
				name: queryName,
				query: queryData.query,
				disabled: queryData.disabled || false,
				step: queryData.stepInterval,
				stats: false, // PromQL specific field
			},
		}),
	);
}

/**
 * Converts ClickHouse queries to V5 format
 */
function convertClickHouseQueriesToV5(
	chQueries: Record<string, any>, // eslint-disable-line @typescript-eslint/no-explicit-any
): QueryEnvelope[] {
	return Object.entries(chQueries).map(
		([queryName, queryData]): QueryEnvelope => ({
			type: 'clickhouse_sql' as QueryType,
			spec: {
				name: queryName,
				query: queryData.query,
				disabled: queryData.disabled || false,
				// ClickHouse doesn't have step or stats like PromQL
			},
		}),
	);
}

/**
 * Converts query formulas to V5 format
 */
function convertFormulasToV5(
	formulas: Record<string, any>, // eslint-disable-line @typescript-eslint/no-explicit-any
): QueryEnvelope[] {
	return Object.entries(formulas).map(
		([queryName, formulaData]): QueryEnvelope => ({
			type: 'builder_formula' as QueryType,
			spec: {
				name: queryName,
				expression: formulaData.expression || '',
				functions: formulaData.functions,
			},
		}),
	);
}

/**
 * Helper function to reduce query arrays to objects
 */
function reduceQueriesToObject(
	queryArray: any[], // eslint-disable-line @typescript-eslint/no-explicit-any
): { queries: Record<string, any>; legends: Record<string, string> } {
	// eslint-disable-line @typescript-eslint/no-explicit-any
	const legends: Record<string, string> = {};
	const queries = queryArray.reduce((acc, queryItem) => {
		if (!queryItem.query) return acc;
		acc[queryItem.name] = queryItem;
		legends[queryItem.name] = queryItem.legend;
		return acc;
	}, {} as Record<string, any>); // eslint-disable-line @typescript-eslint/no-explicit-any

	return { queries, legends };
}

/**
 * Prepares V5 query range payload from GetQueryResultsProps
 */
export const prepareQueryRangePayloadV5 = ({
	query,
	globalSelectedInterval,
	graphType,
	selectedTime,
	tableParams,
	variables = {},
	start: startTime,
	end: endTime,
	formatForWeb,
	originalGraphType,
}: GetQueryResultsProps): PrepareQueryRangePayloadV5Result => {
	let legendMap: Record<string, string> = {};
	const requestType = mapPanelTypeToRequestType(graphType);
	let queries: QueryEnvelope[] = [];

	switch (query.queryType) {
		case EQueryType.QUERY_BUILDER: {
			const { queryData: data, queryFormulas } = query.builder;
			const currentQueryData = mapQueryDataToApi(data, 'queryName', tableParams);
			const currentFormulas = mapQueryDataToApi(queryFormulas, 'queryName');

			// Combine legend maps
			legendMap = {
				...currentQueryData.newLegendMap,
				...currentFormulas.newLegendMap,
			};

			// Convert builder queries
			const builderQueries = convertBuilderQueriesToV5(
				currentQueryData.data,
				requestType,
				graphType,
			);

			// Convert formulas as separate query type
			const formulaQueries = convertFormulasToV5(currentFormulas.data);

			// Combine both types
			queries = [...builderQueries, ...formulaQueries];
			break;
		}
		case EQueryType.PROM: {
			const promQueries = reduceQueriesToObject(query[query.queryType]);
			queries = convertPromQueriesToV5(promQueries.queries);
			legendMap = promQueries.legends;
			break;
		}
		case EQueryType.CLICKHOUSE: {
			const chQueries = reduceQueriesToObject(query[query.queryType]);
			queries = convertClickHouseQueriesToV5(chQueries.queries);
			legendMap = chQueries.legends;
			break;
		}
		default:
			break;
	}

	// Calculate time range
	const { start, end } = getStartEndRangeTime({
		type: selectedTime,
		interval: globalSelectedInterval,
	});

	// Create V5 payload
	const queryPayload: QueryRangePayloadV5 = {
		schemaVersion: 'v1',
		start: startTime ? startTime * 1e3 : parseInt(start, 10) * 1e3,
		end: endTime ? endTime * 1e3 : parseInt(end, 10) * 1e3,
		requestType,
		compositeQuery: {
			queries,
		},
		formatOptions: {
			formatTableResultForUI:
				!!formatForWeb ||
				(originalGraphType
					? originalGraphType === PANEL_TYPES.TABLE
					: graphType === PANEL_TYPES.TABLE),
		},
		variables: Object.entries(variables).reduce((acc, [key, value]) => {
			acc[key] = { value };
			return acc;
		}, {} as Record<string, VariableItem>),
	};

	return { legendMap, queryPayload };
};
