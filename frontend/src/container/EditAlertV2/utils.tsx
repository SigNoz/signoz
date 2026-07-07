import { RuletypesAlertTypeDTO } from 'api/generated/services/sigNoz.schemas';
import { dataSourceForAlertType } from 'constants/alerts';
import { initialQueryBuilderFormValuesMap } from 'constants/queryBuilder';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

export function sanitizeDefaultAlertQuery(
	query: Query,
	alertType: RuletypesAlertTypeDTO | undefined,
): Query {
	if (query.builder.queryData.length === 0) {
		const dataSource = dataSourceForAlertType(alertType);
		query.builder.queryData.push(initialQueryBuilderFormValuesMap[dataSource]);
	}
	return query;
}
