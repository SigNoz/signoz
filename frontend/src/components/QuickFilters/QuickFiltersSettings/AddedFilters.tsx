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
import { Button } from 'antd';
import OverlayScrollbar from 'components/OverlayScrollbar/OverlayScrollbar';
import { GripVertical } from '@signozhq/icons';
import { TelemetryFieldKey } from 'types/api/v5/queryRange';

function SortableFilter({
	filter,
	onRemove,
	allowDrag,
	allowRemove,
}: {
	filter: TelemetryFieldKey;
	onRemove: (filter: TelemetryFieldKey) => void;
	allowDrag: boolean;
	allowRemove: boolean;
}): JSX.Element {
	const { attributes, listeners, setNodeRef, transform, transition } =
		useSortable({ id: filter.key as string });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
	};

	return (
		<div
			ref={setNodeRef}
			style={style}
			className={`qf-filter-item ${allowDrag ? 'drag-enabled' : 'drag-disabled'}`}
		>
			<div {...attributes} {...listeners} className="drag-handle">
				{allowDrag && <GripVertical size={16} />}
				{filter.name}
			</div>
			{allowRemove && (
				<Button
					className="remove-filter-btn periscope-btn"
					size="small"
					onClick={(): void => {
						onRemove(filter);
					}}
				>
					Remove
				</Button>
			)}
		</div>
	);
}

function AddedFilters({
	inputValue,
	addedFilters,
	setAddedFilters,
}: {
	inputValue: string;
	addedFilters: TelemetryFieldKey[];
	setAddedFilters: React.Dispatch<React.SetStateAction<TelemetryFieldKey[]>>;
}): JSX.Element {
	const sensors = useSensors(useSensor(PointerSensor));

	const handleDragEnd = (event: DragEndEvent): void => {
		const { active, over } = event;

		if (over && active.id !== over.id) {
			setAddedFilters((items) => {
				const oldIndex = items.findIndex((item) => item.key === active.id);
				const newIndex = items.findIndex((item) => item.key === over.id);

				return arrayMove(items, oldIndex, newIndex);
			});
		}
	};

	const filteredAddedFilters = useMemo(
		() =>
			addedFilters.filter((filter) =>
				filter.name.toLowerCase().includes(inputValue.toLowerCase()),
			),
		[addedFilters, inputValue],
	);

	const handleRemoveFilter = (filter: TelemetryFieldKey): void => {
		setAddedFilters((prev) => prev.filter((f) => f.key !== filter.key));
	};

	const allowDrag = inputValue.length === 0;
	const allowRemove = addedFilters.length > 1;

	return (
		<div className="qf-filters added-filters">
			<div className="qf-filters-header">ADDED FILTERS</div>
			<div className="qf-added-filters-list">
				<OverlayScrollbar>
					<DndContext
						sensors={sensors}
						collisionDetection={closestCenter}
						onDragEnd={handleDragEnd}
					>
						{filteredAddedFilters.length === 0 ? (
							<div className="no-values-found">No values found</div>
						) : (
							<SortableContext
								items={addedFilters.map((f) => f.key as string)}
								strategy={verticalListSortingStrategy}
								disabled={!allowDrag}
							>
								{filteredAddedFilters.map((filter) => (
									<SortableFilter
										key={filter.key}
										filter={filter}
										onRemove={handleRemoveFilter}
										allowDrag={allowDrag}
										allowRemove={allowRemove}
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

export default AddedFilters;
