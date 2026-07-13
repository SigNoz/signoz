import { useCallback } from 'react';
import { toast } from '@signozhq/ui/sonner';
import { cloneDeep } from 'lodash-es';
import { v4 as uuid } from 'uuid';

import { useOptimisticPatch } from '../../../hooks/useOptimisticPatch';
import {
	addPanelToSectionOps,
	findFreeSlot,
	panelRef,
} from '../../../patchOps';
import { useDashboardStore } from '../../../store/useDashboardStore';
import { useScrollIntoViewStore } from '../../../store/useScrollIntoViewStore';
import type { DashboardSection } from '../../../utils';

interface Params {
	sections: DashboardSection[];
}

export interface ClonePanelArgs {
	panelId: string;
	layoutIndex: number;
}

/**
 * Duplicates a panel: deep-copies the source spec under a fresh id and drops a
 * same-size grid item into the section via `findFreeSlot` (beside the last row
 * if it fits, else a fresh row), as one atomic patch. Mirrors V1's clone
 * (verbatim spec copy, no rename).
 */
export function useClonePanel({
	sections,
}: Params): (args: ClonePanelArgs) => Promise<void> {
	const dashboardId = useDashboardStore((s) => s.dashboardId);
	const { patchAsync } = useOptimisticPatch();
	const setScrollTargetId = useScrollIntoViewStore((s) => s.setScrollTargetId);

	return useCallback(
		async ({ panelId, layoutIndex }: ClonePanelArgs): Promise<void> => {
			const section = sections.find((s) => s.layoutIndex === layoutIndex);
			const source = section?.items.find((i) => i.id === panelId);
			if (!dashboardId || !section || !source?.panel) {
				return;
			}

			const newPanelId = uuid();
			const { x, y } = findFreeSlot(section.items, source.width);

			const clone = patchAsync(
				addPanelToSectionOps({
					panelId: newPanelId,
					panel: cloneDeep(source.panel),
					layoutIndex,
					item: {
						x,
						y,
						width: source.width,
						height: source.height,
						content: { $ref: panelRef(newPanelId) },
					},
				}),
			);

			toast.promise(clone, {
				loading: 'Cloning panel…',
				success: 'Panel cloned',
				error: 'Failed to clone panel',
				position: 'top-center',
				duration: 2000,
				// Defer the reveal to the toast's auto-close so the confirmation shows first.
				onAutoClose: () => setScrollTargetId(newPanelId),
			});

			// toast.promise owns the error UX; swallow here to avoid an unhandled
			// rejection (the optimistic cache write + settle refetch handle state).
			try {
				await clone;
			} catch {
				// no-op
			}
		},
		[sections, dashboardId, patchAsync, setScrollTargetId],
	);
}
