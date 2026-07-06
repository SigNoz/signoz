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

/** Cross-section of the per-kind spec union; assigned to `plugin.spec` (unknown) at the boundary. */
export interface SeededPluginSpec {
	visualization?: SectionSpecMap[SectionKind.Visualization];
	legend?: SectionSpecMap[SectionKind.Legend];
	chartAppearance?: SectionSpecMap[SectionKind.ChartAppearance];
	formatting?: Pick<PanelFormattingSlice, 'unit' | 'decimalPrecision'>;
	selectFields?: SectionSpecMap[SectionKind.Columns];
	thresholds?: AnyThreshold[];
}

export interface SeedContext {
	/** Present only on a kind switch — the spec being switched away from, to carry config across. */
	oldSpec?: DashboardtypesPanelSpecDTO;
	signal?: TelemetrytypesSignalDTO;
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
			columnName: source.columnName ?? '',
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
	seed: (controls: unknown, ctx: SeedContext) => unknown;
}

const SECTION_SEEDS: Partial<Record<SectionKind, SectionSeed>> = {
	[SectionKind.Visualization]: {
		specKey: 'visualization',
		seed: (controls): SectionSpecMap[SectionKind.Visualization] | undefined => {
			const c = controls as SectionControls[SectionKind.Visualization];
			return c.timePreference
				? { timePreference: DashboardtypesTimePreferenceDTO.global_time }
				: undefined;
		},
	},
	[SectionKind.Legend]: {
		specKey: 'legend',
		seed: (controls): SectionSpecMap[SectionKind.Legend] | undefined => {
			const c = controls as SectionControls[SectionKind.Legend];
			return c.position
				? { position: DashboardtypesLegendPositionDTO.bottom }
				: undefined;
		},
	},
	[SectionKind.ChartAppearance]: {
		specKey: 'chartAppearance',
		seed: (controls): SectionSpecMap[SectionKind.ChartAppearance] | undefined => {
			const c = controls as SectionControls[SectionKind.ChartAppearance];
			const appearance: SectionSpecMap[SectionKind.ChartAppearance] = {};
			if (c.lineStyle) {
				appearance.lineStyle = DashboardtypesLineStyleDTO.solid;
			}
			if (c.lineInterpolation) {
				appearance.lineInterpolation = DashboardtypesLineInterpolationDTO.spline;
			}
			if (c.fillMode) {
				appearance.fillMode = DashboardtypesFillModeDTO.none;
			}
			return Object.keys(appearance).length > 0 ? appearance : undefined;
		},
	},
	[SectionKind.Formatting]: {
		specKey: 'formatting',
		seed: (
			controls,
			{ oldSpec },
		): Pick<PanelFormattingSlice, 'unit' | 'decimalPrecision'> | undefined => {
			const c = controls as SectionControls[SectionKind.Formatting];
			const old = (oldSpec?.plugin.spec as { formatting?: PanelFormattingSlice })
				?.formatting;
			// Carry a field only when the target kind declares it (e.g. Table has no `unit`),
			// else the save API rejects the spec.
			const carried: Pick<PanelFormattingSlice, 'unit' | 'decimalPrecision'> = {
				...(c.unit && old?.unit !== undefined && { unit: old.unit }),
				...(c.decimals &&
					old?.decimalPrecision !== undefined && {
						decimalPrecision: old.decimalPrecision,
					}),
			};
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
		seed: (controls, { oldSpec }): AnyThreshold[] | undefined => {
			const c = controls as SectionControls[SectionKind.Thresholds];
			const variant = c.variant ?? ThresholdVariant.LABEL;
			const old = (oldSpec?.plugin.spec as { thresholds?: AnyThreshold[] | null })
				?.thresholds;
			if (!old || old.length === 0) {
				return undefined;
			}
			return old.map((threshold) =>
				toThresholdVariant(threshold as AnyThresholdFields, variant),
			);
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

	sections.forEach((section) => {
		const entry = SECTION_SEEDS[section.kind];
		if (!entry) {
			return;
		}
		const controls = 'controls' in section ? section.controls : undefined;
		const value = entry.seed(controls, ctx);
		if (value !== undefined) {
			// specKey ↔ value correlation can't be proven across the lookup; one localized cast.
			(spec as Record<string, unknown>)[entry.specKey] = value;
		}
	});

	return spec;
}
