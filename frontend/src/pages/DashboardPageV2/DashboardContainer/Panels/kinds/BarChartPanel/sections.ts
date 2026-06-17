import type { SectionConfig } from '../../types/sections';

// Bar stacking lives in `visualization.stackedBarChart` (a different spec key from the
// time-series `chartAppearance`), so it's a control on the `visualization` section, not
// `chartAppearance`. fillSpans is TimeSeries-only, so Bar omits it (V1 parity).
export const sections: SectionConfig[] = [
	{ kind: 'visualization', controls: { timePreference: true, stacking: true } },
	{ kind: 'formatting', controls: { unit: true, decimals: true } },
	{ kind: 'axes', controls: { minMax: true, logScale: true } },
	{ kind: 'legend', controls: { position: true } },
	{ kind: 'thresholds', controls: { variant: 'label' } },
	{ kind: 'contextLinks' },
];
