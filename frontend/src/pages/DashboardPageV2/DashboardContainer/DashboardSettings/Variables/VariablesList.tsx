import {
	Check,
	ChevronDown,
	ChevronUp,
	PenLine,
	Trash2,
	X,
} from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { Typography } from '@signozhq/ui/typography';

import type { VariableFormModel } from './variableModel';
import styles from './Variables.module.scss';

const TYPE_LABEL: Record<VariableFormModel['type'], string> = {
	QUERY: 'Query',
	CUSTOM: 'Custom',
	TEXT: 'Text',
	DYNAMIC: 'Dynamic',
};

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
}: VariablesListProps): JSX.Element {
	return (
		<div className={styles.list} data-testid="variables-list">
			{variables.map((variable, index) => (
				<div
					className={styles.row}
					key={variable.name || `variable-${index}`}
					data-testid={`variable-row-${variable.name}`}
				>
					<div className={styles.rowMain}>
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

					{canEdit && confirmingIndex === index ? (
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

					{canEdit && confirmingIndex !== index ? (
						<div className={styles.rowActions}>
							<Button
								variant="ghost"
								color="secondary"
								size="icon"
								disabled={index === 0}
								onClick={(): void => onMove(index, index - 1)}
								aria-label="Move up"
							>
								<ChevronUp size={14} />
							</Button>
							<Button
								variant="ghost"
								color="secondary"
								size="icon"
								disabled={index === variables.length - 1}
								onClick={(): void => onMove(index, index + 1)}
								aria-label="Move down"
							>
								<ChevronDown size={14} />
							</Button>
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
			))}
		</div>
	);
}

export default VariablesList;
