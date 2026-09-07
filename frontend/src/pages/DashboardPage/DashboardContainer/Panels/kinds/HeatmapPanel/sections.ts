import { SectionKind, type SectionConfig } from '../../types/sections';

// No thresholds: colour already means "count", so a threshold would be a second,
// conflicting encoding on the same channel. No bucket controls either — the bucket
// axis comes back with the response, and the panel never re-bins it.
export const sections: SectionConfig[] = [
	{
		kind: SectionKind.Visualization,
		controls: { switchPanelKind: true, timePreference: true },
	},
	// Formats the bucket bounds — the y axis and the tooltip's bucket ranges. Counts
	// are always plain integers and never take the unit.
	{ kind: SectionKind.Formatting, controls: { unit: true, decimals: true } },
	{ kind: SectionKind.Axes, controls: { yScale: true } },
	// Position only: the legend picks a group, and a group's swatch colour is read
	// off the same ramp as the grid rather than chosen.
	{ kind: SectionKind.Legend, controls: { position: true } },
	{ kind: SectionKind.ChartAppearance, controls: { colors: true } },
	{ kind: SectionKind.ContextLinks },
];
