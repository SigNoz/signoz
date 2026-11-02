import { SavedviewtypesSourceDTO } from 'api/generated/services/sigNoz.schemas';

// Only the logs and traces explorers keep column and formatting preferences.
export const PREFERENCE_SOURCE_PAGES = [
	SavedviewtypesSourceDTO.logs,
	SavedviewtypesSourceDTO.traces,
] as const;
