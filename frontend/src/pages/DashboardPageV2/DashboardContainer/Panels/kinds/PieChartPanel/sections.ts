import { SectionKind, type SectionConfig } from '../../types/sections';

// Pie has no axes, thresholds, or stacking — just value formatting and a legend
// (position + per-slice color overrides).
export const sections: SectionConfig[] = [
	{
		kind: SectionKind.Visualization,
		controls: { switchPanelKind: true, timePreference: true },
	},
	{ kind: SectionKind.Formatting, controls: { unit: true, decimals: true } },
	{ kind: SectionKind.Legend, controls: { position: true, colors: true } },
	{ kind: SectionKind.ContextLinks },
];
