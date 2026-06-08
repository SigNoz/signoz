import type { DraggableAttributes } from '@dnd-kit/core';
import type { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities';
import { ChevronDown, ChevronRight, GripVertical } from '@signozhq/icons';
import { Typography } from '@signozhq/ui/typography';
import cx from 'classnames';

import SectionActionsMenu from '../SectionActionsMenu/SectionActionsMenu';
import styles from './SectionHeader.module.scss';

export interface SectionDragHandle {
	attributes: DraggableAttributes;
	listeners: SyntheticListenerMap | undefined;
	setActivatorNodeRef: (element: HTMLElement | null) => void;
}

interface Props {
	sectionId: string;
	title: string;
	open: boolean;
	onToggle: () => void;
	repeatVariable?: string;
	/** Provided by SortableSection in sectioned mode; absent for untitled/free-flow. */
	dragHandle?: SectionDragHandle;
	onRename?: () => void;
	onAddPanel?: () => void;
	onDeleteSection?: () => void;
}

function SectionHeader({
	sectionId,
	title,
	open,
	onToggle,
	repeatVariable,
	dragHandle,
	onRename,
	onAddPanel,
	onDeleteSection,
}: Props): JSX.Element {
	const hasActions = !!(onAddPanel || onRename || onDeleteSection);
	return (
		<div className={cx(styles.header, { [styles.headerOpen]: open })}>
			{dragHandle ? (
				<button
					type="button"
					className={styles.dragHandle}
					ref={dragHandle.setActivatorNodeRef}
					aria-label="Drag to reorder section"
					data-testid={`dashboard-section-drag-${sectionId}`}
					{...dragHandle.attributes}
					{...dragHandle.listeners}
				>
					<GripVertical size={14} />
				</button>
			) : null}
			<button
				type="button"
				className={styles.toggle}
				onClick={onToggle}
				data-testid={`dashboard-section-toggle-${sectionId}`}
			>
				{open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
				<Typography.Text className={styles.title}>{title}</Typography.Text>
				{repeatVariable ? (
					<Typography.Text className={styles.repeatBadge}>
						(repeats per ${repeatVariable})
					</Typography.Text>
				) : null}
			</button>
			{hasActions ? (
				<SectionActionsMenu
					sectionId={sectionId}
					onAddPanel={onAddPanel}
					onRename={onRename}
					onDeleteSection={onDeleteSection}
				/>
			) : null}
		</div>
	);
}

export default SectionHeader;
