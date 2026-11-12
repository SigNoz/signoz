import type { QueryKey } from 'react-query';
import type { StateCreator } from 'zustand';
import type { DashboardtypesGettableDashboardV2DTO } from 'api/generated/services/sigNoz.schemas';

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
	setEditContext: (ctx: {
		dashboardId: string;
		refetch: () => void;
		source?: DashboardQuerySource;
		readOnly?: boolean;
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
	// Idempotent (no-op when unchanged) so it's safe to call during render.
	setEditContext: (ctx): void => {
		const prev = get();
		const source = ctx.source ?? null;
		const readOnly = ctx.readOnly ?? false;
		if (
			prev.dashboardId === ctx.dashboardId &&
			prev.refetch === ctx.refetch &&
			prev.readOnly === readOnly &&
			prev.dashboardQuerySource === source
		) {
			return;
		}
		set({
			dashboardId: ctx.dashboardId,
			dashboardQuerySource: source,
			refetch: ctx.refetch,
			readOnly,
		});
	},
});
