/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { rest } from 'msw';
import { generatePath } from 'react-router-dom';
import ROUTES from 'constants/routes';
import type { GetPublicDashboard200 } from 'api/generated/services/sigNoz.schemas';
import type { QueryRangeRequestV5 } from 'types/api/v5/queryRange';

import {
	countControl,
	multiChoiceControl,
	toggleControl,
} from '@/storybook/controls/controls';
import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';
import { fieldValuesResponse } from '@/storybook/msw/__story_mockdata__/fields';

import {
	currentDashboardDocument,
	patchDashboardDocument,
	PANEL_IDS,
	seedDashboardDocument,
	STORY_DASHBOARD_ID,
	VARIABLE_KINDS,
	type DashboardArgs,
	type VariableKind,
} from './__story_mockdata__/dashboard';
import {
	emptyPanelResponse,
	NAMESPACE_VALUES,
	panelResponse,
	serviceVariableValues,
} from './__story_mockdata__/panelData';

const LAYOUT = 'Dashboard · layout';
const DATA = 'Dashboard · panels';
const SHARING = 'Dashboard · sharing';

export const dashboardRoute = (): string =>
	generatePath(ROUTES.DASHBOARD, { dashboardId: STORY_DASHBOARD_ID });

const NOT_FOUND = {
	status: 'error',
	error: {
		code: 'not_found',
		message: `dashboard with id ${STORY_DASHBOARD_ID} not found`,
		url: '',
		errors: [],
	},
};

const ok = { status: 'success', data: null };

const publicMeta = (): GetPublicDashboard200 => ({
	status: 'success',
	data: {
		timeRangeEnabled: true,
		defaultTimeRange: '30m',
		publicPath: `/public/dashboard/${STORY_DASHBOARD_ID}`,
	},
});

const NOT_PUBLIC = {
	status: 'error',
	error: {
		code: 'public_dashboard_not_found',
		message: `dashboard with id ${STORY_DASHBOARD_ID} isn't public`,
		url: '',
		errors: [],
	},
};

interface PanelQuerySpec {
	signal?: string;
	aggregations?: { metricName?: string }[];
	groupBy?: { name?: string }[];
}

const readPanelQuery = (
	body: QueryRangeRequestV5,
): { metricName?: string; groupBy?: string } => {
	const spec = body.compositeQuery?.queries?.[0]?.spec as
		| PanelQuerySpec
		| undefined;

	return {
		metricName: spec?.aggregations?.[0]?.metricName,
		groupBy: spec?.groupBy?.[0]?.name,
	};
};

export const dashboardMocks = defineStoryMocks({
	controls: {
		panels: countControl('Panels', {
			group: LAYOUT,
			description:
				'Panels the dashboard holds, taken in layout order. Zero is the blank dashboard a fresh one starts as.',
			value: PANEL_IDS.length,
			max: PANEL_IDS.length,
		}),
		sectioned: toggleControl('Sections', {
			group: LAYOUT,
			description:
				'Titled, collapsible, reorderable sections. Off is the single untitled grid a dashboard without sections renders.',
			value: true,
		}),
		locked: toggleControl('Locked', {
			group: LAYOUT,
			description:
				'A locked dashboard is read-only: the lock indicator shows and the edit affordances go.',
			value: false,
		}),
		variables: multiChoiceControl<VariableKind>('Variables', {
			group: LAYOUT,
			description:
				'The variable bar above the panels, one control per kind: a custom list, a query-backed list, a dynamic attribute and a free-text value.',
			options: VARIABLE_KINDS,
			value: [...VARIABLE_KINDS],
		}),
		variableValues: countControl('Variable options', {
			group: DATA,
			description: 'Values the query-backed `service` variable resolves to.',
			value: 4,
			max: 12,
		}),
		noData: toggleControl('Panels return nothing', {
			group: DATA,
			description:
				'Every panel query answers with an empty result, which is the no-data state each renderer draws on its own.',
			value: false,
		}),
		notFound: toggleControl('Dashboard not found', {
			group: LAYOUT,
			description:
				'Answers the dashboard document with a 404, which is the page-level failure the shell renders around.',
			value: false,
		}),
		published: toggleControl('Published publicly', {
			group: SHARING,
			description:
				'Whether this dashboard has a public link, which is what the header globe reports. Turning it off is the 404 the endpoint answers for a dashboard nobody published.',
			value: true,
		}),
	},
	handlers: (values, response) => {
		const document: DashboardArgs = {
			panels: values.panels,
			sectioned: values.sectioned,
			variables: values.variables,
			locked: values.locked,
		};

		return [
			// The document is what the page renders from, so it answers on its own
			// rather than through the Data control: the panels are what that holds in
			// the loading and failed states, with the dashboard already laid out.
			rest.get('http://localhost/api/v2/dashboards/:id', (_req, res, ctx) =>
				values.notFound
					? res(ctx.status(404), ctx.json(NOT_FOUND))
					: res(ctx.status(200), ctx.json(currentDashboardDocument(document))),
			),

			// Every spec edit travels as a JSON Patch, and its response is what
			// replaces the cache, so the ops are applied to the story's document
			// rather than answered away.
			rest.patch(
				'http://localhost/api/v2/dashboards/:id',
				async (req, res, ctx) => {
					const ops = (await req.json()) as Parameters<
						typeof patchDashboardDocument
					>[1];

					return res(
						ctx.status(200),
						ctx.json(patchDashboardDocument(document, ops)),
					);
				},
			),

			rest.post('http://localhost/api/v2/dashboards/:id/clone', (_req, res, ctx) =>
				res(ctx.status(200), ctx.json(currentDashboardDocument(document))),
			),

			rest.delete('http://localhost/api/v2/dashboards/:id', (_req, res, ctx) =>
				res(ctx.status(200), ctx.json(ok)),
			),

			rest.put('http://localhost/api/v2/dashboards/:id/lock', (_req, res, ctx) =>
				res(ctx.status(200), ctx.json(ok)),
			),

			rest.delete(
				'http://localhost/api/v2/dashboards/:id/lock',
				(_req, res, ctx) => res(ctx.status(200), ctx.json(ok)),
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
						...readPanelQuery(body),
					});
				}),
			),

			rest.post(
				'http://localhost/api/v2/variables/query',
				response.json(() => ({
					status: 'success',
					data: { variableValues: serviceVariableValues(values.variableValues) },
				})),
			),

			rest.get(
				'http://localhost/api/v1/fields/values',
				response.json(() => fieldValuesResponse(NAMESPACE_VALUES)),
			),

			// The header reads the public link on every load, so it answers even while
			// the panels are held in the loading or failed state.
			rest.get('http://localhost/api/v1/dashboards/:id/public', (_req, res, ctx) =>
				values.published
					? res(ctx.status(200), ctx.json(publicMeta()))
					: res(ctx.status(404), ctx.json(NOT_PUBLIC)),
			),

			rest.post(
				'http://localhost/api/v1/dashboards/:id/public',
				(_req, res, ctx) => res(ctx.status(200), ctx.json(publicMeta())),
			),

			rest.put('http://localhost/api/v1/dashboards/:id/public', (_req, res, ctx) =>
				res(ctx.status(200), ctx.json(publicMeta())),
			),

			rest.delete(
				'http://localhost/api/v1/dashboards/:id/public',
				(_req, res, ctx) => res(ctx.status(200), ctx.json(ok)),
			),
		];
	},
	config: () => ({ route: dashboardRoute() }),
	effect: (values) => {
		seedDashboardDocument({
			panels: values.panels,
			sectioned: values.sectioned,
			variables: values.variables,
			locked: values.locked,
		});
	},
});
