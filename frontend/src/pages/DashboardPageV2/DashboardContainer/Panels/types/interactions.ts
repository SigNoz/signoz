import type { PanelKind } from './panelKind';
import type { DrilldownClickPayload } from './drilldown';

type DragSelect = (start: number, end: number) => void;

/** Close the standalone View modal — fired by the chart's graph-manager Save/Cancel. */
type CloseStandaloneView = () => void;

/**
 * Per-kind interaction props — each kind exposes only the gestures it supports.
 * Keyed by `PanelKind`; `PanelRendererProps<K>` indexes this, so a missing kind
 * is a compile error there.
 *
 * Every interactive kind's `onClick` receives the unified `DrilldownClickPayload`
 * its renderer enriches from the native click. Number/Value drills down on its
 * single value. Histogram and List are omitted (V1 has no drill-down for either):
 * they inherit the empty `object` base, so their renderers get only base props
 * with no click gesture.
 */
export type PanelInteractionMap = Record<PanelKind, object> & {
	'signoz/TimeSeriesPanel': {
		onClick?: (event: DrilldownClickPayload) => void;
		onDragSelect?: DragSelect;
		onCloseStandaloneView?: CloseStandaloneView;
	};
	'signoz/BarChartPanel': {
		onClick?: (event: DrilldownClickPayload) => void;
		onDragSelect?: DragSelect;
		onCloseStandaloneView?: CloseStandaloneView;
	};
	'signoz/TablePanel': { onClick?: (event: DrilldownClickPayload) => void };
	'signoz/PieChartPanel': { onClick?: (event: DrilldownClickPayload) => void };
	'signoz/NumberPanel': { onClick?: (event: DrilldownClickPayload) => void };
};

/**
 * Widest interaction surface — used where the kind isn't known statically (the
 * registry render boundary). The supertype the per-kind shapes are cast to once.
 */
export interface AnyPanelInteractionProps {
	onClick?: (event: DrilldownClickPayload) => void;
	onDragSelect?: DragSelect;
	onCloseStandaloneView?: CloseStandaloneView;
}
