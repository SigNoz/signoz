/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import {
	rest,
	type ResponseResolver,
	type RestContext,
	type RestRequest,
} from 'msw';
import logEvent from 'api/common/logEvent';
import {
	DashboardtypesListOrderDTO,
	DashboardtypesListSortDTO,
	type GetDashboardV2200,
} from 'api/generated/services/sigNoz.schemas';
import ROUTES from 'constants/routes';
import {
	buildDashboardDeletePermission,
	buildDashboardReadPermission,
	buildDashboardUpdatePermission,
	DashboardCreatePermission,
} from 'lib/authz/hooks/useAuthZ/permissions/dashboard.permissions';
import {
	expect,
	mocked,
	screen,
	userEvent,
	waitFor,
	within,
} from 'storybook/test';
import { LicensePlatform } from 'types/api/licensesV3/getActive';

import { grantsAll } from '@/storybook/access/access';
import {
	choiceControl,
	countControl,
	multiChoiceControl,
	toggleControl,
} from '@/storybook/controls/controls';
import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';
import { appShellMocks } from '@/storybook/globals/appShellMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import {
	orgUsersResponse,
	STORY_USER_EMAIL,
} from './__story_mockdata__/orgUsers';

import { dashboardResponse } from '../../DashboardPage/stories/__story_mockdata__/dashboard';
import {
	dashboardIdAt,
	dashboardViewsResponse,
	dashboardsListResponse,
	PIN_WRITES,
	recentDashboardIds,
	ROW_MARKERS,
	savedView,
	seedPinnedDashboards,
	setDashboardPinned,
	TEMPLATE_REQUESTS,
	TOOLTIP_TAGS,
	WRITE_STATES,
	type PinWrite,
	type RowMarker,
	type TemplateRequest,
	type WriteState,
} from './__story_mockdata__/dashboardsList';
import { useDashboardViewsStore } from '../store/useDashboardViewsStore';
import {
	type DashboardDynamicColumns,
	useDashboardsListVisibleColumnsStore,
} from '../store/useVisibleColumnsStore';
import {
	DEFAULT_DASHBOARD_VIEW,
	type DashboardViewId,
	findBuiltinView,
} from '../list.config';
import { LIST_CHECKS } from '../constants/permissions';
import type { DashboardListItem } from '../utils/helpers';

const LIST = 'Dashboards · list';
const VIEWS = 'Dashboards · views';
const WRITES = 'Dashboards · writes';

const VIEWS_OPTIONS = [
	'all',
	'mine',
	'pinned',
	'recent',
	'locked',
	'saved',
] as const satisfies readonly (DashboardViewId | 'saved')[];

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

const serverError = {
	status: 'error',
	error: {
		code: 'internal',
		message: 'Something went wrong',
		url: '',
		errors: [],
	},
};

const pinLimitError = {
	status: 'error',
	error: {
		code: 'already_exists',
		message: 'Pin limit reached',
		url: '',
		errors: [],
	},
};

/** Answers a write per its control: the `success` resolver, never, or a 500. */
const gated =
	(
		state: WriteState,
		success: ResponseResolver<RestRequest, RestContext>,
	): ResponseResolver<RestRequest, RestContext> =>
	(req, res, ctx) => {
		if (state === 'loading') {
			return res(ctx.delay('infinite'));
		}

		return state === 'error'
			? res(ctx.status(500), ctx.json(serverError))
			: success(req, res, ctx);
	};

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
			: {
					id: view,
					query:
						findBuiltinView(view)?.filter(
							{
								query: '',
								sort: DashboardtypesListSortDTO.updated_at,
								order: DashboardtypesListOrderDTO.desc,
							},
							{ userEmail: STORY_USER_EMAIL, recent: [] },
						).query ?? '',
				};

	const params = new URLSearchParams({ view: id });

	if (query) {
		params.set('query', query);
	}

	return `${ROUTES.ALL_DASHBOARD}?${params.toString()}`;
};

export const longQueryRoute = `${ROUTES.ALL_DASHBOARD}?${new URLSearchParams({
	view: 'all',
	query:
		"name CONTAINS 'Kubernetes' OR name CONTAINS 'Checkout' OR name CONTAINS 'Postgres' OR name CONTAINS 'Kafka' OR name CONTAINS 'Redis' OR name CONTAINS 'Nginx'",
}).toString()}`;

