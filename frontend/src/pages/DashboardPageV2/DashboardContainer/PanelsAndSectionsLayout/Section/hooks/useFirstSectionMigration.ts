import { useCallback, useState } from 'react';

import { patchDashboardV2 } from 'api/generated/services/dashboard';
import type { DashboardtypesJSONPatchOperationDTO } from 'api/generated/services/sigNoz.schemas';
import { useErrorModal } from 'providers/ErrorModalProvider';
import APIError from 'types/api/error';

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
	const refetch = useDashboardStore((s) => s.refetch);
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
				await patchDashboardV2({ id: dashboardId }, ops);
				refetch();
			} catch (error) {
				showErrorModal(error as APIError);
			} finally {
				setIsSaving(false);
			}
		},
		[sections, dashboardId, refetch, showErrorModal],
	);

	return { migrate, isSaving };
}
