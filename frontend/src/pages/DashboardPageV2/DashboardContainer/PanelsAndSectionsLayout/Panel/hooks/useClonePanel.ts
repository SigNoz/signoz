import { useCallback } from 'react';
import { toast } from '@signozhq/ui/sonner';
import { cloneDeep } from 'lodash-es';
import { v4 as uuid } from 'uuid';

import { patchDashboardV2 } from 'api/generated/services/dashboard';

import {
	addPanelToSectionOps,
	findFreeSlot,
	panelRef,
} from '../../../patchOps';
import { useDashboardStore } from '../../../store/useDashboardStore';
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
	const refetch = useDashboardStore((s) => s.refetch);

	return useCallback(
		async ({ panelId, layoutIndex }: ClonePanelArgs): Promise<void> => {
			const section = sections.find((s) => s.layoutIndex === layoutIndex);
			const source = section?.items.find((i) => i.id === panelId);
			if (!dashboardId || !section || !source?.panel) {
				return;
			}

			const newPanelId = uuid();
			const { x, y } = findFreeSlot(section.items, source.width);

			const clone = patchDashboardV2(
				{ id: dashboardId },
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
			});

			// Refetch only on success; toast.promise owns the error UX, so swallow
			// the rejection to avoid an unhandled rejection.
			try {
				await clone;
				refetch();
			} catch {
				// no-op
			}
		},
		[sections, dashboardId, refetch],
	);
}
