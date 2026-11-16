import { SavedviewtypesSourceDTO } from 'api/generated/services/sigNoz.schemas';
import { QueryParams } from 'constants/query';
import { DEFAULT_PANEL_TYPE } from 'container/LLMObservability/Explorer/constants';
import useUrlQuery from 'hooks/useUrlQuery';

import { PreferenceMode, PreferenceSlice } from '../types';
import { usePreferenceSync } from './usePreferenceSync';

export function useAiObservabilityPreferenceSync({
	mode,
	savedViewId,
}: {
	mode: PreferenceMode;
	savedViewId: string | undefined;
}): PreferenceSlice {
	const params = useUrlQuery();

	let panelType = DEFAULT_PANEL_TYPE;
	const panelTypesParam = params.get(QueryParams.panelTypes);
	if (panelTypesParam) {
		try {
			panelType = JSON.parse(panelTypesParam);
		} catch (e) {
			console.error(e);
		}
	}

	return usePreferenceSync({
		mode,
		savedViewId,
		sourcePage: SavedviewtypesSourceDTO.ai_observability,
		panelType,
	});
}
