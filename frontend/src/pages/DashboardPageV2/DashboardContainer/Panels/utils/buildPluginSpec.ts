import {
	DashboardtypesComparisonOperatorDTO,
	DashboardtypesFillModeDTO,
	DashboardtypesLegendPositionDTO,
	DashboardtypesLineInterpolationDTO,
	DashboardtypesLineStyleDTO,
	type DashboardtypesPanelSpecDTO,
	DashboardtypesThresholdFormatDTO,
	DashboardtypesTimePreferenceDTO,
	type TelemetrytypesSignalDTO,
} from 'api/generated/services/sigNoz.schemas';

import { defaultColumnsForSignal } from '../../PanelEditor/ListColumnsEditor/selectFields';
import {
	type AnyThreshold,
	type PanelFormattingSlice,
	type SectionConfig,
	type SectionControls,
	SectionKind,
	type SectionSpecMap,
	ThresholdVariant,
} from '../types/sections';
import { getTableColumnKeys } from './getTableColumnKeys';

/** Cross-section of the per-kind spec union; assigned to `plugin.spec` (unknown) at the boundary. */
export interface SeededPluginSpec {
	visualization?: SectionSpecMap[SectionKind.Visualization];
	axes?: SectionSpecMap[SectionKind.Axes];
	legend?: SectionSpecMap[SectionKind.Legend];
	chartAppearance?: SectionSpecMap[SectionKind.ChartAppearance];
	formatting?: Pick<
		PanelFormattingSlice,
		'unit' | 'decimalPrecision' | 'columnUnits'
	>;
	selectFields?: SectionSpecMap[SectionKind.Columns];
	thresholds?: AnyThreshold[];
}

export interface SeedContext {
	/** Present only on a kind switch — the spec being switched away from, to carry config across. */
	oldSpec?: DashboardtypesPanelSpecDTO;
	signal?: TelemetrytypesSignalDTO;
}

/** `SeedContext` plus `oldSpec.plugin.spec` (typed `unknown`) resolved once, so seeds read it without re-casting. */
interface ResolvedSeedContext extends SeedContext {
	oldPluginSpec?: SeededPluginSpec;
}

interface AnyThresholdFields {
	color: string;
	value: number;
	unit?: string;
	operator?: DashboardtypesComparisonOperatorDTO;
	format?: DashboardtypesThresholdFormatDTO;
	columnName?: string;
	label?: string;
}

/** Remaps a threshold to the target variant, seeding the fields that variant needs to stay functional. */
function toThresholdVariant(
	source: AnyThresholdFields,
	variant: ThresholdVariant,
	defaultColumnName?: string,
): AnyThreshold {
	const core = {
		color: source.color,
		value: source.value,
		...(source.unit !== undefined && { unit: source.unit }),
	};
	if (variant === ThresholdVariant.COMPARISON) {
		return {
			...core,
			operator: source.operator ?? DashboardtypesComparisonOperatorDTO.above,
			format: source.format ?? DashboardtypesThresholdFormatDTO.text,
		};
	}
	if (variant === ThresholdVariant.TABLE) {
		return {
			...core,
			operator: source.operator ?? DashboardtypesComparisonOperatorDTO.above,
			format: source.format ?? DashboardtypesThresholdFormatDTO.background,
			columnName: source.columnName || defaultColumnName || '',
		};
	}
	return {
		...core,
		...(source.label !== undefined && { label: source.label }),
	};
}

/**
 * How one section derives its plugin-spec slice on create/switch — the single place a section
 * declares this. Sections absent from `SECTION_SEEDS` seed nothing.
 */
interface SectionSeed {
	specKey: keyof SeededPluginSpec;
	seed: (controls: unknown, ctx: ResolvedSeedContext) => unknown;
}

