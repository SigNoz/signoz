import type {
	PanelVisualizationSlice,
	SectionControlsOf,
	SectionKind,
} from 'pages/DashboardPage/DashboardContainer/Panels/types/sections';
import { getPanelDefinition } from 'pages/DashboardPage/DashboardContainer/Panels/registry';

import type { SectionEditorContext } from '../../sectionContext';
import { joinSummary } from '../../utils/summary';
import { TIME_PREFERENCE_OPTIONS } from './timePreferenceOptions';

export function summarizeVisualization(
	value: PanelVisualizationSlice | undefined,
	controls: SectionControlsOf<SectionKind.Visualization>,
	{ panelKind }: SectionEditorContext,
): string {
	const time = TIME_PREFERENCE_OPTIONS.find(
		(option) => option.value === value?.timePreference,
	);
	return joinSummary([
		panelKind && getPanelDefinition(panelKind).displayName,
		controls.timePreference && (time?.label ?? TIME_PREFERENCE_OPTIONS[0].label),
	]);
}
