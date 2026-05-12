import { useMemo } from 'react';
import {
	closestCenter,
	DndContext,
	DragEndEvent,
	PointerSensor,
	useSensor,
	useSensors,
} from '@dnd-kit/core';
import {
	arrayMove,
	SortableContext,
	useSortable,
	verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@signozhq/ui/button';
import OverlayScrollbar from 'components/OverlayScrollbar/OverlayScrollbar';
import { GripVertical } from '@signozhq/icons';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';

function SortableField({
	field,
	onRemove,
	allowDrag,
}: {
	field: BaseAutocompleteData;
	onRemove: (field: BaseAutocompleteData) => void;
	allowDrag: boolean;
}): JSX.Element {
	const { attributes, listeners, setNodeRef, transform, transition } =
		useSortable({ id: field.key });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
	};

	return (
		<div
			ref={setNodeRef}
			style={style}
			className={`fs-field-item ${allowDrag ? 'drag-enabled' : 'drag-disabled'}`}
		>
			<div {...attributes} {...listeners} className="drag-handle">
				{allowDrag && <GripVertical size={14} />}
				<span className="fs-field-key">{field.key}</span>
			</div>
			<Button
				className="remove-field-btn periscope-btn"
				variant="outlined"
				color="destructive"
				size="sm"
				onClick={(): void => onRemove(field)}
			>
				Remove
			</Button>
		</div>
	);
}

interface AddedFieldsProps {
	inputValue: string;
	fields: BaseAutocompleteData[];
	onFieldsChange: (fields: BaseAutocompleteData[]) => void;
}

function AddedFields({
	inputValue,
	fields,
	onFieldsChange,
}: AddedFieldsProps): JSX.Element {
	const sensors = useSensors(useSensor(PointerSensor));

	const handleDragEnd = (event: DragEndEvent): void => {
		const { active, over } = event;
		if (over && active.id !== over.id) {
			const oldIndex = fields.findIndex((f) => f.key === active.id);
			const newIndex = fields.findIndex((f) => f.key === over.id);
			onFieldsChange(arrayMove(fields, oldIndex, newIndex));
		}
	};

	const filteredFields = useMemo(
		() =>
			fields.filter((f) => f.key.toLowerCase().includes(inputValue.toLowerCase())),
		[fields, inputValue],
	);

	const handleRemove = (field: BaseAutocompleteData): void => {
		onFieldsChange(fields.filter((f) => f.key !== field.key));
	};

	const allowDrag = inputValue.length === 0;

	return (
		<div className="fs-section fs-added">
			<div className="fs-section-header">ADDED FIELDS</div>
			<div className="fs-added-list">
				<OverlayScrollbar>
					<DndContext
						sensors={sensors}
						collisionDetection={closestCenter}
						onDragEnd={handleDragEnd}
					>
						{filteredFields.length === 0 ? (
							<div className="fs-no-values">No values found</div>
						) : (
							<SortableContext
								items={fields.map((f) => f.key)}
								strategy={verticalListSortingStrategy}
								disabled={!allowDrag}
							>
								{filteredFields.map((field) => (
									<SortableField
										key={field.key}
										field={field}
										onRemove={handleRemove}
										allowDrag={allowDrag}
									/>
								))}
							</SortableContext>
						)}
					</DndContext>
				</OverlayScrollbar>
			</div>
		</div>
	);
}

export default AddedFields;
