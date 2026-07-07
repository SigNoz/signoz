import type {
	DashboardtypesLayoutDTO,
	DashboardtypesPanelDTO,
} from 'api/generated/services/sigNoz.schemas';

export interface GridItem {
	id: string;
	x: number;
	y: number;
	width: number;
	height: number;
	panel: DashboardtypesPanelDTO | undefined;
}

const PANEL_REF_PREFIX = '#/spec/panels/';

export function extractPanelIdFromRef(ref: string | undefined): string | null {
	if (!ref) {
		return null;
	}
	if (!ref.startsWith(PANEL_REF_PREFIX)) {
		return null;
	}
	return ref.slice(PANEL_REF_PREFIX.length);
}

export function flattenGridLayout(
	layouts: DashboardtypesLayoutDTO[] | undefined | null,
	panels: Record<string, DashboardtypesPanelDTO | undefined> | undefined,
): GridItem[] {
	if (!layouts?.length) {
		return [];
	}

	const items: GridItem[] = [];
	layouts.forEach((layoutEnvelope) => {
		if (layoutEnvelope?.kind !== 'Grid') {
			return;
		}
		const gridItems = layoutEnvelope.spec?.items ?? [];
		gridItems.forEach((item) => {
			const id = extractPanelIdFromRef(item.content?.$ref);
			if (!id) {
				return;
			}
			items.push({
				id,
				x: item.x ?? 0,
				y: item.y ?? 0,
				width: item.width ?? 6,
				height: item.height ?? 6,
				panel: panels?.[id],
			});
		});
	});

	return items;
}

/**
 * A section corresponds to one entry in `spec.layouts`. If the Grid has a
 * `display.title`, it renders with a collapsible header; otherwise it is a
 * "default" untitled section (visually just the grid).
 */
export interface DashboardSection {
	/**
	 * Stable identity used for React keys and dnd-kit sortable item ids. Derived
	 * from the section's content (its first panel ref) so it survives reordering
	 * — unlike the positional `layoutIndex`. See `getSectionStableId`.
	 */
	id: string;
	/** Position of this section's Grid in `spec.layouts`. All JSON-Patch ops target by this. */
	layoutIndex: number;
	title: string | undefined;
	items: GridItem[];
	repeatVariable: string | undefined;
}

/**
 * Derives a stable id for a section from its content. Reordering sections changes
 * their `layoutIndex` but not their content, so keying off the first panel ref
 * keeps React component instances (and any local state) bound to the right
 * section across a reorder. Empty sections fall back to a positional id — they
 * are rarely reordered, and a future backend `id` on the layout spec is the
 * proper long-term fix.
 */
export function getSectionStableId(
	items: GridItem[],
	layoutIndex: number,
): string {
	if (items.length > 0) {
		return `sec-${items[0].id}`;
	}
	return `sec-empty-${layoutIndex}`;
}

export function layoutsToSections(
	layouts: DashboardtypesLayoutDTO[] | undefined | null,
	panels: Record<string, DashboardtypesPanelDTO | undefined> | undefined,
): DashboardSection[] {
	if (!layouts?.length) {
		return [];
	}

	return layouts
		.map((layoutEnvelope, idx) => {
			if (layoutEnvelope?.kind !== 'Grid') {
				return null;
			}
			const spec = layoutEnvelope.spec;
			const items: GridItem[] = (spec?.items ?? [])
				.map((item) => {
					const id = extractPanelIdFromRef(item.content?.$ref);
					if (!id) {
						return null;
					}
					return {
						id,
						x: item.x ?? 0,
						y: item.y ?? 0,
						width: item.width ?? 6,
						height: item.height ?? 6,
						panel: panels?.[id],
					};
				})
				.filter((it): it is GridItem => it !== null);

			const title = spec?.display?.title;

			return {
				id: getSectionStableId(items, idx),
				layoutIndex: idx,
				title,
				items,
				repeatVariable: spec?.repeatVariable,
			};
		})
		.filter((s): s is DashboardSection => s !== null);
}
