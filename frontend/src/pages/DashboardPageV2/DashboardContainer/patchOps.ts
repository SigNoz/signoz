import type {
	DashboardGridItemDTO,
	DashboardtypesJSONPatchOperationDTO,
	DashboardtypesLayoutDTO,
	DashboardtypesPanelDTO,
	DashboardtypesPanelPluginDTO,
} from 'api/generated/services/sigNoz.schemas';
import {
	DashboardtypesPanelKindDTO,
	DashboardtypesPatchOpDTO,
} from 'api/generated/services/sigNoz.schemas';

import type { PanelKind } from './Panels/types/panelKind';
import type { DefaultPluginSpec } from './Panels/utils/buildDefaultPluginSpec';
import type { GridItem } from './utils';

/**
 * Pure RFC-6902 JSON-Patch builders for the V2 dashboard spec. These are
 * intentionally side-effect-free (no React, no network) so they can be unit
 * tested and reused by the layout hooks. JSON pointers target the postable
 * shape: `/spec/layouts/...`, `/spec/panels/...` (matches the existing V2
 * patches in DashboardSettings/Overview and DashboardDescription).
 */

const { add, replace, remove } = DashboardtypesPatchOpDTO;

const PANEL_REF_PREFIX = '#/spec/panels/';

export function panelRef(panelId: string): string {
	return `${PANEL_REF_PREFIX}${panelId}`;
}

/**
 * Builds a fresh panel of the given kind to seed the editor when creating a new
 * panel. Queries start empty: the editor's query builder falls back to its
 * default query (see `fromPerses`), and the editor re-serializes the live query
 * for the panel's kind on save — so the persisted panel always carries a
 * kind-valid query, and the seed needs no hand-built query envelope.
 *
 * `pluginSpec` seeds the per-kind config defaults so the editor's config pane
 * opens populated instead of blank (see `buildDefaultPluginSpec`). It stays pure:
 * the caller resolves the kind's defaults — this builder only stores them, so it
 * carries no dependency on the (React) panel registry.
 */
export function createDefaultPanel(
	pluginKind: PanelKind,
	pluginSpec: DefaultPluginSpec = {},
): DashboardtypesPanelDTO {
	return {
		kind: DashboardtypesPanelKindDTO.Panel,
		spec: {
			display: { name: 'New panel' },
			// `plugin` is a discriminated union keyed by a per-kind enum; the kind is
			// chosen at runtime, so assert the variant at this one boundary.
			plugin: {
				kind: pluginKind,
				spec: pluginSpec,
			} as DashboardtypesPanelPluginDTO,
			queries: [],
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
	/** Preferred section (from the "Add panel" trigger); falls back to the last. */
	layoutIndex: number | undefined;
	panelId: string;
	panel: DashboardtypesPanelDTO;
}

const NEW_PANEL_SIZE = { width: 6, height: 6 };

/** Columns in the section grid — mirrors `cols` on SectionGrid's GridLayout. */
const GRID_COLS = 12;

/**
 * Placement for a new grid item: if the last row has horizontal room to the
 * right of its panels, drop the new panel there; otherwise wrap to a fresh row
 * at the bottom. Only the last row is considered (gaps in earlier rows are left
 * alone). The last row is the set of items sharing the greatest top-y; its right
 * edge is the furthest `x + width` among them. Matches the 12-col grid +
 * vertical compaction in SectionGrid.
 */
function findFreeSlot(
	items: DashboardGridItemDTO[],
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

	// Room in the last row → sit to the right of it; else start a new row.
	if (lastRowRightEdge + w <= GRID_COLS) {
		return { x: lastRowRightEdge, y: lastRowY };
	}
	return { x: 0, y: bottom };
}

/**
 * Ops to create a brand-new panel: resolve the target section (the requested
 * index when valid, else the last section, else a freshly-created one when the
 * dashboard has no sections) and drop the panel into the last row when it has
 * room, otherwise a new row. Used by the editor's save path when persisting a
 * draft panel.
 */
export function createPanelOps({
	layouts,
	layoutIndex,
	panelId,
	panel,
}: CreatePanelOpsArgs): DashboardtypesJSONPatchOperationDTO[] {
	const ops: DashboardtypesJSONPatchOperationDTO[] = [];

	// Prefer the requested section; if it's missing/out of range, use the last.
	const requested =
		layoutIndex !== undefined && layouts[layoutIndex] !== undefined
			? layoutIndex
			: layouts.length - 1;

	let targetIndex = requested;
	let items: DashboardGridItemDTO[] = layouts[requested]?.spec.items ?? [];
	if (targetIndex < 0) {
		// No sections yet — create one (free-flowing, untitled) and target it.
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
