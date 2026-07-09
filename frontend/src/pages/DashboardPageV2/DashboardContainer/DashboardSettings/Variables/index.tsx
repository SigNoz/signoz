import { useEffect, useMemo, useState } from 'react';
import { toast } from '@signozhq/ui/sonner';
import type { DashboardtypesGettableDashboardV2DTO } from 'api/generated/services/sigNoz.schemas';
import cx from 'classnames';

import settingsStyles from '../DashboardSettings.module.scss';
import { useOptimisticPatch } from '../../hooks/useOptimisticPatch';
import { useDashboardStore } from '../../store/useDashboardStore';
import {
	buildApplyVariableToPanelsPatch,
	buildSyncVariableToPanelsPatch,
	getPanelIdsReferencingVariable,
} from './applyVariableToPanelsPatch';
import { useSaveVariables } from './useSaveVariables';
import { dtoToFormModel } from './variableAdapters';
import {
	emptyVariableFormModel,
	type VariableFormModel,
} from './variableFormModel';
import VariableForm from './VariableForm/VariableForm';
import VariablesList from './VariablesList';
import styles from './Variables.module.scss';
import AddVariableButton from './components/AddVariableButton';
import ApplyToAllDialog from './components/ApplyToAllDialog/ApplyToAllDialog';
import NoVariablesCard from './components/NoVariablesCard/NoVariablesCard';
import { EditingState } from './types';

interface VariablesSettingsProps {
	dashboard: DashboardtypesGettableDashboardV2DTO;
}

function VariablesSettings({ dashboard }: VariablesSettingsProps): JSX.Element {
	const isEditable = useDashboardStore((s) => s.isEditable);
	// The drawer destroys on close, so reading this once on mount is enough to
	// open the add-form when deep-linked (e.g. the bar's "Add variable" button).
	const openAddOnMount = useDashboardStore(
		(s) => s.settingsRequest?.addVariable ?? false,
	);
	const { save, isSaving } = useSaveVariables();
	const { patchAsync, isPatching } = useOptimisticPatch();

	const initialFormModels = useMemo(
		() => dashboard.spec.variables.map(dtoToFormModel),
		[dashboard.spec.variables],
	);
	const [variables, setVariables] =
		useState<VariableFormModel[]>(initialFormModels);

	// Resync from the dashboard after a save round-trips (refetch bumps updatedAt).
	useEffect(() => {
		setVariables(initialFormModels);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [dashboard.updatedAt]);

	const [isEditing, setIsEditing] = useState<EditingState>(
		openAddOnMount && isEditable ? { type: 'new' } : null,
	);
	const [confirmDeleteIndex, setConfirmDeleteIndex] = useState<number | null>(
		null,
	);
	const [applyToAllIndex, setApplyToAllIndex] = useState<number | null>(null);

	const editingFormModel: VariableFormModel | null = useMemo(() => {
		if (!isEditing) {
			return null;
		}
		return isEditing.type === 'new'
			? emptyVariableFormModel()
			: variables[isEditing.index];
	}, [isEditing, variables]);

	const siblings = useMemo(() => {
		const self = isEditing?.type === 'edit' ? isEditing.index : null;
		return variables.filter((_, i) => i !== self);
	}, [variables, isEditing]);

	const panelOptions = useMemo(
		() =>
			Object.entries(dashboard.spec.panels ?? {}).map(([id, panel]) => ({
				value: id,
				label: panel.spec?.display?.name || id,
			})),
		[dashboard.spec.panels],
	);

	// Panels the edited variable is already applied to — pre-checks the picker.
	const appliedPanelIds = useMemo(() => {
		if (!editingFormModel || editingFormModel.type !== 'DYNAMIC') {
			return [];
		}
		return getPanelIdsReferencingVariable(
			dashboard.spec.panels,
			editingFormModel.dynamicAttribute,
			editingFormModel.name,
		);
	}, [editingFormModel, dashboard.spec.panels]);

	const persist = (next: VariableFormModel[]): void => {
		setVariables(next);
		void save(next);
	};

	const handleFormSave = (
		formModel: VariableFormModel,
		selectedPanelIds: string[],
	): void => {
		const next = [...variables];
		if (isEditing?.type === 'new') {
			next.push(formModel);
		} else if (isEditing?.type === 'edit') {
			next[isEditing.index] = formModel;
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
	};

	const handleMove = (from: number, to: number): void => {
		if (to < 0 || to >= variables.length) {
			return;
		}
		const next = [...variables];
		const [moved] = next.splice(from, 1);
		next.splice(to, 0, moved);
		persist(next);
	};

	const handleConfirmDelete = (index: number): void => {
		persist(variables.filter((_, i) => i !== index));
		setConfirmDeleteIndex(null);
	};

	const applyToAllVariable =
		applyToAllIndex === null ? null : variables[applyToAllIndex];

	const handleConfirmApplyToAll = async (): Promise<void> => {
		if (!applyToAllVariable) {
			return;
		}
		const ops = buildApplyVariableToPanelsPatch(
			dashboard.spec.panels,
			applyToAllVariable.dynamicAttribute,
			applyToAllVariable.name,
		);
		if (ops.length === 0) {
			toast.info('No panels needed this filter.');
			setApplyToAllIndex(null);
			return;
		}
		try {
			await patchAsync(ops);
			toast.success(`Applied $${applyToAllVariable.name} to all panels`);
		} catch {
			toast.error('Could not apply the variable to panels');
		}
		setApplyToAllIndex(null);
	};

	if (editingFormModel) {
		return (
			<VariableForm
				initial={editingFormModel}
				siblings={siblings}
				isNew={isEditing?.type === 'new'}
				isSaving={isSaving}
				panelOptions={panelOptions}
				appliedPanelIds={appliedPanelIds}
				onClose={(): void => setIsEditing(null)}
				onSave={handleFormSave}
			/>
		);
	}

	// Master view — the variables list.
	return (
		<div className={cx(styles.container, settingsStyles.settingsCard)}>
			{variables.length === 0 ? (
				<NoVariablesCard isEditable={isEditable} setIsEditing={setIsEditing} />
			) : (
				<>
					<VariablesList
						variables={variables}
						canEdit={isEditable}
						confirmingIndex={confirmDeleteIndex}
						onEdit={(index): void => setIsEditing({ type: 'edit', index })}
						onRequestDelete={(index): void => setConfirmDeleteIndex(index)}
						onConfirmDelete={handleConfirmDelete}
						onCancelDelete={(): void => setConfirmDeleteIndex(null)}
						onMove={handleMove}
						onApplyToAll={(index): void => setApplyToAllIndex(index)}
					/>
					<div className={styles.footer}>
						<AddVariableButton isEditable={isEditable} setIsEditing={setIsEditing} />
					</div>
				</>
			)}
			<ApplyToAllDialog
				open={applyToAllVariable !== null}
				variableName={applyToAllVariable?.name ?? ''}
				isLoading={isPatching}
				onConfirm={(): void => void handleConfirmApplyToAll()}
				onClose={(): void => setApplyToAllIndex(null)}
			/>
		</div>
	);
}

export default VariablesSettings;
