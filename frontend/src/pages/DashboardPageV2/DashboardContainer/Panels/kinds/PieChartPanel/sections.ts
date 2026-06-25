import type { SectionConfig } from '../../types/sections';

// Pie has no axes, thresholds, or stacking — just value formatting and a legend.
// Legend `colors` is omitted: the pie legend is always interactive swatches.
export const sections: SectionConfig[] = [
	{ kind: 'visualization', controls: { timePreference: true } },
	{ kind: 'formatting', controls: { unit: true, decimals: true } },
	{ kind: 'legend', controls: { position: true } },
	{ kind: 'contextLinks' },
];
