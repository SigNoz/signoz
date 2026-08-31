/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { rest } from 'msw';
import type { GetDashboardV2200 } from 'api/generated/services/sigNoz.schemas';
import ROUTES from 'constants/routes';

import {
	choiceControl,
	countControl,
	multiChoiceControl,
	toggleControl,
} from '@/storybook/controls/controls';
import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';

import { dashboardResponse } from '../DashboardPageV2/__story_mockdata__/dashboard';
import {
	dashboardIdAt,
	dashboardViewsResponse,
	dashboardsListResponse,
	orgUsersResponse,
	recentDashboardIds,
	ROW_MARKERS,
	savedView,
	seedPinnedDashboards,
	setDashboardPinned,
	STORY_USER_EMAIL,
	type RowMarker,
} from './__story_mockdata__/dashboardsList';
import { useDashboardViewsStore } from './store/useDashboardViewsStore';
import {
	type DashboardDynamicColumns,
	useDashboardsListVisibleColumnsStore,
} from './store/useVisibleColumnsStore';
import { BuiltinViewId } from './types';
import { builtinViewQuery } from './utils/views';

const LIST = 'Dashboards · list';
const VIEWS = 'Dashboards · views';

const VIEWS_OPTIONS = [
	BuiltinViewId.All,
	BuiltinViewId.Mine,
	BuiltinViewId.Pinned,
	BuiltinViewId.Recent,
	BuiltinViewId.Locked,
	'saved',
] as const;

type ViewOption = (typeof VIEWS_OPTIONS)[number];

const DETAIL_COLUMNS = ['updatedAt', 'updatedBy'] as const;

type DetailColumn = (typeof DETAIL_COLUMNS)[number];

const RECENT_COUNT = 4;

const PINNED_COUNT = 3;

/** A dashboard document, for the writes that echo the touched dashboard back. */
const writtenDashboard = (): GetDashboardV2200 =>
	dashboardResponse({
		panels: 0,
		sectioned: false,
		variables: [],
		locked: false,
	});

const ok = { status: 'success', data: null };

/**
 * `formatQueryErrorMessage` strips the `invalid filter query:` prefix and turns
 * the backticks into quotes, so the message carries both to show it doing it.
 */
const INVALID_QUERY_MESSAGE =
	'invalid filter query: unexpected token `enviroment` at position 0, expected one of `name`, `description`, `created_by`, `created_at`, `updated_at`, `locked`';

/**
 * The rail applies a view by writing both `view` and `query`, so a story that
 * opens on one has to seed both or the header shows unsaved changes on mount.
 */
const listRoute = (view: ViewOption): string => {
	const { id, query } =
		view === 'saved'
			? savedView(0)
			: { id: view, query: builtinViewQuery(view, STORY_USER_EMAIL) ?? '' };

	const params = new URLSearchParams({ view: id });

	if (query) {
		params.set('query', query);
	}

	return `${ROUTES.ALL_DASHBOARD}?${params.toString()}`;
};

const visibleColumns = (
	columns: readonly DetailColumn[],
): DashboardDynamicColumns => ({
	createdAt: true,
	createdBy: true,
	updatedAt: columns.includes('updatedAt'),
	updatedBy: columns.includes('updatedBy'),
});

