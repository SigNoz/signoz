import { SectionKind, type SectionConfig } from '../../types/sections';

export const sections: SectionConfig[] = [
	{
		kind: SectionKind.Visualization,
		controls: { switchPanelKind: true, timePreference: true, fillSpans: true },
	},
	{ kind: SectionKind.Formatting, controls: { unit: true, decimals: true } },
	{ kind: SectionKind.Axes, controls: { minMax: true, logScale: true } },
	{ kind: SectionKind.Legend, controls: { position: true, colors: true } },
	{
		kind: SectionKind.ChartAppearance,
		controls: {
			lineStyle: true,
			lineInterpolation: true,
			fillMode: true,
			showPoints: true,
			spanGaps: true,
		},
	},
	{ kind: SectionKind.Thresholds, controls: { variant: 'label' } },
	{ kind: SectionKind.ContextLinks },
];
