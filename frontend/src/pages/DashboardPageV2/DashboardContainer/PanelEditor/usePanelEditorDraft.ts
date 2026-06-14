import { useCallback, useMemo, useState } from 'react';
import type {
	DashboardtypesPanelDTO,
	DashboardtypesPanelSpecDTO,
} from 'api/generated/services/sigNoz.schemas';
import { isEqual } from 'lodash-es';

import type { PanelDisplayDraft, PanelEditorDraftApi } from './types';

function readDisplay(panel: DashboardtypesPanelDTO): PanelDisplayDraft {
	return {
		name: panel.spec?.display?.name ?? '',
		description: panel.spec?.display?.description ?? '',
	};
}

/**
 * Owns the editable draft of a single panel. Seeded once from the loaded panel
 * (`useState` initializer), then mutated locally until the user saves. Keeping
 * the draft in the perses `DashboardtypesPanelDTO` shape lets the preview pane
 * render it through the same renderer registry the dashboard uses, and lets the
 * save hook diff/patch it without any conversion.
 */
export function usePanelEditorDraft(
	initialPanel: DashboardtypesPanelDTO,
): PanelEditorDraftApi {
	const [draft, setDraft] = useState<DashboardtypesPanelDTO>(initialPanel);

	const setDisplay = useCallback((next: Partial<PanelDisplayDraft>): void => {
		setDraft((prev) => ({
			...prev,
			spec: {
				...prev.spec,
				display: {
					...prev.spec?.display,
					...next,
				},
			},
		}));
	}, []);

	const setSpec = useCallback((next: DashboardtypesPanelSpecDTO): void => {
		setDraft((prev) => ({ ...prev, spec: next }));
	}, []);

	const reset = useCallback((): void => {
		setDraft(initialPanel);
	}, [initialPanel]);

	const display = useMemo(() => readDisplay(draft), [draft]);

	// Deep compare: any divergence from the loaded panel (display OR spec slices like
	// formatting/axes/thresholds/links) marks the draft dirty, not just name/description.
	const isDirty = useMemo(
		() => !isEqual(draft, initialPanel),
		[draft, initialPanel],
	);

	return {
		draft,
		display,
		setDisplay,
		spec: draft.spec,
		setSpec,
		isDirty,
		reset,
	};
}
