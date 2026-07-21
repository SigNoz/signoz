import { useCallback, useState } from 'react';

import logEvent from 'api/common/logEvent';
import type { DashboardtypesLayoutDTO } from 'api/generated/services/sigNoz.schemas';
import { DashboardDetailEvents } from 'pages/DashboardPageV2/constants/events';
import { useErrorModal } from 'providers/ErrorModalProvider';
import APIError from 'types/api/error';

import { useOptimisticPatch } from '../../../hooks/useOptimisticPatch';
import {
	addSectionOp,
	newGridLayout,
	reorderLayoutsOp,
} from '../../../patchOps';
import { useDashboardStore } from '../../../store/useDashboardStore';
import { useScrollIntoViewStore } from '../../../store/useScrollIntoViewStore';
import { getSectionStableId } from '../../../utils';

interface Params {
	layouts: DashboardtypesLayoutDTO[] | undefined | null;
}

interface Result {
	addSection: (title: string) => Promise<void>;
	isSaving: boolean;
}

/**
 * Appends an empty titled section. When the dashboard has no layouts yet, the
 * layouts array is created via a `replace` (an `add` to a missing/empty array
 * pointer is unreliable); otherwise a new Grid is appended.
 */
export function useAddSection({ layouts }: Params): Result {
	const dashboardId = useDashboardStore((s) => s.dashboardId);
	const { patchAsync } = useOptimisticPatch();
	const [isSaving, setIsSaving] = useState(false);
	const { showErrorModal } = useErrorModal();
	const setScrollTargetId = useScrollIntoViewStore((s) => s.setScrollTargetId);

	const addSection = useCallback(
		async (title: string): Promise<void> => {
			const trimmed = title.trim();
			if (!dashboardId || !trimmed) {
				return;
			}
			const isFirstSection = !layouts || layouts.length === 0;
			const op = isFirstSection
				? reorderLayoutsOp([newGridLayout(trimmed)])
				: addSectionOp(trimmed);
			try {
				setIsSaving(true);
				await patchAsync([op]);
				void logEvent(DashboardDetailEvents.SectionAction, {
					action: 'add',
					dashboardId,
				});
				// The new empty section is appended, so its layout index is the prior count;
				// key it the way `getSectionStableId` does so it reveals itself on render.
				const newIndex = isFirstSection ? 0 : layouts.length;
				setScrollTargetId(getSectionStableId([], newIndex));
			} catch (error) {
				showErrorModal(error as APIError);
			} finally {
				setIsSaving(false);
			}
		},
		[layouts, dashboardId, patchAsync, showErrorModal, setScrollTargetId],
	);

	return { addSection, isSaving };
}
