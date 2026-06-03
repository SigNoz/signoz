import { DataSource } from 'types/common/queryBuilder';

import BarPanelRenderer from './BarPanel/Renderer';
import { sections as barSections } from './BarPanel/sections';
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

const BarChartPanelDef: PanelDefinition = {
	kind: 'signoz/BarChartPanel',
	displayName: 'Bar Chart',
	Renderer: BarPanelRenderer,
	sections: barSections,
	supportedSignals: [DataSource.METRICS, DataSource.LOGS, DataSource.TRACES],
};

export const PANELS: PanelRegistry = {
	'signoz/TimeSeriesPanel': TimeSeriesPanelDef,
	'signoz/BarChartPanel': BarChartPanelDef,
};

export function getPanelDefinition(
	kind: string | undefined,
): PanelDefinition | undefined {
	if (!kind) {
		return undefined;
	}
	return PANELS[kind as PanelKind];
}