const SECTION_SEEDS: Partial<Record<SectionKind, SectionSeed>> = {
	[SectionKind.Visualization]: {
		specKey: 'visualization',
		seed: (
			controls,
			{ oldPluginSpec },
		): SectionSpecMap[SectionKind.Visualization] | undefined => {
			const c = controls as SectionControls[SectionKind.Visualization];
			const old = oldPluginSpec?.visualization;
			const visualization: SectionSpecMap[SectionKind.Visualization] = {
				...(c.timePreference && {
					timePreference:
						old?.timePreference ?? DashboardtypesTimePreferenceDTO.global_time,
				}),
				...(c.stacking &&
					old?.stackedBarChart !== undefined && {
						stackedBarChart: old.stackedBarChart,
					}),
				...(c.fillSpans &&
					old?.fillSpans !== undefined && { fillSpans: old.fillSpans }),
			};
			return Object.keys(visualization).length > 0 ? visualization : undefined;
		},
	},
	[SectionKind.Axes]: {
		specKey: 'axes',
		seed: (
			controls,
			{ oldPluginSpec },
		): SectionSpecMap[SectionKind.Axes] | undefined => {
			const c = controls as SectionControls[SectionKind.Axes];
			const old = oldPluginSpec?.axes;
			if (!old) {
				return undefined;
			}
			const axes: SectionSpecMap[SectionKind.Axes] = {
				...(c.minMax &&
					typeof old.softMin === 'number' && { softMin: old.softMin }),
				...(c.minMax &&
					typeof old.softMax === 'number' && { softMax: old.softMax }),
				...(c.logScale &&
					old.isLogScale !== undefined && { isLogScale: old.isLogScale }),
			};
			return Object.keys(axes).length > 0 ? axes : undefined;
		},
	},
	[SectionKind.Legend]: {
		specKey: 'legend',
		seed: (
			controls,
			{ oldPluginSpec },
		): SectionSpecMap[SectionKind.Legend] | undefined => {
			const c = controls as SectionControls[SectionKind.Legend];
			const old = oldPluginSpec?.legend;
			// customColors is keyed by series label, which the new kind may not reproduce.
			return c.position
				? { position: old?.position ?? DashboardtypesLegendPositionDTO.bottom }
				: undefined;
		},
	},
	[SectionKind.ChartAppearance]: {
		specKey: 'chartAppearance',
		seed: (
			controls,
			{ oldPluginSpec },
		): SectionSpecMap[SectionKind.ChartAppearance] | undefined => {
			const c = controls as SectionControls[SectionKind.ChartAppearance];
			const old = oldPluginSpec?.chartAppearance;
			const appearance: SectionSpecMap[SectionKind.ChartAppearance] = {};
			if (c.lineStyle) {
				appearance.lineStyle = old?.lineStyle ?? DashboardtypesLineStyleDTO.solid;
			}
			if (c.lineInterpolation) {
				appearance.lineInterpolation =
					old?.lineInterpolation ?? DashboardtypesLineInterpolationDTO.spline;
			}
			if (c.fillMode) {
				appearance.fillMode = old?.fillMode ?? DashboardtypesFillModeDTO.none;
			}
			if (c.showPoints && old?.showPoints !== undefined) {
				appearance.showPoints = old.showPoints;
			}
			if (c.spanGaps && old?.spanGaps !== undefined) {
				appearance.spanGaps = old.spanGaps;
			}
			return Object.keys(appearance).length > 0 ? appearance : undefined;
		},
	},
	[SectionKind.Formatting]: {
		specKey: 'formatting',
		seed: (
			controls,
			{ oldSpec, oldPluginSpec },
		): SeededPluginSpec['formatting'] | undefined => {
			const c = controls as SectionControls[SectionKind.Formatting];
			const old = oldPluginSpec?.formatting;
			// Carry a field only when the target kind declares it (e.g. Table has no `unit`),
			// else the save API rejects the spec.
			const carried: NonNullable<SeededPluginSpec['formatting']> = {
				...(c.unit && old?.unit !== undefined && { unit: old.unit }),
				...(c.decimals &&
					old?.decimalPrecision !== undefined && {
						decimalPrecision: old.decimalPrecision,
					}),
			};
			// A panel-wide unit fans out to every value column when the target keys units
			// per column (→ Table). One-way: `columnUnits` never seed a panel-wide `unit`.
			const unit = old?.unit;
			if (c.columnUnits && unit) {
				const keys = getTableColumnKeys(oldSpec?.queries ?? []);
				if (keys.length > 0) {
					carried.columnUnits = Object.fromEntries(keys.map((key) => [key, unit]));
				}
			}
			return Object.keys(carried).length > 0 ? carried : undefined;
		},
	},
	[SectionKind.Columns]: {
		specKey: 'selectFields',
		seed: (
			_controls,
			{ signal },
		): SectionSpecMap[SectionKind.Columns] | undefined => {
			if (!signal) {
				return undefined;
			}
			const columns = defaultColumnsForSignal(signal);
			return columns.length > 0 ? columns : undefined;
		},
	},
	[SectionKind.Thresholds]: {
		specKey: 'thresholds',
		seed: (controls, { oldSpec, oldPluginSpec }): AnyThreshold[] | undefined => {
			const c = controls as SectionControls[SectionKind.Thresholds];
			const variant = c.variant ?? ThresholdVariant.LABEL;
			const old = oldPluginSpec?.thresholds;
			if (!old || old.length === 0) {
				return undefined;
			}
			// The save API rejects an empty table-threshold columnName.
			const defaultColumnName =
				variant === ThresholdVariant.TABLE
					? getTableColumnKeys(oldSpec?.queries ?? [])[0]
					: undefined;
			const mapped = old.map((threshold) =>
				toThresholdVariant(
					threshold as AnyThresholdFields,
					variant,
					defaultColumnName,
				),
			);
			const kept =
				variant === ThresholdVariant.TABLE
					? mapped.filter((t) => (t as { columnName?: string }).columnName)
					: mapped;
			return kept.length > 0 ? kept : undefined;
		},
	},
};

/**
 * Builds a kind's plugin spec from its declared `sections`: no context → per-kind defaults
 * (new panel); `{ oldSpec, signal }` → defaults plus the config each target section carries.
 */
export function buildPluginSpec(
	sections: SectionConfig[],
	ctx: SeedContext = {},
): SeededPluginSpec {
	const spec: SeededPluginSpec = {};

	// One localized cast for all seeds: `plugin.spec` is typed `unknown`.
	const resolved: ResolvedSeedContext = {
		...ctx,
		oldPluginSpec: ctx.oldSpec?.plugin.spec as SeededPluginSpec | undefined,
	};

	sections.forEach((section) => {
		const entry = SECTION_SEEDS[section.kind];
		if (!entry) {
			return;
		}
		const controls = 'controls' in section ? section.controls : undefined;
		const value = entry.seed(controls, resolved);
		if (value !== undefined) {
			// specKey ↔ value correlation can't be proven across the lookup; one localized cast.
			(spec as Record<string, unknown>)[entry.specKey] = value;
		}
	});

	return spec;
}
