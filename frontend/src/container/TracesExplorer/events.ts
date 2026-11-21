import logEvent from 'api/common/logEvent';
import type { PANEL_TYPES } from 'constants/queryBuilderPanelTypes';

export enum TracesExplorerEvents {
	OpenTraceClicked = 'Traces Explorer: Open trace clicked',
}

export enum OpenTraceSource {
	Row = 'row',
	RowIcon = 'row_icon',
	TraceId = 'trace_id',
	SpanDrawer = 'span_drawer',
}

export function logOpenTraceClicked(
	panelType: PANEL_TYPES,
	source: OpenTraceSource,
): void {
	void logEvent(TracesExplorerEvents.OpenTraceClicked, { panelType, source });
}
