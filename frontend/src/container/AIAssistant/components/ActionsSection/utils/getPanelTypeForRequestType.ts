import {
	ApplyFilterSignalDTO,
	type MessageActionDTOQuery,
} from 'api/ai-assistant/sigNozAIAssistantAPI.schemas';
import { Querybuildertypesv5RequestTypeDTO } from 'api/generated/services/sigNoz.schemas';
import { PANEL_TYPES } from 'constants/queryBuilder';

export function getPanelTypeForRequestType(
	requestType: unknown,
	signal: ApplyFilterSignalDTO,
): PANEL_TYPES {
	switch (requestType) {
		case Querybuildertypesv5RequestTypeDTO.scalar:
			return PANEL_TYPES.TABLE;
		case Querybuildertypesv5RequestTypeDTO.time_series:
			return PANEL_TYPES.TIME_SERIES;
		case Querybuildertypesv5RequestTypeDTO.trace:
			return signal === ApplyFilterSignalDTO.traces
				? PANEL_TYPES.TRACE
				: PANEL_TYPES.LIST;
		default:
			return PANEL_TYPES.LIST;
	}
}

export function requestTypeFromActionQuery(
	query: MessageActionDTOQuery | undefined,
): unknown {
	return query?.requestType;
}
