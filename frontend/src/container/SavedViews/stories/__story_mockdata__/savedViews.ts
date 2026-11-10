/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import type {
	GetSavedView200,
	ListSavedViews200,
	RenderErrorResponseDTO,
	SavedviewtypesSavedViewDTO,
} from 'api/generated/services/sigNoz.schemas';
import {
	SavedviewtypesSchemaVersionDTO,
	SavedviewtypesSourceDTO,
} from 'api/generated/services/sigNoz.schemas';
import { QueryParams } from 'constants/query';
import {
	initialQueriesMap,
	initialQueryMeterWithType,
	PANEL_TYPES,
} from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import { getSavedViewQuery } from 'container/SavedViews/utils/getSavedViewQuery';
import { toSavedViewSpec } from 'container/SavedViews/utils/toSavedViewSpec';
import { createAppContextMock } from 'tests/fixtures/appContextMock';
import type { Query } from 'types/api/queryBuilder/queryBuilderData';
import { USER_ROLES } from 'types/roles';

export const SAVED_VIEW_SOURCES = [
	SavedviewtypesSourceDTO.traces,
	SavedviewtypesSourceDTO.logs,
	SavedviewtypesSourceDTO.metrics,
	SavedviewtypesSourceDTO.meter,
] as const;

export type SavedViewSource = (typeof SAVED_VIEW_SOURCES)[number];

export const OPEN_VIEWS = [
	'none',
	'created-by-me',
	'created-by-others',
	'unsaved-changes',
	'forbidden',
	'failed',
	'not-found',
] as const;

export type OpenView = (typeof OPEN_VIEWS)[number];

export const SAVED_VIEWS_MAX = 8;

/** The user the story app context signs in as, so "Created by me" follows it. */
const STORY_USER_EMAIL = createAppContextMock(USER_ROLES.ADMIN).user.email;

const OTHER_AUTHORS = ['priya@signoz.io', 'marco@signoz.io', 'lena@signoz.io'];

const MY_VIEW_NAMES = [
	'Checkout errors',
	'Slow payment calls',
	'Cart service, production',
	'Auth retries',
	'Inventory sync',
	'Search p99 regressions',
	'Webhook failures',
	'Cold starts after deploy',
];

const OTHER_VIEW_NAMES = [
	'On-call triage',
	'Frontend 5xx',
	'Shipping latency by region',
	'Kafka consumer lag',
	'Staging smoke tests',
	'Recommendation timeouts',
	'Ad service sampling',
	'Email queue backlog',
];

const EXPRESSIONS = [
	"service.name = 'checkout' AND has_error = true",
	"service.name = 'payments'",
	"service.name = 'cart' AND deployment.environment = 'production'",
	"service.name = 'auth'",
	"service.name IN ('inventory', 'catalog')",
	"service.name = 'search'",
	"service.name = 'webhooks' AND has_error = true",
	"deployment.environment = 'production'",
];

const BASE_QUERY: Record<SavedViewSource, Query> = {
	traces: initialQueriesMap.traces,
	logs: initialQueriesMap.logs,
	metrics: initialQueriesMap.metrics,
	meter: initialQueryMeterWithType,
};

const EXPLORER_ROUTE: Record<SavedViewSource, string> = {
	traces: ROUTES.TRACES_EXPLORER,
	logs: ROUTES.LOGS_EXPLORER,
	metrics: ROUTES.METRICS_EXPLORER_EXPLORER,
	meter: ROUTES.METER_EXPLORER,
};

const queryWith = (source: SavedViewSource, expression: string): Query => {
	const base = BASE_QUERY[source];

	return {
		...base,
		builder: {
			...base.builder,
			queryData: [
				{
					...base.builder.queryData[0],
					filter: { expression },
					aggregations: [{ expression: 'count()' }],
				},
			],
		},
	} as Query;
};

type Author = 'mine' | 'others';

const viewId = (
	source: SavedViewSource,
	author: Author,
	index: number,
): string => `storybook-${source}-${author}-${index + 1}`;

/** The view other people made that the per-view read denial applies to. */
export const unreadableViewId = (source: SavedViewSource): string =>
	viewId(source, 'others', 0);

const savedView = (
	source: SavedViewSource,
	author: Author,
	index: number,
): SavedviewtypesSavedViewDTO => {
	const displayName = (author === 'mine' ? MY_VIEW_NAMES : OTHER_VIEW_NAMES)[
		index
	];
	const createdBy =
		author === 'mine'
			? STORY_USER_EMAIL
			: OTHER_AUTHORS[index % OTHER_AUTHORS.length];
	const id = viewId(source, author, index);

	return {
		id,
		name: id,
		source,
		schemaVersion: SavedviewtypesSchemaVersionDTO.v2,
		createdAt: '2026-09-02T08:30:00Z',
		createdBy,
		updatedAt: `2026-10-${String(14 - (index % 10)).padStart(2, '0')}T11:42:00Z`,
		updatedBy: createdBy,
		spec: toSavedViewSpec({
			query: queryWith(
				source,
				EXPRESSIONS[(index + (author === 'mine' ? 0 : 3)) % EXPRESSIONS.length],
			),
			panelType: PANEL_TYPES.LIST,
			displayName,
		}),
	};
};

