/* eslint-disable react/jsx-props-no-spreading */
import './styles.scss';

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
import { Button, Modal, Typography } from 'antd';
import OverlayScrollbar from 'components/OverlayScrollbar/OverlayScrollbar';
import { GripVertical, Pencil, Plus, Trash2 } from 'lucide-react';
import { Dispatch, SetStateAction } from 'react';
import { ContextLinkProps } from 'types/api/dashboard/getAll';

import UpdateContextLinks from './UpdateContextLinks';
import useContextLinkModal from './useContextLinkModal';

function SortableContextLink({
	contextLink,
	onDelete,
	onEdit,
}: {
	contextLink: ContextLinkProps;
	onDelete: (contextLink: ContextLinkProps) => void;
	onEdit: (contextLink: ContextLinkProps) => void;
}): JSX.Element {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
	} = useSortable({ id: contextLink.id });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
	};

	return (
		<div
			ref={setNodeRef}
			style={style}
			className="context-link-item drag-enabled"
		>
			<div {...attributes} {...listeners} className="drag-handle">
				<div className="drag-handle-icon">
					<GripVertical size={16} />
				</div>
				<div className="context-link-content">
					<span className="context-link-label">{contextLink.label}</span>
					<span className="context-link-url">{contextLink.url}</span>
				</div>
			</div>
			<div className="context-link-actions">
				<Button
					className="edit-context-link-btn periscope-btn"
					size="small"
					icon={<Pencil size={12} />}
					onClick={(): void => {
						onEdit(contextLink);
					}}
				/>
				<Button
					className="delete-context-link-btn periscope-btn"
					size="small"
					icon={<Trash2 size={12} />}
					onClick={(): void => {
						onDelete(contextLink);
					}}
				/>
			</div>
		</div>
	);
}

function ContextLinks({
	contextLinks,
	setContextLinks,
}: {
	contextLinks: ContextLinkProps[];
	setContextLinks: Dispatch<SetStateAction<ContextLinkProps[]>>;
}): JSX.Element {
	// Use the custom hook for modal functionality
	const {
		isModalOpen,
		selectedContextLink,
		handleEditContextLink,
		handleAddContextLink,
		handleCancelModal,
		handleSaveContextLink,
	} = useContextLinkModal();

	const sensors = useSensors(useSensor(PointerSensor));

	const handleDragEnd = (event: DragEndEvent): void => {
		const { active, over } = event;

		if (over && active.id !== over.id) {
			setContextLinks((items) => {
				const oldIndex = items.findIndex((item) => item.id === active.id);
				const newIndex = items.findIndex((item) => item.id === over.id);

				return arrayMove(items, oldIndex, newIndex);
			});
		}
	};

	const handleDeleteContextLink = (contextLink: ContextLinkProps): void => {
		setContextLinks((prev) => prev.filter((link) => link.id !== contextLink.id));
	};

	return (
		<div className="context-links-container">
			<Typography.Text className="context-links-text">
				Context Links
			</Typography.Text>

			<div className="context-links-list">
				<OverlayScrollbar>
					<DndContext
						sensors={sensors}
						collisionDetection={closestCenter}
						onDragEnd={handleDragEnd}
					>
						<SortableContext
							items={contextLinks.map((link) => link.id)}
							strategy={verticalListSortingStrategy}
						>
							{contextLinks.map((contextLink) => (
								<SortableContextLink
									key={contextLink.id}
									contextLink={contextLink}
									onDelete={handleDeleteContextLink}
									onEdit={handleEditContextLink}
								/>
							))}
						</SortableContext>
					</DndContext>
				</OverlayScrollbar>

				{/* button to add context link */}
				<Button
					type="primary"
					className="add-context-link-button"
					icon={<Plus size={12} />}
					onClick={handleAddContextLink}
				>
					Context Link
				</Button>
			</div>

			<Modal
				title={selectedContextLink ? 'Edit context link' : 'Add a context link'}
				open={isModalOpen}
				onOk={handleSaveContextLink}
				onCancel={handleCancelModal}
				okText="Save"
				destroyOnClose
				cancelText="Cancel"
				width={600}
			>
				<UpdateContextLinks selectedContextLink={selectedContextLink} />
			</Modal>
		</div>
	);
}

export default ContextLinks;
