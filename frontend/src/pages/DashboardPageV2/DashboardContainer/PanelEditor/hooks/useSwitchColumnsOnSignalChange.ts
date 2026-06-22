import { useEffect, useRef } from 'react';

import type {
	DashboardtypesPanelSpecDTO,
	TelemetrytypesSignalDTO,
	TelemetrytypesTelemetryFieldKeyDTO,
} from 'api/generated/services/sigNoz.schemas';

import {
	defaultColumnsForSignal,
	readSelectFields,
	writeSelectFields,
} from '../ListColumnsEditor/selectFields';

interface UseSwitchColumnsOnSignalChangeArgs {
	/** Gate so the switch only runs for the List kind (the only one with columns). */
	enabled: boolean;
	/** The panel's current telemetry signal (logs / traces / metrics). */
	signal: TelemetrytypesSignalDTO | undefined;
	spec: DashboardtypesPanelSpecDTO;
	onChangeSpec: (next: DashboardtypesPanelSpecDTO) => void;
}

/**
 * Swaps the List panel's columns when the telemetry signal changes (logs →
 * traces). V2 stores a single `selectFields`, so each signal's columns are
 * remembered and restored when the user switches back — logs → traces → logs
 * returns the original logs columns. A signal seen for the first time has
 * nothing stashed, so it gets the datasource's defaults (V1 parity).
 */
export function useSwitchColumnsOnSignalChange({
	enabled,
	signal,
	spec,
	onChangeSpec,
}: UseSwitchColumnsOnSignalChangeArgs): void {
	const prevSignalRef = useRef(signal);
	const columnsBySignalRef = useRef<
		Map<string, TelemetrytypesTelemetryFieldKeyDTO[]>
	>(new Map());

	useEffect(() => {
		const prev = prevSignalRef.current;

		if (!enabled || !signal) {
			return;
		}
		// Track only real signals: a transient `undefined` (mid query-edit) must
		// not become `prev`, or stash/restore would lose a step.
		prevSignalRef.current = signal;

		if (!prev || prev === signal) {
			return;
		}

		// Stash the leaving signal's columns; restore the entering one's, or its
		// datasource defaults the first time it's seen.
		columnsBySignalRef.current.set(prev, readSelectFields(spec));
		const restored =
			columnsBySignalRef.current.get(signal) ?? defaultColumnsForSignal(signal);
		onChangeSpec(writeSelectFields(spec, restored));
	}, [enabled, signal, spec, onChangeSpec]);
}
