import { useEffect, useMemo, useState } from 'react';
import { toast } from '@signozhq/ui/sonner';
import logEvent from 'api/common/logEvent';
import type { DashboardtypesGettableDashboardV2DTO } from 'api/generated/services/sigNoz.schemas';
import cx from 'classnames';
import { DashboardDetailEvents } from 'pages/DashboardPageV2/constants/events';

import settingsStyles from '../DashboardSettings.module.scss';
import { useOptimisticPatch } from '../../hooks/useOptimisticPatch';
import { useDashboardStore } from '../../store/useDashboardStore';
import {
	buildApplyVariableToPanelsPatch,
	getPanelIdsReferencingVariable,
} from './utils/applyVariableToPanelsPatch';
import { useSaveVariables } from './hooks/useSaveVariables';
import { useVariableListActions } from './hooks/useVariableListActions';
import { dtoToFormModel } from './variableAdapters';
import {
	emptyVariableFormModel,
	type VariableFormModel,
} from './variableFormModel';
import VariableForm from './VariableForm/VariableForm';
import VariableImpactDialog from './VariableImpactDialog/VariableImpactDialog';
import VariablesList from './components/VariablesList/VariablesList';
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
	const dashboardId = useDashboardStore((s) => s.dashboardId);
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
	const [applyToAllIndex, setApplyToAllIndex] = useState<number | null>(null);

	const {
		confirmDeleteIndex,
		setConfirmDeleteIndex,
		impact,
		setImpact,
		handleFormSave,
		handleMove,
		requestDelete,
		handleConfirmDelete,
		handleImpactConfirm,
	} = useVariableListActions({
		dashboard,
		variables,
		setVariables,
		isEditing,
		setIsEditing,
		save,
		patchAsync,
	});

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
			void logEvent(DashboardDetailEvents.ApplyToAllConfirmed, {
				variableType: 'dynamic',
				dashboardId,
			});
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
						onRequestDelete={requestDelete}
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
			<VariableImpactDialog
				open={impact !== null}
				mode={impact?.mode ?? 'delete'}
				variableName={impact?.variableName ?? ''}
				newName={impact?.newName}
				usages={impact?.usages ?? []}
				isLoading={isPatching}
				onConfirm={(resolved): void => void handleImpactConfirm(resolved)}
				onClose={(): void => setImpact(null)}
			/>
		</div>
	);
}

export default VariablesSettings;
