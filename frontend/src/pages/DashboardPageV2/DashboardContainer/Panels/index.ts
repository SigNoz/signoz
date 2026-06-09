import { definition as barChart } from './kinds/BarChartPanel/definition';
import { definition as histogram } from './kinds/HistogramPanel/definition';
import { definition as pieChart } from './kinds/PieChartPanel/definition';
import { definition as timeSeries } from './kinds/TimeSeriesPanel/definition';
import type {
	PanelRegistry,
	RenderablePanelDefinition,
} from './types/panelDefinition';
import type { PanelKind } from './types/panelKind';

// Pure assembly: each kind owns its own PanelDefinition (see
// `kinds/<Kind>/definition.ts`). Registering a new panel = add its folder and a
// single entry below — no other central file needs editing.
export const PANELS: PanelRegistry = {
	[timeSeries.kind]: timeSeries,
	[barChart.kind]: barChart,
	[histogram.kind]: histogram,
	[pieChart.kind]: pieChart,
};

export function getPanelDefinition(
	kind: string | undefined,
): RenderablePanelDefinition | undefined {
	if (!kind) {
		return undefined;
	}
	// The registry is correlated by kind, so a string lookup yields a union over
	// every kind's exactly-typed definition. The renderer cannot be validated
	// against that union at the JSX boundary, so widen to the kind-agnostic
	// surface here — the single, intentional cast for the whole panel system.
	return PANELS[kind as PanelKind] as unknown as
		| RenderablePanelDefinition
		| undefined;
}
