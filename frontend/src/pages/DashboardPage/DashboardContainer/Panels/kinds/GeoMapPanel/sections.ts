import {
	SectionKind,
	ThresholdVariant,
	type SectionConfig,
} from '../../types/sections';

export const sections: SectionConfig[] = [
	{
		kind: SectionKind.Visualization,
		controls: { switchPanelKind: true, timePreference: true },
	},
	{ kind: SectionKind.Location },
	{
		kind: SectionKind.ChartAppearance,
		controls: { mapColors: true, bubbles: true, labels: true },
	},
	{
		kind: SectionKind.Formatting,
		controls: { decimals: true, columnUnits: true },
	},
	{
		kind: SectionKind.Thresholds,
		controls: { variant: ThresholdVariant.COLOR },
	},
	{ kind: SectionKind.ContextLinks },
];
