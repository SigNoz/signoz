import type { SectionConfig } from '../../types/sections';

// Bar stacking lives in `visualization.stackedBarChart` (a different spec key from the
// time-series `chartAppearance`), so it isn't a chartAppearance control. It belongs to a
// future `visualization` section — omitted here until that section exists.
export const sections: SectionConfig[] = [
	{ kind: 'formatting', controls: { unit: true, decimals: true } },
	{ kind: 'axes', controls: { minMax: true, logScale: true } },
	{ kind: 'legend', controls: { position: true } },
	{ kind: 'thresholds' },
	{ kind: 'contextLinks' },
];
