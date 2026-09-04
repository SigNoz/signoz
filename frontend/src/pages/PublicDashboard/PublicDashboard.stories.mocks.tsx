/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { rest } from 'msw';
import { generatePath } from 'react-router-dom';
import ROUTES from 'constants/routes';
import {
	publicDashboardResponse,
	publicDashboardWidgetData,
} from 'mocks-server/__mockdata__/publicDashboard';

import {
	choiceControl,
	countControl,
	toggleControl,
} from '@/storybook/controls/controls';
import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';

import {
	dashboardResponse,
	PANEL_IDS,
	panelQueryShape,
	STORY_DASHBOARD_ID,
	type PanelId,
} from '../DashboardPageV2/__story_mockdata__/dashboard';
import {
	emptyPanelResponse,
	panelResponse,
} from '../DashboardPageV2/__story_mockdata__/panelData';
import {
	PUBLIC_SCHEMAS,
	publicDashboardV2Response,
	SCHEMA_MISMATCH_ERROR,
	UNPUBLISHED_ERROR,
	type PublicSchema,
} from './__story_mockdata__/publicDashboard';

const VIEWER = 'Public dashboard · viewer';
const DATA = 'Public dashboard · panels';

export const publicDashboardRoute = (): string =>
	generatePath(ROUTES.PUBLIC_DASHBOARD, { dashboardId: STORY_DASHBOARD_ID });

export const publicDashboardMocks = defineStoryMocks({
	controls: {
		schema: choiceControl<PublicSchema>('Schema', {
			group: VIEWER,
			description:
				'Which viewer answers. The page probes v2 first and falls back to v1 only when the v2 endpoint reports a schema mismatch, so `v1` is a dashboard saved before the Perses spec.',
			options: PUBLIC_SCHEMAS,
			value: 'v2',
		}),
		panels: countControl('Panels', {
			group: VIEWER,
			description: 'Panels the published v2 dashboard carries.',
			value: PANEL_IDS.length,
			max: PANEL_IDS.length,
		}),
		timeRange: toggleControl('Time range enabled', {
			group: VIEWER,
			description:
				'Whether the publisher let viewers change the window. Off hides the time picker and the auto-refresh control.',
			value: true,
		}),
		unpublished: toggleControl('Unpublished', {
			group: VIEWER,
			description:
				'The link no longer resolves, which is the branded "does not exist or has been unpublished" page.',
			value: false,
		}),
		noData: toggleControl('Panels return nothing', {
			group: DATA,
			description: 'Every panel query answers with an empty result.',
			value: false,
		}),
	},
	handlers: (values, response) => [
		// The published document is what the viewer renders from, so it answers on
		// its own rather than through the Data control.
		rest.get(
			'http://localhost/api/v2/public/dashboards/:id',
			(_req, res, ctx) => {
				if (values.unpublished) {
					return res(ctx.status(404), ctx.json(UNPUBLISHED_ERROR));
				}

				if (values.schema === 'v1') {
					return res(ctx.status(400), ctx.json(SCHEMA_MISMATCH_ERROR));
				}

				return res(
					ctx.status(200),
					ctx.json(
						publicDashboardV2Response(
							dashboardResponse({
								panels: values.panels,
								sectioned: true,
								variables: [],
								locked: true,
							}).data,
							values.timeRange,
						),
					),
				);
			},
		),

		rest.get('http://localhost/api/v1/public/dashboards/:id', (_req, res, ctx) =>
			res(ctx.status(200), ctx.json(publicDashboardResponse)),
		),

		rest.get(
			'http://localhost/api/v2/public/dashboards/:id/panels/:key/query_range',
			response.json((req) => {
				if (values.noData) {
					return emptyPanelResponse();
				}

				const key = String(req.params.key) as PanelId;

				return panelResponse({
					...panelQueryShape(key),
					window: {
						start: Number(req.url.searchParams.get('startTime') ?? 0),
						end: Number(req.url.searchParams.get('endTime') ?? 0),
					},
				});
			}),
		),

		rest.get(
			'http://localhost/api/v1/public/dashboards/:id/widgets/:index/query_range',
			response.json(() =>
				values.noData ? emptyPanelResponse() : publicDashboardWidgetData,
			),
		),
	],
	config: () => ({ route: publicDashboardRoute() }),
});
