/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import type { Dashboard, Widgets } from 'types/api/dashboard/getAll';
import type {
	IBuilderQuery,
	Query,
} from 'types/api/queryBuilder/queryBuilderData';
import type { MetricAggregation } from 'types/api/v5/queryRange';
import {
	DataSource,
	MetricAggregateOperator,
	ReduceOperators,
} from 'types/common/queryBuilder';

export const STORY_DASHBOARD_ID = 'storybook-dashboard-1';

/** The id the explorer export puts in `widgetId`; nothing in the dashboard has it. */
export const NEW_WIDGET_ID = 'storybook-widget-new';

export const SAVED_WIDGET_ID = 'storybook-widget-saved';

/**
 * Panel types the editor's own type switcher offers, as the `graphType` param
 * spells them. Written as the enum's string values so a control option stays a
 * plain string while still coming from the enum.
 */
export type WidgetPanelType = `${
	| PANEL_TYPES.TIME_SERIES
	| PANEL_TYPES.VALUE
	| PANEL_TYPES.TABLE
	| PANEL_TYPES.LIST
	| PANEL_TYPES.BAR
	| PANEL_TYPES.PIE
	| PANEL_TYPES.HISTOGRAM}`;

export const WIDGET_PANEL_TYPES: readonly WidgetPanelType[] = [
	PANEL_TYPES.TIME_SERIES,
	PANEL_TYPES.VALUE,
	PANEL_TYPES.TABLE,
	PANEL_TYPES.LIST,
	PANEL_TYPES.BAR,
	PANEL_TYPES.PIE,
	PANEL_TYPES.HISTOGRAM,
];

const EXPORTED_AGGREGATION: MetricAggregation = {
	metricName: 'signoz_calls_total',
	temporality: '',
	timeAggregation: MetricAggregateOperator.RATE,
	spaceAggregation: MetricAggregateOperator.SUM,
	reduceTo: ReduceOperators.AVG,
};

/**
 * The exported query the explorer hands over in `compositeQuery`, built from the
 * app's own seed so a change to the query-builder shape reaches the story.
 */
export const exportedQuery = (panelType: WidgetPanelType): Query => {
	const seed = initialQueriesMap[DataSource.METRICS];

	return {
		...seed,
		builder: {
			...seed.builder,
			queryData: seed.builder.queryData.map(
				(data): IBuilderQuery => ({
					...data,
					aggregations: [EXPORTED_AGGREGATION],
					legend: panelType === PANEL_TYPES.LIST ? '' : 'requests',
				}),
			),
		},
	};
};

const savedWidget = (panelType: WidgetPanelType): Widgets => ({
	id: SAVED_WIDGET_ID,
	panelTypes: panelType as PANEL_TYPES,
	title: 'Request rate by service',
	description: 'Calls per second, grouped by service.',
	opacity: '1',
	nullZeroValues: 'zero',
	timePreferance: 'GLOBAL_TIME',
	softMin: null,
	softMax: null,
	selectedLogFields: null,
	selectedTracesFields: null,
	query: exportedQuery(panelType),
});

export const dashboardV1Response = (
	panelType: WidgetPanelType,
): { status: string; data: Dashboard } => ({
	status: 'success',
	data: {
		id: STORY_DASHBOARD_ID,
		createdAt: '2026-05-04T09:12:00Z',
		updatedAt: '2026-08-21T16:40:00Z',
		createdBy: 'ada@signoz.io',
		updatedBy: 'ada@signoz.io',
		locked: false,
		data: {
			title: 'Checkout service overview',
			description: 'Traffic, errors and latency for the checkout path.',
			tags: ['env:prod'],
			variables: {},
			widgets: [savedWidget(panelType)],
			layout: [{ i: SAVED_WIDGET_ID, x: 0, y: 0, w: 6, h: 6 }],
			panelMap: {},
			version: 'v4',
		},
	},
});
