import { SectionKind, type SectionConfig } from '../../types/sections';

// No thresholds: colour already means "count". No bucket controls either — the
// bucket axis comes back with the response and the panel never re-bins it.
export const sections: SectionConfig[] = [
	{
		kind: SectionKind.Visualization,
		controls: { switchPanelKind: true, timePreference: true },
	},
	// Formats the bucket bounds; counts are plain integers and take no unit.
	{ kind: SectionKind.Formatting, controls: { unit: true, decimals: true } },
	{ kind: SectionKind.Axes, controls: { yScale: true } },
	// Position only: a group's swatch colour comes off the grid's own ramp.
	{ kind: SectionKind.Legend, controls: { position: true } },
	{ kind: SectionKind.ChartAppearance, controls: { colors: true } },
];
