import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@signozhq/ui/button';
import { GripVertical, X } from '@signozhq/icons';

import styles from './SortableColumnChip.module.scss';

interface SortableColumnChipProps {
	/** Stable sortable id (the column name). */
	id: string;
	name: string;
	onRemove: (name: string) => void;
}

/** A single draggable column chip: grip handle, field name, remove button. */
function SortableColumnChip({
	id,
	name,
	onRemove,
}: SortableColumnChipProps): JSX.Element {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id });

	// dnd-kit drives the drag transform per-frame, so this must be inline.
	const style: React.CSSProperties = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.5 : undefined,
	};

	return (
		<div ref={setNodeRef} style={style} className={styles.chip}>
			<Button
				type="button"
				variant="ghost"
				color="secondary"
				size="icon"
				className={styles.grip}
				aria-label={`Reorder ${name}`}
				{...attributes}
				{...listeners}
			>
				<GripVertical size={12} />
			</Button>
			<span className={styles.chipName} title={name}>
				{name}
			</span>
			<Button
				type="button"
				variant="ghost"
				color="secondary"
				size="icon"
				className={styles.remove}
				aria-label={`Remove ${name}`}
				testId="list-column-remove"
				onClick={(): void => onRemove(name)}
			>
				<X size={12} />
			</Button>
		</div>
	);
}

export default SortableColumnChip;
