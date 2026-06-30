import { SectionKind, type SectionConfig } from '../../types/sections';

// A table panel renders one scalar result (the V5 backend joins every query into a
// single column set). It exposes the per-panel time scope, formatting (decimals +
// per-column units), per-column thresholds, and context links.
export const sections: SectionConfig[] = [
	{
		kind: SectionKind.Visualization,
		controls: { switchPanelKind: true, timePreference: true },
	},
	{
		kind: SectionKind.Formatting,
		controls: { decimals: true, columnUnits: true },
	},
	{ kind: SectionKind.Thresholds, controls: { variant: 'table' } },
	{ kind: SectionKind.ContextLinks },
];
