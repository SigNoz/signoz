/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { rest } from 'msw';
import { generatePath } from 'react-router-dom';
import { QueryParams } from 'constants/query';
import ROUTES from 'constants/routes';
import type { QueryRangeRequestV5 } from 'types/api/v5/queryRange';

import { choiceControl, toggleControl } from '@/storybook/controls/controls';
import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';
import {
	fieldKeysResponse,
	fieldValuesResponse,
} from '@/storybook/msw/__story_mockdata__/fields';
import {
	listMetricsResponse,
	metricMetadataResponse,
} from '@/storybook/msw/__story_mockdata__/metrics';

import {
	emptyPanelResponse,
	panelResponse,
} from '../DashboardPageV2/__story_mockdata__/panelData';
import {
	EDITOR_FIELD_KEYS,
	EDITOR_FIELD_VALUES,
	EDITOR_METRICS,
} from '../DashboardPageV2/PanelEditorPage/__story_mockdata__/panelEditor';
import {
	dashboardV1Response,
	exportedQuery,
	NEW_WIDGET_ID,
	SAVED_WIDGET_ID,
	STORY_DASHBOARD_ID,
	WIDGET_PANEL_TYPES,
	type WidgetPanelType,
} from './__story_mockdata__/dashboardWidget';

const WIDGET = 'Widget editor · widget';
const DATA = 'Widget editor · data';

const WIDGET_SOURCES = ['export', 'saved'] as const;

type WidgetSource = (typeof WIDGET_SOURCES)[number];

/**
 * The route the explorers' "Add to dashboard" builds: the `new` path segment is
 * the editor, and the widget id, panel type and exported query all ride the
 * query string.
 */
const widgetRoute = (
	source: WidgetSource,
	panelType: WidgetPanelType,
): string => {
	const path = generatePath(ROUTES.DASHBOARD_WIDGET, {
		dashboardId: STORY_DASHBOARD_ID,
		widgetId: 'new',
	});

	const params = new URLSearchParams({
		[QueryParams.graphType]: panelType,
		[QueryParams.widgetId]: source === 'export' ? NEW_WIDGET_ID : SAVED_WIDGET_ID,
	});

	if (source === 'export') {
		params.set(
			QueryParams.compositeQuery,
			encodeURIComponent(JSON.stringify(exportedQuery(panelType))),
		);
	}

	return `${path}?${params.toString()}`;
};

export const dashboardWidgetMocks = defineStoryMocks({
	controls: {
		source: choiceControl<WidgetSource>('Widget', {
			group: WIDGET,
			description:
				'`export` is the explorer handing a query over to a brand-new widget; `saved` opens the editor on a widget the dashboard already holds.',
			options: WIDGET_SOURCES,
			value: 'export',
		}),
		panelType: choiceControl<WidgetPanelType>('Panel type', {
			group: WIDGET,
			description: 'The panel type the route opens on.',
			options: WIDGET_PANEL_TYPES,
			value: 'graph',
		}),
		noData: toggleControl('Preview returns nothing', {
			group: DATA,
			description: 'The preview query answers with an empty result.',
			value: false,
		}),
	},
	handlers: (values, response) => [
		// The editor cannot render without the dashboard it saves into, so it
		// answers on its own rather than through the Data control.
		rest.get('http://localhost/api/v1/dashboards/:id', (_req, res, ctx) =>
			res(ctx.status(200), ctx.json(dashboardV1Response(values.panelType))),
		),

		// Saving the widget writes the whole v1 dashboard back; the editor navigates
		// away on success, which the story reports as a blocked navigation.
		rest.put('http://localhost/api/v1/dashboards/:id', (_req, res, ctx) =>
			res(ctx.status(200), ctx.json(dashboardV1Response(values.panelType))),
		),

		rest.post(
			'http://localhost/api/v5/query_range',
			response.json(async (req) => {
				if (values.noData) {
					return emptyPanelResponse();
				}

				const body = (await req.json()) as QueryRangeRequestV5;

				return panelResponse({
					requestType: body.requestType,
					window: { start: body.start, end: body.end },
				});
			}),
		),

		rest.get(
			'http://localhost/api/v2/metrics',
			response.json((req) =>
				listMetricsResponse(
					EDITOR_METRICS,
					req.url.searchParams.get('searchText') ?? '',
				),
			),
		),

		rest.get(
			'http://localhost/api/v2/metrics/metadata',
			response.json((req) =>
				metricMetadataResponse(
					EDITOR_METRICS,
					req.url.searchParams.get('metricName') ?? '',
				),
			),
		),

		rest.get(
			'http://localhost/api/v1/fields/keys',
			response.json(() => fieldKeysResponse(EDITOR_FIELD_KEYS)),
		),

		rest.get(
			'http://localhost/api/v1/fields/values',
			response.json((req) =>
				fieldValuesResponse(
					EDITOR_FIELD_VALUES[req.url.searchParams.get('name') ?? ''] ?? [],
				),
			),
		),
	],
	config: (values) => ({ route: widgetRoute(values.source, values.panelType) }),
});
