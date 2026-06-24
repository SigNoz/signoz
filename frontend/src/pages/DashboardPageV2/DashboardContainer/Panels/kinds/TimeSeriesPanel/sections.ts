import type { SectionConfig } from '../../types/sections';

export const sections: SectionConfig[] = [
	{ kind: 'visualization', controls: { timePreference: true, fillSpans: true } },
	{ kind: 'formatting', controls: { unit: true, decimals: true } },
	{ kind: 'axes', controls: { minMax: true, logScale: true } },
	{ kind: 'legend', controls: { position: true, colors: true } },
	{
		kind: 'chartAppearance',
		controls: {
			lineStyle: true,
			lineInterpolation: true,
			fillMode: true,
			showPoints: true,
			spanGaps: true,
		},
	},
	{ kind: 'thresholds', controls: { variant: 'label' } },
	{ kind: 'contextLinks' },
];
