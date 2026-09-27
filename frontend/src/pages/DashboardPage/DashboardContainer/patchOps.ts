import type {
	DashboardGridItemDTO,
	DashboardtypesJSONPatchOperationDTO,
	DashboardtypesLayoutDTO,
	DashboardtypesPanelDTO,
	DashboardtypesPanelPluginDTO,
	DashboardtypesQueryDTO,
} from 'api/generated/services/sigNoz.schemas';
import {
	DashboardtypesPanelKindDTO,
	DashboardtypesPatchOpDTO,
} from 'api/generated/services/sigNoz.schemas';

import type { PanelKind } from './Panels/types/panelKind';
import type { SeededPluginSpec } from './Panels/utils/buildPluginSpec';
import type { GridItem } from './utils';

/**
 * Pure (no React/network) RFC-6902 JSON-Patch builders for the V2 dashboard
 * spec. Pointers target the postable shape: `/spec/layouts/...`,
 * `/spec/panels/...`.
 */

const { add, replace, remove } = DashboardtypesPatchOpDTO;

const PANEL_REF_PREFIX = '#/spec/panels/';

export function panelRef(panelId: string): string {
	return `${PANEL_REF_PREFIX}${panelId}`;
}

/**
 * Builds a fresh panel of the given kind to seed the editor. The caller resolves
 * `pluginSpec` (config defaults) and `queries` (a kind's seed query) so this stays
 * free of the React panel registry.
 */
export function createDefaultPanel(
	pluginKind: PanelKind,
	pluginSpec: SeededPluginSpec = {},
	queries: DashboardtypesQueryDTO[] = [],
): DashboardtypesPanelDTO {
	return {
		kind: DashboardtypesPanelKindDTO.Panel,
		spec: {
			display: { name: 'New panel' },
			// `plugin` is a discriminated union; kind is runtime-chosen, so assert here.
			plugin: {
				kind: pluginKind,
				spec: pluginSpec,
			} as DashboardtypesPanelPluginDTO,
			queries,
		},
	};
}

/** Converts a UI grid item back into the spec's grid-item DTO shape. */
export function gridItemToDTO(item: GridItem): DashboardGridItemDTO {
	return {
		x: item.x,
		y: item.y,
		width: item.width,
		height: item.height,
		content: { $ref: panelRef(item.id) },
	};
}

/** Replace the entire items array of one section (used on panel move/resize). */
export function replaceSectionItemsOp(
	layoutIndex: number,
	items: GridItem[],
): DashboardtypesJSONPatchOperationDTO {
	return {
		op: replace,
		path: `/spec/layouts/${layoutIndex}/spec/items`,
		value: items.map(gridItemToDTO),
	};
}

/** Replace the whole layouts array (used on section reorder — avoids move-index ambiguity). */
export function reorderLayoutsOp(
	layouts: DashboardtypesLayoutDTO[],
): DashboardtypesJSONPatchOperationDTO {
	return { op: replace, path: '/spec/layouts', value: layouts };
}

/** An empty titled Grid layout (one section). */
export function newGridLayout(title: string): DashboardtypesLayoutDTO {
	return {
		kind: 'Grid' as DashboardtypesLayoutDTO['kind'],
		spec: { display: { title }, items: [] },
	};
}

/** Append a new, empty titled Grid section. */
export function addSectionOp(
	title: string,
): DashboardtypesJSONPatchOperationDTO {
	return { op: add, path: '/spec/layouts/-', value: newGridLayout(title) };
}

interface ClonedSectionPanel {
	newId: string;
	/** Deep-copied source panel spec (caller owns the clone). */
	panel: DashboardtypesPanelDTO;
	x: number;
	y: number;
	width: number;
	height: number;
}

/** Clone a section: add fresh panel copies and append a titled Grid referencing them. */
export function cloneSectionOps(
	title: string,
	panels: ClonedSectionPanel[],
): DashboardtypesJSONPatchOperationDTO[] {
	const panelOps = panels.map((p) => ({
		op: add,
		path: `/spec/panels/${p.newId}`,
		value: p.panel,
	}));
	const layout: DashboardtypesLayoutDTO = {
		kind: 'Grid' as DashboardtypesLayoutDTO['kind'],
		spec: {
			display: { title },
			items: panels.map((p) => ({
				x: p.x,
				y: p.y,
				width: p.width,
				height: p.height,
				content: { $ref: panelRef(p.newId) },
			})),
		},
	};
	return [...panelOps, { op: add, path: '/spec/layouts/-', value: layout }];
}

