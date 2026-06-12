import { useEffect, useMemo, useState } from 'react';
import { Plus } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { Typography } from '@signozhq/ui/typography';
import type { DashboardtypesGettableDashboardV2DTO } from 'api/generated/services/sigNoz.schemas';

import { useDashboardStore } from '../../store/useDashboardStore';
import { useSaveVariables } from './useSaveVariables';
import { dtoToFormModel } from './variableAdapters';
import {
	emptyVariableFormModel,
	type VariableFormModel,
} from './variableModel';
import VariableForm from './VariableForm/VariableForm';
import VariablesList from './VariablesList';
import styles from './Variables.module.scss';

interface VariablesSettingsProps {
	dashboard: DashboardtypesGettableDashboardV2DTO;
}

/** `null` index = adding a new variable; a number = editing that row. */
type EditingState = { index: number | null } | null;

function VariablesSettings({ dashboard }: VariablesSettingsProps): JSX.Element {
	const isEditable = useDashboardStore((s) => s.isEditable);
	const { save, isSaving } = useSaveVariables();

	const initialModels = useMemo(
		() => (dashboard.spec?.variables ?? []).map(dtoToFormModel),
		[dashboard.spec?.variables],
	);
	const [variables, setVariables] = useState<VariableFormModel[]>(initialModels);

	// Resync from the dashboard after a save round-trips (refetch bumps updatedAt).
	useEffect(() => {
		setVariables(initialModels);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [dashboard.updatedAt]);

	const [editing, setEditing] = useState<EditingState>(null);
	const [confirmDeleteIndex, setConfirmDeleteIndex] = useState<number | null>(
		null,
	);

	const editingModel: VariableFormModel | null = useMemo(() => {
		if (!editing) {
			return null;
		}
		return editing.index === null
			? emptyVariableFormModel()
			: variables[editing.index];
	}, [editing, variables]);

	const existingNames = useMemo(() => {
		const self = editing?.index ?? null;
		return variables.filter((_, i) => i !== self).map((v) => v.name);
	}, [variables, editing]);

	const persist = (next: VariableFormModel[]): void => {
		setVariables(next);
		void save(next);
	};

	const handleFormSave = (model: VariableFormModel): void => {
		const next = [...variables];
		if (editing?.index == null) {
			next.push(model);
		} else {
			next[editing.index] = model;
		}
		setEditing(null);
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

	// Detail view — edit/new form replaces the list in place (no modal).
	if (editingModel) {
		return (
			<VariableForm
				initial={editingModel}
				existingNames={existingNames}
				isSaving={isSaving}
				onClose={(): void => setEditing(null)}
				onSave={handleFormSave}
			/>
		);
	}

	// Master view — the variables list.
	return (
		<div className={styles.container}>
			<div className={styles.header}>
				<div className={styles.titleRow}>
					<Typography.Text className={styles.title}>Variables</Typography.Text>
					<Typography.Text className={styles.subtitle}>
						Define variables to parameterize panel queries.
					</Typography.Text>
				</div>
				{isEditable ? (
					<Button
						variant="solid"
						color="primary"
						prefix={<Plus size={14} />}
						onClick={(): void => setEditing({ index: null })}
						testId="add-variable"
					>
						New variable
					</Button>
				) : null}
			</div>

			{variables.length === 0 ? (
				<div className={styles.empty}>
					<Typography.Text>No variables defined yet.</Typography.Text>
				</div>
			) : (
				<VariablesList
					variables={variables}
					canEdit={isEditable}
					confirmingIndex={confirmDeleteIndex}
					onEdit={(index): void => setEditing({ index })}
					onRequestDelete={(index): void => setConfirmDeleteIndex(index)}
					onConfirmDelete={handleConfirmDelete}
					onCancelDelete={(): void => setConfirmDeleteIndex(null)}
					onMove={handleMove}
				/>
			)}
		</div>
	);
}

export default VariablesSettings;
