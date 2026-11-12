import { useDashboardStore } from '../store/useDashboardStore';
import type { DashboardControlGroup, DashboardControls } from './types';

/** Every control in a group, resolved for this mount (see `useDashboardControl`). */
export function useDashboardControlGroup<G extends DashboardControlGroup>(
	group: G,
): DashboardControls[G] {
	return useDashboardStore((s) => s.controls[group]);
}
