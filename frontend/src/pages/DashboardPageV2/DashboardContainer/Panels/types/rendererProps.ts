import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import type {
	DashboardCursorSync,
	SyncTooltipFilterMode,
} from 'lib/uPlotV2/plugins/TooltipPlugin/types';
import { PanelMode } from 'container/DashboardContainer/visualization/panels/types';
import type { PanelQueryData } from 'pages/DashboardPageV2/DashboardContainer/queryV5/types';

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
}

// Renderer props for a specific panel kind: the shared base plus that kind's
// interaction surface (PanelInteractionMap[K]). Each renderer annotates with
// its own kind — e.g. PanelRendererProps<'signoz/TimeSeriesPanel'> — so it can
// only reference the gestures that kind supports. Indexing PanelInteractionMap
// here forces the map to cover every PanelKind. The default K = PanelKind
// yields the widest surface (a union over all kinds).
export type PanelRendererProps<K extends PanelKind = PanelKind> =
	BaseRendererProps & PanelInteractionMap[K];
