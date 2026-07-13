import { useCallback } from 'react';
import { toast } from '@signozhq/ui/sonner';
import { cloneDeep } from 'lodash-es';
import { v4 as uuid } from 'uuid';

import { useOptimisticPatch } from '../../../hooks/useOptimisticPatch';
import { cloneSectionOps } from '../../../patchOps';
import type { DashboardSection } from '../../../utils';

/**
 * Duplicates a section with all its panels: each panel is deep-copied under a
 * fresh id and a new titled Grid ("<name> (Copy)") referencing them is appended,
 * as one atomic patch.
 */
export function useCloneSection(): (
	section: DashboardSection,
) => Promise<void> {
	const { patchAsync } = useOptimisticPatch();

	return useCallback(
		async (section: DashboardSection): Promise<void> => {
			const panels = section.items.flatMap((item) =>
				item.panel
					? [
							{
								newId: uuid(),
								panel: cloneDeep(item.panel),
								x: item.x,
								y: item.y,
								width: item.width,
								height: item.height,
							},
						]
					: [],
			);

			const title = section.title ? `${section.title} (Copy)` : 'Section (Copy)';
			const clone = patchAsync(cloneSectionOps(title, panels));

			toast.promise(clone, {
				loading: 'Cloning section…',
				success: 'Section cloned',
				error: 'Failed to clone section',
				position: 'top-center',
			});

			try {
				await clone;
			} catch {
				// toast.promise owns the error UX; the optimistic write + settle handle state.
			}
		},
		[patchAsync],
	);
}
