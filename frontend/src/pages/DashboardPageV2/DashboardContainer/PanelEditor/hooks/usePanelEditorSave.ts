import { useCallback } from 'react';
import { useQueryClient } from 'react-query';
import { v4 as uuid } from 'uuid';
import {
	getGetDashboardV2QueryKey,
	usePatchDashboardV2,
} from 'api/generated/services/dashboard';
import {
	type DashboardtypesJSONPatchOperationDTO,
	type DashboardtypesPanelSpecDTO,
	DashboardtypesPanelKindDTO,
	DashboardtypesPatchOpDTO,
	type GetDashboardV2200,
} from 'api/generated/services/sigNoz.schemas';

import { createPanelOps } from '../../patchOps';

interface UsePanelEditorSaveArgs {
	dashboardId: string;
	panelId: string;
	/** Creating a new panel (vs editing an existing one) — adds panel + layout. */
	isNew?: boolean;
	/** Target section for a new panel; falls back to the last/new section. */
	layoutIndex?: number;
}

interface UsePanelEditorSaveApi {
	save: (spec: DashboardtypesPanelSpecDTO) => Promise<void>;
	isSaving: boolean;
	error: Error | null;
}

/**
 * Persists panel edits for the V2 editor via RFC-6902 JSON Patch. Editing: one
 * `add` op replaces the whole spec. Creating (`isNew`): mints a fresh id and adds
 * a grid item in the target section. Persists only on save — cancelling never
 * touches the dashboard.
 */
export function usePanelEditorSave({
	dashboardId,
	panelId,
	isNew = false,
	layoutIndex,
}: UsePanelEditorSaveArgs): UsePanelEditorSaveApi {
	const queryClient = useQueryClient();
	const { mutateAsync, isLoading, error } = usePatchDashboardV2();

	const save = useCallback(
		async (spec: DashboardtypesPanelSpecDTO): Promise<void> => {
			const dashboardQueryKey = getGetDashboardV2QueryKey({ id: dashboardId });

			let ops: DashboardtypesJSONPatchOperationDTO[];
			if (isNew) {
				// Resolve the target section against the freshest dashboard we have.
				const cached =
					queryClient.getQueryData<GetDashboardV2200>(dashboardQueryKey);
				ops = createPanelOps({
					layouts: cached?.data.spec.layouts ?? [],
					layoutIndex,
					panelId: uuid(),
					panel: { kind: DashboardtypesPanelKindDTO.Panel, spec },
				});
			} else {
				ops = [
					{
						op: DashboardtypesPatchOpDTO.add,
						path: `/spec/panels/${panelId}/spec`,
						value: spec,
					},
				];
			}

			await mutateAsync({ pathParams: { id: dashboardId }, data: ops });
			await queryClient.invalidateQueries(dashboardQueryKey);
		},
		[dashboardId, panelId, isNew, layoutIndex, mutateAsync, queryClient],
	);

	return { save, isSaving: isLoading, error: (error as Error) ?? null };
}
