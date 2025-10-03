/* eslint-disable sonarjs/cognitive-complexity */
/* eslint-disable sonarjs/no-identical-functions */
import { convertFiltersToExpression } from 'components/QueryBuilderV2/utils';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { GetQueryResultsProps } from 'lib/dashboard/getQueryResults';
import getStartEndRangeTime from 'lib/getStartEndRangeTime';
import { mapQueryDataToApi } from 'lib/newQueryBuilder/queryBuilderMappers/mapQueryDataToApi';
import { isEmpty } from 'lodash-es';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import {
	IBuilderQuery,
	IBuilderTraceOperator,
} from 'types/api/queryBuilder/queryBuilderData';
import {
	BaseBuilderQuery,
	FieldContext,
	FieldDataType,
	Filter,
	FunctionName,
	GroupByKey,
	Having,
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
	VariableType,
} from 'types/api/v5/queryRange';
import { EQueryType } from 'types/common/dashboard';
import { DataSource } from 'types/common/queryBuilder';
import { normalizeFunctionName } from 'utils/functionNameNormalizer';

type PrepareQueryRangePayloadV5Result = {
	queryPayload: QueryRangePayloadV5;
	legendMap: Record<string, string>;
};

/**
 * Maps panel types to V5 request types
 */
export function mapPanelTypeToRequestType(panelType: PANEL_TYPES): RequestType {
	switch (panelType) {
		case PANEL_TYPES.TIME_SERIES:
		case PANEL_TYPES.BAR:
			return 'time_series';
		case PANEL_TYPES.TABLE:
		case PANEL_TYPES.PIE:
		case PANEL_TYPES.VALUE:
			return 'scalar';
		case PANEL_TYPES.TRACE:
			return 'trace';
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

function isDeprecatedField(fieldName: string): boolean {
	const deprecatedIntrinsicFields = [
		'traceID',
		'spanID',
		'parentSpanID',
		'spanKind',
		'durationNano',
		'statusCode',
		'statusMessage',
		'statusCodeString',
	];

	const deprecatedCalculatedFields = [
		'responseStatusCode',
		'externalHttpUrl',
		'httpUrl',
		'externalHttpMethod',
		'httpMethod',
		'httpHost',
		'dbName',
		'dbOperation',
		'hasError',
		'isRemote',
		'serviceName',
		'httpRoute',
		'msgSystem',
		'msgOperation',
		'dbSystem',
		'rpcSystem',
		'rpcService',
		'rpcMethod',
		'peerService',
	];

	return (
		deprecatedIntrinsicFields.includes(fieldName) ||
		deprecatedCalculatedFields.includes(fieldName)
	);
}

function getFilter(queryData: IBuilderQuery): Filter {
	const { filter } = queryData;
	if (filter?.expression) {
		return {
			expression: filter.expression,
		};
	}

	if (queryData.filters && queryData.filters?.items?.length > 0) {
		return convertFiltersToExpression(queryData.filters);
	}

	return {
		expression: '',
	};
}

function createBaseSpec(
	queryData: IBuilderQuery,
	requestType: RequestType,
	panelType?: PANEL_TYPES,
): BaseBuilderQuery {
	const nonEmptySelectColumns = (queryData.selectColumns as (
		| BaseAutocompleteData
		| TelemetryFieldKey
	)[])?.filter((c) => ('key' in c ? c?.key : c?.name));

	return {
		stepInterval: queryData?.stepInterval || null,
		disabled: queryData.disabled,
		filter: getFilter(queryData),
		groupBy:
			queryData.groupBy?.length > 0
				? queryData.groupBy.map(
						(item: any): GroupByKey => ({
							name: item.key,
							fieldDataType: item?.dataType || '',
							fieldContext: item?.type || '',
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
		offset:
			requestType === 'raw' || requestType === 'trace'
				? queryData.offset
				: undefined,
		order:
			queryData.orderBy?.length > 0
				? queryData.orderBy.map(
						(order: any): OrderBy => ({
							key: {
								name: order.columnName,
							},
							direction: order.order,
						}),
				  )
				: undefined,
		legend: isEmpty(queryData.legend) ? undefined : queryData.legend,
		having: isEmpty(queryData.having) ? undefined : (queryData?.having as Having),
		functions: isEmpty(queryData.functions)
			? undefined
			: queryData.functions.map(
					(func: QueryFunction): QueryFunction => {
						// Normalize function name to handle case sensitivity
						const normalizedName = normalizeFunctionName(func?.name);
						return {
							name: normalizedName as FunctionName,
							args: isEmpty(func.namedArgs)
								? func.args?.map((arg) => ({
										value: arg?.value,
								  }))
								: Object.entries(func?.namedArgs || {}).map(([name, value]) => ({
										name,
										value,
								  })),
						};
					},
			  ),
		selectFields: isEmpty(nonEmptySelectColumns)
			? undefined
			: nonEmptySelectColumns?.map(
					(column: any): TelemetryFieldKey => {
						const fieldName = column.name ?? column.key;
						const isDeprecated = isDeprecatedField(fieldName);

						const fieldObj: TelemetryFieldKey = {
							name: fieldName,
							fieldDataType:
								column?.fieldDataType ?? (column?.dataType as FieldDataType),
							signal: column?.signal ?? undefined,
						};

						// Only add fieldContext if the field is NOT deprecated
						if (!isDeprecated && fieldName !== 'name') {
							fieldObj.fieldContext =
								column?.fieldContext ?? (column?.type as FieldContext);
						}

						return fieldObj;
					},
			  ),
	};
}

// Utility to parse aggregation expressions with optional alias
export function parseAggregations(
	expression: string,
	availableAlias?: string,
): { expression: string; alias?: string }[] {
	const result: { expression: string; alias?: string }[] = [];
	// Matches function calls like "count()" or "sum(field)" with optional alias like "as 'alias'"
	// Handles quoted ('alias'), dash-separated (field-name), and unquoted values after "as" keyword
	const regex = /([a-zA-Z0-9_]+\([^)]*\))(?:\s*as\s+((?:'[^']*'|"[^"]*"|[a-zA-Z0-9_-]+)))?/g;
	let match = regex.exec(expression);
	while (match !== null) {
		const expr = match[1];
		let alias = match[2] || availableAlias; // Use provided alias or availableAlias if not matched
		if (alias) {
			// Remove quotes if present
			alias = alias.replace(/^['"]|['"]$/g, '');
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
	panelType?: PANEL_TYPES,
): TraceAggregation[] | LogAggregation[] | MetricAggregation[] {
	if (!queryData) {
		return [];
	}

	const haveReduceTo =
		queryData.dataSource === DataSource.METRICS &&
		panelType &&
		(panelType === PANEL_TYPES.TABLE ||
			panelType === PANEL_TYPES.PIE ||
			panelType === PANEL_TYPES.VALUE);

	if (queryData.dataSource === DataSource.METRICS) {
		return [
			{
				metricName:
					queryData?.aggregations?.[0]?.metricName ||
					queryData?.aggregateAttribute?.key,
				temporality:
					queryData?.aggregations?.[0]?.temporality ||
					queryData?.aggregateAttribute?.temporality,
				timeAggregation:
					queryData?.aggregations?.[0]?.timeAggregation ||
					queryData?.timeAggregation,
				spaceAggregation:
					queryData?.aggregations?.[0]?.spaceAggregation ||
					queryData?.spaceAggregation,
				reduceTo: haveReduceTo
					? queryData?.aggregations?.[0]?.reduceTo || queryData?.reduceTo
					: undefined,
			},
		];
	}

	if (queryData.aggregations?.length > 0) {
		return queryData.aggregations.flatMap(
			(agg: { expression: string; alias?: string }) => {
				const parsedAggregations = parseAggregations(agg.expression, agg?.alias);
				return isEmpty(parsedAggregations)
					? [{ expression: 'count()' }]
					: parsedAggregations;
			},
		);
	}

	return [{ expression: 'count()' }];
}

/**
 * Converts query builder data to V5 builder queries
 */
export function convertBuilderQueriesToV5(
	builderQueries: Record<string, any>, // eslint-disable-line @typescript-eslint/no-explicit-any
	requestType: RequestType,
	panelType?: PANEL_TYPES,
): QueryEnvelope[] {
	return Object.entries(builderQueries).map(
		([queryName, queryData]): QueryEnvelope => {
			const signal = getSignalType(queryData.dataSource);
			const baseSpec = createBaseSpec(queryData, requestType, panelType);
			let spec: QueryEnvelope['spec'];

			// Skip aggregation for raw request type
			const aggregations =
				requestType === 'raw' ? undefined : createAggregation(queryData, panelType);

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
						source: queryData.source || '',
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

function createTraceOperatorBaseSpec(
	queryData: IBuilderTraceOperator,
	requestType: RequestType,
	panelType?: PANEL_TYPES,
): BaseBuilderQuery {
	const nonEmptySelectColumns = (queryData.selectColumns as (
		| BaseAutocompleteData
		| TelemetryFieldKey
	)[])?.filter((c) => ('key' in c ? c?.key : c?.name));

	const {
		stepInterval,
		groupBy,
		limit,
		offset,
		legend,
		having,
		orderBy,
		pageSize,
	} = queryData;

	return {
		stepInterval: stepInterval || undefined,
		groupBy:
			groupBy?.length > 0
				? groupBy.map(
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
				? limit || pageSize || undefined
				: limit || undefined,
		offset: requestType === 'raw' || requestType === 'trace' ? offset : undefined,
		order:
			orderBy?.length > 0
				? orderBy.map(
						(order: any): OrderBy => ({
							key: {
								name: order.columnName,
							},
							direction: order.order,
						}),
				  )
				: undefined,
		legend: isEmpty(legend) ? undefined : legend,
		having: isEmpty(having) ? undefined : (having as Having),
		selectFields: isEmpty(nonEmptySelectColumns)
			? undefined
			: nonEmptySelectColumns?.map(
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

export function convertTraceOperatorToV5(
	traceOperator: Record<string, IBuilderTraceOperator>,
	requestType: RequestType,
	panelType?: PANEL_TYPES,
): QueryEnvelope[] {
	return Object.entries(traceOperator).map(
		([queryName, traceOperatorData]): QueryEnvelope => {
			const baseSpec = createTraceOperatorBaseSpec(
				traceOperatorData,
				requestType,
				panelType,
			);

			// Skip aggregation for raw request type
			const aggregations =
				requestType === 'raw'
					? undefined
					: createAggregation(traceOperatorData, panelType);

			const spec: QueryEnvelope['spec'] = {
				name: queryName,
				...baseSpec,
				expression: traceOperatorData.expression || '',
				aggregations: aggregations as TraceAggregation[],
			};

			return {
				type: 'builder_trace_operator' as QueryType,
				spec,
			};
		},
	);
}

/**
 * Converts PromQL queries to V5 format
 */
export function convertPromQueriesToV5(
	promQueries: Record<string, any>, // eslint-disable-line @typescript-eslint/no-explicit-any
): QueryEnvelope[] {
	return Object.entries(promQueries).map(
		([queryName, queryData]): QueryEnvelope => ({
			type: 'promql' as QueryType,
			spec: {
				name: queryName,
				query: queryData.query,
				disabled: queryData.disabled || false,
				step: queryData?.stepInterval,
				legend: isEmpty(queryData.legend) ? undefined : queryData.legend,
				stats: false, // PromQL specific field
			},
		}),
	);
}

/**
 * Converts ClickHouse queries to V5 format
 */
export function convertClickHouseQueriesToV5(
	chQueries: Record<string, any>, // eslint-disable-line @typescript-eslint/no-explicit-any
): QueryEnvelope[] {
	return Object.entries(chQueries).map(
		([queryName, queryData]): QueryEnvelope => ({
			type: 'clickhouse_sql' as QueryType,
			spec: {
				name: queryName,
				query: queryData.query,
				disabled: queryData.disabled || false,
				legend: isEmpty(queryData.legend) ? undefined : queryData.legend,
				// ClickHouse doesn't have step or stats like PromQL
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
	fillGaps,
	dynamicVariables,
}: GetQueryResultsProps): PrepareQueryRangePayloadV5Result => {
	let legendMap: Record<string, string> = {};
	const requestType = mapPanelTypeToRequestType(graphType);
	let queries: QueryEnvelope[] = [];

	switch (query.queryType) {
		case EQueryType.QUERY_BUILDER: {
			const { queryData: data, queryFormulas, queryTraceOperator } = query.builder;
			const currentQueryData = mapQueryDataToApi(data, 'queryName', tableParams);
			const currentFormulas = mapQueryDataToApi(queryFormulas, 'queryName');

			const filteredTraceOperator =
				queryTraceOperator && queryTraceOperator.length > 0
					? queryTraceOperator.filter((traceOperator) =>
							Boolean(traceOperator.expression.trim()),
					  )
					: [];

			const currentTraceOperator = mapQueryDataToApi(
				filteredTraceOperator,
				'queryName',
				tableParams,
			);

			// Combine legend maps
			legendMap = {
				...currentQueryData.newLegendMap,
				...currentFormulas.newLegendMap,
				...currentTraceOperator.newLegendMap,
			};

			// Convert builder queries
			const builderQueries = convertBuilderQueriesToV5(
				currentQueryData.data,
				requestType,
				graphType,
			);

			// Convert formulas as separate query type
			const formulaQueries = Object.entries(currentFormulas.data).map(
				([queryName, formulaData]): QueryEnvelope => ({
					type: 'builder_formula' as const,
					spec: {
						name: queryName,
						expression: formulaData.expression || '',
						disabled: formulaData.disabled,
						limit: formulaData.limit ?? undefined,
						legend: isEmpty(formulaData.legend) ? undefined : formulaData.legend,
						order: formulaData.orderBy?.map(
							// eslint-disable-next-line sonarjs/no-identical-functions
							(order: any): OrderBy => ({
								key: {
									name: order.columnName,
								},
								direction: order.order,
							}),
						),
					},
				}),
			);

			const traceOperatorQueries = convertTraceOperatorToV5(
				currentTraceOperator.data,
				requestType,
				graphType,
			);

			// Combine all query types
			queries = [...builderQueries, ...formulaQueries, ...traceOperatorQueries];
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
			fillGaps: fillGaps || false,
		},
		variables: Object.entries(variables).reduce((acc, [key, value]) => {
			acc[key] = {
				value,
				type: dynamicVariables
					?.find((v) => v.name === key)
					?.type?.toLowerCase() as VariableType,
			};
			return acc;
		}, {} as Record<string, VariableItem>),
	};

	return { legendMap, queryPayload };
};
