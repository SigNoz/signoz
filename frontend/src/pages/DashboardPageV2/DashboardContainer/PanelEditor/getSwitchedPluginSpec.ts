import type {
	DashboardtypesPanelSpecDTO,
	TelemetrytypesSignalDTO,
	TelemetrytypesTelemetryFieldKeyDTO,
} from 'api/generated/services/sigNoz.schemas';
import { getPanelDefinition } from 'pages/DashboardPageV2/DashboardContainer/Panels/registry';
import type { PanelKind } from 'pages/DashboardPageV2/DashboardContainer/Panels/types/panelKind';
import {
	SectionKind,
	type PanelFormattingSlice,
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
}

/**
 * Builds the plugin spec for a first-visit switch to `newKind`: the kind's declared
 * section defaults (so the config pane opens populated, matching new-panel seeding) plus
 * the only cross-kind config worth keeping — unit + decimal precision. Switching into a
 * List seeds the current signal's default columns so the columns control isn't empty.
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

	return result;
}
