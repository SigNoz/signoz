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

/**
 * Dashboard-wide rendering preferences propagated down to every panel renderer
 * on the same dashboard. Lets the shell push cross-panel concerns (cursor
 * sync, tooltip filter mode, dashboard id for scoped state) without each
 * renderer rediscovering them via hooks.
 */
export interface DashboardPreference {
	/**
	 * Cursor-sync mode for the dashboard. Drives the uPlot tooltip plugin so
	 * hovering one panel highlights the corresponding x on every other panel.
	 * Always present — `DashboardCursorSync.None` is the off state.
	 */
	syncMode: DashboardCursorSync;
	/**
	 * Filter applied to the synced tooltip across panels (e.g. only show series
	 * whose label matches the hovered series).
	 */
	syncFilterMode?: SyncTooltipFilterMode;
	/**
	 * Dashboard id — useful for renderers that scope per-dashboard state
	 * (e.g. pinned-tooltip persistence, drill-down history).
	 */
	dashboardId?: string;
}

// Kind-agnostic props every renderer receives, regardless of panel kind. The
// kind-specific interaction props (onClick payload, onDragSelect) are layered
// on per-kind by PanelRendererProps<K>.
export interface BaseRendererProps {
	panelId: string;
	/**
	 * The whole perses panel — renderers derive their concrete `spec` and the
	 * perses-shaped `queries` from this. Passing the full panel keeps the prop
	 * surface stable as new panel-level fields are added to the wire format.
	 * Required: the render boundary (`Panel`) only mounts a renderer once the
	 * panel and its kind are resolved, so a renderer never sees an absent panel.
	 */
	panel: DashboardtypesPanelDTO;
	/** Raw V5 fetch result — response + the request that produced it. */
	data: PanelQueryData;
	isLoading: boolean;
	error: Error | null;
	/** Gate for the drill-down right-click menu. Off by default in V2. */
	enableDrillDown?: boolean;
	/**
	 * Render context — varies behavior (e.g. dashboard widget vs. standalone
	 * full-screen vs. inside the editor). See PanelMode for the contract.
	 */
	panelMode: PanelMode;
	/**
	 * Dashboard-level preferences that should propagate to every panel
	 * (cursor sync, tooltip filter mode, dashboard id). The shell owns
	 * resolving these; the renderer just consumes them.
	 */
	dashboardPreference?: DashboardPreference;
	/**
	 * Free-text filter from the header search box, owned by the shell and
	 * applied client-side by the renderer. Only meaningful for kinds that
	 * declare `headerControls.search`; other renderers ignore it.
	 */
	searchTerm?: string;
	/**
	 * Server-side paging handles, owned by `usePanelQuery`. Present only for
	 * raw/list panels; other renderers ignore it.
	 */
	pagination?: PanelPagination;
}

// The single plugin variant for kind K, picked from the generated plugin union.
// The union members carry a nominal kind-enum, so we distribute over it and
// coerce each member's kind to its string value (`${VK & string}`) to match
// against K. Result: the variant whose `spec` is that kind's exact spec DTO.
// K = PanelKind keeps every variant, recovering the full union.
type PluginOfKind<K extends PanelKind> =
	DashboardtypesPanelPluginDTO extends infer V
		? V extends { kind: infer VK }
			? `${VK & string}` extends K
				? V
				: never
			: never
		: never;

// The panel narrowed to kind K: identical to the wire DTO except `plugin` (and
// hence `plugin.spec`) is the single variant for K. Lets a renderer read
// `panel.spec.plugin.spec` as its own spec type — no cast at the call site.
export type PanelOfKind<K extends PanelKind = PanelKind> = Omit<
	DashboardtypesPanelDTO,
	'spec'
> & {
	spec: Omit<DashboardtypesPanelSpecDTO, 'plugin'> & {
		plugin: PluginOfKind<K>;
	};
};

// Renderer props for a specific panel kind: the shared base (with `panel`
// narrowed to K) plus that kind's interaction surface (PanelInteractionMap[K]).
// Each renderer annotates with its own kind — e.g.
// PanelRendererProps<'signoz/TimeSeriesPanel'> — so it sees its exact spec and
// only the gestures that kind supports. Indexing PanelInteractionMap here forces
// the map to cover every PanelKind. The default K = PanelKind yields the widest
// surface (a union over all kinds).
export type PanelRendererProps<K extends PanelKind = PanelKind> = Omit<
	BaseRendererProps,
	'panel'
> & {
	panel: PanelOfKind<K>;
} & PanelInteractionMap[K];
