import { SectionKind, type SectionConfig } from '../../types/sections';

export const sections: SectionConfig[] = [
	{
		kind: SectionKind.Visualization,
		controls: { switchPanelKind: true, timePreference: true },
	},
	{
		kind: SectionKind.Formatting,
		controls: { decimals: true, columnUnits: true },
	},
	{ kind: SectionKind.ContextLinks },
];
