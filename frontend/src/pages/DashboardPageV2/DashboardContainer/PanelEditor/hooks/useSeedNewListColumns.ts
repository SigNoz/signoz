import { useEffect, useRef } from 'react';
import type { DashboardtypesPanelSpecDTO } from 'api/generated/services/sigNoz.schemas';

import {
	defaultColumnsForSignal,
	readSelectFields,
	writeSelectFields,
} from '../ListColumnsEditor/selectFields';

interface UseSeedNewListColumnsArgs {
	/** Gate: a brand-new List panel (the only case that should auto-fill columns). */
	enabled: boolean;
	/** Default signal for the new panel — its kind's first supported signal. */
	signal: string | undefined;
	spec: DashboardtypesPanelSpecDTO;
	onChangeSpec: (next: DashboardtypesPanelSpecDTO) => void;
}

/**
 * Seeds a brand-new List panel's columns with its default signal's columns
 * (logs → timestamp/body, traces → service.name/…), so the Columns control
 * isn't empty on first open. Runs once: an empty selection is a valid "show all
 * fields" state, so existing panels and user-cleared selections are never
 * touched — only the initial seed of a freshly-created panel.
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
		// Don't clobber a selection that's already present (e.g. re-render before
		// the seed flag settles); only seed when the panel has no columns yet.
		if (readSelectFields(spec).length > 0) {
			return;
		}
		seededRef.current = true;
		onChangeSpec(writeSelectFields(spec, defaultColumnsForSignal(signal)));
	}, [enabled, signal, spec, onChangeSpec]);
}
