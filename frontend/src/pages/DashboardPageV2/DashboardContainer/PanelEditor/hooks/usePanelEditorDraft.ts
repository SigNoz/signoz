import { useCallback, useMemo, useState } from 'react';
import type {
	DashboardtypesPanelDTO,
	DashboardtypesPanelSpecDTO,
} from 'api/generated/services/sigNoz.schemas';
import { isEqual } from 'lodash-es';

import type { PanelEditorDraftApi } from '../types';

/**
 * Owns the editable draft of a single panel, seeded once from the loaded panel and
 * mutated locally until save. Kept in the perses `DashboardtypesPanelDTO` shape so the
 * preview renders it through the dashboard's renderer registry and the save hook
 * patches it without conversion. Everything the config pane edits flows through the
 * single `spec`/`setSpec` pair.
 */
export function usePanelEditorDraft(
	initialPanel: DashboardtypesPanelDTO,
): PanelEditorDraftApi {
	const [draft, setDraft] = useState<DashboardtypesPanelDTO>(initialPanel);

	const setSpec = useCallback((next: DashboardtypesPanelSpecDTO): void => {
		setDraft((prev) => ({ ...prev, spec: next }));
	}, []);

	const reset = useCallback((): void => {
		setDraft(initialPanel);
	}, [initialPanel]);

	// Deep compare, ignoring `spec.queries`: the query is owned by the builder and
	// re-serialized into the draft as a preview cache, so its representation drifts
	// without a real edit. Query dirtiness is tracked separately; here we only flag
	// divergence in the display + plugin spec slices.
	const isSpecDirty = useMemo(
		() =>
			!isEqual(
				{ ...draft, spec: { ...draft.spec, queries: null } },
				{ ...initialPanel, spec: { ...initialPanel.spec, queries: null } },
			),
		[draft, initialPanel],
	);

	return {
		draft,
		spec: draft.spec,
		setSpec,
		isSpecDirty,
		reset,
	};
}
