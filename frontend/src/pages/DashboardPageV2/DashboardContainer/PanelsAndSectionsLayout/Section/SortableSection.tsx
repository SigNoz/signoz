import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import type { DashboardSection } from '../../utils';
import type { AddPanelArgs } from '../Panel/hooks/useAddPanelToSection';
import type { DeletePanelArgs } from '../Panel/hooks/useDeletePanel';
import type { MovePanelArgs } from '../Panel/hooks/useMovePanelToSection';
import Section from './Section/Section';

interface SortableSectionProps {
	section: DashboardSection;
	sections: DashboardSection[];
	onAddPanel: (args: AddPanelArgs) => void;
	onMovePanel: (args: MovePanelArgs) => void;
	onDeletePanel: (args: DeletePanelArgs) => void;
}

function SortableSection({
	section,
	sections,
	onAddPanel,
	onMovePanel,
	onDeletePanel,
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
				onAddPanel={onAddPanel}
				onMovePanel={onMovePanel}
				onDeletePanel={onDeletePanel}
				dragHandle={{ attributes, listeners, setActivatorNodeRef }}
			/>
		</div>
	);
}

export default SortableSection;
