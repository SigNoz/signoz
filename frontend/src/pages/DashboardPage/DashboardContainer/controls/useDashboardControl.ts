import { useDashboardStore } from '../store/useDashboardStore';
import { isControlVisible } from './dashboardControls';
import type { DashboardControlId } from './types';

/**
 * Whether a control renders on this mount: the host's `controls`, with every
 * writing control off when read-only. Lock and permission state stay with
 * `useDashboardEditContext`, which decides disabled + reason.
 */
export function useDashboardControl(id: DashboardControlId): boolean {
	return useDashboardStore((s) => isControlVisible(s.controls, id));
}
