import { useCallback, useState } from 'react';

import logEvent from 'api/common/logEvent';
import type { DashboardtypesJSONPatchOperationDTO } from 'api/generated/services/sigNoz.schemas';
import { DashboardDetailEvents } from 'pages/DashboardPageV2/constants/events';
import { useErrorModal } from 'providers/ErrorModalProvider';
import APIError from 'types/api/error';

import { useOptimisticPatch } from '../../../hooks/useOptimisticPatch';
import { removePanelOp, removeSectionOp } from '../../../patchOps';
import { useDashboardStore } from '../../../store/useDashboardStore';
import type { DashboardSection } from '../../../utils';

interface Params {
	section: DashboardSection;
}

interface Result {
	deleteSection: () => Promise<void>;
	isSaving: boolean;
}

/**
 * Deletes a section: removes its Grid layout and deletes every panel it
 * contained from `spec.panels` (orphan cleanup), as one atomic patch.
 */
export function useDeleteSection({ section }: Params): Result {
	const dashboardId = useDashboardStore((s) => s.dashboardId);
	const { patchAsync } = useOptimisticPatch();
	const [isSaving, setIsSaving] = useState(false);
	const { showErrorModal } = useErrorModal();

	const deleteSection = useCallback(async (): Promise<void> => {
		if (!dashboardId) {
			return;
		}
		const ops: DashboardtypesJSONPatchOperationDTO[] = section.items.map((i) =>
			removePanelOp(i.id),
		);
		ops.push(removeSectionOp(section.layoutIndex));
		try {
			setIsSaving(true);
			await patchAsync(ops);
			void logEvent(DashboardDetailEvents.SectionAction, {
				action: 'delete',
				panelCount: section.items.length,
				dashboardId,
			});
		} catch (error) {
			showErrorModal(error as APIError);
		} finally {
			setIsSaving(false);
		}
	}, [section, dashboardId, patchAsync, showErrorModal]);

	return { deleteSection, isSaving };
}
