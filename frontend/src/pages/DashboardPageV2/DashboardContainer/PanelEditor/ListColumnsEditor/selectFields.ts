import type {
	DashboardtypesListPanelSpecDTO,
	DashboardtypesPanelSpecDTO,
	TelemetrytypesTelemetryFieldKeyDTO,
} from 'api/generated/services/sigNoz.schemas';
import {
	defaultLogsSelectedColumns,
	defaultTraceSelectedColumns,
} from 'container/OptionsMenu/constants';

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
 * The datasource's default List columns (V1 parity): logs → timestamp/body,
 * traces → service.name/name/duration_nano/http_method/response_status_code.
 * Sanitized to the field-key DTO — the V1 constants carry extra keys (isIndexed)
 * the save contract rejects. Other signals (metrics) don't produce a list.
 */
export function defaultColumnsForSignal(
	signal: string,
): TelemetrytypesTelemetryFieldKeyDTO[] {
	if (signal === 'logs') {
		return sanitizeSelectFields(
			defaultLogsSelectedColumns as TelemetrytypesTelemetryFieldKeyDTO[],
		);
	}
	if (signal === 'traces') {
		return sanitizeSelectFields(
			defaultTraceSelectedColumns as TelemetrytypesTelemetryFieldKeyDTO[],
		);
	}
	return [];
}

// `spec.plugin.spec` is a discriminated union over every panel kind. These
// helpers run only for the List panel, so the spec is narrowed to the List
// variant with a single localized cast at the boundary.
export function readSelectFields(
	spec: DashboardtypesPanelSpecDTO,
): TelemetrytypesTelemetryFieldKeyDTO[] {
	return (
		(spec.plugin?.spec as DashboardtypesListPanelSpecDTO | undefined)
			?.selectFields ?? []
	);
}

export function writeSelectFields(
	spec: DashboardtypesPanelSpecDTO,
	selectFields: TelemetrytypesTelemetryFieldKeyDTO[],
): DashboardtypesPanelSpecDTO {
	const listSpec: DashboardtypesListPanelSpecDTO = {
		...(spec.plugin?.spec as DashboardtypesListPanelSpecDTO),
		selectFields: sanitizeSelectFields(selectFields),
	};
	return {
		...spec,
		plugin: { ...spec.plugin, spec: listSpec },
	} as DashboardtypesPanelSpecDTO;
}
