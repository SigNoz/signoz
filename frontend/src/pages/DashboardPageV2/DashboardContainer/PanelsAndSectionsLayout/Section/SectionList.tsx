import { useMemo } from 'react';
import { closestCenter, DndContext, DragOverlay } from '@dnd-kit/core';
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
import { useAddPanelToSection } from '../Panel/hooks/useAddPanelToSection';
import { useDashboardStore } from '../../store/useDashboardStore';
import { useSectionDragReorder } from './hooks/useSectionDragReorder';
import Section from './Section/Section';
import SectionDragPreview from './SectionDragPreview/SectionDragPreview';
import SortableSection from './SortableSection';

interface SectionListProps {
	sections: DashboardSection[];
	layouts: DashboardtypesLayoutDTO[] | undefined | null;
}

function SectionList({ sections, layouts }: SectionListProps): JSX.Element {
	const isEditable = useDashboardStore((s) => s.isEditable);

	const {
		sensors,
		orderedSections,
		activeSection,
		onDragStart,
		onDragEnd,
		onDragCancel,
	} = useSectionDragReorder({ sections, layouts });

	const onAddPanel = useAddPanelToSection({ sections });

	// Only titled sections participate in reordering; untitled (free-flow)
	// blocks render in place without a drag handle.
	const sortableIds = useMemo(
		() => orderedSections.filter((s) => s.title).map((s) => s.id),
		[orderedSections],
	);

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
			collisionDetection={closestCenter}
			modifiers={[restrictToVerticalAxis, restrictToParentElement]}
			onDragStart={onDragStart}
			onDragEnd={onDragEnd}
			onDragCancel={onDragCancel}
		>
			<SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
				{orderedSections.map((section) =>
					section.title ? (
						<SortableSection
							key={section.id}
							section={section}
							sections={sections}
							onAddPanel={onAddPanel}
						/>
					) : (
						<Section
							key={section.id}
							section={section}
							sections={sections}
							onAddPanel={onAddPanel}
						/>
					),
				)}
			</SortableContext>
			{/* dropAnimation disabled: optimistic reorder already places the section,
			    so animating the overlay back would cause a visible snap/shake. */}
			<DragOverlay dropAnimation={null}>
				{activeSection ? <SectionDragPreview section={activeSection} /> : null}
			</DragOverlay>
		</DndContext>
	);
}

export default SectionList;
