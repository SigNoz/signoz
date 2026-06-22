import {
	DashboardtypesFillModeDTO,
	DashboardtypesLegendPositionDTO,
	DashboardtypesLineInterpolationDTO,
	DashboardtypesLineStyleDTO,
	DashboardtypesTimePreferenceDTO,
} from 'api/generated/services/sigNoz.schemas';

import { sections as barSections } from '../../kinds/BarChartPanel/sections';
import { sections as histogramSections } from '../../kinds/HistogramPanel/sections';
import { sections as listSections } from '../../kinds/ListPanel/sections';
import { sections as timeSeriesSections } from '../../kinds/TimeSeriesPanel/sections';
import type { SectionConfig } from '../../types/sections';
import { buildDefaultPluginSpec } from '../buildDefaultPluginSpec';

describe('buildDefaultPluginSpec', () => {
	it('seeds the TimeSeries dropdowns/segmented controls with their renderer defaults', () => {
		expect(buildDefaultPluginSpec(timeSeriesSections)).toStrictEqual({
			visualization: {
				timePreference: DashboardtypesTimePreferenceDTO.global_time,
			},
			legend: { position: DashboardtypesLegendPositionDTO.bottom },
			chartAppearance: {
				lineStyle: DashboardtypesLineStyleDTO.solid,
				lineInterpolation: DashboardtypesLineInterpolationDTO.spline,
				fillMode: DashboardtypesFillModeDTO.none,
			},
		});
	});

	it('omits chartAppearance for a kind that does not declare it (Bar)', () => {
		expect(buildDefaultPluginSpec(barSections)).toStrictEqual({
			visualization: {
				timePreference: DashboardtypesTimePreferenceDTO.global_time,
			},
			legend: { position: DashboardtypesLegendPositionDTO.bottom },
		});
	});

	it('seeds only the legend for Histogram (no visualization section)', () => {
		expect(buildDefaultPluginSpec(histogramSections)).toStrictEqual({
			legend: { position: DashboardtypesLegendPositionDTO.bottom },
		});
	});

	it('returns an empty spec for a kind with no seeded controls (List)', () => {
		expect(buildDefaultPluginSpec(listSections)).toStrictEqual({});
	});

	it('does not seed controls that already show a clear default', () => {
		// `axes` and `formatting` stay unset — their empty state is the chart default.
		const sections: SectionConfig[] = [
			{ kind: 'axes', controls: { minMax: true, logScale: true } },
			{ kind: 'formatting', controls: { unit: true, decimals: true } },
			{ kind: 'thresholds', controls: { variant: 'label' } },
			{ kind: 'contextLinks' },
		];
		expect(buildDefaultPluginSpec(sections)).toStrictEqual({});
	});

	it('only seeds the legend position when the kind exposes that control', () => {
		const sections: SectionConfig[] = [
			{ kind: 'legend', controls: { colors: true } },
		];
		expect(buildDefaultPluginSpec(sections)).toStrictEqual({});
	});
});
