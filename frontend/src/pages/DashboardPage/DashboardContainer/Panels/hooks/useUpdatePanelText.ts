import { useCallback } from 'react';
import { useErrorModal } from 'providers/ErrorModalProvider';
import type APIError from 'types/api/error';

import { useDashboardEditContext } from '../../hooks/useDashboardEditContext';
import { useOptimisticPatch } from '../../hooks/useOptimisticPatch';
import { setPanelTextOp } from '../../patchOps';
import { useDashboardStore } from '../../store/useDashboardStore';

/**
 * Saves a panel's authored body, or `undefined` when the viewer cannot edit it —
 * the absent callback is the read-only gate, so nothing downstream re-checks.
 * The patch is optimistic: the edit shows at once and rolls back if it fails.
 */
export function useUpdatePanelText(
	panelId: string,
): ((text: string) => void) | undefined {
	const dashboardId = useDashboardStore((s) => s.dashboardId);
	const { isEditable } = useDashboardEditContext();
	const { patchAsync } = useOptimisticPatch();
	const { showErrorModal } = useErrorModal();

	const save = useCallback(
		(text: string): void => {
			patchAsync([setPanelTextOp(panelId, text)]).catch((error) => {
				showErrorModal(error as APIError);
			});
		},
		[panelId, patchAsync, showErrorModal],
	);

	return dashboardId && isEditable ? save : undefined;
}
