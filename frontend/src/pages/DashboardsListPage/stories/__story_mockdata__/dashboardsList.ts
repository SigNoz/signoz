/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import {
	DashboardtypesListOrderDTO,
	DashboardtypesListSortDTO,
	DashboardtypesSourceDTO,
	type DashboardtypesListedDashboardForUserV2DTO,
	type ListDashboardViews200,
	type ListDashboardsForUserV2200,
	type ListUsers200,
	type TagtypesGettableTagDTO,
} from 'api/generated/services/sigNoz.schemas';
import { createAppContextMock } from 'tests/fixtures/appContextMock';
import { USER_ROLES } from 'types/roles';

/**
 * "My dashboards" matches on the signed-in address, so the rows have to be
 * created by the same user the providers mount.
 */
export const STORY_USER_EMAIL = createAppContextMock(USER_ROLES.ADMIN).user
	.email;

const TEAMMATE_EMAILS = [
	'ada@signoz.io',
	'grace@signoz.io',
	'linus@signoz.io',
] as const;

const HOUR = 60 * 60 * 1000;

const ago = (hours: number): string =>
	new Date(Date.now() - hours * HOUR).toISOString();

const tag = (key: string, value: string): TagtypesGettableTagDTO => ({
	key,
	value,
});

interface DashboardSeed {
	name: string;
	icon: string;
	tags: TagtypesGettableTagDTO[];
	locked?: boolean;
}

const SEEDS: DashboardSeed[] = [
	{
		name: 'Kubernetes cluster health',
		icon: 'circus-tent',
		tags: [tag('env', 'prod'), tag('team', 'platform')],
		locked: true,
	},
	{
		name: 'API latency and errors',
		icon: 'siren',
		tags: [tag('env', 'prod'), tag('team', 'api')],
	},
	{
		name: 'Checkout funnel',
		icon: 'bagel',
		tags: [tag('team', 'growth')],
	},
	{
		name: 'Postgres connections',
		icon: 'cheese',
		tags: [tag('env', 'prod'), tag('component', 'database')],
	},
	{
		name: 'Kafka consumer lag',
		icon: 'drum',
		tags: [tag('team', 'platform'), tag('component', 'kafka')],
	},
	{
		name: 'Nginx ingress overview',
		icon: 'crane',
		tags: [tag('env', 'staging')],
	},
	{
		name: 'Billing jobs',
		icon: 'dartboard',
		tags: [tag('team', 'billing')],
		locked: true,
	},
	{
		name: 'Frontend web vitals',
		icon: 'basketball',
		tags: [tag('team', 'frontend')],
	},
	{
		name: 'Redis cache hit ratio',
		icon: 'cookie',
		tags: [tag('component', 'redis')],
	},
	{
		name: 'Collector pipeline throughput',
		icon: 'motorcycle',
		tags: [tag('env', 'prod'), tag('component', 'otel')],
	},
	{
		name: 'On-call triage board',
		icon: 'police-car',
		tags: [tag('team', 'sre')],
	},
	{
		name: 'Cost per service',
		icon: 'orange',
		tags: [tag('team', 'finops')],
	},
];

/** Row markers a story can put on the list, each landing on a slice of the rows. */
export const ROW_MARKERS = ['pinned', 'locked', 'legacy'] as const;

export type RowMarker = (typeof ROW_MARKERS)[number];

export const dashboardIdAt = (index: number): string =>
	`storybook-dashboard-${index + 1}`;

/**
 * Pins are per-user state the endpoint owns, and the page writes them: keeping
 * them here is what lets the pin button stick instead of being answered away by
 * the next list fetch.
 */
const pinned = new Set<string>();

export const seedPinnedDashboards = (ids: readonly string[]): void => {
	pinned.clear();
	ids.forEach((id) => pinned.add(id));
};

export const setDashboardPinned = (id: string, isPinned: boolean): void => {
	if (isPinned) {
		pinned.add(id);
	} else {
		pinned.delete(id);
	}
};

interface ListArgs {
	count: number;
	offset: number;
	limit: number;
	markers: readonly RowMarker[];
	query: string;
}

const seedAt = (index: number): DashboardSeed => SEEDS[index % SEEDS.length];

const nameAt = (index: number): string => {
	const seed = seedAt(index);
	const round = Math.floor(index / SEEDS.length);

	return round === 0 ? seed.name : `${seed.name} (${round + 1})`;
};

const dashboardAt = (
	index: number,
	markers: readonly RowMarker[],
): DashboardtypesListedDashboardForUserV2DTO => {
	const seed = seedAt(index);
	const name = nameAt(index);
	const mine = index % 3 === 0;

	return {
		id: dashboardIdAt(index),
		orgId: 'storybook-org',
		name,
		spec: { display: { name } },
		image: `/assets/Icons/${seed.icon}`,
		schemaVersion: 'v2',
		source: DashboardtypesSourceDTO.user,
		pinned: pinned.has(dashboardIdAt(index)),
		locked: markers.includes('locked') && !!seed.locked,
		legacy: markers.includes('legacy') && index % 7 === 4,
		tags: seed.tags,
		createdBy: mine
			? STORY_USER_EMAIL
			: TEAMMATE_EMAILS[index % TEAMMATE_EMAILS.length],
		updatedBy: TEAMMATE_EMAILS[(index + 1) % TEAMMATE_EMAILS.length],
		createdAt: ago(24 * (index + 3)),
		updatedAt: ago(index * 5 + 1),
	};
};

