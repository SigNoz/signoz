import {
	DashboardtypesFillModeDTO,
	DashboardtypesLegendPositionDTO,
	DashboardtypesLineInterpolationDTO,
	DashboardtypesLineStyleDTO,
	DashboardtypesTimePreferenceDTO,
} from 'api/generated/services/sigNoz.schemas';

import type { SectionConfig, SectionSpecMap } from '../types/sections';

/**
 * The plugin-spec slices a freshly-created panel is seeded with. Keyed by the real
 * plugin-spec keys (which, for these three sections, match the section kind) and
 * typed as the canonical section slice types, so every seeded value is checked
 * against its actual DTO. It's a partial cross-section of slices, not any single
 * kind's spec, so the union-member cast stays localized to `createDefaultPanel`.
 */
export interface DefaultPluginSpec {
	visualization?: SectionSpecMap['visualization'];
	legend?: SectionSpecMap['legend'];
	chartAppearance?: SectionSpecMap['chartAppearance'];
}

/**
 * Builds the `plugin.spec` a freshly-created panel of a kind starts with, seeding
 * sensible defaults for the controls that would otherwise render with nothing
 * selected — the dropdowns and segmented toggles (panel time scope, legend
 * position, line style / interpolation, fill mode).
 *
 * Derived from the kind's declared `sections`, so each kind gets defaults only for
 * the controls it actually exposes (e.g. Histogram has no `visualization` section,
 * so it gets no time-preference default). Every value equals the matching renderer
 * fallback (see `chartAppearance/resolvers` + each kind's `buildConfig`), so seeding
 * changes the config pane's *display*, not the rendered output.
 *
 * Controls that already read as a clear default are intentionally left unset:
 * switches show "off", numeric inputs show an "Auto" placeholder, and unit /
 * decimals keep their "none/auto" placeholder — for those, the empty state *is* the
 * chart default, so seeding a value would force a unit/precision the chart never had.
 */
export function buildDefaultPluginSpec(
	sections: SectionConfig[],
): DefaultPluginSpec {
	const spec: DefaultPluginSpec = {};

	sections.forEach((section) => {
		switch (section.kind) {
			case 'visualization':
				if (section.controls.timePreference) {
					spec.visualization = {
						timePreference: DashboardtypesTimePreferenceDTO.global_time,
					};
				}
				break;
			case 'legend':
				if (section.controls.position) {
					spec.legend = { position: DashboardtypesLegendPositionDTO.bottom };
				}
				break;
			case 'chartAppearance': {
				const chartAppearance: SectionSpecMap['chartAppearance'] = {};
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
