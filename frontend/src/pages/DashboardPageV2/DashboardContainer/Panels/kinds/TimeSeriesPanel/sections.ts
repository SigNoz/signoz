import type { SectionConfig } from '../../types/sections';

export const sections: SectionConfig[] = [
	{
		kind: 'formatting',
		controls: {
			unit: true,
			decimals: true,
		},
	},
	{ kind: 'axes', controls: { minMax: true, unit: true, logScale: true } },
	{ kind: 'legend', controls: { position: true, mode: true } },
	{ kind: 'thresholds', controls: { list: true } },
	{ kind: 'chartAppearance', controls: { lineStyle: true, fillOpacity: true } },
];
