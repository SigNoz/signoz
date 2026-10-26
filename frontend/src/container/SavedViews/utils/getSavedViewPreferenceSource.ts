import { SavedviewtypesSourceDTO } from 'api/generated/services/sigNoz.schemas';
import { PANEL_TYPES } from 'constants/queryBuilder';
import {
	AI_OBSERVABILITY_PREFERENCE_SOURCE,
	AI_OBSERVABILITY_TRACE_VIEW_PREFERENCE_SOURCE,
	PreferenceContextValue,
	PreferenceSlice,
	PreferenceSource,
} from 'providers/preferences/types';
import { DataSource } from 'types/common/queryBuilder';

// The preference slice whose columns a view of this source and panel saves;
// none when that explorer tab has no columns. The AI explorer keeps one per tab.
export function getSavedViewPreferenceSource(
	source: SavedviewtypesSourceDTO,
	panelType: string | null | undefined,
): PreferenceSource | undefined {
	switch (source) {
		case SavedviewtypesSourceDTO.logs:
			return DataSource.LOGS;
		case SavedviewtypesSourceDTO.traces:
			return DataSource.TRACES;
		case SavedviewtypesSourceDTO.ai_observability:
			if (panelType === PANEL_TYPES.LIST) {
				return AI_OBSERVABILITY_PREFERENCE_SOURCE;
			}
			if (panelType === PANEL_TYPES.TRACE) {
				return AI_OBSERVABILITY_TRACE_VIEW_PREFERENCE_SOURCE;
			}
			return undefined;
		default:
			return undefined;
	}
}

export function getPreferenceSlice(
	preferences: PreferenceContextValue,
	preferenceSource: PreferenceSource | undefined,
): PreferenceSlice | undefined {
	switch (preferenceSource) {
		case DataSource.LOGS:
			return preferences.logs;
		case DataSource.TRACES:
			return preferences.traces;
		case AI_OBSERVABILITY_PREFERENCE_SOURCE:
			return preferences.aiObservability;
		case AI_OBSERVABILITY_TRACE_VIEW_PREFERENCE_SOURCE:
			return preferences.aiObservabilityTraceView;
		default:
			return undefined;
	}
}
