import { useCallback, useMemo, useState } from 'react';
import type {
	DashboardtypesPanelDTO,
	DashboardtypesPanelSpecDTO,
} from 'api/generated/services/sigNoz.schemas';
import { isEqual } from 'lodash-es';

import type { PanelEditorDraftApi } from './types';

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

	// Deep compare: any divergence from the loaded panel (display OR spec slices like
	// formatting/axes/thresholds/links) marks the draft dirty.
	const isDirty = useMemo(
		() => !isEqual(draft, initialPanel),
		[draft, initialPanel],
	);

	return {
		draft,
		spec: draft.spec,
		setSpec,
		isDirty,
		reset,
	};
}
