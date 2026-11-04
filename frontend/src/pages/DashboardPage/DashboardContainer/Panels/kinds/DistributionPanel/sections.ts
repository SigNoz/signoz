import { SectionKind, type SectionConfig } from '../../types/sections';
import { resolveDistributionLegendSeries } from '../../utils/legendSeries';

export const sections: SectionConfig[] = [
	{
		kind: SectionKind.Visualization,
		controls: { switchPanelKind: true, timePreference: true },
	},
	{
		kind: SectionKind.ChartAppearance,
		controls: { stack: true, percentiles: true },
	},
	// Formats the bucket bounds; counts are plain integers and take no unit.
	{ kind: SectionKind.Formatting, controls: { unit: true, decimals: true } },
	{ kind: SectionKind.DistributionAxes },
	{
		kind: SectionKind.Legend,
		controls: { position: true, colors: resolveDistributionLegendSeries },
	},
];
