import { DataSource } from 'types/common/queryBuilder';

import BarPanelRenderer from './BarPanel/Renderer';
import { sections as barSections } from './BarPanel/sections';
import HistogramPanelRenderer from './HistogramPanel/Renderer';
import { sections as histogramSections } from './HistogramPanel/sections';
import TimeSeriesRenderer from './TimeSeriesPanel/Renderer';
import { sections as timeSeriesSections } from './TimeSeriesPanel/sections';
import type {
	PanelDefinition,
	PanelKind,
	PanelRegistry,
	RenderablePanelDefinition,
} from './types';

const TimeSeriesPanelDef: PanelDefinition<'signoz/TimeSeriesPanel'> = {
	kind: 'signoz/TimeSeriesPanel',
	displayName: 'Time Series',
	Renderer: TimeSeriesRenderer,
	sections: timeSeriesSections,
	supportedSignals: [DataSource.METRICS, DataSource.LOGS, DataSource.TRACES],
};

const BarChartPanelDef: PanelDefinition<'signoz/BarChartPanel'> = {
	kind: 'signoz/BarChartPanel',
	displayName: 'Bar Chart',
	Renderer: BarPanelRenderer,
	sections: barSections,
	supportedSignals: [DataSource.METRICS, DataSource.LOGS, DataSource.TRACES],
};

const HistogramPanelDef: PanelDefinition<'signoz/HistogramPanel'> = {
	kind: 'signoz/HistogramPanel',
	displayName: 'Histogram',
	Renderer: HistogramPanelRenderer,
	sections: histogramSections,
	supportedSignals: [DataSource.METRICS, DataSource.LOGS, DataSource.TRACES],
};

export const PANELS: PanelRegistry = {
	'signoz/TimeSeriesPanel': TimeSeriesPanelDef,
	'signoz/BarChartPanel': BarChartPanelDef,
	'signoz/HistogramPanel': HistogramPanelDef,
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
