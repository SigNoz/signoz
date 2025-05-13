/* eslint-disable react/jsx-props-no-spreading */
import './AddedFilters.styles.scss';

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
import Button from 'antd/es/button';
import { GripVertical } from 'lucide-react';
import { useMemo } from 'react';
import { Filter as FilterType } from 'types/api/quickFilters/getCustomFilters';

function SortableFilter({
	filter,
	onRemove,
	allowDrag,
}: {
	filter: FilterType;
	onRemove: (filter: FilterType) => void;
	allowDrag: boolean;
}): JSX.Element {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
	} = useSortable({ id: filter.key });

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
			<div className="qf-filter-content">
				<div {...attributes} {...listeners} className="drag-handle">
					{allowDrag && <GripVertical size={16} />}
					{filter.key}
				</div>
				<Button
					className="remove-filter-btn periscope-btn"
					size="small"
					onClick={(): void => {
						onRemove(filter as FilterType);
					}}
				>
					Remove
				</Button>
			</div>
		</div>
	);
}

function AddedFilters({
	inputValue,
	addedFilters,
	setAddedFilters,
}: {
	inputValue: string;
	addedFilters: FilterType[];
	setAddedFilters: React.Dispatch<React.SetStateAction<FilterType[]>>;
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
				filter.key.toLowerCase().includes(inputValue.toLowerCase()),
			),
		[addedFilters, inputValue],
	);

	const handleRemoveFilter = (filter: FilterType): void => {
		setAddedFilters((prev) => prev.filter((f) => f.key !== filter.key));
	};

	const allowDrag = inputValue.length === 0;

	return (
		<div className="qf-filters added-filters">
			<div className="qf-filters-header">ADDED FILTERS</div>
			<div className="qf-added-filters-list">
				<DndContext
					sensors={sensors}
					collisionDetection={closestCenter}
					onDragEnd={handleDragEnd}
				>
					<SortableContext
						items={addedFilters.map((f) => f.key)}
						strategy={verticalListSortingStrategy}
						disabled={!allowDrag}
					>
						{filteredAddedFilters.map((filter) => (
							<SortableFilter
								key={filter.key}
								filter={filter}
								onRemove={handleRemoveFilter}
								allowDrag={allowDrag}
							/>
						))}
					</SortableContext>
				</DndContext>
			</div>
		</div>
	);
}

export default AddedFilters;
