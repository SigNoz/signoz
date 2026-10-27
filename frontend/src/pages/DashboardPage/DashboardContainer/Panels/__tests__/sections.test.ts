import { PANELS } from '../registry';
import type { PanelKind } from '../types/panelKind';
import { SectionKind } from '../types/sections';

const {
	Visualization,
	Formatting,
	Axes,
	Legend,
	ChartAppearance,
	Buckets,
	Thresholds,
	ContextLinks,
	TextLayout,
	PanelHeader,
} = SectionKind;

// In declaration order, which is the order the config pane renders them in.
const EXPECTED_SECTIONS: Record<PanelKind, SectionKind[]> = {
	'signoz/TimeSeriesPanel': [
		Visualization,
		Formatting,
		Axes,
		Legend,
		ChartAppearance,
		Thresholds,
		ContextLinks,
	],
	'signoz/BarChartPanel': [
		Visualization,
		Formatting,
		Axes,
		Legend,
		Thresholds,
		ContextLinks,
	],
	'signoz/AreaChartPanel': [
		Visualization,
		Formatting,
		Axes,
		Legend,
		ChartAppearance,
		Thresholds,
		ContextLinks,
	],
	'signoz/NumberPanel': [Visualization, Formatting, Thresholds, ContextLinks],
	'signoz/PieChartPanel': [Visualization, Formatting, Legend, ContextLinks],
	'signoz/TablePanel': [Visualization, Formatting, Thresholds, ContextLinks],
	'signoz/HistogramPanel': [Visualization, Legend, Buckets, ContextLinks],
	'signoz/HeatmapPanel': [
		Visualization,
		ChartAppearance,
		Formatting,
		Axes,
		Legend,
	],
	'signoz/ListPanel': [Visualization],
	'signoz/TextPanel': [Visualization, TextLayout, PanelHeader],
};

describe('panel kind sections', () => {
	it.each(Object.entries(EXPECTED_SECTIONS))(
		'%s declares its config sections',
		(kind, expected) => {
			expect(
				PANELS[kind as PanelKind].sections.map((section) => section.kind),
			).toStrictEqual(expected);
		},
	);
});