/** `key OP value`, the only term shape the mock evaluates. */
const TERM = /(\w+)\s*(=|!=|CONTAINS|IN)\s*(\[[^\]]*\]|'[^']*'|true|false)/gi;

const quoted = (raw: string): string[] =>
	Array.from(raw.matchAll(/'([^']*)'/g), (match) => match[1]);

const matchesTerm = (
	dashboard: DashboardtypesListedDashboardForUserV2DTO,
	key: string,
	operator: string,
	value: string,
): boolean => {
	const values = quoted(value);
	const [first = ''] = values;

	switch (key.toLowerCase()) {
		case 'locked':
			return dashboard.locked === (value.toLowerCase() === 'true');
		case 'created_by':
			return values.includes(dashboard.createdBy ?? '');
		case 'updated_by':
			return values.includes(dashboard.updatedBy ?? '');
		case 'name':
			return operator.toUpperCase() === 'CONTAINS'
				? dashboard.name.toLowerCase().includes(first.toLowerCase())
				: dashboard.name === first;
		case 'created_at':
		case 'updated_at':
		case 'description':
			return true;
		default:
			return dashboard.tags.some((t) => t.key === key && values.includes(t.value));
	}
};

/**
 * The AND-joined subset of the list DSL the built-in views, the saved views and
 * the Created-by dropdown emit. A term the mock cannot read is treated as
 * matching, so an unsupported query answers with the unfiltered page rather than
 * an empty one.
 */
const matchesQuery = (
	dashboard: DashboardtypesListedDashboardForUserV2DTO,
	query: string,
): boolean =>
	Array.from(query.matchAll(TERM)).every(([, key, operator, value]) =>
		matchesTerm(dashboard, key, operator, value),
	);

export const dashboardsListResponse = ({
	count,
	offset,
	limit,
	markers,
	query,
}: ListArgs): ListDashboardsForUserV2200 => {
	const all = Array.from({ length: count }, (_, index) =>
		dashboardAt(index, markers),
	);
	const matched = query ? all.filter((d) => matchesQuery(d, query)) : all;

	// Pins float to the top of the requested ordering, server-side.
	matched.sort((a, b) => Number(b.pinned) - Number(a.pinned));

	const tags = matched.flatMap((dashboard) => dashboard.tags);
	const uniqueTags = Array.from(
		new Map(tags.map((t) => [`${t.key}:${t.value}`, t])).values(),
	);

	return {
		status: 'success',
		data: {
			total: matched.length,
			reservedKeywords: [
				'name',
				'description',
				'created_by',
				'created_at',
				'updated_at',
				'locked',
			],
			tags: uniqueTags,
			dashboards: matched.slice(offset, offset + limit),
		},
	};
};

const SAVED_VIEW_SEEDS = [
	{ name: 'Production dashboards', query: "env = 'prod'" },
	{ name: 'Platform team', query: "team = 'platform'" },
	{ name: 'Locked dashboards', query: 'locked = true' },
	{ name: 'Database dashboards', query: "component = 'database'" },
] as const;

/**
 * A saved view as the rail addresses it. Selecting one applies its query, so a
 * story that opens on a saved view has to seed the route with both.
 */
export const savedView = (index: number): { id: string; query: string } => ({
	id: `storybook-view-${index + 1}`,
	query: SAVED_VIEW_SEEDS[index % SAVED_VIEW_SEEDS.length].query,
});

export const dashboardViewsResponse = (
	count: number,
): ListDashboardViews200 => ({
	status: 'success',
	data: {
		views: Array.from({ length: count }, (_, index) => {
			const seed = SAVED_VIEW_SEEDS[index % SAVED_VIEW_SEEDS.length];

			return {
				id: savedView(index).id,
				orgId: 'storybook-org',
				name: index < SAVED_VIEW_SEEDS.length ? seed.name : `${seed.name} ${index}`,
				data: {
					version: 'v1',
					query: seed.query,
					sort: DashboardtypesListSortDTO.updated_at,
					order: DashboardtypesListOrderDTO.desc,
				},
				createdAt: ago(24 * (index + 1)),
				updatedAt: ago(index + 1),
			};
		}),
	},
});

/** The org's users, which is where the Created-by dropdown gets its options. */
export const orgUsersResponse = (): ListUsers200 => ({
	status: 'success',
	data: [
		{
			id: 'storybook-user-me',
			email: STORY_USER_EMAIL,
			displayName: 'John Doe',
		},
		...TEAMMATE_EMAILS.map((email, index) => ({
			id: `storybook-user-${index + 1}`,
			email,
			displayName: email.split('@')[0].replace(/^./, (c) => c.toUpperCase()),
		})),
	],
});

/** Ids the Recently-viewed rail entry reads out of local state. */
export const recentDashboardIds = (count: number): string[] =>
	Array.from(
		{ length: count },
		(_, index) => `storybook-dashboard-${index + 4}`,
	);
