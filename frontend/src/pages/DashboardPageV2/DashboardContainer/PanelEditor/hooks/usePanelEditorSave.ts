import { useCallback } from 'react';
import { useQueryClient } from 'react-query';
import { v4 as uuid } from 'uuid';
import { getGetDashboardV2QueryKey } from 'api/generated/services/dashboard';
import {
	type DashboardtypesJSONPatchOperationDTO,
	type DashboardtypesPanelSpecDTO,
	DashboardtypesPanelKindDTO,
	DashboardtypesPatchOpDTO,
	type GetDashboardV2200,
} from 'api/generated/services/sigNoz.schemas';

import { useOptimisticPatch } from '../../hooks/useOptimisticPatch';
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
	const { patchAsync, isPatching, error } = useOptimisticPatch(dashboardId);

	const save = useCallback(
		async (spec: DashboardtypesPanelSpecDTO): Promise<void> => {
			let ops: DashboardtypesJSONPatchOperationDTO[];
			if (isNew) {
				// Resolve the target section against the freshest dashboard we have.
				const dashboardQueryKey = getGetDashboardV2QueryKey({ id: dashboardId });
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

			// Optimistic cache write + settle refetch (replaces the manual invalidate).
			await patchAsync(ops);
		},
		[dashboardId, panelId, isNew, layoutIndex, patchAsync, queryClient],
	);

	return { save, isSaving: isPatching, error };
}
