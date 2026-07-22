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
	{ kind: SectionKind.Formatting, controls: { unit: true, decimals: true } },
	{
		kind: SectionKind.Thresholds,
		controls: { variant: ThresholdVariant.COMPARISON },
	},
	{ kind: SectionKind.ContextLinks },
];
