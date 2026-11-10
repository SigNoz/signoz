import {
	TelemetrytypesSignalDTO,
	type DashboardtypesListPanelSpecDTO,
	type DashboardtypesPanelSpecDTO,
	type TelemetrytypesTelemetryFieldKeyDTO,
} from 'api/generated/services/sigNoz.schemas';
import {
	defaultLogsSelectedColumns,
	defaultTraceSelectedColumns,
} from 'container/OptionsMenu/constants';

/**
 * Reduce each column to the field-key DTO shape: the suggestions API and default
 * constants carry extra runtime fields (e.g. `isIndexed`) the save contract rejects.
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
 * logs/traces List-column defaults (V1 parity), sanitized to the field-key DTO.
 */
export function defaultColumnsForSignal(
	signal: TelemetrytypesSignalDTO,
): TelemetrytypesTelemetryFieldKeyDTO[] {
	if (signal === TelemetrytypesSignalDTO.logs) {
		return sanitizeSelectFields(
			defaultLogsSelectedColumns as TelemetrytypesTelemetryFieldKeyDTO[],
		);
	}
	if (signal === TelemetrytypesSignalDTO.traces) {
		return sanitizeSelectFields(
			defaultTraceSelectedColumns as TelemetrytypesTelemetryFieldKeyDTO[],
		);
	}
	return [];
}

// `spec.plugin.spec` is a discriminated union over panel kinds; these List-only
// helpers narrow to the List variant via a single localized cast at the boundary.
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
