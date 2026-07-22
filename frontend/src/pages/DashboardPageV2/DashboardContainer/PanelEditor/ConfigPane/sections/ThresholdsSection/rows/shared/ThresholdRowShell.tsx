import type { ReactNode } from 'react';
import { Check, Pencil, Trash2, X } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';

import styles from '../../ThresholdsSection.module.scss';

interface ThresholdRowShellProps {
	index: number;
	/** testId prefix per variant: `threshold` | `comparison-threshold` | `table-threshold`. */
	testIdPrefix: string;
	/** Swatch color shown in view mode. */
	color: string;
	isEditing: boolean;
	/** Compact view-mode summary, rendered between the color dot and the actions. */
	summary: ReactNode;
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
	color,
	isEditing,
	summary,
	children,
	onEdit,
	onSave,
	onDiscard,
	onRemove,
}: ThresholdRowShellProps): JSX.Element {
	if (!isEditing) {
		return (
			<div className={styles.viewRow}>
				<span className={styles.dot} style={{ backgroundColor: color }} />
				{summary}
				<div className={styles.spacer} />
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
			{children}

			<div className={styles.actions}>
				<Button
					type="button"
					variant="outlined"
					color="secondary"
					prefix={<X size={14} />}
					data-testid={`${testIdPrefix}-discard-${index}`}
					onClick={onDiscard}
				>
					Discard
				</Button>
				<Button
					type="button"
					variant="solid"
					color="primary"
					prefix={<Check size={14} />}
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
