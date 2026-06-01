import { DataSource } from 'types/common/queryBuilder';

import TimeSeriesRenderer from './TimeSeriesPanel/Renderer';
import { sections as timeSeriesSections } from './TimeSeriesPanel/sections';
import type { PanelDefinition, PanelKind, PanelRegistry } from './types';

const TimeSeriesPanelDef: PanelDefinition = {
	kind: 'signoz/TimeSeriesPanel',
	displayName: 'Time Series',
	Renderer: TimeSeriesRenderer,
	sections: timeSeriesSections,
	supportedSignals: [DataSource.METRICS, DataSource.LOGS, DataSource.TRACES],
};

export const PANELS: PanelRegistry = {
	'signoz/TimeSeriesPanel': TimeSeriesPanelDef,
};

export function getPanelDefinition(
	kind: string | undefined,
): PanelDefinition | undefined {
	if (!kind) {
		return undefined;
	}
	return PANELS[kind as PanelKind];
}