const visibleColumns = (
	columns: readonly DetailColumn[],
): DashboardDynamicColumns => ({
	createdAt: true,
	createdBy: true,
	updatedAt: columns.includes('updatedAt'),
	updatedBy: columns.includes('updatedBy'),
});

/**
 * A row shows the full-name tooltip only past 50 characters of title and the
 * overflow chip only past three tags, and the page's own rows are under both.
 * This answers the list with rows over both instead, which is why the Dashboards
 * and Row markers controls do not reach this story.
 */
export const overflowingRows = rest.get(
	'http://localhost/api/v2/users/me/dashboards',
	(_req, res, ctx) => {
		const list = dashboardsListResponse({
			count: 6,
			offset: 0,
			limit: 20,
			markers: [...ROW_MARKERS],
			query: '',
		});

		return res(
			ctx.status(200),
			ctx.json({
				...list,
				data: {
					...list.data,
					dashboards: list.data.dashboards.map((dashboard) => {
						const name = `${dashboard.name} across every production region, rolled up by service and owner`;

						// The row reads `spec.display.name`, not `name`.
						return {
							...dashboard,
							name,
							spec: { ...dashboard.spec, display: { name } },
							tags: TOOLTIP_TAGS,
						};
					}),
				},
			}),
		);
	},
);

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
		rowWrite: choiceControl<WriteState>('Row action', {
			group: WRITES,
			description:
				'How rename, tags, duplicate, lock and delete answer. `success` raises their toast, `loading` never answers, `error` opens the error modal instead.',
			options: WRITE_STATES,
			value: 'success',
		}),
		pinWrite: choiceControl<PinWrite>('Pin', {
			group: WRITES,
			description:
				'How pinning answers. `limit` refuses the pin with a 409 and raises the 10-pin toast, `error` fails both pin and unpin with a toast.',
			options: PIN_WRITES,
			value: 'success',
		}),
		createWrite: choiceControl<WriteState>('Create dashboard', {
			group: WRITES,
			description:
				'How the POST behind Create and Import answers. `error` raises a failure toast beside the error modal.',
			options: WRITE_STATES,
			value: 'success',
		}),
		migrationWrite: choiceControl<WriteState>('Retry migration', {
			group: WRITES,
			description:
				'How the legacy dashboard migration answers. `success` raises the migrated toast, `error` the failure toast.',
			options: WRITE_STATES,
			value: 'success',
		}),
		viewWrite: choiceControl<WriteState>('Saved view writes', {
			group: WRITES,
			description:
				'How saving, renaming and deleting a saved view answer. `error` raises the failure toast.',
			options: WRITE_STATES,
			value: 'success',
		}),
		templateRequest: choiceControl<TemplateRequest>('Template request', {
			group: WRITES,
			description:
				'How the analytics event behind "Request a new template" answers: `error` returns a failed response, `rejected` throws.',
			options: TEMPLATE_REQUESTS,
			value: 'success',
		}),
		view: choiceControl<ViewOption>('Active view', {
			group: VIEWS,
			description:
				'The rail entry the page opens on. Pinned and Recently viewed constrain the fetched rows client-side; the rest apply a query.',
			options: VIEWS_OPTIONS,
			value: DEFAULT_DASHBOARD_VIEW,
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
				if (values.pinWrite !== 'success') {
					return values.pinWrite === 'limit'
						? res(ctx.status(409), ctx.json(pinLimitError))
						: res(ctx.status(500), ctx.json(serverError));
				}

				setDashboardPinned(String(req.params.id), true);

				return res(ctx.status(200), ctx.json(ok));
			},
		),

		rest.delete(
			'http://localhost/api/v2/users/me/dashboards/:id/pins',
			(req, res, ctx) => {
				if (values.pinWrite === 'error') {
					return res(ctx.status(500), ctx.json(serverError));
				}

				setDashboardPinned(String(req.params.id), false);

				return res(ctx.status(200), ctx.json(ok));
			},
		),

		rest.post(
			'http://localhost/api/v2/dashboards',
			gated(values.createWrite, (_req, res, ctx) =>
				res(ctx.status(201), ctx.json(writtenDashboard())),
			),
		),

		rest.put(
			'http://localhost/api/v2/dashboards/:id',
			gated(values.rowWrite, (_req, res, ctx) =>
				res(ctx.status(200), ctx.json(writtenDashboard())),
			),
		),

		rest.patch(
			'http://localhost/api/v2/dashboards/:id',
			gated(values.rowWrite, (_req, res, ctx) =>
				res(ctx.status(200), ctx.json(writtenDashboard())),
			),
		),

		rest.post(
			'http://localhost/api/v2/dashboards/:id/clone',
			gated(values.rowWrite, (_req, res, ctx) =>
				res(ctx.status(200), ctx.json(writtenDashboard())),
			),
		),

		rest.post(
			'http://localhost/api/v2/dashboards/:id/migrate',
			gated(values.migrationWrite, (_req, res, ctx) =>
				res(ctx.status(200), ctx.json(writtenDashboard())),
			),
		),

		rest.delete(
			'http://localhost/api/v2/dashboards/:id',
			gated(values.rowWrite, (_req, res, ctx) =>
				res(ctx.status(200), ctx.json(ok)),
			),
		),

		rest.put(
			'http://localhost/api/v2/dashboards/:id/lock',
			gated(values.rowWrite, (_req, res, ctx) =>
				res(ctx.status(200), ctx.json(ok)),
			),
		),

		rest.delete(
			'http://localhost/api/v2/dashboards/:id/lock',
			gated(values.rowWrite, (_req, res, ctx) =>
				res(ctx.status(200), ctx.json(ok)),
			),
		),

		rest.post(
			'http://localhost/api/v2/dashboard_views',
			gated(values.viewWrite, async (req, res, ctx) => {
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
			}),
		),

		rest.put(
			'http://localhost/api/v2/dashboard_views/:id',
			gated(values.viewWrite, async (req, res, ctx) => {
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
			}),
		),

		rest.delete(
			'http://localhost/api/v2/dashboard_views/:id',
			gated(values.viewWrite, (_req, res, ctx) =>
				res(ctx.status(200), ctx.json(ok)),
			),
		),
	],
	config: (values) => ({ route: listRoute(values.view) }),
	effect: (values) => {
		mocked(logEvent).mockImplementation(async () => {
			if (values.templateRequest === 'rejected') {
				throw new Error('Event rejected');
			}

			return values.templateRequest === 'error'
				? {
						statusCode: 500,
						payload: null,
						error: 'Event rejected',
						message: null,
					}
				: {
						statusCode: 200,
						error: null,
						message: 'success',
						payload: { status: 'success', data: '' },
					};
		});
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

export type DashboardsListArgs = PageStoryArgs<typeof dashboardsListMocks>;

const PAGE_SIZE = 20;

export const canList = (args: DashboardsListArgs): boolean =>
	grantsAll(args, ...LIST_CHECKS);

/** `AuthZButton` leaves New dashboard enabled when the check itself fails. */
export const canCreate = (args: DashboardsListArgs): boolean =>
	args.authzState === 'error' || grantsAll(args, DashboardCreatePermission);

export const canUpdate = (
	args: DashboardsListArgs,
	row: DashboardListItem,
): boolean =>
	grantsAll(
		args,
		buildDashboardReadPermission(row.id),
		buildDashboardUpdatePermission(row.id),
	);

export const canDuplicate = (
	args: DashboardsListArgs,
	row: DashboardListItem,
): boolean =>
	grantsAll(
		args,
		buildDashboardReadPermission(row.id),
		DashboardCreatePermission,
	);

export const canDelete = (
	args: DashboardsListArgs,
	row: DashboardListItem,
): boolean =>
	!row.locked && grantsAll(args, buildDashboardDeletePermission(row.id));

export const listedDashboards = (
	args: DashboardsListArgs,
): DashboardListItem[] => {
	if (args.dataState !== 'loaded' || args.invalidQuery || !canList(args)) {
		return [];
	}

	const view = findBuiltinView(args.view);
	const rows = dashboardsListResponse({
		count: args.dashboards,
		offset: 0,
		limit: view?.clientFilter ? args.dashboards : PAGE_SIZE,
		markers: args.markers,
		query:
			new URL(listRoute(args.view), 'http://localhost').searchParams.get(
				'query',
			) ?? '',
	}).data.dashboards;

	return view?.clientFilter
		? view.clientFilter(rows, {
				userEmail: STORY_USER_EMAIL,
				recent: recentDashboardIds(RECENT_COUNT),
			})
		: rows;
};

export const showsWorkspaceEmpty = (args: DashboardsListArgs): boolean =>
	args.view === DEFAULT_DASHBOARD_VIEW &&
	args.dataState === 'loaded' &&
	!args.invalidQuery &&
	canList(args) &&
	args.dashboards === 0;

export const isCloudTenant = (args: DashboardsListArgs): boolean =>
	appShellMocks.config?.(appShellMocks.read(args)).appContext?.activeLicense
		?.platform === LicensePlatform.CLOUD;

/** Opens the actions menu of the row at `index`. */
export const openRowActions = async (
	canvasElement: HTMLElement,
	index: number,
): Promise<void> => {
	// The icon-only trigger carries no accessible name.
	const triggers = await within(canvasElement).findAllByTestId(
		'dashboard-action-icon',
		{},
		{ timeout: 10000 },
	);

	await userEvent.click(triggers[index]);
	await screen.findByTestId('dashboard-action-delete');
};

/** Picks a row action, retrying while its permission check still disables it. */
export const pickRowAction = async (label: string | RegExp): Promise<void> => {
	await waitFor(
		async () => {
			await userEvent.click(screen.getByText(label));
			await screen.findByRole('dialog', {}, { timeout: 500 });
		},
		{ timeout: 10000 },
	);
};

/** Picks a row action once its permission check has enabled it. */
export const clickRowAction = async (testId: string): Promise<void> => {
	const item = await screen.findByTestId(testId);

	await waitFor(
		async () => {
			await expect(item).toBeEnabled();
			await expect(item).not.toHaveAttribute('data-disabled');
			await expect(item).not.toHaveAttribute('aria-disabled', 'true');
		},
		{ timeout: 10000 },
	);
	await userEvent.click(item);
};

export const TOAST_TIMEOUT = 10000;

export const openLegacyDialog = async (
	canvasElement: HTMLElement,
	index: number,
): Promise<void> => {
	await userEvent.click(
		await within(canvasElement).findByTestId(
			`dashboard-title-${index}`,
			{},
			{ timeout: TOAST_TIMEOUT },
		),
	);
	await screen.findByTestId('legacy-dashboard-id');
};

export const retryMigration = async (
	canvasElement: HTMLElement,
	index: number,
): Promise<void> => {
	await openLegacyDialog(canvasElement, index);
	const retry = await screen.findByTestId('legacy-dashboard-retry-migration');

	await waitFor(
		async () => {
			await expect(retry).toBeEnabled();
			await expect(retry).not.toHaveAttribute('aria-disabled', 'true');
		},
		{ timeout: TOAST_TIMEOUT },
	);
	await userEvent.click(retry);
};

export const uploadDashboardJson = async (json: object): Promise<void> => {
	await userEvent.click(await screen.findByText('Import JSON'));
	const dialog = await screen.findByRole('dialog');
	const input = dialog.querySelector<HTMLInputElement>('input[type="file"]');

	if (!input) {
		throw new Error('The import dialog has no file input');
	}
	await userEvent.upload(
		input,
		new File([JSON.stringify(json)], 'dashboard.json', {
			type: 'application/json',
		}),
	);
	await userEvent.click(await screen.findByTestId('import-json-submit'));
};

export const requestTemplate = async (
	canvasElement: HTMLElement,
): Promise<void> => {
	await userEvent.click(
		await within(canvasElement).findByTestId(
			'new-dashboard-cta',
			{},
			{ timeout: TOAST_TIMEOUT },
		),
	);
	await userEvent.click(await screen.findByText('From a template'));
	await userEvent.type(
		await screen.findByTestId('request-dashboard-name-field'),
		'Redis overview',
	);
	await userEvent.click(await screen.findByTestId('request-dashboard-submit'));
};
