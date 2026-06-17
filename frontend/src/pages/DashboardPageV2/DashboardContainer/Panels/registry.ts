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
	if (!kind) {
		return undefined;
	}
	// The registry is correlated by kind, so a string lookup yields a union over
	// every kind's exactly-typed definition. The renderer cannot be validated
	// against that union at the JSX boundary, so widen to the kind-agnostic
	// surface here — the single, intentional cast for the whole panel system.
	return PANELS[kind] as unknown as RenderablePanelDefinition | undefined;
}
