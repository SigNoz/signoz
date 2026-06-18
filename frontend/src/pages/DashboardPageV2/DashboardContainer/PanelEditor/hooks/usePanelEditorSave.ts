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
 * Persists panel edits for the V2 editor via RFC-6902 JSON Patch.
 *
 * Editing: replaces the whole panel spec in one `add` op against
 * `/spec/panels/{panelId}/spec` with the editor's draft spec — so every edit the
 * config pane makes (display, formatting/axes/legend/chart-appearance under
 * `plugin.spec`, `legend.customColors`, context links) plus the live query is
 * persisted. `add` doubles as create-or-replace.
 *
 * Creating (`isNew`): the draft panel doesn't exist yet, so a fresh id is minted
 * and the panel is added to `spec.panels` along with a grid item in the target
 * section (resolved from the current dashboard in cache; a section is created if
 * the dashboard has none). This is what makes "create new panel" persist only on
 * save — cancelling never touches the dashboard.
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
