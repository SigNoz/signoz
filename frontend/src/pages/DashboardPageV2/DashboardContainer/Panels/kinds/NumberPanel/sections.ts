import { SectionKind, type SectionConfig } from '../../types/sections';

export const sections: SectionConfig[] = [
	{
		kind: SectionKind.Visualization,
		controls: { switchPanelKind: true, timePreference: true },
	},
	{ kind: SectionKind.Formatting, controls: { unit: true, decimals: true } },
	{ kind: SectionKind.Thresholds, controls: { variant: 'comparison' } },
	{ kind: SectionKind.ContextLinks },
];
