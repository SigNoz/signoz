import { useRef } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { GripVertical } from '@signozhq/icons';
import cx from 'classnames';
import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import { useIntersectionObserver } from 'hooks/useIntersectionObserver';

import Panel, { type PanelActionsConfig } from '../../Panel/Panel';
import { panelDraggableId } from '../hooks/crossSectionDrag';
import { useScrollIntoView } from '../hooks/useScrollIntoView';
import styles from './SectionGrid.module.scss';

const VIEWPORT_OBSERVER_OPTIONS: IntersectionObserverInit = {
	rootMargin: '200px',
};

interface SectionGridItemProps {
	panel: DashboardtypesPanelDTO;
	panelId: string;
	/** This panel's section, carried on the drag so the drop knows its origin. */
	layoutIndex: number;
	/** Show the cross-section drag grip (sectioned + editable boards only). */
	enablePanelDrag: boolean;
	panelActions?: PanelActionsConfig;
}

/**
 * Lazy-loads a single panel: watches its own viewport intersection (latched) and
 * passes it to the presentational Panel as `isVisible`, so a board of many panels
 * only fetches what's on screen. In sectioned edit mode it also exposes a grip
 * that starts a cross-section drag (dnd-kit); the grip is `panel-no-drag` so
 * react-grid-layout never treats it as an intra-section move handle.
 */
function SectionGridItem({
	panel,
	panelId,
	layoutIndex,
	enablePanelDrag,
	panelActions,
}: SectionGridItemProps): JSX.Element {
	const containerRef = useRef<HTMLDivElement>(null);
	const isVisible = useIntersectionObserver(
		containerRef,
		VIEWPORT_OBSERVER_OPTIONS,
		true,
	);
	useScrollIntoView(panelId, containerRef);

	const { setNodeRef, listeners, attributes, isDragging } = useDraggable({
		id: panelDraggableId(panelId),
		data: { panelId, fromLayoutIndex: layoutIndex },
		disabled: !enablePanelDrag,
	});

	return (
		<div
			ref={containerRef}
			className={cx(styles.panelWrapper, isDragging && styles.panelDragging)}
		>
			{enablePanelDrag && (
				<button
					type="button"
					ref={setNodeRef}
					className={cx('panel-no-drag', styles.panelDragHandle)}
					aria-label="Drag panel to another section"
					title="Drag to move to another section"
					data-testid={`panel-drag-handle-${panelId}`}
					{...attributes}
					{...listeners}
				>
					<GripVertical size={12} />
				</button>
			)}
			<Panel
				panel={panel}
				panelId={panelId}
				isVisible={isVisible}
				panelActions={panelActions}
			/>
		</div>
	);
}

export default SectionGridItem;
