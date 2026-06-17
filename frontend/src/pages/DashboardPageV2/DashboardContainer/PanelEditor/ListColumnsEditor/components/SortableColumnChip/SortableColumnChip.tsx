import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
			<button
				type="button"
				className={styles.grip}
				aria-label={`Reorder ${name}`}
				{...attributes}
				{...listeners}
			>
				<GripVertical size={12} />
			</button>
			<span className={styles.chipName} title={name}>
				{name}
			</span>
			<button
				type="button"
				className={styles.remove}
				aria-label={`Remove ${name}`}
				data-testid="list-column-remove"
				onClick={(): void => onRemove(name)}
			>
				<X size={12} />
			</button>
		</div>
	);
}

export default SortableColumnChip;
