import type { SectionConfig } from '../../types/sections';

// Bar stacking lives in `visualization.stackedBarChart`, so it's a `visualization`
// control, not `chartAppearance`. fillSpans is TimeSeries-only, so Bar omits it (V1 parity).
export const sections: SectionConfig[] = [
	{ kind: 'visualization', controls: { timePreference: true, stacking: true } },
	{ kind: 'formatting', controls: { unit: true, decimals: true } },
	{ kind: 'axes', controls: { minMax: true, logScale: true } },
	{ kind: 'legend', controls: { position: true } },
	{ kind: 'thresholds', controls: { variant: 'label' } },
	{ kind: 'contextLinks' },
];
