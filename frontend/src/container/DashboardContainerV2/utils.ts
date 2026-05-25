import type {
	DashboardtypesGettableDashboardV2DTO,
	DashboardtypesLayoutDTO,
	DashboardtypesPanelDTO,
} from 'api/generated/services/sigNoz.schemas';

export type V2Dashboard = DashboardtypesGettableDashboardV2DTO;

export interface GridItemV2 {
	id: string;
	x: number;
	y: number;
	width: number;
	height: number;
	panel: DashboardtypesPanelDTO | undefined;
}

const PANEL_REF_PREFIX = '#/spec/panels/';

export function extractPanelIdFromRef(ref: string | undefined): string | null {
	if (!ref) return null;
	if (!ref.startsWith(PANEL_REF_PREFIX)) return null;
	return ref.slice(PANEL_REF_PREFIX.length);
}

export function flattenGridLayout(
	layouts: DashboardtypesLayoutDTO[] | undefined | null,
	panels: Record<string, DashboardtypesPanelDTO | undefined> | undefined,
): GridItemV2[] {
	if (!layouts?.length) return [];

	const items: GridItemV2[] = [];
	layouts.forEach((layoutEnvelope) => {
		if (layoutEnvelope?.kind !== 'Grid') return;
		const gridItems = layoutEnvelope.spec?.items ?? [];
		gridItems.forEach((item) => {
			const id = extractPanelIdFromRef(item.content?.$ref);
			if (!id) return;
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
export interface DashboardSectionV2 {
	id: string;
	title: string | undefined;
	open: boolean;
	items: GridItemV2[];
	repeatVariable: string | undefined;
}

export function layoutsToSections(
	layouts: DashboardtypesLayoutDTO[] | undefined | null,
	panels: Record<string, DashboardtypesPanelDTO | undefined> | undefined,
): DashboardSectionV2[] {
	if (!layouts?.length) return [];

	return layouts
		.map((layoutEnvelope, idx) => {
			if (layoutEnvelope?.kind !== 'Grid') return null;
			const spec = layoutEnvelope.spec;
			const items: GridItemV2[] = (spec?.items ?? [])
				.map((item) => {
					const id = extractPanelIdFromRef(item.content?.$ref);
					if (!id) return null;
					return {
						id,
						x: item.x ?? 0,
						y: item.y ?? 0,
						width: item.width ?? 6,
						height: item.height ?? 6,
						panel: panels?.[id],
					};
				})
				.filter((it): it is GridItemV2 => it !== null);

			const title = spec?.display?.title;
			// `open` defaults to true when no collapse field is set (the section
			// is expanded by default).
			const open = spec?.display?.collapse?.open !== false;

			return {
				id: `section-${idx}`,
				title,
				open,
				items,
				repeatVariable: spec?.repeatVariable,
			};
		})
		.filter((s): s is DashboardSectionV2 => s !== null);
}

export function getPanelKindLabel(panel: DashboardtypesPanelDTO | undefined): string {
	const kind = panel?.spec?.plugin?.kind;
	if (!kind) return 'unknown';
	return kind.replace(/^signoz\//, '');
}
