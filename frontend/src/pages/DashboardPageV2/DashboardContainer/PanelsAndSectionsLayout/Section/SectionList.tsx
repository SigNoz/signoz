import { useCallback, useMemo } from 'react';
import {
	closestCenter,
	type CollisionDetection,
	DndContext,
	type DragEndEvent,
	DragOverlay,
	type DragStartEvent,
	type Modifier,
} from '@dnd-kit/core';
import {
	restrictToParentElement,
	restrictToVerticalAxis,
} from '@dnd-kit/modifiers';
import {
	SortableContext,
	verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import type { DashboardtypesLayoutDTO } from 'api/generated/services/sigNoz.schemas';

import type { DashboardSection } from '../../utils';
import { useDashboardStore } from '../../store/useDashboardStore';
import { usePanelDragMove } from './hooks/usePanelDragMove';
import { useSectionDragReorder } from './hooks/useSectionDragReorder';
import PanelDragPreview from './PanelDragPreview/PanelDragPreview';
import Section from './Section/Section';
import SectionDragPreview from './SectionDragPreview/SectionDragPreview';
import SortableSection from './SortableSection';

interface SectionListProps {
	sections: DashboardSection[];
	layouts: DashboardtypesLayoutDTO[] | undefined | null;
}

// Section reorder is confined to a vertical list within its parent; a panel
// cross-section drag moves freely, so it runs with no modifiers.
const SECTION_MODIFIERS: Modifier[] = [
	restrictToVerticalAxis,
	restrictToParentElement,
];
const NO_MODIFIERS: Modifier[] = [];

/**
 * Hosts a single dnd-kit DndContext for two drag kinds: reordering sections
 * (sortable list) and moving a panel between sections (a panel grip dragged onto
 * another section's drop zone). Each event is routed by its namespaced id —
 * panel handlers get first refusal, section-reorder handles the rest — and the
 * modifiers/collision detection switch to match the active kind.
 */
function SectionList({ sections, layouts }: SectionListProps): JSX.Element {
	const isEditable = useDashboardStore((s) => s.isEditable);

	const {
		sensors,
		orderedSections,
		activeSection,
		onDragStart: onSectionDragStart,
		onDragEnd: onSectionDragEnd,
		onDragCancel: onSectionDragCancel,
	} = useSectionDragReorder({ sections, layouts });

	const {
		activePanel,
		isDraggingPanel,
		panelCollisionDetection,
		handleDragStart: onPanelDragStart,
		handleDragEnd: onPanelDragEnd,
		handleDragCancel: onPanelDragCancel,
	} = usePanelDragMove({ sections });

	// Only titled sections participate in reordering; untitled (free-flow)
	// blocks render in place without a drag handle.
	const sortableIds = useMemo(
		() => orderedSections.filter((s) => s.title).map((s) => s.id),
		[orderedSections],
	);

	// Cross-section dragging only makes sense with somewhere to move to.
	const enablePanelDrag = orderedSections.length > 1;

	const handleDragStart = useCallback(
		(event: DragStartEvent): void => {
			if (!onPanelDragStart(event)) {
				onSectionDragStart(event);
			}
		},
		[onPanelDragStart, onSectionDragStart],
	);

	const handleDragEnd = useCallback(
		(event: DragEndEvent): void => {
			if (!onPanelDragEnd(event)) {
				onSectionDragEnd(event);
			}
		},
		[onPanelDragEnd, onSectionDragEnd],
	);

	const handleDragCancel = useCallback((): void => {
		onPanelDragCancel();
		onSectionDragCancel();
	}, [onPanelDragCancel, onSectionDragCancel]);

	const collisionDetection: CollisionDetection = isDraggingPanel
		? panelCollisionDetection
		: closestCenter;

	if (!isEditable) {
		return (
			<>
				{sections.map((section) => (
					<Section key={section.id} section={section} />
				))}
			</>
		);
	}

	return (
		<DndContext
			sensors={sensors}
			collisionDetection={collisionDetection}
			modifiers={isDraggingPanel ? NO_MODIFIERS : SECTION_MODIFIERS}
			onDragStart={handleDragStart}
			onDragEnd={handleDragEnd}
			onDragCancel={handleDragCancel}
		>
			<SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
				{orderedSections.map((section) =>
					section.title ? (
						<SortableSection
							key={section.id}
							section={section}
							sections={sections}
							enablePanelDrag={enablePanelDrag}
						/>
					) : (
						<Section
							key={section.id}
							section={section}
							sections={sections}
							enablePanelDrag={enablePanelDrag}
						/>
					),
				)}
			</SortableContext>
			{/* dropAnimation disabled: optimistic reorder already places the section,
			    so animating the overlay back would cause a visible snap/shake. */}
			<DragOverlay dropAnimation={null}>
				{activeSection ? (
					<SectionDragPreview section={activeSection} />
				) : activePanel ? (
					<PanelDragPreview item={activePanel} />
				) : null}
			</DragOverlay>
		</DndContext>
	);
}

export default SectionList;
