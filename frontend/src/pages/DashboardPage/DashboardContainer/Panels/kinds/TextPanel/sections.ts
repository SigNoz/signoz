import { SectionKind, type SectionConfig } from '../../types/sections';

// No thresholds, legend, axes or formatting: there is no data to threshold, scale
// or format. No context links either — they resolve against query fields at
// click-time, and a text body has neither.
export const sections: SectionConfig[] = [
	{
		kind: SectionKind.Visualization,
		controls: { switchPanelKind: true },
	},
	{ kind: SectionKind.TextLayout },
];
