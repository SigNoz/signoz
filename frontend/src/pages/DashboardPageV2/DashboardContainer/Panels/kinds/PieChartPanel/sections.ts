import { SectionKind, type SectionConfig } from '../../types/sections';

// Pie has no axes, thresholds, or stacking — just value formatting and a legend.
// Legend `colors` is omitted: the pie legend is always interactive swatches.
export const sections: SectionConfig[] = [
	{
		kind: SectionKind.Visualization,
		controls: { switchPanelKind: true, timePreference: true },
	},
	{ kind: SectionKind.Formatting, controls: { unit: true, decimals: true } },
	{ kind: SectionKind.Legend, controls: { position: true } },
	{ kind: SectionKind.ContextLinks },
];
