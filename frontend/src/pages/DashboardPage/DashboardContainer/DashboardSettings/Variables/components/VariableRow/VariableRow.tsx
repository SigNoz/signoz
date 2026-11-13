import type { CSSProperties } from 'react';
import { Check, GripVertical, PenLine, Trash2, X } from '@signozhq/icons';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@signozhq/ui/button';
import { Tooltip } from '@signozhq/ui/tooltip';
import { Typography } from '@signozhq/ui/typography';
import cx from 'classnames';

import type { VariableFormModel } from '../../variableFormModel';
import styles from './VariableRow.module.scss';

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
	/** Apply this variable's filter to all panels. Dynamic variables only. */
	onApplyToAll: (index: number) => void;
	/** True when this dynamic variable is already applied to every panel. */
	isAppliedToAll: boolean;
}

/** A single draggable variable row in the two-column (name / description) table. */
function VariableRow({
	variable,
	index,
	canEdit,
	isConfirmingDelete,
	onEdit,
	onRequestDelete,
	onConfirmDelete,
	onCancelDelete,
	onApplyToAll,
	isAppliedToAll,
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
			<div className={styles.varCell}>
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
				<Typography
					variant="code"
					size="base"
					weight="regular"
					color="primary"
					as="span"
					display="inline-block"
					minWidth={0}
					textOverflow="wrap"
				>
					{variable.name}
				</Typography>
			</div>

			<div className={styles.descCell}>
				{variable.description ? (
					<span className={styles.varDesc}>
						<Typography
							variant="code"
							size="base"
							weight="regular"
							color="archive"
							as="span"
							textOverflow="wrap"
						>
							{variable.description}
						</Typography>
					</span>
				) : (
					<span className={styles.varDescEmpty}>—</span>
				)}

				{canEdit ? (
					<div
						className={cx(styles.rowActions, {
							[styles.rowActionsVisible]: isConfirmingDelete,
						})}
					>
						{isConfirmingDelete ? (
							<>
								<Typography
									variant="paragraph"
									size="small"
									weight="regular"
									color="secondary"
									as="span"
									display="inline-block"
									marginRight={2}
									textOverflow="wrap"
								>
									Delete?
								</Typography>
								<Button
									variant="solid"
									color="danger"
									size="sm"
									icon
									onClick={(): void => onConfirmDelete(index)}
									aria-label="Confirm delete"
									testId={`variable-delete-confirm-${variable.name}`}
								>
									<Check size={14} />
								</Button>
								<Button
									variant="ghost"
									color="secondary"
									size="sm"
									icon
									onClick={onCancelDelete}
									aria-label="Cancel delete"
								>
									<X size={14} />
								</Button>
							</>
						) : (
							<>
								{variable.type === 'DYNAMIC' ? (
									<Tooltip
										side="top"
										title={
											isAppliedToAll
												? undefined
												: 'Add this variable as a filter to every panel'
										}
									>
										<Button
											disabledTooltip="Already applied to all panels"
											variant="ghost"
											color="secondary"
											size="sm"
											disabled={isAppliedToAll}
											onClick={(): void => onApplyToAll(index)}
											testId={`variable-apply-all-${variable.name}`}
										>
											Apply to all
										</Button>
									</Tooltip>
								) : null}
								<Button
									variant="ghost"
									color="secondary"
									size="sm"
									icon
									onClick={(): void => onEdit(index)}
									aria-label="Edit variable"
									testId={`variable-edit-${variable.name}`}
								>
									<PenLine size={14} />
								</Button>
								<Button
									variant="ghost"
									color="secondary"
									size="sm"
									icon
									onClick={(): void => onRequestDelete(index)}
									aria-label="Delete variable"
									testId={`variable-delete-${variable.name}`}
								>
									<Trash2 size={14} />
								</Button>
							</>
						)}
					</div>
				) : null}
			</div>
		</div>
	);
}

export default VariableRow;
