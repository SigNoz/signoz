import {
	type Dispatch,
	type SetStateAction,
	useCallback,
	useMemo,
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
import {
	VARIABLE_TYPE_EVENT_LABEL,
	type VariableFormModel,
} from '../variableFormModel';
import {
	applyVariableQueryEdits,
	buildVariableImpactPatch,
} from '../utils/variableImpactPatch';
import {
	findApplyUsages,
	findVariableUsages,
	isVariableAppliedToAllPanels,
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
	/** Where an `apply` impact came from — drives the confirm analytics event. */
	origin?: 'form' | 'applyToAll';
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
	requestApplyToAll: (index: number) => void;
	/** Names of dynamic variables already applied to every panel (button disabled). */
	appliedToAllNames: Set<string>;
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

			const isRename = !!oldName && oldName !== formModel.name;
			// Both rename and apply-to-panels edits are reviewed in the impact dialog
			// before persisting — never applied silently.
			const renameUsages = isRename
				? findVariableUsages(dashboard, oldName as string, 'rename', formModel.name)
				: [];
			const applyUsages =
				formModel.type === 'DYNAMIC' && formModel.dynamicAttribute
					? findApplyUsages(
							dashboard,
							formModel.dynamicAttribute,
							formModel.name,
							oldName ?? formModel.name,
							selectedPanelIds,
						)
					: [];

			// Apply usages win per (panel, envelope) over a plain rename rewrite.
			const byId = new Map<string, VariableUsage>();
			renameUsages.forEach((usage) => byId.set(usage.id, usage));
			applyUsages.forEach((usage) => byId.set(usage.id, usage));
			const usages = [...byId.values()];

			if (usages.length > 0) {
				setIsEditing(null);
				setImpact({
					mode: isRename ? 'rename' : 'apply',
					variableName: oldName ?? formModel.name,
					newName: formModel.name,
					usages,
					nextVariables: next,
				});
				return;
			}

			// No cross-query impact — persist directly; keep the form open on failure.
			void (async (): Promise<void> => {
				const saved = await save(next);
				if (!saved) {
					return;
				}
				setIsEditing(null);
				setVariables(next);
			})();
		},
		[dashboard, isEditing, save, setIsEditing, setVariables, variables],
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

	// "Apply to all": review the additive changes across every panel before applying.
	const requestApplyToAll = useCallback(
		(index: number): void => {
			const variable = variables[index];
			if (!variable || variable.type !== 'DYNAMIC' || !variable.dynamicAttribute) {
				return;
			}
			const allPanelIds = Object.keys(dashboard.spec.panels ?? {});
			const usages = findApplyUsages(
				dashboard,
				variable.dynamicAttribute,
				variable.name,
				variable.name,
				allPanelIds,
			);
			if (usages.length === 0) {
				return;
			}
			setImpact({
				mode: 'apply',
				variableName: variable.name,
				newName: variable.name,
				usages,
				nextVariables: variables,
				origin: 'applyToAll',
			});
		},
		[dashboard, variables],
	);

	// A dynamic variable is "applied to all" when every panel query already
	// references it — i.e. the apply review would be empty. Disables the button.
	const appliedToAllNames = useMemo(() => {
		const names = new Set<string>();
		variables.forEach((variable) => {
			if (variable.type !== 'DYNAMIC' || !variable.dynamicAttribute) {
				return;
			}
			if (
				isVariableAppliedToAllPanels(
					dashboard,
					variable.dynamicAttribute,
					variable.name,
				)
			) {
				names.add(variable.name);
			}
		});
		return names;
	}, [dashboard, variables]);

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
				let message: string;
				if (impact.mode === 'rename') {
					message = `Renamed to $${impact.newName}`;
				} else if (impact.mode === 'apply') {
					message = `Applied $${impact.variableName} to panels`;
				} else {
					message = `Deleted $${impact.variableName}`;
				}
				toast.success(message);
				if (impact.mode === 'delete') {
					const deleted = variables.find((v) => v.name === impact.variableName);
					void logEvent(DashboardDetailEvents.VariableDeleted, {
						variableType: deleted
							? VARIABLE_TYPE_EVENT_LABEL[deleted.type]
							: undefined,
						hadReferences: true,
						dashboardId,
					});
				} else if (impact.mode === 'apply' && impact.origin === 'applyToAll') {
					void logEvent(DashboardDetailEvents.ApplyToAllConfirmed, {
						variableType: 'dynamic',
						dashboardId,
					});
				}
			} catch {
				let message: string;
				if (impact.mode === 'rename') {
					message = 'Could not rename the variable';
				} else if (impact.mode === 'apply') {
					message = 'Could not apply the variable to panels';
				} else {
					message = 'Could not delete the variable';
				}
				toast.error(message);
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
		requestApplyToAll,
		appliedToAllNames,
		handleImpactConfirm,
	};
}
