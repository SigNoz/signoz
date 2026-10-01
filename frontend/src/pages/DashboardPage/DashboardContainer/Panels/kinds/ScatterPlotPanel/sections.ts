import { resolveScatterLegendSeries } from '../../utils/legendSeries';
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
	{ kind: SectionKind.Dimensions },
	{ kind: SectionKind.ScatterAxes },
	{ kind: SectionKind.ChartAppearance, controls: { points: true } },
	{
		kind: SectionKind.Formatting,
		controls: { decimals: true, columnUnits: true },
	},
	{
		kind: SectionKind.Legend,
		controls: { position: true, colors: resolveScatterLegendSeries },
	},
	{
		kind: SectionKind.Thresholds,
		controls: { variant: ThresholdVariant.LABEL },
	},
	{ kind: SectionKind.ContextLinks },
];
