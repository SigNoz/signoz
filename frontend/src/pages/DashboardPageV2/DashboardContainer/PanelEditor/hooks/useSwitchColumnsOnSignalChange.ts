import { useEffect, useRef } from 'react';
import {
	type DashboardtypesPanelSpecDTO,
	TelemetrytypesSignalDTO,
	type TelemetrytypesTelemetryFieldKeyDTO,
} from 'api/generated/services/sigNoz.schemas';
import {
	defaultLogsSelectedColumns,
	defaultTraceSelectedColumns,
} from 'container/OptionsMenu/constants';

import { sanitizeSelectFields } from '../ListColumnsEditor/selectFields';

/**
 * The datasource's default List columns (V1 parity), sanitized to the field-key
 * DTO — the V1 constants carry extra keys (isIndexed) the save contract rejects.
 * Other signals (metrics) don't produce a list, so they clear the selection.
 */
function defaultColumnsForSignal(
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

interface UseSwitchColumnsOnSignalChangeArgs {
	/** Gate so the switch only runs for the List kind (the only one with columns). */
	enabled: boolean;
	/** The panel's current telemetry signal (logs / traces / metrics). */
	signal: TelemetrytypesSignalDTO | undefined;
	spec: DashboardtypesPanelSpecDTO;
	onChangeSpec: (next: DashboardtypesPanelSpecDTO) => void;
}

/**
 * Switches the List panel's chosen columns to the new datasource's defaults when
 * the panel's telemetry signal changes (e.g. logs → traces). V1 kept a separate
 * field list per datasource; V2 stores a single `selectFields`, so columns picked
 * for one signal are meaningless after switching — replace them with the new
 * source's sensible defaults (matching V1's logs/traces list defaults).
 */
export function useSwitchColumnsOnSignalChange({
	enabled,
	signal,
	spec,
	onChangeSpec,
}: UseSwitchColumnsOnSignalChangeArgs): void {
	const prevSignalRef = useRef(signal);

	useEffect(() => {
		const prev = prevSignalRef.current;
		prevSignalRef.current = signal;

		if (!enabled) {
			return;
		}
		// Only an actual switch between two known signals swaps the columns;
		// transient `undefined` states (mid query-edit) leave the selection intact.
		if (!prev || !signal || prev === signal) {
			return;
		}
		onChangeSpec({
			...spec,
			plugin: {
				...spec.plugin,
				spec: {
					...spec.plugin.spec,
					selectFields: defaultColumnsForSignal(signal),
				},
			},
		} as DashboardtypesPanelSpecDTO);
	}, [enabled, signal, spec, onChangeSpec]);
}
