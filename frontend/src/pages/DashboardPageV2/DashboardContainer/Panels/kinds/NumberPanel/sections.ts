import type { SectionConfig } from '../../types/sections';

// A number panel renders one scalar — no axes, legend, or stacking. Just value
// formatting, thresholds, and context links. Number's thresholds use the `comparison`
// variant (value crosses an operator → recolor the displayed number), distinct from the
// value+label `label` variant TimeSeries/Bar use.
export const sections: SectionConfig[] = [
	{ kind: 'visualization', controls: { timePreference: true } },
	{ kind: 'formatting', controls: { unit: true, decimals: true } },
	{ kind: 'thresholds', controls: { variant: 'comparison' } },
	{ kind: 'contextLinks' },
];
