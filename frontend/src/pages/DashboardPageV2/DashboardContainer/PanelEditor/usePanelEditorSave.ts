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
 * Persists panel edits for the V2 editor via RFC-6902 JSON Patch.
 *
 * Replaces the whole panel spec in one `add` op against `/spec/panels/{panelId}/spec`
 * with the editor's draft spec — so every edit the config pane makes (display,
 * formatting/axes/legend/chart-appearance under `plugin.spec`, `legend.customColors`,
 * context links) is persisted, not just the title/description. `add` doubles as
 * create-or-replace, so panels that loaded without a sub-object are handled without a
 * separate existence check. The draft carries `queries` unchanged until the V2 query
 * builder lands, so replacing the whole spec is safe.
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
