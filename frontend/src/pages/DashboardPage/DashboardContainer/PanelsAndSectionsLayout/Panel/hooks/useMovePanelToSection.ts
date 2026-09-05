import { useCallback } from 'react';
import logEvent from 'api/common/logEvent';
import { DashboardDetailEvents } from 'pages/DashboardPage/constants/events';
import { toLegacyPanelType } from 'pages/DashboardPage/DashboardContainer/Panels/types/panelKind';

import { useErrorModal } from 'providers/ErrorModalProvider';
import APIError from 'types/api/error';

import { useDashboardEventMeta } from '../../../hooks/useDashboardEventMeta';
import { useOptimisticPatch } from '../../../hooks/useOptimisticPatch';
import { bottomRowSlot, movePanelBetweenSectionsOps } from '../../../patchOps';
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
 * stays in `spec.panels`; only the grid item moves, dropped into a fresh row at
 * the bottom of the target section (`bottomRowSlot`). Persisted as one atomic patch.
 */
export function useMovePanelToSection({
	sections,
}: Params): (args: MovePanelArgs) => Promise<void> {
	const dashboardId = useDashboardStore((s) => s.dashboardId);
	const eventMeta = useDashboardEventMeta();
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
			const movedKind = moved.panel?.spec.plugin.kind;

			const sourceItems = source.items.filter((i) => i.id !== panelId);
			// Land at the section bottom, not backfilled into a gap — least disruptive
			// to the arrangement the user already made in the target section.
			const { x, y } = bottomRowSlot(target.items);
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
				void logEvent(DashboardDetailEvents.PanelAction, {
					action: 'move',
					// An item ref can outlive its panel, so both fields go on together or
					// not at all: `panelType` keeps existing reports resolving, `panelKind`
					// is the V2 identity.
					...(movedKind
						? {
								panelType: toLegacyPanelType(movedKind),
								panelKind: movedKind,
							}
						: {}),
					panelId,
					...eventMeta,
				});
			} catch (error) {
				showErrorModal(error as APIError);
			}
		},
		[sections, dashboardId, eventMeta, patchAsync, showErrorModal],
	);
}
