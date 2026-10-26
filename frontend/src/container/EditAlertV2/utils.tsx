import { RuletypesAlertTypeDTO } from 'api/generated/services/sigNoz.schemas';
import { dataSourceForAlertType } from 'constants/alerts';
import { initialQueryBuilderFormValuesMap } from 'constants/queryBuilder';
import { mapQueryDataFromApi } from 'lib/newQueryBuilder/queryBuilderMappers/mapQueryDataFromApi';
import { toAISlotQuery } from 'lib/query/builderSlot';
import { AlertTypes } from 'types/api/alerts/alertTypes';
import { ICompositeMetricQuery } from 'types/api/alerts/compositeQuery';
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

/** A saved AI traces rule comes back as a builder query; the editor holds it in the AI slot. */
export function toEditAlertQuery(
	query: Query,
	alertType: AlertTypes | RuletypesAlertTypeDTO | undefined,
): Query {
	return alertType === AlertTypes.AI_TRACES_BASED_ALERT
		? toAISlotQuery(query)
		: query;
}

export function getEditAlertQuery(
	compositeQuery: ICompositeMetricQuery,
	alertType: AlertTypes,
): Query {
	return toEditAlertQuery(mapQueryDataFromApi(compositeQuery), alertType);
}
