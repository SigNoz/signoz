import { useCallback } from 'react';

import { useErrorModal } from 'providers/ErrorModalProvider';
import APIError from 'types/api/error';

import { useOptimisticPatch } from '../../../hooks/useOptimisticPatch';
import { findFreeSlot, movePanelBetweenSectionsOps } from '../../../patchOps';
import { useDashboardStore } from '../../../store/useDashboardStore';
import type { DashboardSection } from '../../../utils';

export interface MovePanelArgs {
	panelId: string;
	fromLayoutIndex: number;
	toLayoutIndex: number;
}

interface Params {
	sections: DashboardSection[];
}

/**
 * Relocates a panel's item ref from one section to another. The panel itself
 * stays in `spec.panels`; only the grid item moves, dropped into the target
 * section's first free slot (`findFreeSlot`). Persisted as one atomic patch.
 */
export function useMovePanelToSection({
	sections,
}: Params): (args: MovePanelArgs) => Promise<void> {
	const dashboardId = useDashboardStore((s) => s.dashboardId);
	const { patchAsync } = useOptimisticPatch();
	const { showErrorModal } = useErrorModal();

	return useCallback(
		async ({
			panelId,
			fromLayoutIndex,
			toLayoutIndex,
		}: MovePanelArgs): Promise<void> => {
			if (!dashboardId || fromLayoutIndex === toLayoutIndex) {
				return;
			}

			const source = sections.find((s) => s.layoutIndex === fromLayoutIndex);
			const target = sections.find((s) => s.layoutIndex === toLayoutIndex);
			if (!source || !target) {
				return;
			}

			const moved = source.items.find((i) => i.id === panelId);
			if (!moved) {
				return;
			}

			const sourceItems = source.items.filter((i) => i.id !== panelId);
			// Reuse the shared placement primitive: fills the last row's free edge
			// if the panel fits, else drops to a fresh row at the bottom.
			const { x, y } = findFreeSlot(target.items, moved.width);
			const targetItems = [...target.items, { ...moved, x, y }];

			try {
				await patchAsync(
					movePanelBetweenSectionsOps({
						sourceIndex: fromLayoutIndex,
						sourceItems,
						targetIndex: toLayoutIndex,
						targetItems,
					}),
				);
			} catch (error) {
				showErrorModal(error as APIError);
			}
		},
		[sections, dashboardId, patchAsync, showErrorModal],
	);
}
