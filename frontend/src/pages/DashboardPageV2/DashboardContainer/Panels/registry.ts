import { definition as BarChart } from './kinds/BarChartPanel/definition';
import { definition as Histogram } from './kinds/HistogramPanel/definition';
import { definition as NumberValue } from './kinds/NumberPanel/definition';
import { definition as PieChart } from './kinds/PieChartPanel/definition';
import { definition as TimeSeries } from './kinds/TimeSeriesPanel/definition';
import { definition as Table } from './kinds/TablePanel/definition';
import { definition as List } from './kinds/ListPanel/definition';
import type {
	PanelRegistry,
	RenderablePanelDefinition,
} from './types/panelDefinition';
import { PanelKind } from './types/panelKind';

// Each kind owns its PanelDefinition; registering a new panel is one entry here.
export const PANELS: PanelRegistry = {
	[TimeSeries.kind]: TimeSeries,
	[BarChart.kind]: BarChart,
	[Histogram.kind]: Histogram,
	[NumberValue.kind]: NumberValue,
	[PieChart.kind]: PieChart,
	[Table.kind]: Table,
	[List.kind]: List,
};

export function getPanelDefinition(kind: PanelKind): RenderablePanelDefinition {
	// Single intentional cast widening the per-kind Renderer to the kind-agnostic
	// prop surface (a per-kind renderer can't be statically validated against the union).
	return PANELS[kind] as RenderablePanelDefinition;
}
