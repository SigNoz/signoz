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

// Pure assembly: each kind owns its own PanelDefinition (see
// `kinds/<Kind>/definition.ts`). Registering a new panel = add its folder and a
// single entry below — no other central file needs editing.
export const PANELS: PanelRegistry = {
	[TimeSeries.kind]: TimeSeries,
	[BarChart.kind]: BarChart,
	[Histogram.kind]: Histogram,
	[NumberValue.kind]: NumberValue,
	[PieChart.kind]: PieChart,
	[Table.kind]: Table,
	[List.kind]: List,
};

export function getPanelDefinition(
	kind: PanelKind,
): RenderablePanelDefinition | undefined {
	// Indexing yields this kind's exactly-typed definition (or undefined for an
	// unregistered kind). Widen the per-kind Renderer to the kind-agnostic prop
	// surface: a renderer typed for one kind's interactions can't be statically
	// validated against the union the render boundary calls it with, so this is
	// the single, intentional cast for the whole panel system.
	return PANELS[kind] as RenderablePanelDefinition | undefined;
}
