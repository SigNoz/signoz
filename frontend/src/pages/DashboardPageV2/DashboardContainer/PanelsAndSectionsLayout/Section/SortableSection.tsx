import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import type { DashboardSection } from '../../utils';
import Section from './Section/Section';

interface SortableSectionProps {
	section: DashboardSection;
	sections: DashboardSection[];
}

function SortableSection({
	section,
	sections,
}: SortableSectionProps): JSX.Element {
	const {
		attributes,
		listeners,
		setNodeRef,
		setActivatorNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: section.id });

	// dnd-kit drives the drag transform per-frame, so this must be an inline
	// style — there is no static-stylesheet equivalent for a live transform.
	// While dragging, the original is hidden (the DragOverlay renders the moving
	// preview); keeping it in place preserves the gap and lets siblings animate.
	const style: React.CSSProperties = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0 : undefined,
	};

	return (
		<div ref={setNodeRef} style={style}>
			<Section
				section={section}
				sections={sections}
				dragHandle={{ attributes, listeners, setActivatorNodeRef }}
			/>
		</div>
	);
}

export default SortableSection;
