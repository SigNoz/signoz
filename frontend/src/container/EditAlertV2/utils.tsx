import { RuletypesAlertTypeDTO } from 'api/generated/services/sigNoz.schemas';
import { dataSourceForAlertType } from 'constants/alerts';
import { initialQueryBuilderFormValuesMap } from 'constants/queryBuilder';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

export function sanitizeDefaultAlertQuery(
	query: Query,
	alertType: RuletypesAlertTypeDTO | undefined,
): Query {
	// If there are no queries, add a default one based on the alert type
	if (query.builder.queryData.length === 0) {
		const dataSource = dataSourceForAlertType(alertType);
		query.builder.queryData.push(initialQueryBuilderFormValuesMap[dataSource]);
	}
	return query;
}
