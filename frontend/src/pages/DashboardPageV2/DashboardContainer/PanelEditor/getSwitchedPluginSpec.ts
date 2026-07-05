import type {
	DashboardtypesPanelSpecDTO,
	TelemetrytypesSignalDTO,
} from 'api/generated/services/sigNoz.schemas';
import { getPanelDefinition } from 'pages/DashboardPageV2/DashboardContainer/Panels/registry';
import type { PanelKind } from 'pages/DashboardPageV2/DashboardContainer/Panels/types/panelKind';
import {
	buildPluginSpec,
	type SeededPluginSpec,
} from 'pages/DashboardPageV2/DashboardContainer/Panels/utils/buildPluginSpec';

export type SwitchedPluginSpec = SeededPluginSpec;

/**
 * Plugin spec for a first-visit switch to `newKind`: the kind's defaults plus the cross-kind
 * config each section carries from `oldSpec`. Revisiting a kind restores its stash instead.
 */
export function getSwitchedPluginSpec(
	oldSpec: DashboardtypesPanelSpecDTO,
	newKind: PanelKind,
	signal: TelemetrytypesSignalDTO,
): SwitchedPluginSpec {
	return buildPluginSpec(getPanelDefinition(newKind).sections, {
		oldSpec,
		signal,
	});
}
