import { useCallback } from 'react';
import { useQueryClient } from 'react-query';
import {
	getGetDashboardV2QueryKey,
	usePatchDashboardV2,
} from 'api/generated/services/dashboard';
import {
	type DashboardtypesJSONPatchOperationDTO,
	DashboardtypesJSONPatchOperationDTOOp,
} from 'api/generated/services/sigNoz.schemas';

import type { PanelDisplayDraft } from './types';

interface UsePanelEditorSaveArgs {
	dashboardId: string;
	panelId: string;
}

interface UsePanelEditorSaveApi {
	save: (display: PanelDisplayDraft) => Promise<void>;
	isSaving: boolean;
	error: Error | null;
}

/**
 * Persists panel edits for the V2 editor via RFC-6902 JSON Patch.
 *
 * Milestone 1 only touches the panel's display (title/description), so it emits
 * a single `add` op against `/spec/panels/{panelId}/spec/display`. `add` doubles
 * as create-or-replace for the display object, so panels that loaded without a
 * display are handled without a separate existence check. Later milestones add
 * ops for queries and the per-kind plugin spec.
 */
export function usePanelEditorSave({
	dashboardId,
	panelId,
}: UsePanelEditorSaveArgs): UsePanelEditorSaveApi {
	const queryClient = useQueryClient();
	const { mutateAsync, isLoading, error } = usePatchDashboardV2();

	const save = useCallback(
		async (display: PanelDisplayDraft): Promise<void> => {
			const ops: DashboardtypesJSONPatchOperationDTO[] = [
				{
					op: DashboardtypesJSONPatchOperationDTOOp.add,
					path: `/spec/panels/${panelId}/spec/display`,
					value: { name: display.name, description: display.description },
				},
			];

			await mutateAsync({ pathParams: { id: dashboardId }, data: ops });
			await queryClient.invalidateQueries(
				getGetDashboardV2QueryKey({ id: dashboardId }),
			);
		},
		[dashboardId, panelId, mutateAsync, queryClient],
	);

	return { save, isSaving: isLoading, error: (error as Error) ?? null };
}
