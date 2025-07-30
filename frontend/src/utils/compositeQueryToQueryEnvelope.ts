import {
	convertBuilderQueriesToV5,
	convertClickHouseQueriesToV5,
	convertPromQueriesToV5,
	mapPanelTypeToRequestType,
} from 'api/v5/queryRange/prepareQueryRangePayloadV5';
import { ICompositeMetricQuery } from 'types/api/alerts/compositeQuery';
import { BuilderQueryDataResourse } from 'types/api/queryBuilder/queryBuilderData';
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

	Object.entries(builderQueries || {}).forEach(([queryName, queryData]) => {
		if ('dataSource' in queryData) {
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

	const promQueriesV5 = convertPromQueriesToV5(promQueries || {});
	const chQueriesV5 = convertClickHouseQueriesToV5(chQueries || {});

	// Conditionally include queries based on queryType
	let queries: QueryEnvelope[] = [];

	switch (queryType) {
		case 'builder':
			queries = [...builderQueriesV5, ...formulaQueriesV5];
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
