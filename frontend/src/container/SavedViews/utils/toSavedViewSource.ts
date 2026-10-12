import { SavedviewtypesSourceDTO } from 'api/generated/services/sigNoz.schemas';
import { DataSource } from 'types/common/queryBuilder';

import { SavedViewSourcePage } from '../types';

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
