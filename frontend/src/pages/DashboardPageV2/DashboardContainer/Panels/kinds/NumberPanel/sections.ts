import type { SectionConfig } from '../../types/sections';

// A number panel renders one scalar — no axes, legend, or stacking. Just value
// formatting, thresholds, and context links. Number's thresholds use a comparison-
// operator shape (DashboardtypesComparisonThresholdDTO) — value crosses an operator and
// recolors the displayed number — distinct from the value+label line thresholds the
// `thresholds` section edits, so it has its own `comparisonThresholds` section.
export const sections: SectionConfig[] = [
	{ kind: 'visualization', controls: { timePreference: true } },
	{ kind: 'formatting', controls: { unit: true, decimals: true } },
	{ kind: 'comparisonThresholds' },
	{ kind: 'contextLinks' },
];
