import * as ReactGridLayout from 'react-grid-layout';
import type { Layout } from 'react-grid-layout';
import type { DashboardtypesLayoutDTO } from 'api/generated/services/sigNoz.schemas';

import { GRID_COLS } from './patchOps';
import type { GridItem } from './utils';

// `utils.compact` is exported by react-grid-layout at runtime — it is the exact
// vertical compaction the grid applies on-screen while dragging — but it is absent
// from the package's TypeScript types, so it is reached through a typed cast.
const { compact } = (
	ReactGridLayout as unknown as {
		utils: {
			compact: (
				layout: Layout[],
				compactType: 'vertical' | 'horizontal',
				cols: number,
			) => Layout[];
		};
	}
).utils;

/** Vertically compact geometry so no two items overlap (mirrors on-screen RGL). */
function compactVertically(layout: Layout[]): Layout[] {
	return compact(layout, 'vertical', GRID_COLS);
}

/**
 * Snap a section's grid items to a non-overlapping, vertically-compacted layout —
 * the same normalization RGL applies mid-drag — so a persisted layout can never be
 * rejected by the backend's no-overlap validation. Panel refs and every other item
 * field are preserved; item order is unchanged (only geometry updates).
 */
export function compactGridItems(items: GridItem[]): GridItem[] {
	const compacted = compactVertically(
		items.map((item) => ({
			i: item.id,
			x: item.x,
			y: item.y,
			w: item.width,
			h: item.height,
		})),
	);
	const byId = new Map(compacted.map((entry) => [entry.i, entry]));
	return items.map((item) => {
		const entry = byId.get(item.id);
		return entry
			? { ...item, x: entry.x, y: entry.y, width: entry.w, height: entry.h }
			: item;
	});
}

/**
 * Compact every Grid section in a `spec.layouts` array — used on JSON-editor save,
 * where hand-edited items can overlap. Items are keyed by index (spec items carry
 * no id of their own); non-Grid or empty layouts pass through untouched.
 */
export function compactSpecLayouts(
	layouts: DashboardtypesLayoutDTO[],
): DashboardtypesLayoutDTO[] {
	return layouts.map((layout) => {
		const items = layout?.kind === 'Grid' ? (layout.spec?.items ?? []) : [];
		if (items.length === 0) {
			return layout;
		}
		const compacted = compactVertically(
			items.map((item, index) => ({
				i: String(index),
				x: item.x ?? 0,
				y: item.y ?? 0,
				w: item.width ?? 6,
				h: item.height ?? 6,
			})),
		);
		const byIndex = new Map(compacted.map((entry) => [entry.i, entry]));
		const nextItems = items.map((item, index) => {
			const entry = byIndex.get(String(index));
			return entry
				? { ...item, x: entry.x, y: entry.y, width: entry.w, height: entry.h }
				: item;
		});
		return { ...layout, spec: { ...layout.spec, items: nextItems } };
	});
}
