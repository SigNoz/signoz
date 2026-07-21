import {
	type Dispatch,
	type SetStateAction,
	useCallback,
	useState,
} from 'react';
import logEvent from 'api/common/logEvent';
import { toast } from '@signozhq/ui/sonner';
import type {
	DashboardtypesGettableDashboardV2DTO,
	DashboardtypesJSONPatchOperationDTO,
} from 'api/generated/services/sigNoz.schemas';
import { DashboardDetailEvents } from 'pages/DashboardPageV2/constants/events';

import { useDashboardStore } from '../../../store/useDashboardStore';
import { buildSyncVariableToPanelsPatch } from '../utils/applyVariableToPanelsPatch';
import {
	VARIABLE_TYPE_EVENT_LABEL,
	type VariableFormModel,
} from '../variableFormModel';
import {
	applyVariableQueryEdits,
	buildVariableImpactPatch,
} from '../utils/variableImpactPatch';
import {
	findVariableUsages,
	type VariableImpactMode,
	type VariableUsage,
} from '../utils/variableUsages';
import type { EditingState } from '../types';

/**
 * A pending rename/delete that touches other queries — resolved via the impact
 * dialog before it is applied. `nextVariables` is the array to persist (with the
 * rename/delete already applied), before any variable-query edits.
 */
export interface VariableImpact {
	mode: VariableImpactMode;
	variableName: string;
	newName?: string;
	usages: VariableUsage[];
	nextVariables: VariableFormModel[];
}

interface UseVariableListActionsParams {
	dashboard: DashboardtypesGettableDashboardV2DTO;
	variables: VariableFormModel[];
	setVariables: Dispatch<SetStateAction<VariableFormModel[]>>;
	isEditing: EditingState;
	setIsEditing: Dispatch<SetStateAction<EditingState>>;
	save: (variables: VariableFormModel[]) => Promise<boolean>;
	patchAsync: (ops: DashboardtypesJSONPatchOperationDTO[]) => Promise<unknown>;
}

interface UseVariableListActions {
	confirmDeleteIndex: number | null;
	setConfirmDeleteIndex: Dispatch<SetStateAction<number | null>>;
	impact: VariableImpact | null;
	setImpact: Dispatch<SetStateAction<VariableImpact | null>>;
	handleFormSave: (
		formModel: VariableFormModel,
		selectedPanelIds: string[],
	) => void;
	handleMove: (from: number, to: number) => void;
	requestDelete: (index: number) => void;
	handleConfirmDelete: (index: number) => void;
	handleImpactConfirm: (resolvedUsages: VariableUsage[]) => Promise<void>;
}

/**
 * Variables-list mutation and impact-flow actions: reorder, save/rename, and the
 * referenced-variable delete/rename flows resolved through the impact dialog.
 * Owns the delete-confirm and pending-impact state the list renders against.
 */
