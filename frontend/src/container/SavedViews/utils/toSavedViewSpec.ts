import type { Querybuildertypesv5QueryEnvelopeDTO } from 'api/generated/services/sigNoz.schemas/querybuildertypesv5QueryEnvelopeDTO';
import type { SavedviewtypesDisplayDTO } from 'api/generated/services/sigNoz.schemas/savedviewtypesDisplayDTO';
import type { SavedviewtypesSavedViewSpecDTO } from 'api/generated/services/sigNoz.schemas/savedviewtypesSavedViewSpecDTO';
import type { TelemetrytypesFieldContextDTO } from 'api/generated/services/sigNoz.schemas/telemetrytypesFieldContextDTO';
import type { TelemetrytypesFieldDataTypeDTO } from 'api/generated/services/sigNoz.schemas/telemetrytypesFieldDataTypeDTO';
import type { TelemetrytypesSignalDTO } from 'api/generated/services/sigNoz.schemas/telemetrytypesSignalDTO';
import type { TelemetrytypesTelemetryFieldKeyDTO } from 'api/generated/services/sigNoz.schemas/telemetrytypesTelemetryFieldKeyDTO';
import { SavedviewtypesPanelTypeDTO } from 'api/generated/services/sigNoz.schemas/savedviewtypesPanelTypeDTO';
import type { PANEL_TYPES } from 'constants/queryBuilder';
import { mapCompositeQueryFromQuery } from 'lib/newQueryBuilder/queryBuilderMappers/mapCompositeQueryFromQuery';
import { panelTypeToRequestType } from 'pages/DashboardPage/DashboardContainer/queryV5/persesQueryAdapters';
import type { TelemetryFieldKey } from 'types/api/v5/queryRange';

import type { ToSavedViewSpecArgs } from '../types';

const SAVED_VIEW_PANEL_TYPES = new Set<string>(
	Object.values(SavedviewtypesPanelTypeDTO),
);

// Explorers only produce list / trace / graph / table; anything else a caller
// hands over (a dashboard panel type) is stored as a time series view.
export function toSavedViewPanelType(
	panelType: PANEL_TYPES,
): SavedviewtypesPanelTypeDTO {
	return SAVED_VIEW_PANEL_TYPES.has(panelType)
		? (panelType as unknown as SavedviewtypesPanelTypeDTO)
		: SavedviewtypesPanelTypeDTO.graph;
}

// The api stores the field identity only; `key` and the column flags are ui state.
function toFieldKey(
	column: TelemetryFieldKey,
): TelemetrytypesTelemetryFieldKeyDTO {
	return {
		name: column.name ?? column.key ?? '',
		...(column.signal && {
			signal: column.signal as unknown as TelemetrytypesSignalDTO,
		}),
		...(column.fieldContext && {
			fieldContext:
				column.fieldContext as unknown as TelemetrytypesFieldContextDTO,
		}),
		...(column.fieldDataType && {
			fieldDataType:
				column.fieldDataType as unknown as TelemetrytypesFieldDataTypeDTO,
		}),
		...(column.description && { description: column.description }),
		...(column.unit && { unit: column.unit }),
	};
}

export function toSavedViewSpec({
	query,
	panelType,
	displayName,
	options,
	color,
}: ToSavedViewSpecArgs): SavedviewtypesSavedViewSpecDTO {
	const { queries } = mapCompositeQueryFromQuery(query, panelType);

	const display: SavedviewtypesDisplayDTO = {
		...(color && { color }),
		...(options?.format && { format: options.format }),
		...(options?.maxLines && { maxLines: options.maxLines }),
		...(options?.fontSize && { fontSize: options.fontSize }),
	};

	return {
		displayName,
		panelType: toSavedViewPanelType(panelType),
		requestType: panelTypeToRequestType(panelType),
		queries: (queries ?? []) as unknown as Querybuildertypesv5QueryEnvelopeDTO[],
		...(options?.selectColumns?.length && {
			selectedFields: options.selectColumns.map(toFieldKey),
		}),
		...(Object.keys(display).length > 0 && { display }),
	};
}
