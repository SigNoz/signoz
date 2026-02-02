import { ALERTS_DATA_SOURCE_MAP } from 'constants/alerts';
import { initialQueryBuilderFormValuesMap } from 'constants/queryBuilder';
import { AlertTypes } from 'types/api/alerts/alertTypes';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

export function sanitizeDefaultAlertQuery(
	query: Query,
	alertType: AlertTypes,
): Query {
	// If there are no queries, add a default one based on the alert type
	if (query.builder.queryData.length === 0) {
		const dataSource = ALERTS_DATA_SOURCE_MAP[alertType];
		query.builder.queryData.push(initialQueryBuilderFormValuesMap[dataSource]);
	}
	return query;
}
