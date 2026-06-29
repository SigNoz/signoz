import type { ChartClickData } from 'lib/uPlotV2/plugins/TooltipPlugin/types';

import type { PanelKind } from './panelKind';

/** Source-tagged click events; each non-chart kind carries its own drill-down context. */
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
 * Per-kind interaction props — each kind exposes only the gestures it supports.
 * Keyed by `PanelKind`; `PanelRendererProps<K>` indexes this, so a missing kind
 * is a compile error there.
 */
export type PanelInteractionMap = Record<PanelKind, object> & {
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
};

/**
 * Widest interaction surface — used where the kind isn't known statically (the
 * registry render boundary). The supertype the per-kind shapes are cast to once.
 */
export interface AnyPanelInteractionProps {
	onClick?: (event: PanelClickEvent) => void;
	onDragSelect?: DragSelect;
}
