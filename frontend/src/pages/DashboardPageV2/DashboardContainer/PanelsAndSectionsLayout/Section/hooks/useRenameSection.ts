import { useCallback, useState } from 'react';

import logEvent from 'api/common/logEvent';
import { DashboardDetailEvents } from 'pages/DashboardPageV2/constants/events';
import { useErrorModal } from 'providers/ErrorModalProvider';
import APIError from 'types/api/error';

import { useOptimisticPatch } from '../../../hooks/useOptimisticPatch';
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
	const { patchAsync } = useOptimisticPatch();
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
				await patchAsync([renameSectionOp(layoutIndex, trimmed)]);
				void logEvent(DashboardDetailEvents.SectionAction, {
					action: 'rename',
					dashboardId,
				});
				return true;
			} catch (error) {
				showErrorModal(error as APIError);
				return false;
			} finally {
				setIsSaving(false);
			}
		},
		[dashboardId, layoutIndex, patchAsync, showErrorModal],
	);

	return { rename, isSaving };
}
