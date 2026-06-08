import { useCallback } from 'react';

import {
	selectIsSectionOpen,
	useDashboardStore,
} from '../../../store/useDashboardStore';

interface Params {
	sectionId: string;
}

interface Result {
	open: boolean;
	toggle: () => void;
}

/**
 * Owns a section's expand/collapse state. Collapse is a frontend-only, per-user
 * preference (not in the dashboard spec): it lives in the persisted zustand
 * store, keyed by dashboardId + section id, and survives reloads. Default open.
 */
export function useToggleSectionCollapse({ sectionId }: Params): Result {
	const dashboardId = useDashboardStore((s) => s.dashboardId);
	const open = useDashboardStore(selectIsSectionOpen(dashboardId, sectionId));
	const toggleSectionCollapse = useDashboardStore(
		(s) => s.toggleSectionCollapse,
	);

	const toggle = useCallback((): void => {
		if (dashboardId) {
			toggleSectionCollapse(dashboardId, sectionId);
		}
	}, [dashboardId, sectionId, toggleSectionCollapse]);

	return { open, toggle };
}
