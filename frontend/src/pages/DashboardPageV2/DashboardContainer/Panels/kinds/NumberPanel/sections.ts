import type { SectionConfig } from '../../types/sections';

// A number panel renders one scalar — no axes, legend, or stacking. Just value
// formatting and thresholds that recolor the value/background.
export const sections: SectionConfig[] = [
	{ kind: 'formatting', controls: { unit: true, decimals: true } },
	{ kind: 'thresholds', controls: { list: true } },
];
