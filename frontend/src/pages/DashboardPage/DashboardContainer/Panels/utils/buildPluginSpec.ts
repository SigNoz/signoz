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
	type ControlledSectionKind,
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
 * How each section derives its plugin-spec slice on create/switch — the single place a section
 * declares this. Sections absent from `SECTION_SEEDS` seed nothing. Mapped over `SectionKind` so
 * every `seed` receives its own kind's `controls` (atomic kinds get `undefined`), no per-seed cast.
 * A `seed` returns an empty object/array (never `undefined`) when it has nothing to carry;
 * `buildPluginSpec` drops the empties so the omit decision lives in one place.
 */
type SectionSeeds = {
	[K in SectionKind]?: {
		specKey: keyof SeededPluginSpec;
		seed: (
			controls: K extends ControlledSectionKind ? SectionControls[K] : undefined,
			ctx: ResolvedSeedContext,
		) => object;
	};
};

function isEmptySlice(value: object): boolean {
	return Array.isArray(value)
		? value.length === 0
		: Object.keys(value).length === 0;
}

const SECTION_SEEDS: SectionSeeds = {
	[SectionKind.Visualization]: {
		specKey: 'visualization',
		seed: (
			controls,
			{ oldPluginSpec },
		): SectionSpecMap[SectionKind.Visualization] => {
			const old = oldPluginSpec?.visualization;
			return {
				...(controls.timePreference && {
					timePreference:
						old?.timePreference ?? DashboardtypesTimePreferenceDTO.global_time,
				}),
				...(controls.stacking &&
					old?.stackedBarChart !== undefined && {
						stackedBarChart: old.stackedBarChart,
					}),
				...(controls.fillSpans &&
					old?.fillSpans !== undefined && { fillSpans: old.fillSpans }),
			};
		},
	},
	[SectionKind.Axes]: {
		specKey: 'axes',
		seed: (controls, { oldPluginSpec }): SectionSpecMap[SectionKind.Axes] => {
			const old = oldPluginSpec?.axes;
			if (!old) {
				return {};
			}
			return {
				...(controls.minMax &&
					typeof old.softMin === 'number' && { softMin: old.softMin }),
				...(controls.minMax &&
					typeof old.softMax === 'number' && { softMax: old.softMax }),
				...(controls.logScale &&
					old.isLogScale !== undefined && { isLogScale: old.isLogScale }),
			};
		},
	},
	[SectionKind.Legend]: {
		specKey: 'legend',
		seed: (controls, { oldPluginSpec }): SectionSpecMap[SectionKind.Legend] => {
			const old = oldPluginSpec?.legend;
			// customColors is keyed by series label, which the new kind may not reproduce.
			return controls.position
				? { position: old?.position ?? DashboardtypesLegendPositionDTO.bottom }
				: {};
		},
	},
	[SectionKind.ChartAppearance]: {
		specKey: 'chartAppearance',
		seed: (
			controls,
			{ oldPluginSpec },
		): SectionSpecMap[SectionKind.ChartAppearance] => {
			// One guard on the optional old slice, then read fields with carried-or-default values.
			const {
				lineStyle = DashboardtypesLineStyleDTO.solid,
				lineInterpolation = DashboardtypesLineInterpolationDTO.spline,
				fillMode = DashboardtypesFillModeDTO.none,
				showPoints,
				spanGaps,
			} = oldPluginSpec?.chartAppearance ?? {};
			const appearance: SectionSpecMap[SectionKind.ChartAppearance] = {};
			if (controls.lineStyle) {
				appearance.lineStyle = lineStyle;
			}
			if (controls.lineInterpolation) {
				appearance.lineInterpolation = lineInterpolation;
			}
			if (controls.fillMode) {
				appearance.fillMode = fillMode;
			}
			if (controls.showPoints && showPoints !== undefined) {
				appearance.showPoints = showPoints;
			}
			if (controls.spanGaps && spanGaps !== undefined) {
				appearance.spanGaps = spanGaps;
			}
			return appearance;
		},
	},
	[SectionKind.Formatting]: {
		specKey: 'formatting',
		seed: (
			controls,
			{ oldSpec, oldPluginSpec },
		): NonNullable<SeededPluginSpec['formatting']> => {
			const old = oldPluginSpec?.formatting;
			// Carry a field only when the target kind declares it (e.g. Table has no `unit`),
			// else the save API rejects the spec.
			const carried: NonNullable<SeededPluginSpec['formatting']> = {
				...(controls.unit && old?.unit !== undefined && { unit: old.unit }),
				...(controls.decimals &&
					old?.decimalPrecision !== undefined && {
						decimalPrecision: old.decimalPrecision,
					}),
			};
			// A panel-wide unit fans out to every value column when the target keys units
			// per column (→ Table). One-way: `columnUnits` never seed a panel-wide `unit`.
			const unit = old?.unit;
			if (controls.columnUnits && unit) {
				const keys = getTableColumnKeys(oldSpec?.queries ?? []);
				if (keys.length > 0) {
					carried.columnUnits = Object.fromEntries(keys.map((key) => [key, unit]));
				}
			}
			return carried;
		},
	},
	[SectionKind.Columns]: {
		specKey: 'selectFields',
		seed: (_controls, { signal }): SectionSpecMap[SectionKind.Columns] =>
			signal ? defaultColumnsForSignal(signal) : [],
	},
	[SectionKind.Thresholds]: {
		specKey: 'thresholds',
		seed: (controls, { oldSpec, oldPluginSpec }): AnyThreshold[] => {
			const variant = controls.variant ?? ThresholdVariant.LABEL;
			const old = oldPluginSpec?.thresholds;
			if (!old || old.length === 0) {
				return [];
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
			return variant === ThresholdVariant.TABLE
				? mapped.filter((t) => (t as { columnName?: string }).columnName)
				: mapped;
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
		// The lookup can't prove `section.controls` matches `entry`'s key, so `entry.seed`
		// is a union of differently-typed fns; one boundary cast, in place of a per-seed one.
		const seed = entry.seed as (c: unknown, ctx: ResolvedSeedContext) => object;
		const value = seed(controls, resolved);
		if (!isEmptySlice(value)) {
			// specKey ↔ value correlation can't be proven across the lookup; one localized cast.
			(spec as Record<string, unknown>)[entry.specKey] = value;
		}
	});

	return spec;
}
