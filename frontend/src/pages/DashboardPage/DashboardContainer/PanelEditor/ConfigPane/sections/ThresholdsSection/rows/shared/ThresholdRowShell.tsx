import type { ReactNode } from 'react';
import { Pencil, Trash2 } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { Typography } from '@signozhq/ui/typography';

import styles from '../../ThresholdsSection.module.scss';

interface ThresholdRowShellProps {
	index: number;
	/** testId prefix per variant: `threshold` | `comparison-threshold` | `table-threshold`. */
	testIdPrefix: string;
	marker: ReactNode;
	isEditing: boolean;
	isNew: boolean;
	title: ReactNode;
	subtitle?: ReactNode;
	/** Edit-mode fields. */
	children: ReactNode;
	onEdit: () => void;
	onSave: () => void;
	onDiscard: () => void;
	onRemove: () => void;
}

/**
 * Shared chrome for a threshold row's V1-style view/edit modes: the view summary with
 * Edit/Delete, and the edit form's Discard/Save actions. Each variant supplies its own
 * `summary` and field `children`; everything else (layout, buttons, testIds) is shared.
 */
function ThresholdRowShell({
	index,
	testIdPrefix,
	marker,
	isEditing,
	isNew,
	title,
	subtitle,
	children,
	onEdit,
	onSave,
	onDiscard,
	onRemove,
}: ThresholdRowShellProps): JSX.Element {
	if (!isEditing) {
		return (
			<div className={styles.viewRow}>
				{marker}
				<div className={styles.viewText}>
					<span className={styles.viewValue}>{title}</span>
					{subtitle && <span className={styles.viewLabel}>{subtitle}</span>}
				</div>
				<Button
					type="button"
					variant="ghost"
					color="secondary"
					size="icon"
					aria-label={`Edit threshold ${index + 1}`}
					data-testid={`${testIdPrefix}-edit-${index}`}
					onClick={onEdit}
				>
					<Pencil size={14} />
				</Button>
				<Button
					type="button"
					variant="ghost"
					color="destructive"
					size="icon"
					aria-label={`Remove threshold ${index + 1}`}
					data-testid={`${testIdPrefix}-remove-${index}`}
					onClick={onRemove}
				>
					<Trash2 size={14} />
				</Button>
			</div>
		);
	}

	return (
		<div className={styles.editRow}>
			<Typography.Text className={styles.editTitle}>
				{isNew ? 'New threshold' : 'Edit threshold'}
			</Typography.Text>
			{children}

			<div className={styles.actions}>
				<Button
					type="button"
					variant="outlined"
					color="secondary"
					data-testid={`${testIdPrefix}-discard-${index}`}
					onClick={onDiscard}
				>
					Cancel
				</Button>
				<Button
					type="button"
					variant="solid"
					color="primary"
					data-testid={`${testIdPrefix}-save-${index}`}
					onClick={onSave}
				>
					Save
				</Button>
			</div>
		</div>
	);
}

export default ThresholdRowShell;
