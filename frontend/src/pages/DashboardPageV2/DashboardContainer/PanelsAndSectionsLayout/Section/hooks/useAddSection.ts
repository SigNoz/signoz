import { useCallback, useState } from 'react';

import { patchDashboardV2 } from 'api/generated/services/dashboard';
import type { DashboardtypesLayoutDTO } from 'api/generated/services/sigNoz.schemas';
import { useErrorModal } from 'providers/ErrorModalProvider';
import APIError from 'types/api/error';

import {
	addSectionOp,
	newGridLayout,
	reorderLayoutsOp,
} from '../../../patchOps';
import { useDashboardStore } from '../../../store/useDashboardStore';

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
	const refetch = useDashboardStore((s) => s.refetch);
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
			try {
				setIsSaving(true);
				await patchDashboardV2({ id: dashboardId }, [op]);
				refetch();
			} catch (error) {
				showErrorModal(error as APIError);
			} finally {
				setIsSaving(false);
			}
		},
		[layouts, dashboardId, refetch, showErrorModal],
	);

	return { addSection, isSaving };
}