const savedViews = (
	source: SavedViewSource,
	author: Author,
	count: number,
): SavedviewtypesSavedViewDTO[] =>
	Array.from({ length: Math.min(count, SAVED_VIEWS_MAX) }, (_, index) =>
		savedView(source, author, index),
	);

export const savedViewsListResponse = (
	source: SavedViewSource,
	createdByMe: number,
	createdByOthers: number,
): ListSavedViews200 => ({
	status: 'success',
	data: [
		...savedViews(source, 'mine', createdByMe),
		...savedViews(source, 'others', createdByOthers),
	],
});

/** Every view the workspace has, whatever the list control trims it to. */
export const savedViewById = (
	id: string,
): SavedviewtypesSavedViewDTO | undefined =>
	SAVED_VIEW_SOURCES.flatMap((source) => [
		...savedViews(source, 'mine', SAVED_VIEWS_MAX),
		...savedViews(source, 'others', SAVED_VIEWS_MAX),
	]).find((view) => view.id === id);

/** A view the panel itself created, owned by the story user. */
export const createdSavedView = (
	source: SavedViewSource,
	id: string,
	spec: SavedviewtypesSavedViewDTO['spec'],
): SavedviewtypesSavedViewDTO => ({
	...savedView(source, 'mine', 0),
	id,
	name: id,
	createdAt: '2026-10-16T09:00:00Z',
	updatedAt: '2026-10-16T09:00:00Z',
	spec,
});

const LONG_NAME_SUFFIX = ', every environment and region, last 30 days';

export const withLongName = (
	view: SavedviewtypesSavedViewDTO,
): SavedviewtypesSavedViewDTO => ({
	...view,
	spec: {
		...view.spec,
		displayName: `${view.spec.displayName}${LONG_NAME_SUFFIX}`,
	},
});

export const savedViewResponse = (
	view: SavedviewtypesSavedViewDTO,
): GetSavedView200 => ({ status: 'success', data: view });

export const OPEN_VIEW_ERRORS: Partial<
	Record<OpenView, { status: number; body: RenderErrorResponseDTO }>
> = {
	forbidden: {
		status: 403,
		body: {
			status: 'error',
			error: {
				code: 'forbidden',
				message: 'You do not have access to this saved view',
				errors: [],
				suggestions: [],
				type: 'forbidden',
			},
		},
	},
	failed: {
		status: 500,
		body: {
			status: 'error',
			error: {
				code: 'internal',
				message: 'Failed to load the saved view',
				errors: [],
				suggestions: [],
				type: 'internal',
			},
		},
	},
	'not-found': {
		status: 404,
		body: {
			status: 'error',
			error: {
				code: 'not_found',
				message: 'Saved view not found',
				errors: [],
				suggestions: [],
				type: 'not_found',
			},
		},
	},
};

const openViewId = (source: SavedViewSource, open: OpenView): string | null => {
	if (open === 'none') {
		return null;
	}

	if (open === 'created-by-others' || open === 'forbidden') {
		return viewId(source, 'others', 0);
	}

	if (open === 'not-found') {
		return `storybook-${source}-deleted`;
	}

	return viewId(source, 'mine', 0);
};

/**
 * The explorer url with a view open, its params written the way
 * `redirectWithQueryBuilderData` writes them. `panelTypes` is left out: the
 * query builder seeds its panel type from the raw, JSON-quoted param, which no
 * saved panel type equals, and without it the header compares against `list`.
 */
export const savedViewRoute = (
	source: SavedViewSource,
	open: OpenView,
): string => {
	const params = new URLSearchParams({ relativeTime: '15m' });
	const id = openViewId(source, open);

	if (id) {
		const view = savedViewById(id);
		const query = view
			? getSavedViewQuery(view)
			: queryWith(source, EXPRESSIONS[0]);
		const staged =
			open === 'unsaved-changes'
				? queryWith(source, `${EXPRESSIONS[0]} AND duration_nano > 500000000`)
				: query;

		params.set(
			QueryParams.compositeQuery,
			encodeURIComponent(
				JSON.stringify({ ...staged, id: `storybook-staged-${open}` }),
			),
		);
		params.set(QueryParams.viewKey, JSON.stringify(id));
	}

	return `${EXPLORER_ROUTE[source]}?${params.toString()}`;
};
