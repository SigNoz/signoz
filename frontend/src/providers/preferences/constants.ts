import { SavedviewtypesSourceDTO } from 'api/generated/services/sigNoz.schemas';
import { PANEL_TYPES } from 'constants/queryBuilder';

// Source pages that keep column and formatting preferences.
export const PREFERENCE_SOURCE_PAGES = [
	SavedviewtypesSourceDTO.logs,
	SavedviewtypesSourceDTO.traces,
	SavedviewtypesSourceDTO.ai_observability,
] as const;

// The AI observability panels that keep their own columns.
export const AI_OBSERVABILITY_COLUMN_PANELS: PANEL_TYPES[] = [
	PANEL_TYPES.TRACE,
];
