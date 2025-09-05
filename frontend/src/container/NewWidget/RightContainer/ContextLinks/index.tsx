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
import {
	ContextLinkProps,
	ContextLinksData,
	Widgets,
} from 'types/api/dashboard/getAll';

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
	selectedWidget,
}: {
	contextLinks: ContextLinksData;
	setContextLinks: Dispatch<SetStateAction<ContextLinksData>>;
	selectedWidget?: Widgets;
}): JSX.Element {
	// Use the custom hook for modal functionality
	const {
		isModalOpen,
		selectedContextLink,
		handleEditContextLink,
		handleAddContextLink,
		handleCancelModal,
		handleSaveContextLink,
	} = useContextLinkModal({ setContextLinks });

	const sensors = useSensors(useSensor(PointerSensor));

	const handleDragEnd = (event: DragEndEvent): void => {
		const { active, over } = event;

		if (over && active.id !== over.id) {
			setContextLinks((prev) => {
				const items = [...prev.linksData];
				const oldIndex = items.findIndex((item) => item.id === active.id);
				const newIndex = items.findIndex((item) => item.id === over.id);

				return {
					...prev,
					linksData: arrayMove(items, oldIndex, newIndex),
				};
			});
		}
	};

	const handleDeleteContextLink = (contextLink: ContextLinkProps): void => {
		setContextLinks((prev) => ({
			...prev,
			linksData: prev.linksData.filter((link) => link.id !== contextLink.id),
		}));
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
							items={contextLinks.linksData.map((link) => link.id)}
							strategy={verticalListSortingStrategy}
						>
							{contextLinks.linksData.map((contextLink) => (
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
				onCancel={handleCancelModal}
				destroyOnClose
				width={672}
				footer={null}
			>
				<UpdateContextLinks
					selectedContextLink={selectedContextLink}
					onSave={handleSaveContextLink}
					onCancel={handleCancelModal}
					selectedWidget={selectedWidget}
				/>
			</Modal>
		</div>
	);
}

ContextLinks.defaultProps = {
	selectedWidget: undefined,
};

export default ContextLinks;
