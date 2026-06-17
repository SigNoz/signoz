import { useCallback, useMemo, useState } from 'react';
import type {
	DashboardtypesPanelDTO,
	DashboardtypesPanelSpecDTO,
} from 'api/generated/services/sigNoz.schemas';
import { isEqual } from 'lodash-es';

import type { PanelEditorDraftApi } from '../types';

/**
 * Owns the editable draft of a single panel. Seeded once from the loaded panel
 * (`useState` initializer), then mutated locally until the user saves. Keeping
 * the draft in the perses `DashboardtypesPanelDTO` shape lets the preview pane
 * render it through the same renderer registry the dashboard uses, and lets the
 * save hook patch it without any conversion.
 *
 * Everything the config pane edits — title/description, the per-kind plugin spec
 * (formatting, axes, …), legend colors, context links — flows through the single
 * `spec`/`setSpec` pair (the ConfigPane registry lens), so there is one editing path.
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

	// Deep compare, ignoring `spec.queries`: the live query is owned by the shared
	// query builder and re-serialized into the draft purely as a preview cache, so
	// its representation drifts (builder-filled defaults, regenerated ids, wrapper
	// kind) without a real edit. Query dirtiness is tracked separately against the
	// builder; here we only flag divergence in display + plugin spec slices
	// (formatting, axes, thresholds, links, list columns, …).
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
