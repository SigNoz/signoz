import type {
	DashboardtypesDashboardSpecDTO,
	DashboardtypesLayoutDTO,
} from 'api/generated/services/sigNoz.schemas';

import { extractPanelIdFromRef } from '../../utils';

export interface PanelLayoutIssues {
	// Panels defined in `spec.panels` that no layout places — they render nowhere.
	danglingPanelIds: string[];
	// Panel ids a layout item references that no longer exist in `spec.panels`.
	missingPanelRefs: string[];
}

const referencedPanelIds = (
	layouts: DashboardtypesLayoutDTO[],
): Set<string> => {
	const referenced = new Set<string>();
	layouts.forEach((layout) => {
		if (layout?.kind !== 'Grid') {
			return;
		}
		(layout.spec?.items ?? []).forEach((item) => {
			const id = extractPanelIdFromRef(item?.content?.$ref);
			if (id) {
				referenced.add(id);
			}
		});
	});
	return referenced;
};

// The two ways a hand-edited spec can desync panels and layouts: a panel with no
// layout slot (renders nowhere), or a layout slot pointing at a panel that was
// removed (broken reference). Guarded for untrusted, user-edited JSON.
export function findPanelLayoutIssues(
	spec: DashboardtypesDashboardSpecDTO | undefined,
): PanelLayoutIssues {
	const panels = spec?.panels ?? {};
	const panelIds = Object.keys(panels);
	const referenced = referencedPanelIds(spec?.layouts ?? []);

	return {
		danglingPanelIds: panelIds.filter((id) => !referenced.has(id)),
		missingPanelRefs: [...referenced].filter((id) => !(id in panels)),
	};
}
