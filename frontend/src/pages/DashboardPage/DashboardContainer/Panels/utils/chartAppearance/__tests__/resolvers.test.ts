import {
	DashboardtypesHeatmapColorModeDTO,
	DashboardtypesHeatmapColorScaleDTO,
	DashboardtypesHeatmapPaletteDTO,
	DashboardtypesHeatmapYScaleDTO,
} from 'api/generated/services/sigNoz.schemas';
import {
	HeatmapAxisScale,
	HeatmapColorMode,
	HeatmapColorPalette,
	HeatmapColorScale,
} from 'lib/uPlotV2/plugins/HeatmapPlugin/types';

import {
	resolveHeatmapAxisScale,
	resolveHeatmapColors,
	resolveSpanGaps,
} from '../resolvers';

describe('resolveSpanGaps', () => {
	it('parses a duration string into seconds when thresholding', () => {
		expect(resolveSpanGaps({ fillOnlyBelow: true, fillLessThan: '5s' })).toBe(5);
		expect(resolveSpanGaps({ fillOnlyBelow: true, fillLessThan: '10m' })).toBe(
			600,
		);
		expect(resolveSpanGaps({ fillOnlyBelow: true, fillLessThan: '1h' })).toBe(
			3600,
		);
	});

	it('tolerates a bare seconds number (back-compat)', () => {
		expect(resolveSpanGaps({ fillOnlyBelow: true, fillLessThan: '600' })).toBe(
			600,
		);
	});

	it('falls back to true for unparseable input', () => {
		expect(resolveSpanGaps({ fillOnlyBelow: true, fillLessThan: 'abc' })).toBe(
			true,
		);
	});

	it('spans all gaps when fillOnlyBelow is explicitly false, ignoring any duration', () => {
		expect(resolveSpanGaps({ fillOnlyBelow: false, fillLessThan: '5m' })).toBe(
			true,
		);
	});

	it('treats a duration with no fillOnlyBelow flag as a threshold (legacy panels)', () => {
		expect(resolveSpanGaps({ fillLessThan: '5m' })).toBe(300);
	});
});

describe('resolveHeatmapAxisScale', () => {
	it('maps each scale onto its own axis — log and symlog are not the same', () => {
		expect(resolveHeatmapAxisScale(DashboardtypesHeatmapYScaleDTO.auto)).toBe(
			HeatmapAxisScale.Auto,
		);
		expect(resolveHeatmapAxisScale(DashboardtypesHeatmapYScaleDTO.linear)).toBe(
			HeatmapAxisScale.Linear,
		);
		expect(resolveHeatmapAxisScale(DashboardtypesHeatmapYScaleDTO.log)).toBe(
			HeatmapAxisScale.Log,
		);
		expect(resolveHeatmapAxisScale(DashboardtypesHeatmapYScaleDTO.symlog)).toBe(
			HeatmapAxisScale.Symlog,
		);
	});

	it('leaves an unset scale to the bucket bounds', () => {
		expect(resolveHeatmapAxisScale(undefined)).toBe(HeatmapAxisScale.Auto);
	});
});

describe('resolveHeatmapColors', () => {
	it('maps each wire enum onto its chart counterpart', () => {
		expect(
			resolveHeatmapColors({
				mode: DashboardtypesHeatmapColorModeDTO.opacity,
				scale: DashboardtypesHeatmapColorScaleDTO.sqrt,
				palette: DashboardtypesHeatmapPaletteDTO.verdant,
				fill: '#ff0000',
			}),
		).toStrictEqual({
			mode: HeatmapColorMode.Opacity,
			scale: HeatmapColorScale.Sqrt,
			palette: HeatmapColorPalette.Verdant,
			fill: '#ff0000',
		});
	});

	it('omits every unset field, so the chart keeps its own defaults', () => {
		expect(resolveHeatmapColors(undefined)).toStrictEqual({});
		expect(resolveHeatmapColors({})).toStrictEqual({});
	});

	it("keeps a null count bound — the spec's way of asking for a derived one", () => {
		expect(resolveHeatmapColors({ minCount: null, maxCount: 500 })).toStrictEqual(
			{ minCount: null, maxCount: 500 },
		);
	});

	it('clamps a step count the chart could not draw', () => {
		expect(resolveHeatmapColors({ steps: 1 }).steps).toBe(2);
		expect(resolveHeatmapColors({ steps: 500 }).steps).toBe(128);
		expect(resolveHeatmapColors({ steps: 32 }).steps).toBe(32);
	});
});
