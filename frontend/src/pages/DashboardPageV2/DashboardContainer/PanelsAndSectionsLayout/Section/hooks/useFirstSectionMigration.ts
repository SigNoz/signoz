import { useCallback, useState } from 'react';

import logEvent from 'api/common/logEvent';
import type { DashboardtypesJSONPatchOperationDTO } from 'api/generated/services/sigNoz.schemas';
import { DashboardDetailEvents } from 'pages/DashboardPageV2/constants/events';
import { useErrorModal } from 'providers/ErrorModalProvider';
import APIError from 'types/api/error';

import { useOptimisticPatch } from '../../../hooks/useOptimisticPatch';
import { addSectionOp, titleUntitledSectionOp } from '../../../patchOps';
import { useDashboardStore } from '../../../store/useDashboardStore';
import type { DashboardSection } from '../../../utils';

interface Params {
	sections: DashboardSection[];
}

interface Result {
	migrate: (newSectionTitle: string) => Promise<void>;
	isSaving: boolean;
}

/**
 * Converts a free-flowing dashboard into a sectioned one: every existing
 * untitled layout that holds panels is titled in place ("Section 1", "Section
 * 2", …), then the brand-new section the user asked for is appended — all in one
 * atomic patch. Used once the user confirms the migration prompt.
 */
export function useFirstSectionMigration({ sections }: Params): Result {
	const dashboardId = useDashboardStore((s) => s.dashboardId);
	const { patchAsync } = useOptimisticPatch();
	const [isSaving, setIsSaving] = useState(false);
	const { showErrorModal } = useErrorModal();

	const migrate = useCallback(
		async (newSectionTitle: string): Promise<void> => {
			const trimmed = newSectionTitle.trim();
			if (!dashboardId || !trimmed) {
				return;
			}

			const ops: DashboardtypesJSONPatchOperationDTO[] = [];
			let counter = 1;
			sections.forEach((s) => {
				if (!s.title && s.items.length > 0) {
					ops.push(titleUntitledSectionOp(s.layoutIndex, `Section ${counter}`));
					counter += 1;
				}
			});
			ops.push(addSectionOp(trimmed));

			try {
				setIsSaving(true);
				await patchAsync(ops);
				void logEvent(DashboardDetailEvents.FirstSectionMigrationConfirmed, {
					dashboardId,
				});
			} catch (error) {
				showErrorModal(error as APIError);
			} finally {
				setIsSaving(false);
			}
		},
		[sections, dashboardId, patchAsync, showErrorModal],
	);

	return { migrate, isSaving };
}
