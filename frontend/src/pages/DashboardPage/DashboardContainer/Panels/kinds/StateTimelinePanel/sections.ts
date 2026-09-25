import { resolveTimeSeriesLegendSeries } from '../../utils/legendSeries';
import {
	SectionKind,
	ThresholdVariant,
	type SectionConfig,
} from '../../types/sections';

// StateTimelinePanelSpec carries only visualization/formatting/legend/thresholds,
// so there are no Axes or ChartAppearance sections. Thresholds use the LABEL
// variant (value + colour + label) and drive segment colouring via band semantics.
export const sections: SectionConfig[] = [
	{
		kind: SectionKind.Visualization,
		controls: { switchPanelKind: true, timePreference: true },
	},
	{ kind: SectionKind.Formatting, controls: { unit: true, decimals: true } },
	{
		kind: SectionKind.Legend,
		controls: { position: true, colors: resolveTimeSeriesLegendSeries },
	},
	{
		kind: SectionKind.Thresholds,
		controls: { variant: ThresholdVariant.LABEL },
	},
	{ kind: SectionKind.ContextLinks },
];
