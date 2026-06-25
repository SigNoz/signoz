import type {
	DashboardtypesPanelDTO,
	DashboardtypesPanelPluginDTO,
	DashboardtypesPanelSpecDTO,
} from 'api/generated/services/sigNoz.schemas';
import type {
	DashboardCursorSync,
	SyncTooltipFilterMode,
} from 'lib/uPlotV2/plugins/TooltipPlugin/types';
import { PanelMode } from 'container/DashboardContainer/visualization/panels/types';
import type {
	PanelPagination,
	PanelQueryData,
} from 'pages/DashboardPageV2/DashboardContainer/queryV5/types';

import type { PanelInteractionMap } from './interactions';
import type { PanelKind } from './panelKind';

/** Dashboard-wide rendering preferences propagated to every panel renderer. */
export interface DashboardPreference {
	/** Cursor-sync mode; always present — `DashboardCursorSync.None` is the off state. */
	syncMode: DashboardCursorSync;
	/** Filter applied to the synced tooltip across panels. */
	syncFilterMode?: SyncTooltipFilterMode;
	/** Dashboard id, for renderers that scope per-dashboard state. */
	dashboardId?: string;
}

/** Kind-agnostic props every renderer receives; kind-specific interactions are layered on by PanelRendererProps<K>. */
export interface BaseRendererProps {
	panelId: string;
	/** The whole panel — renderers derive `spec` and `queries` from it. Required: the render boundary only mounts once panel + kind resolve. */
	panel: DashboardtypesPanelDTO;
	/** Raw V5 fetch result — response + the request that produced it. */
	data: PanelQueryData;
	isFetching: boolean;
	error: Error | null;
	/** Re-run the panel query; wired to the no-data Retry affordance. Optional so standalone call sites (e.g. the editor preview) can omit it. */
	refetch?: () => void;
	/** Gate for the drill-down right-click menu. Off by default in V2. */
	enableDrillDown?: boolean;
	/** Render context (dashboard widget vs. standalone vs. editor); see PanelMode. */
	panelMode: PanelMode;
	/** Dashboard-level preferences propagated to every panel; shell resolves, renderer consumes. */
	dashboardPreference?: DashboardPreference;
	/** Free-text header filter, applied client-side. Only meaningful for kinds that declare `actions.search`. */
	searchTerm?: string;
	/** Server-side paging handles. Present only for raw/list panels; others ignore it. */
	pagination?: PanelPagination;
}

// The single plugin variant for kind K, picked from the generated plugin union.
// Distributes over the union, coercing each member's nominal kind-enum to its
// string value (`${VK & string}`) to match K. K = PanelKind recovers the full union.
type PluginOfKind<K extends PanelKind> =
	DashboardtypesPanelPluginDTO extends infer V
		? V extends { kind: infer VK }
			? `${VK & string}` extends K
				? V
				: never
			: never
		: never;

// The panel narrowed to kind K: the wire DTO with `plugin` (and `plugin.spec`)
// fixed to K's single variant, so a renderer reads `panel.spec.plugin.spec` as
// its own spec type with no cast.
export type PanelOfKind<K extends PanelKind = PanelKind> = Omit<
	DashboardtypesPanelDTO,
	'spec'
> & {
	spec: Omit<DashboardtypesPanelSpecDTO, 'plugin'> & {
		plugin: PluginOfKind<K>;
	};
};

// Renderer props for kind K: the base (with `panel` narrowed to K) plus K's
// interaction surface (PanelInteractionMap[K]), so a renderer sees its exact spec
// and only the gestures it supports. The default K = PanelKind is the widest surface.
export type PanelRendererProps<K extends PanelKind = PanelKind> = Omit<
	BaseRendererProps,
	'panel'
> & {
	panel: PanelOfKind<K>;
} & PanelInteractionMap[K];
