import type { DragEndEvent } from '@dnd-kit/core';
import {
	DndContext,
	PointerSensor,
	useSensor,
	useSensors,
} from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
	SortableContext,
	verticalListSortingStrategy,
} from '@dnd-kit/sortable';

import VariableRow from '../VariableRow/VariableRow';
import type { VariableFormModel } from '../../variableFormModel';
import styles from './VariablesList.module.scss';

interface VariablesListProps {
	variables: VariableFormModel[];
	canEdit: boolean;
	/** Index whose delete is awaiting inline confirmation, if any. */
	confirmingIndex: number | null;
	onEdit: (index: number) => void;
	onRequestDelete: (index: number) => void;
	onConfirmDelete: (index: number) => void;
	onCancelDelete: () => void;
	onMove: (from: number, to: number) => void;
	onApplyToAll: (index: number) => void;
}

function VariablesList({
	variables,
	canEdit,
	confirmingIndex,
	onEdit,
	onRequestDelete,
	onConfirmDelete,
	onCancelDelete,
	onMove,
	onApplyToAll,
}: VariablesListProps): JSX.Element {
	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 1 } }),
	);

	const handleDragEnd = ({ active, over }: DragEndEvent): void => {
		if (!over || active.id === over.id) {
			return;
		}
		const from = variables.findIndex((v) => v.name === active.id);
		const to = variables.findIndex((v) => v.name === over.id);
		if (from !== -1 && to !== -1) {
			onMove(from, to);
		}
	};

	return (
		<div className={styles.table} data-testid="variables-list">
			<div className={styles.headerRow}>
				<span className={styles.headerCell}>Variable</span>
				<span className={styles.headerCell}>Description</span>
			</div>
			<DndContext
				sensors={sensors}
				modifiers={[restrictToVerticalAxis]}
				onDragEnd={handleDragEnd}
			>
				<SortableContext
					items={variables.map((v) => v.name)}
					strategy={verticalListSortingStrategy}
				>
					<div className={styles.list}>
						{variables.map((variable, index) => (
							<VariableRow
								key={variable.name || `variable-${index}`}
								variable={variable}
								index={index}
								canEdit={canEdit}
								isConfirmingDelete={confirmingIndex === index}
								onEdit={onEdit}
								onRequestDelete={onRequestDelete}
								onConfirmDelete={onConfirmDelete}
								onCancelDelete={onCancelDelete}
								onApplyToAll={onApplyToAll}
							/>
						))}
					</div>
				</SortableContext>
			</DndContext>
		</div>
	);
}

export default VariablesList;
