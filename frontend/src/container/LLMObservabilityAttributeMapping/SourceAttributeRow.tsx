import { Button } from '@signozhq/ui/button';
import { Input } from '@signozhq/ui/input';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X } from '@signozhq/icons';

interface SourceAttributeRowProps {
	id: string;
	index: number;
	value: string;
	canRemove: boolean;
	onChange: (index: number, value: string) => void;
	onRemove: (index: number) => void;
}

// A single draggable source-attribute row. Order = priority (top wins), so
// dragging reorders priority. Only the grip is a drag handle, leaving the
// input freely clickable.
function SourceAttributeRow({
	id,
	index,
	value,
	canRemove,
	onChange,
	onRemove,
}: SourceAttributeRowProps): JSX.Element {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.6 : 1,
	};

	return (
		<div className="mapper-form__source" ref={setNodeRef} style={style}>
			<button
				type="button"
				className="mapper-form__source-handle"
				aria-label="Reorder source"
				data-testid={`mapper-form-source-handle-${index}`}
				{...attributes}
				{...listeners}
			>
				<GripVertical size={14} />
			</button>
			<span className="mapper-form__source-index">{index + 1}</span>
			<Input
				className="mapper-form__source-input"
				placeholder="Source attribute key"
				value={value}
				onChange={(event): void => onChange(index, event.target.value)}
				testId={`mapper-form-source-${index}`}
			/>
			<Button
				variant="ghost"
				color="secondary"
				size="icon"
				aria-label="Remove source"
				disabled={!canRemove}
				onClick={(): void => onRemove(index)}
				testId={`mapper-form-source-remove-${index}`}
			>
				<X size={14} />
			</Button>
		</div>
	);
}

export default SourceAttributeRow;
