import { SavedviewtypesSourceDTO } from 'api/generated/services/sigNoz.schemas';
import { DataSource } from 'types/common/queryBuilder';

import { SavedViewSourcePage } from '../types';

// The AI assistant names a view's source by DataSource (the signal), the api
// keys views by source page.
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
