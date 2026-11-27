/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import {
	type GetFieldsKeys200,
	MetrictypesTemporalityDTO,
	MetrictypesTypeDTO,
	TelemetrytypesFieldContextDTO,
	TelemetrytypesSignalDTO,
} from 'api/generated/services/sigNoz.schemas';

import { fieldKeysResponse } from '@/storybook/msw/__story_mockdata__/fields';

import {
	metricSeed,
	type MetricSeed,
} from '@/storybook/msw/__story_mockdata__/metrics';

import type { PanelKind } from '../../../DashboardContainer/Panels/types/panelKind';

/**
 * The panel kinds the create route can seed, spelled without the `signoz/`
 * prefix: a control value carrying a slash does not survive the story URL.
 */
export const NEW_PANEL_KINDS = [
	'time-series',
	'number',
	'table',
	'bar-chart',
	'area-chart',
	'pie-chart',
	'histogram',
	'heatmap',
	'list',
	'text',
	'scatter-plot',
	'top-list',
	'geo-map',
] as const;

export type NewPanelKind = (typeof NEW_PANEL_KINDS)[number];

const KIND_BY_OPTION: Record<NewPanelKind, PanelKind> = {
	'time-series': 'signoz/TimeSeriesPanel',
	'bar-chart': 'signoz/BarChartPanel',
	'area-chart': 'signoz/AreaChartPanel',
	number: 'signoz/NumberPanel',
	'pie-chart': 'signoz/PieChartPanel',
	table: 'signoz/TablePanel',
	histogram: 'signoz/HistogramPanel',
	heatmap: 'signoz/HeatmapPanel',
	list: 'signoz/ListPanel',
	text: 'signoz/TextPanel',
	'scatter-plot': 'signoz/ScatterPlotPanel',
	'top-list': 'signoz/TopListPanel',
	'geo-map': 'signoz/GeoMapPanel',
};

export const newPanelKindOf = (option: NewPanelKind): PanelKind =>
	KIND_BY_OPTION[option];

/** Attributes the editor's query builder offers while filtering and grouping. */
export const EDITOR_FIELD_KEYS = [
	'service.name',
	'http.route',
	'http.status_code',
	'deployment.environment',
	'k8s.namespace.name',
	'host.name',
] as const;

export const EDITOR_FIELD_VALUES: Record<string, readonly string[]> = {
	'service.name': ['checkout', 'payments', 'inventory', 'notifications'],
	'http.route': ['/v1/checkout', '/v1/cart', '/v1/payment/authorize'],
	'http.status_code': ['200', '404', '500', '503'],
	'deployment.environment': ['production', 'staging', 'development'],
	'k8s.namespace.name': ['checkout-prod', 'payments-prod', 'platform-prod'],
	'host.name': ['ip-10-0-1-14', 'ip-10-0-2-31', 'ip-10-0-3-77'],
};

/** The metrics the editor's aggregation field offers, the panels' own included. */
export const EDITOR_METRICS: MetricSeed[] = [
	metricSeed('signoz_calls_total', 'Total spans received', 'count'),
	metricSeed('signoz_errors_total', 'Spans with an error status', 'count'),
	metricSeed(
		'signoz_latency_bucket',
		'Span duration histogram',
		'ms',
		MetrictypesTypeDTO.histogram,
		MetrictypesTemporalityDTO.delta,
	),
	metricSeed(
		'signoz_apdex',
		'Apdex score per service',
		'',
		MetrictypesTypeDTO.gauge,
		MetrictypesTemporalityDTO.unspecified,
	),
	metricSeed(
		'system_cpu_usage',
		'CPU used per host',
		'percent',
		MetrictypesTypeDTO.gauge,
		MetrictypesTemporalityDTO.unspecified,
	),
	metricSeed(
		'system_memory_usage',
		'Memory used per host',
		'bytes',
		MetrictypesTypeDTO.gauge,
		MetrictypesTemporalityDTO.unspecified,
	),
];

/** The numeric keys a logs or traces heatmap's field picker asks for. */
export const numericFieldKeysResponse = (): GetFieldsKeys200 => {
	const signal = TelemetrytypesSignalDTO.traces;
	const span = fieldKeysResponse(['duration_nano'], {
		signal,
		fieldContext: TelemetrytypesFieldContextDTO.span,
	});
	const attribute = fieldKeysResponse(['retry.count', 'http.response.size'], {
		signal,
		fieldContext: TelemetrytypesFieldContextDTO.attribute,
	});

	return {
		...span,
		data: { ...span.data, keys: { ...span.data.keys, ...attribute.data.keys } },
	};
};
