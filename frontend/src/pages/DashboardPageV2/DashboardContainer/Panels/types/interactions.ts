import type { ChartClickData } from 'lib/uPlotV2/plugins/TooltipPlugin/types';

/**
 * Source-tagged click events. The three uPlot panels share `ChartClickEvent`;
 * each non-chart kind carries the context its drill-down needs. The `source`
 * tag lets a kind-agnostic consumer (the render boundary, a shared drill-down
 * handler) discriminate without assuming a chart shape.
 */
export type ChartClickEvent = ChartClickData;
export type TableClickEvent = {
	rowData: Record<string, unknown>;
	columnId?: string;
};
export type ListClickEvent = {
	rowData: Record<string, unknown>;
};
export type PieClickEvent = { label: string; value: number };

/** Union of every panel click event — switched on by `source` at the boundary. */
export type PanelClickEvent =
	| ChartClickEvent
	| TableClickEvent
	| ListClickEvent
	| PieClickEvent;

type DragSelect = (start: number, end: number) => void;

/**
 * Per-kind interaction props. Each panel kind exposes ONLY the gestures it
 * supports: chart panels get a chart-shaped `onClick`, time-axis charts add
 * `onDragSelect`, histograms have no drag-to-zoom, a NumberPanel has no
 * interactions at all. Keys mirror `PanelKind`; `PanelRendererProps<K>` in
 * rendererProps.ts indexes this map, so a missing kind is a compile error there.
 */
export interface PanelInteractionMap {
	'signoz/TimeSeriesPanel': {
		onClick?: (event: ChartClickEvent) => void;
		onDragSelect?: DragSelect;
	};
	'signoz/BarChartPanel': {
		onClick?: (event: ChartClickEvent) => void;
		onDragSelect?: DragSelect;
	};
	'signoz/HistogramPanel': { onClick?: (event: ChartClickEvent) => void };
	'signoz/TablePanel': { onClick?: (event: TableClickEvent) => void };
	'signoz/ListPanel': { onClick?: (event: ListClickEvent) => void };
	'signoz/PieChartPanel': { onClick?: (event: PieClickEvent) => void };
	'signoz/NumberPanel': Record<string, never>;
}

/**
 * Widest interaction surface — used where the panel kind is not known
 * statically (the registry render boundary; see `getPanelDefinition`). It is
 * the structural supertype the per-kind shapes are cast to exactly once.
 */
export interface AnyPanelInteractionProps {
	onClick?: (event: PanelClickEvent) => void;
	onDragSelect?: DragSelect;
}