export const dashboardsListMocks = defineStoryMocks({
	controls: {
		dashboards: countControl('Dashboards', {
			group: LIST,
			description:
				'Dashboards the org has. The list pages at 20, so a higher count adds a pager.',
			value: 24,
			max: 45,
		}),
		markers: multiChoiceControl<RowMarker>('Row markers', {
			group: LIST,
			description:
				'Pinned rows float to the top, locked rows carry the padlock, and a legacy row opens the "not available in the new experience" dialog instead of the dashboard.',
			options: ROW_MARKERS,
			value: [...ROW_MARKERS],
		}),
		columns: multiChoiceControl<DetailColumn>('Detail columns', {
			group: LIST,
			description: 'The optional fields on each row’s second line.',
			options: DETAIL_COLUMNS,
			value: [...DETAIL_COLUMNS],
		}),
		invalidQuery: toggleControl('Reject the query', {
			group: LIST,
			description:
				'Answers the list with a 400 and a parse error, which is the Invalid query state: the backend message replaces the generic one and Retry is gone.',
			value: false,
		}),
		view: choiceControl<ViewOption>('Active view', {
			group: VIEWS,
			description:
				'The rail entry the page opens on. Pinned and Recently viewed constrain the fetched rows client-side; the rest apply a query.',
			options: VIEWS_OPTIONS,
			value: BuiltinViewId.All,
		}),
		savedViews: countControl('Saved views', {
			group: VIEWS,
			description: 'Org-shared views listed under the built-in ones.',
			value: 3,
			max: 6,
		}),
	},
	handlers: (values, response) => [
		...(values.invalidQuery
			? [
					rest.get('http://localhost/api/v2/users/me/dashboards', (_req, res, ctx) =>
						res(
							ctx.status(400),
							ctx.json({
								status: 'error',
								error: {
									code: 'invalid_input',
									message: INVALID_QUERY_MESSAGE,
									url: '',
									errors: [],
								},
							}),
						),
					),
				]
			: []),

		rest.get(
			'http://localhost/api/v2/users/me/dashboards',
			response.json((req) =>
				dashboardsListResponse({
					count: values.dashboards,
					offset: Number(req.url.searchParams.get('offset') ?? 0),
					limit: Number(req.url.searchParams.get('limit') ?? 20),
					markers: values.markers,
					query: req.url.searchParams.get('query') ?? '',
				}),
			),
		),

		rest.get(
			'http://localhost/api/v2/dashboard_views',
			response.json(() => dashboardViewsResponse(values.savedViews)),
		),

		rest.get(
			'http://localhost/api/v2/users',
			response.json(() => orgUsersResponse()),
		),

		// The writes the rows and the rail offer. Pinning is the one the page can
		// see the result of, so it is kept where the handler can write it; the rest
		// answer with success and the list re-reads the controls.
		rest.put(
			'http://localhost/api/v2/users/me/dashboards/:id/pins',
			(req, res, ctx) => {
				setDashboardPinned(String(req.params.id), true);

				return res(ctx.status(200), ctx.json(ok));
			},
		),

		rest.delete(
			'http://localhost/api/v2/users/me/dashboards/:id/pins',
			(req, res, ctx) => {
				setDashboardPinned(String(req.params.id), false);

				return res(ctx.status(200), ctx.json(ok));
			},
		),

		rest.post('http://localhost/api/v2/dashboards', (_req, res, ctx) =>
			res(ctx.status(201), ctx.json(writtenDashboard())),
		),

		rest.put('http://localhost/api/v2/dashboards/:id', (_req, res, ctx) =>
			res(ctx.status(200), ctx.json(writtenDashboard())),
		),

		rest.post('http://localhost/api/v2/dashboards/:id/clone', (_req, res, ctx) =>
			res(ctx.status(200), ctx.json(writtenDashboard())),
		),

		rest.post(
			'http://localhost/api/v2/dashboards/:id/migrate',
			(_req, res, ctx) => res(ctx.status(200), ctx.json(writtenDashboard())),
		),

		rest.delete('http://localhost/api/v2/dashboards/:id', (_req, res, ctx) =>
			res(ctx.status(200), ctx.json(ok)),
		),

		rest.put('http://localhost/api/v2/dashboards/:id/lock', (_req, res, ctx) =>
			res(ctx.status(200), ctx.json(ok)),
		),

		rest.delete('http://localhost/api/v2/dashboards/:id/lock', (_req, res, ctx) =>
			res(ctx.status(200), ctx.json(ok)),
		),

		rest.post(
			'http://localhost/api/v2/dashboard_views',
			async (req, res, ctx) => {
				const body = (await req.json()) as { name: string };

				return res(
					ctx.status(201),
					ctx.json({
						status: 'success',
						data: {
							id: 'storybook-view-created',
							orgId: 'storybook-org',
							name: body.name,
							data: { version: 'v1' },
						},
					}),
				);
			},
		),

		rest.put(
			'http://localhost/api/v2/dashboard_views/:id',
			async (req, res, ctx) => {
				const body = (await req.json()) as { name: string; data: unknown };

				return res(
					ctx.status(200),
					ctx.json({
						status: 'success',
						data: {
							id: String(req.params.id),
							orgId: 'storybook-org',
							name: body.name,
							data: body.data,
						},
					}),
				);
			},
		),

		rest.delete('http://localhost/api/v2/dashboard_views/:id', (_req, res, ctx) =>
			res(ctx.status(200), ctx.json(ok)),
		),
	],
	config: (values) => ({ route: listRoute(values.view) }),
	effect: (values) => {
		seedPinnedDashboards(
			values.markers.includes('pinned')
				? Array.from({ length: PINNED_COUNT }, (_unused, index) =>
						dashboardIdAt(index),
					)
				: [],
		);
		useDashboardViewsStore.setState({
			recent: recentDashboardIds(RECENT_COUNT),
		});
		useDashboardsListVisibleColumnsStore.setState({
			visibleColumns: visibleColumns(values.columns),
		});
	},
});
