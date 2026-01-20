import {
	convertBuilderQueriesToV5,
	convertClickHouseQueriesToV5,
	convertPromQueriesToV5,
	convertTraceOperatorToV5,
	mapPanelTypeToRequestType,
} from 'api/v5/queryRange/prepareQueryRangePayloadV5';
import { TRACE_OPERATOR_QUERY_NAME } from 'constants/queryBuilder';
import { ICompositeMetricQuery } from 'types/api/alerts/compositeQuery';
import {
	BuilderQueryDataResourse,
	IBuilderTraceOperator,
} from 'types/api/queryBuilder/queryBuilderData';
import { OrderBy, QueryEnvelope } from 'types/api/v5/queryRange';

function convertFormulasToV5(
	formulas: BuilderQueryDataResourse,
): QueryEnvelope[] {
	return Object.entries(formulas).map(
		([queryName, formulaData]): QueryEnvelope => ({
			type: 'builder_formula' as const,
			spec: {
				name: queryName,
				expression: formulaData.expression || '',
				disabled: formulaData.disabled,
				limit: formulaData.limit ?? undefined,
				legend: formulaData.legend,
				order: formulaData.orderBy?.map(
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
}

export function compositeQueryToQueryEnvelope(
	compositeQuery: ICompositeMetricQuery,
): ICompositeMetricQuery {
	const {
		builderQueries,
		promQueries,
		chQueries,
		panelType,
		queryType,
	} = compositeQuery;

	const regularQueries: BuilderQueryDataResourse = {};
	const formulaQueries: BuilderQueryDataResourse = {};
	const traceOperatorQueries: BuilderQueryDataResourse = {};

	Object.entries(builderQueries || {}).forEach(([queryName, queryData]) => {
		if (queryData.queryName === TRACE_OPERATOR_QUERY_NAME) {
			traceOperatorQueries[queryName] = queryData;
		} else if ('dataSource' in queryData) {
			regularQueries[queryName] = queryData;
		} else {
			formulaQueries[queryName] = queryData;
		}
	});

	const requestType = mapPanelTypeToRequestType(panelType);

	const builderQueriesV5 = convertBuilderQueriesToV5(
		regularQueries,
		requestType,
		panelType,
	);
	const formulaQueriesV5 = convertFormulasToV5(formulaQueries);

	const traceOperatorQueriesV5 = convertTraceOperatorToV5(
		traceOperatorQueries as Record<string, IBuilderTraceOperator>,
		requestType,
		panelType,
	);

	const promQueriesV5 = convertPromQueriesToV5(promQueries || {});
	const chQueriesV5 = convertClickHouseQueriesToV5(chQueries || {});

	// Conditionally include queries based on queryType
	let queries: QueryEnvelope[] = [];

	switch (queryType) {
		case 'builder':
			queries = [
				...builderQueriesV5,
				...formulaQueriesV5,
				...traceOperatorQueriesV5,
			];
			break;
		case 'promql':
			queries = [...promQueriesV5];
			break;
		case 'clickhouse_sql':
			queries = [...chQueriesV5];
			break;
		default:
			// Fallback to include all queries if queryType is not recognized
			queries = [
				...builderQueriesV5,
				...formulaQueriesV5,
				...traceOperatorQueriesV5,
				...promQueriesV5,
				...chQueriesV5,
			];
	}

	return {
		...compositeQuery,
		queries,
		builderQueries: undefined,
		promQueries: undefined,
		chQueries: undefined,
	};
}
