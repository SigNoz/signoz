// Pure helpers for cross-section panel drag-and-drop. A single dnd-kit
// DndContext (SectionList) hosts two draggable kinds — sections (reorder) and
// panels (move between sections) — so ids are namespaced to tell them apart,
// and section drop targets get their own id space.

const PANEL_DRAG_PREFIX = 'panel:';
const SECTION_DROP_PREFIX = 'dropzone:';

/** dnd-kit draggable id for a panel grip. */
export function panelDraggableId(panelId: string): string {
	return `${PANEL_DRAG_PREFIX}${panelId}`;
}

/** Whether a dnd-kit active/over id belongs to a panel drag (vs a section). */
export function isPanelDragId(id: string): boolean {
	return id.startsWith(PANEL_DRAG_PREFIX);
}

/** dnd-kit droppable id for a section's panel drop zone, keyed by layout index. */
export function sectionDropId(layoutIndex: number): string {
	return `${SECTION_DROP_PREFIX}${layoutIndex}`;
}

/** Whether an id is a section panel drop zone. */
export function isSectionDropId(id: string): boolean {
	return id.startsWith(SECTION_DROP_PREFIX);
}

/** Layout index encoded in a section drop-zone id, or null if it isn't one. */
export function layoutIndexFromDropId(id: string): number | null {
	if (!id.startsWith(SECTION_DROP_PREFIX)) {
		return null;
	}
	const value = Number(id.slice(SECTION_DROP_PREFIX.length));
	return Number.isInteger(value) ? value : null;
}

/** Data carried on a panel draggable so the drop handler can build the move. */
export interface PanelDragData {
	panelId: string;
	fromLayoutIndex: number;
}

/**
 * Resolve the move a panel drop implies, or null when it is a no-op (no drop
 * target, dropped over an unknown target, or dropped back on its own section).
 */
export function resolvePanelMove(
	drag: PanelDragData | null,
	overId: string | null,
): { panelId: string; fromLayoutIndex: number; toLayoutIndex: number } | null {
	if (!drag || !overId) {
		return null;
	}
	const toLayoutIndex = layoutIndexFromDropId(overId);
	if (toLayoutIndex === null || toLayoutIndex === drag.fromLayoutIndex) {
		return null;
	}
	return {
		panelId: drag.panelId,
		fromLayoutIndex: drag.fromLayoutIndex,
		toLayoutIndex,
	};
}
