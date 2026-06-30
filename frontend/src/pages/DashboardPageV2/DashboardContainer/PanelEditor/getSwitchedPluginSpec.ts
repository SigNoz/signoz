import {
	DashboardtypesComparisonOperatorDTO,
	type DashboardtypesPanelSpecDTO,
	DashboardtypesThresholdFormatDTO,
	type TelemetrytypesSignalDTO,
	type TelemetrytypesTelemetryFieldKeyDTO,
} from 'api/generated/services/sigNoz.schemas';
import { getPanelDefinition } from 'pages/DashboardPageV2/DashboardContainer/Panels/registry';
import type { PanelKind } from 'pages/DashboardPageV2/DashboardContainer/Panels/types/panelKind';
import {
	type AnyThreshold,
	type PanelFormattingSlice,
	type SectionConfig,
	SectionKind,
	type ThresholdVariant,
} from 'pages/DashboardPageV2/DashboardContainer/Panels/types/sections';
import {
	buildDefaultPluginSpec,
	type DefaultPluginSpec,
} from 'pages/DashboardPageV2/DashboardContainer/Panels/utils/buildDefaultPluginSpec';

import { defaultColumnsForSignal } from './ListColumnsEditor/selectFields';

/**
 * Plugin spec produced on a first-time switch to a new kind. A partial cross-section
 * of the per-kind spec union; the caller assigns it to `plugin.spec` (typed `unknown`)
 * at the boundary.
 */
export interface SwitchedPluginSpec extends DefaultPluginSpec {
	formatting?: Pick<PanelFormattingSlice, 'unit' | 'decimalPrecision'>;
	selectFields?: TelemetrytypesTelemetryFieldKeyDTO[];
	thresholds?: AnyThreshold[];
}

/** Every field any threshold variant can hold; switching reads across shapes to remap. */
interface AnyThresholdFields {
	color: string;
	value: number;
	unit?: string;
	operator?: DashboardtypesComparisonOperatorDTO;
	format?: DashboardtypesThresholdFormatDTO;
	columnName?: string;
	label?: string;
}

/** The threshold variant a kind edits, or `undefined` when it has no Thresholds section. */
function getThresholdVariant(
	sections: SectionConfig[],
): ThresholdVariant | undefined {
	const section = sections.find(
		(s): s is Extract<SectionConfig, { kind: SectionKind.Thresholds }> =>
			s.kind === SectionKind.Thresholds,
	);
	return section ? (section.controls.variant ?? 'label') : undefined;
}

/**
 * Remaps a threshold to the target kind's variant: keeps the shared core (color, value,
 * unit) plus any cross-variant fields, and seeds the rest with the variant's defaults so
 * the carried threshold stays functional (a comparison/table threshold needs an operator
 * to match, a table threshold a column).
 */
function toThresholdVariant(
	source: AnyThresholdFields,
	variant: ThresholdVariant,
): AnyThreshold {
	const core = {
		color: source.color,
		value: source.value,
		...(source.unit !== undefined && { unit: source.unit }),
	};
	if (variant === 'comparison') {
		return {
			...core,
			operator: source.operator ?? DashboardtypesComparisonOperatorDTO.above,
			format: source.format ?? DashboardtypesThresholdFormatDTO.text,
		};
	}
	if (variant === 'table') {
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
 * Builds the plugin spec for a first-visit switch to `newKind`: the kind's declared
 * section defaults (so the config pane opens populated, matching new-panel seeding) plus
 * the cross-kind config worth keeping — unit + decimal precision, and thresholds when the
 * new kind supports them (remapped to its variant). Switching into a List seeds the
 * current signal's default columns so the columns control isn't empty.
 *
 * Revisiting a kind restores its stashed spec instead, so this runs only on first visit.
 */
export function getSwitchedPluginSpec(
	oldSpec: DashboardtypesPanelSpecDTO,
	newKind: PanelKind,
	signal: TelemetrytypesSignalDTO,
): SwitchedPluginSpec {
	const sections = getPanelDefinition(newKind).sections;
	const result: SwitchedPluginSpec = buildDefaultPluginSpec(sections);

	if (sections.some((section) => section.kind === SectionKind.Formatting)) {
		const oldFormatting = (
			oldSpec.plugin.spec as {
				formatting?: PanelFormattingSlice;
			}
		).formatting;
		const carried: Pick<PanelFormattingSlice, 'unit' | 'decimalPrecision'> = {
			...(oldFormatting?.unit !== undefined && { unit: oldFormatting.unit }),
			...(oldFormatting?.decimalPrecision !== undefined && {
				decimalPrecision: oldFormatting.decimalPrecision,
			}),
		};
		if (Object.keys(carried).length > 0) {
			result.formatting = carried;
		}
	}

	if (sections.some((section) => section.kind === SectionKind.Columns)) {
		const columns = defaultColumnsForSignal(signal);
		if (columns.length > 0) {
			result.selectFields = columns;
		}
	}

	const thresholdVariant = getThresholdVariant(sections);
	if (thresholdVariant) {
		const oldThresholds = (
			oldSpec.plugin.spec as {
				thresholds?: AnyThreshold[] | null;
			}
		).thresholds;
		if (oldThresholds && oldThresholds.length > 0) {
			result.thresholds = oldThresholds.map((threshold) =>
				toThresholdVariant(threshold as AnyThresholdFields, thresholdVariant),
			);
		}
	}

	return result;
}