interface AddPanelToSectionArgs {
	panelId: string;
	panel: DashboardtypesPanelDTO;
	layoutIndex: number;
	item: DashboardGridItemDTO;
}

/** Add a panel to `spec.panels` and an item ref into a section, as one atomic patch. */
export function addPanelToSectionOps({
	panelId,
	panel,
	layoutIndex,
	item,
}: AddPanelToSectionArgs): DashboardtypesJSONPatchOperationDTO[] {
	return [
		{ op: add, path: `/spec/panels/${panelId}`, value: panel },
		{ op: add, path: `/spec/layouts/${layoutIndex}/spec/items/-`, value: item },
	];
}

export type NewPanelTarget =
	| { type: 'section'; layoutIndex: number }
	| { type: 'newSection'; title: string }
	/** Created at the top when missing. */
	| { type: 'root' };

interface CreatePanelOpsArgs {
	/** Current sections, used to resolve the target and the next free row. */
	layouts: DashboardtypesLayoutDTO[];
	/** Omitted, or a stale section → the first section. */
	target?: NewPanelTarget;
	panelId: string;
	panel: DashboardtypesPanelDTO;
}

export const NEW_PANEL_SIZE = { width: 6, height: 6 };

/** Columns in the section grid — mirrors `cols` on SectionGrid's GridLayout. */
export const GRID_COLS = 12;

/** Minimal placement fields shared by grid-item DTOs and flattened `GridItem`s. */
type PlacedItem = Pick<DashboardGridItemDTO, 'x' | 'y' | 'width' | 'height'>;

/**
 * Whether two grid rectangles intersect on both axes. Mirrors the backend's
 * overlap check (a patch placing two intersecting items is rejected), so this is
 * the authority the frontend must satisfy before adding an item.
 */
export function itemsOverlap(a: PlacedItem, b: PlacedItem): boolean {
	const ax = a.x ?? 0;
	const ay = a.y ?? 0;
	const aw = a.width ?? 0;
	const ah = a.height ?? 0;
	const bx = b.x ?? 0;
	const by = b.y ?? 0;
	const bw = b.width ?? 0;
	const bh = b.height ?? 0;
	return ax < bx + bw && bx < ax + aw && ay < by + bh && by < ay + ah;
}

/**
 * A fresh row below every existing item (`x: 0` at the greatest bottom-y) — sits
 * under everything so it can never overlap. Used when a panel must go to the end
 * (e.g. moved into a section) rather than backfilling a gap.
 */
export function bottomRowSlot(items: PlacedItem[]): { x: number; y: number } {
	const bottom = items.reduce(
		(max, it) => Math.max(max, (it.y ?? 0) + (it.height ?? 0)),
		0,
	);
	return { x: 0, y: bottom };
}

/**
 * Placement for a new grid item: drop it right of the last row if it both fits
 * the grid width and clears every existing item, else wrap to a fresh row at the
 * bottom (`bottomRowSlot`). Only the last row is preferred (items sharing the
 * greatest top-y); gaps in earlier rows are left alone. The overlap guard is what
 * keeps this safe — a tall panel from an earlier row can reach down into the last
 * row, so "right of the last row" is not automatically free. This is the placement
 * primitive for create / clone.
 */
export function findFreeSlot(
	items: PlacedItem[],
	width: number,
): { x: number; y: number } {
	const w = Math.min(width, GRID_COLS);
	if (items.length === 0) {
		return { x: 0, y: 0 };
	}

	const lastRowY = items.reduce((max, it) => Math.max(max, it.y ?? 0), 0);
	const lastRowRightEdge = items
		.filter((it) => (it.y ?? 0) === lastRowY)
		.reduce((max, it) => Math.max(max, (it.x ?? 0) + (it.width ?? 0)), 0);

	// height is unbounded downward, so use 1 for the fit probe: overlap on the
	// y-axis is decided by items reaching below `lastRowY`, not by the new
	// panel's own height (its top sits at the greatest top-y of all items).
	const candidate: PlacedItem = {
		x: lastRowRightEdge,
		y: lastRowY,
		width: w,
		height: 1,
	};
	const fitsWidth = lastRowRightEdge + w <= GRID_COLS;
	if (fitsWidth && !items.some((it) => itemsOverlap(candidate, it))) {
		return { x: lastRowRightEdge, y: lastRowY };
	}
	return bottomRowSlot(items);
}

/**
 * Ops to persist a brand-new panel (editor save path): resolve the target
 * section, creating it when needed, and place the panel via `findFreeSlot`.
 */
