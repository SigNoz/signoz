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
import { Skeleton } from 'antd';
import getCustomFilters from 'api/quickFilters/getCustomFilters';
import { GripVertical } from 'lucide-react';
import { useQuery } from 'react-query';
import { ErrorResponse, SuccessResponse } from 'types/api';
import {
	Filter as FilterType,
	PayloadProps,
} from 'types/api/quickFilters/getCustomFilters';

function SortableFilter({ filter }: { filter: FilterType }): JSX.Element {
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
			{...attributes}
			{...listeners}
			className="qf-filter-item drag-enabled" // TODO: handle drag disabled when searching
		>
			<div className="qf-filter-content">
				<GripVertical size={16} />
				{filter.key}
			</div>
		</div>
	);
}

function AddedFilters({
	filters,
	setFilters,
}: {
	filters: FilterType[];
	setFilters: React.Dispatch<React.SetStateAction<FilterType[]>>;
}): JSX.Element {
	const { isLoading: addedFiltersLoading } = useQuery<
		SuccessResponse<PayloadProps> | ErrorResponse,
		Error
	>(['addedFilters'], () => getCustomFilters({ signal: 'exceptions' }), {
		onSuccess: (data) => {
			if ('payload' in data && data.payload?.filters) {
				setFilters(data.payload.filters || ([] as FilterType[]));
			}
		},
	});

	const sensors = useSensors(useSensor(PointerSensor));

	const handleDragEnd = (event: DragEndEvent): void => {
		const { active, over } = event;

		if (over && active.id !== over.id) {
			setFilters((items) => {
				const oldIndex = items.findIndex((item) => item.key === active.id);
				const newIndex = items.findIndex((item) => item.key === over.id);

				return arrayMove(items, oldIndex, newIndex);
			});
		}
	};

	return (
		<div className="qf-filters added-filters">
			<div className="qf-filters-header">ADDED FILTERS</div>
			<div className="qf-added-filters-list">
				{addedFiltersLoading ? (
					[1, 2, 3, 4, 5].map((key) => (
						<div key={key} className="qf-filter-item">
							<div className="qf-filter-content">
								<Skeleton.Input active size="small" style={{ width: '300px' }} />
							</div>
						</div>
					))
				) : (
					<DndContext
						sensors={sensors}
						collisionDetection={closestCenter}
						onDragEnd={handleDragEnd}
					>
						<SortableContext
							items={filters.map((f) => f.key)}
							strategy={verticalListSortingStrategy}
						>
							{filters.map((filter) => (
								<SortableFilter key={filter.key} filter={filter} />
							))}
						</SortableContext>
					</DndContext>
				)}
			</div>
		</div>
	);
}

export default AddedFilters;
