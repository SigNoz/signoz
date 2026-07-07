import {
	SectionKind,
	ThresholdVariant,
	type SectionConfig,
} from '../../types/sections';

// Bar stacking lives in `visualization.stackedBarChart`, so it's a `visualization`
// control, not `chartAppearance`. fillSpans is TimeSeries-only, so Bar omits it (V1 parity).
export const sections: SectionConfig[] = [
	{
		kind: SectionKind.Visualization,
		controls: { switchPanelKind: true, timePreference: true, stacking: true },
	},
	{ kind: SectionKind.Formatting, controls: { unit: true, decimals: true } },
	{ kind: SectionKind.Axes, controls: { minMax: true, logScale: true } },
	{ kind: SectionKind.Legend, controls: { position: true } },
	{
		kind: SectionKind.Thresholds,
		controls: { variant: ThresholdVariant.LABEL },
	},
	{ kind: SectionKind.ContextLinks },
];
