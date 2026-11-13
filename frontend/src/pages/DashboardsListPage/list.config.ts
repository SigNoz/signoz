import { Clock, Layers, Lock, Pin, User } from '@signozhq/icons';
import { clause } from 'components/ListFilter/dsl/filterQuery';
import type {
	ClauseBuilder,
	DslGrammar,
} from 'components/ListFilter/dsl/types';
import type { BuiltinViewConfig } from 'components/ListViews/types';

import type { DashboardViewCtx, DashboardViewFilter } from './types';
import type { DashboardListItem } from './utils/helpers';

// Mirrors pkg/types/dashboardtypes/list_filter.go. Any other key is a tag key.
// (`updated_by` and `source` are NOT queryable.)
export const DASHBOARDS_DSL_GRAMMAR = {
	fields: [
		{ key: 'name', type: 'string' },
		{ key: 'description', type: 'string' },
		{ key: 'created_by', type: 'string' },
		{ key: 'created_at', type: 'timestamp' },
		{ key: 'updated_at', type: 'timestamp' },
		{ key: 'locked', type: 'bool' },
	],
	dynamicKey: { detail: 'tag', prefix: '' },
} as const satisfies DslGrammar;

const where: ClauseBuilder<
	(typeof DASHBOARDS_DSL_GRAMMAR)['fields'][number]['key']
> = clause;

type DashboardViewConfig = BuiltinViewConfig<
	DashboardViewFilter,
	DashboardViewCtx,
	DashboardListItem
>;

// Built-in views rendered above the user's saved views. Their result set is
// derived (a fixed query fragment or a client-side id set), never persisted.
// Ids double as the URL `view` param, so they must stay stable.
// Built-in views only seed the query; the current sort/order is kept.
const views = [
	{
		id: 'mine',
		label: 'My dashboards',
		icon: User,
		section: 'personal',
		filter: (current, { userEmail }): DashboardViewFilter => ({
			...current,
			query: userEmail ? where('created_by', '=', userEmail) : '',
		}),
		emptyState: {
			title: "You haven't created any dashboards",
			description: 'Dashboards you create will appear here.',
		},
	},
	{
		id: 'pinned',
		label: 'Pinned',
		icon: Pin,
		section: 'personal',
		filter: (current): DashboardViewFilter => ({ ...current, query: '' }),
		clientFilter: (rows): DashboardListItem[] => rows.filter((d) => d.pinned),
		emptyState: {
			title: 'No pinned dashboards yet',
			description: 'Pin a dashboard to keep it handy here.',
		},
	},
	{
		id: 'recent',
		label: 'Recently viewed',
		icon: Clock,
		section: 'personal',
		filter: (current): DashboardViewFilter => ({ ...current, query: '' }),
		// Keeps visit order, whatever the active sort.
		clientFilter: (rows, { recent }): DashboardListItem[] => {
			const order = new Map(recent.map((id, index) => [id, index]));
			return rows
				.filter((d) => order.has(d.id))
				.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
		},
		emptyState: {
			title: 'No recently viewed dashboards',
			description: 'Dashboards you open will appear here.',
		},
	},
	{
		id: 'all',
		label: 'All dashboards',
		icon: Layers,
		section: 'system',
		filter: (current): DashboardViewFilter => ({ ...current, query: '' }),
	},
	{
		id: 'locked',
		label: 'Locked',
		icon: Lock,
		section: 'system',
		filter: (current): DashboardViewFilter => ({
			...current,
			query: where('locked', '=', true),
		}),
		emptyState: {
			title: 'No locked dashboards',
			description: 'Dashboards locked for editing will appear here.',
		},
	},
] as const satisfies readonly DashboardViewConfig[];

export type DashboardViewId = (typeof views)[number]['id'];

export const BUILTIN_VIEWS: readonly DashboardViewConfig[] = views;

export const DEFAULT_DASHBOARD_VIEW: DashboardViewId = 'all';

export const findBuiltinView = (id: string): DashboardViewConfig | undefined =>
	BUILTIN_VIEWS.find((v) => v.id === id);
