import { useCallback } from 'react';
import { useQueryClient } from 'react-query';
import {
	getGetDashboardV2QueryKey,
	usePatchDashboardV2,
} from 'api/generated/services/dashboard';
import {
	type DashboardtypesJSONPatchOperationDTO,
	type DashboardtypesPanelSpecDTO,
	DashboardtypesPatchOpDTO,
} from 'api/generated/services/sigNoz.schemas';

interface UsePanelEditorSaveArgs {
	dashboardId: string;
	panelId: string;
}

interface UsePanelEditorSaveApi {
	save: (spec: DashboardtypesPanelSpecDTO) => Promise<void>;
	isSaving: boolean;
	error: Error | null;
}

/**
 * Persists panel edits via a single RFC-6902 `add` op that replaces the whole panel
 * spec at `/spec/panels/{panelId}/spec`, so every config-pane edit is saved (not just
 * title/description). `add` doubles as create-or-replace, avoiding a separate
 * existence check.
 */
export function usePanelEditorSave({
	dashboardId,
	panelId,
}: UsePanelEditorSaveArgs): UsePanelEditorSaveApi {
	const queryClient = useQueryClient();
	const { mutateAsync, isLoading, error } = usePatchDashboardV2();

	const save = useCallback(
		async (spec: DashboardtypesPanelSpecDTO): Promise<void> => {
			const ops: DashboardtypesJSONPatchOperationDTO[] = [
				{
					op: DashboardtypesPatchOpDTO.add,
					path: `/spec/panels/${panelId}/spec`,
					value: spec,
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
