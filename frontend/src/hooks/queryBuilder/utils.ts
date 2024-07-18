import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource, StringOperators } from 'types/common/queryBuilder';

/**
 * on navigating to create alert, we change noop to count (ref: ExplorerOptions -> onCreateAlertsHandler), as noop is not supported in create alert
 * on creating alert from Traces page and coming back to Traces, the count aggregateOperator causes an error, therefore, changing it back to noop
 * @param pathname
 * @param query
 * @param panelTypes
 * @returns
 */
export function adjustQueryForTracesPage(
	pathname: string,
	query: Query | null,
	panelTypes: string | null,
): Query | null {
	if (!query) return null;

	// there is no need to convert count to noop if there are more than 1 queryData, since it must not be noop
	if (
		pathname.includes(DataSource.TRACES) &&
		query.builder.queryData.length === 1 &&
		query.builder.queryData[0].aggregateOperator === StringOperators.COUNT &&
		(!panelTypes || ['list', 'trace'].includes(panelTypes))
	) {
		return {
			...query,
			builder: {
				...query.builder,
				queryData: [
					{
						...query.builder.queryData[0],
						aggregateOperator: StringOperators.NOOP,
					},
					...query.builder.queryData.slice(1),
				],
			},
		};
	}
	return query;
}
