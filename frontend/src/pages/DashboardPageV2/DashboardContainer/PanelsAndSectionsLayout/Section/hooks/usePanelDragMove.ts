import { useCallback, useMemo, useState } from 'react';
import type {
	CollisionDetection,
	DragEndEvent,
	DragStartEvent,
} from '@dnd-kit/core';
import { pointerWithin } from '@dnd-kit/core';

import type { DashboardSection, GridItem } from '../../../utils';
import { useMovePanelToSection } from '../../Panel/hooks/useMovePanelToSection';
import {
	isPanelDragId,
	isSectionDropId,
	type PanelDragData,
	resolvePanelMove,
} from './crossSectionDrag';

interface Params {
	sections: DashboardSection[];
}

interface Result {
	/** The panel item currently being dragged across sections (for the overlay). */
	activePanel: GridItem | null;
	/** True while a panel drag is in progress — the caller relaxes DnD modifiers. */
	isDraggingPanel: boolean;
	/** Collision detection scoped to section drop zones (panel drags only). */
	panelCollisionDetection: CollisionDetection;
	/** Returns true if it handled the event (a panel drag), false otherwise. */
	handleDragStart: (event: DragStartEvent) => boolean;
	handleDragEnd: (event: DragEndEvent) => boolean;
	handleDragCancel: () => void;
}

/**
 * Owns cross-section panel drag state within the section DndContext. A panel
 * grip drag is identified by its namespaced id; on drop over a different
 * section's zone the panel is relocated via the shared move hook (landing at the
 * target's bottom row). Section-reorder drags are left for the caller to handle.
 */
export function usePanelDragMove({ sections }: Params): Result {
	const movePanel = useMovePanelToSection({ sections });
	const [activeDrag, setActiveDrag] = useState<PanelDragData | null>(null);

	const handleDragStart = useCallback((event: DragStartEvent): boolean => {
		if (!isPanelDragId(String(event.active.id))) {
			return false;
		}
		setActiveDrag((event.active.data.current as PanelDragData) ?? null);
		return true;
	}, []);

	const handleDragEnd = useCallback(
		(event: DragEndEvent): boolean => {
			if (!isPanelDragId(String(event.active.id))) {
				return false;
			}
			const overId = event.over ? String(event.over.id) : null;
			const move = resolvePanelMove(activeDrag, overId);
			setActiveDrag(null);
			if (move) {
				void movePanel(move);
			}
			return true;
		},
		[activeDrag, movePanel],
	);

	const handleDragCancel = useCallback((): void => {
		setActiveDrag(null);
	}, []);

	// Only section drop zones are valid panel targets; ignore the sortable
	// section handles so a panel always resolves to the zone under the pointer.
	const panelCollisionDetection = useCallback<CollisionDetection>((args) => {
		const zones = args.droppableContainers.filter((c) =>
			isSectionDropId(String(c.id)),
		);
		return pointerWithin({ ...args, droppableContainers: zones });
	}, []);

	const activePanel = useMemo<GridItem | null>(() => {
		if (!activeDrag) {
			return null;
		}
		const source = sections.find(
			(s) => s.layoutIndex === activeDrag.fromLayoutIndex,
		);
		return source?.items.find((i) => i.id === activeDrag.panelId) ?? null;
	}, [activeDrag, sections]);

	return {
		activePanel,
		isDraggingPanel: activeDrag !== null,
		panelCollisionDetection,
		handleDragStart,
		handleDragEnd,
		handleDragCancel,
	};
}
