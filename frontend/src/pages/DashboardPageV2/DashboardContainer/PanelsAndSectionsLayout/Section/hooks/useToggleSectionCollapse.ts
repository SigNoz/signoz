import { useCallback } from 'react';

import logEvent from 'api/common/logEvent';
import { DashboardDetailEvents } from 'pages/DashboardPageV2/constants/events';

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
			// `open` flips on toggle, so the resulting collapsed state is the current `open`.
			void logEvent(DashboardDetailEvents.SectionCollapsed, {
				collapsed: open,
				dashboardId,
			});
		}
	}, [dashboardId, sectionId, toggleSectionCollapse, open]);

	return { open, toggle };
}
