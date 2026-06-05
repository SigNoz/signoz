import type {
	DashboardGridItemDTO,
	DashboardtypesJSONPatchOperationDTO,
	DashboardtypesLayoutDTO,
	DashboardtypesPanelDTO,
} from 'api/generated/services/sigNoz.schemas';
import { DashboardtypesJSONPatchOperationDTOOp } from 'api/generated/services/sigNoz.schemas';

import type { GridItem } from './utils';

/**
 * Pure RFC-6902 JSON-Patch builders for the V2 dashboard spec. These are
 * intentionally side-effect-free (no React, no network) so they can be unit
 * tested and reused by the layout hooks. JSON pointers target the postable
 * shape: `/spec/layouts/...`, `/spec/panels/...` (matches the existing V2
 * patches in DashboardSettings/General and DashboardDescription).
 */

const { add, replace, remove } = DashboardtypesJSONPatchOperationDTOOp;

const PANEL_REF_PREFIX = '#/spec/panels/';

export function panelRef(panelId: string): string {
	return `${PANEL_REF_PREFIX}${panelId}`;
}

/**
 * Builds a minimal, backend-valid panel for a given plugin kind. The spec
 * requires exactly one query whose plugin kind is allowed for the panel;
 * `signoz/BuilderQuery` is allowed for every panel kind and its contents are not
 * validated, so an empty builder query is the safe default. The real query is
 * filled in once the panel editor lands.
 */
export function createDefaultPanel(pluginKind: string): DashboardtypesPanelDTO {
	// The DTO types plugin/query kinds as large generated enum unions; the kind
	// here is chosen dynamically by the user, so we build the structurally-valid
	// shape and assert the type.
	return {
		kind: 'Panel',
		spec: {
			display: { name: 'New panel' },
			plugin: { kind: pluginKind, spec: {} },
			queries: [
				{
					kind: 'TimeSeriesQuery',
					spec: { plugin: { kind: 'signoz/BuilderQuery', spec: { name: 'A' } } },
				},
			],
		},
	} as unknown as DashboardtypesPanelDTO;
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
