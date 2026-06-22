import type {
	DashboardtypesListPanelSpecDTO,
	DashboardtypesPanelSpecDTO,
	TelemetrytypesTelemetryFieldKeyDTO,
} from 'api/generated/services/sigNoz.schemas';

/**
 * The field-key suggestions API and the default-column constants carry extra
 * runtime fields (e.g. `isIndexed`) that the save contract rejects. Reduce each
 * column to the `TelemetrytypesTelemetryFieldKeyDTO` shape so persisted
 * `selectFields` only contain backend-known keys.
 */
function toFieldKeyDTO(
	field: TelemetrytypesTelemetryFieldKeyDTO,
): TelemetrytypesTelemetryFieldKeyDTO {
	const { name, description, fieldContext, fieldDataType, signal, unit } = field;
	return {
		name,
		...(description !== undefined && { description }),
		...(fieldContext !== undefined && { fieldContext }),
		...(fieldDataType !== undefined && { fieldDataType }),
		...(signal !== undefined && { signal }),
		...(unit !== undefined && { unit }),
	};
}

export function sanitizeSelectFields(
	fields: TelemetrytypesTelemetryFieldKeyDTO[],
): TelemetrytypesTelemetryFieldKeyDTO[] {
	return fields.map(toFieldKeyDTO);
}

/**
 * `spec.plugin.spec` is a discriminated union over every panel kind; these helpers
 * run only for the List panel, so it's narrowed to the List variant with a single
 * localized cast at the boundary.
 */
export function readSelectFields(
	spec: DashboardtypesPanelSpecDTO,
): TelemetrytypesTelemetryFieldKeyDTO[] {
	return (spec.plugin.spec as DashboardtypesListPanelSpecDTO).selectFields ?? [];
}

export function writeSelectFields(
	spec: DashboardtypesPanelSpecDTO,
	selectFields: TelemetrytypesTelemetryFieldKeyDTO[],
): DashboardtypesPanelSpecDTO {
	const listSpec: DashboardtypesListPanelSpecDTO = {
		...(spec.plugin.spec as DashboardtypesListPanelSpecDTO),
		selectFields: sanitizeSelectFields(selectFields),
	};
	return {
		...spec,
		plugin: { ...spec.plugin, spec: listSpec },
	} as DashboardtypesPanelSpecDTO;
}
