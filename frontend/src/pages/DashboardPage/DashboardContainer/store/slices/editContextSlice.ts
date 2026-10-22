import type { StateCreator } from 'zustand';

import type { DashboardStore } from '../useDashboardStore';

/**
 * The one piece of page context the subtree can't derive for itself: which
 * dashboard is open, and how to refetch it. Editability is deliberately absent —
 * `useDashboardEditContext` derives it from the caches.
 */
export interface EditContextSlice {
	dashboardId: string;
	refetch: () => void;
	/**
	 * @deprecated Forces a view-only mount regardless of permissions. Used only by
	 * LLM Observability; see SigNoz/pulse-pod#283.
	 */
	canEditDashboardOverride?: boolean;
	setEditContext: (ctx: {
		dashboardId: string;
		refetch: () => void;
		canEditDashboardOverride?: boolean;
	}) => void;
}

export const createEditContextSlice: StateCreator<
	DashboardStore,
	[['zustand/persist', unknown]],
	[],
	EditContextSlice
> = (set, get) => ({
	dashboardId: '',
	refetch: (): void => undefined,
	canEditDashboardOverride: undefined,
	// Idempotent (no-op when unchanged) so it's safe to call during render.
	setEditContext: (ctx): void => {
		const prev = get();
		if (
			prev.dashboardId === ctx.dashboardId &&
			prev.refetch === ctx.refetch &&
			prev.canEditDashboardOverride === ctx.canEditDashboardOverride
		) {
			return;
		}
		set({
			dashboardId: ctx.dashboardId,
			refetch: ctx.refetch,
			canEditDashboardOverride: ctx.canEditDashboardOverride,
		});
	},
});
