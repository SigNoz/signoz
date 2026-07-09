import { useCallback, useState } from 'react';

import type { DashboardtypesLayoutDTO } from 'api/generated/services/sigNoz.schemas';
import { useErrorModal } from 'providers/ErrorModalProvider';
import APIError from 'types/api/error';
import { scrollIntoViewWhenReady } from 'utils/scrollIntoViewWhenReady';

import { useOptimisticPatch } from '../../../hooks/useOptimisticPatch';
import {
	addSectionOp,
	newGridLayout,
	reorderLayoutsOp,
} from '../../../patchOps';
import { useDashboardStore } from '../../../store/useDashboardStore';

const SECTION_SELECTOR = '[data-testid^="dashboard-section-"]';

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

	const addSection = useCallback(
		async (title: string): Promise<void> => {
			const trimmed = title.trim();
			if (!dashboardId || !trimmed) {
				return;
			}
			const op =
				!layouts || layouts.length === 0
					? reorderLayoutsOp([newGridLayout(trimmed)])
					: addSectionOp(trimmed);
			const prevSectionCount = document.querySelectorAll(SECTION_SELECTOR).length;
			try {
				setIsSaving(true);
				await patchAsync([op]);
				// Once the optimistic write appends the new section, scroll to it.
				scrollIntoViewWhenReady(() => {
					const sections = document.querySelectorAll(SECTION_SELECTOR);
					return sections.length > prevSectionCount
						? sections[sections.length - 1]
						: null;
				});
			} catch (error) {
				showErrorModal(error as APIError);
			} finally {
				setIsSaving(false);
			}
		},
		[layouts, dashboardId, patchAsync, showErrorModal],
	);

	return { addSection, isSaving };
}
