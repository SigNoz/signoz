import {
	DashboardtypesFillModeDTO,
	DashboardtypesLegendPositionDTO,
	DashboardtypesLineInterpolationDTO,
	DashboardtypesLineStyleDTO,
	DashboardtypesTimePreferenceDTO,
} from 'api/generated/services/sigNoz.schemas';

import {
	SectionKind,
	type SectionConfig,
	type SectionSpecMap,
} from '../types/sections';

/**
 * Seeded plugin-spec slices, typed as canonical section slices so each value is
 * checked against its DTO. A partial cross-section, not any single kind's spec,
 * so the union cast stays localized to `createDefaultPanel`.
 */
export interface DefaultPluginSpec {
	visualization?: SectionSpecMap[SectionKind.Visualization];
	legend?: SectionSpecMap[SectionKind.Legend];
	chartAppearance?: SectionSpecMap[SectionKind.ChartAppearance];
}

/**
 * Seeds per-kind config defaults derived from the kind's declared `sections` so the
 * config pane opens populated. Values equal the renderer fallbacks (display only).
 * Controls whose empty state already IS the default are left unset.
 */
export function buildDefaultPluginSpec(
	sections: SectionConfig[],
): DefaultPluginSpec {
	const spec: DefaultPluginSpec = {};

	sections.forEach((section) => {
		switch (section.kind) {
			case SectionKind.Visualization:
				if (section.controls.timePreference) {
					spec.visualization = {
						timePreference: DashboardtypesTimePreferenceDTO.global_time,
					};
				}
				break;
			case SectionKind.Legend:
				if (section.controls.position) {
					spec.legend = { position: DashboardtypesLegendPositionDTO.bottom };
				}
				break;
			case SectionKind.ChartAppearance: {
				const chartAppearance: SectionSpecMap[SectionKind.ChartAppearance] = {};
				if (section.controls.lineStyle) {
					chartAppearance.lineStyle = DashboardtypesLineStyleDTO.solid;
				}
				if (section.controls.lineInterpolation) {
					chartAppearance.lineInterpolation =
						DashboardtypesLineInterpolationDTO.spline;
				}
				if (section.controls.fillMode) {
					chartAppearance.fillMode = DashboardtypesFillModeDTO.none;
				}
				if (Object.keys(chartAppearance).length > 0) {
					spec.chartAppearance = chartAppearance;
				}
				break;
			}
			default:
				break;
		}
	});

	return spec;
}