export function useVariableListActions({
	dashboard,
	variables,
	setVariables,
	isEditing,
	setIsEditing,
	save,
	patchAsync,
}: UseVariableListActionsParams): UseVariableListActions {
	const dashboardId = useDashboardStore((s) => s.dashboardId);
	const [confirmDeleteIndex, setConfirmDeleteIndex] = useState<number | null>(
		null,
	);
	const [impact, setImpact] = useState<VariableImpact | null>(null);

	const persist = useCallback(
		(next: VariableFormModel[]): void => {
			setVariables(next);
			void save(next);
		},
		[save, setVariables],
	);

	const handleFormSave = useCallback(
		(formModel: VariableFormModel, selectedPanelIds: string[]): void => {
			const editingIndex = isEditing?.type === 'edit' ? isEditing.index : null;
			const oldName = editingIndex !== null ? variables[editingIndex].name : null;

			const next = [...variables];
			if (isEditing?.type === 'new') {
				next.push(formModel);
			} else if (editingIndex !== null) {
				next[editingIndex] = formModel;
			}

			// A rename that other queries/variables reference must be reviewed first, so
			// the references are rewritten alongside the rename (never left dangling).
			if (oldName && oldName !== formModel.name) {
				const usages = findVariableUsages(
					dashboard,
					oldName,
					'rename',
					formModel.name,
				);
				if (usages.length > 0) {
					setIsEditing(null);
					setImpact({
						mode: 'rename',
						variableName: oldName,
						newName: formModel.name,
						usages,
						nextVariables: next,
					});
					return;
				}
			}

			setIsEditing(null);
			setVariables(next);
			void (async (): Promise<void> => {
				const saved = await save(next);
				if (!saved || formModel.type !== 'DYNAMIC') {
					return;
				}
				const ops = buildSyncVariableToPanelsPatch(
					dashboard.spec.panels,
					formModel.dynamicAttribute,
					formModel.name,
					selectedPanelIds,
				);
				if (ops.length === 0) {
					return;
				}
				try {
					await patchAsync(ops);
				} catch {
					toast.error('Could not update panels');
				}
			})();
		},
		[
			dashboard,
			isEditing,
			patchAsync,
			save,
			setIsEditing,
			setVariables,
			variables,
		],
	);

	const handleMove = useCallback(
		(from: number, to: number): void => {
			if (to < 0 || to >= variables.length) {
				return;
			}
			const next = [...variables];
			const [moved] = next.splice(from, 1);
			next.splice(to, 0, moved);
			persist(next);
			void logEvent(DashboardDetailEvents.VariableReordered, {
				variableType: VARIABLE_TYPE_EVENT_LABEL[moved.type],
				fromIndex: from,
				toIndex: to,
				dashboardId,
			});
		},
		[dashboardId, persist, variables],
	);

	const handleConfirmDelete = useCallback(
		(index: number): void => {
			void logEvent(DashboardDetailEvents.VariableDeleted, {
				variableType: VARIABLE_TYPE_EVENT_LABEL[variables[index].type],
				hadReferences: false,
				dashboardId,
			});
			persist(variables.filter((_, i) => i !== index));
			setConfirmDeleteIndex(null);
		},
		[dashboardId, persist, variables],
	);

	// Delete requested from the list: if the variable is referenced anywhere, block
	// and open the impact dialog; otherwise fall through to the simple confirm.
	const requestDelete = useCallback(
		(index: number): void => {
			const usages = findVariableUsages(
				dashboard,
				variables[index].name,
				'delete',
			);
			if (usages.length > 0) {
				setImpact({
					mode: 'delete',
					variableName: variables[index].name,
					usages,
					nextVariables: variables.filter((_, i) => i !== index),
				});
				return;
			}
			setConfirmDeleteIndex(index);
		},
		[dashboard, variables],
	);

	// Applies a resolved rename/delete: the variables array (rename/delete + edited
	// variable queries) and each touched panel's queries, in one atomic patch.
	const handleImpactConfirm = useCallback(
		async (resolvedUsages: VariableUsage[]): Promise<void> => {
			if (!impact) {
				return;
			}
			const nextVariables = applyVariableQueryEdits(
				impact.nextVariables,
				resolvedUsages,
			);
			const ops = buildVariableImpactPatch(
				dashboard,
				nextVariables,
				resolvedUsages,
			);
			setVariables(nextVariables);
			try {
				await patchAsync(ops);
				toast.success(
					impact.mode === 'rename'
						? `Renamed to $${impact.newName}`
						: `Deleted $${impact.variableName}`,
				);
				if (impact.mode === 'delete') {
					const deleted = variables.find((v) => v.name === impact.variableName);
					void logEvent(DashboardDetailEvents.VariableDeleted, {
						variableType: deleted
							? VARIABLE_TYPE_EVENT_LABEL[deleted.type]
							: undefined,
						hadReferences: true,
						dashboardId,
					});
				}
			} catch {
				toast.error(
					impact.mode === 'rename'
						? 'Could not rename the variable'
						: 'Could not delete the variable',
				);
			}
			setImpact(null);
		},
		[dashboard, dashboardId, impact, patchAsync, setVariables, variables],
	);

	return {
		confirmDeleteIndex,
		setConfirmDeleteIndex,
		impact,
		setImpact,
		handleFormSave,
		handleMove,
		requestDelete,
		handleConfirmDelete,
		handleImpactConfirm,
	};
}