export function createPanelOps({
	layouts,
	target,
	panelId,
	panel,
}: CreatePanelOpsArgs): DashboardtypesJSONPatchOperationDTO[] {
	const ops: DashboardtypesJSONPatchOperationDTO[] = [];

	let targetIndex: number;
	let items: DashboardGridItemDTO[];
	const newSectionTitle =
		target?.type === 'newSection' ? target.title.trim() : '';
	if (newSectionTitle) {
		ops.push(...titleLooseLayoutsOps(layouts), addSectionOp(newSectionTitle));
		targetIndex = layouts.length;
		items = [];
	} else if (target?.type === 'root' && layouts[0]?.spec?.display?.title) {
		ops.push({ op: add, path: '/spec/layouts/0', value: newGridLayout('') });
		targetIndex = 0;
		items = [];
	} else if (
		target?.type === 'section' &&
		layouts[target.layoutIndex] !== undefined
	) {
		// Explicit section — a section's own "New Panel" trigger.
		targetIndex = target.layoutIndex;
		items = layouts[target.layoutIndex]?.spec.items ?? [];
	} else if (layouts.length > 0) {
		// No section specified (toolbar "New Panel") → the root (first) section.
		targetIndex = 0;
		items = layouts[0]?.spec.items ?? [];
	} else {
		// No sections yet — create an untitled one and target it.
		ops.push(addSectionOp(''));
		targetIndex = 0;
		items = [];
	}

	const { x, y } = findFreeSlot(items, NEW_PANEL_SIZE.width);
	ops.push(
		...addPanelToSectionOps({
			panelId,
			panel,
			layoutIndex: targetIndex,
			item: {
				x,
				y,
				...NEW_PANEL_SIZE,
				content: { $ref: panelRef(panelId) },
			},
		}),
	);
	return ops;
}

interface MovePanelArgs {
	sourceIndex: number;
	sourceItems: GridItem[];
	targetIndex: number;
	targetItems: GridItem[];
}

/** Move a panel's item ref from one section to another (panel stays in spec.panels). */
export function movePanelBetweenSectionsOps({
	sourceIndex,
	sourceItems,
	targetIndex,
	targetItems,
}: MovePanelArgs): DashboardtypesJSONPatchOperationDTO[] {
	return [
		replaceSectionItemsOp(sourceIndex, sourceItems),
		replaceSectionItemsOp(targetIndex, targetItems),
	];
}

/** Rename an existing section's title. */
export function renameSectionOp(
	layoutIndex: number,
	title: string,
): DashboardtypesJSONPatchOperationDTO {
	return {
		op: replace,
		path: `/spec/layouts/${layoutIndex}/spec/display/title`,
		value: title,
	};
}

/**
 * First-section migration: give an existing untitled (free-flowing) layout a
 * title, turning it into a section in place while preserving its panels.
 */
export function titleUntitledSectionOp(
	layoutIndex: number,
	title: string,
): DashboardtypesJSONPatchOperationDTO {
	return {
		op: add,
		path: `/spec/layouts/${layoutIndex}/spec/display`,
		value: { title },
	};
}

/** Titles loose layouts ("Section 1", …) on a free-flowing dashboard, as panels can't stay loose once a section exists. */
export function titleLooseLayoutsOps(
	layouts: DashboardtypesLayoutDTO[],
): DashboardtypesJSONPatchOperationDTO[] {
	if (layouts.some((layout) => layout.spec?.display?.title)) {
		return [];
	}
	const ops: DashboardtypesJSONPatchOperationDTO[] = [];
	layouts.forEach((layout, index) => {
		if ((layout.spec?.items ?? []).length > 0) {
			ops.push(titleUntitledSectionOp(index, `Section ${ops.length + 1}`));
		}
	});
	return ops;
}

/** Remove a section. Panel cleanup (orphaned refs) is handled by the caller. */
export function removeSectionOp(
	layoutIndex: number,
): DashboardtypesJSONPatchOperationDTO {
	return { op: remove, path: `/spec/layouts/${layoutIndex}` };
}

/** Remove a panel definition from `spec.panels`. */
/**
 * Sets a panel's authored body. `add`, not `replace`: a panel saved before it had
 * a body carries no `text` member, which `replace` requires to already resolve.
 */
export function setPanelTextOp(
	panelId: string,
	text: string,
): DashboardtypesJSONPatchOperationDTO {
	return {
		op: add,
		path: `/spec/panels/${panelId}/spec/plugin/spec/text`,
		value: text,
	};
}

export function removePanelOp(
	panelId: string,
): DashboardtypesJSONPatchOperationDTO {
	return { op: remove, path: `/spec/panels/${panelId}` };
}
