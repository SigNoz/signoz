import { SavedviewtypesSourceDTO } from 'api/generated/services/sigNoz.schemas';
import { DataSource } from 'types/common/queryBuilder';

import { SavedViewSourcePage } from '../types';

// The views API files each view under a source page, but callers only know the
// signal they query: a builder query's dataSource, or the AI assistant's hint.
// TODO: remove in a follow-up once callers pass the source page directly.
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
