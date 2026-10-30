import { SavedviewtypesSourceDTO } from 'api/generated/services/sigNoz.schemas';
import { PANEL_TYPES } from 'constants/queryBuilder';

import aiObservabilityLoaderConfig from '../configs/aiObservabilityLoaderConfig';
import { Preferences } from '../types';

// The defaults of one panel, for source pages whose panels each keep their own
// columns; undefined for the others.
export function getPanelDefaults(
	sourcePage: SavedviewtypesSourceDTO,
	panelType: PANEL_TYPES,
): Preferences | undefined {
	if (sourcePage !== SavedviewtypesSourceDTO.ai_observability) {
		return undefined;
	}
	return { ...aiObservabilityLoaderConfig.default(panelType), panelType };
}
