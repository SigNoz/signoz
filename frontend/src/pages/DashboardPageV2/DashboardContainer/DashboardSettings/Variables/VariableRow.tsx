import type { CSSProperties } from 'react';
import { Check, GripVertical, PenLine, Trash2, X } from '@signozhq/icons';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@signozhq/ui/button';
import { Typography } from '@signozhq/ui/typography';

import type { VariableFormModel } from './variableFormModel';
import styles from './Variables.module.scss';

const TYPE_LABEL: Record<VariableFormModel['type'], string> = {
	QUERY: 'Query',
	CUSTOM: 'Custom',
	TEXT: 'Text',
	DYNAMIC: 'Dynamic',
};

interface VariableRowProps {
	variable: VariableFormModel;
	index: number;
	canEdit: boolean;
	/** True when this row's delete is awaiting inline confirmation. */
	isConfirmingDelete: boolean;
	onEdit: (index: number) => void;
	onRequestDelete: (index: number) => void;
	onConfirmDelete: (index: number) => void;
	onCancelDelete: () => void;
}

/** A single draggable variable row (drag handle + meta + inline actions). */
function VariableRow({
	variable,
	index,
	canEdit,
	isConfirmingDelete,
	onEdit,
	onRequestDelete,
	onConfirmDelete,
	onCancelDelete,
}: VariableRowProps): JSX.Element {
	const {
		attributes,
		listeners,
		setNodeRef,
		setActivatorNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: variable.name });

	const style: CSSProperties = {
		transform: CSS.Transform.toString(transform),
		transition,
		...(isDragging ? { position: 'relative', zIndex: 1, opacity: 0.8 } : {}),
	};

	return (
		<div
			ref={setNodeRef}
			style={style}
			className={styles.row}
			data-testid={`variable-row-${variable.name}`}
		>
			<div className={styles.rowMain}>
				{canEdit ? (
					<span
						ref={setActivatorNodeRef}
						className={styles.dragHandle}
						aria-label="Reorder variable"
						{...attributes}
						{...listeners}
					>
						<GripVertical size={14} />
					</span>
				) : null}
				<Typography.Text className={styles.varName}>
					${variable.name}
				</Typography.Text>
				<span className={styles.typeTag}>{TYPE_LABEL[variable.type]}</span>
				{variable.description ? (
					<Typography.Text className={styles.varDesc}>
						{variable.description}
					</Typography.Text>
				) : null}
			</div>

			{canEdit && isConfirmingDelete ? (
				<div className={styles.rowActions}>
					<Typography.Text className={styles.confirmText}>Delete?</Typography.Text>
					<Button
						variant="ghost"
						color="destructive"
						size="icon"
						onClick={(): void => onConfirmDelete(index)}
						aria-label="Confirm delete"
						testId={`variable-delete-confirm-${variable.name}`}
					>
						<Check size={14} />
					</Button>
					<Button
						variant="ghost"
						color="secondary"
						size="icon"
						onClick={onCancelDelete}
						aria-label="Cancel delete"
					>
						<X size={14} />
					</Button>
				</div>
			) : null}

			{canEdit && !isConfirmingDelete ? (
				<div className={styles.rowActions}>
					<Button
						variant="ghost"
						color="secondary"
						size="icon"
						onClick={(): void => onEdit(index)}
						aria-label="Edit variable"
						testId={`variable-edit-${variable.name}`}
					>
						<PenLine size={14} />
					</Button>
					<Button
						variant="ghost"
						color="secondary"
						size="icon"
						onClick={(): void => onRequestDelete(index)}
						aria-label="Delete variable"
						testId={`variable-delete-${variable.name}`}
					>
						<Trash2 size={14} />
					</Button>
				</div>
			) : null}
		</div>
	);
}

export default VariableRow;
