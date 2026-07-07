import { useEffect, useMemo, useState } from 'react';
import type { DashboardtypesGettableDashboardV2DTO } from 'api/generated/services/sigNoz.schemas';
import cx from 'classnames';

import settingsStyles from '../DashboardSettings.module.scss';
import { useDashboardStore } from '../../store/useDashboardStore';
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

	const persist = (next: VariableFormModel[]): void => {
		setVariables(next);
		void save(next);
	};

	const handleFormSave = (Formmodel: VariableFormModel): void => {
		const next = [...variables];
		if (isEditing?.type === 'new') {
			next.push(Formmodel);
		} else if (isEditing?.type === 'edit') {
			next[isEditing.index] = Formmodel;
		}
		setIsEditing(null);
		persist(next);
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

	if (editingFormModel) {
		return (
			<VariableForm
				initial={editingFormModel}
				siblings={siblings}
				isNew={isEditing?.type === 'new'}
				isSaving={isSaving}
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
					<div className={styles.header}>
						<AddVariableButton isEditable={isEditable} setIsEditing={setIsEditing} />
					</div>
					<VariablesList
						variables={variables}
						canEdit={isEditable}
						confirmingIndex={confirmDeleteIndex}
						onEdit={(index): void => setIsEditing({ type: 'edit', index })}
						onRequestDelete={(index): void => setConfirmDeleteIndex(index)}
						onConfirmDelete={handleConfirmDelete}
						onCancelDelete={(): void => setConfirmDeleteIndex(null)}
						onMove={handleMove}
					/>
				</>
			)}
		</div>
	);
}

export default VariablesSettings;
