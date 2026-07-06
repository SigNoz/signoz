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

interface CreatePanelOpsArgs {
	/** Current sections, used to resolve the target and the next free row. */
	layouts: DashboardtypesLayoutDTO[];
	/** Preferred section (from a section's "Add panel" trigger); falls back to the root (first) section. */
	layoutIndex: number | undefined;
	panelId: string;
	panel: DashboardtypesPanelDTO;
}

const NEW_PANEL_SIZE = { width: 6, height: 6 };

/** Columns in the section grid — mirrors `cols` on SectionGrid's GridLayout. */
const GRID_COLS = 12;

/** Minimal placement fields shared by grid-item DTOs and flattened `GridItem`s. */
type PlacedItem = Pick<DashboardGridItemDTO, 'x' | 'y' | 'width' | 'height'>;

/**
 * Placement for a new grid item: drop it right of the last row if there's room,
 * else wrap to a fresh row at the bottom. Only the last row is considered (items
 * sharing the greatest top-y); gaps in earlier rows are left alone.
 */
export function findFreeSlot(
	items: PlacedItem[],
	width: number,
): { x: number; y: number } {
	const w = Math.min(width, GRID_COLS);
	if (items.length === 0) {
		return { x: 0, y: 0 };
	}

	const bottom = items.reduce(
		(max, it) => Math.max(max, (it.y ?? 0) + (it.height ?? 0)),
		0,
	);
	const lastRowY = items.reduce((max, it) => Math.max(max, it.y ?? 0), 0);
	const lastRowRightEdge = items
		.filter((it) => (it.y ?? 0) === lastRowY)
		.reduce((max, it) => Math.max(max, (it.x ?? 0) + (it.width ?? 0)), 0);

	if (lastRowRightEdge + w <= GRID_COLS) {
		return { x: lastRowRightEdge, y: lastRowY };
	}
	return { x: 0, y: bottom };
}

/**
 * Ops to persist a brand-new panel (editor save path): resolve the target
 * section (requested index if valid, else the root/first section, else a
 * freshly-created one) and place the panel via `findFreeSlot`.
 */
export function createPanelOps({
	layouts,
	layoutIndex,
	panelId,
	panel,
}: CreatePanelOpsArgs): DashboardtypesJSONPatchOperationDTO[] {
	const ops: DashboardtypesJSONPatchOperationDTO[] = [];

	let targetIndex: number;
	let items: DashboardGridItemDTO[];
	if (layoutIndex !== undefined && layouts[layoutIndex] !== undefined) {
		// Explicit section — a section's own "New Panel" trigger.
		targetIndex = layoutIndex;
		items = layouts[layoutIndex]?.spec.items ?? [];
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

/** Remove a section. Panel cleanup (orphaned refs) is handled by the caller. */
export function removeSectionOp(
	layoutIndex: number,
): DashboardtypesJSONPatchOperationDTO {
	return { op: remove, path: `/spec/layouts/${layoutIndex}` };
}

/** Remove a panel definition from `spec.panels`. */
export function removePanelOp(
	panelId: string,
): DashboardtypesJSONPatchOperationDTO {
	return { op: remove, path: `/spec/panels/${panelId}` };
}
