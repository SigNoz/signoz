import { definition as BarChart } from './kinds/BarChartPanel/definition';
import { definition as Histogram } from './kinds/HistogramPanel/definition';
import { definition as NumberValue } from './kinds/NumberPanel/definition';
import { definition as PieChart } from './kinds/PieChartPanel/definition';
import { definition as TimeSeries } from './kinds/TimeSeriesPanel/definition';
import { definition as Table } from './kinds/TablePanel/definition';
import { definition as List } from './kinds/ListPanel/definition';
import { definition as Text } from './kinds/TextPanel/definition';
import { UNSUPPORTED_PANEL } from './kinds/UnsupportedPanel/definition';
import type {
	PanelDefinition,
	PanelRegistry,
	RenderablePanelDefinition,
} from './types/panelDefinition';
import { PanelKind } from './types/panelKind';

// Each kind owns its PanelDefinition; registering a new panel is one entry here.
// Declaration order is the order kinds are offered in the UI.
export const PANELS: PanelRegistry = {
	[TimeSeries.kind]: TimeSeries,
	[NumberValue.kind]: NumberValue,
	[Table.kind]: Table,
	[BarChart.kind]: BarChart,
	[PieChart.kind]: PieChart,
	[Histogram.kind]: Histogram,
	[List.kind]: List,
	[Text.kind]: Text,
};

export type PanelOption = Pick<
	PanelDefinition,
	'kind' | 'displayName' | 'icon'
>;

// Backs both the new-panel picker and the editor's kind switcher; derived from PANELS
// so a registered kind can't end up unreachable from the UI.
export const PANEL_OPTIONS: PanelOption[] = Object.values(PANELS);

/**
 * Whether this build can render the kind. `PanelKind` spans every kind the API declares,
 * but a dashboard spec written by a newer SigNoz can name one this client has never heard
 * of — so ask before doing work on a panel's behalf, such as fetching its data.
 */
export function isPanelKindSupported(kind: PanelKind): boolean {
	return kind in PANELS;
}

/**
 * The definition for a kind — always one. An unregistered kind resolves to
 * {@link UNSUPPORTED_PANEL}, which declares no capabilities and renders as unsupported, so
 * callers read a definition's fields without first proving it exists.
 */
export function getPanelDefinition(kind: PanelKind): RenderablePanelDefinition {
	// Single intentional cast widening the per-kind Renderer to the kind-agnostic
	// prop surface (a per-kind renderer can't be statically validated against the union).
	return (
		(PANELS[kind] as RenderablePanelDefinition | undefined) ?? UNSUPPORTED_PANEL
	);
}
