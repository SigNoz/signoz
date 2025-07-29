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
import { Button, Typography } from 'antd';
import OverlayScrollbar from 'components/OverlayScrollbar/OverlayScrollbar';
import { GripVertical, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface ContextLink {
	id: string;
	label: string;
	url: string;
	openInNewTab: boolean;
}

function SortableContextLink({
	contextLink,
	onDelete,
	onEdit,
}: {
	contextLink: ContextLink;
	onDelete: (contextLink: ContextLink) => void;
	onEdit: (contextLink: ContextLink) => void;
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

function ContextLinks(): JSX.Element {
	// Dummy state for context links
	const [contextLinks, setContextLinks] = useState<ContextLink[]>([
		{
			id: '1',
			label: 'Dashboard',
			url: 'https://dashboard.example.com',
			openInNewTab: true,
		},
		{
			id: '2',
			label: 'Documentation',
			url: 'https://docs.example.com',
			openInNewTab: false,
		},
		{
			id: '3',
			label: 'Support',
			url: 'https://support.example.com',
			openInNewTab: true,
		},
		{
			id: '4',
			label:
				'Very Long Label That Exceeds Normal Length and Should Test Text Overflow',
			url:
				'https://very-long-url-that-might-cause-layout-issues.example.com/very/deep/path/with/many/segments',
			openInNewTab: true,
		},
		{
			id: '5',
			label: 'Short',
			url: 'https://short.com',
			openInNewTab: false,
		},
		{
			id: '6',
			label: 'API Documentation',
			url:
				'https://api-docs.example.com/v1/reference/endpoints/authentication/oauth2/token/refresh',
			openInNewTab: true,
		},
		{
			id: '7',
			label: 'GitHub Repository',
			url: 'https://github.com/signozhq/signoz',
			openInNewTab: true,
		},
		{
			id: '8',
			label: 'Community Forum',
			url: 'https://community.example.com/discussions/general/feature-requests',
			openInNewTab: false,
		},
		{
			id: '9',
			label: 'Status Page',
			url: 'https://status.example.com',
			openInNewTab: true,
		},
		{
			id: '10',
			label: 'Another Very Long Label With Special Characters & Numbers 123',
			url:
				'https://another-very-long-url-with-special-characters-and-numbers-123.example.com/path/to/resource',
			openInNewTab: false,
		},
	]);

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

	const handleDeleteContextLink = (contextLink: ContextLink): void => {
		setContextLinks((prev) => prev.filter((link) => link.id !== contextLink.id));
	};

	const handleEditContextLink = (contextLink: ContextLink): void => {
		// Dummy edit function - for now just log the context link
		console.log('Edit context link:', contextLink);
		// TODO: Implement edit functionality
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
				>
					Context Link
				</Button>
			</div>
		</div>
	);
}

export default ContextLinks;
