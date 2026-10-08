import { SavedviewtypesSavedViewDTO } from 'api/generated/services/sigNoz.schemas';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { mapQueryDataFromApi } from 'lib/newQueryBuilder/queryBuilderMappers/mapQueryDataFromApi';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { QueryEnvelope } from 'types/api/v5/queryRange';
import { EQueryType } from 'types/common/dashboard';

// Explorers only save builder queries; v2 carries no queryType, so it is fixed here.
export function getSavedViewQuery(view: SavedviewtypesSavedViewDTO): Query {
	const { queries, panelType } = view.spec;
	return mapQueryDataFromApi({
		queries: queries as QueryEnvelope[],
		panelType: panelType as unknown as PANEL_TYPES,
		queryType: EQueryType.QUERY_BUILDER,
		unit: undefined,
	});
}
