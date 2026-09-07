import { useEffect, useRef } from 'react';
import type {
	DashboardtypesPanelSpecDTO,
	TelemetrytypesSignalDTO,
} from 'api/generated/services/sigNoz.schemas';

import {
	defaultColumnsForSignal,
	readSelectFields,
	writeSelectFields,
} from '../ListColumnsEditor/selectFields';

interface UseSeedNewListColumnsArgs {
	/** Gate: a brand-new List panel (the only case that should auto-fill columns). */
	enabled: boolean;
	/** Default signal for the new panel — its kind's first supported signal. */
	signal: TelemetrytypesSignalDTO;
	spec: DashboardtypesPanelSpecDTO;
	onChangeSpec: (next: DashboardtypesPanelSpecDTO) => void;
}

/**
 * Seeds a brand-new List panel's columns with its default signal's columns so the
 * Columns control isn't empty on first open. Runs once and only when empty: an
 * empty selection is a valid "show all fields" state, so existing panels and
 * user-cleared selections are never touched.
 */
export function useSeedNewListColumns({
	enabled,
	signal,
	spec,
	onChangeSpec,
}: UseSeedNewListColumnsArgs): void {
	const seededRef = useRef(false);

	useEffect(() => {
		if (!enabled || seededRef.current || !signal) {
			return;
		}
		// Only seed when empty — don't clobber a selection that's already present.
		if (readSelectFields(spec).length > 0) {
			return;
		}
		seededRef.current = true;
		onChangeSpec(writeSelectFields(spec, defaultColumnsForSignal(signal)));
	}, [enabled, signal, spec, onChangeSpec]);
}
