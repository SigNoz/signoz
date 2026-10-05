import {
	SavedviewtypesSavedViewDTO,
	SavedviewtypesSourceDTO,
} from 'api/generated/services/sigNoz.schemas';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { mapQueryDataFromApi } from 'lib/newQueryBuilder/queryBuilderMappers/mapQueryDataFromApi';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { QueryEnvelope } from 'types/api/v5/queryRange';
import { EQueryType } from 'types/common/dashboard';
import { DataSource } from 'types/common/queryBuilder';

export type SavedViewSourcePage = DataSource | 'meter';

// Explorers and the preferences module are keyed by DataSource (the signal),
// the api keys views by source page. Same values today, so this is the one
// place they meet. AI observability views will come with their own source and
// DataSource cannot tell them apart from traces, so preferences should move to
// source page at that point and this map goes with it.
const SAVED_VIEW_SOURCE: Record<SavedViewSourcePage, SavedviewtypesSourceDTO> =
	{
		[DataSource.LOGS]: SavedviewtypesSourceDTO.logs,
		[DataSource.TRACES]: SavedviewtypesSourceDTO.traces,
		[DataSource.METRICS]: SavedviewtypesSourceDTO.metrics,
		meter: SavedviewtypesSourceDTO.meter,
	};

export function toSavedViewSource(
	sourcePage: SavedViewSourcePage,
): SavedviewtypesSourceDTO {
	return SAVED_VIEW_SOURCE[sourcePage];
}

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

export function findSavedView(
	views: SavedviewtypesSavedViewDTO[] | null | undefined,
	id: string,
): SavedviewtypesSavedViewDTO | undefined {
	return views?.find((view) => view.id === id);
}
