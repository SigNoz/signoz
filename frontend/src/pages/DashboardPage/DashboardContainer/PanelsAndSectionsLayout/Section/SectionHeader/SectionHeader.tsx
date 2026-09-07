import type { DraggableAttributes } from '@dnd-kit/core';
import type { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities';
import { ChevronDown, ChevronRight, GripVertical } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { Typography } from '@signozhq/ui/typography';
import cx from 'classnames';

import SectionActionsMenu from '../SectionActionsMenu/SectionActionsMenu';
import styles from './SectionHeader.module.scss';

export interface SectionDragHandle {
	attributes: DraggableAttributes;
	listeners: SyntheticListenerMap | undefined;
	setActivatorNodeRef: (element: HTMLElement | null) => void;
}

/** Editable-mode section actions — present together or not at all. */
export interface SectionHeaderActions {
	onRename: () => void;
	onAddPanel: () => void;
	onCloneSection: () => void;
	onDeleteSection: () => void;
}

interface SectionHeaderProps {
	sectionId: string;
	title: string;
	open: boolean;
	onToggle: () => void;
	repeatVariable?: string;
	/** Provided by SortableSection in sectioned mode; absent for untitled/free-flow. */
	dragHandle?: SectionDragHandle;
	/** Present for edit-permitted users; absent (no menu) in view mode. */
	actions?: SectionHeaderActions;
	/** Non-empty when locked — actions render disabled with this reason. */
	disabledReason?: string;
}

function SectionHeader({
	sectionId,
	title,
	open,
	onToggle,
	repeatVariable,
	dragHandle,
	actions,
	disabledReason = '',
}: SectionHeaderProps): JSX.Element {
	return (
		<div className={cx(styles.header, { [styles.headerOpen]: open })}>
			{dragHandle ? (
				<Button
					type="button"
					variant="ghost"
					color="secondary"
					size="icon"
					className={styles.dragHandle}
					ref={dragHandle.setActivatorNodeRef}
					aria-label="Drag to reorder section"
					data-testid={`dashboard-section-drag-${sectionId}`}
					{...dragHandle.attributes}
					{...dragHandle.listeners}
				>
					<GripVertical size={14} />
				</Button>
			) : null}
			<Button
				type="button"
				variant="ghost"
				color="secondary"
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
			</Button>
			{actions ? (
				<SectionActionsMenu
					sectionId={sectionId}
					disabledReason={disabledReason}
					onAddPanel={actions.onAddPanel}
					onRename={actions.onRename}
					onCloneSection={actions.onCloneSection}
					onDeleteSection={actions.onDeleteSection}
				/>
			) : null}
		</div>
	);
}

export default SectionHeader;
