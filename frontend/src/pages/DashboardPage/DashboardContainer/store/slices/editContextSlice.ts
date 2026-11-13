import { isEqual } from 'lodash-es';
import type { QueryKey } from 'react-query';
import type { StateCreator } from 'zustand';
import type {
	DashboardtypesGettableDashboardV2DTO,
	Querybuildertypesv5QueryRangeRequestDTO,
	QueryRangeV5200,
} from 'api/generated/services/sigNoz.schemas';

import { resolveControls } from '../../controls/dashboardControls';
import type {
	DashboardControls,
	DashboardControlsInput,
} from '../../controls/types';
import type { DashboardStore } from '../useDashboardStore';

/**
 * The react-query entry a host loaded the dashboard into, and how to read the
 * dashboard out of it. Must be referentially stable (module-level).
 */
export interface DashboardQuerySource {
	queryKey: QueryKey;
	// `never` accepts any host's response type; the one caller casts at the boundary.
	select: (response: never) => DashboardtypesGettableDashboardV2DTO | undefined;
}

/**
 * Runs a panel's query, when not via `POST /api/v5/query_range`. `key` joins
 * every panel cache key, so results from different runners never mix.
 */
export interface QueryRunner {
	key: string;
	/** False when `run` ignores offset and limit: list panels then fetch one unpaged result. */
	paginates?: boolean;
	run: (request: {
		panelId: string;
		requestPayload: Querybuildertypesv5QueryRangeRequestDTO;
		signal?: AbortSignal;
	}) => Promise<QueryRangeV5200>;
}

/**
 * The page context the subtree can't derive for itself: which dashboard is open,
 * where its cached copy lives, how to refetch it, and whether the host forces it
 * view-only. Editability is deliberately absent — `useDashboardEditContext`
 * derives it from the caches.
 */
export interface EditContextSlice {
	dashboardId: string;
	/** `null` reads the dashboards API entry for `dashboardId`. */
	dashboardQuerySource: DashboardQuerySource | null;
	refetch: () => void;
	readOnly: boolean;
	/** Resolved: the host's `controls` over the defaults, writing ones off when read-only. */
	controls: DashboardControls;
	/** `null` runs panel queries on `query_range`. */
	queryRunner: QueryRunner | null;
	setEditContext: (ctx: {
		dashboardId: string;
		refetch: () => void;
		source?: DashboardQuerySource;
		readOnly?: boolean;
		controls?: DashboardControlsInput;
		queryRunner?: QueryRunner;
	}) => void;
}

export const createEditContextSlice: StateCreator<
	DashboardStore,
	[['zustand/persist', unknown]],
	[],
	EditContextSlice
> = (set, get) => ({
	dashboardId: '',
	dashboardQuerySource: null,
	refetch: (): void => undefined,
	readOnly: false,
	controls: resolveControls(undefined, false),
	queryRunner: null,
	// Idempotent (no-op when unchanged) so it's safe to call during render.
	setEditContext: (ctx): void => {
		const prev = get();
		const source = ctx.source ?? null;
		const readOnly = ctx.readOnly ?? false;
		// Hosts pass `controls` inline, so compare by value, not reference.
		const controls = resolveControls(ctx.controls, readOnly);
		const queryRunner = ctx.queryRunner ?? null;
		if (
			prev.dashboardId === ctx.dashboardId &&
			prev.refetch === ctx.refetch &&
			prev.readOnly === readOnly &&
			prev.dashboardQuerySource === source &&
			isEqual(prev.controls, controls) &&
			// The key identifies a runner, so an inline one doesn't re-seed on every render.
			prev.queryRunner?.key === queryRunner?.key
		) {
			return;
		}
		set({
			dashboardId: ctx.dashboardId,
			dashboardQuerySource: source,
			refetch: ctx.refetch,
			readOnly,
			controls,
			queryRunner,
		});
	},
});
