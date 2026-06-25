import { useCallback } from 'react';
import { toast } from '@signozhq/ui/sonner';
import { cloneDeep } from 'lodash-es';
import { v4 as uuid } from 'uuid';

import { patchDashboardV2 } from 'api/generated/services/dashboard';

import { addPanelToSectionOps, panelRef } from '../../../patchOps';
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
 * same-size grid item at the bottom of the section, as one atomic patch. Mirrors
 * V1's clone (verbatim spec copy, no rename).
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
			const nextY = section.items.reduce(
				(max, i) => Math.max(max, i.y + i.height),
				0,
			);

			const clone = patchDashboardV2(
				{ id: dashboardId },
				addPanelToSectionOps({
					panelId: newPanelId,
					panel: cloneDeep(source.panel),
					layoutIndex,
					item: {
						x: 0,
						y: nextY,
						width: source.width,
						height: source.height,
						content: { $ref: panelRef(newPanelId) },
					},
				}),
			);

			// toast.promise reports the failure, so no separate error modal here.
			toast.promise(clone, {
				loading: 'Cloning panel…',
				success: 'Panel cloned',
				error: 'Failed to clone panel',
				position: 'top-center',
			});

			// Refetch only on success; swallow the rejection (toast owns the error
			// UX) to avoid an unhandled rejection.
			try {
				await clone;
				refetch();
			} catch {
				// no-op — toast.promise owns the error UX.
			}
		},
		[sections, dashboardId, refetch],
	);
}
