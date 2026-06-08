import { useCallback, useState } from 'react';

import { patchDashboardV2 } from 'api/generated/services/dashboard';
import { useErrorModal } from 'providers/ErrorModalProvider';
import APIError from 'types/api/error';

import { renameSectionOp } from '../../../patchOps';
import { useDashboardStore } from '../../../store/useDashboardStore';

interface Params {
	layoutIndex: number;
}

interface Result {
	rename: (title: string) => Promise<boolean>;
	isSaving: boolean;
}

/** Renames a section's title via `replace /spec/layouts/<i>/spec/display/title`. */
export function useRenameSection({ layoutIndex }: Params): Result {
	const dashboardId = useDashboardStore((s) => s.dashboardId);
	const refetch = useDashboardStore((s) => s.refetch);
	const [isSaving, setIsSaving] = useState(false);
	const { showErrorModal } = useErrorModal();

	const rename = useCallback(
		async (title: string): Promise<boolean> => {
			const trimmed = title.trim();
			if (!dashboardId || !trimmed) {
				return false;
			}
			try {
				setIsSaving(true);
				await patchDashboardV2({ id: dashboardId }, [
					renameSectionOp(layoutIndex, trimmed),
				]);
				refetch();
				return true;
			} catch (error) {
				showErrorModal(error as APIError);
				return false;
			} finally {
				setIsSaving(false);
			}
		},
		[dashboardId, layoutIndex, refetch, showErrorModal],
	);

	return { rename, isSaving };
}
