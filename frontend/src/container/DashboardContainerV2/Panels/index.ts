import { DataSource } from 'types/common/queryBuilder';
import TimeSeriesRenderer from './TimeSeriesPanel/Renderer';
import { sections as timeSeriesSections } from './TimeSeriesPanel/sections';
import type {
	PanelDefinition,
	PanelKind,
	PanelRegistry,
	SpecForKind,
} from './types';

const TimeSeriesPanelDef: PanelDefinition<
	SpecForKind<'signoz/TimeSeriesPanel'>
> = {
	kind: 'signoz/TimeSeriesPanel',
	displayName: 'Time Series',
	Renderer: TimeSeriesRenderer,
	sections: timeSeriesSections,
	supportedSignals: [DataSource.METRICS, DataSource.LOGS, DataSource.TRACES],
};

export const PANELS: PanelRegistry = {
	'signoz/TimeSeriesPanel': TimeSeriesPanelDef,
};

// Polymorphic lookup helper. ComponentType is contravariant in props, so indexing
// PANELS with a runtime string widens to an unusable intersection of all Renderer
// types. This helper localizes the necessary widening cast — callers receive a
// PanelDefinition<unknown> whose Renderer accepts any spec at the call site.
export function getPanelDefinition(
	kind: string | undefined,
): PanelDefinition<unknown> | undefined {
	if (!kind) {
		return undefined;
	}
	return PANELS[kind as PanelKind] as PanelDefinition<unknown> | undefined;
}
